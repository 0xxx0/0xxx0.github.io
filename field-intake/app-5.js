function applyPatch() {
  const resolved = envelope.candidates.filter(candidate => candidate.resolution !== 'pending');
  if (!resolved.length) {
    setNotice('Resolve at least one candidate first.', 'warn');
    return;
  }
  if (envelope.candidates.some(candidate => candidate.resolution === 'pending')) {
    setNotice('Unresolved candidates remain. They will be rejected by omission unless explicitly resolved.', 'warn');
  }
  try {
    const result = applyEnvelope(state, envelope);
    state = result.state;
    save();
    prefs.rightMode = 'receipts';
    rebuildEnvelope(false);
    setNotice(`Patch applied: +${result.receipt.delta.added.length} add · ~${result.receipt.delta.replaced.length} replace.`, 'ok');
    render();
  } catch (error) {
    setNotice(error instanceof Error ? error.message : 'Patch failed.', 'error');
  }
}

function rollback(receiptId) {
  try {
    state = rollbackReceipt(state, receiptId);
    save();
    rebuildEnvelope(false);
    setNotice('Receipt rolled back; prior records restored where necessary.', 'warn');
    render();
  } catch (error) {
    setNotice(error instanceof Error ? error.message : 'Rollback failed.', 'error');
  }
}

function replay(receiptId) {
  try {
    envelope = envelopeFromReceipt(state, receiptId);
    selectedCandidateId = envelope.candidates[0]?.candidateId || null;
    prefs.rightMode = 'trace';
    setNotice('Receipt replay loaded into the gate; current state is re-analysed before apply.', 'ok');
    render();
  } catch (error) {
    setNotice(error instanceof Error ? error.message : 'Replay failed.', 'error');
  }
}

function resetState() {
  if (!confirm('Reset canonical state, receipts, and events? Raw inbox is preserved.')) return;
  state = emptyState();
  save();
  rebuildEnvelope(false);
  setNotice('Canonical state reset. Inbox preserved.', 'warn');
  render();
}

function exportState() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'atlas-daystate.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 800);
  setNotice('Atlas-compatible DayState exported.');
}

async function importState(event) {
  const input = event.target;
  const file = input.files?.[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    if (!Array.isArray(parsed.tasks) || !Array.isArray(parsed.anchors)) throw new Error('Expected DayState with tasks[] and anchors[].');
    parsed.observations ||= [];
    parsed.claims ||= [];
    parsed.measurements ||= [];
    parsed.events ||= [];
    parsed.ingressReceipts ||= [];
    state = clone(parsed);
    save();
    rebuildEnvelope(false);
    setNotice(`Imported ${file.name}.`);
    render();
  } catch (error) {
    setNotice(error instanceof Error ? error.message : 'Import failed.', 'error');
  } finally {
    input.value = '';
  }
}

window.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault();
    applyPatch();
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    document.querySelector('#quickInput').focus();
  }
});

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
  const button = document.querySelector('#installBtn');
  if (button) button.hidden = false;
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

function openReturnHash(){
  const params=new URLSearchParams(location.hash.replace(/^#/,''));
  const id=params.get('record');
  if(!id)return;
  const record=findRecord(state,id);
  if(!record){setNotice('RETURN target not present in this local DayState: '+id,'warn');return}
  selectedRecordId=id;
  prefs.rightMode='state';
  save();
  render();
  showLineage(id);
  setNotice('RETURN target opened: '+id,'ok');
}
window.addEventListener('hashchange',openReturnHash);

renderShell();
openReturnHash();
