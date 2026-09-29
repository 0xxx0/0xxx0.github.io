(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.FieldPacketEgress=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const VERSION='field-packet-egress/v0.1';
  const CATEGORIES=Object.freeze(['NOW','DELTA','RESIDUE','GATE','NEXT','ARCHIVE']);
  const REQUIRED=Object.freeze(['OBJECT','AUTHORITY','STATE_IN','DELTA','EVIDENCE','STATE_OUT','RESIDUE','WAITING','NEXT','STOP']);

  const arr=x=>Array.isArray(x)?x:(x==null||x===''?[]:[x]);
  const text=x=>String(x??'').trim();
  const own=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);
  const present=x=>{
    if(x==null)return false;
    if(Array.isArray(x))return x.length>0;
    if(typeof x==='object')return Object.keys(x).length>0;
    if(typeof x==='boolean')return x;
    return text(x)!=='';
  };
  const compact=x=>{
    if(!present(x))return null;
    if(typeof x==='string')return x.replace(/\s+/g,' ').trim();
    return x;
  };
  const upper=x=>text(typeof x==='string'?x:JSON.stringify(x)).toUpperCase();

  function controlEligible(packet){
    return REQUIRED.every(k=>own(packet,k));
  }

  function standard(packet={},meta={}){
    const out={schema:VERSION,source_kind:'PACKET',source:meta.source||null,control_eligible:controlEligible(packet)};
    for(const k of REQUIRED)out[k]=own(packet,k)?packet[k]:null;
    out.id=packet.id||packet.ID||meta.id||null;
    out.route=packet.route||packet.ROUTE||meta.route||null;
    return out;
  }

  function fromLegacyPacket(record={},meta={}){
    return {
      schema:VERSION,
      source_kind:'LEGACY_PACKET_ADAPTER',
      source:meta.source||null,
      id:record.id||record.packet_id||meta.id||null,
      route:meta.route||record.route||null,
      control_eligible:false,
      OBJECT:record.object??record.target??record.subject??record.id??meta.source??null,
      AUTHORITY:record.authority??'LEGACY PACKET / EVIDENCE_ONLY',
      STATE_IN:record.state_in??record.before??null,
      DELTA:record.delta??record.artifacts??null,
      EVIDENCE:record.evidence??record.proof??record.verification??record.validation??record.ci??null,
      STATE_OUT:record.state_out??record.state??record.status??null,
      RESIDUE:record.residue??record.unknowns??record.conflicts??null,
      WAITING:record.waiting??null,
      NEXT:record.next??record.one_next??record.next_truth??record.next_information_gain??record.expected_return??null,
      STOP:record.stop??null
    };
  }

  function fromReturn(record={},meta={}){
    const evidence=record.evidence??record.proof??record.verification??record.validation??record.structural_validation??null;
    const next=record.next??record.one_next??record.next_executable??record.next_gate??null;
    const waiting=record.waiting??record.WAITING??(
      /WAITING|REAL_DEVICE_REQUIRED|PHYSICAL.*REQUIRED|HUMAN.*REQUIRED|PRIVATE_INPUT|WORLD.*REQUIRED/.test(upper(record.state)) ? next : null
    );
    return {
      schema:VERSION,
      source_kind:'RETURN_ADAPTER',
      source:meta.source||null,
      id:record.id||meta.id||null,
      route:meta.route||record.route||null,
      control_eligible:false,
      OBJECT:record.object??record.OBJECT??record.id??meta.source??null,
      AUTHORITY:record.authority??record.AUTHORITY??'EVIDENCE_ONLY / ADAPTED RETURN',
      STATE_IN:record.state_in??record.STATE_IN??record.before??null,
      DELTA:record.delta??record.DELTA??null,
      EVIDENCE:evidence,
      STATE_OUT:record.state_out??record.STATE_OUT??record.after??record.state??null,
      RESIDUE:record.residue??record.RESIDUE??record.unresolved??record.falsifier??null,
      WAITING:waiting,
      NEXT:next,
      STOP:record.stop??record.STOP??null
    };
  }

  function signals(packet={},ctx={}){
    const state=upper(packet.STATE_OUT);
    const terminal=/MERGED|SHIPPED|PROVED|VERIFIED|PASS|GREEN|COMPLETE|CLOSED/.test(state);
    const explicitNow=ctx.current===true || /(^|\W)(CURRENT|NOW)(\W|$)/.test(authority);
    const gate=present(packet.WAITING) || /WAITING|REAL_DEVICE_REQUIRED|PHYSICAL.*REQUIRED|HUMAN.*REQUIRED|PRIVATE_INPUT|WORLD.*REQUIRED/.test(state);
    const delta=present(packet.DELTA);
    const evidence=present(packet.EVIDENCE);
    const residue=present(packet.RESIDUE);
    const next=present(packet.NEXT);
    const stop=present(packet.STOP);
    return {explicitNow,gate,delta,evidence,residue,next,stop,terminal};
  }

  function classify(packet={},ctx={}){
    const s=signals(packet,ctx);
    // NOW may only come from explicit current authority/context. Packet content alone cannot self-promote.
    let primary;
    if(s.explicitNow&&!s.gate)primary='NOW';
    else if(s.gate)primary='GATE';
    else if(s.delta&&(s.terminal||s.evidence))primary='DELTA';
    else if(s.residue)primary='RESIDUE';
    else if(s.next)primary='NEXT';
    else if(s.delta)primary='DELTA';
    else primary='ARCHIVE';

    const facets=[];
    if(s.explicitNow)facets.push('NOW');
    if(s.delta)facets.push('DELTA');
    if(s.residue)facets.push('RESIDUE');
    if(s.gate)facets.push('GATE');
    if(s.next)facets.push('NEXT');
    if(!facets.length||primary==='ARCHIVE')facets.push('ARCHIVE');

    return Object.freeze({
      primary,
      facets:Object.freeze([...new Set(facets)]),
      reason:primary==='NOW'?'selected by external CURRENT context only':
        primary==='GATE'?'external/human/world prerequisite remains':
        primary==='DELTA'?'evidence-bearing state change':
        primary==='RESIDUE'?'unresolved returned work':
        primary==='NEXT'?'bounded lawful continuation only':
        'closed/non-control/insufficient live egress',
      signals:Object.freeze(s)
    });
  }

  function reduceOne(packet={},ctx={}){
    const c=classify(packet,ctx);
    return Object.freeze({
      schema:VERSION,
      id:packet.id||null,
      source:packet.source||null,
      source_kind:packet.source_kind||'PACKET',
      route:packet.route||null,
      object:compact(packet.OBJECT),
      authority:compact(packet.AUTHORITY),
      state_out:compact(packet.STATE_OUT),
      category:c.primary,
      facets:c.facets,
      reason:c.reason,
      control_eligible:packet.control_eligible===true,
      evidence_present:present(packet.EVIDENCE),
      delta_present:present(packet.DELTA),
      residue_present:present(packet.RESIDUE),
      waiting_present:present(packet.WAITING),
      next:arr(packet.NEXT).slice(0,3).map(compact).filter(Boolean),
      stop:compact(packet.STOP)
    });
  }

  function reduce(packets=[],ctxFor=()=>({})){
    const entries=packets.map((p,i)=>reduceOne(p,ctxFor(p,i)||{}));
    const counts=Object.fromEntries(CATEGORIES.map(k=>[k,0]));
    for(const e of entries)counts[e.category]=(counts[e.category]||0)+1;
    return Object.freeze({schema:VERSION,entries:Object.freeze(entries),counts:Object.freeze(counts)});
  }

  return Object.freeze({VERSION,CATEGORIES,REQUIRED,present,controlEligible,standard,fromReturn,fromLegacyPacket,signals,classify,reduceOne,reduce});
});
