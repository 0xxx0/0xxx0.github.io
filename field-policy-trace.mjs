import {verifyTrace} from './policy-trace-verifier.mjs';

const GATES=['read','remember','acknowledge','answer','draft','act','escalate'];
const $=id=>document.getElementById(id);
let axialHandoff=null;
try{const q=JSON.parse(sessionStorage.getItem('field.trace.handoff.v01')||'null');sessionStorage.removeItem('field.trace.handoff.v01');if(q&&Date.now()-Date.parse(q.at||0)<300000)axialHandoff=q}catch(_){}
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

function canonical(v){
  if(v===null||typeof v!=='object') return JSON.stringify(v);
  if(Array.isArray(v)) return '['+v.map(canonical).join(',')+']';
  return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';
}
async function sha(v){
  const bytes=new TextEncoder().encode(typeof v==='string'?v:canonical(v));
  const buf=await crypto.subtle.digest('SHA-256',bytes);
  return 'sha256:'+Array.from(new Uint8Array(buf),b=>b.toString(16).padStart(2,'0')).join('');
}
const inline=value=>({mode:'inline',classification:'public',value});
const digest=(d,shape)=>({mode:'digest',classification:'private',digest:d,shape});
function decisionSet(permission,stakes){
  return {
    read:'allow',
    remember:'deny',
    acknowledge:'allow',
    answer:permission==='none'?'deny':(stakes==='high'?'review':'allow'),
    draft:permission==='act'||permission==='draft'?'allow':(permission==='read'?'review':'deny'),
    act:permission!=='act'?'deny':(stakes==='ordinary'?'allow':'review'),
    escalate:stakes==='high'?'allow':'conditional'
  };
}
function gateReason(g,d){
  if(g==='remember') return 'fi.reference.remember-deny';
  if(g==='act'&&d==='allow') return 'fi.reference.act-explicit';
  if(g==='act'&&d==='review') return 'fi.reference.act-review';
  if(g==='escalate') return 'fi.reference.escalate';
  return 'fi.reference.'+g+'-'+d;
}
function focusResource(){
  try{
    const r=window.FieldLensHost?.focus?.();
    if(!r?.href)return null;
    if(axialHandoff&&axialHandoff.focus_href===r.href){
      return {ref:axialHandoff.resource_ref||('route:'+r.href),href:r.href,title:axialHandoff.title||r.title||r.href,via:'AXIAL',axial_address:axialHandoff.address||null};
    }
    return {ref:'route:'+r.href,href:r.href,title:r.title||r.href,via:'FIELD'};
  }catch(_){return null}
}
async function buildTrace({text,source,channel,permission,stakes,effects}){
  const focus=focusResource();
  const created=new Date().toISOString();
  const eventRef='event:fi:'+((await sha(text+'|'+source+'|'+channel)).slice(-16));
  const selectorFacts={source,channel,resource_ref:focus?.ref||null,resource_via:focus?.via||'FIELD',axial_address:focus?.axial_address||null,stakes,requested_side_effect:effects};
  const selectorFactsDigest=await sha(selectorFacts);
  const decisions=decisionSet(permission,stakes);
  const policy={
    schema:'fi-reference-policy/v0.1',
    policy_id:'base:fi-local-reference',
    revision:1,
    mode:'restrict',
    authority:{source:'system_default',issued_at:'2026-09-22T00:00:00+08:00'},
    selector:{kind:'fallback',layer:'base',domain:'base',when:'no_nonfallback_match'},
    permissions:Object.fromEntries(GATES.map(g=>[g,{decision:decisions[g],reason_code:gateReason(g,decisions[g])}]))
  };
  const policyDigest=await sha(policy);
  const policySet={schema:'fi-reference-policy-set/v0.1',policies:[policy]};
  const policySetDigest=await sha(policySet);
  const events=[]; let seq=0;
  const add=e=>{e.seq=seq++;e.cause_event_ids=e.cause_event_ids||[];e.prev_event_hash=null;e.event_hash=null;events.push(e);return e.event_id};
  const selectorId=add({
    event_id:'trace-event:000-selector-base',type:'selector_evaluated',stage:'selector',gate:null,
    policy_id:policy.policy_id,policy_revision:1,selector_id:'selector:fi-reference-fallback',layer:'base',domain:'base',
    matched:true,selector_kind:'fallback',specificity_class:'fallback',specificity_rank:100,matched_positive_clauses:0,
    fallback_eligible:true,fallback_suppressed:false,clauses:[]
  });
  const matchedId=add({
    event_id:'trace-event:001-policy-base',type:'policy_matched',stage:'base',gate:null,
    policy_id:policy.policy_id,policy_revision:1,layer:'base',mode:'restrict',selector_event_ids:[selectorId],
    authority_source:'system_default',authorization_ref:null,cause_event_ids:[selectorId]
  });
  const opIds={},denyIds={};
  for(const gate of GATES){
    const d=decisions[gate],before=gate==='remember'?'review':'deny';
    const op=add({
      event_id:'trace-event:'+String(seq).padStart(3,'0')+'-op-'+gate,type:'operation_evaluated',stage:'base',gate,
      policy_id:policy.policy_id,policy_revision:1,operation_index:GATES.indexOf(gate),policy_mode:'restrict',
      op:'restrict_decision',path:'/permissions/'+gate+'/decision',before:inline(before),operand:inline(d),after:inline(d),
      outcome:'applied',reason_code:gateReason(gate,d),cause_event_ids:[matchedId]
    });
    opIds[gate]=op;
    if(d==='deny'){
      denyIds[gate]=add({
        event_id:'trace-event:'+String(seq).padStart(3,'0')+'-deny-'+gate,type:'deny_applied',stage:'base',gate,
        policy_id:policy.policy_id,policy_revision:1,source_event_id:op,path:'/permissions/'+gate+'/decision',
        deny_kind:'explicit',value:inline('deny'),dominates_event_ids:[],cause_event_ids:[op]
      });
    }
  }
  const stateDigest=await sha(decisions);
  const stageId=add({
    event_id:'trace-event:'+String(seq).padStart(3,'0')+'-stage-base',type:'stage_resolved',stage:'base',gate:null,
    policy_id:null,policy_revision:null,resolved_stage:'base',matched_policy_ids:[policy.policy_id],
    gate_decisions:decisions,state_digest:stateDigest,cause_event_ids:Object.values(opIds)
  });
  const gateFinalIds={},gateResults={};
  for(const gate of GATES){
    const scopeDigest=await sha({gate,decision:decisions[gate],permission,stakes,effects,resource:focus?.ref||null});
    const deny=denyIds[gate]?[denyIds[gate]]:[];
    const id=add({
      event_id:'trace-event:'+String(seq).padStart(3,'0')+'-final-'+gate,type:'gate_final',stage:'final',gate,
      policy_id:null,policy_revision:null,decision:decisions[gate],effective_scope:digest(scopeDigest,'fi local reference gate scope'),
      source_policy_ids:[policy.policy_id],winning_event_ids:[denyIds[gate]||opIds[gate]],grant_event_ids:[],
      deny_event_ids:deny,lock_event_ids:[],reason_codes:[gateReason(gate,decisions[gate])],
      cause_event_ids:[stageId,opIds[gate],...deny]
    });
    gateFinalIds[gate]=id;
    gateResults[gate]={decision:decisions[gate],final_event_id:id,source_policy_ids:[policy.policy_id],grant_event_ids:[],deny_event_ids:deny,lock_event_ids:[],effective_scope_digest:scopeDigest};
  }
  const effectiveDigest=await sha({policy_id:policy.policy_id,decisions,resource:focus?.ref||null});
  const finalId=add({
    event_id:'trace-event:'+String(seq).padStart(3,'0')+'-resolution',type:'resolution_final',stage:'final',gate:null,
    policy_id:null,policy_revision:null,status:'resolved',effective_policy_digest:effectiveDigest,
    final_gate_event_ids:gateFinalIds,chain_head:null,cause_event_ids:Object.values(gateFinalIds)
  });
  return {
    schema:'policy-resolution-trace/v0.1',
    trace_id:'policy-trace:fi-'+eventRef.split(':').pop(),
    started_at:created,finished_at:new Date().toISOString(),
    resolver:{router_schema:'/agent-router.json',policy_schema:'/person-resource-policy.schema.json',inheritance_schema:'/policy-inheritance.schema.json',selector_schema:'/policy-selector.schema.json',implementation:'field-policy-trace.mjs',version:'0.1'},
    input_envelope:{event_ref:eventRef,source,channel,person_ref:null,resource_refs:focus?[focus.ref]:[],adapter_id:null,context_tags:['field-index','local-reference'],selector_facts_digest:selectorFactsDigest},
    policy_set:{ref:'policy-set:fi-local-reference',digest:policySetDigest,revisions:[{policy_id:policy.policy_id,revision:1,digest:policyDigest}]},
    events,gate_results:gateResults,
    result:{status:'resolved',effective_policy_digest:effectiveDigest,final_event_id:finalId,replayable:false,replay_limits:['reference FI policy material is generated locally and not embedded in trace']},
    privacy:{raw_payload_embedded:false,secret_values_embedded:false,trace_storage:'private_local',redaction_policy:'raw event text is processed locally to derive event_ref only and is not embedded in trace'},
    hash_chain:{enabled:false,canonicalization:'RFC8785-JCS',algorithm:'SHA-256',chain_head:null},
    _fi:{focus}
  };
}
function stripFi(trace){const x=structuredClone(trace);delete x._fi;return x}
function profile(trace,p){return verifyTrace(stripFi(trace),{profile:p})}
function renderGlyph(trace){
  const d=trace.gate_results,order=GATES,ang=i=>-Math.PI/2+i*Math.PI*2/order.length,cx=58,cy=58,r=39;
  const col=x=>x==='allow'?'#98d49b':x==='deny'?'#cc8792':x==='review'?'#d5ad68':'#72bce7';
  return '<svg viewBox="0 0 116 116" width="116" height="116" aria-label="seven gate policy glyph">'+
    '<circle cx="58" cy="58" r="15" fill="none" stroke="#2a3439"/>'+
    order.map((g,i)=>{const a=ang(i),x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;return '<line x1="58" y1="58" x2="'+x+'" y2="'+y+'" stroke="#273136"/><circle cx="'+x+'" cy="'+y+'" r="6" fill="#090d0f" stroke="'+col(d[g].decision)+'" stroke-width="2"/><text x="'+x+'" y="'+(y+2)+'" text-anchor="middle" fill="'+col(d[g].decision)+'" font-size="4">'+g[0].toUpperCase()+'</text>'}).join('')+
    '<text x="58" y="56" text-anchor="middle" fill="#edf0ed" font-size="6">TRACE</text><text x="58" y="64" text-anchor="middle" fill="#7d898f" font-size="4">'+trace.events.length+' EVT</text></svg>';
}
function style(){
  const el=document.createElement('style');el.textContent=`
#tracePanel{display:grid;grid-template-columns:minmax(260px,.85fr) minmax(0,1.4fr);gap:1px;background:var(--line);border:1px solid var(--line)}
.traceInput,.traceOut{background:#090d0f;padding:9px;min-width:0}.traceInput textarea,.traceInput select{width:100%;border:1px solid var(--line);border-radius:0;background:#070b0d;color:var(--ink);font:8px/1.45 ui-monospace,monospace;padding:7px}.traceInput textarea{min-height:88px;resize:vertical}.traceFields{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-top:5px}.traceButtons{display:flex;gap:4px;flex-wrap:wrap;margin-top:6px}.traceButtons button,.traceButtons a{border:1px solid var(--line);padding:5px 7px;font-size:7px;background:#090d0f}.traceButtons .run{border-color:var(--hot);color:#ffd0bd}.traceFocus{font-size:6px;color:var(--cool);margin-top:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.traceSummary{display:grid;grid-template-columns:116px minmax(0,1fr);gap:8px;align-items:center}.traceProfiles{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--line)}.traceProfile{background:#0b1012;padding:6px}.traceProfile b{font-size:8px}.traceProfile span{display:block;color:var(--mut);font-size:6px;margin-top:2px}.traceProfile.pass b{color:var(--green)}.traceProfile.fail b{color:var(--bad)}.traceProfile.indeterminate b{color:var(--gold)}
.traceGates{display:grid;grid-template-columns:repeat(7,1fr);gap:1px;background:var(--line);margin-top:6px}.traceGate{background:#0b1012;padding:5px}.traceGate b{font-size:6px;display:block}.traceGate span{font-size:7px}.traceEvents{margin-top:6px;border-top:1px solid var(--line);max-height:220px;overflow:auto}.traceEvent{display:grid;grid-template-columns:28px 132px 72px minmax(0,1fr);gap:5px;padding:4px 2px;border-bottom:1px solid #1d2529;font-size:6px}.traceEvent .typ{color:var(--cool)}.traceEvent .stage{color:var(--mut)}.traceEvent .gate{color:var(--gold)}
@media(max-width:760px){#tracePanel{grid-template-columns:1fr}.traceFields{grid-template-columns:1fr 1fr}.traceSummary{grid-template-columns:92px 1fr}.traceGates{grid-template-columns:repeat(4,1fr)}.traceEvent{grid-template-columns:25px 112px 58px minmax(0,1fr)}}`;document.head.appendChild(el);
}
let currentTrace=null,currentTraceFocusHref=null;
function render(trace){
  currentTrace=trace;
  currentTraceFocusHref=trace._fi?.focus?.href||null;
  const reports={structural:profile(trace,'structural'),replay:profile(trace,'replay'),sealed:profile(trace,'sealed')};
  $('traceMeta').textContent=(trace._fi?.focus?.title||'FIELD')+' · '+trace.events.length+' events · raw input not retained';
  $('traceGlyph').innerHTML=renderGlyph(trace);
  $('traceProfiles').innerHTML=Object.entries(reports).map(([k,r])=>'<div class="traceProfile '+r.status.toLowerCase()+'"><b>'+esc(k.toUpperCase())+' · '+esc(r.status)+'</b><span>'+r.summary.pass+' pass · '+r.summary.fail+' fail · '+r.summary.indeterminate+' ind</span></div>').join('');
  $('traceGates').innerHTML=GATES.map(g=>'<div class="traceGate"><b>'+g.toUpperCase()+'</b><span>'+esc(trace.gate_results[g].decision)+'</span></div>').join('');
  $('traceEvents').innerHTML=trace.events.map(e=>'<div class="traceEvent"><span>'+String(e.seq).padStart(2,'0')+'</span><span class="typ">'+esc(e.type)+'</span><span class="stage">'+esc(e.stage)+'</span><span class="gate">'+esc(e.gate||e.policy_id||'—')+'</span></div>').join('');
  $('traceCommit').disabled=false;$('traceExport').disabled=false;
}
function ledger(){try{return JSON.parse(localStorage.getItem('field.policy.trace.ledger.v01')||'[]')}catch(_){return []}}
function ledgerState(){const n=ledger().length;$('traceLedger').textContent=n+' local trace'+(n===1?'':'s')}
function commit(){
  if(!currentTrace)return;
  const xs=ledger();xs.push({...stripFi(currentTrace),committed_at:new Date().toISOString()});
  localStorage.setItem('field.policy.trace.ledger.v01',JSON.stringify(xs.slice(-30)));ledgerState();
}
function exportTrace(){
  if(!currentTrace)return;
  const blob=new Blob([JSON.stringify(stripFi(currentTrace),null,2)+'\n'],{type:'application/json'}),a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download=currentTrace.trace_id.replace(/[:/]/g,'-')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),800);
}
const DEMOS={
  COMMS:{text:'A known human asks: “Can you confirm Thursday and tell me what you need from me?” Prepare a useful reply, but do not send it.',source:'message',channel:'messaging',permission:'draft',stakes:'ordinary',effects:'none',why:'COMMS · read/answer/draft are separable from send/ACT.'},
  HOUSE:{text:'Humidity crossed the configured threshold. Consider turning on the focused house resource only if explicit ACT authority permits it.',source:'sensor',channel:'housebus',permission:'act',stakes:'ordinary',effects:'external',why:'HOUSE · the same trace exposes where physical consequence requires explicit ACT authority.'},
  CHANGE:{text:'Inspect the focused FIELD object and prepare one reversible improvement proposal. Do not publish or mutate canonical state.',source:'human',channel:'field',permission:'draft',stakes:'meaningful',effects:'local',why:'CHANGE · repository work uses the same gates without pretending a draft is permission to mutate.'}
};
function demoKind(){
  const h=focusResource()?.href||'';
  if(/^\/(?:port|contact|laconic)\//.test(h))return'COMMS';
  if(/^\/house\//.test(h))return'HOUSE';
  return'CHANGE';
}
async function applyDemo(kind){
  const d=DEMOS[kind||demoKind()]||DEMOS.CHANGE;
  $('traceText').value=d.text;$('traceSource').value=d.source;$('traceChannel').value=d.channel;$('tracePermission').value=d.permission;$('traceStakes').value=d.stakes;$('traceEffects').value=d.effects;
  $('traceWhy').textContent=d.why;
  await run();
}
async function run(){
  $('traceRun').disabled=true;$('traceRun').textContent='RUNNING…';
  try{
    const trace=await buildTrace({
      text:$('traceText').value,source:$('traceSource').value,channel:$('traceChannel').value,
      permission:$('tracePermission').value,stakes:$('traceStakes').value,effects:$('traceEffects').value
    });render(trace);
  }catch(e){$('traceMeta').textContent='TRACE ERROR · '+e.message}
  finally{$('traceRun').disabled=false;$('traceRun').textContent='RUN TRACE'}
}
function mount(){
  const host=$('tracePanel');if(!host)return;style();
  host.innerHTML=`<div class="traceInput">
    <div class="ey">LOCAL REFERENCE POLICY · NO NETWORK ACTION</div>
    <textarea id="traceText">Draft a bounded reply about the currently focused FIELD object, but do not send anything.</textarea>
    <div class="traceFields">
      <label><div class="ey">SOURCE</div><select id="traceSource"><option>human</option><option selected>message</option><option>sensor</option><option>schedule</option><option>internal</option></select></label>
      <label><div class="ey">CHANNEL</div><select id="traceChannel"><option selected>field</option><option>messaging</option><option>email</option><option>housebus</option></select></label>
      <label><div class="ey">AUTHORITY</div><select id="tracePermission"><option>none</option><option>read</option><option selected>draft</option><option>act</option></select></label>
      <label><div class="ey">STAKES</div><select id="traceStakes"><option selected>ordinary</option><option>meaningful</option><option>high</option></select></label>
    </div>
    <div class="traceFields" style="grid-template-columns:1fr"><label><div class="ey">SIDE EFFECT</div><select id="traceEffects"><option selected>none</option><option>local</option><option>external</option></select></label></div>
    <div class="traceFocus" id="traceFocus">focus → —</div>
    <div class="traceButtons"><button class="run" id="traceRun">RUN TRACE</button><button id="traceDemo">DEMO · AUTO</button><button id="traceDemoComms">COMMS</button><button id="traceDemoHouse">HOUSE</button><button id="traceDemoChange">CHANGE</button><button id="traceCommit">COMMIT TRACE</button><button id="traceExport">EXPORT</button><a href="./router-bench/">ROUTER BENCH</a><span class="traceFocus" id="traceLedger">0 local traces</span></div>
    <div class="traceFocus" id="traceWhy">same law · unequal domains · focus remains identity, not authority</div>
  </div><div class="traceOut"><div class="traceSummary"><div id="traceGlyph"></div><div id="traceProfiles" class="traceProfiles"></div></div><div id="traceGates" class="traceGates"></div><div id="traceEvents" class="traceEvents"></div></div>`;
  const syncFocus=()=>{
    const f=focusResource(),href=f?.href||null;
    $('traceFocus').textContent='focus → '+(f?(f.title+' · '+f.href):'none');
    const stale=!!currentTrace&&currentTraceFocusHref!==href;
    $('traceCommit').disabled=stale||!currentTrace;
    $('traceExport').disabled=!currentTrace;
    if(stale){
      $('traceMeta').textContent='STALE BINDING · trace '+(currentTraceFocusHref||'FIELD')+' ≠ current '+(href||'FIELD')+' · RUN TRACE';
      $('traceMeta').style.color='var(--gold)';
    }else if(currentTrace){
      $('traceMeta').textContent=(currentTrace._fi?.focus?.title||'FIELD')+' · '+currentTrace.events.length+' events · bound to current focus';
      $('traceMeta').style.color='';
    }
  };
  $('traceRun').onclick=run;$('traceDemo').onclick=()=>applyDemo();$('traceDemoComms').onclick=()=>applyDemo('COMMS');$('traceDemoHouse').onclick=()=>applyDemo('HOUSE');$('traceDemoChange').onclick=()=>applyDemo('CHANGE');$('traceCommit').onclick=commit;$('traceExport').onclick=exportTrace;
  $('traceFold').addEventListener('toggle',()=>{if($('traceFold').open){syncFocus();if(!currentTrace)applyDemo()}});
  window.addEventListener('field-index:state',syncFocus);
  window.addEventListener('field-trace:open',()=>{syncFocus();if(!currentTrace||currentTraceFocusHref!==(focusResource()?.href||null))applyDemo()});
  ledgerState();syncFocus();
  if($('traceFold').open&&!currentTrace)applyDemo();
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',mount); else mount();
