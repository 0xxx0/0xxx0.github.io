// lib/store.js — the ESM face of the storage wrappers. PROJECTION of lib/micro.js.
//
// PHASE 2 of the microlib (2026-10-06) — ONE IMPLEMENTATION, NOT TWO. lib/micro.js
// carries the bodies (extracted 2026-09-26 from fold-bloom/app.js:26-27,33 — the
// canonical kv-read/kv-write idiom, JSON.parse inside try/catch, fallback on
// missing/corrupt); this module re-exports the SAME objects. Do not copy bodies back.
//
// Semantics (unchanged): get() always JSON-decodes; missing/corrupt reads and an absent
// storage all yield `fallback`; set() returns the value written; del() removes.
// Raw-string payloads (textRuntime, cachedSourceGlyph) stay on direct storage access in
// callers — do not route them through here. Storage objects are resolved lazily per
// call, so importing this module is side-effect free beyond the core's own load.
//
// API (unchanged, add-only): kv, skv. (makeStore stays private to the core.)
//
// SCOPE — what this module must NOT become (inherited, still binding):
//   - not a key registry (no manifest of keys/prefixes/namespaces)
//   - not a schema migrator / sync layer / backend abstraction
//   - no `store(storage, {options})` factory with an options object

import './micro.js';

const micro = globalThis.Micro;
if (!micro) throw new Error('lib/store.js: globalThis.Micro missing — lib/micro.js did not run');

/** JSON wrapper over localStorage. Missing/corrupt reads yield `fallback`. */
export const kv = micro.kv;
/** JSON wrapper over sessionStorage. Missing/corrupt reads yield `fallback`. */
export const skv = micro.skv;