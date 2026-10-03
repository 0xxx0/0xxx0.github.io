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
  glyph:r=>globalThis.FieldGlyph?{
    recipe:{lensId:'field-glyph',lensVersion:'1',kind:'VIEW_LENS',authority:'PREVIEW',params:{},
      inputContract:'field-route/v0.1',outputContract:'projection/glyph',preserves:['identity','address'],
      hides:['content','depth','time','authority','evidence'],derives:['kind frame','operation mark','state color']},
    descriptor:globalThis.FieldGlyph.parts(r),svg:globalThis.FieldGlyph.svg(r)
  }:null,
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
function mountAwake(){
  if(location.pathname!=='/'||document.querySelector('script[data-field-awake-visor]'))return;
  const s=document.createElement('script');s.src='./field-awake-visor.js?v=0.8.34';s.async=false;s.dataset.fieldAwakeVisor='0.8.34';
  s.onload=()=>queueMicrotask(()=>{
    const t=document.querySelector('.fieldAwakeTrigger'),depth=document.querySelector('.footMenu');
    if(!t||!depth)return;t.textContent='AWAKE / VISOR →';t.style.cssText='display:block;width:100%;margin-top:3px;padding:6px 8px;text-align:left;border:1px solid #59676d;color:#d5ad68;background:#090d0f;font-size:6.5px;letter-spacing:.09em;white-space:nowrap';depth.appendChild(t)
  });
  document.head.appendChild(s);
}
window.addEventListener('field-index:state',e=>sync(e.detail||{}));
const f=globalThis.FieldLensHost.focus?.();if(f?.href)sync({focus:f.href,projection:globalThis.FieldLensHost.projection?.()});
globalThis.FieldInterphase=host;
// AWAKE is a first-contact projection of this FIELD/INTERPHASE carrier, not a second host.
// Exact visual donors remain frozen at /recovery/semantic-painting-v0.8/ and the historical /wake handscroll lineage.
mountAwake();
})();