import {normalizeScore} from './score.js';

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number(v)||0));

export function scoreFromReplayHandoff(p={}){
  const src=p.source||{},interval=Array.isArray(p.interval_ms)?p.interval_ms:[0,Math.min(Number(src.duration_ms)||12000,12000)];
  const rel=clamp(((Number(p.position_ms)||interval[0])-interval[0])/Math.max(1,interval[1]-interval[0]));
  const marks=Array.isArray(p.evidence?.marks)?p.evidence.marks:[],nearest=marks.slice().sort((a,b)=>Math.abs((a.p??0)-rel)-Math.abs((b.p??0)-rel))[0];
  const cells=p.addressedMessage?.path?.cells||[],fallback=cells.find(x=>x.label||x.note);
  const message=(nearest?.label||nearest?.note||fallback?.label||fallback?.note||p.suggestedMessage||'MEET ME HERE').slice(0,180);
  return normalizeScore({
    source:{
      id:src.id||src.key||'listen:source',profile_key:src.profile_key||src.key||src.id,name:src.name||'LISTEN SOURCE',kind:src.kind||'AUDIO_MAP',
      duration_ms:src.duration_ms||Math.max(interval[1]||12000,12000),interval_ms:interval,address:src.address||'',public_address:src.public_address||''
    },
    context:{
      title:p.context?.title||'WHY THIS MOMENT',
      body:p.context?.body||((p.scope||'ADDRESS')+' · '+cells.length+' authored mark'+(cells.length===1?'':'s')+' · source evidence')
    },
    message,
    operations:p.operations||[
      {type:'COMPRESS',at:.14,span:.12,intensity:.7},{type:'MESSAGE',at:.28,span:.18,intensity:.9},
      {type:'DROP',at:.5,span:.08,intensity:1},{type:'BLOOM',at:.58,span:.18,intensity:.9},{type:'RETURN',at:.92,span:.14,intensity:1}
    ],
    experience:{layer:p.layer||'IMMERSION',scene:p.scene||'DEEP',profile:p.rideProfile||{}},
    evidence:p.evidence||{},
    returnAddress:p.returnAddress||'/fold-bloom/'
  });
}
