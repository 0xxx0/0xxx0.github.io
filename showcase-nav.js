(()=>{'use strict';
const ROOT='/';
const LAST_KEY='showcase:last';
const TRAIL_KEY='showcase:trail:v1';
const norm=p=>{p=(p||location.pathname).replace(/\/index\.html$/,'/');return p||'/';};
const fallbackParent=p=>{
  if(p.startsWith('/fold-bloom/')&&p!=='/fold-bloom/') return '/fold-bloom/';
  if(p.startsWith('/foundry/convergence/')&&p!=='/foundry/convergence/') return '/foundry/convergence/';
  if(p.startsWith('/foundry/')&&p!=='/foundry/') return '/foundry/';
  return '/';
};
const go=u=>{location.href=u;};
const readTrail=()=>{try{const x=JSON.parse(sessionStorage.getItem(TRAIL_KEY)||'[]');return Array.isArray(x)?x:[]}catch(_){return []}};
const writeTrail=x=>{try{sessionStorage.setItem(TRAIL_KEY,JSON.stringify(x.slice(-40)))}catch(_){}};
const pushTrail=p=>{const t=readTrail(),n=norm(p);if(!t.length||norm(t.at(-1))!==n)t.push(n);writeTrail(t);return t};
async function start(){
  if(norm()==='/') return;
  let data=null;
  try{data=await fetch('/showcase-manifest.json',{cache:'no-store'}).then(r=>r.ok?r.json():null);}catch(_){}
  const p=norm();
  const route=data?.routes?.find(x=>norm(x.href)===p) || {href:p,title:(document.title||p),kind:'artifact',parent:fallbackParent(p)};
  const parent=route.parent||fallbackParent(p);
  const textDoc=/\.(json|md|txt|csv|log|ya?ml)$/i;
  const docsHref=value=>{
    try{
      const u=new URL(String(value||''),location.href);
      if(u.origin!==location.origin||!textDoc.test(u.pathname))return value;
      const src=u.pathname+u.search,ret=location.pathname+location.search+location.hash;
      return '/docs/?src='+encodeURIComponent(src)+'&return='+encodeURIComponent(ret);
    }catch(_){return value}
  };
  document.addEventListener('click',e=>{if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;const a=e.target?.closest?.('a[href]');if(!a||a.hasAttribute('download')||a.target==='_blank'||a.dataset?.raw==='1')return;const href=a.getAttribute('href'),mapped=docsHref(href);if(mapped&&mapped!==href){e.preventDefault();go(mapped)}},{capture:true});
  const routeState=String(route.state||'').toUpperCase();
  const statusMembrane=route.kind==='alias'?'ALIAS · MOVED':
    route.kind==='donor'||routeState==='DONOR'?'DONOR · PRESERVED':
    routeState==='FROZEN_DONOR'?'FROZEN DONOR':
    routeState==='PARKED'?'PARKED · NOT CURRENT':
    routeState==='REFERENCE'?'REFERENCE · NOT CURRENT':
    routeState==='RETIRED'?'RETIRED · NOT CURRENT':
    routeState==='SUPERSEDED'?'SUPERSEDED · NOT CURRENT':'';
  pushTrail(p);
  if(route.kind==='artifact'){
    try{localStorage.setItem(LAST_KEY,JSON.stringify({href:route.href,title:route.title,operation:route.operation||'',state:route.state||'',at:Date.now()}));}catch(_){}
  }
  const back=()=>{
    const t=readTrail();
    while(t.length&&norm(t.at(-1))===p)t.pop();
    const dest=t.at(-1)||parent||ROOT;
    writeTrail(t);
    go(dest);
  };
  const host=document.createElement('div');
  host.id='showcase-route-adapter';
  const sh=host.attachShadow({mode:'open'});
  sh.innerHTML=`<style>
  :host{all:initial}
  .tab{position:fixed;z-index:2147483647;bottom:max(7px,env(safe-area-inset-bottom));width:34px;height:34px;border:1px solid #66727a;background:#090b0de8;color:#eef1ed;font:700 15px ui-monospace,monospace;cursor:pointer;box-shadow:0 2px 14px #0007}.tab.nav{left:max(7px,env(safe-area-inset-left))}.tab.read{left:max(45px,calc(env(safe-area-inset-left) + 45px));width:46px;color:#72bce7;font-size:8px;letter-spacing:.08em}.tab.lens{left:max(95px,calc(env(safe-area-inset-left) + 95px));color:#d5ad68}
  .statusMembrane{position:fixed;z-index:2147483646;top:max(7px,env(safe-area-inset-top));right:max(7px,env(safe-area-inset-right));border:1px solid #d9ad62;background:#090b0df2;color:#d9ad62;padding:6px 8px;font:800 8px/1 ui-monospace,monospace;letter-spacing:.12em;cursor:pointer;border-radius:0;box-shadow:0 2px 14px #0007;text-transform:uppercase}.statusMembrane:hover,.statusMembrane:focus{color:#fff;border-color:#fff;outline:none}
  .panel{position:fixed;z-index:2147483647;left:max(7px,env(safe-area-inset-left));bottom:max(47px,calc(env(safe-area-inset-bottom) + 47px));width:min(330px,calc(100vw - 14px));border:1px solid #39454d;background:#090b0df5;color:#eef1ed;font:10px/1.45 ui-monospace,monospace;box-shadow:0 7px 28px #000a;display:none}
  .panel.on{display:block}.head{padding:10px 11px;border-bottom:1px solid #29343a}.ey{color:#7f8b92;font-size:8px;letter-spacing:.13em}.title{font-weight:800;margin-top:3px}.state{float:right;color:#9ed88c}.state.compat{color:#d9ad62}
  .actions{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#29343a}.actions button,.family{border:0;background:#0f1317;color:#eef1ed;padding:10px 7px;font:800 9px ui-monospace,monospace;cursor:pointer;text-decoration:none;text-align:center}.actions button:hover,.actions button:focus,.family:hover{background:#172027;outline:none}
  .foot{padding:8px 10px;color:#69757c;font-size:8px;border-top:1px solid #29343a}.family{display:block;border-top:1px solid #29343a;text-align:left;color:#9ba6ac}.meta{display:flex;border-top:1px solid #29343a}.meta a{flex:1;padding:7px 8px;color:#7f8b92;text-decoration:none;font-size:8px;text-align:center}.meta a+a{border-left:1px solid #29343a}.meta a:hover{color:#eef1ed}.lensBlock{display:none}.panel.lens .navOnly{display:none}.panel.lens .lensBlock{display:block}.lenshead{display:flex;justify-content:space-between;gap:8px;padding:10px 11px;border-bottom:1px solid #29343a}.lenshead b{color:#eef1ed}.lenshead span{color:#d5ad68;font-size:8px}.lensread{display:grid;grid-template-columns:72px 1fr;border-bottom:1px solid #29343a}.lensread span,.lensread b{padding:6px 8px;border-bottom:1px solid #20282c}.lensread span{color:#6f7d83}.lensread b{color:#d9dedd;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.lensops{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#29343a}.lensops button{border:0;background:#0f1317;color:#eef1ed;padding:9px 5px;font:800 8px ui-monospace,monospace;cursor:pointer}.lensops button:disabled{opacity:.3;cursor:not-allowed}.lensops button:not(:disabled):hover{background:#172027}.lensstack{padding:8px 9px;color:#75838a;font-size:8px;word-break:break-word;border-top:1px solid #29343a}.lensreturn{color:#d5ad68!important}.lensstudio{color:#72bce7!important}
  </style>
  ${statusMembrane?'<button class="statusMembrane" aria-label="Open route status" title="Preserved address; click for route status">'+statusMembrane+'</button>':''}
  <button class="tab nav" aria-label="Open showcase navigation" title="Showcase navigation">↖</button><button class="tab read" aria-label="Read current page in READFIELD" title="Read selection or page in READFIELD">READ</button><button class="tab lens" aria-label="Open Lens" title="Lens / refraction">◎</button>
  <nav class="panel" aria-label="Showcase route">
    <div class="head navOnly"><span class="state ${String(route.state||'').toLowerCase()}">${route.state||route.kind.toUpperCase()}</span><div class="ey">${route.operation||route.family||'PUBLIC ROUTE'}</div><div class="title">${route.title}</div></div>
    <div class="actions navOnly"><button data-a="back" title="Previous showcase route; does not undo artifact state">← BACK</button><button data-a="up" title="Declared hierarchy parent">↑ PARENT</button><button data-a="home">⌂ SHOWCASE</button></div>
    ${route.family?'<a class="family navOnly" href="'+(route.family_href||(route.family==='FOLD // BLOOM'?'/fold-bloom/':route.family==='FOUNDRY'?'/foundry/':parent||ROOT))+'">'+route.family+' / FAMILY</a>':''}
    <div class="meta navOnly"><a href="${docsHref('/showcase-manifest.json')}">MANIFEST</a>${route.receipt?'<a href="'+docsHref(route.receipt)+'">RECEIPT</a>':''}<a href="${docsHref('/control/INTERACTION_SEMANTICS.json')}">ACTION LAW</a><a href="${docsHref('/control/FIELD_INDEX_CONTRACT.json')}">FI LAW</a></div>
    <div class="foot navOnly">BACK = prior showcase route, never UNDO · ALT+↑ parent · ALT+HOME showcase · ESC close</div>
    <section class="lensBlock"><div class="lenshead"><b>LENS / ROUTE</b><span data-l="mode">ROUTE</span></div><div class="lensread"><span>OBJECT</span><b data-l="object">—</b><span>APERTURE</span><b data-l="aperture">—</b><span>VIEW</span><b data-l="view">—</b></div><div class="lensops"><button data-l="out">↑ OUT</button><button data-l="in">↓ IN</button><button data-l="projection">↔ VIEW</button><button data-l="copy">COPY STATE</button><button class="lensreturn" data-l="return">↩ RETURN</button><button class="lensstudio" data-l="studio">STUDIO →</button></div><div class="lensstack" data-l="stack">0 · plain baseline</div><div class="foot">ROUTE projection unless a live Scale Studio API is present · VIEW_LENS never commits</div></section>
  </nav>`;
  document.documentElement.appendChild(host);
  const tab=sh.querySelector('.tab.nav'),readTab=sh.querySelector('.tab.read'),lensTab=sh.querySelector('.tab.lens'),panel=sh.querySelector('.panel'),membrane=sh.querySelector('.statusMembrane');
  const close=()=>{panel.classList.remove('on');panel.classList.remove('lens')};
  if(membrane)membrane.onclick=()=>{panel.classList.remove('lens');panel.classList.add('on')};
  const ensureLensState=()=>new Promise((resolve,reject)=>{if(window.LensState)return resolve(window.LensState);const prior=document.querySelector('script[data-lens-state-runtime]');if(prior){prior.addEventListener('load',()=>resolve(window.LensState),{once:true});prior.addEventListener('error',reject,{once:true});return}const x=document.createElement('script');x.src='/lens-state.js';x.dataset.lensStateRuntime='1';x.onload=()=>resolve(window.LensState);x.onerror=reject;document.head.appendChild(x)});
  const lens=q=>sh.querySelector('[data-l="'+q+'"]');
  const scaleApi=()=>window.ScaleLensSpatialAPI||null;
  if(lensTab&&document.getElementById('lensDock')&&scaleApi())lensTab.hidden=true;
  const routeLensState=()=>window.LensState?window.LensState.fromFieldRoute({...route,schema:'field-route/v0.1'},{returnAddress:location.href}):null;
  const currentLensState=()=>{try{return window.ScaleLensStateAPI?.snapshot?.()||scaleApi()?.lensState?.()||routeLensState()}catch(_){return routeLensState()}};
  const short=x=>{x=String(x??'—');return x.length>42?x.slice(0,18)+'…'+x.slice(-18):x};
  const renderLens=()=>{const a=scaleApi(),s=currentLensState();if(!s)return;const put=(q,v)=>{const el=lens(q);if(el)el.textContent=v};put('mode',a?'LIVE':'ROUTE');put('object',short(s.objectId||route.href));put('aperture',short(s.aperture?.level??route.kind??'surface'));put('view',short(s.projection||route.operation||'SOURCE'));put('stack',s.lensStack?.length?s.lensStack.map((x,i)=>(i+1)+':'+x.lensId).join(' → '):'0 · plain baseline');const caps={out:!!a?.aperture,in:!!a?.aperture,projection:!!a?.project};Object.entries(caps).forEach(([q,on])=>{const el=lens(q);if(el){el.disabled=!on;el.hidden=!on}})};
  const copyLensState=async()=>{try{await ensureLensState()}catch(_){}const s=currentLensState();if(!s)return;let payload='';try{payload=window.LensState?.serialize?LensState.serialize(s,2):JSON.stringify(s,null,2)}catch(_){payload=JSON.stringify(s,null,2)}const b=lens('copy');try{await navigator.clipboard.writeText(payload);if(b){const old=b.textContent;b.textContent='COPIED';setTimeout(()=>b.textContent=old,800)}}catch(_){prompt('Copy LensState:',payload)}};
  const openStudio=async()=>{try{await ensureLensState()}catch(_){}const s=currentLensState(),body=(document.body?.innerText||document.title||route.title||'').slice(0,120000);try{if(window.LensState&&s)LensState.storeHandoff(s,{title:route.title||document.title,sourceUrl:location.href,text:body},sessionStorage);sessionStorage.setItem('scale.lens.handoff.v01',JSON.stringify({text:body,label:route.title||'route',returnAddress:route.href||p,at:new Date().toISOString()}))}catch(_){}go('/fold-bloom/lens/')};
  const readContext=()=>{
    const sel=String(getSelection?.()||'').trim(),active=document.activeElement;
    let source='',label=route.title||document.title||p;
    if(sel){source=sel;label='Selection · '+label}
    else if(active&&/^(TEXTAREA|INPUT)$/.test(active.tagName)&&String(active.value||'').trim()){source=String(active.value);label=(active.getAttribute('aria-label')||active.name||active.id||'Field')+' · '+label}
    else{const root=document.querySelector('main')||document.body;source=String(root?.innerText||document.body?.innerText||document.title||'').trim();label='Page · '+label}
    if(!source)return;
    source=source.slice(0,160000);const returnAddress=location.pathname+location.search+location.hash;
    try{sessionStorage.setItem('readfield.handoff.v1',JSON.stringify({schema:'readfield.handoff/v1',source,label,returnAddress,created_at:new Date().toISOString()}))}catch(_){return}
    go('/docs/?handoff=1&return='+encodeURIComponent(returnAddress))
  };
  tab.onclick=()=>{const was=panel.classList.contains('on')&&!panel.classList.contains('lens');panel.classList.remove('lens');panel.classList.toggle('on',!was)};
  readTab.onclick=readContext;
  lensTab.onclick=async()=>{try{await ensureLensState()}catch(_){}panel.classList.add('lens','on');renderLens()};
  lens('out').onclick=()=>{scaleApi()?.aperture?.(+1);renderLens()};lens('in').onclick=()=>{scaleApi()?.aperture?.(-1);renderLens()};
  lens('projection').onclick=()=>{const a=scaleApi(),ps=a?.projections?.()||[];if(!ps.length)return;const now=currentLensState()?.projection,ix=Math.max(0,ps.indexOf(now));a.project(ps[(ix+1)%ps.length]);renderLens()};
  lens('copy').onclick=copyLensState;lens('return').onclick=()=>{const a=scaleApi();if(a?.return)a.return();else close()};lens('studio').onclick=openStudio;
  sh.querySelector('[data-a="back"]').onclick=back;
  sh.querySelector('[data-a="up"]').onclick=()=>go(parent);
  sh.querySelector('[data-a="home"]').onclick=()=>go(ROOT);
  addEventListener('keydown',e=>{
    if(e.key==='Escape') close();
    if(e.altKey&&e.key==='ArrowUp'){e.preventDefault();go(parent);}
    if(e.altKey&&e.key==='Home'){e.preventDefault();go(ROOT);}if(e.altKey&&String(e.key).toLowerCase()==='r'){e.preventDefault();readContext();}
  });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();