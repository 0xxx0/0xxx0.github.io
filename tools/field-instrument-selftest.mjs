import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as C from '../field-instrument-core.mjs';
import {hashText,stableKey} from '../lib/id.js';
import {kv} from '../lib/store.js';

const raw=JSON.parse(readFileSync('showcase-manifest.json','utf8')).routes;
const bytes=stableKey(raw),rows=C.records(raw),s=C.initial(),v=C.project(rows,s,{});
assert.equal(v.total,raw.length);
assert.equal(v.folds.reduce((n,g)=>n+g.count,0),v.inside);
assert.equal(v.inside+v.outside,v.total);
assert.ok(v.folds.every(g=>g.changed===null),'first-visit marks must not fabricate measured deltas');
assert.ok(v.folds.length<=9);
assert.equal(stableKey(raw),bytes,'projection mutates no source');

// First view names real regions; the counted remainder is reachable, not a sink.
const familyIds=[];
function familyWalk(xs,depth=0){
  assert.ok(depth<12);const folds=C.partition(xs,'family');assert.ok(folds.length<=9);
  assert.equal(folds.reduce((n,g)=>n+g.count,0),xs.length);
  const byId=new Map(xs.map(r=>[r.id,r]));
  for(const g of folds){if(g.range)familyWalk(g.ids.map(id=>byId.get(id)),depth+1);else familyIds.push(...g.ids)}
}
familyWalk(rows);
assert.equal(new Set(familyIds).size,rows.length);assert.equal(familyIds.length,rows.length);
assert.ok(v.folds.some(g=>g.label.startsWith('MORE · ')));
assert.ok(v.folds.every(g=>g.range||g.values[0]===g.label));
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
// Reading returns only channels that are RENDERED: depth length and state tick.
const vocab=C.stateScale(rows);
assert.deepEqual(Object.keys(C.reading(a,vocab)).sort(),['length','tick'],'nothing is carried that is not drawn — no angle, lane, arc or tag');
assert.equal(C.reading({...a,depth:0},vocab).length,20);
assert.equal(C.reading({...a,depth:7},vocab).length,41); // 20 + 7·log2(8)
assert.equal(C.reading(a,vocab).tick,vocab.indexOf(a.state),'tick = position on the field-wide state scale');
assert.ok(C.reading(a,vocab).tick>=0,'every live row has a state tick');
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
// Whole-field context never loses, duplicates or relocates an address on drill.
const atlas=C.overview(rows,v,null),atlasIds=atlas.map(r=>r.id);
assert.equal(new Set(atlasIds).size,rows.length);
assert.deepEqual(C.overview(rows.slice().reverse(),v,null),atlas);
for(const st of [located,{...s,intent:'HEADS'},{...s,mode:'DELTA'},{...located,mode:'RELATIONS'}]){
  const pv=C.project(rows,st,{stamp:100}),map=C.overview(rows,pv,st.focus);
  assert.deepEqual(map.map(r=>r.id),atlasIds);
  assert.equal(map.filter(r=>r.inside).length,pv.inside);
  assert.equal(map.filter(r=>r.held).length,st.focus?1:0);
}
// Spatial relations are executable source facts, not proximity or shared names.
for(const r of rows){
 const groups=C.neighbours(rows,r.id),ids=groups.flatMap(g=>g.members.map(x=>x.id));
 assert.equal(new Set(ids).size,ids.length);assert.ok(!ids.includes(r.id));
 assert.deepEqual(C.neighbours(rows.slice().reverse(),r.id),groups,'source iteration order cannot move a semantic neighbour');
 for(const g of groups)for(const x of g.members){
  assert.equal(g.relation==='parent'?x.id===r.parent:g.relation==='child'?x.parent===r.id:x.parent===r.parent,true);
 }
 const st={...s,mode:'RELATIONS',focus:r.id},pv=C.project(rows,st,{});
 assert.equal(pv.inside,ids.length);assert.equal(pv.inside+pv.outside,rows.length);
 assert.equal(pv.folds.reduce((n,g)=>n+g.count,0),ids.length);assert.ok(pv.folds.length<=3);
 const positions=C.placements(pv);
 pv.folds.forEach((g,i)=>{
  const p=positions[i];assert.ok(g.relation==='parent'?p.y<33:g.relation==='child'?p.y>33:p.y===33&&p.x<35);
  if(g.object){const walk=C.into(rows,st,g,{});assert.equal(walk.focus,g.object.id);assert.equal(walk.mode,'RELATIONS');assert.deepEqual(walk.path,[])}
  else{const deeper=C.project(rows,C.into(rows,st,g,{}),{});assert.equal(deeper.inside,g.count);assert.ok(deeper.folds.length<=9)}
 });
}
const sameName=[{id:'x',address:'/x',parent:'/missing',family:'same'},{id:'y',address:'/y',parent:'/else',family:'same'}];
assert.deepEqual(C.neighbours(sameName,'x'),[],'same words/family cannot manufacture an edge');
const cycle=[{id:'x',address:'/x',parent:'y'},{id:'y',address:'/y',parent:'x'}];
assert.equal(C.neighbours(cycle,'x').flatMap(g=>g.members).length,1,'cyclic parent/child has one visible identity');
// No lossy truncation: Unicode code points paginate and reconstruct exactly.
const text='一目了然 🌘 '.repeat(80),pages=C.textPage(text,0,105).count;
assert.equal(Array.from({length:pages},(_,i)=>C.textPage(text,i,105).text).join(''),text);
/* ==== GOD'S-EYE FRAME + POSITION TRUTH (2026-10-20) ==== */
const mjsSrc=readFileSync(new URL('../field-instrument.mjs',import.meta.url),'utf8'),
  coreSrc=readFileSync(new URL('../field-instrument-core.mjs',import.meta.url),'utf8'),
  cssSrc=readFileSync(new URL('../field-instrument.css',import.meta.url),'utf8');

// POSITION TRUTH — RETURN pin survives a deep link; the frame survives a tab close;
// a typed move goes through the same commit as any other move.
const enterBody=mjsSrc.slice(mjsSrc.indexOf('export async function enter(){'),mjsSrc.indexOf('function exit(){'));
assert.ok(!/anchor=C\.frame\(state\)/.test(enterBody),'a deep link must not clobber the RETURN pin');
assert.equal((enterBody.match(/anchor=anchor\?\?C\.frame\(state\)/g)||[]).length,5,'every enter path seeds the pin only when none is stored');
assert.ok(mjsSrc.includes("case'anchor':anchor=C.frame(state)"),'an explicit PIN must still re-pin');
assert.ok(/^const MEMORY=kv\('field\.instrument\.frame\.v01'\)/m.test(mjsSrc),'the frame persists in localStorage, not sessionStorage');
assert.ok(!mjsSrc.includes('skv('),'the instrument owns no session-scoped store');
const addrBody=mjsSrc.slice(mjsSrc.indexOf('function address(q){'),mjsSrc.indexOf('function key(e){'));
assert.ok(addrBody.includes('commit({...state,query:parsed.query'),'typed moves route through commit(): rewound, remembered, rendered');
assert.ok(!/state=\{\.\.\.state,query:/.test(addrBody),'no side door past revisions or persistence');

const stash=Object.getOwnPropertyDescriptor(globalThis,'localStorage'),mem=new Map();
Object.defineProperty(globalThis,'localStorage',{value:{getItem:k=>mem.has(k)?String(mem.get(k)):null,setItem:(k,v)=>mem.set(k,String(v)),removeItem:k=>mem.delete(k)},writable:true,configurable:true});
const pinStore=kv('field.instrument.frame.v01'),saved={schema:'field-instrument-position/v0.1',frame:C.frame(located),anchor:C.frame(s),host:null,hostAnchor:null};
pinStore.set(saved);
assert.ok(mem.has('field.instrument.frame.v01'),'frame + pin are written to localStorage');
assert.deepEqual(JSON.parse(mem.get('field.instrument.frame.v01')),saved,'stored shape is schema / frame / anchor / host / hostAnchor');
assert.deepEqual(kv('field.instrument.frame.v01').get(),saved,'a fresh handle reads the same bytes: the position survives a tab close');
assert.deepEqual(pinStore.get().frame,located,'the stored frame restores the exact position');
pinStore.del();assert.equal(pinStore.get(),null,'kv really deletes');
if(stash)Object.defineProperty(globalThis,'localStorage',stash);else delete globalThis.localStorage;

// SEMANTIC MARKS — the glyph emits exactly the channels reading() returns.
const foldGlyph=C.project(rows,s,{}).folds[0],
  glyph=C.markGlyph(foldGlyph,{rows,states:vocab,inside:v.inside,slot:0}),
  drawn=[...glyph.matchAll(/data-tick="(-?\d+)" data-count="(\d+)"/g)].map(m=>[+m[1],+m[2]]);
assert.ok(drawn.length>0,'profile.states is rendered as state ticks');
assert.equal(drawn.reduce((n,[,c])=>n+c,0),foldGlyph.count,'every member is accounted for by a state tick');
assert.equal(new Set(drawn.map(([t])=>t)).size,drawn.length,'one tick per represented state');
assert.equal(+glyph.match(/data-len="([\d.]+)"/)[1],
  Math.max(...rows.filter(r=>foldGlyph.ids.includes(r.id)).map(r=>C.reading(r,vocab).length)),
  'depth bar length = reading().length of the deepest member');
assert.ok(glyph.includes('url(#fiGrain0'),'the kind motif is drawn');
assert.ok(/M[\d.]+ 57h/.test(glyph),'the count underline is drawn');

// THE WITNESS — residue stands in the panel and the decode table, not a receipt file.
assert.equal(v.witness,'loss: none','folds are disjoint and total');
assert.equal(v.foldSum,v.inside);
assert.ok(coreSrc.includes('folds drop:'),'a real drop prints its number');
assert.ok(mjsSrc.includes('${esc(view.witness)}'),'the witness is printed in the reading panel');
assert.ok(mjsSrc.includes('${esc(view.residue)}'),'residue coverage is surfaced in READ THE MARK');
assert.ok(v.residue.length>10);

// TURN = AXIS SWAP: the measured axis drives the partition, the map and the label.
for(const [turn,dim,name] of [[0,'family','family'],[1,'state','state'],[2,'day','time'],[3,'depth','depth']]){
  const t={...s,turn},pvTurn=C.project(rows,t,{});
  assert.equal(C.axis(t),name,`TURN ${turn} measures ${name}`);
  assert.equal(pvTurn.dim,dim,`TURN ${turn} swaps the partition axis to ${dim}`);
  assert.ok(C.ladder(t).includes(dim));
  assert.equal(pvTurn.folds.reduce((n,g)=>n+g.count,0),pvTurn.inside,`no fold is dropped on turn ${turn}`);
  assert.ok(pvTurn.folds.length>0&&pvTurn.folds.length<=9,`turn ${turn} keeps counted fold targets`);
}
assert.equal(C.axis({...s,turn:4}),C.axis(s),'the axis ring wraps');
assert.equal(C.axis({...s,turn:-1}),C.axis({...s,turn:3}),'and wraps backwards');
assert.equal(C.scaleLabel(s,v),'FIELD');
assert.equal(C.scaleLabel({...s,scale:4},v),'OBJECT');
assert.equal(C.scaleLabel({...s,turn:1,scale:1},C.project(rows,{...s,turn:1,scale:1},{})),'FAMILY','the rung is named by the dimension it measures');
const mapFam=C.overview(rows,v,null,'family').map(r=>r.id),mapState=C.overview(rows,v,null,'state').map(r=>r.id);
assert.notDeepEqual(mapState,mapFam,'TURN re-sorts the map');
const st1={...s,turn:1},ordered=C.overview(rows,C.project(rows,st1,{}),null,C.axis(st1)),stateOf=new Map(rows.map(r=>[r.id,r.state]));
assert.ok(ordered.every((p,i)=>!i||stateOf.get(ordered[i-1].id)<=stateOf.get(p.id)),'map order follows the turned axis');
assert.equal(new Set(ordered.map(p=>p.id)).size,rows.length,'every address keeps its slot');

// THE MAP — pitch is provable in node because the layout is a pure law.
for(const width of [390-24,366,340,320-24,264,208,192,160]){
  const R=C.ribbon(C.overview(rows,v,null,C.axis(s)),width);
  assert.ok(R.pitch>=2,`pitch ${R.pitch.toFixed(2)}px below the readable floor at ${width}px`);
  assert.equal(R.groups.reduce((n,g)=>n+g.count,0),mapFam.length,'no address is lost in the fold');
  assert.ok(R.groups.every(g=>g.count>0&&g.count<=R.per),'lanes carry equal counted loads');
}
const huge=Array.from({length:1200},(_,i)=>({...a,id:'x'+i,address:'/x/'+i}));
assert.ok(C.ribbon(C.overview(huge,{folds:[]},null,'family'),192).pitch>=2,'no field size may push the map sub-pixel');
const ribbonRules=[...cssSrc.matchAll(/([^{}]*#fiRibbon[^{}]*)\{([^{}]*)\}/g)].map(m=>({sel:m[1].trim(),body:m[2]}));
assert.ok(ribbonRules.some(r=>r.sel.includes('html[data-instrument="1"]')&&r.body.includes('display:block')),'the map mounts only with the instrument');
assert.ok(ribbonRules.every(r=>!/pointer-events:\s*none/.test(r.body)),'map ticks are tappable');
assert.ok(mjsSrc.includes('class="laneN"')&&mjsSrc.includes('>${g.count}</text>'),'each lane prints the count it carries');
assert.ok(mjsSrc.includes("setAttribute('data-pitch'"),'the pitch is exposed for browser verification');

// REST IS QUIET, BLOOM IS EARNED — user-override media excluded, rest rules only.
function restRulesOf(css){
  let out='',i=0;
  while(i<css.length){
    const at=css.indexOf('@media',i);
    if(at<0){out+=css.slice(i);break}
    out+=css.slice(i,at);
    const open=css.indexOf('{',at);let depth=0,j=open;
    for(;j<css.length;j++){if(css[j]==='{')depth++;else if(css[j]==='}'&&!--depth)break}
    if(!/prefers-contrast|prefers-reduced-motion/.test(css.slice(at,open+1)))out+=css.slice(at,j+1);
    i=j+1;
  }
  const reveal=/(:hover|:focus|\[data-reading="1"\]|data-detail|\.bloom|\.preview)/;
  return [...out.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(m=>({sel:m[1].trim(),body:m[2]}))
    .filter(r=>r.sel&&!r.sel.startsWith('@')&&/opacity/.test(r.body)&&!reveal.test(r.sel));
}
let peak=0,measured=0;
for(const r of restRulesOf(cssSrc))for(const [,a] of r.body.matchAll(/opacity:\s*([0-9.]+)/g)){
  measured++;peak=Math.max(peak,parseFloat(a));
  assert.ok(parseFloat(a)<=0.12,`rest alpha ${a} over the quiet law in \`${r.sel}\``);
}
assert.ok(measured>=5,`the quiet law was measured on ${measured} drawn rest layers`);
assert.ok(peak>0&&peak<=0.12,'every drawn layer rests at or below α.12 and is still a layer');

// THE MENU FOLDS, NEVER CLIPS — hiding is not folding.
const menuOps=Array.from({length:9},(_,i)=>['op'+i,'L'+i,'hint']),folded=C.foldOps(menuOps,6);
assert.equal(folded.shown.length,6);assert.equal(folded.hidden,3);
assert.equal(C.foldOps(menuOps.slice(0,6),6).hidden,0);assert.equal(C.foldOps(menuOps.slice(0,7),6).hidden,1);
assert.ok(mjsSrc.includes('C.foldOps(')&&mjsSrc.includes('data-op="__more"'));
assert.ok(mjsSrc.includes('+${more}'),'the fold prints the number it hides');
assert.ok(!/\.fiMenu\{[^}]*overflow:hidden/.test(cssSrc),'overflow:hidden is not folding');

// READ THE MARK decodes what is actually drawn.
assert.ok(mjsSrc.includes('C.MOTIFS')&&mjsSrc.includes('C.MATERIALS'),'help is generated from the same motif/material source as the marks');
assert.ok(mjsSrc.includes('reading.dataset.mode=')&&/data-mode="help"/.test(cssSrc),'help keeps the reading-panel contract');
assert.ok(mjsSrc.includes('view.witness'),'help carries the loss witness');

// THE POSITION LINE — axis · rung · n/total · what moved · breadcrumb.
assert.match(C.bearing(rows,s,v,s).line,/^family·FIELD·\d+\/\d+ ∆/);
assert.match(C.bearing(rows,st1,C.project(rows,st1,{}),s).line,/^state·FIELD·\d+\/\d+/);
const locatedLine=C.bearing(rows,located,C.project(rows,located,{}),s).line;
assert.match(locatedLine,/ › id:/,'a path prints its breadcrumb');
assert.ok(locatedLine.includes(`${C.project(rows,located,{}).inside}/${C.project(rows,located,{}).total}`),'n/total is on the line');
assert.ok(C.bearing(rows,s,v,s).line.length<40,'counts come first: a long path can only clip its own tail');

console.log(`FIELD INSTRUMENT PASS · ${rows.length} real routes · 40,000 colliding records reachable once · ${calls} folds / depth ${maxDepth} · projection ${projectionMs}ms / traversal ${traversalMs}ms · exact RETURN · no source mutation`);
console.log(`GOD'S-EYE FRAME PASS · 4-turn axis ring (state → time → depth → family from rest) · map ${mapFam.length} ticks / ${C.ribbon(C.overview(rows,v,null,'family'),366).lanes} lanes / ${C.ribbon(C.overview(rows,v,null,'family'),366).pitch.toFixed(2)}px pitch at 390 · ${measured} rest layers ≤ α${peak} · witness "${v.witness}" · line "${C.bearing(rows,s,v,s).line}"`);
