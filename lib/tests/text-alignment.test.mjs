import test from 'node:test';
import assert from 'node:assert/strict';
import {cueTimeAtPlayback,playbackTimeAtCue,addTextAlignmentAnchor,buildTextTimeline,charIndexAtPlayback,alignmentSummary} from '../text-alignment.js';

test('one anchor corrects arbitrary offset beyond the old ±8 second range',()=>{
 const m=addTextAlignmentAnchor({}, {playTime:12,cueTime:37,label:'line'});
 assert.equal(cueTimeAtPlayback(20,m),45);
 assert.equal(playbackTimeAtCue(45,m),20);
 assert.match(alignmentSummary(m),/\+25\.00s/);
});

test('two anchors correct drift as well as offset',()=>{
 let m=addTextAlignmentAnchor({}, {playTime:10,cueTime:20});
 m=addTextAlignmentAnchor(m,{playTime:50,cueTime:68});
 assert.equal(cueTimeAtPlayback(30,m),44);
 assert.ok(Math.abs(playbackTimeAtCue(44,m)-30)<.001);
});

test('timed timeline preserves cue evidence and maps to source text chars',()=>{
 const raw='hello world\nsecond line\nthird';
 const tl=buildTextTimeline({text:raw,cues:[{start:5,end:8,text:'hello world'},{start:12,end:14,text:'second line'}],duration:20});
 assert.equal(tl[1].startChar,12);
 const m=addTextAlignmentAnchor({}, {playTime:7,cueTime:12});
 assert.equal(charIndexAtPlayback(tl,7,m),12);
 assert.equal(tl[1].estimated,false);
});

test('untimed lines are explicitly estimated rather than promoted to timed truth',()=>{
 const tl=buildTextTimeline({text:'one\ntwo\nthree',duration:100});
 assert.equal(tl[1].cueTime,50);
 assert.equal(tl[1].estimated,true);
});
