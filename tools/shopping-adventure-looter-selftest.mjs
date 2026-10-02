#!/usr/bin/env node
import {createRequire} from 'node:module';const require=createRequire(import.meta.url);
const A=require('../lib/shopping-adventure.js'),L=require('../lib/shopping-looter.js');
const fail=[],need=(x,m)=>{if(!x)fail.push(m)};
const state={schema:'field-shopping-state/v0.1',items:[{id:'a',label:'existing',state:'VERIFY',notes:'keep me'}]};
const merged=A.merge(state,{schema:'shopping-adventure-pack/v0.1',adventure:{id:'raid-1',label:'raid'},items:[{id:'a',label:'incoming',state:'WATCH',source_url:'https://x'},{id:'b',label:'new',state:'WATCH'}]});
need(merged.added===1&&merged.matched===1,'adventure counts');
need(merged.state.items.find(x=>x.id==='a').label==='existing','merge overwrote local truth');
need(merged.state.items.find(x=>x.id==='a').source_url==='https://x','merge did not fill missing evidence');
need(merged.state.items.every(x=>x.adventure_ids?.includes('raid-1')),'adventure provenance lost');
const item={id:'b',label:'new',state:'WATCH',source_url:'https://shop/item',offer:{target_landed_sgd:20},watch:{enabled:true,cadence_hours:24,last_checked_at:'2026-10-01T00:00:00Z'}};
need(L.due(item,'2026-10-02T12:00:00Z'),'due false');
const p=L.makePacket([item],'2026-10-02T12:00:00Z');need(p.jobs.length===1&&p.authority===L.AUTHORITY,'packet');
const ret={schema:L.RETURN_SCHEMA,authority:L.AUTHORITY,results:[{item_id:'b',source_state:'WATCH',source_url:'https://shop/item',checked_at:'2026-10-02T12:01:00Z',availability:'IN_STOCK',landed_sgd:18.5,item_sgd:16,thumbnail_url:'https://img/item.jpg'}]};
const applied=L.applyReturn([item],ret);
need(applied.ok&&applied.accepted[0]==='b','return apply');
const after=applied.items[0];
need(after.state==='WATCH','looter mutated lifecycle');
need(after.offer_history.length===1&&after.offer_history[0].landed_sgd===18.5,'market tape missing');
need(after.media.thumbnail.src==='https://img/item.jpg','thumbnail evidence missing');
need(after.watch.next_due_at,'next due missing');
const bad={...ret,results:[{...ret.results[0],source_state:'BOUGHT'}]};
need(!L.applyReturn([item],bad).ok,'stale lifecycle return accepted');
if(fail.length){console.error('SHOPPING ADVENTURE/LOOTER FAIL · '+fail.join(' · '));process.exit(1)}
console.log('SHOPPING ADVENTURE/LOOTER PASS · additive raid merge + due watch packet + evidence-only market return + thumbnail provenance');
