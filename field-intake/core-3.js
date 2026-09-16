function parseObservation(raw, text, common) {
  let working = common.text;
  let observedAt;
  const atMatch = working.match(/(?:^|\s)at:(\d{1,2}:\d{2})\b/i);
  if (atMatch && isTime(atMatch[1])) {
    observedAt = normalizeTime(atMatch[1]);
    const token = atMatch[0].trim();
    pushEvidence(common.evidence, 'observedAt', token, observedAt);
    working = stripToken(working, token);
  }
  const title = normalize(working) || normalize(text) || 'Untitled observation';
  const signature = { kind: 'observation', title, observedAt, contexts: common.contexts, tags: common.tags, refs: common.refs };
  return { ...baseRecord('observation', raw, title, common, signature), ...(observedAt ? { observedAt } : {}) };
}

function parseClaim(raw, text, common) {
  let working = common.text;
  let confidence;
  const match = working.match(/(?:^|\s)\?(0(?:\.\d+)?|1(?:\.0+)?)\b/);
  if (match) {
    confidence = Number(match[1]);
    const token = match[0].trim();
    pushEvidence(common.evidence, 'confidence', token, confidence);
    working = stripToken(working, token);
  }
  const title = normalize(working) || normalize(text) || 'Untitled claim';
  const signature = { kind: 'claim', title, confidence, contexts: common.contexts, tags: common.tags, refs: common.refs };
  return { ...baseRecord('claim', raw, title, common, signature), ...(confidence === undefined ? {} : { confidence }) };
}

function parseMeasurement(raw, text, common) {
  const title = common.text || normalize(text) || 'Untitled measurement';
  const match = title.match(/(-?\d+(?:\.\d+)?)\s*(mm|cm|m|kg|g|°c|c|%|v|a|w|db|hz|ms|s)\b/i);
  let value;
  let unit;
  const warnings = [];
  if (match) {
    value = Number(match[1]);
    unit = match[2];
    pushEvidence(common.evidence, 'measurement', match[0], { value, unit });
  } else {
    warnings.push('no numeric measurement detected; text remains authoritative');
  }
  const signature = { kind: 'measurement', title, value, unit, contexts: common.contexts, tags: common.tags, refs: common.refs };
  return { ...baseRecord('measurement', raw, title, common, signature, warnings), ...(value === undefined ? {} : { value }), ...(unit === undefined ? {} : { unit }) };
}

function compileCapture(text, defaultKind = 'task', options = {}) {
  const dayStart = options.dayStart ?? '11:00';
  const dayEnd = options.dayEnd ?? '23:00';
  const records = [];
  const diagnostics = [];
  for (const rawLine of String(text ?? '').replace(/\r/g, '').split('\n')) {
    const raw = rawLine.trim();
    if (!raw || raw.startsWith('//')) continue;
    const detected = detectKind(raw, defaultKind);
    const common = extractCommon(detected.text);
    if (detected.token) common.evidence.unshift({ field: 'kind', token: detected.token, value: detected.kind });
    let record;
    if (detected.kind === 'task') record = parseTask(raw, detected.text, common, dayStart, dayEnd);
    else if (detected.kind === 'anchor') record = parseAnchor(raw, detected.text, common, dayStart, dayEnd);
    else if (detected.kind === 'observation') record = parseObservation(raw, detected.text, common);
    else if (detected.kind === 'claim') record = parseClaim(raw, detected.text, common);
    else record = parseMeasurement(raw, detected.text, common);
    records.push(record);
    for (const warning of record.source.warnings) diagnostics.push(`${record.title}: ${warning}`);
  }
  return { records, diagnostics };
}

function emptyState() {
  return {
    meta: { title: 'ATLAS DAYLINE', dayStart: '11:00', dayEnd: '23:00', schema: PROTOCOL },
    state: { now: '11:00', contexts: [], horizon: 180, route: [] },
    tasks: [], anchors: [], observations: [], claims: [], measurements: [], events: [], ingressReceipts: [],
  };
}

function collectionFor(state, kind) {
  if (kind === 'task') return state.tasks;
  if (kind === 'anchor') return state.anchors;
  if (kind === 'observation') return state.observations;
  if (kind === 'claim') return state.claims;
  return state.measurements;
}

function comparable(record) {
  const value = clone(record);
  delete value.source;
  return value;
}

function sameEntity(left, right) {
  return stable(comparable(left)) === stable(comparable(right));
}

function allRecords(state) {
  return KINDS.flatMap(kind => collectionFor(state, kind));
}

function analyzeCandidate(base, record) {
  const collection = collectionFor(base, record.kind);
  const existing = collection.find(item => item.id === record.id);
  if (existing) {
    if (sameEntity(existing, record)) return { operation: 'noop', severity: 'info', reason: 'same stable ID and canonical content already exist', existingId: existing.id };
    return { operation: 'conflict', severity: 'error', reason: 'same stable ID exists with different canonical content', existingId: existing.id };
  }
  const title = normalize(record.title).toLowerCase();
  const soft = collection.find(item => normalize(item.title).toLowerCase() === title);
  if (soft) return { operation: 'review', severity: 'warn', reason: 'same normalized title exists with different stable content', softDuplicateId: soft.id };
  return { operation: 'add', severity: 'safe', reason: 'new stable record' };
}
