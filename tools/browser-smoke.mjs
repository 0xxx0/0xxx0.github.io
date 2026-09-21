#!/usr/bin/env node
'use strict';

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';

const ROOT=process.cwd();
const PORT=41739;
const HOST='127.0.0.1';

function browserBin(){
  for(const name of ['google-chrome-stable','google-chrome','chromium-browser','chromium']){
    const r=spawnSync('which',[name],{encoding:'utf8'});
    if(r.status===0&&r.stdout.trim())return r.stdout.trim();
  }
  throw new Error('No Chrome/Chromium binary found for runtime smoke');
}
function contentType(p){
  if(p.endsWith('.html'))return'text/html; charset=utf-8';
  if(p.endsWith('.js')||p.endsWith('.mjs'))return'text/javascript; charset=utf-8';
  if(p.endsWith('.json'))return'application/json; charset=utf-8';
  if(p.endsWith('.css'))return'text/css; charset=utf-8';
  if(p.endsWith('.svg'))return'image/svg+xml';
  return'application/octet-stream';
}
function resolveFile(urlPath){
  let clean=decodeURIComponent(String(urlPath||'/').split('?')[0]).replace(/^\/+/, '');
  if(!clean)clean='index.html';
  if(clean.endsWith('/'))clean+='index.html';
  let p=path.normalize(path.join(ROOT,clean));
  if(!p.startsWith(ROOT))return null;
  if(fs.existsSync(p)&&fs.statSync(p).isFile())return p;
  if(fs.existsSync(p+'.html'))return p+'.html';
  return null;
}
function lensProbeHtml(){
  return `<!doctype html><html><body style="margin:0"><iframe id="f" style="width:390px;height:844px;border:0;display:block" src="/?lens_proof=1&focus=%2Ffold-bloom%2Flens%2F"></iframe><pre id="probeResult">PENDING</pre><script>
  const result=document.getElementById('probeResult'),f=document.getElementById('f');
  let finished=false;
  const done=(ok,data)=>{if(finished)return;finished=true;result.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(data)};
  const compact=x=>({focusHref:x?.focusHref||null,axisState:x?.axisState||null,projection:x?.projection||null,mapMode:x?.mapMode||null,mapRoot:x?.mapRoot||null,mapSelected:x?.mapSelected||null,mapQuery:x?.mapQuery||'',mapOpen:!!x?.mapOpen});
  function exercise(w,d){
    try{
      const before=compact(w.FieldLensHost.uiState());
      const apLens=d.getElementById('apLens'),apProof=d.getElementById('apProof');
      const proof=d.getElementById('lens-proof-bench'),proofOpen=!!proof?.classList.contains('on');
      apLens.click();
      setTimeout(()=>{
        const ring=d.getElementById('lens-focus-ring'),sh=ring?.shadowRoot,panel=sh?.querySelector('.panel');
        const visual=sh?.querySelector('[data-mode="VISUAL"]');
        if(!ring||!sh||!panel?.classList.contains('on')||!visual)return done(false,{stage:'ring',ring:!!ring,panelOpen:!!panel?.classList.contains('on'),visual:!!visual});
        visual.click();
        setTimeout(()=>{
          const during=compact(w.FieldLensHost.uiState());
          sh.querySelector('.return')?.click();
          setTimeout(()=>{
            const after=compact(w.FieldLensHost.uiState());
            const same=JSON.stringify(before)===JSON.stringify(after);
            const overflow=Math.max(d.documentElement.scrollWidth,d.body?.scrollWidth||0)-d.documentElement.clientWidth;
            apProof.click();
            const proofAfter=!!d.getElementById('lens-proof-bench')?.classList.contains('on');
            done(same&&proofOpen&&proofAfter&&overflow<=1&&during.projection==='VISUAL',{before,during,after,same,proofOpen,proofAfter,overflow,clientWidth:d.documentElement.clientWidth});
          },180);
        },180);
      },180);
    }catch(e){done(false,{stage:'exercise-exception',error:String(e?.stack||e)})}
  }
  function waitReady(attempt=0){
    if(finished)return;
    try{
      const w=f.contentWindow,d=f.contentDocument;
      const apLens=d?.getElementById('apLens'),apProof=d?.getElementById('apProof');
      const proof=d?.getElementById('lens-proof-bench'),proofOpen=!!proof?.classList.contains('on');
      const state=w?.FieldLensHost?.uiState?.();
      const ready=!!apLens&&!!apProof&&!!w?.LensFocusRing&&!!w?.FieldLensHost&&proofOpen&&state?.focusHref==='/fold-bloom/lens/';
      if(ready)return exercise(w,d);
      if(attempt>=45)return done(false,{stage:'boot-timeout',href:w?.location?.href||null,readyState:d?.readyState||null,apLens:!!apLens,apProof:!!apProof,proofOpen,ring:!!w?.LensFocusRing,host:!!w?.FieldLensHost,focusHref:state?.focusHref||null});
      setTimeout(()=>waitReady(attempt+1),100);
    }catch(e){
      if(attempt>=45)return done(false,{stage:'boot-exception',error:String(e?.stack||e)});
      setTimeout(()=>waitReady(attempt+1),100);
    }
  }
  f.addEventListener('load',()=>setTimeout(()=>waitReady(0),30));
  setTimeout(()=>waitReady(0),60);
  <\/script></body></html>`;
}
const server=http.createServer((req,res)=>{
  if(String(req.url||'').startsWith('/__smoke/lens-proof')){
    res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
    res.end(lensProbeHtml());return;
  }
  const file=resolveFile(req.url);
  if(!file){res.writeHead(404,{'content-type':'text/plain'});res.end('not found');return}
  res.writeHead(200,{'content-type':contentType(file),'cache-control':'no-store'});
  fs.createReadStream(file).pipe(res);
});

function runChrome(bin,route,options={}){
  return new Promise((resolve,reject)=>{
    const url='http://'+HOST+':'+PORT+route;
    const args=[
      '--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage',
      '--hide-scrollbars','--window-size='+(options.width||1280)+','+(options.height||900),
      '--virtual-time-budget='+(options.budget||6500),'--dump-dom',url
    ];
    const p=spawn(bin,args,{stdio:['ignore','pipe','pipe']});
    let out='',err='';
    const timer=setTimeout(()=>{p.kill('SIGKILL');reject(new Error('timeout '+route))},15000);
    p.stdout.on('data',d=>out+=d);
    p.stderr.on('data',d=>err+=d);
    p.on('error',e=>{clearTimeout(timer);reject(e)});
    p.on('close',code=>{clearTimeout(timer);resolve({code,out,err,url})});
  });
}
function textAtId(dom,id){
  const marker='id="'+id+'"',i=dom.indexOf(marker);
  if(i<0)return '';
  const gt=dom.indexOf('>',i),end=gt<0?-1:dom.indexOf('</',gt+1);
  if(gt<0||end<0)return '';
  return dom.slice(gt+1,end).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
}
function visibleText(dom){
  return String(dom||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
}
const CASES=[
  {
    name:'FIELD',
    route:'/',
    check:dom=>dom.includes('id="axialLatest"')&&dom.includes('AXIAL / LATEST')
  },
  {
    name:'HUMAN PORT',
    route:'/port/',
    check:dom=>dom.includes('id="payload"')&&dom.includes('PORT INTAKE')
  },
  {
    name:'AXIAL',
    route:'/foundry/axial/',
    check:dom=>dom.includes('FOCUS STACK')&&dom.includes('RETURN')
  },
  {
    name:'APERTURE',
    route:'/foundry/aperture/',
    check:dom=>/APERTURE/i.test(dom)&&dom.includes('field-aperture')&&dom.includes('60–3000 WPM')
  },
  {
    name:'DOCS APERTURE',
    route:'/docs/',
    check:dom=>/DOCS \/ READ/i.test(dom)&&dom.includes('id="docAperture"')&&dom.includes('RAW SOURCE')
  },
  {
    name:'DOCS ADDRESS',
    route:'/docs/?src=/showcase-manifest.json&return=/',
    check:dom=>textAtId(dom,'title')==='showcase-manifest.json'&&dom.includes('id="returnLink"')&&dom.includes('href="/showcase-manifest.json"')
  },
  {
    name:'CENTER current',
    route:'/forward-field-proof/triangle/glyph/center/',
    check:dom=>{
      const s=textAtId(dom,'sourceState'),n=Number(textAtId(dom,'count'));
      return /CURRENT/.test(s)&&/CENTER/.test(s)&&!/loading|failure/i.test(s)&&Number.isFinite(n)&&n>0;
    }
  },
  {
    name:'CENTER plain',
    route:'/forward-field-proof/triangle/glyph/center/?reading=PLAIN',
    check:dom=>{
      const s=textAtId(dom,'sourceState');
      return /CURRENT/.test(s)&&/PLAIN/.test(s)&&!/loading|failure/i.test(s);
    }
  },
  {
    name:'CENTER federation',
    route:'/forward-field-proof/triangle/glyph/center/?source=FEDERATION',
    check:dom=>{
      const s=textAtId(dom,'sourceState'),n=Number(textAtId(dom,'count'));
      return /FEDERATION/.test(s)&&!/loading|failure/i.test(s)&&Number.isFinite(n)&&n>0;
    }
  },
  {
    name:'LENS PROOF alias',
    route:'/lens-proof/',
    check:dom=>/FIELD INDEX/i.test(dom)&&dom.includes('id="lens-proof-bench"')&&dom.includes('class="on"')
  },
  {
    name:'LENS PROOF mobile RETURN',
    route:'/__smoke/lens-proof',
    options:{width:430,height:900,budget:9000},
    check:dom=>/id="probeResult">PASS /.test(dom)&&/"same":true/.test(dom)&&/"proofAfter":true/.test(dom)&&/"overflow":0/.test(dom)
  },
  {
    name:'FOLD BLOOM convergence',
    route:'/fold-bloom/',
    check:dom=>/FOLD ?\/\/ ?BLOOM/i.test(dom)&&/FOLD WEAVE 0\.1/i.test(dom)&&/href="\.\/ecology\/"/i.test(dom)&&/href="\.\/two-dial\/"/i.test(dom)
  },
  {
    name:'SCALE LENS',
    route:'/fold-bloom/lens/',
    check:dom=>/SCALE LENS/i.test(dom)&&!dom.includes('load failure')
  },
  {
    name:'HOUSE SPATIAL',
    route:'/house/spatial/',
    check:dom=>/HOUSE/i.test(dom)&&!dom.includes('load failure')
  },
  {
    name:'POETRY',
    route:'/poetry/',
    check:dom=>/POETRY|VERSE/i.test(dom)&&dom.includes('WRITE / EXPLORE')&&!dom.includes('load failure')
  },
  {
    name:'POEM MAP',
    route:'/poetry/map/',
    check:dom=>{
      const st=textAtId(dom,'statusText');
      return /POEM MAP 0\.2\.1/i.test(dom)&&dom.includes('id="fieldNowBtn"')&&dom.includes('id="focusWheel"')&&dom.includes('id="pmAperture"')&&dom.includes('id="importBtn"')&&dom.includes('id="corpusBtn"')&&dom.includes('data-mode="PAGE"')&&/FIELD NOW LOADED/.test(st)&&!dom.includes('load failure');
    }
  },
  {
    name:'VERSE ATLAS',
    route:'/foundry/verse-atlas/',
    check:dom=>{
      const h=textAtId(dom,'health');
      return /VERSE ATLAS/i.test(dom)&&/PASS/.test(h)&&dom.includes('id="replay"')&&!dom.includes('load failure');
    }
  },
  {
    name:'FOUNDRY',
    route:'/foundry/',
    check:dom=>/FOUNDRY/i.test(dom)&&/VERSE|AXIAL/i.test(dom)&&!dom.includes('load failure')
  },
  {
    name:'FOUNDRY CORE',
    route:'/foundry/core/',
    check:dom=>{const text=visibleText(dom);return /Turn lived uncertainty into manipulable state/i.test(text)&&!/CENTER LOAD FAILURE/i.test(text)}
  },
  {
    name:'MIGRATION',
    route:'/migration/',
    check:dom=>{
      const trophy=textAtId(dom,'trophyCount');
      return /exact|frozen|donor/i.test(trophy)&&!/Loading active migration surface/i.test(dom);
    }
  },
  {
    name:'CONFLUENCE',
    route:'/control/confluence/',
    check:dom=>{
      const tx=textAtId(dom,'transfers');
      return /CONFLUENCE/i.test(dom)&&/TRANSFER REGISTRY/i.test(dom)&&/IMPLEMENTED|PROOF_REQUIRED|PROPOSED/.test(tx)&&!/loading|unavailable/i.test(tx);
    }
  },
  {
    name:'SLEEPER RECOVERY',
    route:'/recovery/sleeper/',
    check:dom=>/Sleeper recovery/i.test(dom)&&/Exact source now recovered/i.test(dom)&&/Painting \/ Path/i.test(dom)
  }
];

await new Promise((resolve,reject)=>server.listen(PORT,HOST,e=>e?reject(e):resolve()));
let fail=[];
try{
  const bin=browserBin();
  console.log('BROWSER SMOKE:',bin);
  for(const c of CASES){
    const r=await runChrome(bin,c.route,c.options||{});
    const fatal=/Uncaught (?:TypeError|ReferenceError|SyntaxError)|net::ERR_|Aw, Snap/i.test(r.err);
    const ok=r.code===0&&!fatal&&c.check(r.out);
    console.log((ok?'PASS':'FAIL'),c.name,c.route);
    if(!ok){
      const source=textAtId(r.out,'sourceState');
      const body=visibleText(r.out).slice(0,700);
      fail.push(c.name+' '+c.route+' code='+r.code+(source?' sourceState='+JSON.stringify(source):'')+(fatal?' browser-fatal':'')+(body?' body='+JSON.stringify(body):''));
      if(r.err.trim())console.error('SMOKE STDERR',c.name,r.err.slice(-1800));
    }
  }
}finally{
  await new Promise(resolve=>server.close(()=>resolve()));
}
if(fail.length){
  console.error('BROWSER SMOKE FAIL\n- '+fail.join('\n- '));
  process.exit(1);
}
console.log('BROWSER SMOKE PASS · cases:',CASES.length);
