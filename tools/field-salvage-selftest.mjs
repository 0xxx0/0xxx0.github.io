#!/usr/bin/env node
import assert from 'node:assert/strict';
import { auditSalvage, SALVAGE_CLASSES } from '../lib/field-salvage-core.mjs';

const manifest={routes:[
 {href:'/',title:'FIELD'},
 {href:'/live/',title:'LIVE',state:'ACTIVE',kind:'system'},
 {href:'/donor/',title:'DONOR',state:'FROZEN_DONOR',kind:'donor'},
 {href:'/alias/',title:'ALIAS',state:'UTILITY',kind:'alias',operation:'REDIRECT',alias_of:'/live/'},
 {href:'/old/',title:'OLD',state:'SUPERSEDED',kind:'artifact'},
 {href:'/blocked/',title:'BLOCKED',state:'DEPRECATED',kind:'artifact'},
 {href:'/lab/',title:'LAB',state:'PARKED',kind:'experiment'}
]};
const current={current_heads:[{route:'/live/'}],active_fronts:[]};
const refs=[{href:'/blocked/',path:'index.html',class:'runtime'}];
const {rows}=auditSalvage(manifest,current,refs), by=Object.fromEntries(rows.map(r=>[r.href,r]));
assert.equal(by['/live/'].classification,SALVAGE_CLASSES.KEEP_CURRENT);
assert.equal(by['/donor/'].classification,SALVAGE_CLASSES.KEEP_DONOR);
assert.equal(by['/alias/'].classification,SALVAGE_CLASSES.KEEP_COMPAT);
assert.equal(by['/old/'].classification,SALVAGE_CLASSES.RETIRE_CANDIDATE);
assert.equal(by['/blocked/'].classification,SALVAGE_CLASSES.BLOCKED);
assert.ok(by['/blocked/'].blockers.includes('RUNTIME_OR_TOOLING_REFERENCES'));
assert.equal(by['/lab/'].classification,SALVAGE_CLASSES.SALVAGE_REVIEW);
for(const r of rows) assert.equal(r.conditions.may_auto_delete,false);
console.log('FIELD SALVAGE SELFTEST PASS · 7 classifications · auto-delete false');
