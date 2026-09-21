(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.RoomCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const SCHEMA='0xxx0/interphase/v0.1';
  const FACE_ORDER=['F','R','B','L','U','D'];
  const FACES=Object.freeze({
    F:{id:'F',axis:'+Z',name:'PRESENT',role:'OBJECT',question:'What is here now?',reads:['object','state','role']},
    B:{id:'B',axis:'-Z',name:'RETURN',role:'PROVENANCE',question:'What brought this here, and how does it return?',reads:['receipt','versions','transfer']},
    L:{id:'L',axis:'-X',name:'INPUT',role:'CONTEXT',question:'What enters, constrains, or precedes this object?',reads:['accepts','inputs','parent']},
    R:{id:'R',axis:'+X',name:'OUTPUT',role:'ACTION',question:'What may leave, transform, or become reachable?',reads:['emits','outputs','exit_paths']},
    U:{id:'U',axis:'+Y',name:'INTENTION',role:'PURPOSE',question:'What governs this instrument when presentation changes?',reads:['question','hypothesis','purpose','verb']},
    D:{id:'D',axis:'-Y',name:'GROUND',role:'EVIDENCE',question:'What is actually supported, checked, or still unresolved?',reads:['evidence','receipt','gap']}
  });

  const ORIENTATION=Object.freeze({
    F:{rx:0,ry:0},R:{rx:0,ry:-90},B:{rx:0,ry:180},L:{rx:0,ry:90},U:{rx:-90,ry:0},D:{rx:90,ry:0}
  });

  const text=(x,f='')=>x==null?f:String(x);
  const arr=x=>Array.isArray(x)?x:[];
  const compact=x=>arr(x).filter(v=>v!=null&&String(v).trim()!=='');
  const uniq=xs=>[...new Set(xs)];
  const localPath=x=>typeof x==='string'&&/^\/(?!\/)/.test(x)?x:null;
  const listText=(xs,key)=>compact(xs).map(x=>typeof x==='string'?x:text(key?x?.[key]:x)).filter(Boolean);
  const pairs=o=>o&&typeof o==='object'?Object.entries(o):[];

  function normalizeRoute(input={}){
    const r=input&&typeof input==='object'?input:{};
    return {
      ...r,
      href:text(r.href,'/'),
      title:text(r.title,r.href||'FIELD OBJECT'),
      kind:text(r.kind,'artifact'),
      state:text(r.state,'UNKNOWN'),
      operation:text(r.operation,'ORIENT'),
      role:text(r.role,''),
      parent:text(r.parent,'/'),
      version:text(r.version||'—'),
      family:text(r.family||'FIELD')
    };
  }

  function atom(label,value,kind='fact'){
    if(value==null||value==='')return null;
    return {label:text(label).toUpperCase(),value:text(value),kind};
  }

  function reading(input,faceId='F'){
    const r=normalizeRoute(input),face=FACES[faceId]||FACES.F;
    const c=r.contract||{},field=r.field||{},evo=r.evolution||{};
    let atoms=[],doors=[];

    if(face.id==='F'){
      atoms=[
        atom('object',r.title,'title'),
        atom('address',r.href,'address'),
        atom('state',r.state),
        atom('operation',r.operation),
        atom('role',r.role||c.transforms?.verb||'—','long')
      ];
      doors=[r.href];
    }

    if(face.id==='B'){
      const versions=compact(r.versions).slice(-4).map(v=>[v.version,v.summary].filter(Boolean).join(' · '));
      const transfers=compact(r.transfer).slice(0,5);
      atoms=[
        atom('return / receipt',r.receipt||c.evidence?.receipt||'—','address'),
        atom('parent',r.parent,'address'),
        ...versions.map((v,i)=>atom('version '+(i+1),v,'long')),
        ...transfers.map((v,i)=>atom('donor '+(i+1),v,'long'))
      ];
      doors=[r.receipt,c.evidence?.receipt,r.parent];
    }

    if(face.id==='L'){
      const accepts=c.accepts||{};
      const ins=compact(field.inputs).slice(0,5).map(x=>[x.medium,x.kind,x.interface].filter(Boolean).join(' · '));
      atoms=[
        atom('parent',r.parent,'address'),
        atom('accepts',listText(accepts.kinds).join(' · ')||'unspecified','long'),
        atom('requires',listText(accepts.requires).join(' · ')||'none declared','long'),
        ...ins.map((v,i)=>atom('input '+(i+1),v,'long'))
      ];
      doors=[r.parent];
    }

    if(face.id==='R'){
      const emits=c.emits||{};
      const outs=compact(field.outputs).slice(0,5).map(x=>[x.medium,x.kind,x.interface].filter(Boolean).join(' · '));
      const exits=compact(field.exit_paths).slice(0,6);
      atoms=[
        atom('emits',listText(emits.kinds).join(' · ')||'unspecified','long'),
        ...outs.map((v,i)=>atom('output '+(i+1),v,'long')),
        ...exits.map((x,i)=>atom('exit '+(i+1),[x.class,x.status,x.via].filter(Boolean).join(' · '),'long'))
      ];
      doors=exits.map(x=>x.via);
    }

    if(face.id==='U'){
      atoms=[
        atom('question',evo.question||r.hypothesis||r.claim||'What is this for?','hero'),
        atom('purpose',r.role||r.purpose||'—','long'),
        atom('transform',c.transforms?.verb||r.operation,'long'),
        atom('promise',evo.next_if_pass||'Preserve identity while changing only the reading.','long')
      ];
      doors=[evo.host];
    }

    if(face.id==='D'){
      const checks=compact(c.evidence?.checks).slice(0,6);
      const limits=compact(r.known_limits).slice(0,3);
      atoms=[
        atom('receipt',r.receipt||c.evidence?.receipt||'—','address'),
        atom('evidence gate',evo.evidence_gate||r.promotion_gate||'No explicit gate declared.','long'),
        ...checks.map((v,i)=>atom('check '+(i+1),v,'long')),
        ...limits.map((v,i)=>atom('limit '+(i+1),v,'long')),
        atom('gap',r.known_gap||'—','long')
      ];
      doors=[r.receipt,c.evidence?.receipt];
    }

    doors=uniq(doors.map(localPath).filter(Boolean));
    return {face,route:r,atoms:atoms.filter(Boolean),doors};
  }

  function orientation(faceId='F'){
    const o=ORIENTATION[faceId]||ORIENTATION.F;
    return {rx:o.rx,ry:o.ry};
  }

  function normAngle(a){
    a=((Number(a)||0)%360+360)%360;
    return a>180?a-360:a;
  }

  function faceFromOrientation(rx=0,ry=0){
    rx=normAngle(rx);ry=normAngle(ry);
    if(Math.abs(rx)>=45)return rx<0?'U':'D';
    const y=Math.round(ry/90)*90;
    const n=normAngle(y);
    if(n===-90)return'R';
    if(Math.abs(n)===180)return'B';
    if(n===90)return'L';
    return'F';
  }

  function snapOrientation(rx=0,ry=0){
    const face=faceFromOrientation(rx,ry);
    return {face,...orientation(face)};
  }

  function projectionDescriptors(){
    return FACE_ORDER.map(id=>{
      const f=FACES[id];
      return {
        id:'room:'+id,
        reads:f.reads,
        preserves:['object.id','object.addresses','source provenance','RETURN'],
        hides:FACE_ORDER.filter(x=>x!==id).map(x=>'room:'+x),
        permits:'read',
        fallback:'plain route reading',
        question:f.question,
        intent_map:{axis:f.axis,face:id,semantic:f.name,role:f.role},
        round_trip_test:'face → orientation → face'
      };
    });
  }

  function event(kind,target,payload={},authority='observe'){
    return {
      id:'room-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7),
      at:new Date().toISOString(),
      actor:'human',
      kind:text(kind),
      target:text(target),
      payload,
      authority,
      reversibility:'easy',
      evidence_status:'attested'
    };
  }

  function snapshot(input,faceId='F',events=[]){
    const r=normalizeRoute(input),o=orientation(faceId);
    return {
      schema:SCHEMA,
      object:{
        id:r.href,
        kind:r.kind,
        label:r.title,
        source_refs:[{id:'showcase-manifest',uri:'/showcase-manifest.json',version:r.version}],
        addresses:[
          {projection:'FIELD_ROUTE',value:r.href,frame:'showcase-manifest'},
          {projection:'ROOM_FACE',value:(FACES[faceId]||FACES.F).axis,frame:'INTERPHASE_ROOM'}
        ],
        state:{route_state:r.state,operation:r.operation,face:faceId,orientation:o},
        relations:compact(r.field?.exit_paths),
        tags:compact([r.family,r.kind,r.state,r.operation]),
        domain:r.family,
        status:r.state
      },
      events:arr(events),
      projections:projectionDescriptors()
    };
  }

  function makeReturn(input,faceId='F',events=[],before=null){
    const r=normalizeRoute(input),snap=snapshot(r,faceId,events);
    return {
      object_id:r.href,
      event_ids:arr(events).map(e=>e.id).filter(Boolean),
      before:before||{route:r.href,face:'F'},
      after:{route:r.href,face:faceId,orientation:orientation(faceId)},
      delta:[{op:'PROJECT',projection:'INTERPHASE_ROOM',face:faceId,axis:(FACES[faceId]||FACES.F).axis}],
      evidence:[
        {source:'/showcase-manifest.json',status:'attested'},
        {source:'/kernel/INTERPHASE.schema.json',status:'attested'}
      ],
      residue:[],
      next_routes:uniq([r.href,r.parent,r.receipt].map(localPath).filter(Boolean)),
      interphase:snap
    };
  }

  function candidateDoors(input,faceId='F'){
    return reading(input,faceId).doors;
  }

  return {
    SCHEMA,FACE_ORDER,FACES,ORIENTATION,
    normalizeRoute,reading,orientation,faceFromOrientation,snapOrientation,
    projectionDescriptors,event,snapshot,makeReturn,candidateDoors
  };
});
