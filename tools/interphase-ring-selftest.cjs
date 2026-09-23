const assert=require('node:assert/strict');
const R=require('../lib/interphase-ring.js');

assert.equal(R.VERSION,'interphase-ring/v0.1');

// TWO DIAL parity: six-position relation algebra.
function legacyVerb(l,r){
  const d=((r-l)%6+6)%6;
  if(d===0)return'BLOOM';
  if(d===1||d===5)return'FOLD';
  if(d===2||d===4)return'RETURN';
  return'SPLIT';
}
for(let l=0;l<6;l++)for(let r=0;r<6;r++){
  assert.equal(R.relationVerb(l,r,6),legacyVerb(l,r),l+'→'+r);
}
assert.equal(R.relation(0,0,6).kind,'SAME');
assert.equal(R.relation(0,1,6).kind,'NEAR');
assert.equal(R.relation(0,2,6).kind,'FAR');
assert.equal(R.relation(0,3,6).kind,'OPPOSITE');

// TWO DIAL point→continuous slot parity: top is slot zero.
assert.equal(R.pointIndex(0,-10,0,0,6),0);
assert.equal(R.pointIndex(10,0,0,0,6),2);
assert.equal(R.pointIndex(0,10,0,0,6),3);

// ECOLOGY parity: fixed gate must pick the same nearest rotated cell.
function legacyGateIndex(count,rotation,gateAngle=-Math.PI/2){
  let best=0,bd=Infinity;
  for(let i=0;i<count;i++){
    const a=-Math.PI/2+rotation+i*Math.PI*2/count;
    const d=Math.abs(Math.atan2(Math.sin(a-gateAngle),Math.cos(a-gateAngle)));
    if(d<bd){bd=d;best=i}
  }
  return best;
}
for(const rot of [-8,-3.1,-1.4,-.2,0,.17,1.9,6.8]){
  assert.equal(R.gateIndex({count:12,rotation:rot}),legacyGateIndex(12,rot));
  assert.equal(R.gateIndex({count:12,rotation:rot,gateAngle:Math.PI/2}),legacyGateIndex(12,rot,Math.PI/2));
}

// Ecology garden target parity: align a chosen slot to either gate with nearest rotation.
for(let i=0;i<12;i++){
  for(const gate of [-Math.PI/2,Math.PI/2]){
    const current=1.73;
    const target=R.rotationForSlot(i,{count:12,gateAngle:gate,current});
    const angle=R.slotAngle(i,12,{rotation:target});
    assert.ok(Math.abs(Math.atan2(Math.sin(angle-gate),Math.cos(angle-gate)))<1e-9);
    assert.ok(Math.abs(target-current)<=Math.PI+1e-9);
  }
}

// Generic carrier gives one fixed addressed gate and lawful opposite address.
const m=R.model({count:12,rotation:.4,items:Array.from({length:12},(_,i)=>'cell:'+i)});
assert.equal(m.slots.length,12);
assert.equal(m.slots.filter(x=>x.gate).length,1);
assert.equal(m.slots[2].opposite,8);
assert.equal(m.slots[2].item,'cell:2');
assert.equal(R.stepRotation(0,1,12),Math.PI*2/12);

console.log('INTERPHASE RING SELFTEST PASS');