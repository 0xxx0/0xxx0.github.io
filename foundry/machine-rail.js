(()=>{'use strict';
if(document.getElementById('foundry-machine-rail'))return;
const fallback=[
 {id:'CORE',short:'C',route:'/foundry/core/',question:'What must survive?'},
 {id:'FIELD',short:'F',route:'/',question:'What exists / where / ports?'},
 {id:'MIGRATION',short:'M',route:'/migration/',question:'What exact source / evidence / disposition?'},
 {id:'CONFLUENCE',short:'X',route:'/control/confluence/',question:'What bounded mechanism transfers?'}
];
const norm=p=>(p||'/').replace(/\/index\.html$/,'/')||'/';
const current=norm(location.pathname);
const active=v=>v.id==='FIELD'?current==='/':v.id==='CORE'?current.startsWith('/foundry/core/'):v.id==='MIGRATION'?(current.startsWith('/migration/')||current.startsWith('/recovery/')):current.startsWith('/control/confluence/');
function mount(views){
 const host=document.createElement('div');host.id='foundry-machine-rail';const sh=host.attachShadow({mode:'open'});
 sh.innerHTML=`<style>:host{all:initial}.r{position:fixed;z-index:2147483646;top:max(6px,env(safe-area-inset-top));right:max(6px,env(safe-area-inset-right));display:flex;border:1px solid #3a454b;background:#080b0de8;box-shadow:0 3px 16px #0008;font:700 8px/1 ui-monospace,SFMono-Regular,Menlo,monospace;backdrop-filter:blur(8px)}a{display:flex;align-items:center;gap:5px;min-height:28px;padding:0 7px;color:#89969c;text-decoration:none;border-left:1px solid #293238;letter-spacing:.08em}a:first-child{border-left:0}a:hover{color:#eef2ef;background:#11181b}a.on{color:#eff2ee;background:#131b1f;box-shadow:inset 0 -2px #d6ae66}.s{display:none;color:#d6ae66}@media(max-width:620px){a{padding:0 7px}.l{display:none}.s{display:inline}}</style><nav class="r" aria-label="Foundry machine views"></nav>`;
 const n=sh.querySelector('nav');
 views.forEach(v=>{const a=document.createElement('a');a.href=v.route;a.className=active(v)?'on':'';a.title=(v.verb?v.verb+' · ':'')+(v.question||'');a.innerHTML='<span class="s">'+(v.short||v.id[0])+'</span><span class="l">'+v.id+'</span>';n.appendChild(a)});
 document.documentElement.appendChild(host);
}
fetch('/foundry/machine.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(x=>mount(x?.views||fallback)).catch(()=>mount(fallback));
})();
