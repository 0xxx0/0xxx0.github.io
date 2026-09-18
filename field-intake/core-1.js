const PROTOCOL = 'poly.ingress/v0.4';
const KINDS = ['task', 'anchor', 'observation', 'claim', 'measurement'];

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function stable(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + stable(value[key])).join(',') + '}';
}

function hash(value) {
  const input = typeof value === 'string' ? value : stable(value);
  let result = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i += 1) {
    result ^= input.charCodeAt(i);
    result = Math.imul(result, 16777619) >>> 0;
  }
  return result.toString(36).padStart(7, '0');
}

function normalize(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function slug(value) {
  return normalize(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 42) || 'record';
}

function isTime(value) {
  if (!/^\d{1,2}:\d{2}$/.test(value)) return false;
  const [hours, minutes] = value.split(':').map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

function normalizeTime(value) {
  const [hours, minutes] = value.split(':').map(Number);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function stripToken(text, token) {
  return text.replace(token, ' ').replace(/\s+/g, ' ').trim();
}

function pushEvidence(evidence, field, token, value) {
  evidence.push({ field, token, value });
}

function detectKind(raw, defaultKind) {
  const trimmed = raw.trim();
  const patterns = [
    [/^\[task\]\s*/i, 'task'],
    [/^\[anchor\]\s*/i, 'anchor'],
    [/^\[obs(?:ervation)?\]\s*/i, 'observation'],
    [/^\[claim\]\s*/i, 'claim'],
    [/^\[measure(?:ment)?\]\s*/i, 'measurement'],
  ];
  for (const [pattern, kind] of patterns) {
    const match = trimmed.match(pattern);
    if (match) return { kind, text: trimmed.slice(match[0].length).trim(), token: match[0].trim() };
  }
  if (trimmed.startsWith('=')) return { kind: 'anchor', text: trimmed.slice(1).trim(), token: '=' };
  return { kind: defaultKind, text: trimmed };
}

function extractCommon(rawText) {
  let text = rawText;
  const evidence = [];
  const noteParts = text.split('//');
  const notes = noteParts.length > 1 ? noteParts.slice(1).join('//').trim() : '';
  if (notes) pushEvidence(evidence, 'notes', '//' + notes, notes);
  text = noteParts[0].trim();

  let explicitId;
  const idMatch = text.match(/(?:^|\s)id:([a-z0-9:_-]+)\b/i);
  if (idMatch) {
    explicitId = idMatch[1];
    const token = idMatch[0].trim();
    pushEvidence(evidence, 'id', token, explicitId);
    text = stripToken(text, token);
  }

  const contexts = [...text.matchAll(/(?:^|\s)@([a-z0-9_-]+)/gi)].map(match => match[1].toLowerCase());
  const tags = [...text.matchAll(/(?:^|\s)#([a-z0-9_-]+)/gi)].map(match => match[1].toLowerCase());
  const refs = [...text.matchAll(/(?:^|\s)ref:([a-z0-9:_-]+)/gi)].map(match => match[1]);

  for (const context of contexts) {
    const token = '@' + context;
    pushEvidence(evidence, 'context', token, context);
    text = stripToken(text, token);
  }
  for (const tag of tags) {
    const token = '#' + tag;
    pushEvidence(evidence, 'tag', token, tag);
    text = stripToken(text, token);
  }
  for (const ref of refs) {
    const token = 'ref:' + ref;
    pushEvidence(evidence, 'ref', token, ref);
    text = stripToken(text, token);
  }

  return {
    text: normalize(text),
    contexts: [...new Set(contexts)],
    tags: [...new Set(tags)],
    refs: [...new Set(refs)],
    explicitId,
    notes,
    evidence,
  };
}

function recordId(kind, title, signature) {
  const prefix = { task: 't', anchor: 'a', observation: 'o', claim: 'c', measurement: 'm' };
  return `${prefix[kind]}:${slug(title)}-${hash(signature).slice(-5)}`;
}

function baseRecord(kind, raw, title, common, signature, warnings = []) {
  return {
    id: common.explicitId || recordId(kind, title, signature),
    kind,
    title,
    contexts: common.contexts,
    tags: common.tags,
    refs: common.refs,
    notes: common.notes,
    source: { raw, evidence: common.evidence, warnings },
  };
}
