function knownIds(base, compiled) {
  return new Set([...allRecords(base).map(record => record.id), ...compiled.records.map(record => record.id)]);
}

function unresolvedRefs(base, compiled, record) {
  const ids = knownIds(base, compiled);
  return (record.refs || []).filter(ref => !ids.has(ref));
}

function makeEnvelope(base, compiled, source) {
  const baseHash = hash(base);
  const candidates = compiled.records.map((record, index) => {
    const analysis = analyzeCandidate(base, record);
    const unresolved = unresolvedRefs(base, compiled, record);
    if (unresolved.length && analysis.severity === 'safe') {
      analysis.operation = 'review';
      analysis.severity = 'warn';
      analysis.reason = `unresolved reference${unresolved.length > 1 ? 's' : ''}: ${unresolved.join(', ')}`;
      analysis.unresolvedRefs = unresolved;
    }
    return {
      candidateId: `cand:${hash(record.kind + '|' + record.id + '|' + index)}`,
      kind: record.kind,
      record: clone(record),
      resolution: 'pending',
      analysis,
    };
  });
  return {
    protocol: PROTOCOL,
    patchId: `patch:${hash(baseHash + '|' + stable(source) + '|' + stable(candidates.map(candidate => candidate.record)))}`,
    createdAt: new Date().toISOString(),
    baseHash,
    source: clone(source),
    candidates,
    diagnostics: clone(compiled.diagnostics),
  };
}

function setResolution(envelope, candidateId, resolution) {
  const next = clone(envelope);
  const candidate = next.candidates.find(item => item.candidateId === candidateId);
  if (!candidate) throw new Error('candidate not found');
  candidate.resolution = resolution;
  return next;
}

function acceptSafe(envelope) {
  const next = clone(envelope);
  for (const candidate of next.candidates) {
    if (candidate.analysis.severity === 'safe') candidate.resolution = 'add';
    if (candidate.analysis.operation === 'noop') candidate.resolution = 'noop';
  }
  return next;
}

function removeRecord(state, kind, id) {
  if (kind === 'task') state.tasks = state.tasks.filter(item => item.id !== id);
  else if (kind === 'anchor') state.anchors = state.anchors.filter(item => item.id !== id);
  else if (kind === 'observation') state.observations = state.observations.filter(item => item.id !== id);
  else if (kind === 'claim') state.claims = state.claims.filter(item => item.id !== id);
  else state.measurements = state.measurements.filter(item => item.id !== id);
}

function pushRecord(state, record) {
  collectionFor(state, record.kind).push(record);
}

function findRecord(state, id) {
  return allRecords(state).find(record => record.id === id);
}

function deltaTemplate() {
  return { added: [], replaced: [], noops: [], rejected: [], conflicts: [] };
}

function applyEnvelope(base, envelope, at = new Date().toISOString()) {
  const currentHash = hash(base);
  if (currentHash !== envelope.baseHash) throw new Error(`stale patch: expected ${envelope.baseHash}, current ${currentHash}`);
  const state = clone(base);
  const delta = deltaTemplate();
  const forwardRecords = [];
  const beforeRecords = [];

  for (const candidate of envelope.candidates) {
    const currentAnalysis = analyzeCandidate(state, candidate.record);
    const resolution = candidate.resolution;
    if (resolution === 'pending' || resolution === 'reject') {
      delta.rejected.push(candidate.record.id);
      continue;
    }
    if (resolution === 'noop') {
      if (currentAnalysis.operation !== 'noop') {
        delta.conflicts.push({ entityId: candidate.record.id, reason: 'candidate is no longer a NOOP' });
        continue;
      }
      delta.noops.push(candidate.record.id);
      continue;
    }
    if (resolution === 'add') {
      if (currentAnalysis.operation === 'conflict') {
        delta.conflicts.push({ entityId: candidate.record.id, reason: currentAnalysis.reason });
        continue;
      }
      pushRecord(state, clone(candidate.record));
      delta.added.push({ kind: candidate.kind, id: candidate.record.id });
      forwardRecords.push(clone(candidate.record));
      state.events.push({ id: `event:${hash(envelope.patchId + '|' + candidate.candidateId + '|add|' + at)}`, type: 'ingress.add', at, patchId: envelope.patchId, entityId: candidate.record.id, entityKind: candidate.kind });
      continue;
    }
    if (resolution === 'replace') {
      const targetId = currentAnalysis.existingId || currentAnalysis.softDuplicateId;
      const before = targetId ? findRecord(state, targetId) : null;
      if (!before || before.kind !== candidate.kind) {
        delta.conflicts.push({ entityId: candidate.record.id, reason: 'replace target unavailable or changed' });
        continue;
      }
      beforeRecords.push(clone(before));
      removeRecord(state, before.kind, before.id);
      pushRecord(state, clone(candidate.record));
      forwardRecords.push(clone(candidate.record));
      delta.replaced.push({ kind: candidate.kind, beforeId: before.id, afterId: candidate.record.id });
      state.events.push({ id: `event:${hash(envelope.patchId + '|' + candidate.candidateId + '|replace|' + at)}`, type: 'ingress.replace', at, patchId: envelope.patchId, beforeId: before.id, afterId: candidate.record.id, entityKind: candidate.kind });
    }
  }

  const resultHash = hash({ ...state, ingressReceipts: state.ingressReceipts });
  const receiptCore = { protocol: PROTOCOL, patchId: envelope.patchId, baseHash: envelope.baseHash, resultHash, appliedAt: at, source: clone(envelope.source), delta, forwardRecords, beforeRecords };
  const receipt = { ...receiptCore, receiptId: `receipt:${hash(receiptCore)}` };
  state.ingressReceipts.push(receipt);
  state.meta.lastIngressAt = at;
  state.meta.lastIngressReceipt = receipt.receiptId;
  return { state, receipt };
}

function rollbackReceipt(base, receiptId, at = new Date().toISOString()) {
  const state = clone(base);
  const receipt = state.ingressReceipts.find(item => item.receiptId === receiptId);
  if (!receipt) throw new Error('receipt not found');
  if (receipt.rolledBackAt) throw new Error('receipt already rolled back');

  for (const record of receipt.forwardRecords || []) removeRecord(state, record.kind, record.id);
  for (const record of receipt.beforeRecords || []) {
    removeRecord(state, record.kind, record.id);
    pushRecord(state, clone(record));
  }

  receipt.rolledBackAt = at;
  state.events.push({ id: `event:${hash(receiptId + '|rollback|' + at)}`, type: 'ingress.rollback', at, receiptId, removed: (receipt.forwardRecords || []).map(record => record.id), restored: (receipt.beforeRecords || []).map(record => record.id) });
  receipt.rollbackHash = hash(state);
  state.meta.lastIngressAt = at;
  return state;
}

function envelopeFromReceipt(base, receiptId) {
  const receipt = base.ingressReceipts.find(item => item.receiptId === receiptId);
  if (!receipt) throw new Error('receipt not found');
  return makeEnvelope(base, { records: clone(receipt.forwardRecords || []), diagnostics: [] }, { kind: 'replay', receiptId });
}

function countRecords(state) {
  return Object.fromEntries(KINDS.map(kind => [kind, collectionFor(state, kind).length]));
}
