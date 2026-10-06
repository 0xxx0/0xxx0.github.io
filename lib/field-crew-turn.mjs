const STATUS=new Set(['CHANGED','UNCHANGED','FAILED','BLOCKED','UNKNOWN']);
const text=v=>String(v??'').replace(/\s+/g,' ').trim();
const obj=(v,name)=>{if(!v||typeof v!=='object'||Array.isArray(v))throw new Error('FIELD_CREW_TURN_'+name+'_OBJECT_REQUIRED');return v};
const req=(o,k,scope)=>{const v=o?.[k];if(v==null||text(v)==='')throw new Error('FIELD_CREW_TURN_'+scope+'_'+k.toUpperCase()+'_REQUIRED');return v};
const refs=v=>{if(v==null)return[];if(!Array.isArray(v))throw new Error('FIELD_CREW_TURN_TRACE_EVIDENCE_ARRAY_REQUIRED');return v.map(text).filter(Boolean)};

export function compileCrewTurn(packet){
  obj(packet,'PACKET');
  if(packet.schema!=='field-crew-turn/v0.1')throw new Error('FIELD_CREW_TURN_SCHEMA');
  const source=obj(packet.source,'SOURCE'),hold=obj(packet.hold,'HOLD'),turn=obj(packet.turn,'TURN'),trace=obj(packet.trace,'TRACE'),ret=obj(packet.return,'RETURN');
  const object=text(req(source,'object','SOURCE'));
  const owner=text(req(source,'owner','SOURCE'));
  const delta=text(req(hold,'delta','HOLD'));
  const move=text(req(turn,'move','TURN'));
  const release=text(req(turn,'release','TURN'));
  const status=text(req(trace,'status','TRACE')).toUpperCase();
  if(!STATUS.has(status))throw new Error('FIELD_CREW_TURN_TRACE_STATUS_'+status);
  const result=text(req(trace,'result','TRACE'));
  const evidence=refs(trace.evidence);
  if((status==='CHANGED'||status==='UNCHANGED')&&!evidence.length)throw new Error('FIELD_CREW_TURN_EVIDENCE_REQUIRED_FOR_'+status);
  const gate=ret.gate==null?null:text(ret.gate)||null;
  const to=text(req(ret,'to','RETURN'));
  return Object.freeze({
    schema:'field-crew-turn/v0.1',
    authority:'NONE / TRANSIENT SAME-OBJECT HANDOFF',
    source:Object.freeze({object,owner}),
    hold:Object.freeze({delta}),
    turn:Object.freeze({move,release}),
    trace:Object.freeze({status,result,evidence:Object.freeze(evidence)}),
    return:Object.freeze({gate,to,next_authority:'NONE'}),
    laws:Object.freeze([
      'SAME OBJECT, NOT SHARED INTERNAL STATE.',
      'SOURCE.OBJECT IS IMMUTABLE FOR THIS TURN.',
      'TURN.MOVE IS EXACTLY ONE HOST-NATIVE OPERATION.',
      'TURN.RELEASE NAMES THE HOST-NATIVE EFFECT BOUNDARY OR NONE.',
      'CHANGED / UNCHANGED MATERIAL CLAIMS REQUIRE EVIDENCE.',
      'RETURN CLOSES AUTHORITY; THERE IS NO NEXT OR ACTOR FIELD.'
    ])
  });
}

export function crewTurnLine(packet){
  const p=packet?.authority?packet:compileCrewTurn(packet);
  const ev=p.trace.evidence.length?' ['+p.trace.evidence.join(' · ')+']':'';
  const gate=p.return.gate?' [gate:'+p.return.gate+']':'';
  return '@'+p.source.object+' [owner:'+p.source.owner+'] Δ '+p.hold.delta+' → '+p.turn.move+' / release:'+p.turn.release+' → '+p.trace.status+': '+p.trace.result+ev+' ↩ '+p.return.to+gate;
}

export function crewTurnMarkdown(packet){
  const p=packet?.authority?packet:compileCrewTurn(packet);
  return [
    '# FIELD CREW TURN',
    'schema: '+p.schema,
    'authority: '+p.authority,
    '',
    'SOURCE  '+p.source.object+' · owner '+p.source.owner,
    'HOLD    Δ '+p.hold.delta,
    'TURN    '+p.turn.move+' · release '+p.turn.release,
    'TRACE   '+p.trace.status+' · '+p.trace.result+(p.trace.evidence.length?' · '+p.trace.evidence.join(' · '):''),
    'RETURN  '+p.return.to+' · gate '+(p.return.gate??'CLEAR')+' · next_authority NONE',
    '',
    crewTurnLine(p),
    ''
  ].join('\n');
}
