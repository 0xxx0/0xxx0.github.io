const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync('foundry/room/room-core.js','utf8');
const ctx={globalThis:{},console,Date,Math};ctx.globalThis.globalThis=ctx.globalThis;
vm.runInNewContext(src,ctx,{filename:'room-core.js'});
const C=ctx.globalThis.RoomCore;
assert(C,'RoomCore missing');
assert.strictEqual(C.SCHEMA,'0xxx0/interphase/v0.1');

for(const id of C.FACE_ORDER){
  const o=C.orientation(id);
  assert.strictEqual(C.faceFromOrientation(o.rx,o.ry),id,'orientation round-trip '+id);
  const s=C.snapOrientation(o.rx+3,o.ry-3);
  assert.strictEqual(s.face,id,'snap round-trip '+id);
}

const route={
  href:'/thing/',title:'THING',kind:'artifact',state:'ACTIVE',operation:'MAKE',role:'Transform one thing',
  parent:'/',version:'1',
  receipt:'/returns/thing.json',
  contract:{
    accepts:{kinds:['input'],requires:['id']},
    transforms:{verb:'transform one thing'},
    emits:{kinds:['output']},
    evidence:{receipt:'/returns/thing.json',checks:['identity preserved','return exists']}
  },
  field:{
    inputs:[{medium:'DATA',kind:'input',interface:'address'}],
    outputs:[{medium:'DATA',kind:'output',interface:'return'}],
    exit_paths:[{class:'NEXT',status:'AVAILABLE',via:'/next/'}]
  },
  evolution:{host:'/foundry/',question:'Does the room help?',evidence_gate:'compare to plain',next_if_pass:'retain'}
};
for(const id of C.FACE_ORDER){
  const r=C.reading(route,id);
  assert.strictEqual(r.face.id,id);
  assert(r.atoms.length>0,'empty reading '+id);
}
assert(C.candidateDoors(route,'R').includes('/next/'),'output door missing');
const ev=C.event('focus-face','/thing/',{face:'U'});
const snap=C.snapshot(route,'U',[ev]);
assert.strictEqual(snap.object.id,'/thing/');
assert.strictEqual(snap.object.state.face,'U');
assert.strictEqual(snap.projections.length,6);
assert.strictEqual(snap.events.length,1);
const ret=C.makeReturn(route,'D',[ev],{route:'/thing/',face:'F'});
assert.strictEqual(ret.object_id,'/thing/');
assert.strictEqual(ret.after.face,'D');
assert(ret.evidence.some(x=>x.source==='/kernel/INTERPHASE.schema.json'));
assert(ret.next_routes.includes('/thing/'));
console.log('INTERPHASE ROOM SELFTEST PASS · 6 faces · orientation + readings + doors + RETURN');
