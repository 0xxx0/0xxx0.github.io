import assert from 'node:assert/strict';
import {READFIELD_TRACK_HANDOFF_SCHEMA,normalizeTimedCues,cueIndexAt,buildTrackHandoff,trackTarget} from './readfield-track-sync.js';

const source='first line\nsecond line\nthird line';
const timedText={name:'x.lrc',kind:'LYRICS',alignment:'TIMED_LRC',cues:[
  {start:1,end:2,text:'first line'},
  {start:2,end:4,text:'second line'},
  {start:4,end:null,text:'third line'}
]};
const cues=normalizeTimedCues(timedText,source);
assert.equal(cues.length,3);
assert.equal(cues[0].charIndex,0);
assert.equal(cues[1].charIndex,11);
assert.equal(cues[2].charIndex,23);
assert.equal(cueIndexAt(cues,0),-1);
assert.equal(cueIndexAt(cues,1),0);
assert.equal(cueIndexAt(cues,2.2),1);
assert.equal(cueIndexAt(cues,9),2);

const packet=buildTrackHandoff({source,label:'TRACK',sourceHash:'abc123',timedText,time:2.2,bpm:120,scope:'PHRASE'});
assert.equal(packet.schema,READFIELD_TRACK_HANDOFF_SCHEMA);
assert.equal(packet.timedText.cues.length,3);
assert.equal(trackTarget(packet,{data:{sourceHash:'abc123',time:.5,playing:true,bpm:120}}),null);
const target=trackTarget(packet,{data:{sourceHash:'abc123',time:4.1,playing:true,bpm:120}});
assert.equal(target.cueIndex,2);
assert.equal(target.charIndex,23);
assert.equal(target.playing,true);
assert.equal(trackTarget(packet,{data:{sourceHash:'different',time:4.1}}),null);

console.log(JSON.stringify({ok:true,cues:cues.length,last:target.cueIndex,charIndex:target.charIndex,preroll:'held'}));
