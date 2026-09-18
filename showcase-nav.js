(()=>{'use strict';
const ROOT='/';
const KEY='showcase:last';
const norm=p=>{p=(p||location.pathname).replace(/\/index\.html$/,'/');return p||'/';};
const fallbackParent=p=>{
  if(p.startsWith('/fold-bloom/')&&p!=='/fold-bloom/') return '/fold-bloom/';
  if(p.startsWith('/foundry/convergence/')&&p!=='/foundry/convergence/') return '/foundry/convergence/';
  if(p.startsWith('/foundry/')&&p!=='/foundry/') return '/foundry/';
  return '/';
};
const go=u=>{location.href=u;};
async function start(){
  if(norm()==='/') return;
  let data=null;
  try{data=await fetch('/showcase-manifest.json',{cache:'no-store'}).then(r=>r.ok?r.json():null);}catch(_){}
  const p=norm();
  const route=data?.routes?.find(x=>norm(x.href)===p) || {href:p,title:(document.title||p),kind:'artifact',parent:fallbackParent(p)};
  const parent=route.parent||fallbackParent(p);
  if(route.kind==='artifact'){
    try{localStorage.setItem(KEY,JSON.stringify({href:route.href,title:route.title,operation:route.operation||'',state:route.state||'',at:Date.now()}));}catch(_){}
  }
  const host=document.createElement('div');
  host.id='showcase-route-adapter';
  const sh=host.attachShadow({mode:'open'});
  sh.innerHTML=`<style>
  :host{all:initial}
  .tab{position:fixed;z-index:2147483647;left:max(7px,env(safe-area-inset-left));bottom:max(7px,env(safe-area-inset-bottom));width:34px;height:34px;border:1px solid #66727a;background:#090b0de8;color:#eef1ed;font:700 15px ui-monospace,monospace;cursor:pointer;box-shadow:0 2px 14px #0007}
  .panel{position:fixed;z-index:2147483647;left:max(7px,env(safe-area-inset-left));bottom:max(47px,calc(env(safe-area-inset-bottom) + 47px));width:min(320px,calc(100vw - 14px));border:1px solid #39454d;background:#090b0df5;color:#eef1ed;font:10px/1.45 ui-monospace,monospace;box-shadow:0 7px 28px #000a;display:none}
  .panel.on{display:block}.head{padding:10px 11px;border-bottom:1px solid #29343a}.ey{color:#7f8b92;font-size:8px;letter-spacing:.13em}.title{font-weight:800;margin-top:3px}.state{float:right;color:#9ed88c}.state.compat{color:#d9ad62}
  .actions{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#29343a}.actions button,.family{border:0;background:#0f1317;color:#eef1ed;padding:10px 7px;font:800 9px ui-monospace,monospace;cursor:pointer;text-decoration:none;text-align:center}.actions button:hover,.actions button:focus,.family:hover{background:#172027;outline:none}
  .foot{padding:8px 10px;color:#69757c;font-size:8px;border-top:1px solid #29343a}.family{display:block;border-top:1px solid #29343a;text-align:left;color:#9ba6ac}
  </style>
  <button class="tab" aria-label="Open showcase navigation" title="Showcase navigation">↖</button>
  <nav class="panel" aria-label="Showcase route">
    <div class="head"><span class="state ${String(route.state||'').toLowerCase()}">${route.state||route.kind.toUpperCase()}</span><div class="ey">${route.operation||route.family||'PUBLIC ROUTE'}</div><div class="title">${route.title}</div></div>
    <div class="actions"><button data-a="back">← BACK</button><button data-a="up">↑ PARENT</button><button data-a="home">⌂ SHOWCASE</button></div>
    ${route.family?'<a class="family" href="'+(route.family==='FOLD // BLOOM'?'/fold-bloom/':'/foundry/')+'">'+route.family+' / FAMILY</a>':''}
    <div class="foot">ALT+↑ parent · ALT+HOME showcase · ESC close</div>
  </nav>`;
  document.documentElement.appendChild(host);
  const tab=sh.querySelector('.tab'),panel=sh.querySelector('.panel');
  const close=()=>panel.classList.remove('on');
  tab.onclick=()=>panel.classList.toggle('on');
  sh.querySelector('[data-a="back"]').onclick=()=>history.length>1?history.back():go(parent);
  sh.querySelector('[data-a="up"]').onclick=()=>go(parent);
  sh.querySelector('[data-a="home"]').onclick=()=>go(ROOT);
  addEventListener('keydown',e=>{
    if(e.key==='Escape') close();
    if(e.altKey&&e.key==='ArrowUp'){e.preventDefault();go(parent);}
    if(e.altKey&&e.key==='Home'){e.preventDefault();go(ROOT);}
  });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();