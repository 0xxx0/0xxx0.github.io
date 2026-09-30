(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.InterphaseCarrier=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const SCHEMA='interphase-carrier/v0.1';
  const AUTHORITY='NONE / HANDOFF ONLY';
  const MOVE_AUTHORITIES=Object.freeze(['VIEW','NAVIGATION','EDIT','EFFECT','OFFER']);
  const WITNESS_CLASSES=Object.freeze(['UNPROVED','OBSERVED','EVIDENCE','RETURN']);
  const ACTION_SCHEMA='interphase-action-surface/v0.1';
  const CANONICAL_ACTIONS=Object.freeze(['HOLD','TURN','RELEASE','TRACE','RETURN']);
  const ATTENTION_GRAMMAR=Object.freeze([
    Object.freeze({phase:'WAKE',office:'SOURCE'}),Object.freeze({phase:'CUT',office:'FRAME'}),
    Object.freeze({phase:'HOLD',office:'FOCUS'}),Object.freeze({phase:'TURN',office:'OPERATE'}),
    Object.freeze({phase:'TRACE',office:'WITNESS'}),Object.freeze({phase:'AGAIN',office:'RETURN'})
  ]);

  const isObj=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
  const text=(x,f='')=>x==null?f:String(x);
  const arr=x=>Array.isArray(x)?x:[];
  const clone=x=>x==null?x:JSON.parse(JSON.stringify(x));
  const uniq=xs=>[...new Set((xs||[]).filter(Boolean))];
  const canonical=x=>Array.isArray(x)?x.map(canonical):(isObj(x)?Object.keys(x).sort().reduce((o,k)=>(o[k]=canonical(x[k]),o),{}):x);
  const stable=x=>JSON.stringify(canonical(x));
  const now=()=>new Date().toISOString();
  function hashString(value){
    let hash=2166136261;
    for(const ch of text(value).normalize('NFC')){hash^=ch.codePointAt(0)??0;hash=Math.imul(hash,16777619)}
    return(hash>>>0).toString(36).padStart(7,'0');
  }

  function classifyAction(input={}){
    const explicit=text(input.action||input.canonicalAction).toUpperCase();
    if(CANONICAL_ACTIONS.includes(explicit))return explicit;
    const authority=MOVE_AUTHORITIES.includes(input.authority)?input.authority:'VIEW';
    const cue=(text(input.id||input.operation)+' '+text(input.label)).toUpperCase();
    if(/(^|[^A-Z])(RETURN|BACK TO SOURCE)([^A-Z]|$)/.test(cue))return 'RETURN';
    if(/(^|[^A-Z])(TRACE|WITNESS)([^A-Z]|$)/.test(cue))return 'TRACE';
    if(/(^|[^A-Z])(HOLD|FOCUS|SELECT)([^A-Z]|$)/.test(cue))return 'HOLD';
    return authority==='EFFECT'?'RELEASE':'TURN';
  }

  function normalizeMove(input={},i=0){
    const authority=MOVE_AUTHORITIES.includes(input.authority)?input.authority:'VIEW';
    return{
      id:text(input.id||input.operation||('MOVE_'+(i+1))),
      label:text(input.label||input.id||input.operation||('MOVE '+(i+1))),
      state:text(input.state||'AVAILABLE'),
      authority,
      action:classifyAction(input),
      target:text(input.target||input.href||input.address),
      requires:arr(input.requires).map(x=>text(x)).filter(Boolean),
      evidence:arr(input.evidence||input.evidenceRefs).map(x=>text(x)).filter(Boolean),
      dispatch:'HOST_NATIVE_ONLY',
      reversibility:text(input.reversibility||input.undo||'HOST_DEFINED')
    };
  }

  function normalize(input={}){
    const object=isObj(input.object)?input.object:{};
    const focus=isObj(input.focus)?input.focus:{};
    const witness=isObj(input.witness)?input.witness:{};
    const ret=isObj(input.return)?input.return:{};
    const projection=isObj(input.projection)?input.projection:{};
    const owner=text(object.owner||input.owner||projection.host);
    const objectId=text(object.id||input.objectId||input.object_id||object.address||input.address);
    const objectAddress=text(object.address||input.address||objectId);
    const focusId=text(focus.id||focus.objectId||objectId);
    const focusAddress=text(focus.address||objectAddress);
    const moves=arr(input.next||input.moves).slice(0,3).map(normalizeMove);
    const out={
      schema:SCHEMA,
      frameId:'',
      createdAt:text(input.createdAt||input.created_at||now()),
      authority:AUTHORITY,
      object:{
        id:objectId,
        kind:text(object.kind||input.kind||'object'),
        label:text(object.label||input.label||objectId),
        owner,
        address:objectAddress,
        contract:text(object.contract||input.contract)
      },
      focus:{
        id:focusId,
        label:text(focus.label||focusId),
        address:focusAddress,
        aperture:text(focus.aperture||'DETAIL')
      },
      next:moves,
      witness:{
        class:WITNESS_CLASSES.includes(witness.class)?witness.class:'UNPROVED',
        summary:text(witness.summary||witness.note),
        evidenceRefs:uniq(arr(witness.evidenceRefs||witness.evidence).map(x=>text(x)))
      },
      return:{
        address:text(ret.address||input.returnAddress||input.return_to),
        owner:text(ret.owner||owner),
        label:text(ret.label||'RETURN')
      },
      projection:{
        host:text(projection.host||input.host||owner),
        name:text(projection.name||projection.projection||input.projectionName||'SOURCE'),
        channels:uniq(arr(projection.channels).map(x=>text(x))),
        residue:clone(arr(projection.residue))
      },
      sourceRefs:uniq(arr(input.sourceRefs||input.source_refs).map(x=>text(x))),
      lineage:{
        parentFrameId:text(input.parentFrameId||input.parent_frame_id),
        handoffId:text(input.handoffId||input.handoff_id)
      },
      meta:isObj(input.meta)?clone(input.meta):{}
    };
    out.frameId='ipc:'+hashString(stable({
      object:out.object,focus:out.focus,return:out.return,
      projection:{host:out.projection.host,name:out.projection.name}
    }));
    return out;
  }

  function validate(input){
    const raw=isObj(input)?input:{},rawMoves=arr(raw.next||raw.moves),x=normalize(raw),errors=[];
    if(raw.authority!=null&&raw.authority!==AUTHORITY)errors.push('carrier authority is fixed and cannot be elevated');
    if(rawMoves.length>3)errors.push('next exceeds 3');
    rawMoves.forEach((m,i)=>{
      const explicit=isObj(m)?text(m.action||m.canonicalAction).toUpperCase():'';
      if(explicit&&!CANONICAL_ACTIONS.includes(explicit))errors.push('move '+i+' action invalid');
      if(isObj(m)&&m.authority!=null&&!MOVE_AUTHORITIES.includes(m.authority))errors.push('move '+i+' authority invalid');
      if(isObj(m)&&m.dispatch!=null&&m.dispatch!=='HOST_NATIVE_ONLY')errors.push('move '+i+' dispatch must remain HOST_NATIVE_ONLY');
    });
    if(!x.object.id)errors.push('object.id required');
    if(!x.object.owner)errors.push('object.owner required');
    if(!x.object.address)errors.push('object.address required');
    if(!x.focus.id)errors.push('focus.id required');
    if(!x.focus.address)errors.push('focus.address required');
    if(!x.return.address)errors.push('return.address required');
    for(const m of x.next){
      if(!m.id||!m.label)errors.push('move id/label required');
      if(!MOVE_AUTHORITIES.includes(m.authority))errors.push('move authority invalid');
      if(m.dispatch!=='HOST_NATIVE_ONLY')errors.push('carrier cannot dispatch effects');
    }
    if(x.authority!==AUTHORITY)errors.push('carrier authority invalid');
    return{ok:errors.length===0,errors,carrier:x};
  }

  function make(input){
    const v=validate(input);
    if(!v.ok)throw new Error('INTERPHASE_CARRIER_INVALID:'+v.errors.join('|'));
    return v.carrier;
  }

  function fromProjection(result={},extra={}){
    const nodes=arr(result.nodes),focuses=arr(result.focus),selection=arr(result.selection);
    const preferred=text(extra.objectId||focuses.at(-1)?.id||selection.at(-1));
    const node=nodes.find(n=>text(n.id)===preferred)||nodes[0]||{};
    const addr=isObj(node.address)?node.address:{};
    const address=text(extra.address||addr.canonical||addr.href||addr.text||node.id||preferred);
    return make({
      object:{
        id:text(extra.objectId||node.id||preferred||address),
        kind:text(extra.kind||node.kind||'projection-object'),
        label:text(extra.label||node.label||node.id||preferred||address),
        owner:text(extra.owner||result.host||'HOST'),
        address,
        contract:text(extra.contract)
      },
      focus:{
        id:text(extra.focusId||preferred||node.id||address),
        label:text(extra.focusLabel||node.label||preferred||address),
        address:text(extra.focusAddress||address),
        aperture:text(extra.aperture||focuses.at(-1)?.aperture||'DETAIL')
      },
      next:extra.next||[],
      witness:extra.witness||{},
      return:extra.return||{address:extra.returnAddress||address,owner:extra.owner||result.host||'HOST'},
      projection:{
        host:text(result.host||extra.owner||'HOST'),
        name:text(result.projection||'PAGE'),
        channels:arr(result.spec?.channels),
        residue:arr(result.residue)
      },
      sourceRefs:extra.sourceRefs||[],
      parentFrameId:extra.parentFrameId,
      handoffId:extra.handoffId,
      meta:extra.meta||{}
    });
  }

  function withWitness(input,witness={}){
    const x=normalize(input);
    return make({...x,witness:{...x.witness,...clone(witness)},parentFrameId:x.frameId});
  }
  function withNext(input,next=[]){
    const x=normalize(input);
    return make({...x,next,parentFrameId:x.frameId});
  }
  function sameObject(a,b){
    const x=normalize(a),y=normalize(b);
    return x.object.id===y.object.id&&x.object.owner===y.object.owner&&x.object.address===y.object.address;
  }
  function forecastAction(input={}){
    const m=normalizeMove(input,0),table={
      VIEW:{effect:'READ_ONLY',commit:'NO_COMMIT',sourceMutation:'NONE'},
      NAVIGATION:{effect:'NAVIGATION_ONLY',commit:'NAVIGATION',sourceMutation:'NONE'},
      OFFER:{effect:'OFFER_ONLY',commit:'RECEIVER_ACCEPTS',sourceMutation:'NONE'},
      EDIT:{effect:'HOST_EDIT',commit:'HOST_NATIVE',sourceMutation:'HOST_DEFINED'},
      EFFECT:{effect:'HOST_EFFECT',commit:'HOST_NATIVE',sourceMutation:'HOST_DEFINED'}
    },f=table[m.authority]||table.VIEW;
    return{schema:'interphase-action-forecast/v0.1',effect:f.effect,authority:m.authority,commit:f.commit,sourceMutation:f.sourceMutation,target:m.target,dispatch:m.dispatch,reversibility:m.reversibility||'HOST_DEFINED'};
  }
  function actionSurface(input){
    const x=make(input);
    return{
      schema:ACTION_SCHEMA,authority:AUTHORITY,
      object:clone(x.object),focus:clone(x.focus),
      hold:{action:'HOLD',id:x.focus.id,label:x.focus.label,address:x.focus.address,aperture:x.focus.aperture},
      actions:x.next.map(m=>({action:m.action,id:m.id,label:m.label,state:m.state,authority:m.authority,target:m.target,dispatch:m.dispatch,forecast:forecastAction(m)})),
      witness:{action:'TRACE',...clone(x.witness)},
      return:{action:'RETURN',...clone(x.return)},
      cadence:ATTENTION_GRAMMAR.map(clone),
      residue:clone(x.projection.residue),sourceRefs:clone(x.sourceRefs),frameId:x.frameId
    };
  }

  function serialize(input){return stable(make(input))}
  function deserialize(raw){return make(typeof raw==='string'?JSON.parse(raw):raw)}
  function store(input,key='interphase.carrier.v01',storage){
    const target=storage||(typeof sessionStorage!=='undefined'?sessionStorage:null);
    if(!target)throw new Error('INTERPHASE_CARRIER_STORAGE_UNAVAILABLE');
    const x=make(input);target.setItem(key,serialize(x));return x;
  }
  function read(key='interphase.carrier.v01',storage){
    const target=storage||(typeof sessionStorage!=='undefined'?sessionStorage:null);
    if(!target)return null;const raw=target.getItem(key);if(!raw)return null;
    try{return deserialize(raw)}catch(_){return null}
  }

  return Object.freeze({
    SCHEMA,AUTHORITY,MOVE_AUTHORITIES,WITNESS_CLASSES,ACTION_SCHEMA,CANONICAL_ACTIONS,ATTENTION_GRAMMAR,
    classifyAction,forecastAction,normalize,validate,make,fromProjection,withWitness,withNext,sameObject,actionSurface,
    serialize,deserialize,store,read
  });
});
