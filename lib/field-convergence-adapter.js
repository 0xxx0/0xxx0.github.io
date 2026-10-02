(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.FieldConvergenceAdapter=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const SCHEMA='field-convergence-adapter/v0.1';
  const MEDIA_SCHEMA='media-projection-contract/v0.1';
  const ACTION_SCHEMA='field-action-handoff/v0.1';
  const RETURN_SCHEMA='field-return-envelope/v0.1';
  const AVAILABLE='AVAILABLE';
  const clean=x=>String(x??'').trim();
  const upper=x=>clean(x).toUpperCase();
  function baseHref(target){
    const s=clean(target); if(!s)return null;
    try{ const u=new URL(s,'https://field.invalid'); return u.pathname.endsWith('/')?u.pathname:u.pathname+'/'; }
    catch(_){ return s.split(/[?#]/)[0]||null; }
  }
  function routeIdentity(route){
    if(!route||typeof route!=='object')return null;
    return {href:clean(route.href)||'/',title:clean(route.title)||clean(route.href)||'UNTITLED',version:clean(route.version)||null,owner:clean(route.field?.owner)||null,operation:clean(route.operation)||null,state:clean(route.state)||null};
  }
  function nativeActions(route){
    return (route?.field?.exit_paths||[])
      .filter(x=>upper(x?.status)===AVAILABLE && clean(x?.target))
      .map((x,i)=>({id:`${clean(route.href)||'/'}#${i}`,class:clean(x.class)||'ROUTE',label:clean(x.via)||clean(x.class)||'OPEN',target:clean(x.target),target_href:baseHref(x.target),status:AVAILABLE}));
  }
  function evidenceRefs(route){
    const refs=[];
    for(const x of [route?.receipt,route?.latest_return,route?.convergence_return,route?.interphase_return]) if(clean(x)&&!refs.includes(clean(x)))refs.push(clean(x));
    return refs;
  }
  function preserved(route){
    const p=route?.contract?.transforms?.preserves;
    const out=Array.isArray(p)?p.filter(Boolean).map(String):[];
    for(const x of ['route identity','native owner authority','exact RETURN path']) if(!out.includes(x))out.push(x);
    return out;
  }
  function actionHandoff(route,action,opts={}){
    if(!route)throw new Error('route required');
    const acts=nativeActions(route); const chosen=typeof action==='number'?acts[action]:acts.find(a=>a.id===action?.id||a.target===action?.target)||action;
    if(!chosen||!clean(chosen.target))throw new Error('explicit AVAILABLE target required');
    const source=routeIdentity(route);
    return {schema:ACTION_SCHEMA,authority:'PROPOSAL_ONLY',source,action:{class:chosen.class,label:chosen.label,target:chosen.target,target_href:chosen.target_href},preserves:preserved(route),evidence:evidenceRefs(route),return_to:opts.return_to||source.href,law:'handoff proposes one bounded host-native move; target host decides effect and must produce its own witness/RETURN'};
  }
  function projectionContract(route,opts={}){
    if(!route)throw new Error('route required');
    const source=routeIdentity(route);
    const exits=nativeActions(route);
    const reads=['route identity','declared state','native owner','declared operation','AVAILABLE native exits','evidence/receipt references'];
    const hides=['full event/history detail','undeclared semantics','host-internal state not present in manifest','effect authority'];
    const channels={enclosure:'scope / addressed object',connection:'declared route or AVAILABLE native exit only',salience:'task relevance within this projection',color:'state/status only when redundantly labeled',position:'relation/layout only; never authority'};
    return {schema:MEDIA_SCHEMA,authority:'VIEW_ONLY',source,task:clean(opts.task)||'communicate one addressed object and its lawful next moves without changing authority',reads,preserves:preserved(route),hides,permits:['inspect','copy','render','compare'],forbids:['mint authority','invent undeclared edges','treat projection as evidence','silently change identity'],channels,degradation:['small-size identity survives','grayscale/status remains legible','crop retains source identity or is rejected','reduced-motion retains state semantics'],residue:{native_exits:exits.map(x=>({class:x.class,label:x.label,target:x.target})),evidence:evidenceRefs(route)},return_to:opts.return_to||source.href};
  }
  function returnEnvelope(route,delta={},opts={}){
    if(!route)throw new Error('route required');
    const source=routeIdentity(route);
    return {schema:RETURN_SCHEMA,authority:'EVIDENCE_ONLY',source,before:delta.before??null,after:delta.after??null,delta:delta.delta??null,residue:delta.residue??[],evidence:delta.evidence??evidenceRefs(route),result:upper(delta.result||'INDETERMINATE'),return_to:opts.return_to||source.href,next:'NONE_UNTIL_REPLAN'};
  }
  function validate(packet){
    const errors=[]; if(!packet||typeof packet!=='object')return {ok:false,errors:['packet required']};
    if(packet.schema===ACTION_SCHEMA){if(packet.authority!=='PROPOSAL_ONLY')errors.push('action authority');if(!clean(packet.action?.target))errors.push('action target');if(!clean(packet.return_to))errors.push('return_to');}
    else if(packet.schema===MEDIA_SCHEMA){if(packet.authority!=='VIEW_ONLY')errors.push('media authority');if(!Array.isArray(packet.hides)||!packet.hides.length)errors.push('media hides');if(!Array.isArray(packet.forbids)||!packet.forbids.length)errors.push('media forbids');}
    else if(packet.schema===RETURN_SCHEMA){if(packet.authority!=='EVIDENCE_ONLY')errors.push('return authority');if(packet.next!=='NONE_UNTIL_REPLAN')errors.push('return next');}
    else errors.push('unknown schema'); return {ok:!errors.length,errors};
  }
  return Object.freeze({SCHEMA,MEDIA_SCHEMA,ACTION_SCHEMA,RETURN_SCHEMA,baseHref,routeIdentity,nativeActions,evidenceRefs,preserved,actionHandoff,projectionContract,returnEnvelope,validate});
});
