const R=require('../lib/sleeper-route-witness.js');
const assert=(x,m)=>{if(!x)throw new Error(m)};

const p1=[[1,1],[2,1],[3,1],[3,2],[3,3],[2,3],[1,3]];
const a=R.make({
  seed:'alpha',source:['ONE','TWO'],adapter:'mixed',epoch:2,size:{w:8,h:8},
  positions:p1,runSteps:8,returnsBefore:2,
  gates:[{id:1,x:3,y:1,status:'done'},{id:2,x:1,y:3,status:'done'}],
  events:[{type:'MOVE'},{type:'GATE_PASS'}]
});
const va=R.validate(a);
assert(va.ok,'route A must validate: '+va.errors.join(' | '));
assert(a.route.rle==='R2,D2,L2','expected deterministic RLE');
assert(JSON.stringify(va.positions)===JSON.stringify(p1),'RLE must losslessly reconstruct route');
assert(a.route.movementSteps===6&&a.route.runSteps===8&&a.route.nonMovementSteps===2,'step classes');

const p2=[[1,1],[1,2],[2,2],[3,2],[3,3],[2,3],[1,3]];
const b=R.make({
  seed:'alpha',source:['ONE','TWO'],adapter:'mixed',epoch:2,size:{w:8,h:8},
  positions:p2,runSteps:7,returnsBefore:3,
  gates:[{id:1,x:3,y:2,status:'done'},{id:2,x:1,y:3,status:'done'}]
});
const cmp=R.compare(a,b);
assert(cmp.ok&&cmp.status==='SAME_WORLD','same world compare');
assert(cmp.divergenceStep===1,'divergence step');
assert(cmp.sameEnd===true,'same endpoint');
assert(cmp.pathOverlap>0&&cmp.pathOverlap<1,'partial overlap');

const other=R.make({seed:'beta',source:['ONE','TWO'],adapter:'mixed',epoch:2,size:{w:8,h:8},positions:p2});
assert(R.compare(a,other).status==='DIFFERENT_WORLD','cross-world comparison must reject');

let bad=false;try{R.make({seed:'x',source:['x'],positions:[[1,1],[2,2]]})}catch(_){bad=true}
assert(bad,'diagonal path must reject');

const tamper=JSON.parse(JSON.stringify(a));tamper.route.rle='R1,D1';
assert(!R.validate(tamper).ok,'tampered RLE/end/hash must reject');

const bounds=JSON.parse(JSON.stringify(a));bounds.route.rle='L9';bounds.route.end=[-8,1];bounds.route.movementSteps=9;bounds.route.pathHash='route:'+R.hashString(bounds.world.id+'|1,1|L9');
assert(!R.validate(bounds).ok,'out-of-bounds route must reject');

console.log('SLEEPER ROUTE WITNESS PASS ·',a.world.id,a.route.pathHash,'· overlap',cmp.pathOverlap);
