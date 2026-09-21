import {frameAt,beatIndexAt,sectionIndexAt} from '../listen/audio-map.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;

export function trackfieldPoint(frame={},u=0){
  const e=Number(frame.e)||0,c=Number(frame.c)||0,f=Number(frame.f)||0;
  const l=Number.isFinite(Number(frame.l))?Number(frame.l):clamp(1-c*.62,0,1);
  const h=Number.isFinite(Number(frame.h))?Number(frame.h):clamp(c*.7+f*.12,0,1);
  const spectral=clamp(h-l,-1,1);
  return {
    u,
    energy:clamp(e,0,1.25),
    flux:clamp(f,0,1.5),
    brightness:clamp(c,0,1.2),
    low:clamp(l,0,1),
    high:clamp(h,0,1),
    bend:clamp(spectral*.82+(c-.5)*.28,-1,1),
    rise:clamp((.5-e)*.82-f*.18,-1,1),
    width:clamp(.78+e*.18+f*.10,.66,1.18),
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
  let lastBeat=null,lastSection=null;
  for(let i=0;i<n;i++){
    const u=i/(n-1);
    const ahead=span*Math.pow(u,1.18);
    const t=clamp(start+ahead,0,duration);
    const base=trackfieldPoint(frameAt(map,t)||{},u);
    const beatIndex=beatIndexAt(map,t),sectionIndex=sectionIndexAt(map,t);
    const beatEdge=i>0&&beatIndex>=0&&beatIndex!==lastBeat;
    const sectionEdge=i>0&&sectionIndex>=0&&sectionIndex!==lastSection;
    points.push({...base,t,ahead,beatIndex,sectionIndex,beatEdge,sectionEdge});
    lastBeat=beatIndex;lastSection=sectionIndex;
  }
  let surge=null,maxImpact=0;
  for(let i=1;i<points.length;i++){
    const p=points[i],prev=points[i-1];
    maxImpact=Math.max(maxImpact,p.impact);
    if(!surge&&p.ahead>.45&&p.impact>=.92&&p.impact-prev.impact>=.16){
      surge={ahead:p.ahead,impact:p.impact,index:i};
    }
  }
  const sections=Math.max(1,(map.sections?.length||1)-1);
  return {
    schema:'fold-bloom-trackfield/v0.1',
    sourceMap:map.version||null,
    stage:map.stage||'UNKNOWN',
    time:start,
    duration,
    horizon:span,
    sectionCount:sections,
    current:points[0],
    maxImpact:+maxImpact.toFixed(4),
    surge,
    points
  };
}

export function projectTrackfield(world,width,height){
  if(!world?.points?.length)return null;
  const w=Math.max(1,Number(width)||1),h=Math.max(1,Number(height)||1);
  let heading=0,lateral=0,elevation=0;
  const slices=[];
  for(const p of world.points){
    const u=p.u;
    heading=heading*.92+p.bend*.085;
    lateral+=heading*(.018+.022*u);
    elevation=elevation*.94+p.rise*.025;
    const centerX=w*.5+lateral*w*(.55+.24*u);
    const baseY=lerp(h*.88,h*.26,Math.pow(u,.66))+elevation*h*(.18*u);
    const half=lerp(w*.43,w*.038,Math.pow(u,.78))*p.width;
    slices.push({...p,centerX,baseY,half});
  }
  return {width:w,height:h,slices,surge:world.surge,current:world.current};
}
