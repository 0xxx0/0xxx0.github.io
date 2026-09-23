(()=>{'use strict';
if(!globalThis.Interphase||!globalThis.FieldLensHost||!globalThis.__fieldRouteMap)return;
const I=globalThis.Interphase,MAP=globalThis.__fieldRouteMap;
const adapter={
  id:'field-routes',
  idOf:r=>typeof r==='string'?r:r?.href,
  resolve:r=>typeof r==='string'?MAP.get(r):r,
  describe:r=>{
    const all=MAP.all?MAP.all():new Map();
    return {
      id:r.href,kind:r.kind||'route',label:r.title||r.href,
      address:{href:r.href,parent:r.parent||'/'},
      channels:['identity','address','content','depth','authority','evidence'],
      capabilities:['read'],operations:[{id:'OPEN',authority:'EFFECT',reversible:false}],
      authority:'VIEW',parent:r.parent||null,
      children:[...all.values()].filter(x=>x.parent===r.href).map(x=>x.href),
      value:{state:r.state,operation:r.operation,role:r.role,version:r.version,receipt:r.receipt||null,transfer:r.transfer||[]}
    };
  },
  read:r=>({href:r.href,title:r.title,state:r.state,operation:r.operation,role:r.role,version:r.version,parent:r.parent,receipt:r.receipt||null}),
  capture:()=>globalThis.FieldLensHost.uiState?.()||null,
  restore:s=>globalThis.FieldLensHost.restore?.(s),
  invoke:()=>({ok:false,reason:'GENERIC_FIELD_EFFECT_DISABLED'})
};
const host=I.createHost(adapter,{id:'FIELD',projection:'PAGE'});
function sync(detail={}){
  const href=detail.focus||globalThis.FieldLensHost.focus?.()?.href;if(!href)return;
  host.select(href);host.focus(href,{aperture:'ROUTE'});
  const p=String(detail.projection||globalThis.FieldLensHost.projection?.()||'PAGE').toUpperCase();
  host.project(host.projections[p]?p:'PAGE',{hostProjection:p});
}
window.addEventListener('field-index:state',e=>sync(e.detail||{}));
const f=globalThis.FieldLensHost.focus?.();if(f?.href)sync({focus:f.href,projection:globalThis.FieldLensHost.projection?.()});
globalThis.FieldInterphase=host;
})();