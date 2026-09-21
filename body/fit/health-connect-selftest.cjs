'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'health-connect-transform.js'),'utf8');
const ctx={globalThis:{},module:{exports:{}},exports:{},Date};vm.createContext(ctx);vm.runInContext(src,ctx);
const api=ctx.module.exports;
const packet=JSON.parse(fs.readFileSync(path.join(__dirname,'health-connect-fixture.json'),'utf8'));
const out=api.transformExport(packet),props=out.observations.map(x=>x.observed_property);
const sleep=out.observations.find(x=>x.observed_property==='sleep.duration');
const hrs=out.observations.filter(x=>x.observed_property==='heart_rate');
const ok=
 out.schema==='0xxx0/body-sensor-bundle/v0.1' &&
 out.observations.length===4 &&
 props.includes('sleep.duration') && props.includes('sleep.session') &&
 hrs.length===2 && hrs.every(x=>x.source_class==='WEARABLE'&&x.result.unit==='bpm') &&
 sleep.result.value===240 && sleep.provenance.derivedness==='D3' &&
 out.source.ignored.UnknownFutureRecord===1;
console.log(JSON.stringify({ok,count:out.observations.length,props,sleepMinutes:sleep?.result?.value,ignored:out.source.ignored}));
if(!ok)process.exit(1);
