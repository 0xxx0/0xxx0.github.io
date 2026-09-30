#!/usr/bin/env node
import fs from 'node:fs';
const c=fs.readFileSync('shopping/index.html','utf8'),fail=[],need=(x,m)=>{if(!x)fail.push(m)};
need(c.includes('id="phaseFilter"'),'phase filter missing');
need(!c.includes('id="stateFilter"'),'legacy state filter still primary');
need(c.includes("materialPhase(it)===pf"),'phase filter does not use derived material phase');
need(c.includes("native '+esc(it.state)"),'native Shopping lifecycle residue not visible');
need(c.includes("ShoppingInterphase?.PHASES"),'phase options not sourced from ShoppingInterphase');
need(c.includes("sharedSurfacePanel(it)"),'shared object/action surface missing');
if(fail.length){console.error('SHOPPING PHASE SURFACE FAIL · '+fail.join(' · '));process.exit(1)}
console.log('SHOPPING PHASE SURFACE PASS · shared phase is primary filter; native lifecycle remains visible residue');
