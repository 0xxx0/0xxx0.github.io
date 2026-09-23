import assert from "node:assert/strict";
import {
  InstrumentState,PROJECTIONS,EXPLICIT_PRIMITIVES,residueInventory,runInvariantSuite,stableString
} from "./core.js";

const report=runInvariantSuite();
assert.equal(report.pass,true,JSON.stringify(report.results,null,2));
assert.equal(report.total,11);
assert.equal(report.residueCount,9);
assert.deepEqual(EXPLICIT_PRIMITIVES,["CONTENT","AUTHORITY","DEPTH","TIME"]);

const I=new InstrumentState();
const sem=I.semanticFingerprint();
for(const p of PROJECTIONS) I.switchProjection(p);
I.switchProjection("LINE");
assert.equal(I.semanticFingerprint(),sem);

I.focus("free.note");
I.setDraft("free.note","hello");
I.toggleSelection("nested.collection");
I.setClock("timed.pulse",88.8);
I.checkpoint("x");
const before=I.fullFingerprint();
I.switchProjection("ROOM");
I.focus("action.safe");
I.setDraft("free.note","away");
I.setClock("timed.pulse",1.2);
I.setAuthorityMode("COMMIT");
I.doReturn();
assert.equal(I.fullFingerprint(),before);

const residue=residueInventory(I.fixture);
assert.equal(residue.filter(x=>x.projection==="GLYPH").length,3);
assert.equal(residue.filter(x=>x.projection==="LINE").length,2);
assert.equal(residue.filter(x=>x.projection==="RADIAL").length,2);
assert.equal(residue.filter(x=>x.projection==="FLOWER_KEY").length,1);
assert.equal(residue.filter(x=>x.projection==="ROOM").length,1);

console.log(JSON.stringify({
  pass:true,
  invariants:`${report.passed}/${report.total}`,
  residue:report.residueCount,
  primitives:EXPLICIT_PRIMITIVES,
  projections:PROJECTIONS
},null,2));
