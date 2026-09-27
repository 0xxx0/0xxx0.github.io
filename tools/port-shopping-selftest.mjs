#!/usr/bin/env node
import fs from 'node:fs';import {createRequire} from 'node:module';const require=createRequire(import.meta.url);const P=require('../lib/port-shopping.js');
const fail=[],need=(x,m)=>{if(!x)fail.push(m)},at='2026-09-27T08:00:00.000Z';
const obj={object_id:'portobj:x',label:'weird motor listing',media_class:'TEXT',mime:'text/plain',sha256:'abc',retention:'SESSION'};
const offer=P.makeOffer({object:obj,summary:'Maybe useful https://example.test/item/42 seller says 12V',createdAt:at});
need(P.validateOffer(offer,Date.parse(at)+1000).ok,'offer should validate');
need(offer.candidate.source_url==='https://example.test/item/42','literal URL not retained');
need(offer.candidate.exact_sku===null&&offer.candidate.seller_channel===null,'must not infer SKU/seller');
const item=P.itemFromOffer(offer,{id:'shop-x',acceptedAt:new Date(Date.parse(at)+2000).toISOString()});
need(item.state==='VERIFY'&&item.source_kind==='other','candidate status laundering');
need(item.source_ref?.port_object_id==='portobj:x','Port identity lost');
need(item.source_url==='https://example.test/item/42','Shopping source URL lost');
const routes=JSON.parse(fs.readFileSync('port/routes.json','utf8'));const r=routes.routes.find(x=>x.id==='shopping');
need(r&&r.authority==='LOCAL_CANDIDATE_ONLY','Port Shopping route missing/over-authorized');
for(const m of ['TEXT','JSON','IMAGE','FILE'])need(r.accepts?.[m]==='ADAPTER','Port Shopping '+m+' adapter missing');
const port=fs.readFileSync('port/index.html','utf8'),shop=fs.readFileSync('shopping/index.html','utf8');
need(port.includes("selected==='shopping'")&&port.includes('PortShopping.makeOffer'),'Port producer missing');
need(shop.includes('shopping.port.candidate.v01')&&shop.includes('PortShopping.itemFromOffer'),'Shopping explicit candidate consumer missing');
need(shop.includes('ADD AS VERIFY'),'Shopping explicit acceptance missing');
if(fail.length){console.error('PORT→SHOPPING FAIL · '+fail.join(' · '));process.exit(1)}
console.log('PORT→SHOPPING PASS · exact Port object → OFFER_ONLY candidate → explicit VERIFY import');
