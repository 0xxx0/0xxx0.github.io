import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as N from '../interphase/navigation.mjs';
function navSelftest(){
 const context={console,Intl,TextEncoder,TextDecoder,setTimeout,clearTimeout,HTMLElement:class{},customElements:{define(){}},navigator:{language:'en'},document:{documentElement:{lang:'en'}}};context.window=context;context.globalThis=context;
 vm.createContext(context);for(const p of ['lib/document-structure.js','field-aperture.js'])vm.runInContext(readFileSync(p,'utf8'),context,{filename:p});
 const A=context.FieldAperture;
 const model=raw=>{let json;try{JSON.parse(raw);json=A.analyze(raw,'fixture','en','AUTO')}catch{}return N.compile(raw,A.analyze(raw,'fixture','en',json?'TXT':'AUTO',true),json,json?A.jsonSpans(raw):[])};
 const raw='# Water\n\nWater flows downhill. A gate changes its route.\n\nThe gate is closed. Water collects upstream.\n\nAn observation can question an explanation. 🧭 é';
 const m=model(raw),paras=N.level(m,'PARA').units;
 assert.equal(m.raw,raw);assert.ok(m.words.length>10);
 for(const l of m.levels)for(const u of l.units){
  assert.ok(u.start>=0&&u.end<=raw.length&&u.start<u.end);
  assert.equal(N.patch(m,u,raw.slice(u.start,u.end)).raw,raw);
  const next=N.patch(m,u,'changed');
  assert.equal(next.raw,raw.slice(0,u.start)+'changed'+raw.slice(u.end));
  assert.equal(N.charIn(m,u,0),u.start);assert.equal(N.charIn(m,u,1),u.end-1);
 }
 const c=raw.indexOf('Water collects')+3,n=N.neighbors(m,c,'PARA');assert.ok(n.before&&n.after);assert.equal(N.neighbors(m,paras[0].start,'PARA').before,null);assert.equal(N.neighbors(m,paras.at(-1).start,'PARA').after,null);
 assert.ok(N.ordered(m,'PARA','water gate').length);
 const r=N.relation(m,'hash',{...paras[1],scope:'PARA'},{...paras[2],scope:'PARA'},'questions');
 assert.equal(N.validRelation(m,'hash',r),true);assert.equal(N.validRelation(m,'other',r),false);assert.equal(N.validRelation(m,'hash',{...r,from:{...r.from,quote:'invented'}}),false);
 assert.equal(N.relationDoors(m,'hash',[r],paras[1].start)[0].destination.start,paras[2].start);
 // A visible mark is a lawful source address, not a painted badge. The
 // projection and its inverse must round-trip quoted, SHA-bound human work.
 const hash='hash',mk=(id,start,kind='QUESTION')=>({
  id,revision:hash,charIndex:start,endIndex:Math.min(raw.length,start+7),
  quote:raw.slice(start,Math.min(raw.length,start+7)),kind,note:'Human-authored '+id,resolved:false
 });
 const firstMark=mk('near-a',c),nearMark=mk('near-b',c+1,'NOTE');
 const projected=N.projectWitnesses(m,hash,[firstMark,nearMark,{...firstMark,id:'forged',quote:'NOT SOURCE'}],[r]);
 assert.equal(projected.sourceLength,raw.length);
 assert.equal(projected.notes.length,2);
 assert.equal(projected.relations.length,1,'only declared and quote-verified source relations create chords');
 assert.equal(projected.residue.unboundNotes,1,'forged marks remain explicit residue');
 for(const e of projected.notes){
  const resolved=N.witnessAddress(projected,raw,hash,e.id);
  assert.equal(resolved.char,e.charIndex,'glyph → source char is exact');
  assert.equal(resolved.quote,raw.slice(e.charIndex,e.endIndex),'source → glyph → source restores exact bytes');
 }
 const p=projected.notes[0].point,hit=N.witnessAtPoint(projected,p.x,p.y,{radius:19});
 assert.ok(hit&&hit.candidates===2,'dense near-coincident notes must remain operable');
 const cycled=N.witnessAtPoint(projected,p.x,p.y,{radius:19,previousId:hit.note.id});
 assert.notEqual(cycled.note.id,hit.note.id,'repeated tap cycles through distinct real notes');
 assert.equal(N.witnessAtPoint(projected,90,90,{radius:12}),null,'empty center is not a fabricated source mark');
 assert.throws(()=>N.witnessAddress(projected,raw.slice(0,firstMark.charIndex)+'X'+raw.slice(firstMark.charIndex+1),hash,firstMark.id),/Unbound|changed/,'modified quote cannot resolve to old glyph');
 assert.throws(()=>N.witnessAddress(projected,raw,'wrong-hash',firstMark.id),/revision/);
 assert.equal(N.projectWitnesses(m,hash,[{...firstMark,revision:'old'}],[{...r,hash:'old'}]).notes.length,0);
 assert.equal(N.projectWitnesses(m,hash,[{...firstMark,revision:'old'}],[{...r,hash:'old'}]).relations.length,0);
 assert.deepEqual(projected.relations[0].from,r.from);
 assert.deepEqual(projected.relations[0].to,r.to);
 assert.equal(m.raw,raw,'projecting and choosing marks cannot mutate source');
 const attention={char:c,scope:'PARA',view:'walk',wpm:260,query:'gate'};
 assert.deepEqual(N.validateAttention(m,attention),attention);
 // The outer and inner dials have different coordinate laws, even while a
 // view switch preserves exactly one source/cursor and signed RETURN attention.
 const dial=N.dialReading(m,'PARA',c);
 assert.ok(dial.span.start<=c&&c<dial.span.end);
 assert.equal(N.dialChar(m,'PARA',c,'absolute',dial.absolute),c);
 assert.equal(N.dialChar(m,'PARA',c,'local',dial.local),c);
 assert.equal(N.dialChar(m,'PARA',c,'local',0),dial.span.start);
 assert.equal(N.dialChar(m,'PARA',c,'local',1),dial.span.end-1);
 assert.equal(N.dialChar(m,'PARA',c,'absolute',1),raw.length-1);
 // A finite source has distinct first/last characters. A closed circle aliases
 // them after ordinary pixel rounding; test both ends of the actual transform.
 const first=N.dialXY(0),last=N.dialXY(1);
 assert.ok(Math.hypot(first.x-last.x,first.y-last.y)>1,'source endpoints must not share a screen point');
 for(const fraction of [0,.01,.25,.5,.75,.99,1]){
  const p=N.dialXY(fraction);
  const inverse=N.dialFraction(Math.round(p.x*1000)/1000-90,Math.round(p.y*1000)/1000-90);
  assert.ok(Math.abs(inverse-fraction)<.00001,'rounded dial coordinates must retain both source endpoints');
 }
 assert.equal(N.dialFraction(0,-1),null,'the source seam is a gap, not an implicit wrap');
 assert.ok(Math.abs(N.dialFraction(0,1)-.5)<1e-10);
 assert.deepEqual(N.validateAttention(m,{...attention,view:'dial'}),{...attention,view:'dial'});
 assert.throws(()=>N.dialChar(m,'PARA',c,'unproved',.5),/Unknown source dial/);

 for(const bad of [{char:-1},{char:raw.length},{scope:'GUESSED'},{view:'hype'},{wpm:0},{query:'x'.repeat(201)}])assert.throws(()=>N.validateAttention(m,{...attention,...bad}));
 assert.throws(()=>model('{"x":1,"x":2}'),/ambiguous/);assert.throws(()=>model('\ud800'),/surrogate/);assert.throws(()=>model('x'.repeat(2000001)),/2 MB/);
 const jraw=' { "routes" : [ { "title": "Gate", "role": "Water holds", "open": false, "n":null, "a.b": "🧭" }, {"title":"River","role":"Flows"} ], "meta": true } ';
 const j=model(jraw),collection=N.level(j,'COLLECTION:$.routes');assert.equal(collection.units.length,2);
 const unit=collection.units[0],focus=N.focusChar(j,unit);assert.equal(j.raw.slice(focus,focus+5),'Water');
 assert.equal(N.patch(j,unit,j.raw.slice(unit.start,unit.end)).raw,jraw);
 assert.throws(()=>N.patch(j,unit,'{'));
 const replaced=N.patch(j,unit,'{"title":"Gate","open":true}');assert.equal(JSON.parse(replaced.raw).routes[0].open,true);
 let scope='COLLECTION:$.routes',span=N.at(j,focus,scope);
 for(let i=0;i<10;i++){const next=N.zoomScope(j,focus,scope,1);if(next===scope)break;const inner=N.at(j,focus,next);assert.ok(inner.start>=span.start&&inner.end<=span.end&&inner.end-inner.start<span.end-span.start);scope=next;span=inner}
 const nested=model('# A\n\nOne.\n\n## B\n\nTwo.\n\n# C\n\nThree.');const b=N.at(nested,nested.raw.indexOf('Two'),'SECTION');assert.equal(b.key,'B');
 assert.equal(N.neighbors(nested,nested.raw.indexOf('Two'),'SECTION').after.key,'C');
 console.log('SOURCE LAWS PASS · native spans · GetPut / PutGet · quoted source↔glyph inverse · dense witness cycling · typed relation coordinates · Unicode · monotone scope · finite traversal · strict RETURN');
}
navSelftest();
