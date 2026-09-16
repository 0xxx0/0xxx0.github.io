function renderState(body) {
  const query = prefs.filter === 'all' ? '' : prefs.filter;
  const records = allRecords(state).filter(record => !query || record.kind === query);
  body.innerHTML = `
    <div class="state-head"><div><span>CANONICAL HASH</span><b>${hash(state)}</b></div><button id="copyJsonBtn" class="quiet">COPY JSON</button></div>
    <div class="ledger-filter"><button data-filter="all" class="${prefs.filter === 'all' ? 'on' : ''}">ALL</button>${KINDS.map(kind => `<button data-filter="${kind}" class="${prefs.filter === kind ? 'on' : ''}">${kind.toUpperCase()}</button>`).join('')}</div>
    <div class="record-ledger">${records.length ? records.slice().reverse().map(record => ledgerCard(record)).join('') : '<div class="empty">No canonical records in this lane.</div>'}</div>`;
  body.querySelector('#copyJsonBtn')?.addEventListener('click', async () => {
    await navigator.clipboard.writeText(JSON.stringify(state, null, 2));
    setNotice('Canonical JSON copied.');
  });
  body.querySelectorAll('[data-filter]').forEach(button => {
    button.onclick = () => {
      prefs.filter = button.dataset.filter;
      save();
      renderState(body);
    };
  });
  body.querySelectorAll('[data-edit-record]').forEach(button => {
    button.onclick = () => editThroughGate(button.dataset.editRecord);
  });
  body.querySelectorAll('[data-copy-id]').forEach(button => {
    button.onclick = async () => {
      await navigator.clipboard.writeText(button.dataset.copyId);
      setNotice('Stable ID copied.');
    };
  });
  body.querySelectorAll('[data-lineage]').forEach(button => {
    button.onclick = () => showLineage(button.dataset.lineage);
  });
}

function ledgerCard(record) {
  const lineage = recordLineage(state, record.id);
  return `<article class="ledger-record">
    <div class="ledger-sigil">${record.kind.slice(0, 1).toUpperCase()}</div>
    <div><div class="ledger-top"><span>${record.kind}</span><small>${lineage.receipts.length} receipt${lineage.receipts.length === 1 ? '' : 's'}</small></div><b>${esc(record.title)}</b><small>${esc(recordSummary(record))}</small><code>${esc(record.id)}</code></div>
    <div class="ledger-actions"><button data-edit-record="${esc(record.id)}">EDIT VIA GATE</button><button data-lineage="${esc(record.id)}">LINEAGE</button><button data-copy-id="${esc(record.id)}">COPY ID</button></div>
  </article>`;
}

function editThroughGate(id) {
  const record = allRecords(state).find(item => item.id === id);
  if (!record) return;
  const line = recordToCapture(record, true);
  draft = [draft.trim(), line].filter(Boolean).join('\n');
  document.querySelector('#captureInput').value = draft;
  prefs.defaultKind = record.kind;
  prefs.rightMode = 'trace';
  rebuildEnvelope(false);
  const candidate = envelope.candidates.find(c => c.record.id === id);
  selectedCandidateId = candidate?.candidateId || null;
  save();
  setNotice('Canonical record reopened as an explicit edit candidate.', 'warn');
  render();
  document.querySelector('#captureInput').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showLineage(id) {
  const record = allRecords(state).find(item => item.id === id);
  const lineage = recordLineage(state, id);
  selectedRecordId = id;
  const body = document.querySelector('#rightBody');
  body.innerHTML = `
    <div class="trace-title"><span>LINEAGE</span><b>${esc(record?.title || id)}</b><small>${esc(id)}</small></div>
    <div class="timeline">${lineage.events.length ? lineage.events.map(event => `<div><i></i><span>${esc(event.type)}</span><b>${new Date(event.at).toLocaleString()}</b></div>`).join('') : '<div class="empty">No lineage events found.</div>'}</div>
    <h4>RECEIPTS</h4><div class="receipt-list">${lineage.receipts.map(receiptCard).join('') || '<small>none</small>'}</div>`;
}

function renderReceipts(body) {
  if (!state.ingressReceipts.length) {
    body.innerHTML = '<div class="empty">No receipts yet. A receipt is the recoverable proof that something crossed the ingress boundary.</div>';
    return;
  }
  body.innerHTML = `<div class="receipt-list">${[...state.ingressReceipts].reverse().map(receiptCard).join('')}</div>`;
  body.querySelectorAll('[data-rollback]').forEach(button => button.onclick = () => rollback(button.dataset.rollback));
  body.querySelectorAll('[data-replay]').forEach(button => button.onclick = () => replay(button.dataset.replay));
}

function receiptCard(receipt) {
  const added = receipt.delta?.added?.length || 0;
  const replaced = receipt.delta?.replaced?.length || 0;
  const noops = receipt.delta?.noops?.length || 0;
  return `<article class="receipt ${receipt.rolledBackAt ? 'rolled' : ''}">
    <div class="receipt-head"><span>${esc(receipt.receiptId)}</span><b>${receipt.rolledBackAt ? 'ROLLED BACK' : 'APPLIED'}</b></div>
    <p>+${added} add · ~${replaced} replace · =${noops} noop · ×${receipt.delta?.rejected?.length || 0} reject</p>
    <small>${new Date(receipt.appliedAt).toLocaleString()}</small>
    <div class="receipt-actions">${receipt.rolledBackAt ? `<button data-replay="${receipt.receiptId}" class="primary">REPLAY</button>` : `<button data-rollback="${receipt.receiptId}" class="danger">ROLL BACK</button>`}</div>
  </article>`;
}
