const STORAGE = 'poly-field-intake-v04-state';
const DRAFT = 'poly-field-intake-v04-draft';
const PREFS = 'poly-field-intake-v04-prefs';
const HANDOFF = 'field.intake.handoff.v01';
const sampleCapture = `[obs] fan-off test increased enclosure odor @workspace #ventilation at:11:10 // observation only, not a conclusion
[measure] shelf deflection 3 mm at center @workbench #prototype
[claim] untreated paper may increase ink bleed ?0.55 #print-test
= 15:00-16:30 Collection window // protected external commitment
[task] Call support >20:30 ~20m @phone !4 ^1`;

const app = document.querySelector('#app');
if (!app) throw new Error('app root missing');

const esc = value => String(value ?? '').replace(/[&<>\"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char] || char);
const loadJson = (key, fallback) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    return value ?? clone(fallback);
  } catch {
    return clone(fallback);
  }
};

let state = loadJson(STORAGE, emptyState());
state.observations ||= [];
state.claims ||= [];
state.measurements ||= [];
state.events ||= [];
state.ingressReceipts ||= [];
let incomingHandoff = null;
try {
  const parsed = JSON.parse(sessionStorage.getItem(HANDOFF) || 'null');
  if (parsed?.schema === '0xxx0/continuity-to-field-intake/v0.1' && typeof parsed.capture === 'string' && parsed.capture.trim()) {
    incomingHandoff = parsed;
    sessionStorage.removeItem(HANDOFF);
  }
} catch {}
let draft = incomingHandoff?.capture || (localStorage.getItem(DRAFT) ?? sampleCapture);
let prefs = { defaultKind: 'task', rightMode: 'trace', filter: 'all', density: 'full', ...loadJson(PREFS, {}) };
let envelope = makeEnvelope(state, compileCapture(draft, prefs.defaultKind), { kind: incomingHandoff ? 'continuity-handoff' : 'capture', raw: draft, sourceCaseId: incomingHandoff?.source_case_id || null });
let selectedCandidateId = envelope.candidates[0]?.candidateId || null;
let selectedRecordId = null;
let notice = incomingHandoff ? 'CONTINUITY handoff loaded as review candidates. Canonical state is unchanged until you resolve and APPLY.' : '';
let noticeTone = incomingHandoff ? 'warn' : 'ok';
let timer = null;
let installPrompt = null;

function save() {
  localStorage.setItem(STORAGE, JSON.stringify(state));
  localStorage.setItem(DRAFT, draft);
  localStorage.setItem(PREFS, JSON.stringify(prefs));
}

function setNotice(message, tone = 'ok') {
  notice = message;
  noticeTone = tone;
  renderHeader();
}

function rebuildEnvelope(preserve = true) {
  const prior = preserve ? new Map(envelope.candidates.map(c => [c.record.id, c.resolution])) : new Map();
  envelope = makeEnvelope(
    state,
    compileCapture(draft, prefs.defaultKind, {
      dayStart: String(state.meta.dayStart || '11:00'),
      dayEnd: String(state.meta.dayEnd || '23:00'),
    }),
    { kind: 'capture', raw: draft }
  );
  for (const candidate of envelope.candidates) {
    if (prior.has(candidate.record.id)) candidate.resolution = prior.get(candidate.record.id);
  }
  if (!envelope.candidates.some(c => c.candidateId === selectedCandidateId)) {
    selectedCandidateId = envelope.candidates[0]?.candidateId || null;
  }
}

function analysisLabel(candidate) {
  if (candidate.analysis.operation === 'noop') return 'NOOP';
  if (candidate.analysis.operation === 'conflict') return 'CONFLICT';
  if (candidate.analysis.operation === 'review') return 'REVIEW';
  return 'SAFE';
}

function resolutionOptions(candidate) {
  const operation = candidate.analysis.operation;
  if (operation === 'noop') return [
    ['noop', 'KEEP'], ['reject', 'DROP']
  ];
  if (operation === 'conflict') return [
    ['replace', 'REPLACE'], ['reject', 'REJECT']
  ];
  if (operation === 'review') return [
    ['add', 'KEEP BOTH'], ['replace', 'REPLACE'], ['reject', 'REJECT']
  ];
  return [
    ['add', 'ACCEPT'], ['reject', 'REJECT']
  ];
}

function renderShell() {
  app.innerHTML = `
    <main class="sheet">
      <header class="mast" id="mast"></header>
      <section class="statusline" id="statusline"></section>

      <section class="quickline" aria-label="Quick capture">
        <div class="quick-prefix">CAPTURE</div>
        <input id="quickInput" autocomplete="off" placeholder="one line → Enter to append to inbox" />
        <button id="quickAdd">ADD</button>
        <button id="installBtn" class="quiet" hidden>INSTALL</button>
      </section>

      <section class="workgrid">
        <section class="panel capture-panel">
          <div class="panel-head"><span>01 / INBOX</span><span>raw thought stays editable</span></div>
          <div class="kind-row" id="kindRow"></div>
          <textarea id="captureInput" spellcheck="false" aria-label="Capture inbox"></textarea>
          <div class="grammar" id="grammar"></div>
          <div class="panel-actions">
            <button id="sampleBtn" class="quiet">LOAD SAMPLE</button>
            <button id="clearDraftBtn" class="quiet">CLEAR INBOX</button>
            <label class="file-label">IMPORT STATE<input id="importFile" type="file" accept="application/json,.json"></label>
          </div>
        </section>

        <section class="panel gate-panel">
          <div class="panel-head"><span>02 / GATE</span><span id="gateCount"></span></div>
          <div class="gate-toolbar">
            <button id="acceptSafeBtn" class="primary">ACCEPT SAFE</button>
            <button id="clearResolutionBtn" class="quiet">CLEAR</button>
            <button id="applyBtn" class="commit">APPLY PATCH</button>
          </div>
          <div class="patch-ribbon" id="patchRibbon"></div>
          <div id="diagnostics" class="diagnostics" hidden></div>
          <div class="candidate-list" id="candidateList"></div>
        </section>

        <section class="panel right-panel">
          <div class="tabs" id="tabs">
            <button data-tab="trace">TRACE</button>
            <button data-tab="state">STATE</button>
            <button data-tab="receipts">RECEIPTS</button>
          </div>
          <div id="rightBody" class="right-body"></div>
        </section>
      </section>

      <footer class="footline">
        <span>compress at edge → resolve explicitly → preserve provenance → return through receipts</span>
        <div>
          <button id="exportBtn" class="quiet">EXPORT DAYSTATE</button>
          <button id="resetBtn" class="danger">RESET STATE</button>
        </div>
      </footer>
    </main>`;

  document.querySelector('#captureInput').value = draft;
  bindStatic();
  render();
}

function bindStatic() {
  const captureInput = document.querySelector('#captureInput');
  captureInput.addEventListener('input', event => {
    draft = event.target.value;
    localStorage.setItem(DRAFT, draft);
    clearTimeout(timer);
    timer = setTimeout(() => {
      rebuildEnvelope();
      render();
    }, 90);
  });

  const quickInput = document.querySelector('#quickInput');
  quickInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      appendQuick();
    }
  });
  document.querySelector('#quickAdd').onclick = appendQuick;
  document.querySelector('#sampleBtn').onclick = () => {
    draft = sampleCapture;
    captureInput.value = draft;
    rebuildEnvelope(false);
    save();
    setNotice('Sample loaded into inbox.');
    render();
  };
  document.querySelector('#clearDraftBtn').onclick = () => {
    if (draft.trim() && !confirm('Clear the raw capture inbox? Canonical state is unaffected.')) return;
    draft = '';
    captureInput.value = '';
    rebuildEnvelope(false);
    save();
    render();
  };
  document.querySelector('#acceptSafeBtn').onclick = () => {
    envelope = acceptSafe(envelope);
    setNotice('SAFE additions and NOOPs resolved. REVIEW/CONFLICT remain explicit.');
    render();
  };
  document.querySelector('#clearResolutionBtn').onclick = () => {
    for (const candidate of envelope.candidates) candidate.resolution = 'pending';
    render();
  };
  document.querySelector('#applyBtn').onclick = applyPatch;
  document.querySelector('#exportBtn').onclick = exportState;
  document.querySelector('#resetBtn').onclick = resetState;
  document.querySelector('#importFile').addEventListener('change', importState);
  document.querySelector('#installBtn').onclick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    document.querySelector('#installBtn').hidden = true;
  };
}

function appendQuick() {
  const input = document.querySelector('#quickInput');
  const value = input.value.trim();
  if (!value) return;
  draft = [draft.trim(), value].filter(Boolean).join('\n');
  input.value = '';
  document.querySelector('#captureInput').value = draft;
  rebuildEnvelope(false);
  save();
  render();
  document.querySelector('#quickInput').focus();
}

function render() {
  renderHeader();
  renderKinds();
  renderGrammar();
  renderCandidates();
  renderTabs();
  renderRight();
}
