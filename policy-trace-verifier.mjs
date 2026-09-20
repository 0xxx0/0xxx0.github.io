const GATES=['read','remember','acknowledge','answer','draft','act','escalate'];

const resultRank={PASS:0,INDETERMINATE:1,FAIL:2};

function out(id,status,severity='ERROR',details=null,evidence_event_ids=[]){
  return {id,status,severity,evidence_event_ids,details};
}

function knownEventRefs(trace){
  const refs=[];
  for(const e of trace.events||[]){
    for(const id of e.cause_event_ids||[]) refs.push(['cause_event_id',id,e.event_id]);
    if(e.source_event_id) refs.push(['source_event_id',e.source_event_id,e.event_id]);
    if(e.operation_event_id) refs.push(['operation_event_id',e.operation_event_id,e.event_id]);
    for(const id of e.selector_event_ids||[]) refs.push(['selector_event_id',id,e.event_id]);
    for(const id of e.dominates_event_ids||[]) refs.push(['dominates_event_id',id,e.event_id]);
    for(const id of e.blocked_event_ids||[]) refs.push(['blocked_event_id',id,e.event_id]);
    for(const id of e.winning_event_ids||[]) refs.push(['winning_event_id',id,e.event_id]);
    for(const id of e.grant_event_ids||[]) refs.push(['grant_event_id',id,e.event_id]);
    for(const id of e.deny_event_ids||[]) refs.push(['deny_event_id',id,e.event_id]);
    for(const id of e.lock_event_ids||[]) refs.push(['lock_event_id',id,e.event_id]);
    if(e.final_gate_event_ids) for(const id of Object.values(e.final_gate_event_ids)) refs.push(['final_gate_event_id',id,e.event_id]);
  }
  for(const g of GATES){
    const x=trace.gate_results?.[g];
    if(x?.final_event_id) refs.push(['gate_results.final_event_id',x.final_event_id,'gate_results:'+g]);
    for(const id of x?.grant_event_ids||[]) refs.push(['gate_results.grant_event_id',id,'gate_results:'+g]);
    for(const id of x?.deny_event_ids||[]) refs.push(['gate_results.deny_event_id',id,'gate_results:'+g]);
    for(const id of x?.lock_event_ids||[]) refs.push(['gate_results.lock_event_id',id,'gate_results:'+g]);
  }
  if(trace.result?.final_event_id) refs.push(['result.final_event_id',trace.result.final_event_id,'result']);
  return refs;
}

export function verifyStructural(trace,{schemaValidator=null,now=()=>new Date().toISOString()}={}){
  const checks=[];
  if(schemaValidator){
    try{
      const v=schemaValidator(trace);
      checks.push(out('schema.valid',v===true?'PASS':'FAIL','ERROR',v===true?null:String(v||'schema validation failed')));
    }catch(e){
      checks.push(out('schema.valid','FAIL','ERROR','schema validator threw: '+String(e?.message||e)));
    }
  }else{
    checks.push(out('schema.valid','INDETERMINATE','ERROR','no JSON-Schema validator supplied'));
  }

  const events=Array.isArray(trace?.events)?trace.events:[];
  checks.push(out('seq.contiguous',
    events.every((e,i)=>e?.seq===i)?'PASS':'FAIL',
    'ERROR',
    events.every((e,i)=>e?.seq===i)?null:'seq must be contiguous from 0'
  ));

  const ids=events.map(e=>e?.event_id);
  const unique=new Set(ids);
  checks.push(out('event.ids.unique',unique.size===ids.length&&ids.every(Boolean)?'PASS':'FAIL','ERROR',
    unique.size===ids.length&&ids.every(Boolean)?null:'event_id missing or duplicated'));

  const byId=new Map(events.map(e=>[e.event_id,e]));
  const backward=events.every(e=>(e.cause_event_ids||[]).every(id=>byId.has(id)&&byId.get(id).seq<e.seq));
  checks.push(out('causes.backward',backward?'PASS':'FAIL','ERROR',backward?null:'cause reference missing or not backward'));

  const refs=knownEventRefs(trace);
  const badRefs=refs.filter(([,id])=>!byId.has(id));
  checks.push(out('references.internal',badRefs.length?'FAIL':'PASS','ERROR',
    badRefs.length?badRefs.map(x=>x.join(':')).join(', '):null));

  const finals=events.filter(e=>e.type==='gate_final');
  const counts=Object.fromEntries(GATES.map(g=>[g,finals.filter(e=>e.gate===g).length]));
  const seven=GATES.every(g=>counts[g]===1)&&finals.length===7;
  checks.push(out('finality.seven-gates',seven?'PASS':'FAIL','ERROR',seven?null:JSON.stringify(counts),finals.map(e=>e.event_id)));

  const resolutions=events.filter(e=>e.type==='resolution_final');
  const one=resolutions.length===1&&trace?.result?.final_event_id===resolutions[0]?.event_id;
  checks.push(out('finality.one-resolution',one?'PASS':'FAIL','ERROR',
    one?null:'must have exactly one resolution_final referenced by result.final_event_id',
    resolutions.map(e=>e.event_id)));

  const p=trace?.privacy||{};
  checks.push(out('privacy.no-raw-payload',p.raw_payload_embedded===false?'PASS':'FAIL','ERROR',
    p.raw_payload_embedded===false?null:'raw_payload_embedded must be false'));
  checks.push(out('privacy.no-secrets',p.secret_values_embedded===false?'PASS':'FAIL','ERROR',
    p.secret_values_embedded===false?null:'secret_values_embedded must be false'));

  const tagEvents=events.filter(e=>e.type==='selector_evaluated').flatMap(e=>
    (e.clauses||[]).filter(c=>c.kind==='tag'&&c.matched).map(c=>({event:e,clause:c}))
  );
  const badTag=tagEvents.filter(({clause})=>!clause.fact_provenance && !trace?.input_envelope?.selector_facts_digest);
  checks.push(out('selectors.tag-provenance',badTag.length?'FAIL':'PASS','ERROR',
    badTag.length?'matched tag clauses lack fact_provenance and selector_facts_digest':null,
    badTag.map(x=>x.event.event_id)));

  const errors=checks.filter(c=>c.severity==='ERROR');
  let status='PASS';
  for(const c of errors) if(resultRank[c.status]>resultRank[status]) status=c.status;
  const summary={
    pass:checks.filter(c=>c.status==='PASS').length,
    fail:checks.filter(c=>c.status==='FAIL').length,
    indeterminate:checks.filter(c=>c.status==='INDETERMINATE').length,
    skip:checks.filter(c=>c.status==='SKIP').length
  };
  return {
    schema:'policy-trace-verification-report/v0.1',
    trace_id:trace?.trace_id||'unknown',
    profile:'structural',
    status,
    verified_at:now(),
    verifier:{implementation:'policy-trace-verifier.mjs',version:'0.2'},
    checks,
    summary
  };
}

export function verifyReplay(trace,options={}){
  const report=verifyStructural(trace,options);
  const replayIds=[
    'policy-set.digest','policy-revisions.digest','selector-facts.digest','selectors.replay',
    'inheritance.replay','operations.complete','operations.replay','grants.authorized',
    'denies.complete','locks.complete','stages.replay','gates.replay','result.digest'
  ];
  for(const id of replayIds) report.checks.push(out(id,'INDETERMINATE','ERROR','private replay material/resolver not supplied to reference verifier'));
  report.profile='replay';
  report.summary={
    pass:report.checks.filter(c=>c.status==='PASS').length,
    fail:report.checks.filter(c=>c.status==='FAIL').length,
    indeterminate:report.checks.filter(c=>c.status==='INDETERMINATE').length,
    skip:report.checks.filter(c=>c.status==='SKIP').length
  };
  report.status=report.summary.fail?'FAIL':'INDETERMINATE';
  return report;
}

export function verifyTrace(trace,{profile='structural',...options}={}){
  if(profile==='structural') return verifyStructural(trace,options);
  if(profile==='replay') return verifyReplay(trace,options);

  const r=verifyReplay(trace,options);
  r.profile='sealed';

  const hc=trace?.hash_chain;
  if(!hc || hc.enabled!==true){
    r.checks.push(out('hash.enabled','FAIL','ERROR','sealed profile requires hash_chain.enabled == true'));
    r.checks.push(out('hash.canonicalization','SKIP','ERROR','seal absent/disabled'));
    r.checks.push(out('hash.chain','SKIP','ERROR','seal absent/disabled'));
    r.checks.push(out('hash.head','SKIP','ERROR','seal absent/disabled'));
  }else{
    const profileOk=hc.canonicalization==='RFC8785-JCS' && hc.algorithm==='SHA-256';
    r.checks.push(out('hash.enabled','PASS','ERROR',null));
    r.checks.push(out('hash.canonicalization',profileOk?'PASS':'FAIL','ERROR',
      profileOk?null:'sealed trace must declare RFC8785-JCS + SHA-256'));
    r.checks.push(out('hash.chain','INDETERMINATE','ERROR',
      'reference verifier does not embed RFC8785-JCS/SHA-256 hash recomputation'));
    r.checks.push(out('hash.head','INDETERMINATE','ERROR',
      'chain head cannot be certified until event hashes are recomputed'));
  }

  r.summary={
    pass:r.checks.filter(c=>c.status==='PASS').length,
    fail:r.checks.filter(c=>c.status==='FAIL').length,
    indeterminate:r.checks.filter(c=>c.status==='INDETERMINATE').length,
    skip:r.checks.filter(c=>c.status==='SKIP').length
  };
  r.status=r.summary.fail?'FAIL':(r.summary.indeterminate?'INDETERMINATE':'PASS');
  return r;
}
