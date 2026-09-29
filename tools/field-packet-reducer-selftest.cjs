'use strict';
const assert=require('node:assert/strict');
const R=require('../lib/field-packet-reducer.js');

assert.deepEqual(R.PRECEDENCE,['GATE','NOW','RESIDUE','NEXT','DELTA','ARCHIVE']);
assert.deepEqual(R.DISPLAY_ORDER,['NOW','DELTA','RESIDUE','GATE','NEXT','ARCHIVE']);

let x=R.reducePacket({id:'g',delta:'done',verification:'pass',waiting_on:'real phone'});
assert.equal(x.disposition,'GATE');
assert.equal(x.reason,'WAITING');

x=R.reducePacket({id:'n',state:'ACTIVE_NOW',delta:'working'});
assert.equal(x.disposition,'NOW');

x=R.reducePacket({id:'r',delta:'done',verification:'pass',residue:'one unresolved seam',next:'ship next'});
assert.equal(x.disposition,'RESIDUE');

x=R.reducePacket({id:'u',delta:'claimed but not proved'});
assert.equal(x.disposition,'RESIDUE');
assert.equal(x.reason,'DELTA_WITHOUT_EVIDENCE');

x=R.reducePacket({id:'nx',delta:'done',verification:'pass',next:'adapt one existing host'});
assert.equal(x.disposition,'NEXT');

x=R.reducePacket({id:'d',delta:['a'],verification:{test:'PASS'},next:'RETURN to CURRENT and replan'});
assert.equal(x.disposition,'DELTA');

x=R.reducePacket({id:'a',state:'MERGED_MACHINE_GREEN',next:'RETURN to CURRENT and replan'});
assert.equal(x.disposition,'ARCHIVE');

x=R.reducePacket({
 schema:'field-return/v1',
 object:'FIELD Index',
 state:'MERGED_MACHINE_GREEN',
 delta:['visor shipped'],
 verification:{browser:'PASS'},
 residue:'retire donor-only branch',
 next:'RETURN to CURRENT and replan'
});
assert.equal(x.disposition,'RESIDUE');
assert.equal(x.normalized.OBJECT,'FIELD Index');
assert.ok(R.meaningful(x.normalized.EVIDENCE));

x=R.reducePacket({
 schema:'0xxx0/return/v0.1',
 route:'/',
 host_delta:'Move semantics to host boundary.',
 verify:['selftest PASS'],
 residue:['legacy compatibility remains'],
 reentry:'Review and merge when green.'
});
assert.equal(x.disposition,'RESIDUE');
assert.equal(x.normalized.OBJECT,'/');

const agg=R.aggregatePackets([
 {id:'n1',state:'ACTIVE_NOW'},{id:'n2',state:'ACTIVE_NOW'},{id:'n3',state:'ACTIVE_NOW'},
 {id:'x1',next:'do one'},{id:'x2',next:'do two'},{id:'x3',next:'do three'},{id:'x4',next:'do four'}
]);
assert.equal(agg.visible.NOW.length,2);
assert.equal(agg.overflow.NOW.length,1);
assert.equal(agg.visible.NEXT.length,3);
assert.equal(agg.overflow.NEXT.length,1);

console.log('field-packet-reducer-selftest: PASS');
