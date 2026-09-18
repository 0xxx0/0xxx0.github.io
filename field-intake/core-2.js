function parseTask(raw, text, common, dayStart, dayEnd) {
  let working = common.text;
  const evidence = common.evidence;
  let duration = 15;
  let value = 3;
  let setup = 1;
  let earliest = dayStart;
  let latest = dayEnd;
  let anchor;
  const depends = [];

  const durationMatch = working.match(/(?:^|\s)~(\d+(?:\.\d+)?)(m|h)\b/i);
  if (durationMatch) {
    duration = Math.round(Number(durationMatch[1]) * (durationMatch[2].toLowerCase() === 'h' ? 60 : 1));
    const token = durationMatch[0].trim();
    pushEvidence(evidence, 'duration', token, duration);
    working = stripToken(working, token);
  }
  const valueMatch = working.match(/(?:^|\s)!(\d)\b/);
  if (valueMatch) {
    value = Math.max(1, Math.min(5, Number(valueMatch[1])));
    const token = valueMatch[0].trim();
    pushEvidence(evidence, 'value', token, value);
    working = stripToken(working, token);
  }
  const setupMatch = working.match(/(?:^|\s)\^(\d)\b/);
  if (setupMatch) {
    setup = Math.max(0, Math.min(5, Number(setupMatch[1])));
    const token = setupMatch[0].trim();
    pushEvidence(evidence, 'setup', token, setup);
    working = stripToken(working, token);
  }
  const rangeMatch = working.match(/(?:^|\s)(\d{1,2}:\d{2})-(\d{1,2}:\d{2})(?:\s|$)/);
  if (rangeMatch && isTime(rangeMatch[1]) && isTime(rangeMatch[2])) {
    earliest = normalizeTime(rangeMatch[1]);
    latest = normalizeTime(rangeMatch[2]);
    const token = rangeMatch[0].trim();
    pushEvidence(evidence, 'window', token, [earliest, latest]);
    working = stripToken(working, token);
  }
  const earliestMatch = working.match(/(?:^|\s)>(\d{1,2}:\d{2})(?:\s|$)/);
  if (earliestMatch && isTime(earliestMatch[1])) {
    earliest = normalizeTime(earliestMatch[1]);
    const token = earliestMatch[0].trim();
    pushEvidence(evidence, 'earliest', token, earliest);
    working = stripToken(working, token);
  }
  const latestMatch = working.match(/(?:^|\s)<(\d{1,2}:\d{2})(?:\s|$)/);
  if (latestMatch && isTime(latestMatch[1])) {
    latest = normalizeTime(latestMatch[1]);
    const token = latestMatch[0].trim();
    pushEvidence(evidence, 'latest', token, latest);
    working = stripToken(working, token);
  }
  const anchorMatch = working.match(/(?:^|\s)&([a-z0-9:_-]+)\b/i);
  if (anchorMatch) {
    anchor = anchorMatch[1];
    const token = anchorMatch[0].trim();
    pushEvidence(evidence, 'anchor', token, anchor);
    working = stripToken(working, token);
  }
  for (const match of [...working.matchAll(/(?:^|\s)after:([a-z0-9:_-]+)\b/gi)]) {
    depends.push(match[1]);
    const token = match[0].trim();
    pushEvidence(evidence, 'depends', token, match[1]);
    working = stripToken(working, token);
  }

  const title = normalize(working) || normalize(text) || 'Untitled task';
  const signature = { kind: 'task', title, duration, value, setup, earliest, latest, contexts: common.contexts, tags: common.tags, refs: common.refs, anchor, depends };
  return {
    ...baseRecord('task', raw, title, common, signature),
    duration,
    value,
    earliest,
    latest,
    setup,
    depends,
    status: 'open',
    ...(anchor ? { anchor } : {}),
  };
}

function parseAnchor(raw, text, common, dayStart, dayEnd) {
  let working = common.text;
  let start = dayStart;
  let end = dayEnd;
  const rangeMatch = working.match(/(?:^|\s)(\d{1,2}:\d{2})-(\d{1,2}:\d{2})(?:\s|$)/);
  if (rangeMatch && isTime(rangeMatch[1]) && isTime(rangeMatch[2])) {
    start = normalizeTime(rangeMatch[1]);
    end = normalizeTime(rangeMatch[2]);
    const token = rangeMatch[0].trim();
    pushEvidence(common.evidence, 'window', token, [start, end]);
    working = stripToken(working, token);
  }
  const title = normalize(working) || normalize(text) || 'Untitled anchor';
  const signature = { kind: 'anchor', title, start, end, contexts: common.contexts, tags: common.tags, refs: common.refs };
  const warnings = rangeMatch ? [] : ['anchor uses default day window; add HH:MM-HH:MM'];
  return { ...baseRecord('anchor', raw, title, common, signature, warnings), start, end };
}
