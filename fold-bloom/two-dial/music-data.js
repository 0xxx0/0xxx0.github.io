'use strict';
window.FoldBloomMusicData = Object.freeze({
  version: '0.10.0',
  worlds: Object.freeze({
    TRANCE: Object.freeze({
      name:'TRANCE',
      desc:'Forward minor/Dorian drive. Four-floor gravity, bright pulse and long-release tension.',
      scale:[0,2,3,5,7,8],
      root:45,bpm:112,cut:4800,delay:.24,sync:.22,pulse:[0,3,6,8,11,14],
      bass:'triangle',body:'sawtooth',lead:'square'
    }),
    DRIFT: Object.freeze({
      name:'DRIFT',
      desc:'Slow suspended hexatonic field. Sparse events, long air and low harmonic gravity.',
      scale:[0,2,5,7,9,12],
      root:41,bpm:60,cut:1900,delay:.34,sync:.08,pulse:[0,7,11],
      bass:'sine',body:'sine',lead:'triangle'
    })
  }),
  voices: Object.freeze({
    AIR:Object.freeze({name:'AIR',desc:'Original soft oscillator/pluck voice. Wide, clean and low-fatigue.',synth:'air',brightness:1,motion:.9,live:'sine'}),
    WOOD:Object.freeze({name:'WOOD',desc:'Short resonant wooden knock/pluck with a noise transient.',synth:'wood',brightness:.78,motion:.72,live:'triangle'}),
    FM:Object.freeze({name:'FM',desc:'Sine carrier with velocity-scaled FM; glassy at low energy, biting when pushed.',synth:'fm',brightness:1.08,motion:.9,live:'sine',ratio:2.01,index:3.4}),
    BELL:Object.freeze({name:'BELL',desc:'Inharmonic additive partials and long decays; sparse gestures ring into one another.',synth:'bell',brightness:1.18,motion:.58,live:'sine',partials:[1,2.01,3.98,6.12]}),
    BOW:Object.freeze({name:'BOW',desc:'Slow dual-oscillator body with soft attack; favors held harmony and form.',synth:'bow',brightness:.72,motion:.5,live:'triangle'}),
    DIRTY:Object.freeze({name:'DIRTY',desc:'Saw/square edge through the shared saturator; strongest with DRIVE or BROKEN groove.',synth:'dirty',brightness:.9,motion:1.08,live:'sawtooth'})
  }),
  grooves: Object.freeze({
    GROUND:Object.freeze({name:'GROUND',desc:'Sparse stable pulse. Leaves room for dial consequences.',kick:[0,8],snare:[4,12],hats:7,rot:0,swing:.01}),
    DRIVE:Object.freeze({name:'DRIVE',desc:'Four-floor propulsion with denser hats; useful for trance and long play.',kick:[0,4,8,12],snare:[4,12],hats:11,rot:0,swing:.015}),
    SWING:Object.freeze({name:'SWING',desc:'Lopsided pocket with delayed offbeats and restrained kick.',kick:[0,7,10],snare:[4,12],hats:8,rot:1,swing:.16}),
    BROKEN:Object.freeze({name:'BROKEN',desc:'Displaced kick/snare skeleton; relation changes read as rhythmic edits.',kick:[0,3,10,14],snare:[6,12],hats:9,rot:2,swing:.045}),
    POLY:Object.freeze({name:'POLY',desc:'Sixteen-step ground crossed by a 7-in-12 air pulse; phase takes longer to close.',kick:[0,8,11],snare:[4,12],hats:5,rot:0,swing:.025,poly:[7,12,1]})
  }),
  scopes: Object.freeze({
    PULSE:Object.freeze({name:'PULSE',desc:'The operator mainly rewrites rhythm: rotation, reversal, stacking and restatement.'}),
    VOICE:Object.freeze({name:'VOICE',desc:'The operator mainly changes voicing, density, energy and spectral behavior.'}),
    MOTIF:Object.freeze({name:'MOTIF',desc:'The operator mainly edits learned phrase material: extend, mirror, rotate or recall.'}),
    FORM:Object.freeze({name:'FORM',desc:'The operator mainly changes tension, cadence and section-scale trajectory.'})
  })
});
