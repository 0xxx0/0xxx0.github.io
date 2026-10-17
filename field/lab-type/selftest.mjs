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
