(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.FieldURLBarCore=api;
  if(root&&root.document)api.mount(root);
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const OPS=Object.freeze({HOLD:'@',FIND:'?',TURN:'>',TRACE:'!',RETURN:'<',COMMAND:':'});
  const COMMANDS=Object.freeze([
    {id:'open',label:'OPEN NATIVE',hint:'enter the held route',run:'open'},
    {id:'lens',label:'LENS',hint:'re-project the held object',run:'lens'},
    {id:'proof',label:'PROOF',hint:'open proof aperture',run:'proof'},
    {id:'trace',label:'TRACE',hint:'inspect evidence / provenance',run:'trace'},
    {id:'desk',label:'DESK',hint:'open FIELD desk',run:'desk'},
    {id:'current',label:'CURRENT',hint:'open canonical current state',run:'current'},
    {id:'stage',label:'STAGE',hint:'copy exact local FIELD handoff command',run:'stage'},
    {id:'terminal',label:'TERMINAL',hint:'copy glyph terminal command for held object',run:'terminal'},
    {id:'hermes',label:'HERMES',hint:'copy safe local Hermes prepare command',run:'hermes'},
    {id:'help',label:'HELP',hint:'show grammar',run:'help'}
  ]);

  const clean=v=>String(v==null?'':v).replace(/\s+/g,' ').trim();
  const lower=v=>clean(v).toLowerCase();
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function parse(raw){
    const value=clean(raw);
    if(!value)return{mode:'IDLE',op:'',query:'',raw:''};
    const first=value[0];
    const byOp={'@':'HOLD','?':'FIND','>':'TURN','!':'TRACE','<':'RETURN',':':'COMMAND'};
    if(byOp[first])return{mode:byOp[first],op:first,query:clean(value.slice(1)),raw:value};
    if(value.startsWith('/'))return{mode:'HOLD',op:'@',query:value,raw:value,implicit:true};
    return{mode:'FIND',op:'?',query:value,raw:value,implicit:true};
  }

  function fragment(raw){
    const safe=encodeURIComponent(clean(raw))
      .replace(/%2F/gi,'/').replace(/%40/gi,'@').replace(/%3F/gi,'?')
      .replace(/%3E/gi,'>').replace(/%3C/gi,'<').replace(/%3A/gi,':').replace(/%21/gi,'!');
    return '#field='+safe;
  }
  function fromFragment(hash){
    const h=String(hash||'');
    if(!h.startsWith('#field='))return null;
    try{return decodeURIComponent(h.slice(7))}catch(_){return h.slice(7)}
  }

  function score(query,item){
    const q=lower(query),href=lower(item?.href),title=lower(item?.title),family=lower(item?.family),op=lower(item?.operation);
    if(!q)return 1;
    if(href===q||title===q)return 1000;
    if(href.startsWith(q)||title.startsWith(q))return 700;
    if(href.includes(q))return 500;
    if(title.includes(q))return 420;
    const terms=q.split(' ').filter(Boolean);
    const hay=[href,title,family,op].join(' ');
    if(terms.every(t=>hay.includes(t)))return 240+terms.length*10;
    let qi=0;
    for(const ch of hay)if(ch===q[qi])qi++;
    return qi===q.length?90:0;
  }
  function rank(query,items,limit=8){
    return (items||[]).map(x=>({x,s:score(query,x)})).filter(v=>v.s>0)
      .sort((a,b)=>b.s-a.s||String(a.x.href||a.x.id).localeCompare(String(b.x.href||b.x.id)))
      .slice(0,limit).map(v=>v.x);
  }

  function mount(win){
    if(win.__FIELD_URLBAR_MOUNTED__)return;
    win.__FIELD_URLBAR_MOUNTED__=true;
    const doc=win.document;
    let active=-1,lastItems=[],suppressHash=false,ready=false;

    const style=doc.createElement('style');
    style.id='field-urlbar-style';
    style.textContent=`
      :root{--fub-h:44px}
      #fieldURLBar{position:fixed;z-index:2147482000;top:max(6px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);width:min(960px,calc(100vw - 18px));font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:var(--ink,#dedbd2);pointer-events:none}
      #fieldURLBar *{box-sizing:border-box}
      .fubShell{pointer-events:auto;border:1px solid color-mix(in srgb,var(--ink,#dedbd2) 34%,transparent);background:color-mix(in srgb,var(--paper,#111) 91%,transparent);box-shadow:0 8px 28px rgba(0,0,0,.22);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
      .fubLine{height:var(--fub-h);display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:8px;padding:0 9px}
      .fubSig{min-width:24px;text-align:center;font-weight:900;font-size:16px;letter-spacing:-.05em}
      .fubInput{width:100%;border:0;outline:0;background:transparent;color:inherit;font:inherit;font-size:14px;line-height:1.2;padding:10px 0;caret-color:var(--hot,#ed7447)}
      .fubInput::placeholder{color:color-mix(in srgb,var(--ink,#dedbd2) 47%,transparent)}
      .fubState{font-size:10px;letter-spacing:.11em;text-transform:uppercase;white-space:nowrap;color:color-mix(in srgb,var(--ink,#dedbd2) 65%,transparent)}
      .fubResults{display:none;border-top:1px solid color-mix(in srgb,var(--ink,#dedbd2) 18%,transparent);max-height:min(52vh,410px);overflow:auto}
      #fieldURLBar[data-open="1"] .fubResults{display:block}
      .fubRow{width:100%;display:grid;grid-template-columns:28px minmax(0,1fr) auto;gap:9px;align-items:center;border:0;border-bottom:1px solid color-mix(in srgb,var(--ink,#dedbd2) 10%,transparent);background:transparent;color:inherit;text-align:left;padding:8px 9px;font:inherit;cursor:pointer}
      .fubRow:last-child{border-bottom:0}.fubRow:hover,.fubRow[data-active="1"]{background:color-mix(in srgb,var(--hot,#ed7447) 11%,transparent)}
      .fubGlyph{font-weight:900;text-align:center}.fubMain{min-width:0}.fubTitle{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;font-weight:700}.fubSub{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;margin-top:2px;color:color-mix(in srgb,var(--ink,#dedbd2) 58%,transparent)}
      .fubMeta{font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:color-mix(in srgb,var(--ink,#dedbd2) 48%,transparent);white-space:nowrap}
      .fubHelp{padding:9px 11px;font-size:10px;line-height:1.65;color:color-mix(in srgb,var(--ink,#dedbd2) 66%,transparent)}.fubHelp b{color:var(--ink,#dedbd2)}
      .fubFlash{animation:fubFlash .38s ease-out}@keyframes fubFlash{0%{outline:2px solid var(--hot,#ed7447)}100%{outline:2px solid transparent}}
      @media(max-width:620px){#fieldURLBar{top:env(safe-area-inset-top);width:100vw}.fubShell{border-left:0;border-right:0}.fubLine{grid-template-columns:24px 1fr}.fubState{display:none}.fubRow{grid-template-columns:24px minmax(0,1fr)}.fubMeta{display:none}}
      @media(prefers-reduced-motion:reduce){.fubFlash{animation:none}}
    `;
    doc.head.appendChild(style);

    const host=doc.createElement('div');
    host.id='fieldURLBar';host.dataset.open='0';
    host.innerHTML='<div class="fubShell"><div class="fubLine"><div class="fubSig" aria-hidden="true">@</div><input class="fubInput" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="fieldURLBarResults" aria-label="FIELD address and command bar"><div class="fubState">FIELD · NONE</div></div><div id="fieldURLBarResults" class="fubResults" role="listbox"></div></div>';
    doc.body.appendChild(host);
    const shell=host.querySelector('.fubShell'),input=host.querySelector('.fubInput'),sig=host.querySelector('.fubSig'),state=host.querySelector('.fubState'),results=host.querySelector('.fubResults');
    input.placeholder='@ object   ? find   > turn   ! trace   < return   : host';

    function routeMap(){try{return win.__fieldRouteMap?.all?.()||new Map()}catch(_){return new Map()}}
    function routes(){const m=routeMap();return m instanceof Map?[...m.values()]:Array.isArray(m)?m:[]}
    function focus(){try{return win.FieldLensHost?.focus?.()||null}catch(_){return null}}
    function glyph(r){
      try{const g=win.FieldGlyph?.mnemonic?.(r);if(g)return String(g).slice(0,5)}catch(_){}
      return r?.href===focus()?.href?'◎':'·';
    }
    function focusRoute(href){
      const exact=routeMap().get(href);
      if(!exact)return false;
      const got=win.__fieldAct?.focus?.(href);
      return !!got;
    }
    function heldAddress(){return focus()?.href||'/'}
    function currentMoves(){
      let s=null;try{s=win.FieldIndexCarrier?.actionSurface?.()}catch(_){}
      const xs=s?.moves||s?.hold?.moves||s?.execution?.moves||s?.native_moves||[];
      return Array.isArray(xs)?xs.slice(0,3):[];
    }
    function flash(msg){
      state.textContent=msg;shell.classList.remove('fubFlash');void shell.offsetWidth;shell.classList.add('fubFlash');
      setTimeout(syncPassive,1100);
    }
    async function copy(text,label){
      try{await win.navigator.clipboard.writeText(text);flash(label||'COPIED')}catch(_){win.prompt('Copy:',text)}
    }
    function updateURL(raw,push){
      const next=fragment(raw);if(win.location.hash===next)return;
      const st={...(win.history.state||{}),fieldURLBar:true,fieldCommand:clean(raw)};
      suppressHash=true;
      if(push)win.history.pushState(st,'',next);else win.history.replaceState(st,'',next);
      queueMicrotask(()=>{suppressHash=false});
    }
    function syncPassive(){
      if(doc.activeElement===input)return;
      const r=focus(),addr=r?.href||'/';
      input.value='@'+addr;sig.textContent=glyph(r)||'@';
      state.textContent=(r?.operation||'HOLD')+' · NONE';
      updateURL(input.value,false);
    }

    function routeItems(q){return rank(q,routes(),8).map(r=>({kind:'route',route:r,glyph:glyph(r),title:r.title||r.href,sub:r.href,meta:[r.operation,r.state].filter(Boolean).join(' · ')}))}
    function moveItems(q){
      const moves=currentMoves().map((m,i)=>({kind:'move',move:m,glyph:'>',title:m.label||m.id||('MOVE '+(i+1)),sub:m.target||heldAddress(),meta:[m.authority,m.reversibility].filter(Boolean).join(' · ')}));
      return rank(q,moves.map(x=>({href:x.title,title:x.sub,...x})),3).map(x=>x);
    }
    function commandItems(q){
      return rank(q,COMMANDS.map(c=>({href:c.id,title:c.label,...c})),10).map(c=>({kind:'command',command:c,glyph:':',title:c.label,sub:c.hint,meta:c.id}));
    }
    function help(){
      results.innerHTML='<div class="fubHelp"><b>@</b> hold exact object · <b>?</b> find · <b>></b> one declared TURN · <b>!</b> TRACE · <b><</b> RETURN/history · <b>:</b> native bridge commands<br>Bare <b>/route/</b> means HOLD, not OPEN. Enter twice only if you explicitly choose <b>> OPEN NATIVE</b>. Glyphs compress recognition; text remains canonical.</div>';
      host.dataset.open='1';input.setAttribute('aria-expanded','true');
    }
    function suggestions(){
      const p=parse(input.value);sig.textContent=p.op||'@';active=-1;
      if(p.mode==='IDLE'){lastItems=[];help();return}
      if(p.mode==='RETURN'){lastItems=[];results.innerHTML='<div class="fubHelp"><b>< RETURN</b> · browser FIELD history if available; otherwise rise to the held route parent.</div>';host.dataset.open='1';input.setAttribute('aria-expanded','true');return}
      if(p.mode==='TRACE'){lastItems=routeItems(p.query);if(!p.query)lastItems=[{kind:'trace',glyph:'!',title:'TRACE HELD OBJECT',sub:heldAddress(),meta:'VIEW · NONE'}]}
      else if(p.mode==='TURN')lastItems=moveItems(p.query);
      else if(p.mode==='COMMAND')lastItems=commandItems(p.query);
      else lastItems=routeItems(p.query);
      if(!lastItems.length){results.innerHTML='<div class="fubHelp">NO MATCH · exact FIELD addresses remain canonical.</div>';host.dataset.open='1';input.setAttribute('aria-expanded','true');return}
      results.innerHTML=lastItems.map((x,i)=>'<button class="fubRow" role="option" data-i="'+i+'" data-active="0"><span class="fubGlyph">'+esc(x.glyph||'·')+'</span><span class="fubMain"><span class="fubTitle">'+esc(x.title)+'</span><span class="fubSub">'+esc(x.sub||'')+'</span></span><span class="fubMeta">'+esc(x.meta||'')+'</span></button>').join('');
      results.querySelectorAll('.fubRow').forEach(b=>{b.onpointerdown=e=>e.preventDefault();b.onclick=()=>choose(Number(b.dataset.i))});
      host.dataset.open='1';input.setAttribute('aria-expanded','true');
    }
    function select(i){
      const rows=[...results.querySelectorAll('.fubRow')];if(!rows.length)return;
      active=(i+rows.length)%rows.length;rows.forEach((r,n)=>r.dataset.active=n===active?'1':'0');rows[active].scrollIntoView({block:'nearest'});
    }
    function targetURL(target){
      if(!target)return null;
      try{return new URL(String(target).replace(/^\.\//,'/'),win.location.origin+win.location.pathname).href}catch(_){return null}
    }
    async function executeMove(m){
      if(!m)return;
      const authority=clean(m.authority).toUpperCase(),label=clean(m.label||m.id).toUpperCase(),target=clean(m.target);
      if(authority==='EFFECT'){flash('EFFECT · NATIVE RELEASE');return}
      if(/TRACE|VERIFY|PROOF/.test(label)){doc.getElementById(/PROOF/.test(label)?'apProof':'apTrace')?.click();flash('TRACE · VIEW');return}
      if(/OPEN/.test(label)&&target){const u=targetURL(target);if(u){win.location.assign(u);return}}
      if(target.startsWith('/?focus=')){
        try{const u=new URL(target,win.location.origin),href=u.searchParams.get('focus');if(href&&focusRoute(href)){updateURL('@'+href,true);flash('HOLD · NONE');return}}catch(_){}
      }
      await copy(JSON.stringify({schema:'field-urlbar-move/v0.1',object:heldAddress(),move:m,authority:'NONE / OFFER ONLY',return_to:heldAddress()},null,2),'MOVE COPIED · NONE');
    }
    async function runCommand(c){
      const addr=heldAddress(),q=s=>"'"+String(s).replaceAll("'","'\\''")+"'";
      if(c==='open'){doc.getElementById('apOpen')?.click();return}
      if(c==='lens'){win.LensFocusRing?.open?.();return}
      if(c==='proof'){doc.getElementById('apProof')?.click();return}
      if(c==='trace'){doc.getElementById('apTrace')?.click();return}
      if(c==='desk'){win.location.assign('./desk/');return}
      if(c==='current'){win.location.assign('./control/');return}
      if(c==='stage'){await copy('node tools/field-stage-handoff.mjs --source '+q(addr)+' --json','STAGE COMMAND COPIED');return}
      if(c==='terminal'){await copy('node tools/field-terminal-lens.mjs --source '+q(addr),'TERMINAL COMMAND COPIED');return}
      if(c==='hermes'){await copy('node tools/field-hermes-run.mjs --source '+q(addr),'HERMES PREP COPIED');return}
      help();
    }
    function goRoute(r,push=true){
      if(!r||!focusRoute(r.href)){flash('UNRESOLVED');return}
      input.value='@'+r.href;updateURL(input.value,push);close();syncPassive();
    }
    async function choose(i){
      const x=lastItems[i];if(!x)return;
      if(x.kind==='route'){goRoute(x.route,true);return}
      if(x.kind==='move'){await executeMove(x.move);close();return}
      if(x.kind==='command'){await runCommand(x.command.run);close();return}
      if(x.kind==='trace'){doc.getElementById('apTrace')?.click();close();return}
    }
    function doReturn(){
      if(win.history.state?.fieldURLBar){win.history.back();return}
      const r=focus(),parent=r?.parent;
      if(parent&&parent!=='/'&&focusRoute(parent)){input.value='@'+parent;updateURL(input.value,true);flash('RETURN · PARENT');return}
      if(r?.href&&r.href!=='/'&&focusRoute('/')){input.value='@/';updateURL(input.value,true);return}
      win.location.assign('./');
    }
    async function execute(){
      const p=parse(input.value);
      if(p.mode==='RETURN'){doReturn();close();return}
      if(p.mode==='TRACE'&&!p.query){doc.getElementById('apTrace')?.click();updateURL('!'+heldAddress(),true);close();return}
      if(p.mode==='COMMAND'){
        const c=rank(p.query,COMMANDS.map(x=>({href:x.id,title:x.label,...x})),1)[0];if(c){await runCommand(c.run);updateURL(':'+c.id,true);close();return}
      }
      if(p.mode==='TURN'&&lastItems[0]?.kind==='move'){await executeMove(lastItems[active>=0?active:0].move);updateURL('>'+clean(lastItems[active>=0?active:0].title),true);close();return}
      const exact=routeMap().get(p.query),candidate=exact||lastItems[active>=0?active:0]?.route;
      if(candidate){goRoute(candidate,true);return}
      flash('NO EXACT OBJECT');
    }
    function close(){host.dataset.open='0';input.setAttribute('aria-expanded','false');active=-1}
    function focusBar(seed){input.focus();if(seed!=null){input.value=seed;input.setSelectionRange(input.value.length,input.value.length)}else input.select();suggestions()}

    input.addEventListener('focus',suggestions);
    input.addEventListener('input',suggestions);
    input.addEventListener('keydown',e=>{
      if(e.key==='ArrowDown'){e.preventDefault();select(active+1)}
      else if(e.key==='ArrowUp'){e.preventDefault();select(active<0?lastItems.length-1:active-1)}
      else if(e.key==='Enter'){e.preventDefault();if(active>=0)choose(active);else execute()}
      else if(e.key==='Escape'){e.preventDefault();if(host.dataset.open==='1')close();else input.blur()}
    });
    doc.addEventListener('pointerdown',e=>{if(!host.contains(e.target))close()});
    doc.addEventListener('keydown',e=>{
      if(e.defaultPrevented||e.metaKey&&e.key.toLowerCase()!=='k'||e.ctrlKey&&e.key.toLowerCase()!=='k')return;
      const tag=String(e.target?.tagName||'').toLowerCase(),editing=tag==='input'||tag==='textarea'||e.target?.isContentEditable;
      if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();focusBar();return}
      if(editing||e.metaKey||e.ctrlKey||e.altKey)return;
      if(['@','?','>','!',':'].includes(e.key)){e.preventDefault();focusBar(e.key);return}
      if(e.key==='<'){e.preventDefault();focusBar('<')}
    });
    win.addEventListener('field-index:state',()=>{ready=true;syncPassive()});
    win.addEventListener('popstate',()=>{
      const raw=fromFragment(win.location.hash);if(!raw)return syncPassive();
      const p=parse(raw);if(p.mode==='HOLD'&&p.query)focusRoute(p.query);input.value=raw;syncPassive();
    });
    win.addEventListener('hashchange',()=>{
      if(suppressHash)return;const raw=fromFragment(win.location.hash);if(!raw)return;
      const p=parse(raw);if(p.mode==='HOLD'&&p.query)focusRoute(p.query);input.value=raw;
    });

    const boot=()=>{
      if(win.FieldLensHost&&win.__fieldRouteMap){
        ready=true;
        const raw=fromFragment(win.location.hash),p=raw?parse(raw):null;
        if(p?.mode==='HOLD'&&p.query)focusRoute(p.query);
        input.value=raw||('@'+heldAddress());syncPassive();return;
      }
      setTimeout(boot,80);
    };
    boot();
    win.FieldURLBar=Object.freeze({focus:focusBar,parse,fragment,fromFragment,ready:()=>ready,command:raw=>{focusBar(raw);return execute()}});
  }

  return Object.freeze({OPS,COMMANDS,parse,fragment,fromFragment,score,rank,mount});
});
