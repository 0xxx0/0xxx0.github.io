import {
  CAP_IR_VERSION,
  addressOf,
  canonicalHash,
  createObject,
  decodeCapsule,
  encodeCapsule,
  hash32,
  makeReturn,
  parseCsvSource,
  parseTextSource,
  selfTest,
  transform,
  verifyObject,
} from './cap-ir.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const KEY = 'foundry-cap-ir-lab-v01';
const STAGES = ['observe', 'target', 'routes', 'test', 'result', 'return'];
const SAMPLE = `object: Replace duplicated project shells with one canonical substrate
constraint: GitHub Pages stays the default static public surface
operation: preserve stable identity across projections
proof: same object ID and source hash survive every lens
next: run one real task and compare PLAIN vs FIELD`;

let projection = 'text';
let state = load();

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function seedObject() {
  let object = createObject({
    title: 'One object survives five projections',
    source: SAMPLE,
    sourceClass: 'SYSTEM/USER SYNTHESIS',
    type: 'work-object',
    fields: {
      runStage: 'observe',
      target: 'Demonstrate identity continuity without forcing identical representations.',
      routes: 'TEXT → TABLE → DAYLINE → RUN → CASE → RETURN',
      time: '13:42',
      caseClaim: 'A richer representation earns survival only when it adds measurable leverage.',
      caseRule: 'Projection may change; canonical identity and provenance may not silently change.',
      caseProof: 'Stable ID + source hash + transform ledger remain visible in every lens.',
    },
  });
  object = transform(object, {
    op: 'PARSE_TEXT',
    projection: 'text',
    patch: { fields: { ...object.fields, parsed: parseTextSource(object.source.exact) } },
    note: 'Seed source parsed into typed atoms without changing identity.',
  });
  return object;
}

function load() {
  try {
    if (location.hash.startsWith('#cap=')) {
      const object = decodeCapsule(location.hash.slice(5));
      if (verifyObject(object).ok) {
        localStorage.setItem(KEY, JSON.stringify({ object }));
        history.replaceState(null, '', location.pathname);
        return { object };
      }
    }
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved?.object && verifyObject(saved.object).ok) return saved;
  } catch (error) {
    console.warn('CAP-IR load failed', error);
  }
  return { object: seedObject() };
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
}

function object() {
  return state.object;
}

function replaceObject(next) {
  state.object = next;
  save();
  render();
}

function toast(text) {
  const el = $('#toast');
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { el.hidden = true; }, 1400);
}

function setProjection(name) {
  projection = name;
  $$('.projection-tabs button').forEach(b => b.classList.toggle('on', b.dataset.projection === name));
  renderProjection();
}

function inferFieldsFromSource() {
  const o = object();
  const pairs = {};
  for (const line of o.source.exact.split(/\r?\n/)) {
    const idx = line.indexOf(':');
    if (idx > 0) pairs[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  const parsed = o.source.exact.includes(',') && o.source.exact.split(/\r?\n/)[0]?.includes(',')
    ? { format: 'csv', ...parseCsvSource(o.source.exact) }
    : { format: 'text', ...parseTextSource(o.source.exact) };
  const next = transform(o, {
    op: 'INFER_FIELDS',
    projection: projection,
    patch: {
      fields: {
        ...o.fields,
        parsed,
        inferred: pairs,
        target: pairs.target || o.fields.target || '',
        routes: pairs.routes || pairs.operation || o.fields.routes || '',
        caseProof: pairs.proof || o.fields.caseProof || '',
        next: pairs.next || o.fields.next || '',
      },
    },
    note: `Schema-aware parse from ${parsed.format}; explicit transform recorded.`,
  });
  replaceObject(next);
  toast('FIELDS INFERRED · ID PRESERVED');
}

function applyEdit() {
  const o = object();
  const title = $('#editTitle').value.trim() || o.title;
  const target = $('#editTarget').value.trim();
  const time = $('#editTime').value.trim();
  const claim = $('#editClaim').value.trim();
  const proof = $('#editProof').value.trim();
  const next = transform(o, {
    op: 'EDIT_CANON',
    projection,
    patch: {
      title,
      fields: {
        ...o.fields,
        target,
        time,
        caseClaim: claim,
        caseProof: proof,
      },
    },
    note: 'Explicit canonical edit from projection panel.',
  });
  replaceObject(next);
  toast('CANON UPDATED · HISTORY APPENDED');
}

function advanceRun() {
  const o = object();
  const current = o.fields.runStage || 'observe';
  const i = STAGES.indexOf(current);
  const nextStage = STAGES[Math.min(STAGES.length - 1, i + 1)];
  const next = transform(o, {
    op: 'ADVANCE_RUN',
    projection: 'run',
    patch: { fields: { ...o.fields, runStage: nextStage } },
    note: `${current} → ${nextStage}`,
  });
  replaceObject(next);
  setProjection('run');
}

function commitReturn() {
  const delta = $('#retDelta').value.trim();
  const proof = $('#retProof').value.trim();
  const residue = $('#retResidue').value.trim();
  const nextRoute = $('#retNext').value.trim();
  try {
    const result = makeReturn(object(), { delta, proof, residue, next: nextRoute });
    replaceObject(result.object);
    setProjection('return');
    toast('RETURN COMMITTED');
  } catch (error) {
    toast(error.message);
  }
}

function copyShare() {
  const encoded = encodeCapsule(object());
  const url = `${location.origin}${location.pathname}#cap=${encoded}`;
  navigator.clipboard?.writeText(url).then(() => toast('CAPSULE URL COPIED')).catch(() => {
    prompt('Copy capsule URL', url);
  });
}

function exportObject() {
  const blob = new Blob([JSON.stringify(object(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${object().id.replace(':', '-')}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function importObject() {
  const raw = prompt('Paste CAP-IR JSON or capsule payload');
  if (!raw) return;
  try {
    const candidate = raw.trim().startsWith('{') ? JSON.parse(raw) : decodeCapsule(raw.trim());
    const verified = verifyObject(candidate);
    if (!verified.ok) throw new Error(verified.errors.join(', '));
    replaceObject(candidate);
    toast('OBJECT IMPORTED · ID ' + candidate.id);
  } catch (error) {
    toast('IMPORT FAILED · ' + error.message);
  }
}

function reset() {
  if (!confirm('Reset only this local convergence proof?')) return;
  state = { object: seedObject() };
  projection = 'text';
  save();
  render();
}

function renderHeader() {
  const o = object();
  const verified = verifyObject(o);
  $('#identity').innerHTML = `
    <div class="chips">
      <span class="chip hot">${esc(o.id)}</span>
      <span class="chip cool">SRC ${esc(o.source.hash)}</span>
      <span class="chip ${verified.ok ? 'ok' : 'hot'}">${verified.ok ? 'VERIFIED' : 'BROKEN'}</span>
      <span class="chip">CAP-IR ${CAP_IR_VERSION}</span>
    </div>
    <div class="address">${esc(addressOf(o, projection).uri)}</div>
  `;
}

function renderText() {
  const o = object();
  return `
    <div class="grid2">
      <div class="card hero">
        <div class="ey">TEXT · EXACT SOURCE</div>
        <h2>${esc(o.title)}</h2>
        <div class="source">${esc(o.source.exact)}</div>
        <div class="chips" style="margin-top:10px"><span class="chip">CLASS ${esc(o.source.class)}</span><span class="chip">HASH ${o.source.hash}</span></div>
      </div>
      <div class="card">
        <div class="ey">EXPLICIT TRANSFORM</div>
        <p>Parsing may add typed structure. It may not rewrite the exact source or mint a new identity.</p>
        <button class="btn primary" id="inferBtn">INFER FIELDS</button>
      </div>
    </div>`;
}

function renderTable() {
  const o = object();
  const parsed = o.fields.parsed || parseTextSource(o.source.exact);
  let rows = '';
  if (parsed.records) {
    rows = parsed.records.map(r => `<div class="atom"><code>${esc(r.id)}</code><span>${esc(JSON.stringify(r.fields))}</span><span>${esc(o.id)}</span></div>`).join('');
  } else {
    rows = (parsed.atoms || []).map(a => `<div class="atom"><code>${esc(a.id)}</code><span>${esc(a.value)}</span><span>${esc(o.id)}</span></div>`).join('');
  }
  return `<div class="card"><div class="ey">TABLE · TYPED ATOMS</div><p class="micro">Every row is a child address under the same canonical object; rows may change shape without changing the parent identity.</p><div class="atoms">${rows || '<div class="micro">No atoms yet. Run INFER FIELDS in TEXT.</div>'}</div></div>`;
}

function renderDayline() {
  const o = object();
  const time = o.fields.time || '13:42';
  const parts = time.match(/(\d{1,2}):(\d{2})/);
  const mins = parts ? Math.min(1439, Number(parts[1]) * 60 + Number(parts[2])) : 822;
  const left = Math.round(mins / 1440 * 1000) / 10;
  return `
    <div class="grid2">
      <div class="card hero">
        <div class="ey">DAYLINE · TEMPORAL PROJECTION</div>
        <div class="dayline"><div class="mark" style="left:${left}%" data-label="${esc(o.title)} · ${esc(time)}"></div></div>
        <div class="address">${esc(addressOf(o, 'dayline', { minute: mins }).uri)}</div>
      </div>
      <div class="card">
        <div class="ey">BOUNDARY</div>
        <p>Angle/time is projection metadata. It is not evidence and does not rewrite source.</p>
        ${editPanel(o)}
      </div>
    </div>`;
}

function renderRun() {
  const o = object();
  const current = o.fields.runStage || 'observe';
  return `
    <div class="grid2">
      <div class="card hero">
        <div class="ey">RUN · OPERATIONAL PROJECTION</div>
        <div class="run-rail">${STAGES.map(s => `<div class="stage ${s === current ? 'on' : ''}">${s.toUpperCase()}</div>`).join('')}</div>
        <h2>${esc(o.title)}</h2>
        <div class="kv"><b>TARGET</b><span>${esc(o.fields.target || '—')}</span></div>
        <div class="kv"><b>ROUTES</b><span>${esc(o.fields.routes || '—')}</span></div>
        <button class="btn primary" id="advanceBtn">ADVANCE RUN</button>
      </div>
      <div class="card">
        <div class="ey">IDENTITY CHECK</div>
        <p class="address">${esc(addressOf(o, 'run', { stage: current }).uri)}</p>
        <p class="micro">RUN changes operational state only through explicit transforms. The object ID remains ${esc(o.id)}.</p>
      </div>
    </div>`;
}

function renderCase() {
  const o = object();
  return `
    <div class="card hero">
      <div class="ey">CASE · ARGUMENT PROJECTION</div>
      <div class="case-grid">
        <div class="case-cell"><b>CLAIM</b><p>${esc(o.fields.caseClaim || '—')}</p></div>
        <div class="case-cell"><b>RULE / INVARIANT</b><p>${esc(o.fields.caseRule || '—')}</p></div>
        <div class="case-cell"><b>PROOF</b><p>${esc(o.fields.caseProof || '—')}</p></div>
        <div class="case-cell"><b>SOURCE STATUS</b><p>Exact source hash ${esc(o.source.hash)} · class ${esc(o.source.class)}</p></div>
      </div>
      <p class="micro">CASE is an interpreter over the same object, not a separate law-game database.</p>
      ${editPanel(o)}
    </div>`;
}

function renderReturn() {
  const o = object();
  const receipt = o.returns.at(-1);
  return `
    <div class="grid2">
      <div class="card receipt">
        <div class="ey">RETURN · CONSEQUENCE-BEARING RECEIPT</div>
        ${receipt ? `
          <div class="chips"><span class="chip ok">${esc(receipt.id)}</span><span class="chip">OBJ ${esc(receipt.objectId)}</span><span class="chip">CANON ${esc(receipt.canonicalHash)}</span></div>
          <div class="kv"><b>DELTA</b><span>${esc(receipt.delta)}</span></div>
          <div class="kv"><b>PROOF</b><span>${esc(receipt.proof)}</span></div>
          <div class="kv"><b>RESIDUE</b><span>${esc(receipt.residue || '—')}</span></div>
          <div class="kv"><b>NEXT</b><span>${esc(receipt.next || '—')}</span></div>
        ` : '<p>No committed RETURN yet.</p>'}
      </div>
      <div class="card">
        <div class="ey">COMMIT RETURN</div>
        <textarea id="retDelta" placeholder="Delta — what changed?"></textarea>
        <textarea id="retProof" placeholder="Proof — what observable supports it?"></textarea>
        <input id="retResidue" placeholder="Residue — what remains unresolved?">
        <input id="retNext" placeholder="Next re-entry / next test">
        <button class="btn ok" id="returnBtn" style="margin-top:8px">STAMP RETURN</button>
      </div>
    </div>`;
}

function editPanel(o) {
  return `
    <div style="margin-top:10px">
      <div class="ey">EDIT CANON · EXPLICIT</div>
      <input id="editTitle" value="${esc(o.title)}" placeholder="Title">
      <input id="editTarget" value="${esc(o.fields.target || '')}" placeholder="Target">
      <input id="editTime" value="${esc(o.fields.time || '')}" placeholder="HH:MM">
      <textarea id="editClaim" placeholder="Case claim">${esc(o.fields.caseClaim || '')}</textarea>
      <textarea id="editProof" placeholder="Case proof">${esc(o.fields.caseProof || '')}</textarea>
      <button class="btn" id="editBtn">COMMIT TRANSFORM</button>
    </div>`;
}

function renderProjection() {
  const body = $('#projectionBody');
  if (projection === 'text') body.innerHTML = renderText();
  if (projection === 'table') body.innerHTML = renderTable();
  if (projection === 'dayline') body.innerHTML = renderDayline();
  if (projection === 'run') body.innerHTML = renderRun();
  if (projection === 'case') body.innerHTML = renderCase();
  if (projection === 'return') body.innerHTML = renderReturn();

  $('#inferBtn')?.addEventListener('click', inferFieldsFromSource);
  $('#editBtn')?.addEventListener('click', applyEdit);
  $('#advanceBtn')?.addEventListener('click', advanceRun);
  $('#returnBtn')?.addEventListener('click', commitReturn);
  renderHeader();
}

function renderLedger() {
  const o = object();
  $('#ledger').innerHTML = o.history.slice().reverse().map(event => `
    <div class="evt">
      <b>${esc(event.op)}</b>
      <code>${esc(event.projection)}</code>
      <span>${esc(event.note || '')}<br><span class="micro">${esc(event.before || '∅')} → ${esc(event.after || '∅')}</span></span>
    </div>`).join('');
}

function renderTests() {
  const kernel = selfTest();
  const live = verifyObject(object());
  const checks = [...kernel.checks, ['live object verifies', live.ok], ['all projections resolve same id', ['text','table','dayline','run','case','return'].every(p => addressOf(object(), p).id === object().id)]];
  $('#tests').innerHTML = checks.map(([label, ok]) => `<div class="check"><span class="${ok ? 'ok' : 'bad'}">${ok ? '✓' : '×'}</span><span>${esc(label)}</span></div>`).join('');
  $('#testSummary').textContent = `${checks.filter(([, ok]) => ok).length}/${checks.length} checks`;
}

function render() {
  renderProjection();
  renderLedger();
  renderTests();
  $('#canonHash').textContent = canonicalHash(object());
  $('#objectId').textContent = object().id;
}

$$('.projection-tabs button').forEach(button => button.addEventListener('click', () => setProjection(button.dataset.projection)));
$('#shareBtn').addEventListener('click', copyShare);
$('#exportBtn').addEventListener('click', exportObject);
$('#importBtn').addEventListener('click', importObject);
$('#resetBtn').addEventListener('click', reset);

render();
