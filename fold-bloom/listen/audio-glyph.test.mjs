import test from 'node:test';
import assert from 'node:assert/strict';
import {audioGlyphDescriptor,audioGlyphSvg} from './audio-glyph.js';

const map={bpm:124,key:{label:'D minor',chroma:[.7,.1,.4,.8,.1,.5,.2,.6,.5,.2,.4,.1]},sections:[{t:0},{t:12},{t:24}],frames:Array.from({length:48},(_,i)=>({e:.2+(i%7)/10,c:.25+(i%5)/10,f:.03+(i%3)/10,l:.6,m:.3,h:.1}))};
const a=audioGlyphDescriptor(map,{hash:'abc123'}),b=audioGlyphDescriptor(map,{hash:'abc123'}),c=audioGlyphDescriptor(map,{hash:'def456'});
test('glyph descriptor is stable for same source and map',()=>{assert.deepEqual(a,b);assert.equal(a.radial.length,24);assert.equal(a.chroma.length,12);assert.equal(a.sectionCount,2)});
test('source identity changes glyph rotation without changing analyzed features',()=>{assert.notEqual(a.rotation,c.rotation);assert.deepEqual(a.radial,c.radial)});
test('glyph SVG is bounded and self contained',()=>{const svg=audioGlyphSvg(a,{size:96});assert.match(svg,/viewBox="0 0 96 96"/);assert.match(svg,/audio fingerprint glyph/);assert.match(svg,/#ffb347/);assert.ok(!svg.includes('<script'))});
