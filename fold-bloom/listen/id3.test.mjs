import test from 'node:test';
import assert from 'node:assert/strict';
import {parseId3,id3DisplayName} from './id3.js';

const enc=s=>new TextEncoder().encode(s);
const sync=n=>[(n>>21)&127,(n>>14)&127,(n>>7)&127,n&127];
function frame(id,payload){const h=new Uint8Array(10+payload.length);h.set(enc(id),0);const n=payload.length;h.set([(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255],4);h.set(payload,10);return h}
function textFrame(id,s){const b=enc(s),p=new Uint8Array(1+b.length);p[0]=3;p.set(b,1);return frame(id,p)}
function uslt(s){const b=enc(s),p=new Uint8Array(1+3+1+b.length);p[0]=3;p.set(enc('eng'),1);p[4]=0;p.set(b,5);return frame('USLT',p)}
const parts=[textFrame('TIT2','Still River'),textFrame('TPE1','Field'),textFrame('TBPM','124'),textFrame('TKEY','Dm'),uslt('words kept inside the file')];
const len=parts.reduce((n,x)=>n+x.length,0),tag=new Uint8Array(10+len);tag.set(enc('ID3'));tag[3]=3;tag[4]=0;tag[5]=0;tag.set(sync(len),6);let o=10;for(const p of parts){tag.set(p,o);o+=p.length}

test('parses common ID3v2.3 identity and unsynchronized lyrics',()=>{const m=parseId3(tag);assert.equal(m.title,'Still River');assert.equal(m.artist,'Field');assert.equal(m.bpm,124);assert.equal(m.key,'Dm');assert.equal(m.lyrics,'words kept inside the file');assert.equal(m.lyricsAlignment,'UNALIGNED_EMBEDDED_ID3')});
test('display name preserves artist/title while fallback remains lawful',()=>{assert.equal(id3DisplayName({title:'Still River',artist:'Field'},'x'),'Field — Still River');assert.equal(id3DisplayName({},'demo.mp3'),'demo.mp3')});
test('non ID3 bytes remain a clean absence',()=>assert.deepEqual(parseId3(new Uint8Array([1,2,3])),{present:false}));
