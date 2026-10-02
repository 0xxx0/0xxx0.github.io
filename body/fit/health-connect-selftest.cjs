'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'health-connect-transform.js'),'utf8');
const ctx={globalThis:{},module:{exports:{}},exports:{},Date};vm.createContext(ctx);vm.runInContext(src,ctx);
const api=ctx.module.exports;
const packet=JSON.parse(fs.readFileSync(path.join(__dirname,'health-connect-fixture.json'),'utf8'));
const out=api.transformExport(packet),props=out.observations.map(x=>x.observed_property);
const sleep=out.observations.find(x=>x.observed_property==='sleep.duration');
const hrs=out.observations.filter(x=>x.observed_property==='heart_rate');

const rfSrc=fs.readFileSync(path.join(__dirname,'route-friction.js'),'utf8');
const rfCtx={globalThis:{},module:{exports:{}},exports:{},Date};vm.createContext(rfCtx);vm.runInContext(rfSrc,rfCtx);
const rf=rfCtx.module.exports;
const fitState={
 fittings:[
  {id:'power',label:'Battery pack',lifecycle:'ACTIVE',capabilities:['power','charge'],interfaces:['USB-C']},
  {id:'boots',label:'Trail shoes',lifecycle:'FITTED',capabilities:['traction','mobility']},
  {id:'shell',label:'Rain shell',lifecycle:'ACTIVE',capabilities:['weather','waterproof']},
  {id:'old',label:'Old pack',lifecycle:'RETIRED',capabilities:['carry']}
 ],
 kits:[{id:'kit-1',fitting_ids:['power','boots','shell','old']}]
};
const friction=rf.coverage(fitState,['POWER','WEATHER','MOBILITY','INSTALL'],'kit-1');
const byId=Object.fromEntries(friction.map(x=>[x.id,x]));
const frictionOk=
 rf.PROFILE_SCHEMA==='0xxx0/body-fit-route-friction/v0.1' &&
 friction.length===4 &&
 byId.POWER.state==='COVERED' && byId.POWER.matches[0].label==='Battery pack' &&
 byId.WEATHER.state==='COVERED' && byId.MOBILITY.state==='COVERED' &&
 byId.INSTALL.state==='UNANSWERED' &&
 !friction.some(x=>x.matches.some(m=>m.id==='old'));

const ok=
 out.schema==='0xxx0/body-sensor-bundle/v0.1' &&
 out.observations.length===4 &&
 props.includes('sleep.duration') && props.includes('sleep.session') &&
 hrs.length===2 && hrs.every(x=>x.source_class==='WEARABLE'&&x.result.unit==='bpm') &&
 sleep.result.value===240 && sleep.provenance.derivedness==='D3' &&
 out.source.ignored.UnknownFutureRecord===1 && frictionOk;
console.log(JSON.stringify({ok,count:out.observations.length,props,sleepMinutes:sleep?.result?.value,ignored:out.source.ignored,routeFriction:friction}));
if(!ok)process.exit(1);
