import test from 'node:test';
import assert from 'node:assert/strict';
import {LiveTrack,transportFromMap,textWitnessAt} from '../track.js';

const map={
  duration:8,bpm:120,tempoConfidence:.8,stage:'DEEP',source:{hash:'abc123'},
  frameRate:2,sampleRate:2,hop:1,
  frames:Array.from({length:16},(_,i)=>({t:i*.5,e:i/16,c:.4,f:.2})),
  beats:[0,0.5,1,1.5,2,2.5,3,3.5,4,4.5,5,5.5,6,6.5,7,7.5],
  sections:[{t:0},{t:4},{t:8}]
};

test('transport exposes beat phase/distance and section progress',()=>{
  const p=transportFromMap(map,1.125,true);
  assert.equal(p.beatIndex,2);
  assert.equal(p.sectionIndex,0);
  assert.equal(p.sectionCount,2);
  assert.equal(p.sectionStart,0);
  assert.equal(p.sectionEnd,4);
  assert.ok(Math.abs(p.beatPhase-.25)<1e-9);
  assert.ok(Math.abs(p.beatDistance-.125)<1e-9);
  assert.ok(Math.abs(p.sectionProgress-.28125)<1e-9);
  assert.equal(p.sourceKind,'LOCAL_FILE');
  assert.equal(p.sourceHash,'abc123');
  assert.equal(p.playing,true);
});

test('transport remains bounded at track end',()=>{
  const p=transportFromMap(map,99,false);
  assert.equal(p.time,8);
  assert.equal(p.sectionIndex,1);
  assert.equal(p.playing,false);
});


test('timed text follows actual cue addresses while embedded text stays FLOAT',()=>{
  const timed=textWitnessAt({kind:'LYRICS',alignment:'TIMED_LRC',text:'a\nb',cues:[{start:0,end:1.9,text:'a'},{start:2,end:4,text:'b'}]},2.4,8);
  assert.equal(timed.mode,'TIMED');assert.equal(timed.text,'b');assert.equal(timed.approx,false);
  const floated=textWitnessAt({kind:'LYRICS',alignment:'UNALIGNED_EMBEDDED_ID3',text:'one\ntwo\nthree',cues:[]},4,8);
  assert.equal(floated.mode,'FLOAT');assert.equal(floated.alignment,'UNALIGNED_EMBEDDED_ID3');assert.equal(floated.approx,true);
});


test('source-only stream is explicit and never masquerades as a mapped track',()=>{
  const audio={src:'',paused:true,loadCalls:0,addEventListener(){},load(){this.loadCalls++}};
  const track=new LiveTrack(audio);
  const meta=track.loadStream({url:'https://example.invalid/source.mp3',name:'SOURCE ONLY',sourceAddress:'provider://source',sourceKind:'REMOTE_AUDIO'});
  assert.equal(track.sourceActive(),true);
  assert.equal(track.mapped(),false);
  assert.equal(track.active(),false);
  assert.equal(track.transport(),null);
  assert.equal(track.trackfield(),null);
  assert.equal(meta.sourceAddress,'provider://source');
  assert.match(track.stateLabel(),/SOURCE$/);
  assert.equal(audio.loadCalls,1);
});


test('remote source can be cleared without leaving a false active source',()=>{
  const listeners={};
  const audio={src:'',paused:true,loadCalls:0,pauseCalls:0,addEventListener(type,fn){listeners[type]=fn},load(){this.loadCalls++},pause(){this.paused=true;this.pauseCalls++},removeAttribute(name){if(name==='src')this.src=''}};
  const states=[],maps=[],t=new LiveTrack(audio,{onState:x=>states.push(x),onMap:x=>maps.push(x)});
  t.loadStream({url:'https://example.invalid/source.mp3',sourceAddress:'provider://optional'});
  assert.equal(t.sourceActive(),true);
  assert.equal(t.clearSource(),true);
  assert.equal(t.sourceActive(),false);
  assert.equal(t.mapped(),false);
  assert.equal(t.metadata(),null);
  assert.equal(t.stateLabel(),'NONE');
  assert.equal(states.at(-1),'NONE');
  assert.equal(maps.at(-1),null);
});
