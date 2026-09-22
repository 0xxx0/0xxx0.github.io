import {buildTrackfield} from './trackfield.js';
import {transportFromMap,TRACKFIELD_MODEL_INTERVAL} from './track.js';

const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

function sectionEnvelope(t,start,end){
  const u=clamp((t-start)/(end-start),0,1);
  return Math.sin(Math.PI*u);
}

export function createPracticeMap({duration=96,bpm=108,frameRate=20}={}){
  const frames=[];
  const sections=[{t:0},{t:16},{t:32},{t:48},{t:64},{t:80},{t:duration}];
  for(let i=0;i<=duration*frameRate;i++){
    const t=i/frameRate;
    const section=Math.min(sections.length-2,Math.floor(t/16));
    const local=t-sections[section].t;
    const env=sectionEnvelope(t,sections[section].t,sections[section+1].t);
    const dropPulse=Math.exp(-Math.pow((local-11.6)/1.25,2));
    const breakDip=Math.exp(-Math.pow((local-4.0)/1.8,2));
    const phrase=.5+.5*Math.sin((t/8)*TAU-.7);
    const micro=.5+.5*Math.sin((t/2)*TAU+section*.9);
    const energy=clamp(.22+.20*env+.12*phrase+.46*dropPulse-.14*breakDip,0.08,1.05);
    const flux=clamp(.04+.08*micro+.68*dropPulse+.06*Math.max(0,Math.sin(t*TAU*.75)),.01,1.05);
    const brightness=clamp(.30+.16*Math.sin(t*.31+section*.8)+.34*dropPulse,.08,.95);
    const high=clamp(.12+.56*brightness+.16*dropPulse,0,1);
    const low=clamp(.72-.44*brightness+.10*(1-energy),0,1);
    const mid=clamp(1-low*.58-high*.42,0,1);
    frames.push({t:+t.toFixed(3),e:energy,c:brightness,f:flux,l:low,m:mid,h:high});
  }
  const beatDur=60/bpm,beats=[];
  for(let t=0;t<=duration+.001;t+=beatDur)beats.push(+t.toFixed(4));
  return {
    version:'FIELD_PRACTICE_0.1',
    stage:'DEMO',
    duration,
    bpm,
    tempoConfidence:1,
    frameRate,
    sampleRate:frameRate,
    hop:1,
    frames,
    beats,
    sections,
    source:{name:'FIELD COURSE',sourceKind:'FIELD_PRACTICE'}
  };
}

export class PracticeTrack {
  constructor({duration=96,bpm=108}={}){
    this.map=createPracticeMap({duration,bpm});
    this.epoch=performance.now();
    this.offset=0;
    this.paused=false;this.worldCache=null;this.worldTime=-1;
  }
  time(now=performance.now()){
    const raw=this.paused?this.offset:this.offset+(now-this.epoch)/1000;
    return ((raw%this.map.duration)+this.map.duration)%this.map.duration;
  }
  reset(now=performance.now()){this.epoch=now;this.offset=0;this.worldCache=null;this.worldTime=-1}
  transport(now=performance.now()){
    const p=transportFromMap(this.map,this.time(now),!this.paused);
    return p?{...p,stage:'DEMO',sourceKind:'FIELD_PRACTICE',sourceAddress:null,_receivedAt:now}:null;
  }
  trackfield(horizon=13.5,count=56,now=performance.now()){
    const t=this.time(now);
    if(this.worldCache&&Math.abs(t-this.worldTime)<TRACKFIELD_MODEL_INTERVAL)return this.worldCache;
    this.worldTime=t;this.worldCache=buildTrackfield(this.map,t,{horizon,count});return this.worldCache;
  }
}
