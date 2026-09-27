import test from 'node:test';
import assert from 'node:assert/strict';
import { FoldBloomAudio, MIX_PARTS, MIX_MAX } from '../audio.js';

function makeFakeGain() {
  const node = {
    connectedTo: [],
    ramps: [],
    connect(target) { this.connectedTo.push(target); return this; },
    gain: {
      value: 1,
      setTargetAtTime(v, t, tau) { node.gain.value = v; node.ramps.push([v, t, tau]); }
    }
  };
  return node;
}

function makeDummyNode() { return { connectedTo: [], connect(target) { this.connectedTo.push(target); return this; } }; }

function withFakeWindow(fn) {
  const previous = globalThis.window;
  globalThis.window = {
    AudioContext: class {
      constructor() {
        this.state = 'running';
        this.currentTime = 0;
        this.sampleRate = 8000;
        this.destination = {};
        this._gains = [];
      }
      createGain() { const g = makeFakeGain(); this._gains.push(g); return g; }
      createDynamicsCompressor() { return Object.assign(makeDummyNode(), { threshold:{value:0}, knee:{value:0}, ratio:{value:0}, attack:{value:0}, release:{value:0} }); }
      createDelay() { return Object.assign(makeDummyNode(), { delayTime:{value:0} }); }
      createBuffer(ch, len) { return { getChannelData() { return new Float32Array(len); } }; }
      createOscillator() { return { type:'sine', frequency:{ value:0, setTargetAtTime(){} }, connect(){ return this; }, start(){}, stop(){} }; }
      createBiquadFilter() { const n = makeDummyNode(); return Object.assign(n, { type:'lowpass', frequency:{ value:0, setTargetAtTime(){} }, Q:{ value:0 } }); }
      async resume() { this.state = 'running'; }
    }
  };
  try { return fn(); } finally { if (previous === undefined) delete globalThis.window; else globalThis.window = previous; }
}

test('MIX_PARTS covers the five named generated parts with an identity default', () => {
  assert.deepEqual(MIX_PARTS, ['kick', 'hats', 'bass', 'lead', 'drone']);
  assert.equal(MIX_MAX, 2);
  const a = new FoldBloomAudio();
  assert.deepEqual(a.mix, { kick: 1, hats: 1, bass: 1, lead: 1, drone: 1 });
});

test('setPartLevel is bounded to [0, MIX_MAX] and written even before audio init', () => {
  const a = new FoldBloomAudio();
  assert.equal(a.setPartLevel('kick', 5), 2);
  assert.equal(a.setPartLevel('kick', -1), 0);
  assert.equal(a.setPartLevel('lead', 0.5), 0.5);
  assert.equal(a.mix.kick, 0);
  assert.equal(a.mix.lead, 0.5);
  assert.equal(a.setPartLevel('snare', 0.5), null);
  assert.equal(a.mix.snare, undefined);
  assert.equal(a.setPartLevel('hats', '0.25'), 0.25); // numeric strings accepted
});

test('setPartLevel ramps the live gain node (click avoidance) when ctx exists', () => {
  const a = new FoldBloomAudio();
  a.ctx = { currentTime: 1.25 };
  a.partNodes = { kick: makeFakeGain(), hats: makeFakeGain(), bass: makeFakeGain(), lead: makeFakeGain(), drone: makeFakeGain() };
  a.setPartLevel('bass', 0.4);
  const kicks = a.partNodes.bass.ramps;
  assert.equal(kicks.length, 1);
  assert.deepEqual(kicks[0], [0.4, 1.25, 0.03]);
  assert.equal(a.partNodes.bass.gain.value, 0.4);
});

test('mixReset returns every part to exactly 1.0', () => {
  const a = new FoldBloomAudio();
  a.partNodes = Object.fromEntries(MIX_PARTS.map(p => [p, makeFakeGain()]));
  a.ctx = { currentTime: 0 };
  a.setPartLevel('kick', 0.1);
  a.setPartLevel('hats', 1.8);
  const reset = a.mixReset();
  assert.deepEqual(reset, { kick: 1, hats: 1, bass: 1, lead: 1, drone: 1 });
  assert.deepEqual(a.mix, { kick: 1, hats: 1, bass: 1, lead: 1, drone: 1 });
  for (const p of MIX_PARTS) assert.equal(a.partNodes[p].gain.value, 1);
});

test('mixSnapshot returns a copy, not a live reference', () => {
  const a = new FoldBloomAudio();
  a.setPartLevel('drone', 0.3);
  const snap = a.mixSnapshot();
  snap.drone = 9;
  assert.equal(a.mix.drone, 0.3);
});

test('init() builds one named gain node per part with identity (1.0) defaults, drone bus separate from scene gain', async () => {
  await withFakeWindow(async () => {
    const a = new FoldBloomAudio();
    assert.equal(await a.init(), true);
    try {
      assert.deepEqual(Object.keys(a.partNodes).sort(), [...MIX_PARTS].sort());
      for (const p of MIX_PARTS) assert.equal(a.partNodes[p].gain.value, 1, p + ' node starts at identity');
      assert.ok(a.partNodes.drone !== a.droneGain, 'user drone mix bus and scene droneGain are distinct nodes');
      assert.equal(a.droneFilter.connectedTo[1], a.partNodes.drone, 'drone scene gain feeds the named drone bus');
      assert.equal(a.droneFilter.connectedTo[0], a.droneGain, 'filter feeds scene drone gain first');
      for (const p of MIX_PARTS) assert.equal(a.partNodes[p].connectedTo[0], a.master, p + ' bus feeds master');
    } finally {
      a.stop();
    }
  });
});

test('a mix set before init() is applied to the nodes when the graph is built', async () => {
  await withFakeWindow(async () => {
    const a = new FoldBloomAudio();
    a.setPartLevel('kick', 0.4);
    a.setPartLevel('drone', 1.5);
    assert.equal(await a.init(), true);
    try {
      assert.equal(a.partNodes.kick.gain.value, 0.4);
      assert.equal(a.partNodes.drone.gain.value, 1.5);
      assert.equal(a.partNodes.hats.gain.value, 1);
    } finally {
      a.stop();
    }
  });
});