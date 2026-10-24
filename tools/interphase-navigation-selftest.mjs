import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as N from '../interphase/navigation.mjs';
function navSelftest(){
 const context={console,Intl,TextEncoder,TextDecoder,setTimeout,clearTimeout,HTMLElement:class{},customElements:{define(){}},navigator:{language:'en'},document:{documentElement:{lang:'en'}}};context.window=context;context.globalThis=context;
 vm.createContext(context);for(const p of ['lib/document-structure.js','field-aperture.js'])vm.runInContext(readFileSync(p,'utf8'),context,{filename:p});
 const A=context.FieldAperture;
 const model=raw=>{let json;try{JSON.parse(raw);json=A.analyze(raw,'fixture','en','AUTO')}catch{}return N.compile(raw,A.analyze(raw,'fixture','en','TXT',true),json,json?A.jsonSpans(raw):[])};
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
 const c=raw.indexOf('gate changes')+3,n=N.neighbors(m,c,'PARA');assert.ok(n.before&&n.after);assert.equal(N.neighbors(m,paras[0].start,'PARA').before,null);assert.equal(N.neighbors(m,paras.at(-1).start,'PARA').after,null);
 assert.ok(N.ordered(m,'PARA','water gate').length);
 const r=N.relation(m,'hash',{...paras[1],scope:'PARA'},{...paras[2],scope:'PARA'},'questions');
 assert.equal(N.validRelation(m,'hash',r),true);assert.equal(N.validRelation(m,'other',r),false);assert.equal(N.validRelation(m,'hash',{...r,from:{...r.from,quote:'invented'}}),false);
 assert.equal(N.relationDoors(m,'hash',[r],paras[1].start)[0].destination.start,paras[2].start);
 const attention={char:c,scope:'PARA',view:'walk',wpm:260,query:'gate'};
 assert.deepEqual(N.validateAttention(m,attention),attention);
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
 console.log('SOURCE LAWS PASS · native spans · GetPut / PutGet · Unicode · monotone scope · quoted relations · finite traversal · strict RETURN');
}
navSelftest();
