// lib/store.js — localStorage/sessionStorage JSON wrappers
//
// EXTRACTED 2026-09-26 from fold-bloom/app.js:26-27,33 (loadActive/persistActive/readSetMeta),
// which was the canonical copy of a kv-read/kv-write idiom (JSON.parse inside try/catch,
// fallback on missing/corrupt) that is reproduced across the repo — a grep for
// `JSON.parse((sessionStorage|localStorage).getItem` matches 21 files, and the
// `getItem(...)||'null'|'{}'` variant matches 62.
//
// Each wrapper resolves its storage object lazily per call, so importing this module is
// side-effect free: it works in plain node, in tests, and in any browser context.
//
// SCOPE — what this module must NOT become:
//   - not a key registry (no manifest of keys, prefixes or namespaces; the caller
//     keeps its key/prefix and passes it in)
//   - not a schema migrator (no versioning, no migration hooks, no upgrade paths)
//   - not a sync layer (no device sync, no cross-tab coordination, no events)
//   - not a backend abstraction (it is the adapter for exactly these two storages)
// get() always JSON-decodes, so raw-string payloads (textRuntime, cachedSourceGlyph)
// stay on direct storage access in callers — do not route them through here.
// If a storage flavor is ever genuinely needed, add one named function beside these.
// Do not introduce a `store(storage, {options})` factory with an options object.

function makeStore(resolveStorage, key, fallback) {
  return {
    get() {
      const storage = resolveStorage();
      if (!storage) return fallback;
      let raw = null;
      try {
        raw = storage.getItem(key);
      } catch (_) {
        return fallback;
      }
      if (raw == null) return fallback;
      try {
        const parsed = JSON.parse(raw);
        return parsed == null ? fallback : parsed;
      } catch (_) {
        return fallback;
      }
    },
    set(v) {
      let json;
      try {
        json = JSON.stringify(v);
      } catch (_) {
        return v;
      }
      const storage = resolveStorage();
      if (!storage) return v;
      try {
        storage.setItem(key, json);
      } catch (_) {}
      return v;
    },
    del() {
      const storage = resolveStorage();
      if (!storage) return;
      try {
        storage.removeItem(key);
      } catch (_) {}
    },
  };
}

/** JSON wrapper over localStorage. Missing/corrupt reads yield `fallback`. */
export function kv(key, fallback = null) {
  return makeStore(() => globalThis.localStorage, key, fallback);
}

/** JSON wrapper over sessionStorage. Missing/corrupt reads yield `fallback`. */
export function skv(key, fallback = null) {
  return makeStore(() => globalThis.sessionStorage, key, fallback);
}