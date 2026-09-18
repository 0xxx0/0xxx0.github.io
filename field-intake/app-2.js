function renderCandidates() {
  const list = document.querySelector('#candidateList');
  const diagnostics = document.querySelector('#diagnostics');
  const gateCount = document.querySelector('#gateCount');
  const accepted = envelope.candidates.filter(c => ['add', 'replace', 'noop'].includes(c.resolution)).length;
  const review = envelope.candidates.filter(c => c.analysis.severity === 'warn').length;
  const conflict = envelope.candidates.filter(c => c.analysis.severity === 'error').length;
  gateCount.textContent = `${accepted} resolved · ${review} review · ${conflict} conflict`;
  diagnostics.hidden = envelope.diagnostics.length === 0;
  diagnostics.textContent = envelope.diagnostics.join(' · ');

  renderRibbon();

  if (!envelope.candidates.length) {
    list.innerHTML = '<div class="empty">Capture something. The gate will show what it proposes, why, and whether it collides with canonical state.</div>';
    return;
  }

  list.innerHTML = envelope.candidates.map(candidate => {
    const label = analysisLabel(candidate);
    const evidenceCount = candidate.record.source?.evidence?.length || 0;
    const refCount = candidate.record.refs?.length || 0;
    return `<article class="candidate ${selectedCandidateId === candidate.candidateId ? 'selected' : ''}" data-candidate="${candidate.candidateId}">
      <div class="sigil" data-kind="${candidate.kind}">${candidate.kind.slice(0, 1).toUpperCase()}<small>${evidenceCount}</small></div>
      <div class="candidate-main">
        <div class="candidate-top"><span class="record-kind">${candidate.kind}</span><span class="status ${label.toLowerCase()}">${label}</span>${refCount ? `<span class="refcount">${refCount} ref</span>` : ''}</div>
        <h3>${esc(candidate.record.title)}</h3>
        <p>${esc(recordSummary(candidate.record))}</p>
        <small>${esc(candidate.analysis.reason)}</small>
        <div class="resolution-row">${resolutionOptions(candidate).map(([value, text]) => `<button data-resolution="${value}" class="resolve ${candidate.resolution === value ? 'on' : ''}">${text}</button>`).join('')}</div>
      </div>
    </article>`;
  }).join('');

  list.querySelectorAll('[data-candidate]').forEach(card => {
    card.addEventListener('click', event => {
      if (event.target.closest('[data-resolution]')) return;
      selectedCandidateId = card.dataset.candidate;
      prefs.rightMode = 'trace';
      save();
      render();
    });
    card.querySelectorAll('[data-resolution]').forEach(button => {
      button.onclick = event => {
        event.stopPropagation();
        const id = card.dataset.candidate;
        const current = envelope.candidates.find(c => c.candidateId === id);
        const next = current.resolution === button.dataset.resolution ? 'pending' : button.dataset.resolution;
        envelope = setResolution(envelope, id, next);
        selectedCandidateId = id;
        prefs.rightMode = 'trace';
        render();
      };
    });
  });
}

function renderRibbon() {
  const ribbon = document.querySelector('#patchRibbon');
  const counts = { add: 0, replace: 0, noop: 0, reject: 0, pending: 0 };
  for (const candidate of envelope.candidates) counts[candidate.resolution] = (counts[candidate.resolution] || 0) + 1;
  ribbon.innerHTML = `
    <span class="rib add"><b>+${counts.add}</b> add</span>
    <span class="rib replace"><b>~${counts.replace}</b> replace</span>
    <span class="rib noop"><b>=${counts.noop}</b> noop</span>
    <span class="rib reject"><b>×${counts.reject}</b> reject</span>
    <span class="rib pending"><b>?${counts.pending}</b> unresolved</span>`;
}

function renderTabs() {
  const tabs = document.querySelector('#tabs');
  tabs.querySelectorAll('[data-tab]').forEach(button => {
    button.classList.toggle('on', button.dataset.tab === prefs.rightMode);
    button.onclick = () => {
      prefs.rightMode = button.dataset.tab;
      save();
      renderTabs();
      renderRight();
    };
  });
}

function renderRight() {
  const body = document.querySelector('#rightBody');
  if (prefs.rightMode === 'trace') renderTrace(body);
  else if (prefs.rightMode === 'state') renderState(body);
  else renderReceipts(body);
}

function selectedCandidate() {
  return envelope.candidates.find(c => c.candidateId === selectedCandidateId) || envelope.candidates[0];
}

function findExistingFor(candidate) {
  const targetId = candidate.analysis.existingId || candidate.analysis.softDuplicateId;
  return targetId ? allRecords(state).find(record => record.id === targetId) : null;
}

function fieldDiff(before, after) {
  if (!before) return [];
  const ignore = new Set(['source']);
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const diffs = [];
  for (const key of keys) {
    if (ignore.has(key)) continue;
    const a = JSON.stringify(before[key]);
    const b = JSON.stringify(after[key]);
    if (a !== b) diffs.push({ key, before: before[key], after: after[key] });
  }
  return diffs;
}

