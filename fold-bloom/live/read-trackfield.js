import {buildTrackfield} from './trackfield.js';
import {transportFromMap} from './track.js';
import {clamp} from '../../lib/polar-control.js';

export const READ_TRACK_MAP_SCHEMA='fold-bloom-read-track-map/v0.1';
const words=s=>String(s||'').toLowerCase().match(/[\p{L}\p{N}']+/gu)||[];
const punct=s=>(String(s||'').match(/[.,;:!?—–()[\]{}"“”'‘’]/g)||[]).length;
const upper=s=>(String(s||'').match(/[A-Z]/g)||[]).length;
const digit=s=>(String(s||'').match(/[0-9]/g)||[]).length;
const set=xs=>new Set(xs);
function overlap(a,b){const A=set(a),B=set(b);if(!A.size&&!B.size)return 0;let n=0;for(const x of A)if(B.has(x))n++;return n/Math.max(1,new Set([...A,...B]).size)}
function median(xs){const a=[...xs].sort((a,b)=>a-b);if(!a.length)return 1;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2}
function unitMetrics(source,points){
  const raw=String(source||''),lens=points.map(p=>Math.max(1,Number(p.end)-Number(p.start))),med=Math.max(1,median(lens));let prev=[];
  return points.map((p,i)=>{
    const text=raw.slice(Number(p.start)||0,Number(p.end)||0),ws=words(text),len=Math.max(1,text.length);
    const lengthGain=clamp(Math.log2(1+len/med)/1.6,0,1);
    const punc=clamp(punct(text)/Math.max(1,len)*14,0,1);
    const caps=clamp((upper(text)+digit(text)*1.4)/Math.max(1,len)*10,0,1);
    const recurrence=i?overlap(prev,ws):0,novelty=1-recurrence;
    prev=ws;
    return {
      text,index:i,start:p.start,end:p.end,
      e:clamp(.20+.52*lengthGain+.16*punc+.08*novelty,.08,1.05),
      f:clamp(.04+.62*punc+.22*Math.abs(novelty-.5),.02,1.05),
      c:clamp(.22+.42*novelty+.24*caps,.06,.96),
      recurrence:+recurrence.toFixed(5),lengthGain:+lengthGain.toFixed(5),punctuation:+punc.toFixed(5)
    };
  });
}
export function makeReadTrackMap(course,{unitSeconds=1.35,frameRate=8}={}){
  if(!course||course.kind!=='READFIELD_TEXT'||!Array.isArray(course.points)||!course.points.length)throw Error('READ_TRACK_COURSE_REQUIRED');
  const metrics=unitMetrics(course.source,course.points),u=Math.max(.5,Number(unitSeconds)||1.35),fps=Math.max(2,Math.min(20,Math.trunc(Number(frameRate)||8))),duration=Math.max(u,metrics.length*u);
  const frames=[];
  for(let i=0;i<=Math.ceil(duration*fps);i++){
    const t=Math.min(duration,i/fps),x=Math.min(metrics.length-1,Math.floor(Math.min(.999999,t/duration)*metrics.length)),a=metrics[x],b=metrics[Math.min(metrics.length-1,x+1)],local=(t-x*u)/u,q=clamp(local,0,1);
    const lerp=(k)=>a[k]+(b[k]-a[k])*q,e=lerp('e'),c=lerp('c'),f=lerp('f'),low=clamp(.78-c*.48,0,1),high=clamp(.14+c*.68+f*.10,0,1),mid=clamp(1-low*.54-high*.38,0,1);
    frames.push({t:+t.toFixed(4),e:+e.toFixed(5),c:+c.toFixed(5),f:+f.toFixed(5),l:+low.toFixed(5),m:+mid.toFixed(5),h:+high.toFixed(5)});
  }
  const beats=metrics.map((_,i)=>+(i*u).toFixed(4)),phrases=[],sections=[];
  const phraseEvery=Math.max(1,Math.ceil(metrics.length/Math.min(8,metrics.length))),sectionEvery=Math.max(1,Math.ceil(metrics.length/Math.min(4,metrics.length)));
  for(let i=0;i<metrics.length;i+=phraseEvery)phrases.push({t:+(i*u).toFixed(4)});
  if(!phrases.length||phrases.at(-1).t<duration)phrases.push({t:+duration.toFixed(4)});
  for(let i=0;i<metrics.length;i+=sectionEvery)sections.push({t:+(i*u).toFixed(4)});
  if(!sections.length||sections.at(-1).t<duration)sections.push({t:+duration.toFixed(4)});
  return {
    version:READ_TRACK_MAP_SCHEMA,stage:'TEXT_STRUCTURE',duration,bpm:60/u,tempoConfidence:0,frameRate:fps,sampleRate:fps,hop:1,
    frames,beats,phrases,sections,
    source:{name:course.label,sourceKind:'READFIELD_TEXT',sourceId:course.sourceId,grain:course.grain,authority:course.sourceIdentity?.authority||'READFIELD'},
    structure:{unitSeconds:u,unitCount:metrics.length,metrics,law:'Terrain derives from length, punctuation, orthographic variation and adjacent lexical recurrence only. STRUCTURE != MEANING.'}
  };
}
export function readTrackTransport(map,progress=0){
  if(!map||map.version!==READ_TRACK_MAP_SCHEMA)throw Error('READ_TRACK_MAP_REQUIRED');
  const p=clamp(Number(progress)||0,0,1),time=p*Number(map.duration||0),t=transportFromMap(map,time,false);
  return t?{...t,sourceKind:'READFIELD_TEXT',sourceAddress:map.source?.sourceId||null,stage:'TEXT_STRUCTURE'}:null;
}
export function buildReadTrackfield(map,progress=0,{horizon=13.5,count=56}={}){
  if(!map||map.version!==READ_TRACK_MAP_SCHEMA)throw Error('READ_TRACK_MAP_REQUIRED');
  const p=clamp(Number(progress)||0,0,1),time=p*Number(map.duration||0),world=buildTrackfield(map,time,{horizon,count});
  return world?{...world,sourceKind:'READFIELD_TEXT',sourceId:map.source?.sourceId||null,structureLaw:map.structure?.law||null}:null;
}
