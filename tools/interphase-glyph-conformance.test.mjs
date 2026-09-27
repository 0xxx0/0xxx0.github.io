import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {audioGlyphDescriptor,audioGlyphRepresentation,audioGlyphSvg} from '../fold-bloom/listen/audio-glyph.js';
import {createExperienceSet,appendSource,setSeamLaw} from '../fold-bloom/set/set-core.js';
const require=createRequire(import.meta.url),I=require('../lib/interphase-core.js'),L=require('../lens-state.js'),G=require('../lib/interphase-glyph.js');
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const plain=x=>JSON.parse(JSON.stringify(x));
function fixture(kind){
  const events={},context={Interphase:I,queueMicrotask:f=>f(),audioGlyphRepresentation};
  context.window=context;context.addEventListener=(n,f)=>events[n]=f;
  let state,host;
  if(kind==='field'){
    state={href:'/fixture/',kind:'artifact',title:'RAW_SENTINEL',operation:'READ',state:'ACTIVE',role:'RAW_SENTINEL'};
    context.__fieldRouteMap={get:id=>id===state.href?state:undefined,all:()=>new Map([[state.href,state]])};
    context.FieldLensHost={focus:()=>state,projection:()=> 'PAGE',uiState:()=>({focus:state.href}),restore:()=>{}};
    vm.createContext(context);vm.runInContext(read('field-glyph.js'),context);vm.runInContext(read('lib/interphase-field.js'),context);host=context.FieldInterphase;
  }else{
    state={fileMeta:{hash:'a'.repeat(64),name:'RAW_SENTINEL',lyrics:'RAW_SENTINEL'},time:12,scope:'PHRASE',pins:[],map:{duration:60,bpm:120,frames:[{e:.4,c:.2,f:.1}]}};
    state.glyph=audioGlyphDescriptor(state.map,state.fileMeta);state.glyph.raw='RAW_SENTINEL';
    context.FoldBloomListen={state:()=>state,glyph:()=>state.glyph,seek:t=>state.time=t,aperture:s=>state.scope=s};
    vm.createContext(context);vm.runInContext(read('lib/interphase-listen.js').replace(/^import .*\n/,''),context);host=context.FoldBloomListenInterphase;
  }
  return {host,state,context};
}
for(const kind of ['field','audio']){
  test(kind+': native recipe, stable snapshot, byte-free output and exact renderer reuse',()=>{
    const {host,state,context}=fixture(kind),id=host.state.selection[0];
    const a=host.glyph(id),b=host.glyph(id);assert.deepEqual(a,b);assert.equal(a.support,1);
    assert.equal(L.validateDescriptor(a.representation.recipe).ok,true);
    const expected=kind==='field'?context.FieldGlyph.svg(state):audioGlyphSvg(a.representation.descriptor);
    assert.equal(a.representation.svg,expected);
    const pr=host.project('GLYPH');assert.ok(!JSON.stringify(pr).includes('RAW_SENTINEL'));
    assert.ok(!('operations' in pr.nodes[0]));assert.ok(!('capabilities' in pr.nodes[0]));assert.ok(!('value' in pr.nodes[0]));
    assert.ok(G.svg(pr.nodes[0]).includes('<image '));
    for(const channel of ['content','authority','depth','time'])assert.ok(pr.residue.some(r=>r.channel===channel));
    assert.equal(host.write(id,{value:'bad'}).ok,false);assert.equal(host.invoke(id,'EXECUTE').ok,false);
  });
  test(kind+': artifact fold recovery uses host + instrument state, never glyph inversion',()=>{
    const {host,state}=fixture(kind),id=host.state.selection[0],before=plain(state);
    host.focus(id,{aperture:'DETAIL'});host.project('GLYPH',{size:72});
    const initial=host.glyph(id),frame=host.captureReturn('exact'),snapshot=plain(host.state);
    host.project('LINE');host.project('GLYPH');assert.deepEqual(plain(state),before);assert.deepEqual(host.glyph(id),initial);
    host.focus(initial.id);host.project('FOVEA');assert.equal(host.describe(initial.id).id,id);
    host.return();assert.deepEqual(plain(host.state),snapshot);assert.deepEqual(plain(state),before);
    assert.deepEqual(host.glyph(id),initial);assert.ok(!JSON.stringify(frame.state).includes('radial'));
    assert.equal(host.state.revision,0);assert.equal(host.events.length,0);
  });
}
test('LISTEN rejects stale identity for focus, expansion and invocation; RETURN cannot seek new source',()=>{
  const {host,state}=fixture('audio'),id=host.state.selection[0];host.captureReturn();state.fileMeta.hash='b'.repeat(64);state.time=30;
  assert.throws(()=>host.glyph(id),/UNRESOLVED/);assert.throws(()=>host.focus(id),/UNRESOLVED/);
  assert.throws(()=>host.invoke(id,'SEEK',{time:0}),/UNRESOLVED/);host.return();assert.equal(state.time,30);
  assert.equal(host.projectionResult('GLYPH').nodes[0].error,'UNRESOLVED');
});
test('generic fallback and failed hooks retain inspectable support without content',()=>{
  for(const glyph of [undefined,()=>null,()=>{throw Error('RAW_SENTINEL')},()=>({recipe:{authority:'COMMIT'}})]){
    const store={id:'generic',address:{selector:'#one'},value:'RAW_SENTINEL',channels:['identity','address','content']};
    const h=I.createHost({describe:()=>store,resolve:()=>store,idOf:()=>store.id,...(glyph?{glyph}:{})});h.select('generic');
    const a=h.project('GLYPH').nodes[0];assert.equal(a.glyph,null);assert.equal(a.glyphSupport.support,0);
    assert.ok(!JSON.stringify(a).includes('RAW_SENTINEL'));assert.equal(G.svg(a),G.svg(h.project('GLYPH').nodes[0]));
  }
});
test('compressed recipe rejects content-consuming typed composition; ordered stack round trips',()=>{
  const {host}=fixture('field'),recipe=host.glyph('/fixture/').representation.recipe;
  const s=L.compose(L.fromFieldRoute({id:'fixture',href:'/fixture/'}),recipe);
  assert.equal(L.equivalent(s,L.deserialize(L.serialize(s))),true);
  const content={...recipe,lensId:'needs-source',inputContract:'field-route/v0.1'};
  assert.equal(L.supportDescriptor(s,content).support,0);assert.throws(()=>L.compose(s,content),/unsupported/);
  assert.equal(L.validateDescriptor({...recipe,authority:'COMMIT'}).ok,false);
});
test('same ordered member glyphs cannot determine CUT versus DISSOLVE composition',()=>{
  const cut=appendSource(appendSource(createExperienceSet(),'a'),'b'),dissolve=setSeamLaw(cut,0,'DISSOLVE');
  const marks=s=>s.entries.map(e=>audioGlyphDescriptor({}, {hash:e.sourceId}));
  assert.deepEqual(marks(cut),marks(dissolve));assert.notEqual(cut.id,dissolve.id);
});
test('stable identity does not freeze changing derived state',()=>{
  const {host,state}=fixture('audio'),id=state.fileMeta.hash,a=host.glyph(id);
  state.map.frames[0].e=.8;state.glyph=audioGlyphDescriptor(state.map,state.fileMeta);
  const b=host.glyph(id);assert.equal(a.id,b.id);assert.deepEqual(a.representation.recipe,b.representation.recipe);assert.notDeepEqual(a.representation.descriptor,b.representation.descriptor);
});

test('audio recipe accepts existing raw/sha256 address spellings and refuses another source',()=>{
  const g=audioGlyphDescriptor({}, {hash:'a'.repeat(64)});
  assert.deepEqual(audioGlyphRepresentation(g),audioGlyphRepresentation(g,'sha256:'+g.sourceHash));
  assert.equal(audioGlyphRepresentation(g,'sha256:'+'b'.repeat(64)),null);
  assert.equal(audioGlyphRepresentation({...g,key:{raw:'RAW_SENTINEL'}}),null);
  assert.equal(audioGlyphRepresentation({...g,radial:g.radial.map(()=>NaN)}),null);
});
