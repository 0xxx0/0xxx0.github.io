// CAP-IR v0.1 — canonical object identity, provenance, transform history, and RETURN receipts.
// Pure browser module; no backend, account, analytics, or hidden inference.

export const CAP_IR_VERSION = '0.1.0';

const enc = new TextEncoder();

export function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + stableStringify(value[k])).join(',') + '}';
}

export function hash32(input = '') {
  const bytes = enc.encode(String(input));
  let h = 2166136261;
  for (const b of bytes) {
    h ^= b;
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function hashValue(value) {
  return hash32(stableStringify(value));
}

export function makeId(sourceText = '', namespace = 'cap') {
  const seed = `${namespace}:${Date.now()}:${Math.random()}:${sourceText}`;
  return `${namespace}:${hash32(seed)}`;
}

export function addressOf(object, projection = 'object', range = null) {
  return {
    id: object.id,
    uri: `cap://${object.id}/${projection}`,
    projection,
    parent: object.address?.parent ?? null,
    range,
  };
}

export function createObject({ title = 'Untitled', source = '', sourceClass = 'USER', type = 'generic', fields = {} } = {}) {
  const id = makeId(source || title);
  const capturedAt = new Date().toISOString();
  const object = {
    schema: `cap-ir/${CAP_IR_VERSION}`,
    id,
    type,
    title,
    source: {
      exact: source,
      class: sourceClass,
      hash: hash32(source),
      capturedAt,
    },
    address: { self: `cap://${id}`, parent: null, range: null },
    fields: structuredClone(fields),
    relations: [],
    evidence: [],
    history: [],
    returns: [],
    createdAt: capturedAt,
    updatedAt: capturedAt,
  };
  object.history.push({
    id: `evt:${hash32(id + capturedAt)}`,
    op: 'CAPTURE',
    projection: 'source',
    at: capturedAt,
    before: null,
    after: canonicalHash(object),
    note: 'Exact source captured; stable identity minted.',
  });
  return object;
}

export function canonicalPayload(object) {
  return {
    id: object.id,
    type: object.type,
    title: object.title,
    source: object.source,
    fields: object.fields,
    relations: object.relations,
    evidence: object.evidence,
  };
}

export function canonicalHash(object) {
  return hashValue(canonicalPayload(object));
}

export function transform(object, { op, projection, patch = {}, note = '', evidence = null } = {}) {
  if (!op) throw new Error('transform requires op');
  const before = canonicalHash(object);
  const next = structuredClone(object);
  if (patch.title !== undefined) next.title = patch.title;
  if (patch.type !== undefined) next.type = patch.type;
  if (patch.fields) next.fields = { ...next.fields, ...structuredClone(patch.fields) };
  if (patch.relations) next.relations = structuredClone(patch.relations);
  if (evidence) next.evidence.push(structuredClone(evidence));
  next.updatedAt = new Date().toISOString();
  const after = canonicalHash(next);
  next.history.push({
    id: `evt:${hash32(`${next.id}:${next.history.length}:${after}`)}`,
    op,
    projection: projection || 'object',
    at: next.updatedAt,
    before,
    after,
    note,
  });
  return next;
}

export function makeReturn(object, { delta = '', residue = '', next = '', proof = '' } = {}) {
  if (!delta.trim()) throw new Error('RETURN requires delta');
  if (!proof.trim()) throw new Error('RETURN requires proof');
  const at = new Date().toISOString();
  const receipt = {
    schema: `cap-return/${CAP_IR_VERSION}`,
    id: `ret:${hash32(`${object.id}:${at}:${delta}`)}`,
    objectId: object.id,
    address: addressOf(object, 'return'),
    sourceHash: object.source.hash,
    canonicalHash: canonicalHash(object),
    delta: delta.trim(),
    residue: residue.trim(),
    next: next.trim(),
    proof: proof.trim(),
    at,
  };
  const nextObject = structuredClone(object);
  nextObject.returns.push(receipt);
  nextObject.history.push({
    id: `evt:${hash32(receipt.id + ':return')}`,
    op: 'RETURN',
    projection: 'return',
    at,
    before: canonicalHash(object),
    after: canonicalHash(object),
    note: `Receipt ${receipt.id}`,
  });
  nextObject.updatedAt = at;
  return { object: nextObject, receipt };
}

export function encodeCapsule(object) {
  const json = JSON.stringify(object);
  const bytes = enc.encode(json);
  let binary = '';
  bytes.forEach(b => { binary += String.fromCharCode(b); });
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

export function decodeCapsule(encoded) {
  const padded = encoded.replaceAll('-', '+').replaceAll('_', '/') + '==='.slice((encoded.length + 3) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

export function verifyObject(object) {
  const errors = [];
  if (!object?.id?.startsWith('cap:')) errors.push('missing/invalid stable id');
  if (!object?.source?.exact && object?.source?.exact !== '') errors.push('missing exact source');
  if (object?.source?.hash !== hash32(object?.source?.exact || '')) errors.push('source hash mismatch');
  if (object?.address?.self !== `cap://${object.id}`) errors.push('self address mismatch');
  if (!Array.isArray(object?.history)) errors.push('history missing');
  if (!Array.isArray(object?.returns)) errors.push('returns missing');
  return { ok: errors.length === 0, errors, hash: canonicalHash(object) };
}

export function parseTextSource(text) {
  const lines = String(text).split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  const atoms = lines.map((value, index) => ({
    id: `atom:${index}:${hash32(value)}`,
    index,
    value,
    kind: /^[-*]\s/.test(value) ? 'item' : /:\s/.test(value) ? 'pair' : 'text',
  }));
  return { lines: lines.length, atoms };
}

export function parseCsvSource(text) {
  const rows = String(text).trim().split(/\r?\n/).filter(Boolean).map(r => r.split(',').map(x => x.trim()));
  if (!rows.length) return { headers: [], records: [] };
  const headers = rows[0].map((h, i) => h || `field_${i + 1}`);
  const records = rows.slice(1).map((row, rowIndex) => ({
    id: `record:${rowIndex}:${hash32(row.join('|'))}`,
    fields: Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ''])),
  }));
  return { headers, records };
}

export function selfTest() {
  const o0 = createObject({ title: 'Kernel test', source: 'alpha\nbeta' });
  const id = o0.id;
  const o1 = transform(o0, { op: 'PARSE', projection: 'text', patch: { fields: { parsed: parseTextSource(o0.source.exact) } } });
  const rr = makeReturn(o1, { delta: 'parsed', proof: 'two atoms visible', residue: 'none', next: 'project' });
  const capsule = encodeCapsule(rr.object);
  const restored = decodeCapsule(capsule);
  const checks = [
    ['stable identity survives transform', o1.id === id],
    ['source remains exact', o1.source.exact === o0.source.exact],
    ['source hash remains valid', verifyObject(o1).ok],
    ['history appends', o1.history.length === o0.history.length + 1],
    ['RETURN preserves identity', rr.object.id === id],
    ['RETURN records receipt', rr.object.returns.at(-1)?.id === rr.receipt.id],
    ['capsule round-trip preserves identity', restored.id === id],
    ['capsule round-trip preserves canonical hash', canonicalHash(restored) === canonicalHash(rr.object)],
  ];
  return { ok: checks.every(([, ok]) => ok), checks };
}
