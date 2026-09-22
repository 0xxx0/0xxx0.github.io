const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

export const VISUAL_WORLD_SCHEMA='fold-bloom-visual-world/v0.1';

export const VISUAL_WORLDS=Object.freeze({
  DEEP:Object.freeze({
    name:'DEEP',bg0:'#0a1520',bg1:'#03070b',roadEven:'#3e8fbd',roadOdd:'#a75b38',edge:'#d7edf8',side:'#09131b',accent:'#7fcfff',pattern:'DEPTH'
  }),
  TRANCE:Object.freeze({
    name:'TRANCE',bg0:'#190b21',bg1:'#040207',roadEven:'#7d5dff',roadOdd:'#24cfe8',edge:'#f1eaff',side:'#14091b',accent:'#d8b4ff',pattern:'LASER'
  }),
  WOOD:Object.freeze({
    name:'WOOD',bg0:'#1a1209',bg1:'#050403',roadEven:'#b87937',roadOdd:'#6e4627',edge:'#f0d1a0',side:'#1b1008',accent:'#e9b86f',pattern:'GRAIN'
  }),
  VOID:Object.freeze({
    name:'VOID',bg0:'#08070b',bg1:'#000000',roadEven:'#504b63',roadOdd:'#26232f',edge:'#c8c1da',side:'#09080c',accent:'#958da9',pattern:'VOID'
  })
});

export function visualWorld(scene='DEEP',sectionIndex=0,features={}){
  const base=VISUAL_WORLDS[scene]||VISUAL_WORLDS.DEEP;
  const energy=clamp(Number(features.energy)||0,0,1.2),brightness=clamp(Number(features.brightness)||0,0,1);
  const parity=((Number(sectionIndex)||0)%2+2)%2;
  return {
    schema:VISUAL_WORLD_SCHEMA,
    ...base,
    sectionIndex:Number(sectionIndex)||0,
    parity,
    roadA:parity?base.roadOdd:base.roadEven,
    roadB:parity?base.roadEven:base.roadOdd,
    horizonGain:clamp(.55+energy*.42+brightness*.18,.45,1.2),
    patternGain:clamp(.45+energy*.42,.35,1.05),
    solidBase:scene==='VOID'?.90:.94
  };
}

export function normalizeRideProfile(x={}){
  return {
    schema:'fold-bloom-ride-profile/v0.1',
    solidity:clamp(Number(x.solidity??1),.72,1),
    immersion:clamp(Number(x.immersion??1),.55,1.45),
    dropGain:clamp(Number(x.dropGain??1),.55,1.65),
    textOffset:clamp(Number(x.textOffset??0),-8,8)
  };
}

export function profileKey(sourceKey='GLOBAL'){
  return 'fold-bloom.ride-profile.v01:'+String(sourceKey||'GLOBAL');
}
