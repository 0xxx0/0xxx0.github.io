import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as C from '../field-instrument-core.mjs';
import {hashText,stableKey} from '../lib/id.js';
import {esc} from '../lib/dom.js';
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
// The strip measures the box it is actually given: its own, else the frame minus
// the VIEW chip column, else the 264px stand-in — never a bar that snaps shut.
assert.ok(mjsSrc.includes('own>64?own:host>108?host-44:264'),'the map measures its own strip, with the VIEW chip column accounted for');
assert.ok(mjsSrc.includes('observe.observe(svg)'),'the map re-folds when its own strip is re-laid out');

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
  const reveal=/(:hover|:focus|\[data-reading="1"\]|data-detail|\.bloom|\.preview|\[data-room="1"\])/;
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

/* ==== CUBE MEETS MAP (2026-10-20) — the fold happens AT the mark ==== */
const cubeSrc=readFileSync(new URL('../lib/interphase-cube.js',import.meta.url),'utf8');
// ONE implementation: the instrument's core reaches the absorbed donor geometry, and
// the donor directory is never imported, forked or re-derived anywhere in the repo.
assert.ok(C.CUBE&&C.CUBE.VERSION==='interphase-cube/v0.1','the cube geometry is reachable from the projection');
assert.equal(mjsSrc.includes("import './lib/interphase-cube.js'"),false,'the adapter reaches geometry through the core, never a second copy');
assert.ok(coreSrc.includes("import './lib/interphase-cube.js'")&&coreSrc.includes('export const CUBE='),'one absorbed implementation, exported for the room AND this test');
assert.deepEqual(C.CUBE.LAYOUT.map(e=>e.face).slice().sort(),C.CUBE.ORDER.slice().sort(),'six panels, six readings');
assert.equal(C.CUBE.ORDER.length,6);
assert.equal(C.CUBE.LAYOUT.filter(e=>e.parent).length,1,'the net keeps its nested (second-level) hinge');

// FOLD HASH INVERSE (absorbed from the donor's test 02): net → cube → net returns the
// same geometry hash, the matrices back within 1e-9, and the cube really closes.
const rt=C.CUBE.roundTrip();
assert.ok(rt.ok,'fold states must be exact inverses');
assert.equal(rt.netHash,rt.backHash,'net -> cube -> net keeps the same geometry hash');
assert.notEqual(rt.netHash,rt.cubeHash,'the cube is a real transform, not the flat net');
assert.ok(rt.delta<1e-9&&rt.closes<1e-9);
assert.equal(C.CUBE.hashGeometry(C.CUBE.geometry('cube')),C.CUBE.hashGeometry(C.CUBE.fold(C.CUBE.geometry('net'))),'fold() is stable');

// HINGE ORIGINS — the four groups sit on the shared edge in the CSS exactly as the
// model declares them, and each has a cube rule that swings it onto its wall.
const ruleOf=sel=>{const i=cssSrc.indexOf(sel);if(i<0)return'';const open=cssSrc.indexOf('{',i),end=cssSrc.indexOf('}',open);return open<0||end<0?'':cssSrc.slice(open+1,end)};
const roomRule=g=>ruleOf(`.fiRoomPlane .h-${g}{`),
  cubeRule=g=>ruleOf(`#fiRoomPlane[data-fold="cube"] .h-${g}{`).includes('transform:rotate');
let hingeOk=true;const hingeDet=[];
for(const g of ['top','bottom','left','right']){
  const got=(roomRule(g).match(/transform-origin:\s*([^;]+)/)||[])[1]?.replace(/\s+/g,' ').trim()||'MISSING';
  const used=(coreSrc.match(new RegExp(`h-${g}`,'g'))||[]).length;
  if(got!==C.CUBE.HINGE[g].css||!cubeRule(g)||used<1)hingeOk=false;
  hingeDet.push(`h-${g} ${got}${cubeRule(g)?'':' (no cube rule)'}`);
}
assert.ok(hingeOk,hingeDet.join(' · '));
assert.ok(ruleOf('#fiRoomPlane[data-fold="net"]{').trim()==='transform:none','net state: every hinge at 0 degrees');
assert.ok(ruleOf('.fiRoomPlane{').includes('transform-origin:50% 37.5%'),'the plane origin is the anchor cell (1,1) centre, both fold states');
assert.ok(coreSrc.includes('data-fold="net"')&&mjsSrc.includes("plane.dataset.fold='cube'"),'the fold starts flat AT the mark, then hinges up');

// FOLD-AT-MARK COORDINATE INVARIANT — the anchor [x,y] is identical net ↔ cube ↔ net.
// Two independent proofs must agree: the fold world matrix never moves the anchor cell
// centre, and the plane rotation is applied ABOUT it (transform-origin == its centre).
const inv=C.CUBE.anchorInvariant();
assert.ok(inv.ok,`anchor face delta ${inv.faceDelta.toExponential(1)} · origin delta ${inv.originDelta.toExponential(1)} · pivot delta ${inv.pivotDelta.toExponential(1)}`);
assert.deepEqual(C.CUBE.anchorCell().originPct,{x:50,y:37.5},'transform-origin resolves to the anchor cell centre of the 3x4 net');
const fieldBox={left:12,top:129,width:390-24,height:509};
// The reachable marks: the instrument's own placements grid (15 / 48.3 / 81.7 % of the
// field box) plus the single-object detail centre — at the 390×844 phone it is built for.
const phone={width:390,height:844},
  marks=[0,1,2].flatMap(c=>[0,1,2].map(r=>({x:fieldBox.left+fieldBox.width*(0.15+c*0.3335),y:fieldBox.top+fieldBox.height*(0.15+r*0.3335)})))
    .concat([{x:fieldBox.left+fieldBox.width/2,y:fieldBox.top+fieldBox.height/2}]);
for(const point of marks.concat([{x:12,y:12},{x:366,y:638}])){
  const g=C.roomAnchor(point,fieldBox,{min:44,max:128});
  assert.ok(Math.abs(g.left+1.5*g.s-g.ax)<1e-9&&Math.abs(g.top+1.5*g.s-g.ay)<1e-9,
    `net cell (1,1) must sit exactly on the mark at ${point.x},${point.y}`);
  assert.ok(Math.abs(g.ax+fieldBox.left-point.x)<1e-9&&Math.abs(g.ay+fieldBox.top-point.y)<1e-9,'the anchor never moves; only the fit changes');
  assert.ok(g.s>=44&&g.s<=128,`panel size ${g.s.toFixed(1)} outside the touch floor / phone budget`);
}
for(const point of marks){
  const g=C.roomAnchor(point,fieldBox,{min:44,max:128}),l=fieldBox.left+g.left,t=fieldBox.top+g.top;
  assert.ok(l>=0&&t>=0&&l+3*g.s<=phone.width&&t+4*g.s<=phone.height,
    `the net fits the ${phone.width}x${phone.height} screen it folded out of (${point.x},${point.y} -> ${l.toFixed(0)},${t.toFixed(0)} ${ (3*g.s).toFixed(0)}x${(4*g.s).toFixed(0)})`);
}
// Six readings generated from the REAL route record — no invented content channel.
const checked=rows.find(r=>Array.isArray(r.payload?.evidence?.checks)&&r.payload.evidence.checks.length),
  claimed=rows.find(r=>Array.isArray(r.payload?.evidence)&&r.payload.evidence.some(c=>c&&c.claim)),
  bare=rows.find(r=>!r.payload?.evidence);
assert.ok(checked&&claimed&&bare,'the manifest carries proof / claims / no-evidence routes');
const trail=[C.frame(s),{...s,turn:1,scale:2},{...s,turn:2,scale:4}];
const six=C.roomReadings(checked,{revisions:trail,pin:s});
assert.deepEqual(six.map(r=>r.face),C.CUBE.ORDER,'six readings, cube order');
assert.deepEqual(Object.keys(six[0]).sort(),['axis','cjk','count','face','text'].sort(),'every face channel is rendered, nothing carried that is not drawn');
assert.equal(six[0].text,checked.title,'OBJECT = the held title');
assert.equal(six[1].text,checked.address,'ADDRESS = the held address');
assert.ok(six[2].text.startsWith(checked.state)&&six[2].text.includes(checked.day),'STATE = the held state, with its day');
assert.ok(six[3].text.startsWith(`${trail.length} MOVES`)&&six[3].text.includes('family·FIELD')&&six[3].text.includes('state·KIND'),'TRANSFORM = transform history from the revisions');
assert.equal(six[3].count,trail.length,'the move count is printed, never hidden');
assert.ok(six[4].text.startsWith(`${checked.payload.evidence.checks.length} CHECKS`)&&six[4].text.includes(checked.payload.evidence.checks[0].slice(0,40)),'PROVE = proof from evidence.checks');
assert.ok(six[5].text.startsWith('PIN '),'RETURN = the pin');
assert.ok(six.every(r=>r.text&&r.text.length<=64),'a reading folds its prose at 64 chars and keeps the count first');
assert.equal(C.roomReadings(claimed).find(r=>r.face==='PROVE').text.startsWith(`${claimed.payload.evidence.length} CLAIMS`),true,'claims-style evidence is counted too');
assert.equal(C.roomReadings(bare).find(r=>r.face==='PROVE').text,'NO EVIDENCE FILED','an absent proof stays absent, never invented');
assert.equal(C.roomReadings(bare).find(r=>r.face==='TRANSFORM').text.startsWith('0 MOVES'),true);
// The room's DOM is the donor's cross net, built by the SAME projection the browser
// renders — six faces, four hinge groups, RETURN nested under PROVE, every reading
// (and its count) actually on the face. A missing reading is a thrown error, not a hole.
const roomHtml=C.roomMarkup(six);
assert.equal((roomHtml.match(/class="fiFace" data-face="/g)||[]).length,6,'six faces emitted');
assert.equal(C.CUBE.ORDER.every(f=>roomHtml.includes(`data-face="${f}"`)),true,'cube order on the faces');
assert.equal((roomHtml.match(/class="cell nest"/g)||[]).length,1,'the nested (second-level) hinge is emitted under PROVE');
for(const h of ['h-none','h-top','h-bottom','h-left','h-right'])assert.ok(roomHtml.includes(`hinge ${h}`),h+' hinge emitted');
assert.ok(roomHtml.includes('data-room-fold'),'the OBJECT face is the fold control');
assert.ok(roomHtml.includes('01/06')&&roomHtml.includes('06/06'),'every reading is numbered, counts never hidden');
for(const r of six)assert.ok(roomHtml.includes(esc(r.text))&&roomHtml.includes(esc(r.axis))&&roomHtml.includes(esc(r.cjk)),
  `${r.face} text/axis/cjk must be on its face`);
assert.throws(()=>C.roomMarkup(six.slice(1)),/ROOM_READING_MISSING/,'a missing reading must fail loudly');
// Interruptible by construction: the fold is a CSS transition on the LIVE hinges, so a
// mid-fold tap completes or reverses from where it is; reduced motion swaps instantly.
assert.ok(ruleOf('.fiRoomPlane{').includes('transition:transform 300ms cubic-bezier(.2,.8,.2,1)'),'the donor 300ms hinge transition, on the live plane');
assert.ok(ruleOf('.fiRoomPlane .hinge{').includes('transition:transform 300ms'),'and on every live hinge');
assert.ok(!/\.animate\(/.test(mjsSrc.slice(mjsSrc.indexOf('function openRoom'),mjsSrc.indexOf('function closeRoom'))),'the fold is interruptible CSS, not a cancellable flight');
assert.ok(/function toggleRoom|const toggle=\(\)=>\{plane\.dataset\.fold=plane\.dataset\.fold==='cube'\?'net':'cube'\}/.test(mjsSrc),'a mid-fold tap reverses the same hinges');
assert.ok(/plane\.dataset\.fold='net';\s*\/\/ unfold back FLAT into the same mark cell/.test(mjsSrc),'fold OUT returns flat into the mark cell');
// REDUCED-MOTION BRANCH — depth without motion, no spatial loss.
const rmAt=cssSrc.indexOf('@media(prefers-reduced-motion:reduce)'),rmWin=rmAt<0?'':cssSrc.slice(rmAt,rmAt+200);
assert.ok(/\.fiRoomPlane,\.fiRoomPlane \.hinge\{transition:none\}/.test(rmWin),'the room hinges stop moving under prefers-reduced-motion');
assert.ok(mjsSrc.includes("const reduced=()=>matchMedia('(prefers-reduced-motion:reduce)').matches"),'the JS swap branch exists');
assert.ok(/if\(reduced\(\)\|\|!plane\)\{drop\(\);return\}/.test(mjsSrc),'reduced motion closes the room instantly');
// THE ROOM NEVER LEAVES THE WHOLE — the map strip stays, with a you-are-here dot that
// exists only in the earned room state (α.12 law still holds for everything at rest).
assert.ok(/renderRibbon\(null\);\s*\/\/ you-are-here dot/.test(mjsSrc),'opening/closing the room re-reads the map');
assert.ok(mjsSrc.includes('class="here"')&&/circle class="here"/.test(mjsSrc),'the you-are-here dot is drawn from the held tick position');
assert.ok(/#fiRibbon \.here\{fill:currentColor;stroke:none;opacity:0\}/.test(cssSrc),'the dot is not a rest layer at all');
assert.ok(mjsSrc.includes("svg.dataset.room='1'")&&mjsSrc.includes('delete svg.dataset.room'),'the room state is explicit on the map');
assert.ok(mjsSrc.includes('closeRoom()'),'UP / RETURN / any move out of the fold unfolds the room');
// NO CHANCE ANYWHERE — identity and geometry stay FNV-1a/stableKey, in every file.
const chance=['Math','random'].join('.');
assert.deepEqual([['field-instrument.mjs',mjsSrc],['field-instrument-core.mjs',coreSrc],['field-instrument.css',cssSrc],['lib/interphase-cube.js',cubeSrc]]
  .filter(([,src])=>src.includes(chance)).map(([f])=>f),[],chance+' must appear nowhere in the instrument or its cube geometry');

/* ==== THE WALK — the hex plan and the decode overlay (2026-10-20) ==== */
// The plan is a pure law: (ordered map, box) -> rooms. Nothing about it may
// depend on a view, a zoom or a random number.
const hexDist=(a,b)=>{const dq=a.q-b.q,dr=a.r-b.r;return (Math.abs(dq)+Math.abs(dq+dr)+Math.abs(dr))/2};
const walkBox={width:390-24,height:844-(64+51)-14-206-C.PLAN.cap},   // the field box at 390x844, caption reserved
  walkMap=C.overview(rows,v,null,C.axis(s)),walkA=C.planLayout(walkMap,walkBox),walkB=C.planLayout(walkMap,walkBox);
assert.deepEqual(walkA.tiles,walkB.tiles,'the plan is a pure law: the same map always lays the same rooms');
assert.equal(walkA.total,walkMap.length);assert.equal(walkA.shown+walkA.folded,walkA.total,'rooms drawn + rooms folded = the whole field');
assert.equal(walkA.per.reduce((n,p)=>n+p.count,0),walkA.folded,'the folded periphery prints every count it hides behind');
assert.equal(new Set(walkA.tiles.map(t=>t.id)).size,walkA.shown,'one room per address, never two');
assert.ok(walkA.size>=C.PLAN.minSize&&walkA.width2>=2*C.PLAN.minSize-0.05,`tile ${walkA.width2}px below the legibility floor at 390`);
// ADJACENCY = AXIS ORDER: consecutive objects in the turned axis are one hex
// step apart, ring transitions included — "next" is literally "next door".
assert.deepEqual(walkA.tiles.map(t=>t.id),walkMap.slice(0,walkA.shown).map(p=>p.id),'the walk IS the axis order');
for(let i=0;i<walkA.tiles.length-1;i++)
  assert.equal(hexDist(walkA.tiles[i],walkA.tiles[i+1]),1,`rooms ${i} and ${i+1} are not neighbours on the plan`);
const ringOf=new Map(walkA.tiles.map(t=>[t.id,t.ring]));assert.equal(ringOf.get(walkA.tiles[0].id),0,'the first room in the axis is the centre of the plan');
assert.equal(walkA.tiles.filter(t=>t.ring===0).length,1,'the field centre is one room');
for(let k=1;k<walkA.rings;k++)assert.equal(walkA.tiles.filter(t=>t.ring===k).length,6*k,`ring ${k} carries its 6k rooms`);
assert.equal(walkA.tiles.filter(t=>t.ring===walkA.rings).length,walkA.shown-walkA.tiles.filter(t=>t.ring<walkA.rings).length,'only the last ring may be partial');
assert.ok(walkA.tiles.every((t,i)=>!i||t.ring>=walkA.tiles[i-1].ring),'rings only ever grow outward');
assert.ok(walkA.tiles.every(t=>t.x>=0&&t.x<=walkBox.width&&t.y>=C.PLAN.cap&&t.y<=walkBox.height),'no room leaves the field box');
// APPEND-ONLY STABLE: holding an object or narrowing the lens re-lights the
// tiles, it never moves one. Same object, same tile, across every view switch.
const holdMap=C.overview(rows,C.project(rows,C.locate(s,a),{}),a.id,C.axis(s)),
  walkHold=C.planLayout(holdMap,walkBox),atSlot=new Map(walkA.tiles.map(t=>[t.id,`${t.q},${t.r}`]));
assert.deepEqual(walkHold.tiles.map(t=>`${t.q},${t.r}`),walkA.tiles.map(t=>`${t.q},${t.r}`),'a view switch may not move a single room');
assert.equal(walkHold.tiles.filter(t=>t.held).length,1,'the held room is marked, not relocated');
for(const turn of [1,2,3]){
  const t={...s,turn},m=C.overview(rows,C.project(rows,t,{}),null,C.axis(t)),L=C.planLayout(m,walkBox);
  assert.equal(L.shown+L.folded,m.length,`turn ${turn} loses no room`);
  assert.ok(L.size>=C.PLAN.minSize,`turn ${turn} pushes a room sub-pixel`);
  for(let i=0;i<L.tiles.length-1;i++)assert.equal(hexDist(L.tiles[i],L.tiles[i+1]),1,`turn ${turn} breaks the walk`);
}
// Zoom-free sizing: the same law fits every phone and the desktop, and folds
// what it cannot draw — a printed number, never a hidden tail, never sub-pixel.
for(const [w,h] of [[320-24,568-129-206-C.PLAN.cap],[320-24,640-129-206-C.PLAN.cap],[390-24,844-129-206-C.PLAN.cap],[430-24,932-129-206-C.PLAN.cap],[1024,800-135-206-C.PLAN.cap]]){
  const L=C.planLayout(walkMap,{width:w,height:h});
  assert.ok(L.size>=C.PLAN.minSize,`tile ${L.size}px below the floor at ${w}x${h}`);
  assert.equal(L.shown+L.folded,walkMap.length,`count lost at ${w}x${h}`);
  assert.equal(L.per.reduce((n,p)=>n+p.count,0),L.folded,`folded counts unprinted at ${w}x${h}`);
  assert.ok(L.tiles.every(t=>t.x-L.width2/2>=-0.5&&t.x+L.width2/2<=w+.5&&t.y-L.height2/2>=-.5&&t.y+L.height2/2<=h+.5),`room leaves the ${w}x${h} box`);
}
const hugeWalk=C.planLayout(C.overview(large,{folds:[]},null,'family'),walkBox);
assert.equal(hugeWalk.shown+hugeWalk.folded,large.length,'40,000 objects still conserve their count');
assert.equal(hugeWalk.per.reduce((n,p)=>n+p.count,0),hugeWalk.folded,'even a capped ring budget prints every folded count');
assert.ok(hugeWalk.size>=C.PLAN.minSize,'40,000 objects may not push a room sub-pixel');
assert.equal(C.planLayout([],walkBox).shown,0,'an empty field draws an empty plan, not a crash');
// ONE TILE = ONE ROOM: frame + the marks' own motif + the state notch + the count.
const tileOf=C.planTile(a,{size:18,states:vocab,count:5,ring:3});
assert.ok(tileOf.includes('fiHexFrame')&&tileOf.includes('fiHexGlyph')&&tileOf.includes('fiHexNotch'),'frame, motif and notch are all drawn');
assert.ok(tileOf.includes(C.MOTIFS[C.material(a.kind)]),'the tile draws the SAME material motif the marks draw');
assert.ok(tileOf.includes(`data-state="${Math.max(0,vocab.indexOf(a.state))}"`),'the notch carries the state rank on the field-wide scale');
assert.ok(tileOf.includes('>5<'),'the count a room folds is printed');
assert.equal(C.planTile(a,{size:18,states:vocab,count:1}).includes('fiHexCount'),false,'a room of one prints no count');
assert.equal(C.material(a.kind),C.material(a.kind),'material is deterministic');
// DECODE — the overlay reads the REAL record, in either view.
const dec=C.decodeMark({row:a,rows,states:vocab,lane:2,slot:7,total:206}),
  decHtml=C.decodeMarkup(dec,{x:120,y:400,max:300});
assert.ok(decHtml.includes(a.address)&&decHtml.includes(String(a.state))&&decHtml.includes(String(a.depth)),'the overlay decodes the real fields, not a legend');
assert.ok(decHtml.includes(`lane 2`),'the lane is decoded where the mark sits');
assert.ok(decHtml.includes('of 206'),'the count and the slot are printed, never hidden');
assert.ok(decHtml.includes('fiCross')&&decHtml.includes('--x:120.0px')&&decHtml.includes('--y:400.0px'),'the crosshair sits AT the mark');
assert.ok(decHtml.includes('--cy:250.0px')&&/fiDecodeCard/.test(decHtml),'the card opens beside the mark and clamps clear of the reading panel');
assert.ok(decHtml.includes('data-decode-close'),'the overlay has one way out');
assert.ok(decHtml.includes(C.MATERIALS[C.material(a.kind)].join(' · ')),'the style key explains the motif from the real material list');
const groupDec=C.decodeMark({group:v.folds[0],rows,states:vocab,ring:3,total:206});
const groupHtml=C.decodeMarkup(groupDec,{});
assert.ok(groupHtml.includes(String(v.folds[0].count)),'a folded mark decodes its count');
assert.ok(groupHtml.includes(v.folds[0].dim),'and the dimension it folded on');
assert.ok(groupHtml.includes('ring 3'),'a plan room decodes its ring');
assert.ok(groupHtml.includes(a.state)||groupHtml.includes('×'),'and the states it carries');
assert.equal(C.decodeMarkup(C.decodeMark({}),{}).includes('NO MARK HELD'),true,'no mark is stated, never invented');
// One decoder, two views, one key.
assert.ok(mjsSrc.includes('function cycleView(')&&mjsSrc.includes("$('#fiView').onclick=()=>cycleView()"),'the bar gains a VIEW cycle');
const cycleBody=mjsSrc.slice(mjsSrc.indexOf('function cycleView(){'),mjsSrc.indexOf('function wirePlan('));
assert.ok(/planView=!planView/.test(cycleBody)&&/root\.dataset\.map=/.test(cycleBody),'the cycle names the observer map');
assert.ok(!/\bstate\s*=/.test(cycleBody)&&!/\banchor\s*=/.test(cycleBody),'switching views cannot move the held object or the pin');
assert.ok(mjsSrc.includes('C.planLayout(')&&mjsSrc.includes('C.planTile(')&&mjsSrc.includes('data-plan-id'),'the browser paints the SAME law this test just proved');
assert.ok(/commit\(C\.locate\(state,r\),\{native:true\}\);[\s\S]{0,160}openRoom\(g,point\)/.test(mjsSrc),'tapping a room locates the object, then hinges the room AT the tile');
assert.ok(mjsSrc.includes("planView?[...$('#fiPlan').querySelectorAll('[data-plan-id]')].find("),'in the plan the fold pivots at the room tile');
assert.ok(/if\(planView\|\|matchMedia\('\(prefers-reduced-motion:reduce\)'\)\.matches\)\{commit\(next,\{native\}\);return\}/.test(mjsSrc),'the plan walks by commit — no camera on a hidden plane');
assert.ok(mjsSrc.includes('function wireDecode(')&&mjsSrc.includes('},620);')&&mjsSrc.includes('holdTimer=setTimeout('),'a press-and-hold opens the decode in either view');
// The bar (and its strip) is the PAGE's chrome, outside this section: the hold
// must listen where the marks actually live, or only the plan would decode.
assert.ok(mjsSrc.includes("document.addEventListener('pointerdown'")&&mjsSrc.includes("'[data-fold],[data-map-id]'"),'press-and-hold decodes a mark in EITHER view');
assert.ok(mjsSrc.includes('holdEl&&!holdEl.isConnected'),'a re-render under the finger is not a letting go');
assert.ok(mjsSrc.includes("const close=host.querySelector('[data-decode-close]')"),'the overlays own way back is wired to a real button');
assert.ok(mjsSrc.includes('decodeRelease')&&mjsSrc.includes('decodeRelease=false;e.preventDefault()'),'the holds own release click is swallowed, never a move');
assert.ok(mjsSrc.includes('C.decodeMark(')&&mjsSrc.includes('C.decodeMarkup('),'one decoder builds every overlay');
assert.ok(mjsSrc.includes("closest('[data-fold],[data-map-id]')")&&mjsSrc.includes('.fiDecodeCard'),'the hold reaches strip ticks and plan rooms alike, and taps pass the overlay through');
const helpBody=mjsSrc.slice(mjsSrc.indexOf('function showHelp(){'),mjsSrc.indexOf('// The glyph is drawn by the projection law'));
assert.ok(helpBody.includes('openDecode({key:true'),'READ THE MARK opens the SAME overlay, not a second table');
assert.ok(helpBody.includes('C.MOTIFS')&&helpBody.includes('C.MATERIALS'),'the key is still generated from the marks own vocabulary');
assert.ok(helpBody.includes('data-close')&&helpBody.includes('closeDecode()'),'the panel keeps its counted line and its way back');
assert.ok(helpBody.includes('view.witness')&&helpBody.includes('view.residue'),'the key carries the loss witness and its residue');
// QUIET BY DEFAULT, DECODED ON HOLD.
assert.ok(/\.fiHexArt\{[^}]*opacity:\.12/.test(cssSrc),'the plan rests at the quiet alpha');
assert.ok(/#fiPlan\.bloom \.fiHexArt\{opacity:\.95\}/.test(cssSrc),'full bloom is earned by the finger');
assert.ok(/\.fiPlanEdge polygon\{[^}]*opacity:\.1/.test(cssSrc),'the folded edge is a rest layer, not a shout');
assert.ok(/\.fiDecode\{[^}]*display:none/.test(cssSrc),'the overlay is not a rest layer at all');
assert.ok(/\.fiDecode\[data-open\]\{display:block\}/.test(cssSrc));
assert.ok(/\.fiDecode\{[^}]*pointer-events:none/.test(cssSrc),'the field stays live behind the overlay');
assert.ok(/\.fiDecodeCard\{[^}]*pointer-events:auto/.test(cssSrc),'the decode card alone takes the pointer');
assert.ok(/\.fiDecodeCard\{[^}]*--cy/.test(cssSrc),'the card is positioned by the mark it decodes');
const rmPlan=cssSrc.slice(cssSrc.indexOf('@media(prefers-reduced-motion:reduce)'),cssSrc.indexOf('@media(prefers-contrast'));
assert.ok(/\.fiHexArt/.test(rmPlan),'reduced motion keeps the plan depth and drops the transition');
assert.ok(mjsSrc.includes("if(planView)renderPlan();"),'the plan re-lays itself with the field it is given');
assert.ok(mjsSrc.includes("filter(n=>n.offsetParent!==null)"),'keyboard walks the view that is actually on screen');
console.log(`FIELD INSTRUMENT PASS · ${rows.length} real routes · 40,000 colliding records reachable once · ${calls} folds / depth ${maxDepth} · projection ${projectionMs}ms / traversal ${traversalMs}ms · exact RETURN · no source mutation`);
console.log(`GOD'S-EYE FRAME PASS · 4-turn axis ring (state → time → depth → family from rest) · map ${mapFam.length} ticks / ${C.ribbon(C.overview(rows,v,null,'family'),366).lanes} lanes / ${C.ribbon(C.overview(rows,v,null,'family'),366).pitch.toFixed(2)}px pitch at 390 · ${measured} rest layers ≤ α${peak} · witness "${v.witness}" · line "${C.bearing(rows,s,v,s).line}"`);
console.log(`CUBE MEETS MAP PASS · room hinges AT the mark (anchor [${inv.anchor.join(',')}] identical net↔cube↔net, pivot Δ${inv.pivotDelta.toExponential(1)}) · fold hash net ${rt.netHash} → cube ${rt.cubeHash} → net ${rt.backHash} · 4 hinge origins on the shared edge + nested RETURN · six readings from a real record (${checked.address}: ${six[3].count} moves, ${six[4].count} checks, pin ${six[5].text.slice(4,20)}) · 300ms interruptible · reduced-motion instant · ${chance} nowhere`);

console.log(`THE WALK PASS · hex plan ${walkA.shown} rooms at ${walkA.width2}×${walkA.height2}px on rings 0–${walkA.rings} (tile floor ${C.PLAN.minSize}px) · ${walkA.folded} folded at the edge (${walkA.per.map(p=>`ring ${p.ring} +${p.count}`).join(' · ')}) · adjacency = axis order, ${walkA.tiles.length-1} steps · same slots after a view switch · TURN keeps the walk · 40,000-object field folds honestly · decode overlay reads real records (crosshair at the mark) · ${chance} nowhere`);
