// AXIAL identity and syntax gate: node foundry/axial/binding-selftest.mjs
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const c={};c.window=c;c.globalThis=c;c.ConstraintSurfaceCore={support:()=>0};
vm.runInNewContext(readFileSync(new URL('./focus-core.js',import.meta.url),'utf8'),c);
const {resolveIndex,resolveBinding}=c.AxialFocusCore;
assert.equal(resolveIndex(['ANY','FOLD','RETURN'],{value:'RETURN',index:1}),2,'value identity outranks stale index');
assert.equal(resolveIndex(['ANY','RETURN'],{value:'FOLD',index:1}),0,'vanished value must not silently select unrelated item');
assert.equal(resolveIndex(['ANY','FOLD'],{index:1}),1,'legacy index remains readable');
assert.equal(resolveIndex(['ANY','FOLD'],{value:'ANY'}),0);
assert.equal(resolveBinding([{key:'family'},{key:'kind'}],'kind'),1);
assert.equal(resolveBinding([{key:'family'}],'vanished'),0);
const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).filter(Boolean);
assert.equal(scripts.length,1,'single native source script, no alternate app');
new vm.Script(scripts[0],{filename:'foundry/axial/index.inline.js'});
for(const marker of ['id="bindAxes"','id="bindPrev"','id="bindNext"','active_ring','AxialFocusCore.resolveIndex','axial.binding.','createReturn:createReturn','turn:turnBound'])
 assert.ok(html.includes(marker),'missing native seam: '+marker);
console.log('PASS AXIAL binding: syntax, stable identity, legacy, missing values, native seam');
