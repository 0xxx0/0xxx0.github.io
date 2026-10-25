import assert from 'node:assert/strict';
import {RECIPES,generateGlyph} from './core.mjs';

const glyphs=Object.keys(RECIPES);
assert.equal(glyphs.length,12);

const global=new Map;
for(const g of glyphs){
  const uniq=new Set;
  for(let seed=1;seed<=64;seed++){
    const a=generateGlyph(g,{seed,density:.65,bendCost:1.2,amplitude:1});
    const b=generateGlyph(g,{seed,density:.65,bendCost:1.2,amplitude:1});
    assert.equal(a.signature,b.signature,`${g} nondeterministic @ ${seed}`);
    assert.equal(a.check.ok,true,`${g} invalid @ ${seed}: ${a.check.errors}`);
    uniq.add(a.signature);
    if(global.has(a.signature)&&global.get(a.signature)!==g){
      throw new Error(`cross-glyph collision ${g}/${global.get(a.signature)} @ seed ${seed}`);
    }
    global.set(a.signature,g);
  }
  assert.ok(uniq.size>=3,`${g} insufficient diversity ${uniq.size}`);
}

console.log(`LAB/TYPE SELFTEST PASS · ${glyphs.length} glyphs · ${global.size} unique variants · no cross-glyph exact collisions`);

// Balanced exposure, reproducible order and refusal of incomplete/fake evidence.
const {trial,score}=await import('./recognition.mjs');
const items=trial(7);
assert.deepEqual(items,trial(7));assert.notDeepEqual(items,trial(8));
assert.equal(items.length,36);
for(const glyph of glyphs)assert.equal(items.filter(x=>x.glyph===glyph).length,3);
const answers=items.map(x=>({response:x.glyph,ms:100}));
assert.equal(score(items,answers).decision,'CANDIDATE_FOR_OUTLINES');
assert.throws(()=>score(items,answers.slice(1)),/Complete/);
assert.throws(()=>score(items,answers.map(()=>({response:'X',ms:100}))),/Invalid/);
assert.throws(()=>score(items,answers.map(x=>({...x,ms:NaN}))),/Invalid/);
const confused=answers.map(x=>({...x}));
items.forEach((x,i)=>{if(x.glyph==='O'&&x.profile==='variant')confused[i].response='0'});
assert.equal(score(items,confused).decision,'STOP_OR_REDUCE');
assert.deepEqual(score(items,confused).repeated,['O→0']);
console.log('LAB/TYPE RECOGNITION LAWS PASS · 36 balanced trials · repeated confusables stop · incomplete evidence refused');
