import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createState, rotateSteps, release, canRelease, gateCellIndex, restore, snapshot,
  setMode, forecastAtSlot, forecastRelease, availableForecasts, selectCall,
  forecastMatchesCall
} from '../engine.js';

function align(s){for(let i=0;i<12&&!canRelease(s);i++)s=rotateSteps(s,1);return s}

test('deterministic initial target, board and call',()=>{
 const a=createState(123),b=createState(123);assert.deepEqual(snapshot(a),snapshot(b));
 assert.ok(a.call?.verb);
});

test('ratchet accumulates charge and release resets it',()=>{
 let s=createState(7);s=rotateSteps(s,1);s=rotateSteps(s,1);assert.ok(s.charge>.3);s=align(s);assert.ok(canRelease(s));const out=release(s);assert.ok(out.event);assert.ok(out.state.charge<s.charge);assert.equal(out.state.blooms,1);
});

test('repeated type at different slot writes a crease and future cascade can traverse it',()=>{
 let s=createState(55);s=align(s);let first=release(s);s=first.state;const type=first.event.type,firstSlot=first.event.slot;
 s.targetType=type;s.call=selectCall(s);let guard=0;do{s=rotateSteps(s,1);guard++}while((!canRelease(s)||gateCellIndex(s)===firstSlot)&&guard<24);
 assert.ok(canRelease(s));const second=release(s);assert.ok(second.event.edgeAdded);assert.equal(second.state.creases.length,1);assert.ok(second.event.path.length>=2);
});

test('FLOW caps charge and mode survives snapshot restore',()=>{
 let s=setMode(createState(99),'FLOW');s=rotateSteps(s,9);assert.ok(s.charge<=.8);const r=restore(snapshot(s));assert.equal(r.mode,'FLOW');assert.equal(r.rotation,s.rotation);
});

test('high charge preserves topology verb and adds RETURN cadence',()=>{
 let s=createState(321);s=align(s);const first=release(s);s=first.state;const type=first.event.type,firstSlot=first.event.slot;
 s.targetType=type;s.call=selectCall(s);
 for(let i=0;i<8;i++)s=rotateSteps(s,1);
 let guard=0;while((!canRelease(s)||gateCellIndex(s)===firstSlot)&&guard++<24)s=rotateSteps(s,1);
 assert.ok(s.charge>=1.25);const second=release(s);assert.ok(second.event.edgeAdded);assert.equal(second.event.verb,'FOLD');assert.equal(second.event.cadence,'RETURN');assert.deepEqual(second.event.operations,['FOLD','RETURN']);
});

test('forecast exposes meaningful alternatives before commitment',()=>{
 let s=createState(808);s=align(s);s=release(s).state;
 const anchored=s.history.at(-1).type;
 s.targetType=anchored;s.call=selectCall(s);
 const options=availableForecasts(s);
 assert.ok(options.length>=3);
 assert.ok(options.every(o=>o.type===anchored));
 assert.ok(options.some(o=>o.edgeAdded||o.verb==='RETURN'));
 const current=forecastRelease(align(s));
 assert.ok(current);
});

test('call is always achievable by at least one visible candidate',()=>{
 let s=createState(909);
 for(let round=0;round<8;round++){
   const options=availableForecasts(s);
   assert.ok(options.some(o=>forecastMatchesCall(s.call,o)),JSON.stringify({call:s.call,options}));
   const chosen=options.find(o=>forecastMatchesCall(s.call,o));
   s={...s,rotation:(12-chosen.slot)%12};
   const out=release(s);
   assert.equal(out.event.callMet,true);
   s=out.state;
 }
 assert.ok(s.bestCallStreak>=8);
});

test('song timing grades score without changing topology',()=>{
 let a=createState(404),b=createState(404);a=align(a);b=align(b);
 a.call={...forecastRelease(a),candidates:1};a.call={verb:a.call.verb,chain:a.call.chain,candidates:1};
 b.call={...a.call};
 const free=release(a,{timing:'FREE',timingMultiplier:1});
 const perfect=release(b,{timing:'PERFECT',timingMultiplier:1.4});
 assert.equal(free.event.verb,perfect.event.verb);
 assert.deepEqual(free.event.path,perfect.event.path);
 assert.ok(perfect.event.flowGain>free.event.flowGain);
});
