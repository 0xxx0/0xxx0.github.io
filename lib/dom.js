// lib/dom.js — browser DOM primitives shared across fold-bloom pages
//
// EXTRACTED 2026-09-26 VERBATIM (bodies unchanged) from duplicated copies:
//
//   esc       fold-bloom/atlas/app.js:112   canonical 5-key form
//   toast     fold-bloom/app.js:22          behavior; plus the missing-el
//             no-op guard of fold-bloom/listen/app.js:23
//   $ / $$    fold-bloom/listen/app.js:18   querySelector idiom
//   fmtClock  fold-bloom/listen/app.js:25   fmt, renamed; body byte-identical
//   fmtMark   fold-bloom/listen/app.js:26   byte-identical body
//   download  fold-bloom/listen/app.js:45-50 generic objectURL/anchor/click/
//             revoke-after-1000ms pattern (glyph-specific naming STAYS in
//             the callers, e.g. downloadGlyph in listen/app.js)
//
// ONE documented deviation from verbatim: esc() takes the CORRECT 5-key form
// whose '"' maps to '&quot;' (with semicolon). fold-bloom/app.js:23 carries a
// typo copy ('&quot' missing the semicolon). No other file's esc is touched;
// the lib is the corrected canonical form.
//
// SCOPE — what this module must NOT become:
//   - not rendering (no paint/draw/diff helpers; markup stays in callers)
//   - not components (no classes, no element factories, no shadow DOM)
//   - not lifecycle (no boot/teardown hooks, no observers, no global state)
//   - not a widget system (no registry, no factory, no options bags beyond
//     what these functions already take)
// It only moves the bytes the callers already agree on.

/** Escape text for safe insertion into HTML (5 keys: & < > " '). */
export function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}

/**
 * Flash a message on the toast element: set text, retrigger the 'on' class
 * (forced reflow between remove/add), clear any pending removal timer and
 * drop the class after ms. No-op when the element is missing. Default el is
 * resolved lazily at call time (`#toast`), never at module load.
 */
export function toast(msg,{el,ms=1400}={}){
  const e=el??document.querySelector('#toast');if(!e)return;
  e.textContent=msg;e.classList.remove('on');void e.offsetWidth;e.classList.add('on');
  clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('on'),ms);
}

/** First element matching a CSS selector. */
export const $=s=>document.querySelector(s);

/** All elements matching a CSS selector, as an Array. */
export const $$=s=>[...document.querySelectorAll(s)];

/** Seconds -> `m:ss` (e.g. 83.4 -> `1:23`). Non-finite -> `0:00`. */
export function fmtClock(t){if(!Number.isFinite(t))return'0:00';const m=Math.floor(t/60),s=Math.floor(t%60);return `${m}:${String(s).padStart(2,'0')}`}

/** Seconds -> `m:ss.s` (e.g. 83.42 -> `1:23.4`). Non-finite -> `0:00.0`. */
export function fmtMark(t){if(!Number.isFinite(t))return'0:00.0';const m=Math.floor(Math.max(0,t)/60),sec=Math.max(0,t)-m*60;return `${m}:${sec.toFixed(1).padStart(4,'0')}`}

/** Save a blob to a local file: objectURL -> anchor click -> revoke after 1000ms. */
export function download(name,blob,mime='application/octet-stream'){
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([blob],{type:mime}));
  a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}