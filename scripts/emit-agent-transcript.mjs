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

function compileCrystal(sources){
  const p=compile(sources),routes=sources.M.routes||sources.M.entries||[];
  const packetSweep=fs.existsSync('control/packets')?cliReduceSource('control/packets',[]):{schema:'field-egress-sweep/v0.1',authority:'NONE',packet_count:0,file_count:0,counts:Object.fromEntries(EGRESS_CLASSES.map(k=>[k,0])),items:[]};
  const path=x=>({
    lineage:x.lineage||null,
    route:x.route||null,
    state:x.state||null,
    head:x.head||null,
    next:x.next_executable?{
      id:x.next_executable.id||null,
      state:x.next_executable.state||null,
      objective:x.next_executable.objective||null
    }:null
  });
  return {
    schema:'field-crystal/v0.1',
    authority:'NONE',
    revision:p.phi.expression_revision,
    updated:p.now.updated,
    active_fronts:p.now.active_fronts.map(x=>({id:x.id||null,state:x.state||null,center:x.center||null,objective:x.objective||null})),
    next_single_action:p.now.next_single_action||null,
    paths:p.heads.map(path),
    human_world_gates:p.human_world_gates,
    archive:{addressed_route_count:routes.filter(x=>x?.href).length,current_head_count:p.heads.length,law:'Large archive; small active surface. Archive scale does not create NOW.'},
    packets:{schema:packetSweep.schema,authority:packetSweep.authority,file_count:packetSweep.file_count,packet_count:packetSweep.packet_count,counts:packetSweep.counts,items:packetSweep.items.map(x=>({packet_id:x.packet_id,class:x.class,reason:x.reason,file:x.file}))},
    return:{target:'/',law:'CRYSTAL is a transient read. Select one addressed object, perform at most one newly authorized bounded move, TRACE, RETURN, then re-read current truth.'},
    laws:[
      'Compression retains identity, residue and RETURN.',
      'Stored packets do not self-authorize NOW.',
      'Paths remain unequal native hosts; CRYSTAL is not a universal shell or state store.',
      'No priority, mutation, merge authority or effect permission is created by this projection.'
    ]
  };
}

function crystalMarkdown(c){
  const out=['# FIELD CRYSTAL','revision: '+c.revision,'authority: NONE','updated: '+(c.updated||'—'),''];
  out.push('## FIELD','- active fronts '+c.active_fronts.length+' · current heads '+c.paths.length+' · addressed routes '+c.archive.addressed_route_count+' · JSON packets '+c.packets.packet_count);
  for(const f of c.active_fronts)out.push('- NOW · '+(f.id||'front')+' ['+(f.state||'UNKNOWN')+'] — '+clip(f.objective||f.center||''));
  out.push('','## PATHS');
  for(const p of c.paths)out.push('- '+(p.route||'—')+' · '+(p.lineage||'—')+' · '+(p.state||'—')+(p.next?' · NEXT '+(p.next.id||p.next.state||'declared'):''));
  out.push('','## PACKET SHELF','- '+EGRESS_CLASSES.map(k=>k+' '+(c.packets.counts[k]||0)).join(' · '));
  for(const x of c.packets.items)out.push('- '+x.class+' · '+x.packet_id+' · '+x.reason);
  out.push('','## NEXT');
  const n=c.next_single_action||{};out.push('- '+(n.id||'—')+' — '+clip(n.instruction||''));
  out.push('','## GATES');
  if(!c.human_world_gates.length)out.push('- CLEAR');
  for(const g of c.human_world_gates)out.push('- '+(g.route||'—')+' · '+g.dependency_kind+' · '+clip(g.objective));
  out.push('','## RETURN','- '+c.return.law,'');
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
  const exactHead=p.exact_head===true,baseCurrent=p.base_current===true;
  const mergeable=p.mergeable===true,notMergeable=p.mergeable===false;
  let contributionClass=returnOnly?'RETURN':evidenceOnly?'EVIDENCE':donorBlocked&&hostExplicit?'DONOR':material&&hostExplicit?'DELTA':donorOnly&&hostExplicit?'DONOR':!hostExplicit?'UNRESOLVED':'UNRESOLVED';
  let disposition,reasons=[];
  if(superseded){disposition='DROP';reasons.push('superseded_or_replaced')}
  else if(donorBlocked){disposition='HOLD';reasons.push('external_donor_gate_not_pass')}
  else if(contributionClass==='DONOR'||contributionClass==='UNRESOLVED'){disposition='HOLD';reasons.push(contributionClass==='DONOR'?'mechanism_without_host_delta':'no_resolved_host_delta')}
  else if(ciFail||!exactHead||!baseCurrent||notMergeable){
    disposition='REPAIR';
    reasons.push(ciFail?'verification_failed':!exactHead?'exact_head_not_attested':!baseCurrent?'current_base_not_attested':'not_mergeable');
  }
  else if(ciPass&&exactHead&&baseCurrent&&mergeable){disposition='MERGE';reasons.push('host_delta_or_evidence_verified_on_exact_current_base')}
  else {disposition='REPAIR';reasons.push(!ciPass?'verification_not_attested':!exactHead?'exact_head_not_attested':!baseCurrent?'current_base_not_attested':'mergeability_not_attested')}
  if(p.architectural_only===true&&!material&&contributionClass!=='DONOR'){contributionClass='DONOR';disposition='HOLD';reasons=['architectural_or_documentary_only']}
  return {
    schema:'field-contribution-reducer/v0.1',id,class:contributionClass,disposition,reasons,
    host:cliPick(p,'host','route','owner')||null,
    donor_gate:externalDonor?(donorGate||'MISSING'):null,
    attested:{ci:ci||null,exact_head:exactHead,base_current:baseCurrent,mergeable},
    base_current_semantics:'Caller must derive base_current from native ancestry: compare(master, candidate_head).behind_by === 0. PR base-pointer equality alone is insufficient.',
    authority:'ADVISORY_ONLY / CALLER_ATTESTED_FACTS / NO REPO OR HOST MUTATION',
    stop:disposition==='MERGE'?'Caller may request native merge after independent exact-head verification.':
      disposition==='REPAIR'?'Repair the named failing/unknown gate, then re-reduce.':
      disposition==='DROP'?'Preserve unique residue/provenance, then stop this lineage.':
      'Hold without promotion; reopen only when a host delta or missing evidence changes.'
  };
}


const cliArgValue=(args,name,defaultValue=null)=>{
  const i=args.indexOf(name);if(i<0)return defaultValue;
  const v=args[i+1];if(v==null||String(v).startsWith('--'))throw new Error(name+' requires a value');
  return String(v);
};
function handoffExitPaths(route){
  return (route?.field?.exit_paths||[]).filter(x=>{
    const s=String(x?.status||'').toUpperCase();
    return !s||s==='AVAILABLE'||s==='ACTIVE'||s==='READY';
  });
}
function handoffMoves(route){
  const exits=handoffExitPaths(route);
  const fromExits=exits.map(x=>({
    label:one(x?.via||x?.label||x?.class||x?.target||'OPEN'),
    target:x?.target||null,
    effect:x?.effect||null,
    reversibility:x?.reversibility||null
  })).filter(x=>x.label).slice(0,3);
  if(fromExits.length)return fromExits;
  return String(route?.operation||'').split(/\s*\/\s*|\s*·\s*/).map(one).filter(Boolean).slice(0,3).map(label=>({label,target:route?.href||null,effect:null,reversibility:null}));
}
function handoffContract(route){
  const c=route?.contract;if(!c)return null;
  return {
    accepts:c.accepts||null,
    transforms:c.transforms?{
      verb:c.transforms.verb||null,
      preserves:c.transforms.preserves||null,
      reversibility:c.transforms.reversibility||null,
      side_effects:c.transforms.side_effects||null
    }:null,
    emits:c.emits||null,
    evidence:c.evidence||null
  };
}
function compileCrewHandoff(sources,selector,{intent=null}={}){
  const p=compile(sources),routes=sources.M.routes||sources.M.entries||[],heads=sources.C.current_heads||[];
  const sel=one(selector);
  if(!sel)throw new Error('FIELD handoff requires one route or CURRENT lineage');
  const head=heads.find(h=>h?.route===sel||h?.lineage===sel||h?.head===sel)||null;
  const route=routes.find(r=>r?.href===sel)||(head?routes.find(r=>r?.href===head.route):null);
  if(!route&&!head)throw new Error('FIELD handoff target not found: '+sel);
  const href=route?.href||head?.route||null;
  if(!href)throw new Error('FIELD handoff target has no address: '+sel);
  const moves=handoffMoves(route);
  const proofRefs=[...new Set([
    ...(Array.isArray(head?.evidence)?head.evidence:[]),
    head?.latest_return,
    route?.latest_return,
    route?.receipt
  ].filter(Boolean))].slice(0,12);
  const retained=one(head?.retained_function||route?.role||route?.evolution?.mutation||'');
  const objective=one(intent)||one(head?.next_executable?.objective)||one(route?.evolution?.question)||clip(retained,280)||'Return one bounded contribution or explicit residue for this object.';
  const contract=read('control/SUBMISSION_CONTRACT.json');
  const packet={
    schema:'field-crew-handoff/v0.1',
    authority:'NONE / HANDOFF ONLY',
    generated_from:{
      field_revision:p.phi.expression_revision,
      current_updated:sources.C.updated||null,
      selector:sel,
      sources:['/control/CURRENT.json','/showcase-manifest.json','/control/SUBMISSION_CONTRACT.json']
    },
    object:{
      route:href,
      lineage:head?.lineage||null,
      title:route?.title||head?.lineage||href,
      owner:route?.field?.owner||route?.family||route?.title||null,
      state:head?.state||route?.state||null,
      version:head?.version||route?.version||null,
      current_head:head?.head||null,
      retained_function:retained||null
    },
    intent:objective,
    native_moves:moves,
    evidence:{refs:proofRefs,latest_return:head?.latest_return||route?.latest_return||null},
    boundaries:{
      route_contract:handoffContract(route),
      field_owner:route?.field?.owner||null,
      law:'Information transfer does not transfer mutation authority. Perform at most one newly authorized bounded native move before TRACE / RETURN.'
    },
    submission_template:{
      schema:contract.schema||'0xxx0/submission-contract/v0.1',
      source_ref:'crew-handoff:'+p.phi.expression_revision,
      intent:objective,
      object_ref:href,
      contribution_class:'UNRESOLVED',
      evidence_class:'SPEC',
      evidence_class_options:['BYTES','SPEC','IMAGE','RECEIPT'],
      delta_or_question:'REPLACE WITH THE SMALLEST ACTUAL DELTA OR QUESTION',
      proof_available:'REPLACE WITH OBSERVED / VERIFIED EVIDENCE',
      residue:'REPLACE WITH WHAT REMAINS UNRESOLVED'
    },
    return_contract:{
      required_fields:contract.return_format||['STATE','DELTA','EVIDENCE','RESIDUE','WAITING','ONE_NEXT'],
      contribution_classes:Object.keys(contract.contribution_classes||{}),
      merge_recheck:{
        candidate_head:'REQUIRED IF MATERIAL REPO DELTA',
        ci:'PASS REQUIRED FOR MERGE PROJECTION',
        exact_head:true,
        base_current:'RECOMPUTE FROM NATIVE ANCESTRY: compare(master,candidate_head).behind_by === 0',
        mergeable:true
      },
      command:'node scripts/emit-agent-transcript.mjs --converge <returned-candidate.json>',
      stop:'RETURN closes this turn. Re-read current truth before authorizing another move.'
    },
    residue:{
      omitted_native_move_count:Math.max(0,handoffExitPaths(route).length-moves.length),
      live_focus:'NOT_SERIALIZED',
      repo_remote_freshness:'NOT_ATTESTED BY THIS COMPILER'
    },
    laws:[
      'Explicit caller selection creates this handoff; the packet cannot self-authorize NOW.',
      'One object, at most three native moves, one bounded TURN, TRACE, RETURN.',
      'No merge authority transfers with the packet.',
      'Stale good work remains residue until exact-head and base-current are re-attested.',
      'A valid outcome is DONOR, EVIDENCE, RETURN, UNRESOLVED or no material change.'
    ]
  };
  return packet;
}
function handoffMarkdown(h){
  const out=['# FIELD CREW HANDOFF','authority: '+h.authority,'revision: '+h.generated_from.field_revision,''];
  out.push('## OBJECT','- '+(h.object.route||'—')+' · '+(h.object.lineage||h.object.title||'—')+' · '+(h.object.state||'—')+' · '+(h.object.version||'—'));
  out.push('','## INTENT','- '+h.intent,'','## NATIVE MOVES');
  if(!h.native_moves.length)out.push('- NONE DECLARED · inspect native host before acting');
  for(const m of h.native_moves)out.push('- '+m.label+(m.target?' → '+m.target:''));
  out.push('','## PROOF REFS');if(!h.evidence.refs.length)out.push('- NONE DECLARED');
  for(const x of h.evidence.refs)out.push('- '+x);
  out.push('','## TURN LAW','- '+h.boundaries.law,'','## RETURN');
  out.push('- '+h.return_contract.required_fields.join(' / '));
  out.push('- merge recheck: CI PASS · exact head · behind_by 0 vs current master · mergeable');
  out.push('- '+h.return_contract.stop,'');
  return out.join('\n')+'\n';
}

function cliUsage(){
  return {
    schema:'field-machine-entrypoint-help/v0.1',
    authority:'NONE',
    entrypoint:'scripts/emit-agent-transcript.mjs',
    modes:[
      {mode:'transcript',command:'node scripts/emit-agent-transcript.mjs',purpose:'bounded current handoff; no live φ focus or mutation authority'},
      {mode:'transcript-json',command:'node scripts/emit-agent-transcript.mjs --json',purpose:'structured bounded current handoff'},
      {mode:'crystal',command:'node scripts/emit-agent-transcript.mjs --crystal',purpose:'one transient compressed read across current fronts, every CURRENT path, archive scale, packet-shelf egress, NEXT and RETURN; add --json for structured output'},
      {mode:'packet-reduce',command:'node scripts/emit-agent-transcript.mjs --reduce <packet.json|directory>',purpose:'classify packet egress; caller context may be added with repeatable --now-id / --selected-id / --reactivate-id'},
      {mode:'crew-handoff',command:'node scripts/emit-agent-transcript.mjs --handoff <route|lineage> [--intent "..."]',purpose:'compile one explicitly selected FIELD object into a zero-authority crew turn with ≤3 native moves, proof refs and exact RETURN/merge-recheck contract; add --json for structured output'},
      {mode:'contribution-converge',command:'node scripts/emit-agent-transcript.mjs --converge <candidate.json>',purpose:'advisory DELTA/EVIDENCE/DONOR/RETURN/UNRESOLVED + MERGE/REPAIR/HOLD/DROP projection'}
    ],
    converge_attestations:{
      merge_requires:['ci PASS','exact_head true','base_current true','mergeable true'],
      base_current:'derive from native ancestry: compare(master,candidate_head).behind_by === 0',
      external_donor:'research donor admission PASS is necessary but never grants host/effect authority'
    },
    laws:[
      'ONE MACHINE ENTRYPOINT; MANY READ-ONLY REDUCTIONS.',
      'THE REDUCER CLASSIFIES; IT DOES NOT PRIORITIZE, EXECUTE, MERGE OR MUTATE.',
      'NOW REQUIRES EXPLICIT CALLER CONTEXT.',
      'MERGE OUTPUT IS ADVISORY; NATIVE HOST/GITHUB AUTHORITY REMAINS NATIVE.'
    ]
  };
}
function cliUsageText(u){
  const out=['FIELD / MACHINE ENTRYPOINT','authority: '+u.authority,''];
  for(const m of u.modes)out.push(m.command+'\n  '+m.purpose);
  out.push('','MERGE projection requires: '+u.converge_attestations.merge_requires.join(' · '));
  out.push('base_current: '+u.converge_attestations.base_current);
  out.push('external donor: '+u.converge_attestations.external_donor,'','No mode mutates GitHub, CURRENT, native hosts, or effect authority.','');
  return out.join('\n');
}

const cliArgs=process.argv.slice(2);
const reduceAt=cliArgs.indexOf('--reduce');
const convergeAt=cliArgs.indexOf('--converge');
const handoffAt=cliArgs.indexOf('--handoff');
const crystalMode=cliArgs.includes('--crystal');
if(cliArgs.includes('--help')){
  const usage=cliUsage();
  process.stdout.write(cliArgs.includes('--json')?JSON.stringify(usage,null,2)+'\n':cliUsageText(usage));
}else if(crystalMode&&(reduceAt>=0||convergeAt>=0||handoffAt>=0)){console.error('choose one: --crystal, --reduce, --handoff, or --converge');process.exit(2)}
else if(crystalMode){
  try{
    const c=compileCrystal(load());
    process.stdout.write(cliArgs.includes('--json')?JSON.stringify(c,null,2)+'\n':crystalMarkdown(c));
  }catch(e){console.error(String(e?.message||e));process.exit(2)}
}else if([reduceAt,convergeAt,handoffAt].filter(x=>x>=0).length>1){console.error('choose one: --reduce, --handoff, or --converge');process.exit(2)}
else if(handoffAt>=0){
  const selector=cliArgs[handoffAt+1];
  if(!selector||selector.startsWith('--')){console.error('FIELD handoff requires one route or CURRENT lineage');process.exit(2)}
  try{const h=compileCrewHandoff(load(),selector,{intent:cliArgValue(cliArgs,'--intent',null)});process.stdout.write(cliArgs.includes('--json')?JSON.stringify(h,null,2)+'\n':handoffMarkdown(h))}
  catch(e){console.error(String(e?.message||e));process.exit(2)}
}
else if(reduceAt>=0){
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

  const crystal=compileCrystal(sources);
  if(crystal.authority!=='NONE')fail.push('CRYSTAL acquired authority');
  if(crystal.paths.length!==packet.heads.length)fail.push('CRYSTAL path count drift');
  if(crystal.archive.addressed_route_count<crystal.paths.length)fail.push('CRYSTAL archive scale smaller than current heads');
  if((crystal.packets.counts.NOW||0)!==0)fail.push('packet shelf self-authorized NOW inside CRYSTAL');
  if(crystal.packets.packet_count!==crystal.packets.items.length)fail.push('CRYSTAL packet count mismatch');
  const verse=read('control/packets/HERMES_VERSE_PUZZLE_MODEL_2026-09-23.json');
  if(reducePacket(verse,{}).class!=='ARCHIVE')fail.push('real Verse packet should archive without caller selection');
  if(reducePacket(verse,{selected:true}).class!=='NOW')fail.push('real Verse packet should become NOW only under explicit selection');
  if(!crystal.return?.target)fail.push('CRYSTAL RETURN target missing');

  const rendered=markdown(packet),structured=JSON.stringify(packet);
  if(rendered.length>10000)fail.push('default transcript exceeds 10k chars: '+rendered.length);
  if(structured.length>20000)fail.push('structured transcript exceeds 20k chars: '+structured.length);

  const unrelated=clone(sources);
  unrelated.C.purpose=String(unrelated.C.purpose||'')+' / SELFTEST UNSELECTED';
  if(compile(unrelated).phi.expression_revision!==packet.phi.expression_revision)fail.push('unselected CURRENT field invalidated revision');

  const selected=clone(sources);
  selected.C.next_single_action={...(selected.C.next_single_action||{}),id:String(selected.C.next_single_action?.id||'next')+'-SELFTEST'};
  if(compile(selected).phi.expression_revision===packet.phi.expression_revision)fail.push('selected CURRENT field did not invalidate revision');

  const handoffTarget=(sources.C.current_heads||[]).find(x=>x?.route&&((sources.M.routes||sources.M.entries||[]).some(r=>r?.href===x.route)))?.route;
  if(!handoffTarget)fail.push('no resolvable CURRENT head for crew-handoff selftest');
  else{
    const h=compileCrewHandoff(sources,handoffTarget,{intent:'SELFTEST ONE BOUNDED MOVE'});
    if(h.authority!=='NONE / HANDOFF ONLY')fail.push('crew handoff acquired authority');
    if(h.object.route!==handoffTarget)fail.push('crew handoff object drift');
    if(h.native_moves.length>3)fail.push('crew handoff exposed > 3 native moves');
    if(h.return_contract?.merge_recheck?.base_current!== 'RECOMPUTE FROM NATIVE ANCESTRY: compare(master,candidate_head).behind_by === 0')fail.push('crew handoff lost base-current recheck');
    if(!String(h.return_contract?.stop||'').includes('Re-read current truth'))fail.push('crew handoff RETURN does not force replan');
    if(h.submission_template?.object_ref!==handoffTarget)fail.push('crew handoff submission object drift');
    const hm=handoffMarkdown(h);if(hm.length>9000)fail.push('crew handoff markdown exceeds 9k chars: '+hm.length);
    if(JSON.stringify(h).length>20000)fail.push('crew handoff JSON exceeds 20k chars: '+JSON.stringify(h).length);
  }

  if(fail.length){console.error('FIELD JIT transcript FAIL · '+fail.join(' · '));process.exit(1)}
  console.log('FIELD JIT transcript PASS · '+packet.phi.expression_revision);
}else if(process.argv.includes('--json')){
  process.stdout.write(JSON.stringify(packet,null,2)+'\n');
}else{
  process.stdout.write(markdown(packet));
}

}
