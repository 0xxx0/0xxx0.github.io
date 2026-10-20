import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as C from '../field-instrument-core.mjs';
import {hashText,stableKey} from '../lib/id.js';

const raw=JSON.parse(readFileSync('showcase-manifest.json','utf8')).routes;
const bytes=stableKey(raw),rows=C.records(raw),s=C.initial(),v=C.project(rows,s,{});
assert.equal(v.total,raw.length);
assert.equal(v.folds.reduce((n,g)=>n+g.count,0),v.inside);
assert.equal(v.inside+v.outside,v.total);
assert.ok(v.folds.every(g=>g.changed===null),'first-visit marks must not fabricate measured deltas');
assert.ok(v.folds.length<=9);
assert.equal(stableKey(raw),bytes,'projection mutates no source');

// Same address, changed content: identity survives, witness changes.
const a=rows.find(r=>r.address==='/house/');
assert.ok(a);
const b=C.records([{...a.payload,role:'changed source'}])[0];
assert.equal(a.id,b.id);
assert.notEqual(await hashText(stableKey(a.payload)),await hashText(stableKey(b.payload)));
assert.throws(()=>C.records([raw[0],raw[0]]),/DUPLICATE_FIELD_ID/);

// Native timestamp admission, including old/backdated records and unknown residue.
const fixture=[{id:'a',address:'/a',time:100},{id:'b',address:'/b',time:200},{id:'c',address:'/c',time:null}];
assert.equal(C.delta(fixture,{}).hasBaseline,false);
const d=C.delta(fixture,{stamp:110,items:{'/b':190}});
assert.deepEqual(d.changed.map(r=>r.id),['b']);
assert.deepEqual(d.unknown.map(r=>r.id),['c']);
assert.equal(d.unchanged,1);
assert.equal(d.changed.length+d.unknown.length+d.unchanged,fixture.length);
const partial=C.delta(fixture,{items:{'/a':100,'/gone':300}});
assert.equal(partial.hasBaseline,true);
assert.equal(partial.changed.length,0,'acknowledging one object cannot turn unbased neighbours into new arrivals');
assert.deepEqual(partial.unbased.map(r=>r.id),['b']);
assert.equal(partial.changed.length+partial.unknown.length+partial.unbased.length+partial.unchanged,fixture.length);
assert.equal(C.delta(fixture,{items:{'/gone':300}}).hasBaseline,false,'an obsolete item acknowledgement cannot create a field baseline');
assert.equal(C.project(rows,{...s,mode:'DELTA'},{}).inside,0,'no invented first-visit delta');
const mixed=fixture.map(r=>({...r,family:'F',source:'git',kind:'artifact',state:r.id==='b'?'STALLED':'ACTIVE'}));
const attention=C.project(mixed,{...s,mode:'DELTA'},{stamp:110,needs:['/b','/c']});
assert.equal(attention.inside,2,'overlapping changed / stalled / gate counted once');
assert.equal(C.project(mixed,{...s,mode:'DELTA'},{needs:['/c']}).inside,2,'world gate and explicit stalled survive without baseline');

// Repeated range folds must terminate and reach EVERY original id exactly once.
// All 40k records deliberately have identical visible semantics: worst-case collision.
const large=Array.from({length:40000},(_,i)=>({id:'id:'+String(i).padStart(5,'0'),address:'/item/'+i,
  title:'same visible name',family:'ONE',source:'git',kind:'artifact',state:'ACTIVE',time:100,depth:1}));
const largeBefore=stableKey(large),found=[];let calls=0,maxDepth=0;
function walk(xs,depth=0){
  maxDepth=Math.max(maxDepth,depth);assert.ok(depth<10,'unbounded collision refinement');
  const groups=C.partition(xs,'id');calls++;assert.ok(groups.length<=9);
  assert.equal(groups.reduce((n,g)=>n+g.count,0),xs.length);
  const ids=groups.flatMap(g=>g.ids);assert.equal(new Set(ids).size,xs.length);
  const map=new Map(xs.map(r=>[r.id,r]));
  for(const g of groups){if(g.object)found.push(g.object.id);else{assert.ok(g.count<xs.length);walk(g.ids.map(id=>map.get(id)),depth+1)}}
}
const started=performance.now();walk(large);const traversalMs=Math.round(performance.now()-started);
assert.equal(found.length,40000);assert.equal(new Set(found).size,40000);
assert.equal(stableKey(large),largeBefore);
const atObject={...s,scale:4};
const timed=performance.now(),lp=C.project(large,atObject,{stamp:90});const projectionMs=Math.round(performance.now()-timed);
assert.equal(lp.inside,40000);assert.equal(lp.folds.reduce((n,g)=>n+g.count,0),40000);

// Fold/parent is the exact inverse even while refining at one semantic scale.
let p=atObject;
for(let i=0;i<5;i++){
  const before=C.frame(p),g=C.project(large,p,{stamp:90}).folds[0];if(g.object)break;
  p=C.unfold(p,g);assert.deepEqual(C.parent(p),before);
}
// Locate and all five scales preserve the addressed object; RETURN round trips bytes.
const located=C.locate(s,a),token=C.frame({...located,turn:3,query:'source:git',page:2,mode:'RELATIONS'});
assert.equal(C.project(rows,located,{}).folds.some(g=>g.ids.includes(a.id)),true);
assert.equal(C.project(rows,located,{}).inside,1,'exact address must expose the exact object, not a range of lookalikes');
assert.deepEqual(C.restore(JSON.parse(JSON.stringify(token))),token);
assert.equal(C.restore(token).focus,a.id);
assert.throws(()=>C.restore({...token,scale:99}),/INVALID/);
assert.throws(()=>C.restore({...token,path:[{dim:'authority',values:['ADMIN'],fromScale:0}]}),/INVALID/);
assert.throws(()=>C.restore({...token,path:[{dim:'id',values:[42],fromScale:4}]}),/INVALID/);
assert.equal(C.matching(rows,'source:git kind:workbench').every(r=>r.kind==='workbench'),true);
const twins=[{id:'1',address:'/alpha/pulse/'},{id:'2',address:'/beta/pulse/'},{id:'3',address:'/gamma/pulse/'}];
const tags=C.addressTags(twins);assert.equal(new Set(tags.values()).size,3);assert.equal(tags.get('1'),'alpha/pulse');
assert.equal(C.reading({...a,time:Date.UTC(2026,0,1)},[],[]).arc,0);
assert.equal(C.records([{href:'/child/',parent:'/',title:'child'}])[0].depth,1,'declared parent step survives host-root exclusion');
for(const g of v.folds){assert.equal(g.profile.kinds.reduce((n,x)=>n+x[1],0),g.count);assert.equal(g.profile.states.reduce((n,x)=>n+x[1],0),g.count)}
const choices=Array.from({length:20},(_,i)=>({...large[i],kind:i<10?'artifact':'workbench'}));
const family=C.partition(choices,'family')[0],next=C.into(choices,s,family,{});
assert.equal(next.scale,2,'single-value SOURCE facet must add no tap');assert.equal(next.path.length,1);
assert.deepEqual(C.parent(next),s,'skipped tautologies cannot break scope-out');
const queried={...s,query:'item/1'},qv=C.project(choices,queried,{}),qg=qv.folds[0];
assert.equal(C.project(choices,C.into(choices,queried,qg,{}),{}).inside,qg.count,'drilling preserves the active query and exact fold membership');
for(const st of [s,next,located,{...s,query:'house'},{...s,mode:'DELTA'}]){
 const pv=C.project(rows,st,{stamp:100}),b=C.bearing(rows,st,pv,s);
 assert.equal(b.ribbon.reduce((n,p)=>n+p.count,0),b.total);assert.equal(b.ribbon.at(-1).end,b.total);assert.ok(b.label.includes(String(b.total)));
}
assert.equal(C.bearing(rows,s,v,s).away,false);assert.equal(C.bearing(rows,located,C.project(rows,located,{}),s).away,true);
assert.equal(C.bearing(rows,s,v,s).ribbon.find(p=>p.key==='changed').count,0,'unmeasured delta cannot become a changed band');
// No lossy truncation: Unicode code points paginate and reconstruct exactly.
const text='一目了然 🌘 '.repeat(80),pages=C.textPage(text,0,105).count;
assert.equal(Array.from({length:pages},(_,i)=>C.textPage(text,i,105).text).join(''),text);
console.log(`FIELD INSTRUMENT PASS · ${rows.length} real routes · 40,000 colliding records reachable once · ${calls} folds / depth ${maxDepth} · projection ${projectionMs}ms / traversal ${traversalMs}ms · exact RETURN · no source mutation`);
