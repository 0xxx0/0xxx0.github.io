'use strict';
const fs=require('fs');
const assert=require('assert');
const html=fs.readFileSync('field-play.html','utf8');

assert(html.includes('data-projection="FIELD"'),'FIELD projection control missing');
assert(html.includes('data-projection="PLAIN"'),'PLAIN projection control missing');
assert(html.includes('body[data-projection="PLAIN"]'),'PLAIN projection stylesheet missing');
assert(html.includes("schema:'field-game-return/v0.2'"),'RETURN v0.2 missing');
assert(html.includes("authority:'VIEW_ONLY'"),'projection authority must remain VIEW_ONLY');
assert(html.includes("mission_identity_unchanged:true"),'view/state invariant missing');
assert(html.includes("USER_OBSERVATION_NOT_CORRECTNESS_PROOF"),'subjective evidence boundary missing');
for(const k of ['clarity','reentry','reuse']) assert(html.includes('data-rating="'+k+'"'),k+' rating missing');

const missionStart=html.indexOf('function missionPacket()');
const returnStart=html.indexOf('function returnPacket()');
assert(missionStart>0&&returnStart>missionStart,'packet functions missing');
const missionFn=html.slice(missionStart,returnStart);
assert(!missionFn.includes('projection'), 'projection leaked into canonical mission packet');
assert(missionFn.includes("schema:'field-game-mission/v0.1'"),'mission schema changed unexpectedly');

const returnFn=html.slice(returnStart,html.indexOf('function bump()',returnStart));
assert(returnFn.includes('projection:{id:projection'),'RETURN must record view evidence');
assert(returnFn.includes('subjective:{clarity:ratings.clarity'),'RETURN must carry bounded subjective evidence');

assert(html.includes("localStorage.getItem('field.play.returns.v01')"),'existing local counter missing');
assert(!html.includes('localStorage.setItem(\'field.play.receipts'), 'projection trial must not create a second local receipt store');

console.log('field-play projection selftest: PASS');
