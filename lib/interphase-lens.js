(()=>{'use strict';
if(!globalThis.Interphase||!globalThis.ScaleLensSpatialAPI)return;
const I=globalThis.Interphase,API=globalThis.ScaleLensSpatialAPI;
const adapter={
  id:'scale-lens',
  idOf:r=>typeof r==='string'?r:(r?.id||API.snapshot?.()?.selectedId||'scale-lens'),
  resolve:r=>typeof r==='string'?r:(r?.id||API.snapshot?.()?.selectedId||'scale-lens'),
  describe:ref=>{
    const s=API.snapshot?.()||{},id=String(ref||s.selectedId||'scale-lens'),node=(s.chain||[]).find(x=>x.id===id)||((s.selectedId===id)?(s.chain||[]).at(-1):null)||{};
    return {
      id,kind:node.kind||'scale-object',label:node.label||id,
      address:{canonical:s.address?.canonical||null,projection:s.address?.projection||null,range:s.address?.range||null,domain:s.domain||null,scope:s.scopeName||s.scope||null},
      channels:['identity','address','content','depth','authority','evidence'],
      capabilities:['read'],
      operations:[
        {id:'FOCUS',authority:'VIEW',reversible:true},
        {id:'APERTURE',authority:'VIEW',reversible:true},
        {id:'PROJECT',authority:'VIEW',reversible:true}
      ],
      authority:'VIEW',parent:(s.chain||[]).length>1?(s.chain||[]).at(-2)?.id||null:null,
      children:[],
      value:{selectedId:s.selectedId,domain:s.domain,scope:s.scope,scopeName:s.scopeName,identity:s.identity,address:s.address,chain:s.chain,lensState:API.lensState?.()||null}
    };
  },
  read:()=>API.snapshot?.()||{},
  capture:()=>API.snapshot?.()||null,
  restore:s=>{
    if(!s)return;
    if(s.domain)API.project?.(s.domain);
    const cur=API.snapshot?.();if(Number.isFinite(Number(s.scope))&&Number.isFinite(Number(cur?.scope)))API.aperture?.(Number(s.scope)-Number(cur.scope));
    if(s.selectedId)API.focus?.(s.selectedId);
  },
  invoke:(_r,op,args)=>{
    if(op==='FOCUS'){API.focus?.(args.id);return{ok:true,evidence:{focus:args.id}}}
    if(op==='APERTURE'){API.aperture?.(Number(args.delta)||0);return{ok:true,evidence:{delta:Number(args.delta)||0}}}
    if(op==='PROJECT'){API.project?.(args.domain);return{ok:true,evidence:{domain:args.domain}}}
    return{ok:false,reason:'SUPPORT=0:'+op};
  }
};
const host=I.createHost(adapter,{id:'SCALE_LENS',projection:'PAGE'});
function sync(s=API.snapshot?.()){
  if(!s?.selectedId)return;
  host.select(s.selectedId);host.focus(s.selectedId,{aperture:s.scopeName||String(s.scope??'DETAIL')});
  host.project('PAGE',{domain:s.domain,scope:s.scope});
}
window.addEventListener('scale-lens:state',e=>sync(e.detail||API.snapshot?.()));
queueMicrotask(()=>sync());
globalThis.ScaleLensInterphase=host;
})();