import {
  makeFixture,evaluateFixture,routeChoiceAccuracy,plainAdjacencyBaseline,continuitySignal
} from "./core.mjs";

function assert(ok,msg){ if(!ok) throw new Error(msg); }

const f=makeFixture();
const aligned=routeChoiceAccuracy(f,0,0);
const opposite=routeChoiceAccuracy(f,Math.PI,0);
const base=plainAdjacencyBaseline(f);
const ca=continuitySignal(f,0,0);
const cb=continuitySignal(f,Math.PI,0);
const ev=evaluateFixture(f,{orientation:0,steps:144});

assert(aligned.cases===f.route.length-1,"all route steps should be testable");
assert(aligned.accuracy >= 0.85,`aligned route cue too weak: ${aligned.accuracy}`);
assert(aligned.accuracy - base.localChoiceChance >= 0.20,
  `aligned cue does not beat adjacency chance enough: ${aligned.accuracy} vs ${base.localChoiceChance}`);
assert(aligned.accuracy - opposite.accuracy >= 0.30,
  `phase mismatch does not change route choice enough: ${aligned.accuracy} vs ${opposite.accuracy}`);
assert(ca-cb >= 0.18,`continuity separation too small: ${ca} vs ${cb}`);
assert(ev.best.choice.accuracy >= aligned.accuracy-1e-9,"phase sweep should recover aligned-quality cue");
assert(ev.best.choice.accuracy > ev.baseline.localChoiceChance,"best moire cue should beat plain local adjacency baseline");

console.log(JSON.stringify({
  PASS:true,
  aligned,
  opposite,
  continuity:{aligned:ca,opposite:cb},
  baseline:base,
  best:{
    phase:ev.best.phase,
    accuracy:ev.best.choice.accuracy,
    meanMargin:ev.best.choice.meanMargin,
    continuity:ev.best.continuity
  },
  scope:ev.scope
},null,2));
