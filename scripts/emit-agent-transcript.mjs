#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {reducePacket,EGRESS_CLASSES,EGRESS_PRECEDENCE} from '../lib/field-egress-reducer.mjs';

const INPUTS={
  current:'control/CURRENT.json',
  manifest:'showcase-manifest.json',
  waiting:'control/WAITING.json',
  contract:'control/FIELD_INDEX_CONTRACT.json'
};
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const clone=v=>JSON.parse(JSON.stringify(v));
const stable=v=>Array.isArray(v)?v.map(stable):(v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v);
const fnv64=text=>{let h=0xcbf29ce484222325n;for(let i=0;i<text.length;i++){h^=BigInt(text.charCodeAt(i));h=BigInt.asUintN(64,h*0x100000001b3n)}return h.toString(16).padStart(16,'0')};
const fp=v=>fnv64(JSON.stringify(stable(v)));
const one=s=>String(s??'').replace(/\s+/g,' ').trim();
const clip=(s,n=220)=>{s=one(s);return s.length>n?s.slice(0,n-1)+'…':s};
const depKind=state=>{const s=String(state||'').toUpperCase();if(s.includes('REAL_DEVICE'))return'REAL_DEVICE';if(s.includes('PRIVATE'))return'PRIVATE_INPUT';if(s.includes('ORDINARY_USE')||s.includes('HUMAN_USE'))return'ORDINARY_USE';if(s.includes('PHYSICAL'))return'PHYSICAL';if(s.includes('WORLD'))return'WORLD_EVENT';return'HUMAN_ACTION'};

const CONTRIBUTION_CLASSES=['DELTA','EVIDENCE','DONOR','RETURN','UNRESOLVED'];
const CONVERGENCE_DISPOSITIONS=['MERGE','REPAIR','HOLD','DROP'];

function reduceContribution(candidate={}){
  const id=one(candidate.id||candidate.contribution_id||candidate.pr||'candidate');
  const host=one(candidate.host||candidate.owner||'');
  const ci=String(candidate.ci||candidate.ci_state||'UNKNOWN').toUpperCase();
  const evidence=String(candidate.evidence||candidate.evidence_state||'').toUpperCase();
  const donorGate=String(candidate.donor_gate||candidate.donor_admission||'').toUpperCase();
  const externalDonor=candidate.external_donor===true||!!donorGate;
  const donorGatePass=candidate.donor_gate_pass===true||['PASS','PASSED','ELIGIBLE','TRANSFER','PROMOTE'].includes(donorGate);
  const donorBlocked=externalDonor&&!donorGatePass;
  const exactHead=candidate.exact_head===true;
  const baseCurrent=candidate.base_current===true;
  const mergeable=candidate.mergeable===true;
  const superseded=candidate.superseded===true;
  const duplicate=candidate.duplicate===true;
  const uniqueResidue=candidate.unique_residue===true;
  const returnObserved=candidate.return_observed===true;
  const boundedProof=candidate.bounded_claim_proved===true||candidate.bounded_claim_falsified===true;
  const executable=!!(candidate.capability_delta||candidate.duplicate_removed||candidate.law_executable||boundedProof);
  const documentary=candidate.documentary_only===true||evidence.includes('DOCUMENT')||evidence.includes('ARCHITECT');
  const authorityConflict=candidate.authority_conflict===true;
  const ciPass=['PASS','PASSED','SUCCESS','GREEN'].includes(ci);
  const ciFail=['FAIL','FAILED','ERROR','RED'].includes(ci);

  let contributionClass='DONOR';
  if(!host)contributionClass='UNRESOLVED';
  else if(donorBlocked)contributionClass='DONOR';
  else if(returnObserved)contributionClass='RETURN';
  else if(boundedProof&&!candidate.capability_delta&&!candidate.duplicate_removed&&!candidate.law_executable)contributionClass='EVIDENCE';
  else if(executable)contributionClass='DELTA';

  let disposition='HOLD',reason='insufficient exact evidence for canonical promotion';
  if(superseded||(duplicate&&!uniqueResidue)){
    disposition='DROP';reason=superseded?'superseded by an owning successor':'duplicate representation with no unique residue';
  }else if(contributionClass==='UNRESOLVED'){
    disposition='HOLD';reason='no explicit host/owner';
  }else if(donorBlocked){
    disposition='HOLD';reason='external donor admission is not attested PASS';
  }else if(documentary&&!executable&&!returnObserved){
    disposition='HOLD';reason='documentary/donor value only; no proved capability or observed return';
  }else if(authorityConflict||!exactHead||!baseCurrent||!mergeable||ciFail){
    disposition='REPAIR';
    reason=authorityConflict?'authority conflict':!exactHead?'candidate is not attested against exact current head':!baseCurrent?'candidate base is not attested current':!mergeable?'candidate is not mergeable':'verification is failing';
  }else if(['DELTA','EVIDENCE','RETURN'].includes(contributionClass)&&ciPass){
    disposition='MERGE';reason='owned bounded contribution with exact-head, mergeability and verification evidence';
  }else if(!ciPass){
    disposition='HOLD';reason='verification not attested PASS';
  }

  const next={
    MERGE:'merge the exact attested head, then re-read CURRENT',
    REPAIR:'repair only the named failing gate; do not widen scope',
    HOLD:'park as residue/donor without occupying CURRENT; reopen only on named evidence',
    DROP:'preserve any named unique residue at its owner/successor, then close the duplicate'
  }[disposition];

  return{
    schema:'field-convergence-reducer/v0.1',
    authority:'NONE',
    id,host:host||null,
    contribution_class:contributionClass,
    disposition,
    reason,
    next,
    attested:{ci,exact_head:exactHead,base_current:baseCurrent,mergeable,evidence:evidence||null,donor_gate:externalDonor?(donorGate||'MISSING'):null},
    law:'Candidate facts are caller-attested. External-donor eligibility must arrive from the research donor gate; missing/non-PASS admission cannot promote. The reducer classifies; it does not query GitHub, mint CURRENT/NOW authority, merge, close, or delete anything.'
  };
}



const cliValues=flag=>{
  const out=[];
  for(let i=2;i<process.argv.length-1;i++)if(process.argv[i]===flag&&!process.argv[i+1].startsWith('--'))out.push(process.argv[i+1]);
  return out;
};
const packetId=p=>String(p?.packet_id||p?.id||p?.task_id||p?.return_id||p?.object?.id||p?.OBJECT?.id||p?.subject||'packet');

function walkJson(target){
  const st=fs.statSync(target);
  if(st.isDirectory())return fs.readdirSync(target,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(d=>walkJson(path.join(target,d.name)));
  return target.endsWith('.json')?[target]:[];
}

function reduceBatch(target,{nowIds=new Set(),selectedIds=new Set(),reactivatedIds=new Set()}={}){
  const files=[...new Set(walkJson(target))].sort(),items=[];
  for(const file of files){
    const raw=read(file),packets=Array.isArray(raw)?raw:[raw];
    packets.forEach((packet,index)=>{
      const id=packetId(packet);
      const reduced=reducePacket(packet,{now:nowIds.has(id),selected:selectedIds.has(id),reactivated:reactivatedIds.has(id)});
      items.push({...reduced,file,index});
    });
  }
  const counts=Object.fromEntries(EGRESS_CLASSES.map(k=>[k,0]));
  for(const item of items)counts[item.class]=(counts[item.class]||0)+1;
  return{schema:'field-egress-sweep/v0.1',authority:'NONE',file_count:files.length,packet_count:items.length,counts,items,law:'Batching is a read-only view over source packets. No packet self-authorizes NOW; per-packet NOW/selection/reactivation context must be supplied by the caller.'};
}

function load(){
  return {C:read(INPUTS.current),M:read(INPUTS.manifest),W:read(INPUTS.waiting),K:read(INPUTS.contract)};
}

function compile({C,M,W,K}){
  const routes=M.routes||M.entries||[];
  const heads=(C.current_heads||[]).map(h=>({
    lineage:h.lineage||null,route:h.route||null,head:h.head||null,state:h.state||null,
    next_executable:h.next_executable||null
  }));
  const waitCounts={};
  for(const x of W.items||[]){
    const k=String(x.surface_state||'UNCLASSIFIED').toUpperCase();
    waitCounts[k]=(waitCounts[k]||0)+1;
  }
  const expressions={
    current:{updated:C.updated||null,active_fronts:C.active_fronts||[],next_single_action:C.next_single_action||null,current_heads:heads},
    manifest:{route_addresses:routes.map(r=>r.href).filter(Boolean).sort()},
    waiting:{surface_state_counts:waitCounts},
    contract:{truth_grammar:K.truth_grammar||{}}
  };
  const selected=[
    {source:'/'+INPUTS.current,selector:'#updated+active_fronts+next_single_action+current_heads',fingerprint:fp(expressions.current)},
    {source:'/'+INPUTS.manifest,selector:'#route-address-set',fingerprint:fp(expressions.manifest)},
    {source:'/'+INPUTS.waiting,selector:'#surface-state-counts',fingerprint:fp(expressions.waiting)},
    {source:'/'+INPUTS.contract,selector:'#truth_grammar',fingerprint:fp(expressions.contract)}
  ];
  const revision='FIELD@'+selected.map(x=>x.fingerprint.slice(0,12)).join('.');
  const gates=(C.current_heads||[]).flatMap(h=>{
    const n=h.next_executable,state=String(n?.state||'');
    if(!n||!/HUMAN|ORDINARY_USE|REAL_DEVICE|PRIVATE|PHYSICAL|WAIT/.test(state))return[];
    const detail=n.human_questions||n.acceptance||[];
    return [{
      id:n.id||h.lineage||h.route,route:h.route||null,state,dependency_kind:depKind(state),
      objective:n.objective||detail[0]||'Return one observed delta.',first_evidence:detail[0]||null
    }];
  });
  const egress=[];
  for(const f of C.active_fronts||[])egress.push(reducePacket({packet_id:'front:'+(f.id||'unnamed'),state:f.state,sources:['/control/CURRENT.json#active_fronts']},{now:true}));
  for(const g of gates)egress.push(reducePacket({packet_id:'gate:'+(g.id||g.route||'unnamed'),state:g.state,waiting:[g],sources:['/control/CURRENT.json#current_heads.next_executable']}));
  if(C.next_single_action)egress.push(reducePacket({packet_id:'next:'+(C.next_single_action.id||'single'),one_next:C.next_single_action,sources:['/control/CURRENT.json#next_single_action']}));
  if(Object.keys(waitCounts).length)egress.push(reducePacket({packet_id:'residue:waiting-registry',residue:waitCounts,sources:['/control/WAITING.json#surface_state_counts']}));
  return {
    schema:'field-agent-transcript/v0.2-jit',
    packet_authority:'NONE',
    phi:{host:'0xxx0/0xxx0.github.io',authority_sources:Object.values(INPUTS).map(x=>'/'+x),expression_revision:revision,selected_expressions:selected},
    phi_focus:null,
    now:{updated:C.updated||null,active_fronts:C.active_fronts||[],next_single_action:C.next_single_action||null},
    heads,human_world_gates:gates,
    egress:{schema:'field-packet-egress/v0.1',classes:EGRESS_CLASSES,precedence:EGRESS_PRECEDENCE,items:egress,law:'Packet egress is derived, never packet-authorized: GATE → NOW → RESIDUE → NEXT → DELTA → ARCHIVE; only caller-supplied CURRENT/selection context can create NOW; DELTA requires host-attested sufficient evidence; unwitnessed material change remains RESIDUE; uppercase compatibility aliases and inert RETURN-to-CURRENT/replan semantics are preserved; historical/superseded packets archive unless explicitly reactivated.'},
    residue:{waiting_registry_surface_counts:waitCounts,note:'Registry residue is not promoted into NOW merely because it exists.'},
    truth_grammar:K.truth_grammar||{},
    return:{target:'/',law:'RETURN restores re-entry/context; REWIND navigates transcript/history context; REVERT is a new authorized canonical operation.'},
    laws:[
      'RECOVER BEFORE INVENTING.',
      'This packet is a transient selective expression, not a canonical store.',
      'Unrelated host-field changes do not invalidate the packet; changes to selected expressions do.',
      'Live φ focus is intentionally absent and must be re-addressed by the consumer.',
      'Information transfer does not transfer mutation authority.',
      'Return concrete mutations and verification receipts to FIELD.'
    ]
  };
}

function markdown(p){
  const out=['# FIELD AGENT TRANSCRIPT','revision: '+p.phi.expression_revision,'packet_authority: NONE','φ_focus: NOT_SERIALIZED',''];
  out.push('## SOURCE EXPRESSIONS');
  for(const x of p.phi.selected_expressions)out.push('- '+x.source+x.selector+' · expr-fnv64 '+x.fingerprint);
  out.push('','## NOW');
  for(const f of p.now.active_fronts)out.push('- '+(f.id||'front')+' ['+(f.state||'UNKNOWN')+'] — '+clip(f.objective||f.center||''));
  out.push('','## NEXT');
  const n=p.now.next_single_action||{};out.push('- '+(n.id||'—')+' — '+clip(n.instruction||''));
  out.push('','## HEADS');
  for(const h of p.heads)out.push('- '+(h.route||'—')+' · '+(h.state||'—')+' · '+clip(h.head||h.lineage||'',160));
  out.push('','## HUMAN / WORLD GATES');
  if(!p.human_world_gates.length)out.push('- CLEAR');
  for(const g of p.human_world_gates)out.push('- '+(g.route||'—')+' · '+g.dependency_kind+' · '+clip(g.objective));
  out.push('','## EGRESS');
  for(const x of p.egress.items)out.push('- '+x.class+' · '+x.packet_id+' · '+x.reason);
  out.push('','## RESIDUE','- WAITING registry counts: '+JSON.stringify(p.residue.waiting_registry_surface_counts),'','## RETURN','- '+p.return.law,'');
  return out.join('\n')+'\n';
}

const convergeAt=process.argv.indexOf('--converge');
const reduceAt=process.argv.indexOf('--reduce');
if(convergeAt>=0){
  const path=process.argv[convergeAt+1];
  if(!path){console.error('FIELD converge requires a JSON candidate path');process.exit(2)}
  process.stdout.write(JSON.stringify(reduceContribution(read(path)),null,2)+'\n');
}else if(reduceAt>=0){
  const target=process.argv[reduceAt+1];
  if(!target){console.error('FIELD reduce requires a JSON packet path or directory');process.exit(2)}
  if(fs.statSync(target).isDirectory()){
    const batch=reduceBatch(target,{
      nowIds:new Set(cliValues('--now-id')),
      selectedIds:new Set(cliValues('--selected-id')),
      reactivatedIds:new Set(cliValues('--reactivate-id'))
    });
    process.stdout.write(JSON.stringify(batch,null,2)+'\n');
  }else{
    const packet=read(target);
    const context={now:process.argv.includes('--now'),selected:process.argv.includes('--selected'),reactivated:process.argv.includes('--reactivate')};
    process.stdout.write(JSON.stringify(reducePacket(packet,context),null,2)+'\n');
  }
}else{
const sources=load(),packet=compile(sources);
if(process.argv.includes('--selftest')){
  const fail=[];
  const again=compile(sources);
  if(packet.packet_authority!=='NONE')fail.push('packet acquired authority');
  if(packet.phi_focus!==null)fail.push('live φ focus serialized');
  if(packet.phi.expression_revision!==again.phi.expression_revision)fail.push('same selected expressions are nondeterministic');
  if(packet.phi.selected_expressions.length!==4)fail.push('selected expression count != 4');
  if((packet.now.active_fronts||[]).length>3)fail.push('CURRENT active-front law > 3');
  if(!packet.return?.target)fail.push('RETURN target missing');
  if((packet.egress?.items||[]).some(x=>!EGRESS_CLASSES.includes(x.class)))fail.push('invalid egress class');
  if(JSON.stringify(packet.egress?.precedence)!==JSON.stringify(EGRESS_PRECEDENCE))fail.push('egress precedence drift');
  if((packet.egress?.items||[]).filter(x=>x.packet_id.startsWith('front:')).some(x=>x.class!=='NOW'))fail.push('active front did not reduce to NOW');
  if((packet.egress?.items||[]).filter(x=>x.packet_id.startsWith('gate:')).some(x=>x.class!=='GATE'))fail.push('human/world gate did not reduce to GATE');

  const convergenceFixtures=[
    [{id:'pr-660',host:'FIELD',capability_delta:true,ci:'PASS',exact_head:true,base_current:true,mergeable:false},'DELTA','REPAIR'],
    [{id:'pr-661',host:'CONFLUENCE',documentary_only:true,evidence:'DOCUMENTARY',ci:'PASS',exact_head:true,base_current:true,mergeable:true},'DONOR','HOLD'],
    [{id:'pr-662',host:'convergence-validate',capability_delta:true,ci:'PASS',exact_head:true,base_current:true,mergeable:true},'DELTA','MERGE'],
    [{id:'pr-663',host:'READFIELD',capability_delta:true,ci:'PASS',exact_head:true,base_current:true,mergeable:true,superseded:true,unique_residue:true},'DELTA','DROP'],
    [{id:'external-donor-hold',host:'FIELD',external_donor:true,donor_gate:'PARK',capability_delta:true,ci:'PASS',exact_head:true,base_current:true,mergeable:true},'DONOR','HOLD'],
    [{id:'external-donor-pass',host:'FIELD',external_donor:true,donor_gate:'PASS',bounded_claim_proved:true,ci:'PASS',exact_head:true,base_current:true,mergeable:true},'EVIDENCE','MERGE']
  ];
  for(const [fixture,wantClass,wantDisposition] of convergenceFixtures){
    const got=reduceContribution(fixture);
    if(got.contribution_class!==wantClass||got.disposition!==wantDisposition)fail.push('convergence fixture '+fixture.id+' => '+got.contribution_class+'/'+got.disposition+' expected '+wantClass+'/'+wantDisposition);
  }
  if(!CONTRIBUTION_CLASSES.includes(reduceContribution({}).contribution_class))fail.push('invalid convergence contribution class');
  if(!CONVERGENCE_DISPOSITIONS.includes(reduceContribution({}).disposition))fail.push('invalid convergence disposition');
  const staleBase=reduceContribution({id:'stale-base',host:'FIELD',capability_delta:true,ci:'PASS',exact_head:true,base_current:false,mergeable:true});
  if(staleBase.disposition!=='REPAIR')fail.push('stale base must repair before merge');

  const shelf=reduceBatch('control/packets');
  if(shelf.file_count<1||shelf.packet_count<1)fail.push('real packet shelf produced empty batch');
  if(shelf.counts.NOW!==0)fail.push('batch packet shelf self-authorized NOW');
  if(shelf.items.some(x=>!EGRESS_CLASSES.includes(x.class)))fail.push('batch produced invalid egress class');

  const rendered=markdown(packet),structured=JSON.stringify(packet);
  if(rendered.length>10000)fail.push('default transcript exceeds 10k chars: '+rendered.length);
  if(structured.length>20000)fail.push('structured transcript exceeds 20k chars: '+structured.length);

  const unrelated=clone(sources);
  unrelated.C.purpose=String(unrelated.C.purpose||'')+' / SELFTEST UNSELECTED';
  if(compile(unrelated).phi.expression_revision!==packet.phi.expression_revision)fail.push('unselected CURRENT field invalidated revision');

  const selected=clone(sources);
  selected.C.next_single_action={...(selected.C.next_single_action||{}),id:String(selected.C.next_single_action?.id||'next')+'-SELFTEST'};
  if(compile(selected).phi.expression_revision===packet.phi.expression_revision)fail.push('selected CURRENT field did not invalidate revision');

  if(fail.length){console.error('FIELD JIT transcript FAIL · '+fail.join(' · '));process.exit(1)}
  console.log('FIELD JIT transcript PASS · '+packet.phi.expression_revision);
}else if(process.argv.includes('--json')){
  process.stdout.write(JSON.stringify(packet,null,2)+'\n');
}else{
  process.stdout.write(markdown(packet));
}
}
