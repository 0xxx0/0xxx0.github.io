#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync('shopping/index.html','utf8'),fail=[];
const need=(x,m)=>{if(!x)fail.push(m)};
const inline=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).filter(x=>x.trim());
need(inline.length===1,'expected one inline Shopping runtime');
try{if(inline[0])new vm.Script(inline[0],{filename:'shopping/index.inline.js'})}catch(e){console.error(e.stack);process.exit(1)}
for(const s of ['/lib/shopping-adventure.js','/lib/shopping-looter.js','id="mergePack"','id="lootPacket"','id="lootReturn"','id="viewMode"','data-media-url','watchEnabled','compressThumb','mergeAdventureFile','importLooterReturn']){
  need(html.includes(s),'missing '+s);
}
need(html.includes("thumbnail:it.media?.thumbnail"),'agent packet omits thumbnail provenance');
need(html.includes("adventure_ids:it.adventure_ids||[]"),'agent packet omits adventure ids');
need(html.includes("watch:it.watch||null"),'agent packet omits watch config');
if(fail.length){console.error('SHOPPING VISUAL FAIL · '+fail.join(' · '));process.exit(1)}
console.log('SHOPPING VISUAL PASS · inline parse + provenance thumbnail + LOOT view + adventure merge + looter import/export');
