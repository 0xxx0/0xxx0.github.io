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
  const done=(ok,data)=>{result.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(data)};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const waitFor=async(fn,limit=8000)=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(100)}throw new Error('waitFor timeout')};
  const compact=x=>({focusHref:x?.focusHref||null,axisState:x?.axisState||null,projection:x?.projection||null,mapMode:x?.mapMode||null,mapRoot:x?.mapRoot||null,mapSelected:x?.mapSelected||null,mapQuery:x?.mapQuery||'',mapOpen:!!x?.mapOpen});
  (async()=>{
    const W=()=>f.contentWindow,D=()=>W().document;
    await waitFor(()=>D().getElementById('apLens')&&D().getElementById('apProof')&&W().LensFocusRing&&W().FieldLensHost&&W().FieldLensAPI);
    const before=compact(W().FieldLensHost.uiState()),proofOpen=!!D().getElementById('lens-proof-bench')?.classList.contains('on');
    D().getElementById('apLens').click();
    const sh=await waitFor(()=>D().getElementById('lens-focus-ring')?.shadowRoot);
    await waitFor(()=>sh.querySelector('.panel')?.classList.contains('on'));
    const visual=await waitFor(()=>sh.querySelector('[data-mode="VISUAL"]'));visual.click();
    await waitFor(()=>W().FieldLensHost.uiState()?.projection==='VISUAL');
    const during=compact(W().FieldLensHost.uiState());
    sh.querySelector('.return')?.click();
    await waitFor(()=>JSON.stringify(compact(W().FieldLensHost.uiState()))===JSON.stringify(before));
    const after=compact(W().FieldLensHost.uiState()),same=JSON.stringify(before)===JSON.stringify(after);
    D().getElementById('apProof').click();await waitFor(()=>D().getElementById('lens-proof-bench')?.classList.contains('on'));
    const proofAfter=true,overflow=Math.max(D().documentElement.scrollWidth,D().body?.scrollWidth||0)-D().documentElement.clientWidth;
    done(same&&proofOpen&&proofAfter&&overflow<=1&&during.projection==='VISUAL',{before,during,after,same,proofOpen,proofAfter,overflow,clientWidth:D().documentElement.clientWidth});
  })().catch(e=>done(false,{stage:'exception',error:String(e?.stack||e),href:f.contentWindow?.location?.href||null}));
  <\/script></body></html>`;
}
function studioProbeHtml(){
  return `<!doctype html><html><body style="margin:0"><iframe id="f" style="width:1180px;height:820px;border:0;display:block" src="/?focus=%2Ffold-bloom%2Flens%2F"></iframe><pre id="probeResult">PENDING</pre><script>
  const result=document.getElementById('probeResult'),f=document.getElementById('f'),rec={};
  const done=(ok,data)=>{result.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(data)};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const waitFor=async(fn,limit=12000)=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(100)}throw new Error('waitFor timeout')};
  const compact=x=>({focusHref:x?.focusHref||null,projection:x?.projection||null,mapRoot:x?.mapRoot||null,mapOpen:!!x?.mapOpen});
  (async()=>{
    const W=()=>f.contentWindow,D=()=>W().document;
    await waitFor(()=>D().getElementById('apLens')&&W().FieldLensHost&&W().FieldLensAPI&&W().LensFocusRing);
    rec.startHref=W().FieldLensHost.focus()?.href||null;rec.start=compact(W().FieldLensHost.uiState());
    if(rec.startHref!=='/fold-bloom/lens/')throw new Error('wrong start '+rec.startHref);
    D().getElementById('apLens').click();
    const sh=await waitFor(()=>D().getElementById('lens-focus-ring')?.shadowRoot);await waitFor(()=>sh.querySelector('.panel')?.classList.contains('on'));
    sh.querySelector('.dive')?.click();await waitFor(()=>W().FieldLensHost.uiState()?.mapRoot==='/fold-bloom/');rec.dive=compact(W().FieldLensHost.uiState());
    sh.querySelector('.rise')?.click();await waitFor(()=>W().FieldLensHost.uiState()?.mapRoot==='/');rec.rise=compact(W().FieldLensHost.uiState());
    sh.querySelector('.next')?.click();await waitFor(()=>W().FieldLensHost.focus()?.href&&W().FieldLensHost.focus()?.href!==rec.startHref);rec.peerHref=W().FieldLensHost.focus().href;
    sh.querySelector('.prev')?.click();await waitFor(()=>W().FieldLensHost.focus()?.href===rec.startHref);rec.peerBack=W().FieldLensHost.focus().href;
    sh.querySelector('.stackBtn')?.click();const apply=await waitFor(()=>sh.querySelector('[data-lens="field-foveate"]'));apply.click();
    const fieldState=await waitFor(()=>{const s=W().FieldLensAPI.snapshot?.();return s?.lensStack?.some(x=>x.lensId==='field-foveate')?s:null});
    rec.fieldObject=fieldState.objectId;rec.fieldStack=fieldState.lensStack.map(x=>x.lensId);
    const studio=sh.querySelector('.studio');if(!studio)throw new Error('studio button missing');studio.click();
    const studioState=await waitFor(()=>W().location.pathname==='/fold-bloom/lens/'&&W().ScaleLensStateAPI?.snapshot?.());
    rec.studioObject=studioState.objectId;rec.upstreamStack=(studioState.meta?.upstreamLensStack||[]).map(x=>x.lensId);
    const ret=await waitFor(()=>{const x=D().getElementById('returnUpstream');return x&&!x.hidden?x:null});rec.returnHref=ret.dataset.href||null;
    if(rec.studioObject!==rec.startHref||!rec.upstreamStack.includes('field-foveate'))throw new Error('studio identity/provenance mismatch');
    ret.click();
    await waitFor(()=>W().location.pathname==='/'&&W().FieldLensHost?.focus?.()?.href===rec.startHref);
    rec.endHref=W().FieldLensHost.focus().href;rec.end=compact(W().FieldLensHost.uiState());
    const ok=rec.dive.focusHref===rec.startHref&&rec.dive.mapRoot==='/fold-bloom/'&&rec.rise.focusHref===rec.startHref&&rec.rise.mapRoot==='/'&&rec.peerHref!==rec.startHref&&rec.peerBack===rec.startHref&&rec.fieldObject===rec.startHref&&rec.fieldStack.includes('field-foveate')&&rec.studioObject===rec.startHref&&rec.upstreamStack.includes('field-foveate')&&rec.endHref===rec.startHref;
    done(!!ok,rec);
  })().catch(e=>done(false,{stage:'exception',error:String(e?.stack||e),href:f.contentWindow?.location?.href||null,...rec}));
  <\/script></body></html>`;
}
const server=http.createServer((req,res)=>{
  if(String(req.url||'').startsWith('/__smoke/lens-proof')){
    res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
    res.end(lensProbeHtml());return;
  }
  if(String(req.url||'').startsWith('/__smoke/lens-studio')){
    res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
    res.end(studioProbeHtml());return;
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
    const timer=setTimeout(()=>{p.kill('SIGKILL');reject(new Error('timeout '+route))},options.timeout||15000);
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
    options:{width:430,height:900,budget:14000,timeout:20000},
    check:dom=>/id="probeResult">PASS /.test(dom)&&/"same":true/.test(dom)&&/"proofAfter":true/.test(dom)&&/"overflow":0/.test(dom)
  },
  {
    name:'LENS STACK STUDIO RETURN',
    route:'/__smoke/lens-studio',
    options:{width:1280,height:900,budget:22000,timeout:28000},
    check:dom=>/id="probeResult">PASS /.test(dom)&&/"field-foveate"/.test(dom)&&/"studioObject":"\/fold-bloom\/lens\/"/.test(dom)&&/"endHref":"\/fold-bloom\/lens\/"/.test(dom)
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
