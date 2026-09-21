(()=>{'use strict';
const LEVELS=[
  {name:'MARK',max:520},
  {name:'COMPACT',max:900},
  {name:'FULL',max:Infinity}
];
function levelFor(width){return LEVELS.find(x=>width<=x.max)?.name||'FULL'}
function apply(){
  const w=Math.max(document.documentElement.clientWidth||0,window.innerWidth||0);
  const next=levelFor(w),root=document.documentElement,prev=root.dataset.density;
  root.dataset.density=next;
  root.style.setProperty('--field-density',next);
  if(prev!==next)window.dispatchEvent(new CustomEvent('field-density',{detail:{from:prev||null,to:next,width:w}}));
  return next;
}
function choose(spec,level=document.documentElement.dataset.density||apply()){
  return spec?.[level]??spec?.FULL??spec?.COMPACT??spec?.MARK??null;
}
let ro;try{ro=new ResizeObserver(apply);ro.observe(document.documentElement)}catch(_){window.addEventListener('resize',apply,{passive:true})}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',apply,{once:true}):apply();
window.FieldPresentation={LEVELS,levelFor,apply,choose};
})();