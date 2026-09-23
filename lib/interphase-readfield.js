(()=>{'use strict';
if(!globalThis.Interphase)return;
const ap=document.getElementById('docAperture');if(!ap)return;
const I=globalThis.Interphase;
const refOf=s=>s?.address||('readfield://'+encodeURIComponent(s?.label||'source')+'/'+(s?.scale||'WHOLE')+'/'+(s?.index??0));
const adapter={
  id:'readfield',
  idOf:r=>typeof r==='string'?r:refOf(ap.snapshot?.()),
  resolve:r=>({ref:typeof r==='string'?r:refOf(ap.snapshot?.())}),
  describe:()=>{const s=ap.snapshot?.()||{};return{
    id:refOf(s),kind:'readfield-focus',label:s.focus||s.label||'READFIELD',
    address:{source:s.label||null,address:s.address||null,scale:s.scale,index:s.index,char_index:s.char_index},
    channels:['identity','address','content','depth','time'],capabilities:['read'],operations:[{id:'SEEK',authority:'EDIT',reversible:true},{id:'SCALE',authority:'EDIT',reversible:true}],authority:'VIEW',
    clock:{type:s.playing?'RSVP':'ADDRESS',wpm:s.wpm||null,playing:!!s.playing},
    value:s
  }},
  read:()=>ap.snapshot?.()||{},
  capture:()=>ap.snapshot?.()||null,
  restore:s=>ap.restore?.(s),
  invoke:(_r,op,args)=>{
    if(op==='SEEK'){if(args.address){const hit=ap.locate?.(args.address);if(hit){ap.scale=hit.scale;ap.setPos?.(hit.index);return{ok:true,evidence:{address:args.address}}}}if(Number.isFinite(Number(args.fraction))){ap.seekFraction?.(Number(args.fraction));return{ok:true,evidence:{fraction:Number(args.fraction)}}}return{ok:false,reason:'SEEK_TARGET_REQUIRED'}}
    if(op==='SCALE'){ap.setScale?.(ap.scaleIndex?.(args.scale));return{ok:true,evidence:{scale:args.scale}}}
    return{ok:false,reason:'SUPPORT=0:'+op};
  }
};
const host=I.createHost(adapter,{id:'READFIELD',projection:'PAGE'});
function sync(s){const ref=refOf(s);host.select(ref);host.focus(ref,{aperture:s.scale||'DETAIL'});const view=(new URLSearchParams(location.search).get('read_view')||'PAGE').toUpperCase();host.project(host.projections[view]?view:'PAGE',{readfieldView:view});}
ap.addEventListener('aperture-focus',e=>sync(e.detail||ap.snapshot?.()||{}));
queueMicrotask(()=>{const s=ap.snapshot?.();if(s?.label)sync(s)});
globalThis.ReadfieldInterphase=host;
})();