#!/usr/bin/env node
import fs from 'node:fs';import {createRequire} from 'node:module';const require=createRequire(import.meta.url);const F=require('../lib/shopping-house-fit.js');
const fail=[],need=(x,m)=>{if(!x)fail.push(m)},at='2026-09-26T04:00:00.000Z';
const item={id:'shop-x',state:'RECEIVED'},handoff={schema:'house-shopping-fit/v0.1',source:{route:'/shopping/',object_id:'shop-x',address:'shop-x',state:'RECEIVED',evidence_signal:'REALITY',proof_boundary:'possession != adoption'},return_to:'/shopping/#shop-x'};
const offer=F.makeOffer({handoff,area:'zone-a',projection:'PLAN',candidate:{w:500,d:400,h:800},available:{w:600,d:450,h:900},status:'PASS_ENVELOPE',createdAt:at});
need(F.validateOffer(offer,item,Date.parse(at)+1000).ok,'exact offer should validate');
need(!F.validateOffer(offer,{...item,state:'TESTED'},Date.parse(at)+1000).ok,'changed Shopping state must stale return');
need(!F.validateOffer({...offer,source:{...offer.source,object_id:'shop-y'}},item,Date.parse(at)+1000).ok,'wrong item must fail');
const rec=F.receiptFrom(offer,item,new Date(Date.parse(at)+2000).toISOString());
need(rec.effect==='EVIDENCE_ONLY'&&rec.shopping_state==='RECEIVED','receipt may not promote lifecycle');
need(rec.source_evidence_signal==='REALITY','source signal lost');
need(rec.fit_status==='PASS_ENVELOPE'&&rec.house_address==='zone-a','fit witness lost');
const shop=fs.readFileSync('shopping/index.html','utf8'),house=fs.readFileSync('house/index.html','utf8');
need(shop.includes('/lib/shopping-house-fit.js')&&shop.includes('shopping-house-fit-receipt/v0.1'),'Shopping consumer/receipt missing');
need(house.includes('/lib/shopping-house-fit.js')&&house.includes('ShoppingHouseFit.makeOffer'),'HOUSE producer missing');
need(house.includes('fieldSignalBar')&&house.includes('proof_boundary'),'HOUSE source signal projection missing');
if(fail.length){console.error('SHOPPING↔HOUSE FIT FAIL · '+fail.join(' · '));process.exit(1)}
console.log('SHOPPING↔HOUSE FIT PASS · exact item → dimensional offer → explicit evidence receipt · lifecycle unchanged');
