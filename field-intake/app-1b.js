function renderHeader() {
  const mast = document.querySelector('#mast');
  const statusline = document.querySelector('#statusline');
  if (!mast || !statusline) return;
  const counts = countRecords(state);
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  mast.innerHTML = `
    <div>
      <div class="kicker">POLY / INGRESS MEMBRANE 0.4</div>
      <h1>FIELD INTAKE</h1>
      <p>Capture can be compressed and provisional. Canonical state changes only through a visible resolution and leaves a reversible receipt.</p>
    </div>
    <div class="hash-block"><span>CANONICAL</span><b>${hash(state)}</b></div>`;
  statusline.innerHTML = `
    <span><b>${total}</b> records</span>
    <span><b>${state.ingressReceipts.length}</b> receipts</span>
    <span><b>${envelope.candidates.length}</b> candidates</span>
    <span><b>${draft.split('\n').filter(line => line.trim()).length}</b> inbox lines</span>
    ${notice ? `<span class="notice ${noticeTone}">${esc(notice)}</span>` : '<span class="notice">nothing mutates before APPLY PATCH</span>'}`;
}

function renderKinds() {
  const row = document.querySelector('#kindRow');
  row.innerHTML = KINDS.map(kind => `<button class="kind ${kind === prefs.defaultKind ? 'on' : ''}" data-kind="${kind}">${kind.toUpperCase()}</button>`).join('');
  row.querySelectorAll('[data-kind]').forEach(button => {
    button.onclick = () => {
      prefs.defaultKind = button.dataset.kind;
      rebuildEnvelope();
      save();
      render();
    };
  });
}

function renderGrammar() {
  const grammar = {
    task: '<code>~20m</code> duration · <code>@phone</code> context · <code>11:00-15:00</code> window · <code>!5</code> value · <code>^2</code> setup',
    anchor: '<code>= 15:00-17:00 Pickup</code> · hard time boundary',
    observation: '<code>at:11:10</code> time · <code>@home #cat</code> context/tag',
    claim: '<code>?0.7</code> confidence · <code>ref:o:…</code> evidence link',
    measurement: 'first numeric value+unit is derived, e.g. <code>3 mm</code>',
  };
  document.querySelector('#grammar').innerHTML = `
    <b>${prefs.defaultKind.toUpperCase()}</b>
    <span>${grammar[prefs.defaultKind]}</span>
    <small><code>id:…</code> preserves identity for edits · <code>ref:…</code> links evidence · override line kind with <code>[obs]</code> <code>[claim]</code> <code>[measure]</code> <code>[task]</code>.</small>`;
}
