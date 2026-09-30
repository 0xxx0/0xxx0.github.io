#!/usr/bin/env node
import fs from 'node:fs';
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


const cliNonempty=v=>{
  if(v==null)return false;
  if(Array.isArray(v))return v.length>0;
  if(typeof v==='object')return Object.keys(v).length>0;
  return String(v).trim().length>0;
};
const cliToken=v=>String(v??'').trim().toUpperCase().replace(/[\s-]+/g,'_');
const cliId=p=>String(p?.packet_id||p?.id||p?.task_id||p?.return_id||p?.object?.id||p?.OBJECT?.id||p?.subject||'packet');
const cliPick=(p,...keys)=>{for(const k of keys)if(p?.[k]!=null)return p[k];return null};
function cliFlagIds(args,name){
  const out=[];
  for(let i=0;i<args.length;i++)if(args[i]===name){
    const v=args[i+1];
    if(v==null||String(v).startsWith('--'))throw new Error(name+' requires one packet id; repeat flag for multiple ids');
    out.push(String(v));
  }
  return new Set(out);
}
function cliWalkJson(p){
  const st=fs.statSync(p);
  if(st.isDirectory())return fs.readdirSync(p,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(d=>cliWalkJson(p.replace(/\/$/,'')+'/'+d.name));
  return p.endsWith('.json')?[p]:[];
}
function cliLoadPackets(source){
  const files=[...new Set(cliWalkJson(source))].sort();
  const rows=[];
  for(const file of files){
    const raw=read(file),packets=Array.isArray(raw)?raw:[raw];
    packets.forEach((packet,index)=>rows.push({packet,file,index}));
  }
  return {files,rows};
}
function cliReduceSource(source,args){
  const {files,rows}=cliLoadPackets(source);
  const nowIds=cliFlagIds(args,'--now-id'),selectedIds=cliFlagIds(args,'--selected-id'),reactivatedIds=cliFlagIds(args,'--reactivate-id');
  const blanket={now:args.includes('--now'),selected:args.includes('--selected'),reactivated:args.includes('--reactivate')};
  if(rows.length!==1&&(blanket.now||blanket.selected||blanket.reactivated))throw new Error('blanket --now/--selected/--reactivate is single-packet only; use repeatable *-id flags for a sweep');
  const items=rows.map(({packet,file,index})=>{
    const id=cliId(packet),context={
      now:blanket.now||nowIds.has(id),
      selected:blanket.selected||selectedIds.has(id),
      reactivated:blanket.reactivated||reactivatedIds.has(id)
    };
    return {...reducePacket(packet,context),file,index};
  });
  if(items.length===1&&files.length===1&&!fs.statSync(source).isDirectory())return items[0];
  const counts=Object.fromEntries(EGRESS_CLASSES.map(k=>[k,0]));
  for(const x of items)counts[x.class]=(counts[x.class]||0)+1;
  return {schema:'field-egress-sweep/v0.1',authority:'NONE',packet_count:items.length,file_count:files.length,counts,items};
}
function cliAssessContribution(p={}){
  if(!p||typeof p!=='object'||Array.isArray(p))throw new Error('FIELD_CONTRIBUTION_OBJECT_REQUIRED');
  const id=String(cliPick(p,'id','packet_id','candidate_id','subject')||'contribution');
  const kind=cliToken(cliPick(p,'kind','contribution_kind','type'));
  const hostExplicit=p.host_found===false?false:(p.host_found===true||cliNonempty(cliPick(p,'host','route','owner')));
  const material=p.material_delta===true||p.changes_existing_head===true||p.delta?.material===true||cliNonempty(p.changed_paths);
  const evidenceOnly=p.evidence_only===true||kind==='EVIDENCE';
  const returnOnly=p.return_only===true||p.observed_behavior===true||kind==='RETURN';
  const donorOnly=p.donor_only===true||p.architectural_only===true||p.transfer_applied===false||kind==='DONOR';
  const donorGate=cliToken(cliPick(p,'donor_gate','donor_admission','research_donor_gate'));
  const externalDonor=p.external_donor===true||cliNonempty(donorGate);
  const donorGatePass=p.donor_gate_pass===true||/^(PASS|PASSED|ELIGIBLE|TRANSFER|PROMOTE)$/.test(donorGate);
  const donorBlocked=externalDonor&&!donorGatePass;
  const superseded=p.superseded===true||/SUPERSEDED|OBSOLETE|RETIRED/.test(cliToken(cliPick(p,'state','status','disposition')));
  const ci=cliToken(cliPick(p,'ci','ci_status','verification_status'));
  const ciPass=/^(PASS|SUCCESS|GREEN|VERIFIED)$/.test(ci),ciFail=/^(FAIL|FAILED|ERROR|RED)$/.test(ci);
  const mergeable=p.mergeable===true,notMergeable=p.mergeable===false;
  let contributionClass=returnOnly?'RETURN':evidenceOnly?'EVIDENCE':donorBlocked&&hostExplicit?'DONOR':material&&hostExplicit?'DELTA':donorOnly&&hostExplicit?'DONOR':!hostExplicit?'UNRESOLVED':'UNRESOLVED';
  let disposition,reasons=[];
  if(superseded){disposition='DROP';reasons.push('superseded_or_replaced')}
  else if(donorBlocked){disposition='HOLD';reasons.push('external_donor_gate_not_pass')}
  else if(contributionClass==='DONOR'||contributionClass==='UNRESOLVED'){disposition='HOLD';reasons.push(contributionClass==='DONOR'?'mechanism_without_host_delta':'no_resolved_host_delta')}
  else if(ciFail||notMergeable){disposition='REPAIR';reasons.push(ciFail?'verification_failed':'not_mergeable')}
  else if(ciPass&&mergeable){disposition='MERGE';reasons.push('host_delta_or_evidence_verified')}
  else {disposition='REPAIR';reasons.push(!ciPass?'verification_not_attested':'mergeability_not_attested')}
  if(p.architectural_only===true&&!material&&contributionClass!=='DONOR'){contributionClass='DONOR';disposition='HOLD';reasons=['architectural_or_documentary_only']}
  return {
    schema:'field-contribution-reducer/v0.1',id,class:contributionClass,disposition,reasons,
    host:cliPick(p,'host','route','owner')||null,
    donor_gate:externalDonor?(donorGate||'MISSING'):null,
    authority:'ADVISORY_ONLY / CALLER_ATTESTED_FACTS / NO REPO OR HOST MUTATION',
    stop:disposition==='MERGE'?'Caller may request native merge after independent exact-head verification.':
      disposition==='REPAIR'?'Repair the named failing/unknown gate, then re-reduce.':
      disposition==='DROP'?'Preserve unique residue/provenance, then stop this lineage.':
      'Hold without promotion; reopen only when a host delta or missing evidence changes.'
  };
}

const cliArgs=process.argv.slice(2);
const reduceAt=cliArgs.indexOf('--reduce');
const convergeAt=cliArgs.indexOf('--converge');
if(reduceAt>=0&&convergeAt>=0){console.error('choose one: --reduce or --converge');process.exit(2)}
if(reduceAt>=0){
  const source=cliArgs[reduceAt+1];
  if(!source||source.startsWith('--')){console.error('FIELD reduce requires a JSON packet path or directory');process.exit(2)}
  try{process.stdout.write(JSON.stringify(cliReduceSource(source,cliArgs),null,2)+'\n')}
  catch(e){console.error(String(e?.message||e));process.exit(2)}
}else if(convergeAt>=0){
  const source=cliArgs[convergeAt+1];
  if(!source||source.startsWith('--')){console.error('FIELD converge requires a candidate JSON path');process.exit(2)}
  try{process.stdout.write(JSON.stringify(cliAssessContribution(read(source)),null,2)+'\n')}
  catch(e){console.error(String(e?.message||e));process.exit(2)}
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
