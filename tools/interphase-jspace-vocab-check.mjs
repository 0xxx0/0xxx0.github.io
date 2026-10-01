// Bounded check: do the ring algebra and the J-space steering calculus share a
// REAL control vocabulary, or only similar words? Run: node <this file>
import ringPkg from '../lib/interphase-ring.js';
const { relationVerb, relation, slots, model } = ringPkg;
// steering-calculus is a real ESM module -> named import works
import { DEFAULT_CONTROL_VOCABULARY } from '../fold-bloom/convergence/jspace-steering/steering-calculus.mjs';

console.log('interphase-ring relationVerb maps :', { SAME: 'BLOOM', NEAR: 'FOLD', FAR: 'RETURN', OPPOSITE: 'SPLIT' });
console.log('jspace-steering control vocabulary:', Object.keys(DEFAULT_CONTROL_VOCABULARY));
console.log();

// Enumerate every relation kind the ring can emit, at a ring size that admits all four.
const n = 6;
const emitted = new Set();
for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) emitted.add(relationVerb(a, b, n));
console.log(`relationVerb emits over ${n}-ring:`, [...emitted].sort());

const steer = new Set(Object.values(DEFAULT_CONTROL_VOCABULARY));
const missing = [...emitted].filter(v => !steer.has(v));
const extra = [...steer].filter(v => !emitted.has(v));
console.log('emitted verbs NOT in steering vocabulary:', missing.length ? missing : 'none');
console.log('steering verbs NOT emittable by ring    :', extra.length ? extra : 'none');
console.log();

// The operator's actual question: can a LAW ZOO breed-pair be named with this vocabulary?
// Place specimens on the ring by their dominant LENS. The field guide already has 5 lenses.
const LENSES = ['SLEEPER', 'GLYPH', 'INSTRUMENT', 'SPACE', 'ALIEN'];
const ring = slots(LENSES.length);
console.log(`LAW ZOO has ${LENSES.length} lenses -> ring of ${LENSES.length}:`,
  ring.map(s => `${s.index}:${LENSES[s.index]}${s.gate ? '(gate)' : ''}`).join(' '));
console.log();

// Two real specimens from law_zoo_field_guide.html, with their actual scores.
const spec = {
  dejong:      { SLEEPER: 6, GLYPH: 9, INSTRUMENT: 10, SPACE: 5, ALIEN: 10 }, // DE JONG DUST
  cyclic_ca:   { SLEEPER: 10, GLYPH: 8, INSTRUMENT: 8, SPACE: 6, ALIEN: 10 }, // CYCLIC PREDATOR
  xor_textile: { SLEEPER: 7, GLYPH: 10, INSTRUMENT: 8, SPACE: 6, ALIEN: 8 },  // XOR TEXTILE
  error_garden:{ SLEEPER: 7, GLYPH: 9, INSTRUMENT: 8, SPACE: 2, ALIEN: 10 },  // ERROR GARDEN
};
const dominant = s => LENSES.indexOf(LENSES.reduce((best, L) => s[L] > s[best] ? L : best, LENSES[0]));

console.log('specimen        dominant lens -> ring slot');
for (const [k, v] of Object.entries(spec)) console.log(`  ${k.padEnd(14)} ${LENSES[dominant(v)].padEnd(11)} ->  ${dominant(v)}`);

console.log();
console.log('breed-pair relation named by the SHARED vocabulary:');
const keys = Object.keys(spec);
for (let i = 0; i < keys.length; i++) {
  for (let j = i + 1; j < keys.length; j++) {
    const a = dominant(spec[keys[i]]), b = dominant(spec[keys[j]]);
    const r = relation(a, b, LENSES.length);
    const v = relationVerb(a, b, LENSES.length);
    console.log(`  ${keys[i].padEnd(14)} x ${keys[j].padEnd(14)} ${LENSES[a]}→${LENSES[b]}  ${r.kind.padEnd(8)} => ${v}`);
  }
}