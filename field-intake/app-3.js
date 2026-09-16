function renderTrace(body) {
  const candidate = selectedCandidate();
  if (!candidate) {
    body.innerHTML = '<div class="empty">Select a candidate to trace source → evidence → analysis → resolution.</div>';
    return;
  }
  selectedCandidateId = candidate.candidateId;
  const existing = findExistingFor(candidate);
  const diffs = fieldDiff(existing, candidate.record);
  const refs = candidate.record.refs || [];
  const resolvedRefs = refs.map(ref => ({ ref, exists: !!allRecords(state).find(record => record.id === ref) || !!envelope.candidates.find(c => c.record.id === ref) }));
  body.innerHTML = `
    <div class="trace-title"><span>${candidate.kind.toUpperCase()}</span><b>${esc(candidate.record.title)}</b><small>${esc(candidate.record.id)}</small></div>
    <div class="trace-path">
      <section><i>1</i><div><b>SOURCE</b><blockquote>${esc(candidate.record.source.raw)}</blockquote></div></section>
      <section><i>2</i><div><b>EVIDENCE</b><div class="token-map">${candidate.record.source.evidence.length ? candidate.record.source.evidence.map(item => `<span><code>${esc(item.token)}</code><em>${esc(item.field)}</em></span>`).join('') : '<small>defaults only</small>'}</div></div></section>
      <section><i>3</i><div><b>ANALYSIS</b><div class="analysis-box ${analysisLabel(candidate).toLowerCase()}"><strong>${analysisLabel(candidate)}</strong><span>${esc(candidate.analysis.reason)}</span></div></div></section>
      <section><i>4</i><div><b>RESOLUTION</b><div class="resolution-summary">${candidate.resolution.toUpperCase()}</div></div></section>
    </div>
    ${resolvedRefs.length ? `<h4>REFERENCES</h4><div class="reference-list">${resolvedRefs.map(item => `<div class="reference ${item.exists ? 'ok' : 'missing'}"><code>${esc(item.ref)}</code><span>${item.exists ? 'resolved' : 'unresolved'}</span></div>`).join('')}</div>` : ''}
    ${existing ? `<h4>${candidate.analysis.operation === 'conflict' ? 'CURRENT RECORD' : 'POSSIBLE DUPLICATE'}</h4><div class="compare"><div><span>CANONICAL</span><b>${esc(existing.title)}</b><small>${esc(existing.id)}</small></div><div><span>PROPOSED</span><b>${esc(candidate.record.title)}</b><small>${esc(candidate.record.id)}</small></div></div><div class="diff-list">${diffs.length ? diffs.map(diff => `<div><b>${esc(diff.key)}</b><code>${esc(JSON.stringify(diff.before))}</code><span>→</span><code>${esc(JSON.stringify(diff.after))}</code></div>`).join('') : '<small>No canonical field differences.</small>'}</div>` : ''}
    ${candidate.record.source.warnings?.length ? `<div class="warning-box">${candidate.record.source.warnings.map(esc).join('<br>')}</div>` : ''}`;
}
