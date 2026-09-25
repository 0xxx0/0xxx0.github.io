(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.WrapProof=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const SCHEMA='0xxx0/wrap-proof/v0.1';
  const VERSION='0.1';
  const EMBEDS=Object.freeze({FLAT:'FLAT',TUBE:'TUBE',DONUT:'DONUT'});
  const TAU=Math.PI*2;
  const clone=x=>JSON.parse(JSON.stringify(x));
  const dist3=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);

  function N(v,d){v=Number(v);return Number.isFinite(v)&&v>=2?Math.round(v):d;}

  // ---- canonical object: one sheet, cells addressed (i,j), no geometry implied ----
  function sheet(nx,ny,opts){
    opts=opts||{};
    return {
      schema:SCHEMA, version:VERSION,
      id:opts.id||'SHEET-001',
      kind:'SHEET',
      nx:N(nx,12), ny:N(ny,36),
      identX:false, identY:false,
      embed:EMBEDS.FLAT,
      ringFactor:Number(opts.ringFactor)||3,
      journal:[],
      provenance:{
        source:'AXIS work/make-grammar/spike-001-wrap',
        status:'CANDIDATE — not a repo head',
        note:'topology / geometry / metric claims are separated; physical fit is NOT inferred'
      }
    };
  }

  const tubeRadius=obj=>obj.nx/TAU;   // perimeter nx (unit cell spacing) -> R = nx/2pi

  // ---- geometry: embed a sheet coordinate (u,v) in 3-space; metrics derived from this ----
  function point(obj,u,v,mode){
    mode=mode||{};
    const embed=mode.embed||obj.embed;
    const ringFactor=Number(mode.ringFactor||obj.ringFactor||3);
    const t=(mode.t==null)?1:Math.max(0,Math.min(1,Number(mode.t)));
    const cx=(obj.nx-1)/2, cy=(obj.ny-1)/2;
    const flat={x:u-cx,y:v-cy,z:0};
    if(embed===EMBEDS.FLAT)return flat;
    const R=tubeRadius(obj), phi=TAU*u/obj.nx;
    let b;
    if(embed===EMBEDS.TUBE){
      b={x:R*Math.sin(phi), y:v-cy, z:R*Math.cos(phi)};
    }else{
      const B=R*ringFactor, theta=v/B;
      b={x:(B+R*Math.cos(phi))*Math.cos(theta),
         y: R*Math.sin(phi),
         z:(B+R*Math.cos(phi))*Math.sin(theta)};
    }
    if(t>=1)return b;
    return {x:flat.x+(b.x-flat.x)*t, y:flat.y+(b.y-flat.y)*t, z:flat.z+(b.z-flat.z)*t};
  }

  // first-order metric strain along u|v at (u,v): |dP/ds| - 1  (flat spacing = 1)
  function metricStrain(obj,u,v,dir,embed,ringFactor,h){
    h=Number(h)||1e-4;   // finite-difference bias is O(h^2); 1e-4 keeps tube |strain| ~5e-10
    const du=dir==='u'?h:0, dv=dir==='v'?h:0;
    const a=point(obj,u+du,v+dv,{embed,ringFactor,t:1});
    const b=point(obj,u-du,v-dv,{embed,ringFactor,t:1});
    return dist3(a,b)/(2*h)-1;
  }

  function metricStats(obj,opts){
    opts=opts||{};
    const embed=opts.embed||obj.embed;
    const ringFactor=Number(opts.ringFactor||obj.ringFactor||3);
    let min=Infinity,max=-Infinity,sum=0,n=0,maxAt=null;
    for(let j=0;j<obj.ny;j++)for(let i=0;i<obj.nx;i++){
      for(const dir of ['u','v']){
        const s=metricStrain(obj,i,j,dir,embed,ringFactor);
        if(s>max){max=s;maxAt={i,j,dir,s};}
        if(s<min)min=s;
        sum+=s;n++;
      }
    }
    const analytic=(embed===EMBEDS.DONUT)?1/ringFactor:0;
    return {embed,ringFactor,n,min,max,mean:sum/n,maxAbs:Math.max(Math.abs(min),Math.abs(max)),analytic,maxAt};
  }

  // ---- topology: adjacency from identity equipment only (identify = quotient), never from embedding ----
  function neighbors(obj,i,j){
    const nx=obj.nx, ny=obj.ny;
    return {
      right: obj.identX ? (i+1)%nx : (i+1<nx ? i+1 : null),
      left:  obj.identX ? (i-1+nx)%nx : (i-1>=0 ? i-1 : null),
      up:    obj.identY ? (j+1)%ny : (j+1<ny ? j+1 : null),
      down:  obj.identY ? (j-1+ny)%ny : (j-1>=0 ? j-1 : null)
    };
  }

  // ---- operations: one verb, declared changes, declared preserves ----
  function op(obj,verb,changes,preserves,detail){
    obj=clone(obj);
    obj.journal.push({verb,changes,preserves,detail:detail||{},at:new Date().toISOString()});
    return obj;
  }

  function identify(obj,axis){
    axis=String(axis||'').toUpperCase();
    if(axis!=='X'&&axis!=='Y')return {ok:false,reason:'AXIS_MUST_BE_X_OR_Y',obj};
    const key=axis==='X'?'identX':'identY';
    if(obj[key])return {ok:false,reason:'ALREADY_IDENTIFIED_'+axis,obj};
    const o=op(obj,'IDENTIFY',
      {topology:['quotient boundary pair '+axis+': (0)~('+(axis==='X'?obj.nx:obj.ny)+')']},
      ['cells','identity','geometry-embedding','metric'],
      [{axis,note:'topology only; no geometry, no strain implied'}]);
    o[key]=true;
    return {ok:true,obj:o};
  }

  function setEmbed(obj,embed,ringFactor){
    embed=String(embed||'').toUpperCase();
    if(!EMBEDS[embed])return {ok:false,reason:'UNKNOWN_EMBED',obj};
    const o=op(obj,'EMBED',
      {geometry:['embed as '+embed+(ringFactor?(' k='+ringFactor):'')]},
      ['topology','adjacency','cells','identity'],
      [{embed,ringFactor:ringFactor?Number(ringFactor):o.ringFactor,note:'geometry only; adjacency unchanged'}]);
    o.embed=embed;
    if(ringFactor)o.ringFactor=Number(ringFactor);
    return {ok:true,obj:o};
  }

  function closureDistance(obj,opts){
    opts=opts||{};
    const mode={embed:opts.embed||obj.embed,ringFactor:opts.ringFactor||obj.ringFactor,t:1};
    if(mode.embed===EMBEDS.FLAT)return null;
    return dist3(point(obj,0,0,mode),point(obj,obj.nx,0,mode));
  }

  // ---- RETURN: the operation is incomplete without it ----
  function receipt(obj,events){
    const stra=embed=>metricStats(obj,{embed,ringFactor:(embed===EMBEDS.DONUT)?obj.ringFactor:undefined});
    return {
      schema:'0xxx0/wrap-proof-return/v0.1',
      object_id:obj.id,
      ops:clone(obj.journal),
      state:{nx:obj.nx,ny:obj.ny,identX:obj.identX,identY:obj.identY,embed:obj.embed,ringFactor:obj.ringFactor},
      evidence:{
        FLAT:  sumStrain(stra(EMBEDS.FLAT)),
        TUBE:  sumStrain(stra(EMBEDS.TUBE)),
        DONUT: sumStrain(stra(EMBEDS.DONUT))
      },
      events:clone(events||[]),
      delta:obj.journal.map(j=>{
        const d=(j.detail&&j.detail[0])||{};
        return j.verb+(d.axis?('('+d.axis+')'):'')+(d.embed?('('+d.embed+(d.ringFactor?(' k='+d.ringFactor):'')+')'):'');
      }),
      residue:[
        'display morph is not a rigid motion; metric witness is computed on the destination embed only',
        'strain is a first-order edge metric, not a full continuum embedding proof',
        'physical fit / tolerance / load / safety NOT inferred',
        'alternative embeddings (cuts, pleats, auxetic structures) are not modeled',
        'FLAT/TUBE remain developable (K=0); DONUT requires stretch/compression (K != 0 region)'
      ],
      at:new Date().toISOString()
    };
  }
  function sumStrain(s){return {edges:s.n,min:s.min,max:s.max,mean:s.mean,max_abs_strain:s.maxAbs,analytic:s.analytic,max_at:s.maxAt};}

  return {
    SCHEMA,VERSION,EMBEDS,sheet,tubeRadius,point,metricStrain,metricStats,neighbors,
    identify,setEmbed,closureDistance,receipt
  };
});