import fs from 'node:fs';
import assert from 'node:assert/strict';
import {compileCrewTurn,crewTurnLine,crewTurnMarkdown} from '../lib/field-crew-turn.mjs';

const contract=JSON.parse(fs.readFileSync(new URL('../control/SUBMISSION_CONTRACT.json',import.meta.url),'utf8'));
const min=contract.minimum_execution_projection;
assert.equal(min.schema,'field-crew-turn/v0.1');
assert.equal(min.leaf_count,10);

const fixture={
  schema:'field-crew-turn/v0.1',
  source:{object:'/docs/',owner:'READFIELD'},
  hold:{delta:'Reduce one existing reader action by one interaction without changing source/cursor authority'},
  turn:{move:'Patch the existing /docs/ action surface',release:'HOST_NATIVE Git commit'},
  trace:{status:'CHANGED',result:'Existing action is reachable with one fewer interaction; source/cursor authority unchanged',evidence:['commit:abc123','selftest:field-crew-turn']},
  return:{gate:null,to:'/?focus=%2Fdocs%2F'}
};
const out=compileCrewTurn(fixture);
assert.equal(out.source.object,'/docs/');
assert.equal(out.source.owner,'READFIELD');
assert.equal(out.return.next_authority,'NONE');
assert.equal(out.trace.evidence.length,2);
assert.ok(!JSON.stringify(out).includes('actor'));
assert.ok(!JSON.stringify(out).includes('next"'));
assert.match(crewTurnLine(out),/^@\/docs\/ \[owner:READFIELD\] Δ /);
assert.match(crewTurnMarkdown(out),/SOURCE  \/docs\/ · owner READFIELD/);
assert.match(crewTurnMarkdown(out),/RETURN  \/\?focus=%2Fdocs%2F · gate CLEAR · next_authority NONE/);

const unknown=compileCrewTurn({...fixture,trace:{status:'UNKNOWN',result:'Browser evidence unavailable',evidence:[]},return:{gate:'browser proof unavailable',to:'/?focus=%2Fdocs%2F'}});
assert.equal(unknown.trace.status,'UNKNOWN');
assert.equal(unknown.return.gate,'browser proof unavailable');

assert.throws(()=>compileCrewTurn({...fixture,schema:'wrong'}),/SCHEMA/);
assert.throws(()=>compileCrewTurn({...fixture,source:{object:'',owner:'READFIELD'}}),/SOURCE_OBJECT_REQUIRED/);
assert.throws(()=>compileCrewTurn({...fixture,trace:{status:'CHANGED',result:'claimed change',evidence:[]}}),/EVIDENCE_REQUIRED_FOR_CHANGED/);
assert.throws(()=>compileCrewTurn({...fixture,trace:{status:'NOPE',result:'x',evidence:[]}}),/TRACE_STATUS_NOPE/);
assert.throws(()=>compileCrewTurn({...fixture,trace:{status:'UNKNOWN',result:'x',evidence:'not-array'}}),/EVIDENCE_ARRAY_REQUIRED/);

const shape=Object.keys(min.shape).join('>');
assert.equal(shape,'source>hold>turn>trace>return');
assert.deepEqual(Object.keys(min.shape.source),['object','owner']);
assert.deepEqual(Object.keys(min.shape.hold),['delta']);
assert.deepEqual(Object.keys(min.shape.turn),['move','release']);
assert.deepEqual(Object.keys(min.shape.trace),['status','result','evidence']);
assert.deepEqual(Object.keys(min.shape.return),['gate','to']);
console.log('FIELD CREW TURN PASS · 10 leaves · same object · one move · evidence-bound result · RETURN next_authority NONE');
