// lib/id.js — content identity primitives
//
// EXTRACTED 2026-09-26 from fold-bloom/app.js:23-25, which was the canonical copy of a
// function that had been reproduced VERBATIM in at least nine places across the repo:
//
//   fold-bloom/app.js                 fold-bloom/set/vault-bridge.js
//   fold-bloom/live/track.js          fold-bloom/journey/app.js
//   fold-bloom/set/app.js             fold-bloom/atlas/app.js
//   fold-bloom/listen/vault-handoff.js  (the first consumer rewired)
//   finder/interphase-core.js         tools/field-policy-trace.mjs
//
// The prefix 'sha256:' is part of the contract, not decoration: it is what the vault
// handoff, the field index and the receipt format all compare against. Do not change it
// without migrating consumers.
//
// SCOPE — what this module must NOT become:
//   - not a hashing *framework* (no algorithm registry, no plugin selection)
//   - not async plumbing (no queue, no pool, no progress events)
//   - not an identity *system* (it derives a digest; it does not assign or own identity)
// If a second algorithm is ever genuinely needed, add one named function beside these.
// Do not introduce a `hash(text, {algo})` options object.

/** Digest arbitrary bytes to bare lowercase hex. No prefix. */
export function hashHex(buf) {
  return crypto.subtle
    .digest('SHA-256', buf)
    .then(h => Array.from(new Uint8Array(h), b => b.toString(16).padStart(2, '0')).join(''));
}

/** Digest a File/Blob to `sha256:<hex>`. */
export async function hashFile(file) {
  return 'sha256:' + await hashHex(await file.arrayBuffer());
}

/** Digest a string to `sha256:<hex>`. */
export async function hashText(text) {
  return 'sha256:' + await hashHex(new TextEncoder().encode(text));
}
