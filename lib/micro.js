// lib/micro.js — the dual-mode core of the microlib.
//
// WHY THIS FILE EXISTS
//
// 23 modules live in lib/, but only ES-module pages can use them: 57 HTML pages in
// this repo still load classic <script src>, where `import` is a syntax error. So the
// library's reach stops exactly where the duplication is worst. This file is the
// classic-loadable projection of the same primitives, so one implementation serves
// both kinds of page.
//
// THE IDIOM IS NOT INVENTED — it is copied from lib/constraint-surface.js:1,54-56:
//
//     (function(root){ ... root.XCore = api; if(module.exports) module.exports = api; })(globalThis)
//
// That file already proved the pattern ships and runs: classic <script> global,
// CommonJS for node, no build step, no bundler, no npm.
//
// BODIES ARE SINGLE-SOURCED. Every function below comes from an existing lib/ module
// (byte-compared 2026-10-06: all EXACT or whitespace-only vs their source; toast was
// the one semantic drift — the sticky ms:0 extension below — and was synced the same
// day). The only edits are the export mechanism (module exports -> one namespace
// object), IIFE re-indentation, and this header. Provenance per function:
//
//   esc, toast, $, $$, fmtClock, fmtMark, download   lib/dom.js (extracted 2026-09-26;
//             toast synced 2026-10-06 with the sticky ms:0 extension)
//   kv, skv + makeStore                              lib/store.js:23-74
//   TAU, clamp, wrap, circularDelta, pointAngle01,
//   pointSlot, PolarDetent                           lib/polar-control.js:1-52
//
// SCOPE — what this must NOT become (inherited verbatim from lib/dom.js:20-26 and
// lib/store.js:12-21, which remain binding here):
//   - not rendering, not components, not lifecycle, not a widget system
//   - not a registry, not a plugin system, not a key registry, not a schema migrator
//   - no `createStore(storage, {options})` style factory with an options bag
//   - no global state beyond this one namespace object
// It only carries primitives the callers already agree on.
//
// NAMESPACE. Exactly one global: `Micro`. Pages use `Micro.esc(x)`.
// Add a function here only when a second caller already duplicates its bytes.

(function (root) {
  'use strict';

  // ── lib/dom.js:29-60 ────────────────────────────────────────────────────────

  /** Escape text for safe insertion into HTML (5 keys: & < > " '). */
  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}

  /**
   * Flash a message on the toast element: set text, retrigger the 'on' class
   * (forced reflow between remove/add), clear any pending removal timer and
   * drop the class after ms. No-op when the element is missing. Default el is
   * resolved lazily at call time (`#toast`), never at module load.
   */
  function toast(msg,{el,ms=1400}={}){
    const e=el??document.querySelector('#toast');if(!e)return;
    e.textContent=msg;e.classList.remove('on');void e.offsetWidth;e.classList.add('on');
    clearTimeout(toast.t);
    // ms:0 (falsy) = STICKY, no timer. Required so hosts whose toast never
    // auto-hid can adopt this module without silently changing behaviour.
    if(ms) toast.t=setTimeout(()=>e.classList.remove('on'),ms);
  }

  /** First element matching a CSS selector. */
  const $=s=>document.querySelector(s);

  /** All elements matching a CSS selector, as an Array. */
  const $$=s=>[...document.querySelectorAll(s)];

  /** Seconds -> `m:ss` (e.g. 83.4 -> `1:23`). Non-finite -> `0:00`. */
  function fmtClock(t){if(!Number.isFinite(t))return'0:00';const m=Math.floor(t/60),s=Math.floor(t%60);return `${m}:${String(s).padStart(2,'0')}`}

  /** Seconds -> `m:ss.s` (e.g. 83.42 -> `1:23.4`). Non-finite -> `0:00.0`. */
  function fmtMark(t){if(!Number.isFinite(t))return'0:00.0';const m=Math.floor(Math.max(0,t)/60),sec=Math.max(0,t)-m*60;return `${m}:${sec.toFixed(1).padStart(4,'0')}`}

  /** Save a blob to a local file: objectURL -> anchor click -> revoke after 1000ms. */
  function download(name,blob,mime='application/octet-stream'){
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([blob],{type:mime}));
    a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }

  // ── lib/store.js:23-74 ──────────────────────────────────────────────────────
  // get() always JSON-decodes, so raw-string payloads (textRuntime, cachedSourceGlyph)
  // stay on direct storage access in callers — do not route them through here.

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
  function kv(key, fallback = null) {
    return makeStore(() => globalThis.localStorage, key, fallback);
  }

  /** JSON wrapper over sessionStorage. Missing/corrupt reads yield `fallback`. */
  function skv(key, fallback = null) {
    return makeStore(() => globalThis.sessionStorage, key, fallback);
  }

  // ── lib/polar-control.js:1-52 ───────────────────────────────────────────────

  const TAU=Math.PI*2;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const wrap=(v,n=1)=>((v%n)+n)%n;
  function circularDelta(a,b,n=1){
    let d=(a-b)%n;
    if(d>n/2)d-=n;
    if(d<-n/2)d+=n;
    return d;
  }
  function pointAngle01(x,y,cx,cy,phase=-Math.PI/2){
    const a=Math.atan2(y-cy,x-cx)-phase;
    return wrap(a/TAU,1);
  }
  function pointSlot(x,y,cx,cy,count,phase=-Math.PI/2){
    const raw=pointAngle01(x,y,cx,cy,phase)*count;
    return {raw,slot:wrap(Math.round(raw),count)};
  }
  class PolarDetent {
    constructor({count=12,snap=16,drag=0.045}={}){
      this.count=count;this.snapRate=snap;this.drag=drag;this.value=0;this.velocity=0;
      this.target=0;this.snapping=false;
    }
    set(v){this.value=v;this.velocity=0;this.snapping=false;return this.value}
    impulse(delta,dt=.016){
      this.value+=delta;this.velocity=clamp(delta/Math.max(.008,dt),-5,5);this.snapping=false;return this.value
    }
    detent(dir=0){
      const step=1/this.count;
      this.target=Math.round(this.value/step)*step+Math.sign(dir)*step;
      this.snapping=true;return this.target
    }
    step(dir=1){return this.detent(dir)}
    snap(){return this.detent(0)}
    goto(index){
      const base=wrap(index,this.count)/this.count;
      const k=Math.round(this.value-base);
      this.target=base+k;this.snapping=true;return this.target;
    }
    update(dt){
      if(this.snapping){
        const d=this.target-this.value;
        if(Math.abs(d)<.0003){this.value=this.target;this.velocity=0;this.snapping=false}
        else this.value+=d*Math.min(1,dt*this.snapRate);
      }else{
        this.value+=this.velocity*dt;
        this.velocity*=Math.pow(this.drag,dt);
      }
      return this.value;
    }
    tick(dt){return this.update(dt)}
    index(){return wrap(Math.round(this.value*this.count),this.count)}
  }

  // ── namespace ───────────────────────────────────────────────────────────────

  const api = Object.freeze({
    version: '0.1',
    // dom
    esc, toast, $, $$, fmtClock, fmtMark, download,
    // store
    kv, skv,
    // polar-control
    TAU, clamp, wrap, circularDelta, pointAngle01, pointSlot, PolarDetent,
  });

  root.Micro = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
