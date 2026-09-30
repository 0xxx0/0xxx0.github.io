#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {assessDonor} from './research-donor-gate.mjs';
const require=createRequire(import.meta.url);
const T=require('../lib/shopping-market-tape.js');

const item={
  id:'shop-x',state:'WATCH',exact_sku:'SKU-1',seller_channel:'seller-A',source_url:'https://example.invalid/x',
  cost:{item:20,discount:2,intl_freight:4,local_freight:1,gst:2,quantity:1},
  offer:{availability:'IN_STOCK',variant:'rev-B',target_landed_sgd:25,return_policy:'7 days',warranty:'1 year'},
  offer_history:[]
};
assert.equal(T.landed(item),25);
const first=T.snapshot(item,'2026-09-30T00:00:00Z');
assert.equal(first.landed_sgd,25);
assert.equal(first.exact_sku,'SKU-1');
assert.equal(first.seller_channel,'seller-A');
assert.equal(first.availability,'IN_STOCK');
assert.equal(item.state,'WATCH','snapshot must not mutate lifecycle');

item.offer_history=T.appendHistory(item,'2026-09-30T00:00:00Z',12);
item.cost.item=18;
for(let i=1;i<=14;i++)item.offer_history=T.appendHistory(item,'2026-09-30T00:'+String(i).padStart(2,'0')+':00Z',12);
assert.equal(item.offer_history.length,12,'market tape must remain bounded');
const s=T.summary(item);
assert.equal(s.target_hit,true);
assert.ok(s.min_landed_sgd<=s.max_landed_sgd);
assert.equal(item.state,'WATCH','market history must not promote lifecycle');

const donor=JSON.parse(fs.readFileSync(new URL('../control/research/SHOPPING_MARKET_DONOR_2026-09-30.json',import.meta.url),'utf8'));
const admission=assessDonor(donor);
assert.equal(admission.allowed,true,'completed donor packet should be eligible for bounded transfer');
assert.equal(admission.max_disposition,'TRANSFER');

console.log('SHOPPING MARKET TAPE PASS · exact offer → bounded temporal evidence → target witness · lifecycle/authority unchanged');
