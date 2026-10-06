// lib/dom.js — the ESM face of the shared DOM primitives. PROJECTION of lib/micro.js.
//
// PHASE 2 of the microlib (2026-10-06) — ONE IMPLEMENTATION, NOT TWO. The bodies were
// never retyped: lib/micro.js (the dual-mode core) carries them, and this module
// re-exports the SAME function objects. Do not copy bodies back in here — that
// restores the two-implementation state this phase removed.
//
// History: extracted 2026-09-26 VERBATIM from duplicated copies — esc
// (fold-bloom/atlas/app.js:112), toast (fold-bloom/app.js:22 plus the missing-el no-op
// guard of fold-bloom/listen/app.js:23), $ / $$ / fmtClock / fmtMark / download
// (fold-bloom/listen/app.js:18-50). One documented deviation: esc takes the CORRECT
// 5-key form ('"' -> '&quot;' with semicolon); the fold-bloom/app.js:23 typo copy
// ('&quot' missing the semicolon) stays corrected — the core is the canonical form.
// toast gained the sticky ms:0 extension in the 2026-10-03 adoption wave (#903);
// the core was synced to it 2026-10-06 (verified: one semantic drift, now gone).
//
// API (unchanged, add-only): esc, toast, $, $$, fmtClock, fmtMark, download.
//
// Load modes: ESM pages import THIS file; classic pages load /lib/micro.js directly
// and use the `Micro` global; node can require the core. One implementation serves all.
//
// SCOPE — what this module must NOT become (inherited, still binding):
//   - not rendering (no paint/draw/diff helpers; markup stays in callers)
//   - not components (no classes, no element factories, no shadow DOM)
//   - not lifecycle (no boot/teardown hooks, no observers, no global state)
//   - not a widget system (no registry, no factory, no options bags beyond
//     what these functions already take)
// It only moves the bytes the callers already agree on.

import './micro.js';

const micro = globalThis.Micro;
if (!micro) throw new Error('lib/dom.js: globalThis.Micro missing — lib/micro.js did not run');

/** Escape text for safe insertion into HTML (5 keys: & < > " '). */
export const esc = micro.esc;
/** Flash a message on the toast element (lazy `#toast`; no-op when the element is missing). */
export const toast = micro.toast;
/** First element matching a CSS selector. */
export const $ = micro.$;
/** All elements matching a CSS selector, as an Array. */
export const $$ = micro.$$;
/** Seconds -> `m:ss` (e.g. 83.4 -> `1:23`). Non-finite -> `0:00`. */
export const fmtClock = micro.fmtClock;
/** Seconds -> `m:ss.s` (e.g. 83.42 -> `1:23.4`). Non-finite -> `0:00.0`. */
export const fmtMark = micro.fmtMark;
/** Save a blob to a local file: objectURL -> anchor click -> revoke after 1000ms. */
export const download = micro.download;