import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, rotateSteps, release, canRelease, gateCellIndex, restore, snapshot, setMode } from '../engine.js';

function align(s){for(let i=0;i<12&&!canRelease(s);i++)s=rotateSteps(s,1);return s}

test('deterministic initial target and board',()=>{
 const a=createState(123),b=createState(123);assert.deepEqual(snapshot(a),snapshot(b));
});

test('ratchet accumulates charge and release resets it',()=>{
 let s=createState(7);s=rotateSteps(s,1);s=rotateSteps(s,1);assert.ok(s.charge>.3);s=align(s);assert.ok(canRelease(s));const out=release(s);assert.ok(out.event);assert.ok(out.state.charge<s.charge);assert.equal(out.state.blooms,1);
});

test('repeated type at different slot writes a crease and future cascade can traverse it',()=>{
 let s=createState(55);s=align(s);let first=release(s);s=first.state;const type=first.event.type,firstSlot=first.event.slot;
 // Force same target only for deterministic topology test, then move to another cell of same type.
 s.targetType=type;let guard=0;do{s=rotateSteps(s,1);guard++}while((!canRelease(s)||gateCellIndex(s)===firstSlot)&&guard<24);
 assert.ok(canRelease(s));const second=release(s);assert.ok(second.event.edgeAdded);assert.equal(second.state.creases.length,1);assert.ok(second.event.path.length>=2);
});

test('FLOW caps charge and mode survives snapshot restore',()=>{
 let s=setMode(createState(99),'FLOW');s=rotateSteps(s,9);assert.ok(s.charge<=.8);const r=restore(snapshot(s));assert.equal(r.mode,'FLOW');assert.equal(r.rotation,s.rotation);
});


test('high charge preserves topology verb and adds RETURN cadence',()=>{
 let s=createState(321);s=align(s);const first=release(s);s=first.state;const type=first.event.type,firstSlot=first.event.slot;
 s.targetType=type;
 // Deliberately accumulate enough ratchet tension before landing another slot of the same type.
 for(let i=0;i<8;i++)s=rotateSteps(s,1);
 let guard=0;while((!canRelease(s)||gateCellIndex(s)===firstSlot)&&guard++<24)s=rotateSteps(s,1);
 assert.ok(s.charge>=1.25);const second=release(s);assert.ok(second.event.edgeAdded);assert.equal(second.event.verb,'FOLD');assert.equal(second.event.cadence,'RETURN');assert.deepEqual(second.event.operations,['FOLD','RETURN']);
});
