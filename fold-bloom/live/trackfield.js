import {beatIndexAt,sectionIndexAt} from '../listen/audio-map.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const NUMERIC_KEYS=['e','c','f','l','m','h'];

export function sampleFrameInterpolated(map,time=0){
  if(!map?.frames?.length)return null;
  const fps=Number(map.frameRate)||(Number(map.sampleRate)/Math.max(1,Number(map.hop)||1))||1;
  const x=clamp(Number(time)||0,0,Number(map.duration)||0)*fps;
  const i0=Math.max(0,Math.min(map.frames.length-1,Math.floor(x)));
  const i1=Math.max(i0,Math.min(map.frames.length-1,i0+1));
  const q=clamp(x-i0,0,1),a=map.frames[i0]||{},b=map.frames[i1]||a,out={t:Number(time)||0};
  for(const k of NUMERIC_KEYS){
    const av=Number(a[k])||0,bv=Number.isFinite(Number(b[k]))?Number(b[k]):av;
    out[k]=lerp(av,bv,q);
  }
  return out;
}

function smoothFrame(map,time){
  const a=sampleFrameInterpolated(map,Math.max(0,time-.11))||{},b=sampleFrameInterpolated(map,time)||a,c=sampleFrameInterpolated(map,Math.min(Number(map.duration)||time,time+.11))||b;
  const out={t:time};
  for(const k of NUMERIC_KEYS)out[k]=(Number(a[k])||0)*.22+(Number(b[k])||0)*.56+(Number(c[k])||0)*.22;
  return out;
}

export function trackfieldPoint(frame={},u=0){
  const e=Number(frame.e)||0,c=Number(frame.c)||0,f=Number(frame.f)||0;
  const l=Number.isFinite(Number(frame.l))?Number(frame.l):clamp(1-c*.62,0,1);
  const h=Number.isFinite(Number(frame.h))?Number(frame.h):clamp(c*.7+f*.12,0,1);
  const spectral=clamp(h-l,-1,1);
  const grade=clamp((.50-e)*1.34-f*.16,-.92,.92);
  const speed=clamp(.72+e*.72+f*.36,.62,1.86);
  return {
    u,
    energy:clamp(e,0,1.25),
    flux:clamp(f,0,1.5),
    brightness:clamp(c,0,1.2),
    low:clamp(l,0,1),
    high:clamp(h,0,1),
    bend:clamp(spectral*.94+(c-.5)*.34,-1,1),
    grade,
    speed,
    rise:grade,
    width:clamp(.76+e*.20+f*.11,.64,1.20),
    impact:clamp(e*.58+f*.42,0,1.35)
  };
}

export function buildTrackfield(map,time=0,{horizon=12,count=44}={}){
  if(!map?.frames?.length||!Number.isFinite(Number(map.duration)))return null;
  const duration=Math.max(0,Number(map.duration)||0);
  const start=clamp(Number(time)||0,0,duration);
  const span=Math.max(.001,Math.min(Math.max(.5,Number(horizon)||12),Math.max(.001,duration-start)));
  const n=Math.max(12,Math.min(96,Math.trunc(Number(count)||44)));
  const points=[];
  let lastBeat=null,lastSection=null,distance=0,altitude=0,prev=null;
  for(let i=0;i<n;i++){
    const u=i/(n-1);
    const ahead=span*Math.pow(u,1.12);
    const t=clamp(start+ahead,0,duration);
    const base=trackfieldPoint(smoothFrame(map,t),u);
    if(prev){
      const dt=Math.max(0,ahead-prev.ahead);
      distance+=((prev.speed+base.speed)*.5)*dt;
      altitude+=((prev.grade+base.grade)*.5)*dt*.24;
      altitude=clamp(altitude,-1.45,1.45);
    }
    const beatIndex=beatIndexAt(map,t),sectionIndex=sectionIndexAt(map,t);
    const beatEdge=i>0&&beatIndex>=0&&beatIndex!==lastBeat;
    const sectionEdge=i>0&&sectionIndex>=0&&sectionIndex!==lastSection;
    const p={...base,t,ahead,distance,altitude,beatIndex,sectionIndex,beatEdge,sectionEdge};
    points.push(p);prev=p;lastBeat=beatIndex;lastSection=sectionIndex;
  }
  const totalDistance=Math.max(.001,points.at(-1)?.distance||1);
  for(const p of points)p.z=clamp(p.distance/totalDistance,0,1);

  let surge=null,maxImpact=0;
  for(let i=1;i<points.length;i++){
    const p=points[i],prevPoint=points[i-1];
    maxImpact=Math.max(maxImpact,p.impact);
    if(!surge&&p.ahead>.45&&p.impact>=.92&&p.impact-prevPoint.impact>=.13)surge={ahead:p.ahead,impact:p.impact,index:i};
  }
  const sections=Math.max(1,(map.sections?.length||1)-1);
  return {
    schema:'fold-bloom-trackfield/v0.3',
    sourceMap:map.version||null,
    stage:map.stage||'UNKNOWN',
    time:start,
    duration,
    horizon:span,
    sectionCount:sections,
    current:points[0],
    currentSpeed:+(points[0]?.speed||1).toFixed(4),
    currentGrade:+(points[0]?.grade||0).toFixed(4),
    currentBend:+(points[0]?.bend||0).toFixed(4),
    totalDistance:+totalDistance.toFixed(4),
    maxImpact:+maxImpact.toFixed(4),
    surge,
    points
  };
}

export function projectTrackfield(world,width,height,{rideLateral=0}={}){
  if(!world?.points?.length)return null;
  const w=Math.max(1,Number(width)||1),h=Math.max(1,Number(height)||1);
  let heading=0,lateral=0;
  const slices=[];
  const speedFov=clamp(1+(Number(world.currentSpeed||1)-1)*.08,.94,1.08);
  for(const p of world.points){
    const z=Number.isFinite(Number(p.z))?Number(p.z):p.u;
    heading=heading*.90+p.bend*.072;
    lateral+=heading*(.012+.032*z);
    const deformLateral=Number(p.deformLateral)||0,deformRise=Number(p.deformRise)||0,deformWidth=Number(p.deformWidth)||1;
    const centerX=w*.5+lateral*w*(.52+.28*z)+deformLateral*w*(.12+.17*z);
    const terrainLift=Math.tanh(Number(p.altitude)||0)*h*(.105+.075*z)+(Number(p.grade)||0)*h*.025*z;
    const baseY=lerp(h*.91,h*.22,Math.pow(z,.68))-terrainLift+deformRise*h*(.075+.125*z);
    const half=lerp(w*.445,w*.032,Math.pow(z,.80))*p.width*deformWidth*speedFov;
    const split=clamp(Number(p.deformSplit)||0,0,1),branchGap=half*split*.72,branchHalf=split>.02?half*(.43-.10*split):half;
    slices.push({...p,z,centerX,baseY,half,split,branchGap,branchHalf});
  }
  const splitInfluence=clamp(Math.max(0,...slices.map(p=>(Number(p.split)||0)*Math.pow(1-(Number(p.z)||0),.72))),0,1);
  const cameraShift=clamp(Number(rideLateral)||0,-1,1)*w*.135*splitInfluence;
  if(Math.abs(cameraShift)>.001)for(const p of slices)p.centerX-=cameraShift;
  return {
    width:w,height:h,slices,surge:world.surge,current:world.current,
    currentSpeed:world.currentSpeed||1,currentGrade:world.currentGrade||0,currentBend:world.currentBend||0,
    activeVerbs:world.activeVerbs||[],deformationCount:world.deformationCount||0,cameraShift,splitInfluence,rideLateral:clamp(Number(rideLateral)||0,-1,1)
  };
}
