// lib/polar-control.js — the ESM face of the polar-control math. PROJECTION of lib/micro.js.
//
// PHASE 2 of the microlib (2026-10-06) — ONE IMPLEMENTATION, NOT TWO. The bodies live in
// lib/micro.js (verbatim from this file, 2026-09-26); this module re-exports the SAME
// objects, including PolarDetent (same class identity, not a subclass or a copy).
// Do not copy bodies back in here.
//
// API (unchanged, add-only): TAU, clamp, wrap, circularDelta, pointAngle01, pointSlot,
// PolarDetent. Used by the radial/ring family (fold-bloom live/saber/lab/lens/voice,
// atlas) — the math the dial instruments share.

import './micro.js';

const micro = globalThis.Micro;
if (!micro) throw new Error('lib/polar-control.js: globalThis.Micro missing — lib/micro.js did not run');

export const TAU = micro.TAU;
export const clamp = micro.clamp;
export const wrap = micro.wrap;
export const circularDelta = micro.circularDelta;
export const pointAngle01 = micro.pointAngle01;
export const pointSlot = micro.pointSlot;
export const PolarDetent = micro.PolarDetent;