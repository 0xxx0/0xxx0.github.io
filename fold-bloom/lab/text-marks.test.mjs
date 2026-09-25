import assert from 'node:assert/strict';
import {lineSpans,makeTextMark,marksForRange,replayHandoff,textSourceKey,verseHandoff} from './text-marks.js';

const src='first line\nsecond line\nthird';
const lines=lineSpans(src);
assert.equal(lines.length,3);
assert.equal(lines[1].text,'second line');
assert.equal(src.slice(lines[1].start,lines[1].end),'second line');
assert.equal(lines[1].address,`text://${lines[1].start}:${lines[1].end}`);

const key=textSourceKey(src);
assert.equal(key,textSourceKey(src));
assert.notEqual(key,textSourceKey(src+'!'));

const mark=makeTextMark({source:src,start:lines[1].start,end:lines[1].end,kind:'ARC',label:'middle'});
assert.equal(mark.sourceKey,key);
assert.equal(mark.kind,'ARC');
assert.equal(mark.address,lines[1].address);
assert.equal(marksForRange([mark],lines[1].start,lines[1].end).length,1);
assert.equal(marksForRange([mark],0,2).length,0);

const vh=verseHandoff({source:src,focus:lines[1],marks:[mark]});
assert.equal(vh.schema,'field-verse-handoff/v0.1');
assert.equal(vh.focus.address,lines[1].address);
assert.equal(vh.marks.length,1);

const rh=replayHandoff({source:src,focus:lines[1],marks:[mark]});
assert.equal(rh.schema,'fold-bloom-replay-handoff/v0.2');
assert.equal(rh.source.kind,'TEXT');
assert.equal(rh.evidence.marks.length,1);
assert.equal(rh.evidence.marks[0].address,lines[1].address);
assert.ok(rh.position_ms>0);

console.log('field lab text marks: PASS');
