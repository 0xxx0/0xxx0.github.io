import test from 'node:test';
import assert from 'node:assert/strict';
import {parseTextSidecar,parsePlaylistText,groupLocalInputs,classifyLocalName} from '../sidecar-text.js';
import {parseMp4Meta} from '../mp4-meta.js';

function box(type,payload){
  const t=[...type].map(c=>c.charCodeAt(0)),n=8+payload.length;
  return Uint8Array.from([(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255,...t,...payload]);
}
function dataBox(text){
  const p=new TextEncoder().encode(text);
  return box('data',Uint8Array.from([0,0,0,1,0,0,0,0,...p]));
}
function item(type,text){return box(type,dataBox(text))}
function concat(...xs){const n=xs.reduce((a,x)=>a+x.length,0),o=new Uint8Array(n);let p=0;for(const x of xs){o.set(x,p);p+=x.length}return o}
test('LRC and VTT sidecars become timed text evidence',()=>{
  const l=parseTextSidecar('[00:01.50]hello\n[00:03.00]world','x.lrc');
  assert.equal(l.alignment,'TIMED_LRC');assert.equal(l.cueCount,2);assert.equal(l.cues[0].start,1.5);
  const v=parseTextSidecar('WEBVTT\n\n00:00:01.000 --> 00:00:03.000\nalpha','x.vtt');
  assert.equal(v.alignment,'TIMED_VTT');assert.equal(v.cues[0].text,'alpha');
});
test('M3U/PLS preserve ordered playlist addresses',()=>{
  const m=parsePlaylistText('#EXTM3U\n#EXTINF:1,One\nhttps://x/1.mp3\nhttps://x/2.mp3','x.m3u8');
  assert.deepEqual(m.entries.map(x=>x.address),['https://x/1.mp3','https://x/2.mp3']);
  const p=parsePlaylistText('[playlist]\nFile1=a.mp3\nTitle1=A','x.pls');assert.equal(p.entries[0].title,'A');
});
test('input grouping pairs sidecar by basename',()=>{
  const mk=(name,type='')=>({name,type});
  const g=groupLocalInputs([mk('talk.m4a','audio/mp4'),mk('talk.vtt','text/vtt'),mk('other.txt','text/plain')]);
  assert.equal(g.groups.length,1);assert.equal(g.groups[0].sidecars[0].name,'talk.vtt');assert.equal(classifyLocalName('x.flac'),'AUDIO');
});
test('MP4 ilst extracts common iTunes text tags',()=>{
  const ilst=box('ilst',concat(item('©nam','Title'),item('©ART','Artist'),item('©lyr','Words')));
  const meta=box('meta',concat(Uint8Array.from([0,0,0,0]),ilst));
  const udta=box('udta',meta),moov=box('moov',udta),ftyp=box('ftyp',Uint8Array.from([77,52,65,32,0,0,0,0]));
  const out=parseMp4Meta(concat(ftyp,moov));
  assert.equal(out.title,'Title');assert.equal(out.artist,'Artist');assert.equal(out.lyrics,'Words');assert.equal(out.lyricsAlignment,'UNALIGNED_EMBEDDED_MP4');
});
