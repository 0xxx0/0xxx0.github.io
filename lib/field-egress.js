(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.FieldEgress=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const OWN=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
  const empty=v=>v==null||v===''||(Array.isArray(v)&&v.length===0);
  const pick=(p,...keys)=>{for(const k of keys)if(OWN(p,k)&&!empty(p[k]))return p[k];return null};
  const text=v=>{if(v==null)return'';if(typeof v==='string')return v;try{return JSON.stringify(v)}catch(_){return String(v)}};
  const first3=v=>Array.isArray(v)?v.filter(x=>!empty(x)).slice(0,3):v;
  function reduce(packet){
    const p=packet&&typeof packet==='object'?packet:{};
    const object=pick(p,'OBJECT','object'),authority=pick(p,'AUTHORITY','authority'),stateIn=pick(p,'STATE_IN','state_in');
    const delta=pick(p,'DELTA','delta'),evidence=pick(p,'EVIDENCE','evidence'),stateOut=pick(p,'STATE_OUT','state_out');
    const residue=pick(p,'RESIDUE','residue','CONTRADICTION','contradiction');
    const waiting=pick(p,'WAITING','waiting','TRIGGER','trigger'),next=first3(pick(p,'NEXT','next')),stop=pick(p,'STOP','stop');
    const stopText=text(stop).toUpperCase();
    let bucket='ARCHIVE',source='EMPTY',payload=null;
    if(!empty(stop)&&/(CLOSE|CLOSED|DONE|COMPLETE|COMPLETED|ARCHIVE|ARCHIVED|COMPOST|SUPERSEDED)/.test(stopText)){
      bucket='ARCHIVE';source='STOP';payload=stop;
    }else if(!empty(waiting)||!empty(stop)){
      bucket='GATE';source=!empty(waiting)?'WAITING/TRIGGER':'STOP';payload=!empty(waiting)?waiting:stop;
    }else if(!empty(residue)){
      bucket='RESIDUE';source='RESIDUE/CONTRADICTION';payload=residue;
    }else if(!empty(delta)){
      bucket='DELTA';source='DELTA';payload=delta;
    }else if(!empty(next)){
      bucket='NEXT';source='NEXT';payload=next;
    }else if(!empty(stateOut)||!empty(stateIn)||!empty(object)){
      bucket='NOW';source=!empty(stateOut)?'STATE_OUT':(!empty(stateIn)?'STATE_IN':'OBJECT');payload=!empty(stateOut)?stateOut:(!empty(stateIn)?stateIn:object);
    }
    return Object.freeze({
      schema:'field-packet-egress/v0.1',bucket,source,payload,authority:'DERIVED_READ_ONLY',
      provenance:Object.freeze({object:object??null,authority:authority??null,state_in:stateIn??null,evidence:evidence??null})
    });
  }
  return Object.freeze({reduce});
});
