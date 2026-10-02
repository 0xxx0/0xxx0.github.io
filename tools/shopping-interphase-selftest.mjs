#!/usr/bin/env node
import {createRequire} from 'node:module';const require=createRequire(import.meta.url);
const I=require('../lib/interphase-carrier.js'),S=require('../lib/shopping-interphase.js');
const fail=[],need=(x,m)=>{if(!x)fail.push(m)};
const base={id:'shop-x',label:'Thing',state:'VERIFY',gate:{duplicate_checked:true,two_project_or_safety:true,storage_home:true,test_72h:true,interface_fit:true,seller_verified:true},source_url:'https://example.invalid/item',lane:'CAPABILITY'};
need(S.phaseOf({...base,state:'NEED'})==='NEED','NEED phase');
need(S.phaseOf(base)==='READY','gate-complete VERIFY should derive READY');
need(S.phaseOf({...base,state:'BOUGHT'})==='INBOUND','BOUGHT → INBOUND');
need(S.phaseOf({...base,state:'RECEIVED'})==='ON_HAND','RECEIVED → ON_HAND');
need(S.phaseOf({...base,state:'TESTED'})==='ON_HAND','TESTED remains ON_HAND evidence');
need(S.phaseOf({...base,state:'ADOPTED'})==='ADOPTED','ADOPTED phase');
need(S.phaseOf({...base,state:'RETURNED'})==='CLOSED','RETURNED → CLOSED');
const c=S.carrierFor(base,{evidence:{boundary:'candidate evidence'}},I),a=I.actionSurface(c);
need(c.object.id==='shop-x'&&c.object.owner==='SHOPPING','exact Shopping object lost');
need(c.focus.address==='/shopping/#shop-x'&&c.return.address==='/shopping/#shop-x','exact RETURN lost');
need(c.meta.phase==='READY'&&c.meta.sourceState==='VERIFY','derived phase/native state split lost');
need(c.next.length<=3&&c.next.every(x=>x.dispatch==='HOST_NATIVE_ONLY'),'move bound/dispatch broken');
need(a.hold.action==='HOLD'&&a.return.action==='RETURN','shared action surface broken');
need(S.transitionModel({...base,state:'RECEIVED'}).some(x=>x.id==='PROVE'&&x.to==='ADOPTED'),'ON_HAND proof transition missing');
const watchMoves=S.nativeMoves({...base,state:'WATCH',watch:{enabled:true}});need(watchMoves.some(x=>x.id==='LOOTER'),'watch-enabled candidate missing LOOTER move');need(watchMoves.length<=3,'watch moves exceed 3');
if(fail.length){console.error('SHOPPING INTERPHASE FAIL · '+fail.join(' · '));process.exit(1)}
console.log('SHOPPING INTERPHASE PASS · exact item → derived material phase → <=3 native moves → TRACE/RETURN · native lifecycle retained as residue');