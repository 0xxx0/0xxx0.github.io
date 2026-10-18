// CARE's read-only password-encrypted transport. Passwords never enter a URL or request.
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
export const SCHEMA = '0xxx0/care-sealed/v0.2';
export const ITERATIONS = 600000;
export const MAX_BYTES = 524288;
export function encode64(bytes) {
  let raw = ''; for (const b of bytes) raw += String.fromCharCode(b);
  return btoa(raw).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}
export function decode64(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid encoding');
  const raw = atob(value.replaceAll('-', '+').replaceAll('_', '/'));
  return Uint8Array.from(raw, x => x.charCodeAt(0));
}
export function parseShare(hash) {
  const match = /^#brief=([a-f0-9]{32})$/.exec(hash);
  if (!match) throw new Error('A current password-protected sharing link is required.');
  return { id: match[1] };
}
const aad = id => encoder.encode(SCHEMA + '|' + id + '|PBKDF2-SHA256|' + ITERATIONS + '|AES-256-GCM');
async function passwordKey(password, salt, usage) {
  if (typeof password !== 'string' || password.length < 16 || password.length > 256) throw new Error('Invalid password length');
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS }, material, { name: 'AES-GCM', length: 256 }, false, [usage]);
}
export async function sealSnapshot(payload, id, password) {
  if (!/^[a-f0-9]{32}$/.test(id)) throw new Error('Invalid snapshot ID');
  const data = encoder.encode(JSON.stringify(payload));
  if (data.length > MAX_BYTES) throw new Error('Snapshot is too large');
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await passwordKey(password, salt, 'encrypt');
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad(id) }, key, data);
  return { schema: SCHEMA, id, kdf: 'PBKDF2-SHA256', iterations: ITERATIONS, salt: encode64(salt), iv: encode64(iv), ciphertext: encode64(new Uint8Array(encrypted)) };
}
export async function openSnapshot(envelope, id, password) {
  if (!envelope || envelope.schema !== SCHEMA || envelope.id !== id) throw new Error('Snapshot identity mismatch');
  if (envelope.kdf !== 'PBKDF2-SHA256' || envelope.iterations !== ITERATIONS) throw new Error('Unsupported derivation parameters');
  const salt = decode64(envelope.salt), iv = decode64(envelope.iv), ciphertext = decode64(envelope.ciphertext);
  if (salt.length !== 16 || iv.length !== 12 || ciphertext.length < 16 || ciphertext.length > MAX_BYTES + 16) throw new Error('Invalid snapshot size or parameters');
  const key = await passwordKey(password, salt, 'decrypt');
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: aad(id) }, key, ciphertext);
  // v1.2 optional compression. Existing uncompressed links remain compatible.
  // Decompress ONLY after authentication, cap inflated bytes, never persist plaintext.
  let clear = new Uint8Array(plain);
  if (envelope.compression !== undefined) {
    if (envelope.compression !== 'gzip' || typeof DecompressionStream === 'undefined') throw new Error('Unsupported snapshot compression');
    const expanded = await new Response(new Blob([clear]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    if (expanded.byteLength > MAX_BYTES) throw new Error('Expanded snapshot too large');
    clear = new Uint8Array(expanded);
  }
  const payload = JSON.parse(decoder.decode(clear));
  if (payload?.schema !== '0xxx0/care-share/v0.1' || payload?.case?.schema !== '0xxx0/care-case/v0.3' || !payload.case.id) throw new Error('Unsupported care snapshot');
  return payload;
}
