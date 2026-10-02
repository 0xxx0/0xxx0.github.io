#!/usr/bin/env node
const fs=require('node:fs');
const A=require('../lib/field-convergence-adapter.js');
const fail=[],need=(x,m)=>{if(!x)fail.push(m)};
const manifest=JSON.parse(fs.readFileSync('showcase-manifest.json','utf8'));
const route=(manifest.routes||[]).find(r=>r.href==='/prison-age/');
need(!!route,'PRISON AGE real fixture missing from manifest');
if(route){
  const acts=A.nativeActions(route);
  need(acts.map(x=>x.label).join('|')==='READ|RIDE|SOURCE','PRISON AGE native action identity/order drifted');
  need(acts.every(x=>x.target.includes('return=field')),'PRISON AGE exact FIELD return missing from native exits');
  const ride=acts.find(x=>x.label==='RIDE');
  const h=A.actionHandoff(route,ride);
  need(h.authority==='PROPOSAL_ONLY','handoff authority drift');
  need(h.source.href==='/prison-age/'&&h.source.owner==='PRISON AGE','handoff lost canonical source identity/owner');
  need(h.action.label==='RIDE'&&h.action.target.includes('intent=ride'),'RIDE handoff target drifted');
  need(h.return_to==='/prison-age/','exact source return lost');
  need(A.validate(h).ok,'handoff validation failed');
  const m=A.projectionContract(route,{task:'represent the same PRISON AGE source-set without changing source or effect authority'});
  need(m.authority==='VIEW_ONLY','media authority drift');
  need(m.source.href===h.source.href,'ACTION and MEDIA no longer project the same object');
  need(m.hides.includes('effect authority'),'projection does not name authority loss');
  need(m.forbids.includes('treat projection as evidence'),'evidence firewall missing');
  need(m.residue.native_exits.map(x=>x.label).join('|')==='READ|RIDE|SOURCE','media residue lost native exits');
  need(A.validate(m).ok,'media validation failed');
  const r=A.returnEnvelope(route,{result:'PASS',delta:'ACTION and MEDIA derived from one real manifest object without authority transfer'});
  need(r.authority==='EVIDENCE_ONLY'&&r.next==='NONE_UNTIL_REPLAN','return did not close authority');
  need(r.source.href===h.source.href,'RETURN changed object identity');
  need(A.validate(r).ok,'return validation failed');
}
const synthetic={href:'/thing/',field:{owner:'THING',exit_paths:[{class:'NOPE',status:'ADAPTER_REQUIRED',via:'WAIT',target:'/blocked/'}]}};
need(A.nativeActions(synthetic).length===0,'non-AVAILABLE exit leaked into actions');
let threw=false;try{A.actionHandoff(synthetic,0)}catch(_){threw=true}need(threw,'handoff minted action without explicit AVAILABLE target');
if(fail.length){console.error('FIELD convergence adapter FAIL · '+fail.join(' · '));process.exit(1)}
console.log('FIELD convergence adapter PASS · PRISON AGE READ/RIDE/SOURCE → same-object ACTION / MEDIA / RETURN without authority transfer');
