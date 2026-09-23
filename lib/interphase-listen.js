(()=>{'use strict';
if(!globalThis.Interphase||!globalThis.FoldBloomListen)return;
const I=globalThis.Interphase,API=globalThis.FoldBloomListen;
const sourceId=()=>API.state?.()?.fileMeta?.hash||API.state?.()?.glyph?.sourceHash||'listen:empty';
const adapter={
  id:'fold-bloom-listen',
  idOf:r=>typeof r==='string'?r:sourceId(),
  resolve:r=>typeof r==='string'?r:sourceId(),
  describe:()=>{
    const s=API.state?.()||{},p=s.map?{time:s.time,duration:s.map.duration,bpm:s.map.bpm,scope:s.scope,stage:s.stage}:null,id=sourceId();
    return {
      id,kind:'audio-source',label:s.fileMeta?.name||'LISTEN',
      address:{sourceHash:s.fileMeta?.hash||null,time:s.time||0,scope:s.scope||null},
      channels:['identity','address','content','time','authority','evidence'],
      capabilities:['read'],
      operations:[{id:'SEEK',authority:'VIEW',reversible:true},{id:'APERTURE',authority:'VIEW',reversible:true}],
      authority:'VIEW',clock:{type:'PLAYBACK',current:s.time||0,duration:s.map?.duration||0},
      value:{source:s.fileMeta||null,transport:p,pins:s.pins||[],glyph:s.glyph||null,rideProfile:s.rideProfile||null}
    };
  },
  read:()=>API.state?.()||{},
  capture:()=>{const s=API.state?.()||{};return{time:s.time||0,scope:s.scope||null}},
  restore:s=>{if(s?.scope)API.aperture?.(s.scope);if(Number.isFinite(Number(s?.time)))API.seek?.(Number(s.time))},
  invoke:(_r,op,args)=>{
    if(op==='SEEK')return{ok:true,evidence:API.seek?.(args.time)};
    if(op==='APERTURE')return{ok:true,evidence:API.aperture?.(args.scope)};
    return{ok:false,reason:'SUPPORT=0:'+op};
  }
};
const host=I.createHost(adapter,{id:'FOLD_BLOOM_LISTEN',projection:'PAGE'});
function sync(){const id=sourceId();host.select(id);host.focus(id,{aperture:API.state?.()?.scope||'PHRASE'});host.project('PAGE',{host:'LISTEN'});}
window.addEventListener('fold-bloom-listen:state',sync);
queueMicrotask(sync);
globalThis.FoldBloomListenInterphase=host;
})();