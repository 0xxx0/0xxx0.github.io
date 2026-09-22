const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

export const DEFORMATION_SCHEMA='fold-bloom-deformation-tape/v0.1';

function envelope(t,start,end){
  if(!Number.isFinite(t)||t<start||t>end||end<=start)return 0;
  const u=clamp((t-start)/(end-start),0,1);
  return Math.pow(Math.sin(Math.PI*u),.82);
}

function verbDuration(verb,power,chain,span){
  if(verb==='BLOOM')return 3.8+power*1.1+chain*.22;
  if(verb==='FOLD')return 5.2+power*1.15+span*.22;
  if(verb==='SPLIT')return 6.2+power*1.25+chain*.38;
  if(verb==='RETURN')return 3.2+power*.9;
  return 3.5+power;
}

function makeDeformation(verb,event,transport,index=0){
  const at=Number(transport?.time);
  if(!Number.isFinite(at))return null;
  const power=clamp(Number(event?.power)||1,.5,3.2);
  const chain=clamp(Math.trunc(Number(event?.chain)||1),1,9);
  const span=clamp(Number(event?.span)||0,0,6);
  const slot=clamp(Math.trunc(Number(event?.slot)||0),0,11);
  const type=clamp(Math.trunc(Number(event?.type)||0),0,2);
  const delay=.30+index*.24+(verb==='RETURN'?.04:0);
  const start=at+delay;
  const duration=verbDuration(verb,power,chain,span);
  const direction=((slot+type)%2===0?-1:1);
  return {
    schema:DEFORMATION_SCHEMA,
    id:`${Math.round(at*1000)}:${event?.id??'x'}:${index}:${verb}`,
    verb,
    at:+at.toFixed(4),
    start:+start.toFixed(4),
    end:+(start+duration).toFixed(4),
    power:+power.toFixed(3),
    chain,
    span,
    slot,
    type,
    direction,
    sourceEvent:event?.id??null
  };
}

export function appendReleaseDeformations(tape=[],event,transport){
  const time=Number(transport?.time);
  if(!event||!Number.isFinite(time))return [...tape];
  const verbs=Array.isArray(event.operations)&&event.operations.length?event.operations:[event.verb];
  const next=[...tape];
  verbs.forEach((verb,i)=>{
    if(!['BLOOM','FOLD','SPLIT','RETURN'].includes(verb))return;
    const d=makeDeformation(verb,event,transport,i);
    if(d)next.push(d);
  });
  return pruneDeformationTape(next,time).slice(-32);
}

export function pruneDeformationTape(tape=[],time=0){
  const t=Number(time)||0;
  return tape.filter(d=>Number.isFinite(Number(d?.end))&&Number(d.end)>=t-.45);
}

export function deformationAtTime(tape=[],time=0){
  let width=1,lateral=0,rise=0,split=0,bloom=0,fold=0,ret=0;
  const active=[];
  for(const d of tape){
    const e=envelope(Number(time),Number(d.start),Number(d.end));
    if(e<=0)continue;
    const strength=clamp((Number(d.power)||1)/2.6,.28,1.18)*e;
    active.push({id:d.id,verb:d.verb,strength:+strength.toFixed(3)});
    if(d.verb==='BLOOM'){
      bloom=Math.max(bloom,strength);
      width*=1+.68*strength;
      rise-=.18*strength;
    }else if(d.verb==='FOLD'){
      fold=Math.max(fold,strength);
      width*=1-.22*clamp(strength,0,.95);
      lateral+=(Number(d.direction)||1)*.78*strength;
      rise+=.06*strength;
    }else if(d.verb==='SPLIT'){
      split=Math.max(split,.92*strength);
      width*=1+.12*strength;
      rise-=.05*strength;
    }else if(d.verb==='RETURN'){
      ret=Math.max(ret,strength);
      width*=1-.12*clamp(strength,0,1);
    }
  }
  const returnClamp=clamp(ret,0,1);
  split*=1-returnClamp*.94;
  lateral*=1-returnClamp*.9;
  return {
    width:clamp(width,.52,1.9),
    lateral:clamp(lateral,-1.25,1.25),
    rise:clamp(rise,-.42,.32),
    split:clamp(split,0,1),
    bloom:clamp(bloom,0,1.25),
    fold:clamp(fold,0,1.25),
    return:clamp(ret,0,1.25),
    active
  };
}

export function applyDeformations(world,tape=[]){
  if(!world?.points?.length)return world;
  const clean=pruneDeformationTape(tape,world.time||0);
  const points=world.points.map(p=>{
    const d=deformationAtTime(clean,p.t);
    return {
      ...p,
      deformWidth:d.width,
      deformLateral:d.lateral,
      deformRise:d.rise,
      deformSplit:d.split,
      deformBloom:d.bloom,
      deformFold:d.fold,
      deformReturn:d.return,
      deformActive:d.active
    };
  });
  const activeVerbs=[...new Set(points.flatMap(p=>(p.deformActive||[]).map(x=>x.verb)))];
  return {...world,deformationSchema:DEFORMATION_SCHEMA,deformationCount:clean.length,activeVerbs,points};
}

export function deformationSummary(tape=[],time=0){
  const active=deformationAtTime(tape,time);
  const verbs=active.active.map(x=>x.verb);
  return verbs.length?[...new Set(verbs)].join(' + '):'OPEN';
}
