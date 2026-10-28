(()=>{'use strict';
if(!globalThis.Interphase||!globalThis.ScaleLensSpatialAPI)return;
const I=globalThis.Interphase,API=globalThis.ScaleLensSpatialAPI;
const idOf=r=>typeof r==='string'?r:r?.id||API.snapshot()?.selectedId;
const resolve=r=>{const id=idOf(r);API.lookup(id);return id};
const adapter={
  id:'scale-lens',idOf,resolve,
  describe:ref=>{
    const n=API.lookup(resolve(ref));
    return {id:n.id,kind:n.kind,label:n.label,address:n.address,
      channels:['identity','address','content','depth','authority','evidence'],capabilities:['read'],
      operations:[{id:'FOCUS',authority:'VIEW',reversible:true},{id:'APERTURE',authority:'VIEW',reversible:true},{id:'PROJECT',authority:'VIEW',reversible:true}],
      authority:'VIEW',parent:n.parent,children:n.children,value:n};
  },
  read:ref=>API.lookup(resolve(ref)),
  capture:()=>API.snapshot(),
  restore:s=>API.restore(s),
  invoke:(ref,op,args={})=>{
    try{
      let result;
      if(op==='FOCUS')result=API.focus(args.id||resolve(ref));
      else if(op==='APERTURE'){
        if(!Number.isFinite(Number(args.delta)))throw Error('LENS_APERTURE_INVALID');
        result=API.aperture(Number(args.delta));
      }else if(op==='PROJECT')result=API.project(args.domain);
      else return{ok:false,reason:'SUPPORT=0:'+op};
      return{ok:true,evidence:result};
    }catch(e){return{ok:false,reason:e.message}}
  }
};
const host=I.createHost(adapter,{id:'SCALE_LENS',projection:'PAGE'});
let initialized=false;
function sync(s=API.snapshot()){
  if(!s?.selectedId||initialized)return;
  // Initialize the native focus once. Explicit selected/pinned sets and a chosen
  // projection belong to the host; wheel/drag must not replace them with PAGE.
  initialized=true;host.select(s.selectedId);host.focus(s.selectedId,{aperture:s.scopeName||String(s.scope)});
}
window.addEventListener('scale-lens:state',e=>sync(e.detail||API.snapshot()));
queueMicrotask(()=>sync());
globalThis.ScaleLensInterphase=host;
})();
