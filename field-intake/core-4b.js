function recordSummary(record) {
  if (record.kind === 'task') return `${record.earliest}–${record.latest} · ${record.duration}m`;
  if (record.kind === 'anchor') return `${record.start}–${record.end}`;
  if (record.kind === 'measurement' && record.value !== undefined) return `${record.value}${record.unit || ''}`;
  if (record.kind === 'claim' && record.confidence !== undefined) return `confidence ${record.confidence}`;
  if (record.kind === 'observation' && record.observedAt) return `observed ${record.observedAt}`;
  return (record.contexts || []).length ? record.contexts.map(context => '@' + context).join(' ') : 'unbounded';
}

function recordToCapture(record, forceId = true) {
  const parts = [];
  if (record.kind === 'anchor') parts.push('=');
  else if (record.kind === 'observation') parts.push('[obs]');
  else if (record.kind === 'claim') parts.push('[claim]');
  else if (record.kind === 'measurement') parts.push('[measure]');
  else parts.push('[task]');
  parts.push(record.title);
  if (forceId) parts.push(`id:${record.id}`);
  if (record.kind === 'task') {
    if (record.earliest && record.latest) parts.push(`${record.earliest}-${record.latest}`);
    if (record.duration) parts.push(`~${record.duration}m`);
    if (record.value !== undefined) parts.push(`!${record.value}`);
    if (record.setup !== undefined) parts.push(`^${record.setup}`);
    if (record.anchor) parts.push(`&${record.anchor}`);
    for (const dep of record.depends || []) parts.push(`after:${dep}`);
  } else if (record.kind === 'anchor') {
    if (record.start && record.end) parts.push(`${record.start}-${record.end}`);
  } else if (record.kind === 'claim' && record.confidence !== undefined) {
    parts.push(`?${record.confidence}`);
  } else if (record.kind === 'observation' && record.observedAt) {
    parts.push(`at:${record.observedAt}`);
  }
  for (const context of record.contexts || []) parts.push(`@${context}`);
  for (const tag of record.tags || []) parts.push(`#${tag}`);
  for (const ref of record.refs || []) parts.push(`ref:${ref}`);
  if (record.notes) parts.push(`// ${record.notes}`);
  return parts.join(' ').replace(/^=\s+/, '= ');
}

function recordLineage(state, recordId) {
  const events = (state.events || []).filter(event => event.entityId === recordId || event.beforeId === recordId || event.afterId === recordId || (event.removed || []).includes(recordId) || (event.restored || []).includes(recordId));
  const receipts = (state.ingressReceipts || []).filter(receipt => (receipt.forwardRecords || []).some(record => record.id === recordId) || (receipt.beforeRecords || []).some(record => record.id === recordId));
  return { events, receipts };
}
