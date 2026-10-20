import test from 'node:test';
import assert from 'node:assert/strict';
import {ringPosition,ringMarker,boundedTime,continuation,sameSource} from '../ring-address.js';
const hash='a'.repeat(64);
test('ring maps rotating native sample zero to beginning and quarter turn to quarter source',()=>{
  const args={left:0,top:0,width:200,height:200,duration:24,rotation:0};
  assert.equal(ringPosition({...args,x:100,y:10}).sample,0);
  assert.equal(ringPosition({...args,x:190,y:100}).sample,6);
  const p=ringPosition({...args,x:100,y:10,rotation:Math.PI/2});
  assert.equal(p.sample,18);
  assert.equal(ringPosition({...args,x:100,y:100}),null);
  assert.equal(ringPosition({...args,x:230,y:100}),null);
});
test('angular focus marker tracks native time without changing source',()=>{
  const p=ringMarker({duration:24,time:6});
  assert.ok(Math.abs(p.x-95)<1e-9);assert.ok(Math.abs(p.y-50)<1e-9);
  assert.equal(boundedTime(-10,5),0);assert.equal(boundedTime(9,5),5);
  assert.equal(boundedTime(9,0),null);
});
test('continuation is denied across different source IDs or unaddressed timeline',()=>{
  assert.equal(sameSource(hash,hash),true);assert.equal(sameSource(hash,'b'.repeat(64)),false);
  assert.deepEqual(continuation({sourceHash:hash,liveHash:hash,listenTime:2,liveTime:4,duration:10}).delta,2);
  assert.equal(continuation({sourceHash:hash,liveHash:'b'.repeat(64),listenTime:2,liveTime:4,duration:10}).ok,false);
  assert.equal(continuation({sourceHash:hash,liveHash:hash,listenTime:2,liveTime:4,duration:0}).reason,'TIME_UNVERIFIED');
});
