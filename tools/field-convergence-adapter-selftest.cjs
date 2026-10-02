#!/usr/bin/env node
const A=require('../lib/field-convergence-adapter.js');
const fail=[],need=(x,m)=>{if(!x)fail.push(m)};
const route={href:'/thing/',title:'THING',version:'1.2',state:'ACTIVE',operation:'OPERATE',receipt:'/returns/X.json',field:{owner:'THING',exit_paths:[{class:'NEXT',status:'AVAILABLE',via:'DO',target:'/next/?return=field'},{class:'NOPE',status:'ADAPTER_REQUIRED',via:'WAIT',target:'/blocked/'}]},contract:{transforms:{preserves:['source identity']}}};
const acts=A.nativeActions(route);
need(acts.length===1,'only AVAILABLE target-bearing exits may become actions');
need(acts[0].target_href==='/next/','target href normalization failed');
const h=A.actionHandoff(route,0);
need(h.authority==='PROPOSAL_ONLY','handoff authority drift');
need(h.return_to==='/thing/','exact return lost');
need(A.validate(h).ok,'handoff validation failed');
const m=A.projectionContract(route);
need(m.authority==='VIEW_ONLY','media authority drift');
need(m.hides.includes('effect authority'),'projection does not name authority loss');
need(m.forbids.includes('treat projection as evidence'),'evidence firewall missing');
need(A.validate(m).ok,'media validation failed');
const r=A.returnEnvelope(route,{result:'PASS',delta:'one bounded change'});
need(r.authority==='EVIDENCE_ONLY'&&r.next==='NONE_UNTIL_REPLAN','return did not close authority');
need(A.validate(r).ok,'return validation failed');
let threw=false;try{A.actionHandoff({...route,field:{owner:'THING',exit_paths:[]}},0)}catch(_){threw=true}need(threw,'handoff minted action without explicit target');
if(fail.length){console.error('FIELD convergence adapter FAIL · '+fail.join(' · '));process.exit(1)}
console.log('FIELD convergence adapter PASS · same addressed route → bounded ACTION / MEDIA / RETURN packets without authority transfer');
