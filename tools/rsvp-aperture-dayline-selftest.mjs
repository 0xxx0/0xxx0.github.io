import assert from 'node:assert/strict';
import {proposedDaylineHandoff} from '../rsvp/dayline-handoff.mjs';
const raw='Zero 🙂 one two.\nThen a line becomes an action.\n',hash='sha256:'+'a'.repeat(64);
const mark={id:'source:1',revision:hash,charIndex:17,endIndex:45,quote:raw.slice(17,45),kind:'APPLIED',
 note:'Compare this evidence with the next actual work session.'};
const packet=proposedDaylineHandoff({raw,hash,label:'RESEARCH NOTE',
 sourceAddress:'/control/CURRENT.json',mark,at:'2026-10-28T10:00:00Z'});
assert.equal(packet.schema,'atlas-dayline-handoff/v0.1');
assert.equal(packet.kind,'TASK');
assert.equal(packet.authority,'NONE');
assert.equal(packet.approval,'EXPLICIT_ADD_TO_DAY_REQUIRED');
assert.equal(packet.return_to,'/rsvp/?handoff=1');
assert.match(packet.payload.task.title,/Compare this evidence/);
assert.match(packet.payload.task.sourceRef,/^\/docs\/\?src=%2Fcontrol%2FCURRENT.json&ap_char=17&ap_scale=SENT$/);
assert.match(packet.payload.task.notes,/EXACT UTF-16: 17:45/);
assert.match(packet.payload.task.provenance,/READFIELD \/ APPLIED/);
assert.ok(!Object.prototype.hasOwnProperty.call(packet.payload.task,'status'),
 'A reading proposal never declares task completion or ACT authority');
const cases=[
 {...mark,revision:'sha256:'+'b'.repeat(64)},
 {...mark,quote:'forged'},
 {...mark,charIndex:-1},
 {...mark,endIndex:raw.length+1},
 {...mark,kind:'QUESTION'},
 {...mark,note:' '},
];
for(const m of cases){
 assert.throws(()=>proposedDaylineHandoff({raw,hash,label:'RESEARCH NOTE',mark:m}),
 /Only a source-bound|Write an actual/);
}
const local=proposedDaylineHandoff({raw,hash,mark,sourceAddress:''});
assert.equal(local.payload.task.sourceRef,hash+'#char=17',
 'Local source is referenced by hash, never an invented public link');
assert.equal(packet.source.quote,mark.quote);
console.log('RSVP APERTURE → DAYLINE SOURCE LAW PASS · exact revision/range/quote · no silent ACT · native RETURN');
