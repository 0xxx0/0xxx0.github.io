const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const fract=x=>x-Math.floor(x);
const PHI=(Math.sqrt(5)-1)/2,TAU=Math.PI*2;

function hexRgb(hex){
  const h=String(hex||'#000').replace('#',''),v=parseInt(h.length===3?h.split('').map(c=>c+c).join(''):h,16);
  return [((v>>16)&255)/255,((v>>8)&255)/255,(v&255)/255];
}
function rgbHex(rgb){
  return '#'+rgb.map(x=>Math.round(clamp(x,0,1)*255).toString(16).padStart(2,'0')).join('');
}
const srgbLin=c=>c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4);
const linSrgb=c=>c<=.0031308?12.92*c:1.055*Math.pow(Math.max(0,c),1/2.4)-.055;
function rgbOklab(rgb){
  const [r,g,b]=rgb.map(srgbLin);
  const l=.4122214708*r+.5363325363*g+.0514459929*b,m=.2119034982*r+.6806995451*g+.1073969566*b,sv=.0883024619*r+.2817188376*g+.6299787005*b;
  const l_=Math.cbrt(l),m_=Math.cbrt(m),s_=Math.cbrt(sv);
  return [.2104542553*l_+.793617785*m_-.0040720468*s_,1.9779984951*l_-2.428592205*m_+.4505937099*s_,.0259040371*l_+.7827717662*m_-.808675766*s_];
}
function oklabRgb([L,a,b]){
  const l_=L+.3963377774*a+.2158037573*b,m_=L-.1055613458*a-.0638541728*b,s_=L-.0894841775*a-1.291485548*b;
  const l=l_**3,m=m_**3,sv=s_**3;
  return [
    linSrgb(4.0767416621*l-3.3077115913*m+.2309699292*sv),
    linSrgb(-1.2684380046*l+2.6097574011*m-.3413193965*sv),
    linSrgb(-.0041960863*l-.7034186147*m+1.707614701*sv)
  ];
}
export function mixHexOklab(a,b,t=.5){
  t=clamp(Number(t)||0,0,1);const A=rgbOklab(hexRgb(a)),B=rgbOklab(hexRgb(b));
  return rgbHex(oklabRgb([lerp(A[0],B[0],t),lerp(A[1],B[1],t),lerp(A[2],B[2],t)]));
}
const COLOR_KEYS=['bg0','bg1','roadA','roadB','edge','side','accent'];
export function mixVisualWorld(a,b,t=.5){
  t=clamp(Number(t)||0,0,1);const out={...b};
  for(const k of COLOR_KEYS)out[k]=mixHexOklab(a?.[k]||b[k],b[k],t);
  for(const k of ['horizonGain','patternGain','solidBase','sectionPulse'])out[k]=lerp(Number(a?.[k]??b[k])||0,Number(b[k])||0,t);
  out.pattern=t<.5?(a?.pattern||b.pattern):b.pattern;out.mix=t;return out;
}

export const VISUAL_WORLD_SCHEMA='fold-bloom-visual-world/v0.2';

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
  const idx=Number(sectionIndex)||0,parity=((idx)%2+2)%2,sectionPhase=fract(idx*PHI),sectionPulse=.5+.5*Math.cos(TAU*sectionPhase);
  const tint=scene==='WOOD'?'#ffe0a8':scene==='TRANCE'?'#d6c7ff':scene==='VOID'?'#8f88a3':'#c9efff';
  const bgLift=.025+.035*sectionPulse,roadLift=.04+.055*(1-sectionPulse);
  return {
    schema:VISUAL_WORLD_SCHEMA,
    ...base,
    sectionIndex:idx,
    sectionPhase,
    sectionPulse,
    parity,
    bg0:mixHexOklab(base.bg0,tint,bgLift),
    roadA:mixHexOklab(parity?base.roadOdd:base.roadEven,tint,roadLift),
    roadB:mixHexOklab(parity?base.roadEven:base.roadOdd,tint,roadLift*.65),
    accent:mixHexOklab(base.accent,tint,.04+.06*sectionPulse),
    horizonGain:clamp((.55+energy*.42+brightness*.18)*(.92+.16*sectionPulse),.42,1.28),
    patternGain:clamp((.45+energy*.42)*(.88+.20*(1-sectionPulse)),.30,1.15),
    solidBase:scene==='VOID'?.98:1
  };
}

export function normalizeRideProfile(x={}){
  return {
    schema:'fold-bloom-ride-profile/v0.2',
    solidity:clamp(Number(x.solidity??1),.72,1),
    immersion:clamp(Number(x.immersion??1),.55,1.45),
    dropGain:clamp(Number(x.dropGain??1),.55,1.85),
    anticipation:clamp(Number(x.anticipation??1),.55,1.8),
    motionGain:clamp(Number(x.motionGain??1),.45,1.65),
    textOffset:clamp(Number(x.textOffset??0),-8,8)
  };
}

export function profileKey(sourceKey='GLOBAL'){
  return 'fold-bloom.ride-profile.v01:'+String(sourceKey||'GLOBAL');
}
