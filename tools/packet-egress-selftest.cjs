const assert=require('node:assert/strict');
const R=require('../lib/packet-egress.js');

function packet(over={}){
  return {
    OBJECT:'obj',
    AUTHORITY:'NONE',
    STATE_IN:'before',
    DELTA:null,
    EVIDENCE:null,
    STATE_OUT:'CANDIDATE',
    RESIDUE:null,
    WAITING:null,
    NEXT:null,
    STOP:null,
    ...over
  };
}

assert.equal(R.controlEligible(packet()),true);
assert.equal(R.controlEligible({OBJECT:'x'}),false);

assert.equal(R.classify(R.standard(packet({AUTHORITY:'CURRENT'}))).primary,'ARCHIVE','packet cannot self-promote to NOW');
assert.equal(R.classify(R.standard(packet()),{current:true}).primary,'NOW','NOW requires external CURRENT context');

assert.equal(R.classify(R.standard(packet({WAITING:'real phone',NEXT:'test it'}))).primary,'GATE');
assert.equal(R.classify(R.standard(packet({DELTA:['changed'],EVIDENCE:{test:'PASS'},STATE_OUT:'MERGED_GREEN',RESIDUE:'ergonomics unknown'}))).primary,'DELTA');
assert.equal(R.classify(R.standard(packet({RESIDUE:['missing exact source']}))).primary,'RESIDUE');
assert.equal(R.classify(R.standard(packet({NEXT:['one','two','three','four']}))).primary,'NEXT');
assert.equal(R.classify(R.standard(packet({STOP:'closed'}))).primary,'ARCHIVE');

const adapted=R.fromReturn({
  id:'ret-1',
  object:'thing',
  state:'MERGED_PROVED',
  delta:['x'],
  verification:{ci:'PASS'},
  residue:['optional lived feel'],
  next:'do not expand'
},{source:'returns/x.json',route:'/x/'});
const a=R.reduceOne(adapted);
assert.equal(a.category,'DELTA');
assert.equal(a.control_eligible,false,'adapted RETURN is projection only');
assert.deepEqual(a.facets,['DELTA','RESIDUE','NEXT']);
assert.deepEqual(a.next,['do not expand']);

const gated=R.fromReturn({
  id:'ret-2',
  object:'device proof',
  state:'WAITING_REAL_DEVICE',
  next:'use two phones'
},{source:'returns/y.json'});
assert.equal(R.reduceOne(gated).category,'GATE');

const out=R.reduce([
  R.standard(packet({DELTA:'x',EVIDENCE:'PASS',STATE_OUT:'MERGED'})),
  R.standard(packet({RESIDUE:'x'})),
  R.standard(packet({NEXT:'x'})),
  R.standard(packet())
]);
assert.deepEqual(out.counts,{NOW:0,DELTA:1,RESIDUE:1,GATE:0,NEXT:1,ARCHIVE:1});

console.log('FIELD PACKET EGRESS SELFTEST PASS');
