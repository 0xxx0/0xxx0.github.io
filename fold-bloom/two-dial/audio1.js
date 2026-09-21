function mhz(m) {
  return 440 * Math.pow(2, (m - 69) / 12);
}
function degreeMidi(raw) {
  let s = world().scale,
    n = s.length,
    base = Math.floor(raw),
    frac = raw - base,
    i = wrap(base, n),
    a = s[i],
    b = i === n - 1 ? s[0] + 12 : s[i + 1];
  return world().root + a + (b - a) * frac;
}
function tone(m, when, d = 0.16, v = 0.025, type = 'triangle', cut = null) {
  if (!audio || audio.state !== 'running' || !soundOn) return;
  let o = audio.createOscillator(),
    a = audio.createGain(),
    f = audio.createBiquadFilter();
  o.type = type;
  o.frequency.value = mhz(m);
  f.type = 'lowpass';
  f.frequency.value = cut || world().cut;
  a.gain.setValueAtTime(0.0001, when);
  a.gain.exponentialRampToValueAtTime(Math.max(0.001, v), when + 0.01);
  a.gain.exponentialRampToValueAtTime(0.0001, when + d);
  o.connect(f);
  f.connect(a);
  a.connect(master);
  o.start(when);
  o.stop(when + d + 0.03);
}
function kick(when, vel = 0.7) {
  if (!audio || !soundOn) return;
  let o = audio.createOscillator(),
    a = audio.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(118, when);
  o.frequency.exponentialRampToValueAtTime(43, when + 0.085);
  a.gain.setValueAtTime(0.0001, when);
  a.gain.exponentialRampToValueAtTime(0.055 * vel, when + 0.004);
  a.gain.exponentialRampToValueAtTime(0.0001, when + 0.24);
  o.connect(a);
  a.connect(master);
  o.start(when);
  o.stop(when + 0.26);
}
function pluck(m, when, vel = 0.5, pan = 0) {
  if (!audio || !soundOn) return;
  if ((prefs.voice || 'AIR') !== 'AIR') return voiceNote(m, when, 0.28, 0.012 + 0.02 * vel, 'lead', pan);
  let o1 = audio.createOscillator(),
    o2 = audio.createOscillator(),
    f = audio.createBiquadFilter(),
    a = audio.createGain(),
    p = audio.createStereoPanner ? audio.createStereoPanner() : null;
  o1.type = 'triangle';
  o2.type = 'sine';
  o1.frequency.value = mhz(m);
  o2.frequency.value = mhz(m) * 2.003;
  f.type = 'lowpass';
  f.Q.value = 5;
  f.frequency.setValueAtTime(Math.min(7000, world().cut * 1.6), when);
  f.frequency.exponentialRampToValueAtTime(
    Math.max(650, world().cut * 0.32),
    when + 0.28
  );
  a.gain.setValueAtTime(0.0001, when);
  a.gain.exponentialRampToValueAtTime(0.024 * vel, when + 0.006);
  a.gain.exponentialRampToValueAtTime(0.0001, when + 0.34);
  o1.connect(f);
  o2.connect(f);
  f.connect(a);
  if (p) {
    p.pan.value = pan;
    a.connect(p);
    p.connect(master);
  } else a.connect(master);
  o1.start(when);
  o2.start(when);
  o1.stop(when + 0.36);
  o2.stop(when + 0.36);
}
function air(when, vel = 0.25, pan = 0) {
  if (!audio || !soundOn || !noiseBuffer) return;
  let q = audio.createBufferSource(), f = audio.createBiquadFilter(), a = audio.createGain(), p = audio.createStereoPanner ? audio.createStereoPanner() : null;
  q.buffer = noiseBuffer; f.type = 'bandpass'; f.frequency.value = 4600; f.Q.value = 0.8; a.gain.value = 0.007 * vel;
  q.connect(f); f.connect(a); if (p) { p.pan.value = pan; a.connect(p); p.connect(master); } else a.connect(master);
  q.start(when, rng() * 0.6, 0.18);
}
function hat(when, vel = 1) {
  if (!audio || !soundOn || !noiseBuffer) return;
  let q = audio.createBufferSource(), f = audio.createBiquadFilter(), a = audio.createGain();
  q.buffer = noiseBuffer; f.type = 'highpass'; f.frequency.value = 2900;
  a.gain.setValueAtTime((0.006 + mus.energy * 0.009) * vel, when); a.gain.exponentialRampToValueAtTime(0.0001, when + 0.055);
  q.connect(f); f.connect(a); a.connect(master); q.start(when, rng() * 0.75, 0.06);
}
function snare(when, vel = 0.7) {
  if (!audio || !soundOn || !noiseBuffer) return;
  let q=audio.createBufferSource(), hp=audio.createBiquadFilter(), a=audio.createGain(), o=audio.createOscillator(), oa=audio.createGain();
  q.buffer=noiseBuffer; hp.type='highpass'; hp.frequency.value=1400;
  a.gain.setValueAtTime(0.0001,when); a.gain.exponentialRampToValueAtTime(0.018*vel,when+.004); a.gain.exponentialRampToValueAtTime(0.0001,when+.14);
  o.type='triangle'; o.frequency.setValueAtTime(185,when); o.frequency.exponentialRampToValueAtTime(115,when+.08);
  oa.gain.setValueAtTime(0.0001,when); oa.gain.exponentialRampToValueAtTime(0.009*vel,when+.004); oa.gain.exponentialRampToValueAtTime(0.0001,when+.11);
  q.connect(hp); hp.connect(a); a.connect(master); o.connect(oa); oa.connect(master); q.start(when,rng()*.7,.16); o.start(when); o.stop(when+.13);
}
function nearestMidi(pc, around) {
  let best = around,
    bd = 99;
  for (let o = -2; o <= 2; o++) {
    let q = 48 + pc + 12 * o,
      d = Math.abs(q - around);
    if (d < bd) {
      bd = d;
      best = q;
    }
  }
  return best;
}
function harmonicVoicing() {
  let w = world(),
    v = rel(),
    shape,
    rootIndex = R,
    out = [];
  if (v === 'BLOOM') shape = [0, 2, 4, 5];
  else if (v === 'FOLD') shape = [0, 2, 5];
  else if (v === 'SPLIT') shape = [0, 1, 3, 5];
  else {
    shape = [0, 2, 4];
    rootIndex = 0;
  }
  shape.forEach((off, i) => {
    let idx = wrap(rootIndex + off, 6),
      pc = (w.root + w.scale[idx]) % 12,
      around = mus.lastVoicing[i] || 60 + i * 4;
    let note = nearestMidi(pc, around);
    if (v === 'SPLIT' && i % 2) note += i === 1 ? -12 : 12;
    out.push(note);
  });
  if (v === 'FOLD') out = [...out].reverse();
  mus.lastVoicing = out;
  return out;
}
const P = {
  euclid: (hits, steps = 16, rot = 0) =>
    Object.freeze(
      Array.from({ length: 16 }, (_, i) => {
        let j = wrap(i - rot, steps);
        return (j * hits) % steps < hits;
      })
    ),
  rotate: (p, n) => Object.freeze(p.map((_, i) => p[wrap(i - n, p.length)])),
  rev: p => Object.freeze([...p].reverse()),
  stack: (a, b) => Object.freeze(a.map((x, i) => x || b[i])),
  every: (n, xf, p, cycle) => (cycle % n === n - 1 ? xf(p) : p),
};
function basePulse() {
  let gr = groove(), hits = Math.max(2, Math.min(13, gr.hats + Math.round(mus.energy * 2) + Math.max(-2, world().pulse.length - 4)));
  return P.euclid(hits, 16, wrap((gr.rot || 0) + pat.rotation, 16));
}
function currentPulse() {
  let p = basePulse();
  if (pat.fold) p = P.rev(p);
  if (pat.bloom > 0)
    p = P.stack(p, P.rotate(P.euclid(Math.min(9, 3 + pat.bloom), 16), 2));
  if (pat.split > 0) p = P.rotate(p, pat.split);
  return P.every(4, q => P.rotate(q, 1), p, pat.cycle);
}
function patternLabel() {
  let bits = [
    `euclid(${Math.max(2, Math.min(9, world().pulse.length + Math.round(mus.energy * 2)))},16)`,
  ];
  if (pat.fold) bits.push('rev');
  if (pat.bloom) bits.push(`stack+${pat.bloom}`);
  if (pat.split) bits.push(`rot${pat.split}`);
  return bits.join(' · ');
}
function applyPatternVerb(v, power = 1) {
  if (v === 'BLOOM') {
    pat.bloom = Math.min(6, pat.bloom + power);
    pat.law = 'stack';
  } else if (v === 'FOLD') {
    pat.fold = !pat.fold;
    pat.rotation = wrap(pat.rotation + (power - 1), 16);
    pat.law = pat.fold ? 'rev' : 'identity';
  } else if (v === 'SPLIT') {
    pat.split = wrap(pat.split + 3 * power, 16);
    pat.rotation = wrap(pat.rotation + power, 16);
    pat.law = 'rotate';
  } else if (v === 'RETURN') {
    pat.fold = false;
    pat.bloom = Math.max(0, pat.bloom - power);
    pat.split = 0;
    pat.rotation = 0;
    pat.law = 'restate';
  }
  $('#lawStrip').textContent = `${v} ×${power} // ${patternLabel()}`;
}
function applyMemoryVerb(v, power = 1) {
  if (!form.motif.length) return;
  if (v === 'BLOOM') {
    for (let n = 0; n < power; n++) {
      let q = form.motif[form.motif.length - 1],
        e = { m: wrap(q.m + 1 + n, 6), h: q.h, v: 'BLOOM' };
      form.motif = [...form.motif, e].slice(-6);
    }
  } else if (v === 'FOLD') {
    form.motif = [...form.motif].reverse();
    if (power > 1)
      form.motif = form.motif.map(q => ({ ...q, m: wrap(5 - q.m, 6) }));
  } else if (v === 'SPLIT' && form.motif.length > 2) {
    let k = Math.ceil(form.motif.length / 2),
      rot = (k * power) % form.motif.length;
    form.motif = [...form.motif.slice(rot), ...form.motif.slice(0, rot)];
  } else if (v === 'RETURN') {
    if (form.lastMotif?.length)
      form.motif = form.lastMotif.map(q => ({ ...q }));
    else form.motif = form.motif.slice(-Math.max(2, 5 - power));
  }
}
function musicStep(st, when) {
  let b = st % 16, w = world(), gr = groove(), mem = phrase[b], pulse = currentPulse();
  if ((gr.kick || [0,8]).includes(b)) kick(when, 0.54 + mus.energy * 0.28);
  if ((gr.snare || [4,12]).includes(b)) snare(when, 0.46 + mus.energy * 0.2);
  if (pulse[b]) hat(when, b % 2 ? 0.68 : 1);
  if (gr.poly) { let pp=P.euclid(gr.poly[0],gr.poly[1],gr.poly[2]||0); if (pp[b] && b%4!==0) air(when+.008,.42+mus.density*.3,((b%5)-2)/2.4); }
  if (b % 4 === 0) voiceNote(degreeMidi(L) - 12, when, 0.32, 0.026 + mus.energy * 0.019, 'bass');
  if (pulse[b] && b % 4 !== 0 && mus.energy > 0.34) pluck(degreeMidi(L + R) + 12, when, 0.32 + mus.energy * 0.35, ((b % 4) - 1.5) / 2);
  if ((b === 2 || b === 6 || b === 10 || b === 14) && rng() < 0.5 + mus.density * 0.36)
    harmonicVoicing().slice(0, mus.voices).forEach((n, i) => voiceNote(n, when + i * 0.012, 0.34, 0.012 + mus.energy * 0.007, 'body', (i-(mus.voices-1)/2)*.18));
  if (mem.w > 0.12 && b % 4 === 1 && rng() < mem.w * 0.28 * prefs.memory) voiceNote(degreeMidi(mem.m + mem.h) + 12, when, 0.11, 0.007 + mem.w * 0.007, 'lead', ((mem.h||0)-2.5)/3.5);
}
function fmVoice(m,when,d,v,pan=0){
  let spec=voice(), c=audio.createOscillator(), mod=audio.createOscillator(), mg=audio.createGain(), a=audio.createGain(), p=audio.createStereoPanner?.();
  c.type='sine'; mod.type='sine'; c.frequency.value=mhz(m); mod.frequency.value=mhz(m)*(spec.ratio||2.01); mg.gain.value=mhz(m)*(spec.index||3.2)*Math.min(1.15,.45+v*16);
  mod.connect(mg); mg.connect(c.frequency); a.gain.setValueAtTime(.0001,when); a.gain.exponentialRampToValueAtTime(Math.max(.001,v*1.05),when+.008); a.gain.exponentialRampToValueAtTime(.0001,when+d);
  c.connect(a); if(p){p.pan.value=pan;a.connect(p);p.connect(master)}else a.connect(master); c.start(when);mod.start(when);c.stop(when+d+.03);mod.stop(when+d+.03);
}
function woodVoice(m,when,d,v,pan=0){
  let o=audio.createOscillator(),f=audio.createBiquadFilter(),a=audio.createGain(),p=audio.createStereoPanner?.();
  o.type='triangle';o.frequency.value=mhz(m);f.type='bandpass';f.Q.value=7;f.frequency.setValueAtTime(Math.min(5200,mhz(m)*5.5),when);f.frequency.exponentialRampToValueAtTime(Math.max(420,mhz(m)*1.4),when+Math.min(.22,d));
  a.gain.setValueAtTime(.0001,when);a.gain.exponentialRampToValueAtTime(Math.max(.001,v*1.15),when+.003);a.gain.exponentialRampToValueAtTime(.0001,when+Math.min(d,.3));
  o.connect(f);f.connect(a);if(p){p.pan.value=pan;a.connect(p);p.connect(master)}else a.connect(master);o.start(when);o.stop(when+Math.min(d,.34)+.02);air(when,.3+v*8,pan);
}
function bellVoice(m,when,d,v,pan=0){
  let parts=voice().partials||[1,2.01,3.98], p=audio.createStereoPanner?.(), bus=audio.createGain();bus.gain.value=1;if(p){p.pan.value=pan;bus.connect(p);p.connect(master)}else bus.connect(master);
  parts.forEach((ratio,i)=>{let o=audio.createOscillator(),a=audio.createGain(),dd=Math.min(1.4,Math.max(d,.28)*(1+i*.34));o.type='sine';o.frequency.value=mhz(m)*ratio;a.gain.setValueAtTime(.0001,when);a.gain.exponentialRampToValueAtTime(Math.max(.0008,v*(.68/(i+1))),when+.004);a.gain.exponentialRampToValueAtTime(.0001,when+dd);o.connect(a);a.connect(bus);o.start(when);o.stop(when+dd+.03)});
}
function bowVoice(m,when,d,v,pan=0){
  let a=audio.createGain(),f=audio.createBiquadFilter(),p=audio.createStereoPanner?.(),o1=audio.createOscillator(),o2=audio.createOscillator(),dd=Math.max(.42,d);
  o1.type='triangle';o2.type='sawtooth';o1.frequency.value=mhz(m);o2.frequency.value=mhz(m)*1.002;f.type='lowpass';f.frequency.value=Math.min(3600,world().cut*.82);
  a.gain.setValueAtTime(.0001,when);a.gain.linearRampToValueAtTime(Math.max(.001,v*.72),when+.09);a.gain.exponentialRampToValueAtTime(.0001,when+dd);
  o1.connect(f);o2.connect(f);f.connect(a);if(p){p.pan.value=pan;a.connect(p);p.connect(master)}else a.connect(master);o1.start(when);o2.start(when);o1.stop(when+dd+.04);o2.stop(when+dd+.04);
}
function dirtyVoice(m,when,d,v,pan=0){
  let o1=audio.createOscillator(),o2=audio.createOscillator(),f=audio.createBiquadFilter(),a=audio.createGain(),p=audio.createStereoPanner?.();
  o1.type='sawtooth';o2.type='square';o1.frequency.value=mhz(m);o2.frequency.value=mhz(m)*.501;f.type='lowpass';f.Q.value=3.5;f.frequency.setValueAtTime(Math.max(500,world().cut*.45),when);f.frequency.exponentialRampToValueAtTime(Math.min(7000,world().cut*1.35),when+.07);
  a.gain.setValueAtTime(.0001,when);a.gain.exponentialRampToValueAtTime(Math.max(.001,v*.62),when+.006);a.gain.exponentialRampToValueAtTime(.0001,when+d);
  o1.connect(f);o2.connect(f);f.connect(a);if(p){p.pan.value=pan;a.connect(p);p.connect(master)}else a.connect(master);o1.start(when);o2.start(when);o1.stop(when+d+.03);o2.stop(when+d+.03);
}
function voiceNote(m, when, d = 0.22, v = 0.018, role = 'lead', pan = 0) {
  if (!audio || audio.state !== 'running' || !soundOn) return;
  let s=voice().synth;
  if(s==='fm') return fmVoice(m,when,d,v,pan); if(s==='wood') return woodVoice(m,when,d,v,pan); if(s==='bell') return bellVoice(m,when,d,v,pan); if(s==='bow') return bowVoice(m,when,d,v,pan); if(s==='dirty') return dirtyVoice(m,when,d,v,pan);
  let type=role==='bass'?world().bass:role==='body'?world().body:world().lead;
  return tone(m,when,d,v,type,world().cut*(voice().brightness||1));
}
function currentBpm() {
  const linked = pulseTempo();
  if (linked) return linked;
  return clamp(world().bpm + (mus.energy - 0.28) * 34, 56, 118);
}
