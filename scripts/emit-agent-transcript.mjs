#!/usr/bin/env node
import fs from 'node:fs';

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
  return {
    schema:'field-agent-transcript/v0.2-jit',
    packet_authority:'NONE',
    phi:{host:'0xxx0/0xxx0.github.io',authority_sources:Object.values(INPUTS).map(x=>'/'+x),expression_revision:revision,selected_expressions:selected},
    phi_focus:null,
    now:{updated:C.updated||null,active_fronts:C.active_fronts||[],next_single_action:C.next_single_action||null},
    heads,human_world_gates:gates,
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
  out.push('','## RESIDUE','- WAITING registry counts: '+JSON.stringify(p.residue.waiting_registry_surface_counts),'','## RETURN','- '+p.return.law,'');
  return out.join('\n')+'\n';
}

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
