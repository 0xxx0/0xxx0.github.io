// FOLD//BLOOM session-scale policy.
//
// ONE challenge policy that supplies goal counts to the existing mode rules
// (docs/FOLD_BLOOM_INTERPHASE_UX_HANDOFF_2026-09-26.md § "Make the game session
// scale legible"). The UI never owns per-game completion logic; mode rules keep
// their operation semantics and read their completion thresholds from here.
//
//   QUICK   — the current fixed-goal challenge counts. Live default; preserves
//             the shipped experience unless the user chooses otherwise.
//   SESSION — a medium challenge. Counts are PROVISIONAL: the handoff says to
//             validate a medium session with real users before choosing a
//             default duration, so SESSION exists as an opt-in, never a default.
//   OPEN    — the same ride object and the same mode rules without a completion
//             counter; the run stays live until the player returns to RIDE.
//             ZEN and RIDE are always open-ended and ignore the policy.
//
// The policy only moves completion thresholds. Operation semantics (relation
// grammar, exact-verb FORM substrate, garden pressures) live in play-core and
// are invariant under the scale — see tests/session-scale.test.mjs.

import {
  RUN_LENGTH,RUN_WIN_HITS,PUZZLE_ROUNDS,PUZZLE_WIN_STARS,DUET_ROUNDS,DUET_WIN_HITS,
  GARDEN_GENERATIONS,GARDEN_MOVES,GARDEN_SURVIVAL_TARGET,HEX_CHANGE_LIMIT
} from './play-core.js?v=0.5';

export const SESSION_SCALE_VERSION='FOLD_BLOOM_SESSION_SCALE_0.1';
export const SESSION_SCALE_DEFAULT='QUICK';
export const SESSION_SCALES=Object.freeze(['QUICK','SESSION','OPEN']);

// QUICK is derived from the play-core constants so the live default can never
// drift from the mode rules. HEX_CHANGE_TARGET (two changed lines = clear) and
// FORM_SLOTS (six lines) are operation semantics and are held constant across
// scales; only the CHANGE move limit is a completion-policy count.
const COUNTS=Object.freeze({
  QUICK:Object.freeze({
    PLAY:Object.freeze({length:RUN_LENGTH,win:RUN_WIN_HITS}),
    PUZZLE:Object.freeze({changeLimit:HEX_CHANGE_LIMIT}),
    PATH:Object.freeze({rounds:PUZZLE_ROUNDS,winStars:PUZZLE_WIN_STARS}),
    DUET:Object.freeze({rounds:DUET_ROUNDS,win:DUET_WIN_HITS}),
    GARDEN:Object.freeze({generations:GARDEN_GENERATIONS,moves:GARDEN_MOVES,survival:GARDEN_SURVIVAL_TARGET}),
  }),
  SESSION:Object.freeze({
    // Medium challenge; provisional until validated with real users (handoff
    // § "Validate a medium session with real users before choosing a default
    // duration"). Larger completion thresholds only; every operation stays
    // identical to QUICK.
    PLAY:Object.freeze({length:12,win:8}),
    PUZZLE:Object.freeze({changeLimit:6}),
    PATH:Object.freeze({rounds:7,winStars:14}),
    DUET:Object.freeze({rounds:10,win:8}),
    GARDEN:Object.freeze({generations:5,moves:5,survival:3}),
  }),
});

function nullCounts(mode){
  // OPEN keeps the same counts shape with null thresholds: bounded() renders
  // target null and the run never auto-completes.
  const quick=COUNTS.QUICK[mode];
  if(!quick)return Object.freeze({});
  return Object.freeze(Object.fromEntries(Object.keys(quick).map(k=>[k,null])));
}

export function normalizeSessionScale(value){
  const v=String(value==null?'':value).toUpperCase();
  return SESSION_SCALES.includes(v)?v:SESSION_SCALE_DEFAULT;
}
export function sessionScaleOpen(scale){
  return normalizeSessionScale(scale)==='OPEN';
}
export function sessionScaleLabel(scale){
  return normalizeSessionScale(scale);
}
export function sessionScaleNote(scale){
  const s=normalizeSessionScale(scale);
  if(s==='SESSION')return 'SESSION · medium challenge · counts provisional until validated with real users';
  if(s==='OPEN')return 'OPEN · same game, no win counter · leave any time via RETURN TO RIDE';
  return 'QUICK · short fixed goal (default) · ZEN / RIDE remain open-ended';
}

// Goal counts one mode should play under. ZEN (and RIDE, which is outside this
// module) never consult the policy and get an empty frozen object.
export function goalCounts(mode,scale){
  const m=String(mode||'PLAY').toUpperCase();
  const s=normalizeSessionScale(scale);
  if(!COUNTS.QUICK[m])return Object.freeze({});
  if(s==='OPEN')return nullCounts(m);
  return (COUNTS[s]&&COUNTS[s][m])||COUNTS.QUICK[m];
}

// The chosen-policy record carried by mode state and the run receipt.
export function policyRecord(scale,mode){
  const s=normalizeSessionScale(scale);
  return {
    schema:'0xxx0/fold-bloom-session-scale/v0.1',
    version:SESSION_SCALE_VERSION,
    name:s,
    counts:goalCounts(mode,s),
  };
}