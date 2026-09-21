import { clamp } from './engine.js';

const SCENES = {
  DEEP:   { bpm: 88,  root: 38, scale:[0,2,3,5,7,9,10], bass:'sine',     lead:'triangle', cut:1900, swing:.09, kick:1.0, hats:.72, drone:.45 },
  TRANCE: { bpm: 112, root: 45, scale:[0,2,3,5,7,8,10], bass:'triangle', lead:'sawtooth', cut:3300, swing:.03, kick:.82, hats:1.0, drone:.24 },
  WOOD:   { bpm: 76,  root: 43, scale:[0,2,5,7,9,12,14], bass:'triangle', lead:'triangle', cut:1450, swing:.14, kick:.42, hats:.34, drone:.30 },
  VOID:   { bpm: 62,  root: 36, scale:[0,1,5,7,8,12,13], bass:'sine',     lead:'sine',     cut:1050, swing:.0,  kick:.14, hats:.08, drone:.82 },
};

const mhz = m => 440 * Math.pow(2, (m - 69) / 12);

export class FoldBloomAudio {
  constructor(onBeat=()=>{}) {
    this.ctx = null;
    this.master = null;
    this.comp = null;
    this.delay = null;
    this.delayGain = null;
    this.noise = null;
    this.soundOn = true;
    this.sceneName = 'DEEP';
    this.scene = SCENES.DEEP;
    this.step = 0;
    this.next = 0;
    this.timer = null;
    this.energy = .28;
    this.density = .3;
    this.tension = 0;
    this.motif = [];
    this.rotation = 0;
    this.motion = 0;
    this.lastVerb = 'BLOOM';
    this.aperture = 0;
    this.onBeat = onBeat;
    this.droneA = this.droneB = this.droneGain = null;
    this.volume = .58;
  }

  async init() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return false;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.comp = this.ctx.createDynamicsCompressor();
      this.comp.threshold.value = -18;
      this.comp.knee.value = 14;
      this.comp.ratio.value = 3;
      this.comp.attack.value = .006;
      this.comp.release.value = .18;
      this.delay = this.ctx.createDelay(.6);
      this.delay.delayTime.value = .19;
      this.delayGain = this.ctx.createGain();
      this.delayGain.gain.value = .11;
      this.delay.connect(this.delayGain).connect(this.master);
      this.master.connect(this.comp).connect(this.ctx.destination);
      this.setVolume(this.volume);
      this.noise = this._makeNoise();
      this._startDrone();
    }
    if (this.ctx.state !== 'running') await this.ctx.resume();
    this.start();
    return true;
  }

  _makeNoise() {
    const n = this.ctx.sampleRate * 1.0;
    const b = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i=0;i<n;i++) d[i] = Math.random()*2-1;
    return b;
  }

  _startDrone() {
    if (this.droneA) return;
    const c = this.ctx;
    this.droneA = c.createOscillator();
    this.droneB = c.createOscillator();
    const filter = c.createBiquadFilter();
    this.droneGain = c.createGain();
    this.droneA.type = 'sine';
    this.droneB.type = 'triangle';
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    this.droneGain.gain.value = .0001;
    this.droneA.connect(filter); this.droneB.connect(filter); filter.connect(this.droneGain).connect(this.master);
    this.droneA.start(); this.droneB.start();
    this.droneFilter = filter;
  }

  setVolume(v) {
    this.volume = clamp(Number(v),0,1);
    if (this.master && this.ctx) {
      const g = this.soundOn ? this.volume*this.volume*.72 : 0;
      this.master.gain.setTargetAtTime(g, this.ctx.currentTime, .03);
    }
  }

  setSound(on) {
    this.soundOn = !!on;
    this.setVolume(this.volume);
  }

  setScene(name) {
    if (!SCENES[name]) return;
    this.sceneName = name;
    this.scene = SCENES[name];
    if (this.delayGain && this.ctx) {
      const wet = name === 'VOID' ? .22 : name === 'TRANCE' ? .13 : .09;
      this.delayGain.gain.setTargetAtTime(wet, this.ctx.currentTime, .05);
    }
  }

  sceneNames() { return Object.keys(SCENES); }

  hydrate(state) {
    if (!state) return;
    if (SCENES[state.scene]) this.setScene(state.scene);
    this.rotation = Number(state.rotation) || 0;
    this.motif = Array.isArray(state.motif) ? state.motif.slice(-8).map(m => ({ ...m })) : [];
  }

  setMotion(rotation, velocity=0) {
    this.rotation = rotation;
    this.motion = clamp(Math.abs(velocity),0,1);
    if (!this.ctx || !this.droneA) return;
    const now = this.ctx.currentTime;
    const s = this.scene;
    const degree = ((Math.round(rotation) % 7)+7)%7;
    const note = s.root + s.scale[degree];
    this.droneA.frequency.setTargetAtTime(mhz(note-12), now, .05);
    this.droneB.frequency.setTargetAtTime(mhz(note+7), now, .07);
    this.droneGain.gain.setTargetAtTime(this.soundOn ? (.0015 + s.drone*.006 + this.motion*.008) : 0, now, .06);
    this.droneFilter.frequency.setTargetAtTime(s.cut*(.55+this.motion*.7), now, .06);
  }

  ratchet(dir=1, charge=0) {
    if (!this.ctx || !this.soundOn) return;
    const t = this.ctx.currentTime+.004;
    const scene = this.scene;
    const note = scene.root + 24 + (dir>0 ? 7 : 5) + Math.round(charge*2);
    this._tone(note,t,.035,.008+.004*charge,'square',2400,dir*.35);
    if (charge > .7) this._hat(t+.012,.35+.25*charge,dir*.2);
  }

  release(ev) {
    this.lastVerb = ev.verb;
    const returning = ev.verb === 'RETURN' || ev.cadence === 'RETURN';
    if (returning) {
      // One-beat aperture: foreground the returned phrase instead of piling the next layer on immediately.
      this.energy = Math.max(.18, this.energy - (.10 + ev.power*.035));
      this.density = Math.max(.14, this.density - (.12 + ev.chain*.025));
      this.tension = Math.max(0, this.tension - .52);
      this.aperture = Math.max(this.aperture, 4);
    } else {
      this.energy = clamp(this.energy*.82 + .15 + ev.power*.08, .18, 1);
      this.density = clamp(this.density*.86 + .08 + ev.chain*.055, .16, .95);
      this.tension = clamp(this.tension+.08+ev.charge*.12,0,1);
    }
    this.motif.push({ degree:ev.degree, type:ev.type, verb:ev.verb, chain:ev.chain, power:ev.power, slot:ev.slot });
    this.motif = this.motif.slice(-8);
    if (!this.ctx || !this.soundOn) return;
    const t = this.ctx.currentTime+.012;
    const s = this.scene;
    const base = s.root + 12 + s.scale[ev.degree % s.scale.length];
    const chord = ev.verb === 'FOLD' ? [0,5,9] : ev.verb === 'SPLIT' ? [0,3,7,10] : ev.verb === 'RETURN' ? [0,7,12,19] : [0,4,7];
    chord.slice(0,Math.min(4,2+ev.chain)).forEach((semi,i)=>this._tone(base+semi,t+i*.018,.22+.06*ev.power,.018+.008*ev.power,s.lead,s.cut*(1+.24*ev.power),(i-(chord.length-1)/2)*.22));
    this._kick(t, .45 + .16*ev.power);
    if (ev.edgeAdded) {
      const span = ev.span || 1;
      this._pluck(base+12+span,t+.08,.34+.12*ev.power, ev.edgeAdded[0] < ev.edgeAdded[1] ? -.45 : .45);
      this._pluck(base+19-span,t+.16,.24+.08*ev.power, ev.edgeAdded[0] < ev.edgeAdded[1] ? .45 : -.45, true);
    }
    if (ev.chain > 1) for(let i=1;i<Math.min(ev.chain,5);i++) this._pluck(base+12+s.scale[(ev.degree+i)%s.scale.length],t+.045*i,.18+.05*i,(i%2?-.5:.5));
    if (ev.cadence === 'RETURN' && ev.verb !== 'RETURN') {
      const beat = 60/s.bpm;
      const rt = t + beat*.5;
      this._tone(base-12,rt,beat*.72,.024+.006*ev.power,'sine',Math.min(900,s.cut),0);
      this._pluck(base+7,rt+.035,.26+.05*ev.power,0,true);
    }
  }

  start() {
    if (!this.ctx || this.timer) return;
    this.next = this.ctx.currentTime+.06;
    this.timer = setInterval(()=>this._schedule(),25);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  _schedule() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    if (this.next < this.ctx.currentTime-.25) this.next = this.ctx.currentTime+.03;
    let guard = 0;
    while (this.next < this.ctx.currentTime+.12 && guard++ < 32) {
      const bpm = clamp(this.scene.bpm + (this.energy-.28)*18, 52, 128);
      const dur = 60/bpm/4;
      const swing = this.step%2 ? dur*this.scene.swing : 0;
      this._musicStep(this.step, this.next+swing);
      this.onBeat(this.step, this.next);
      this.step = (this.step+1)%16;
      this.next += dur;
    }
  }

  _musicStep(step, when) {
    if (!this.soundOn) return;
    const b = step%16, s=this.scene, aperture=this.aperture>0;
    if (aperture) this.aperture--;
    if ([0,4,8,12].includes(b) && s.kick > .1) this._kick(when, (.28+.24*this.energy)*s.kick*(aperture?.62:1));
    const hatMask = this.sceneName==='TRANCE' ? (b%2===0 || b===3 || b===11) : this.sceneName==='WOOD' ? [2,6,10,14].includes(b) : b%2===0;
    if (!aperture && hatMask && Math.random() < s.hats*(.54+.35*this.density)) this._hat(when,b%4? .46:.72,(b%4-1.5)*.16);
    if (b%4===0) {
      const root = s.root + s.scale[((this.rotation%7)+7)%7];
      this._tone(root-12,when,aperture?.46:.30,.016+.016*this.energy,s.bass,Math.min(1100,s.cut));
    }
    if (!aperture && this.motif.length) {
      const m = this.motif[(Math.floor(b/2)+step) % this.motif.length];
      const active = this.sceneName==='TRANCE' ? b%2===1 : [1,5,9,13].includes(b) || (this.density>.62 && b%4===3);
      if (active) {
        const n = s.root+12+s.scale[m.degree%s.scale.length]+(m.type===2?12:0);
        this._pluck(n,when,.20+.12*this.energy,(m.slot/11)*1.2-.6,this.sceneName==='VOID');
      }
    }
  }

  _tone(m, when, dur=.15, vel=.02, type='triangle', cut=1800, pan=0) {
    const c=this.ctx, o=c.createOscillator(), f=c.createBiquadFilter(), g=c.createGain(), p=c.createStereoPanner?c.createStereoPanner():null;
    o.type=type; o.frequency.value=mhz(m); f.type='lowpass'; f.frequency.value=Math.max(300,cut); f.Q.value=1.2;
    g.gain.setValueAtTime(.0001,when); g.gain.exponentialRampToValueAtTime(Math.max(.001,vel),when+.008); g.gain.exponentialRampToValueAtTime(.0001,when+dur);
    o.connect(f); f.connect(g); if(p){p.pan.value=clamp(pan,-1,1);g.connect(p);p.connect(this.master)}else g.connect(this.master);
    o.start(when); o.stop(when+dur+.03);
  }

  _pluck(m, when, vel=.3, pan=0, wet=false) {
    const c=this.ctx, o1=c.createOscillator(), o2=c.createOscillator(), f=c.createBiquadFilter(), g=c.createGain(), p=c.createStereoPanner?c.createStereoPanner():null;
    o1.type='triangle'; o2.type='sine'; o1.frequency.value=mhz(m); o2.frequency.value=mhz(m)*2.002;
    f.type='lowpass'; f.frequency.setValueAtTime(Math.min(6500,this.scene.cut*1.8),when); f.frequency.exponentialRampToValueAtTime(Math.max(500,this.scene.cut*.35),when+.28); f.Q.value=4;
    g.gain.setValueAtTime(.0001,when); g.gain.exponentialRampToValueAtTime(.018*vel,when+.005); g.gain.exponentialRampToValueAtTime(.0001,when+.34);
    o1.connect(f);o2.connect(f);f.connect(g); if(p){p.pan.value=pan;g.connect(p);p.connect(this.master);if(wet)p.connect(this.delay)}else {g.connect(this.master);if(wet)g.connect(this.delay)}
    o1.start(when);o2.start(when);o1.stop(when+.37);o2.stop(when+.37);
  }

  _kick(when, vel=.6) {
    const c=this.ctx,o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(115,when);o.frequency.exponentialRampToValueAtTime(42,when+.09);
    g.gain.setValueAtTime(.0001,when);g.gain.exponentialRampToValueAtTime(.052*vel,when+.004);g.gain.exponentialRampToValueAtTime(.0001,when+.22);o.connect(g).connect(this.master);o.start(when);o.stop(when+.24);
  }

  _hat(when, vel=.7, pan=0) {
    if (!this.noise) return;
    const c=this.ctx,src=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain(),p=c.createStereoPanner?c.createStereoPanner():null;
    src.buffer=this.noise;f.type='highpass';f.frequency.value=3000;g.gain.setValueAtTime(.0001,when);g.gain.exponentialRampToValueAtTime(.006*vel,when+.002);g.gain.exponentialRampToValueAtTime(.0001,when+.045);src.connect(f);f.connect(g);if(p){p.pan.value=pan;g.connect(p).connect(this.master)}else g.connect(this.master);src.start(when,Math.random()*.5,.05);
  }
}
