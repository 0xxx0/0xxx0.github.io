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
  const boot=(tries=0)=>{
    try{
      const w=f.contentWindow,d=w?.document;
      const apLens=d?.getElementById('apLens'),apProof=d?.getElementById('apProof'),ringHost=d?.getElementById('lens-focus-ring');
      const proof=d?.getElementById('lens-proof-bench'),proofOpen=!!proof?.classList.contains('on');
      const ready=w?.FieldLensHost?.uiState?.();
      if(!apLens||!apProof||!w?.LensFocusRing||!w?.FieldLensHost||!ringHost?.shadowRoot||!proofOpen||ready?.focusHref!=='/fold-bloom/lens/'){
        if(tries<40){setTimeout(()=>boot(tries+1),100);return}
        done(false,{stage:'boot',tries,apLens:!!apLens,apProof:!!apProof,proofOpen,ringApi:!!w?.LensFocusRing,ringHost:!!ringHost?.shadowRoot,host:!!w?.FieldLensHost,focusHref:ready?.focusHref||null});return
      }
      const compact=x=>({focusHref:x?.focusHref||null,axisState:x?.axisState||null,projection:x?.projection||null,mapMode:x?.mapMode||null,mapRoot:x?.mapRoot||null,mapSelected:x?.mapSelected||null,mapQuery:x?.mapQuery||'',mapOpen:!!x?.mapOpen});
      const before=compact(ready);
      apLens.click();
      setTimeout(()=>{
        const ring=d.getElementById('lens-focus-ring'),sh=ring?.shadowRoot,panel=sh?.querySelector('.panel');
        const visual=sh?.querySelector('[data-mode="VISUAL"]');
        if(!ring||!sh||!panel?.classList.contains('on')||!visual){done(false,{stage:'ring',ring:!!ring,panelOpen:!!panel?.classList.contains('on'),visual:!!visual});return}
        visual.click();
        setTimeout(()=>{
          const during=compact(w.FieldLensHost?.uiState?.());
          sh.querySelector('.return')?.click();
          setTimeout(()=>{
            const after=compact(w.FieldLensHost?.uiState?.());
            const same=JSON.stringify(before)===JSON.stringify(after);
            const overflow=Math.max(d.documentElement.scrollWidth,d.body?.scrollWidth||0)-d.documentElement.clientWidth;
            apProof.click();
            const proofAfter=!!d.getElementById('lens-proof-bench')?.classList.contains('on');
            done(same&&proofOpen&&proofAfter&&overflow<=1&&during.projection==='VISUAL',{before,during,after,same,proofOpen,proofAfter,overflow,clientWidth:d.documentElement.clientWidth});
          },180);
        },180);
      },180);
    }catch(e){if(tries<40){setTimeout(()=>boot(tries+1),100);return}done(false,{stage:'exception',error:String(e?.stack||e)})}
  };
  setTimeout(()=>boot(),150);
  <\/script></body></html>`;
}
function poemMapProbeHtml(){
  return `<!doctype html><html><body><iframe id="f" style="width:900px;height:700px;border:0" src="/poetry/map/"></iframe><pre id="probeResult">PENDING</pre><script>
  const f=document.getElementById('f'),result=document.getElementById('probeResult');let kicked=false;
  const done=(ok,data)=>{result.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(data)};
  const probe=(tries=0)=>{
    try{
      const w=f.contentWindow,api=w?.__POEM_MAP__,s=api?.S,d=w?.document;
      if(api&&!kicked&&!s?.fieldLoaded){kicked=true;Promise.resolve(api.loadFieldNow?.()).catch(()=>{})}
      const controls=!!d?.getElementById('fieldNowBtn')&&!!d?.getElementById('focusWheel')&&!!d?.getElementById('pmAperture')&&!!d?.getElementById('importBtn')&&!!d?.getElementById('corpusBtn');
      if(api&&s?.fieldLoaded&&String(s.source||'').startsWith('FIELD NOW ·')&&s.mode==='PAGE'&&controls){done(true,{fieldLoaded:true,mode:s.mode,source:String(s.source).slice(0,48),corpus:s.corpus?.length||0,controls});return}
      if(tries<50){setTimeout(()=>probe(tries+1),100);return}
      done(false,{tries,api:!!api,fieldLoaded:!!s?.fieldLoaded,mode:s?.mode||null,source:String(s?.source||'').slice(0,48),controls});
    }catch(e){if(tries<50){setTimeout(()=>probe(tries+1),100);return}done(false,{stage:'exception',error:String(e?.stack||e)})}
  };
  setTimeout(()=>probe(),150);
  <\/script></body></html>`;
}

function listenSourceProbeHtml(){
  return `<!doctype html><html><body style="margin:0"><pre id="probeResult">PENDING</pre><script type="module">
  const out=document.getElementById('probeResult'),rec={};
  const done=(ok,data)=>out.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(data);
  try{
    const api=await import('/fold-bloom/listen/source-adapters.js');
    const id='11111111-2222-4333-8444-555555555555';
    rec.suno=api.parseSunoId('https://suno.com/song/'+id);
    rec.direct=api.classifySourceAddress('https://example.com/audio.mp3').kind;
    rec.limit=api.MAX_REMOTE_BYTES;
    done(rec.suno===id&&rec.direct==='REMOTE_AUDIO'&&rec.limit===96*1024*1024,rec);
  }catch(e){done(false,{error:String(e?.stack||e),...rec})}
  <\/script></body></html>`;
}
function fieldListenProbeHtml(){
  return `<!doctype html><html><body style="margin:0"><iframe id="f" style="width:980px;height:760px;border:0;display:block" src="/?focus=%2Ffold-bloom%2Flisten%2F"></iframe><pre id="probeResult">PENDING</pre><script>
  const target='/fold-bloom/listen/',out=document.getElementById('probeResult'),f=document.getElementById('f'),rec={};let finished=false;
  const done=(ok,data)=>{if(finished)return;finished=true;out.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(data)};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const waitFor=async(fn,limit=10000)=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(100)}throw Error('waitFor timeout')};
  (async()=>{
    const W=()=>f.contentWindow,D=()=>W().document;
    await waitFor(()=>W().FieldLensHost?.focus?.()?.href===target);
    rec.focused=W().FieldLensHost.focus().href;
    W().FieldLensHost.project('STRUCTURE');
    const row=await waitFor(()=>D().querySelector('.mapRow[data-href="'+target+'"]'));
    rec.visible=!!row;rec.href=row?.dataset?.href||null;rec.root=W().location.pathname;
    done(rec.focused===target&&rec.visible&&rec.href===target&&rec.root==='/',rec);
  })().catch(e=>done(false,{error:String(e?.stack||e),...rec}));
  <\/script></body></html>`;
}

function listenIntakeProbeHtml(){
  return `<!doctype html><html><body style="margin:0"><iframe id="f" style="width:980px;height:760px;border:0;display:block" src="/fold-bloom/listen/"></iframe><pre id="probeResult">PENDING</pre><script>
  const f=document.getElementById('f'),out=document.getElementById('probeResult'),rec={};let finished=false;
  const done=(ok,data)=>{if(finished)return;finished=true;out.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(data)};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const waitFor=async(fn,limit=10000)=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(100)}throw Error('waitFor timeout')};
  (async()=>{
    const W=()=>f.contentWindow,D=()=>W().document;
    await waitFor(()=>W().FoldBloomListen?.boot==='ready');
    const input=D().getElementById('file'),label=D().getElementById('chooseLabel');
    rec.boot=W().FoldBloomListen.boot;rec.input=!!input;rec.label=!!label;rec.hidden=input?.hasAttribute('hidden')||false;rec.for=label?.htmlFor||null;rec.pointer=W().getComputedStyle(label).pointerEvents;
    let activated=0;input?.addEventListener('click',()=>activated++,{once:true});label?.click();await sleep(80);rec.activated=activated;
    done(rec.boot==='ready'&&rec.input&&rec.label&&!rec.hidden&&rec.for==='file'&&rec.pointer!=='none'&&rec.activated===1,rec);
  })().catch(e=>done(false,{error:String(e?.stack||e),...rec}));
  <\/script></body></html>`;
}
function listenPreviewProbeHtml(){
  return `<!doctype html><html><body style="margin:0;background:#05070b"><canvas id="g" width="900" height="700"></canvas><canvas id="o" width="900" height="700"></canvas><pre id="probeResult">PENDING</pre><script type="module">
  const out=document.getElementById('probeResult'),rec={};
  const done=(ok,data)=>out.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(data);
  try{
    const [{buildPreviewMap},{ListenRenderer}]=await Promise.all([import('/fold-bloom/listen/preview-map.js'),import('/fold-bloom/listen/render.js')]);
    const sr=12000,dur=8,n=sr*dur,pcm=new Float32Array(n);
    for(let i=0;i<n;i++){const t=i/sr,p=t%.5;pcm[i]=.05*Math.sin(2*Math.PI*220*t)+(p<.055?.72*Math.sin(2*Math.PI*90*p)*Math.exp(-p*34):0)}
    const map=buildPreviewMap(pcm,sr,dur),g=document.getElementById('g'),o=document.getElementById('o'),r=new ListenRenderer(g,o);
    const x=o.getContext('2d'),before=x.getImageData(0,0,o.width,o.height).data;let beforeInk=0;for(let i=3;i<before.length;i+=16)if(before[i]>20)beforeInk++;
    r.draw(map,map.frames[0],0,1,false);
    const after=x.getImageData(0,0,o.width,o.height).data;let afterInk=0;for(let i=3;i<after.length;i+=16)if(after[i]>20)afterInk++;
    rec.stage=map.stage;rec.frames=map.frames.length;rec.before=beforeInk;rec.after=afterInk;rec.mode=r.mode;
    done(map.stage==='PREVIEW'&&map.frames.length>=24&&afterInk>beforeInk*1.08,rec);
  }catch(e){done(false,{error:String(e?.stack||e),...rec})}
  <\/script></body></html>`;
}

function fieldActivationProbeHtml(){
  return `<!doctype html><html><body style="margin:0"><iframe id="f" style="width:980px;height:760px;border:0;display:block" src="/"></iframe><pre id="probeResult">PENDING</pre><script>
  const result=document.getElementById('probeResult'),f=document.getElementById('f'),rec={};let finished=false;
  const done=(ok,data)=>{if(finished)return;finished=true;result.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(data)};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const waitFor=async(fn,limit=10000,label='condition')=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(80)}throw new Error('waitFor timeout: '+label)};
  (async()=>{
    const W=()=>f.contentWindow,D=()=>W().document,href='/fold-bloom/';
    await waitFor(()=>W().FieldLensHost?.focus?.()?.href,10000,'FIELD ready');
    W().FieldLensHost.project('STRUCTURE');
    const row=await waitFor(()=>D().querySelector('.mapRow[data-href="'+href+'"]'),10000,'target row');
    row.click();await waitFor(()=>W().FieldLensHost?.focus?.()?.href===href&&new URLSearchParams(W().location.search).get('focus')===href,10000,'focus address');
    rec.focused=W().FieldLensHost.focus().href;rec.focusUrl=W().location.search;rec.openHref=D().getElementById('apOpen')?.getAttribute('href')||'';
    f.src='/?focus='+encodeURIComponent(href);
    await waitFor(()=>W().location.pathname==='/'&&W().FieldLensHost?.focus?.()?.href===href,10000,'addressed reload');
    rec.returned=W().FieldLensHost.focus().href;rec.returnUrl=W().location.search;
    done(rec.focused===href&&rec.returned===href&&rec.openHref.endsWith(href)&&new URLSearchParams(rec.returnUrl).get('focus')===href,rec);
  })().catch(e=>done(false,{stage:'exception',error:String(e?.stack||e),href:f.contentWindow?.location?.href||null,...rec}));
  <\/script></body></html>`;
}
function studioProbeHtml(){
  return `<!doctype html><html><body style="margin:0"><iframe id="f" style="width:1180px;height:820px;border:0;display:block" src="/?focus=%2Ffold-bloom%2Flens%2F"></iframe><pre id="probeResult">PENDING</pre><script>
  const result=document.getElementById('probeResult'),f=document.getElementById('f'),rec={};let finished=false;
  const done=(ok,data)=>{if(finished)return;finished=true;result.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(data)};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const waitFor=async(fn,limit=12000)=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(100)}throw new Error('waitFor timeout')};
  const compact=x=>({focusHref:x?.focusHref||null,projection:x?.projection||null,mapRoot:x?.mapRoot||null,mapOpen:!!x?.mapOpen});
  (async()=>{
    const W=()=>f.contentWindow,D=()=>W().document;
    const sh=await waitFor(()=>D().getElementById('apLens')&&W().FieldLensHost&&W().FieldLensAPI&&W().LensFocusRing&&W().FieldLensHost.focus?.()?.href==='/fold-bloom/lens/'?D().getElementById('lens-focus-ring')?.shadowRoot:null);
    rec.startHref=W().FieldLensHost.focus()?.href||null;rec.start=compact(W().FieldLensHost.uiState());
    D().getElementById('apLens').click();
    await waitFor(()=>sh.querySelector('.panel')?.classList.contains('on'));
    rec.inline=sh.host?.dataset?.placement==='inline'&&sh.host?.previousElementSibling?.id==='aperture';
    rec.noPeer=!sh.querySelector('.next')&&!sh.querySelector('.prev');
    rec.noPeerApi=typeof W().FieldLensAPI?.peer==='undefined';
    sh.querySelector('.dive')?.click();await waitFor(()=>W().FieldLensHost.uiState()?.mapRoot==='/fold-bloom/');rec.dive=compact(W().FieldLensHost.uiState());rec.diveHref=W().FieldLensHost.focus()?.href||null;
    sh.querySelector('.rise')?.click();await waitFor(()=>W().FieldLensHost.uiState()?.mapRoot==='/');rec.rise=compact(W().FieldLensHost.uiState());rec.riseHref=W().FieldLensHost.focus()?.href||null;
    sh.querySelector('.stackBtn')?.click();let apply=await waitFor(()=>sh.querySelector('[data-lens="field-foveate"]'));apply.click();
    const applied=await waitFor(()=>{const x=W().FieldLensAPI.snapshot?.();return x?.lensStack?.some(y=>y.lensId==='field-foveate')?x:null});
    const remove=await waitFor(()=>sh.querySelector('[data-remove-lens="field-foveate"]'));remove.click();
    await waitFor(()=>{const x=W().FieldLensAPI.snapshot?.();return x&&!x.lensStack?.some(y=>y.lensId==='field-foveate')?x:null});
    rec.stackRemoved=true;
    apply=await waitFor(()=>sh.querySelector('[data-lens="field-foveate"]'));apply.click();
    const fieldState=await waitFor(()=>{const x=W().FieldLensAPI.snapshot?.();return x?.lensStack?.some(y=>y.lensId==='field-foveate')?x:null});
    rec.fieldObject=fieldState.objectId;rec.fieldStack=fieldState.lensStack.map(x=>x.lensId);
    const studio=sh.querySelector('.studio');if(!studio)throw new Error('studio button missing');studio.click();
    const studioState=await waitFor(()=>W().location.pathname==='/fold-bloom/lens/'&&W().ScaleLensStateAPI?.snapshot?.());
    rec.studioObject=studioState.objectId;rec.upstreamStack=(studioState.meta?.upstreamLensStack||[]).map(x=>x.lensId);
    rec.handoffKeysCleared=!W().sessionStorage.getItem('lens:handoff:v2')&&!W().sessionStorage.getItem('scale.lens.handoff.v01');
    const ret=await waitFor(()=>{const x=D().getElementById('returnUpstream');return x&&!x.hidden?x:null});rec.returnHref=ret.dataset.href||null;
    if(rec.studioObject!==rec.startHref||!rec.upstreamStack.includes('field-foveate'))throw new Error('studio identity/provenance mismatch');
    if(!W().ScaleLensSpatialAPI?.return)throw new Error('Scale Lens RETURN API missing');rec.returnVia='ScaleLensSpatialAPI';W().ScaleLensSpatialAPI.return();await waitFor(()=>W().location.pathname==='/'&&W().FieldLensHost?.focus?.()?.href===rec.startHref);
    rec.endHref=W().FieldLensHost.focus().href;rec.end=compact(W().FieldLensHost.uiState());
    const ok=rec.inline&&rec.noPeer&&rec.noPeerApi&&rec.dive.focusHref===rec.startHref&&rec.diveHref===rec.startHref&&rec.dive.mapRoot==='/fold-bloom/'&&rec.rise.focusHref===rec.startHref&&rec.riseHref===rec.startHref&&rec.rise.mapRoot==='/'&&rec.stackRemoved===true&&rec.fieldObject===rec.startHref&&rec.fieldStack.includes('field-foveate')&&rec.studioObject===rec.startHref&&rec.upstreamStack.includes('field-foveate')&&rec.handoffKeysCleared===true&&rec.endHref===rec.startHref;
    done(!!ok,rec);
  })().catch(e=>done(false,{stage:'exception',error:String(e?.stack||e),href:f.contentWindow?.location?.href||null,...rec}));
  <\/script></body></html>`;
}

function axialContinuityProbeHtml(){
  return `<!doctype html><html><body style="margin:0"><iframe id="f" style="width:1100px;height:820px;border:0;display:block" src="/foundry/axial/?focus=%2Ffold-bloom%2Flens%2F"></iframe><pre id="probeResult">PENDING</pre><script>
  const f=document.getElementById('f'),result=document.getElementById('probeResult'),rec={};let finished=false;
  const done=(ok,data)=>{if(finished)return;finished=true;result.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(data)};
  const stage=x=>{rec.stage=x;result.textContent='PENDING '+x+' '+JSON.stringify(rec)};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const waitFor=async(fn,limit=5000)=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(100)}throw new Error('waitFor timeout @ '+rec.stage)};
  (async()=>{
    const W=()=>f.contentWindow,D=()=>W().document;
    stage('API');const api=await waitFor(()=>W().AxialFocusAPI);
    stage('FIELD_READY');await waitFor(()=>api.snapshot()?.source==='FIELD'&&api.snapshot()?.focus==='route:/fold-bloom/lens/');
    rec.before=api.snapshot();
    stage('HOUSE_1');D().getElementById('srcHouse').click();await waitFor(()=>api.snapshot()?.source==='HOUSE'&&!D().getElementById('back').disabled);rec.house=api.snapshot();
    stage('BACK');D().getElementById('back').click();await waitFor(()=>api.snapshot()?.source==='FIELD'&&api.snapshot()?.focus===rec.before.focus);rec.afterBack=api.snapshot();
    stage('RETURN');D().getElementById('ret').click();await waitFor(()=>api.returns().length>0);rec.returnAddress=api.returns()[0].address;rec.restoreButton=!!D().querySelector('#receipts [data-return="0"]');
    stage('HOUSE_2');D().getElementById('srcHouse').click();await waitFor(()=>api.snapshot()?.source==='HOUSE'&&!D().getElementById('back').disabled);
    stage('REPLAY');await api.restoreReturn(0);await waitFor(()=>api.snapshot()?.source==='FIELD'&&api.snapshot()?.focus===rec.before.focus);rec.afterReplay=api.snapshot();
    rec.backSame=JSON.stringify(rec.before)===JSON.stringify(rec.afterBack);rec.replaySame=JSON.stringify(rec.before)===JSON.stringify(rec.afterReplay);
    done(rec.backSame&&rec.replaySame&&rec.restoreButton&&String(rec.returnAddress||'').startsWith('field://'),rec);
  })().catch(e=>done(false,{stage:'exception',error:String(e?.stack||e),...rec}));
  <\/script></body></html>`;
}

function docsApertureProbeHtml(){
  return `<!doctype html><html><body style="margin:0"><iframe id="f" style="width:980px;height:760px;border:0;display:block" src="/docs/?src=%2Fcontrol%2FCURRENT.json&ap_scale=LEAF&ap_index=1&ap_wpm=650&return=%2F"></iframe><pre id="probeResult">PENDING</pre><script>
  const f=document.getElementById('f'),result=document.getElementById('probeResult'),rec={};let finished=false;
  const done=(ok,data)=>{if(finished)return;finished=true;result.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(data)};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const waitFor=async(fn,limit=12000)=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(100)}throw new Error('waitFor timeout')};
  (async()=>{
    const W=()=>f.contentWindow,D=()=>W().document;
    const A=await waitFor(()=>{const a=D().getElementById('docAperture');return a?.A?.label?a:null});
    rec.start=await waitFor(()=>{const x=A.snapshot();return x.scale==='LEAF'&&x.index===1&&x.wpm===650?x:null});
    A.step(1);rec.next=await waitFor(()=>{const x=A.snapshot(),q=new URLSearchParams(W().location.search);return x.index===2&&q.get('ap_scale')===x.scale&&q.get('ap_index')===String(x.index)&&q.get('ap_addr')===x.address&&q.get('ap_wpm')==='650'?x:null});
    rec.url=W().location.search;A.restore(rec.start);rec.restored=await waitFor(()=>{const x=A.snapshot();return x.scale===rec.start.scale&&x.index===rec.start.index&&x.address===rec.start.address&&x.wpm===rec.start.wpm?x:null});
    const originalReplace=W().history.replaceState.bind(W().history);let writes=0;W().history.replaceState=(...args)=>{writes++;return originalReplace(...args)};
    A.restore({scale:'LEAF',index:0,wpm:3000});writes=0;A.toggleRSVP();await sleep(520);if(A.snapshot().playing)A.toggleRSVP();rec.fast=A.snapshot();rec.urlWrites=writes;rec.throttled=rec.fast.index>0&&writes<=4;
    A.restore({scale:'LEAF',index:Math.max(0,rec.fast.count-2),wpm:3000});A.toggleRSVP();rec.ended=!!(await waitFor(()=>{const x=A.snapshot();return !x.playing&&x.index===x.count-1?x:null}));
    rec.copyView=!!D().getElementById('copyView');done(!!rec.copyView&&rec.restored.address===rec.start.address&&rec.throttled&&rec.ended&&rec.fast.loop===false,rec);
  })().catch(e=>done(false,{stage:'exception',error:String(e?.stack||e),...rec}));
  <\/script></body></html>`;
}


function readerFocusProbeHtml(){
  return `<!doctype html><html><body style="margin:0"><iframe id="f" style="width:980px;height:760px;border:0;display:block" src="/docs/?read_view=plain"></iframe><pre id="probeResult">PENDING</pre><script>
  const f=document.getElementById('f'),result=document.getElementById('probeResult'),rec={};let finished=false;
  const done=(ok,data)=>{if(finished)return;finished=true;result.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(data)};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const waitFor=async(fn,limit=12000,label='condition')=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(80)}throw new Error('waitFor timeout: '+label)};
  (async()=>{
    const W=()=>f.contentWindow,D=()=>W().document;
    const A=await waitFor(()=>{const a=D().getElementById('docAperture'),pb=D().getElementById('readPaste'),pt=D().getElementById('pasteText');return a?.snapshot?.()&&typeof pb?.onclick==='function'&&pt?a:null},12000,'DOCS controls bound');
    const sample='# Alpha\\nThe first paragraph establishes context.\\n\\n# Beta\\nRead this second phrase and keep position. [CURRENT](/control/CURRENT.json) ![map](/field-map.svg)';
    const pt=D().getElementById('pasteText'),pb=D().getElementById('readPaste');pt.value=sample;pb.click();
    await waitFor(()=>A.A?.label?.startsWith('PASTE')&&A.A?.kind==='TEXT'&&W().location.search.includes('paste=1'),12000,'PASTE loaded + addressed');
    const target=sample.indexOf('second');A.restore({scale:'WORD',char_index:target,wpm:1200});
    rec.word=await waitFor(()=>{const x=A.snapshot();return x.scale==='WORD'&&x.wpm===1200?x:null},12000,'WORD focus restored');
    rec.wordMark=D().getElementById('reading')?.querySelector('mark')?.textContent||'';
    rec.orp=A.shadowRoot?.getElementById('focusOrp')?.textContent||'';
    A.setScale(A.scaleIndex('SENT'));rec.sent=A.snapshot();
    A.setScale(A.scaleIndex('PARA'));rec.para=A.snapshot();
    A.setScale(A.scaleIndex('SECTION'));rec.section=A.snapshot();
    await sleep(120);
    rec.url=W().location.search;
    rec.xrefs=[...D().querySelectorAll('#xrefs a')].map(a=>a.textContent);
    rec.highlight=D().getElementById('reading')?.querySelector('mark')?.textContent||'';
    rec.structure=rec.section.structure?.map(x=>x.label)||[];
    rec.session=!!W().sessionStorage.getItem('docs.reader.paste.v1');rec.reader=A.hasAttribute('reader');rec.dialDisplay=W().getComputedStyle(A.shadowRoot.querySelector('.dial')).display;
    const same=[rec.sent,rec.para,rec.section].every(x=>x.char_index===rec.word.char_index&&Math.abs(x.source_progress-rec.word.source_progress)<1e-9);
    const spans=[rec.sent,rec.para,rec.section].every(x=>x.span&&x.span.start<=x.char_index&&x.char_index<=x.span.end);
    const checks={same,spans,structure:rec.structure.length===2,xrefs:rec.xrefs.length>=2,session:rec.session,orp:!!rec.orp,wordMark:rec.wordMark.toLowerCase().includes('second'),urlChar:/ap_char=/.test(rec.url),current:/CURRENT/.test(rec.xrefs.join(' ')),media:/MEDIA/.test(rec.xrefs.join(' ')),reader:rec.reader&&rec.dialDisplay==='none'};
    const perf=Array.from({length:260},(_,i)=>'focus'+i).join(' ');pt.value=perf;pb.click();await waitFor(()=>A.A?.label?.startsWith('PASTE')&&(A.A?.scales?.find(x=>x.id==='WORD')?.units?.length||0)>=250,12000,'performance paste loaded');A.restore({scale:'WORD',index:0,wpm:3000});
    let focusEvents=0,contextMutations=0;const onFocus=()=>focusEvents++;A.addEventListener('aperture-focus',onFocus);const mo=new MutationObserver(()=>contextMutations++);mo.observe(D().getElementById('reading'),{childList:true,subtree:true,characterData:true});A.toggleRSVP();await sleep(540);if(A.snapshot().playing)A.toggleRSVP();mo.disconnect();A.removeEventListener('aperture-focus',onFocus);checks.performance=focusEvents>=14&&contextMutations<=8;
    const ok=Object.values(checks).every(Boolean);
    done(!!ok,{checks,structure:rec.structure,xrefs:rec.xrefs,wordMark:rec.wordMark,orp:rec.orp,url:rec.url,chars:[rec.word.char_index,rec.sent.char_index,rec.para.char_index,rec.section.char_index],progress:[rec.word.source_progress,rec.sent.source_progress,rec.para.source_progress,rec.section.source_progress],session:rec.session,dialDisplay:rec.dialDisplay,focusEvents,contextMutations});
  })().catch(e=>done(false,{stage:'exception',error:String(e?.stack||e),...rec}));
  <\/script></body></html>`;
}


function readfieldLocalFileProbeHtml(){
  return `<!doctype html><html><body style="margin:0"><iframe id="f" style="width:430px;height:900px;border:0;display:block" src="/docs/?read_view=plain"></iframe><pre id="probeResult">PENDING</pre><script>
  const f=document.getElementById('f'),result=document.getElementById('probeResult'),rec={};let finished=false;
  const done=(ok,data)=>{if(finished)return;finished=true;result.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(data)};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const waitFor=async(fn,limit=14000,label='condition')=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(70)}throw new Error('waitFor timeout: '+label)};
  (async()=>{
    const W=()=>f.contentWindow,D=()=>W().document;
    const A=await waitFor(()=>{const a=D().getElementById('docAperture');return a?.snapshot?.()&&D().getElementById('localFile')?a:null},14000,'READFIELD local file ready');
    const input=D().getElementById('localFile'),text='# FIELD NOTE\\n\\nalpha beta gamma delta epsilon zeta eta theta\\n\\n## NEXT\\nreview this exact place.';
    const file=new (W().File)([text],'field-note.md',{type:'text/markdown'}),dt=new (W().DataTransfer)();dt.items.add(file);input.files=dt.files;input.dispatchEvent(new (W().Event)('change',{bubbles:true}));
    await waitFor(()=>A.A?.label==='field-note.md'&&/field-note\.md · LOCAL/.test(D().getElementById('title')?.textContent||''),12000,'local file loaded');
    A.restore({scale:'WORD',index:4,wpm:900});await sleep(120);
    const snap=A.snapshot(),stored=JSON.parse(W().sessionStorage.getItem('docs.reader.local.v1')||'null');
    rec.label=A.A?.label;rec.scale=snap.scale;rec.wpm=snap.wpm;rec.local=W().location.search.includes('local=1');rec.session=stored?.name||'';rec.copy=D().getElementById('copyView')?.textContent||'';
    rec.mark=D().getElementById('reading')?.querySelector('mark')?.textContent||'';
    done(rec.label==='field-note.md'&&rec.scale==='WORD'&&rec.wpm===900&&rec.local&&rec.session==='field-note.md'&&rec.copy==='COPY FOCUS'&&!!rec.mark,rec);
  })().catch(e=>done(false,{stage:'exception',error:String(e?.stack||e),...rec}));
  <\/script></body></html>`;
}

function readfieldFocusLensProbeHtml(){
  return `<!doctype html><html><body style="margin:0"><iframe id="f" style="width:430px;height:900px;border:0;display:block" src="/docs/?read_view=focus"></iframe><pre id="probeResult">PENDING</pre><script>
  const f=document.getElementById('f'),result=document.getElementById('probeResult'),rec={};let finished=false;
  const done=(ok,data)=>{if(finished)return;finished=true;result.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(data)};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const waitFor=async(fn,limit=14000,label='condition')=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(70)}throw new Error('waitFor timeout: '+label)};
  (async()=>{
    const W=()=>f.contentWindow,D=()=>W().document;
    const A=await waitFor(()=>{const a=D().getElementById('docAperture');return a?.snapshot?.()&&D().getElementById('focusView')?a:null},14000,'READFIELD ready');
    await waitFor(()=>D().documentElement.dataset.readfieldView==='focus'&&A.hasAttribute('focusfield'),5000,'FOCUS view');
    rec.focusDial=W().getComputedStyle(A.shadowRoot.querySelector('.dial')).display;
    rec.triangle=!!A.shadowRoot.querySelector('.triFrame');rec.pulseRing=!!A.shadowRoot.getElementById('pulseRing');
    A.setWpm(6000);rec.speed=A.snapshot().wpm;rec.speedMax=A.snapshot().wpm_max;

    const glyph={sourceHash:'probe-glyph',rotation:.23,radial:Array.from({length:24},(_,i)=>.30+(i%6)*.09)};
    A.setGlyphWitness(glyph);await sleep(80);rec.glyphSpokes=A.shadowRoot.querySelectorAll('#glyphSpokes line').length;

    W().dispatchEvent(new CustomEvent('field-pulse-local',{detail:{schema:'field-pulse/v0.1',source:'FOLD_BLOOM_LISTEN',instance:'probe-remote',kind:'transport',seq:1,wall:Date.now(),at:1,data:{sourceProgress:.42,beatPhase:.5,sectionProgress:.3,energy:.8,bpm:120,playing:true}}}));
    await waitFor(()=>/120 BPM/.test(D().getElementById('pulseState')?.textContent||''),5000,'LISTEN pulse accepted');
    rec.pulseOpacity=Number(W().getComputedStyle(A.shadowRoot.getElementById('pulseRing')).opacity)||0;rec.pulseLabel=D().getElementById('pulseState').textContent;

    const pt=D().getElementById('pasteText'),pb=D().getElementById('readPaste');
    pt.value=Array.from({length:100},(_,i)=>'# H'+i+'\\nParagraph '+i+' carries enough text for a structural marker.').join('\\n\\n');pb.click();
    await waitFor(()=>A.A?.sections?.length>=100,12000,'100 section source');
    A.setScale(A.scaleIndex('SECTION'));await sleep(100);
    const structure=A.snapshot().structure||[];rec.markers=structure.length;rec.firstMarker=structure[0]?.label||'';rec.lastMarker=structure.at(-1)?.label||'';

    const view=D().getElementById('focusView');view.click();await waitFor(()=>D().documentElement.dataset.readfieldView==='min',3000,'MIN view');
    rec.min=A.hasAttribute('minimal')&&W().getComputedStyle(A.shadowRoot.querySelector('.dial')).display!=='none';
    view.click();await waitFor(()=>D().documentElement.dataset.readfieldView==='plain',3000,'PLAIN view');
    rec.plain=!A.hasAttribute('focusfield')&&!A.hasAttribute('minimal')&&W().getComputedStyle(A.shadowRoot.querySelector('.dial')).display==='none';

    const ok=rec.focusDial!=='none'&&rec.triangle&&rec.pulseRing&&rec.speed===6000&&rec.speedMax===6000&&rec.glyphSpokes===24&&rec.pulseOpacity>0&&rec.markers===72&&rec.firstMarker==='H0'&&rec.lastMarker==='H99'&&rec.min&&rec.plain;
    done(ok,rec);
  })().catch(e=>done(false,{stage:'exception',error:String(e?.stack||e),...rec}));
  <\/script></body></html>`;
}

function readfieldRouteHandoffProbeHtml(){
  return `<!doctype html><html><body style="margin:0"><iframe id="f" style="width:980px;height:760px;border:0;display:block" src="/foundry/"></iframe><pre id="probeResult">PENDING</pre><script>
  const f=document.getElementById('f'),result=document.getElementById('probeResult'),rec={};let finished=false;
  const done=(ok,data)=>{if(finished)return;finished=true;result.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(data)};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const waitFor=async(fn,limit=12000,label='condition')=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(80)}throw new Error('waitFor timeout: '+label)};
  (async()=>{
    const W=()=>f.contentWindow,D=()=>W().document;
    const sh=await waitFor(()=>D().getElementById('showcase-route-adapter')?.shadowRoot,12000,'route adapter');
    const read=await waitFor(()=>sh.querySelector('.tab.read'),12000,'READ action');rec.label=read.textContent;read.click();
    await waitFor(()=>W().location.pathname==='/docs/'&&D().getElementById('docAperture')?.A?.label?.startsWith('Page ·'),12000,'READFIELD handoff');
    rec.title=D().getElementById('title')?.textContent||'';rec.returnHref=D().getElementById('returnLink')?.getAttribute('href')||'';rec.reader=D().getElementById('docAperture')?.hasAttribute('reader')||false;
    rec.source=(D().getElementById('text')?.textContent||'').slice(0,180);
    done(rec.label==='READ'&&rec.reader&&rec.returnHref.startsWith('/foundry/')&&rec.source.length>20,rec);
  })().catch(e=>done(false,{stage:'exception',error:String(e?.stack||e),...rec}));
  <\/script></body></html>`;
}

function readfieldLociHandoffProbeHtml(){
  return `<!doctype html><html><body style="margin:0"><iframe id="f" style="width:430px;height:900px;border:0;display:block" src="/docs/?read_view=plain"></iframe><pre id="probeResult">PENDING</pre><script type="module">
  const f=document.getElementById('f'),result=document.getElementById('probeResult'),rec={};let finished=false;
  const done=(ok,data)=>{if(finished)return;finished=true;result.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(data)};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const waitFor=async(fn,limit=12000,label='condition')=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(70)}throw new Error('waitFor timeout: '+label)};
  try{
    const W=()=>f.contentWindow,D=()=>W().document;
    const A=await waitFor(()=>{const a=D().getElementById('docAperture');return a?.snapshot?.()&&W().FieldAperture?.handoff?a:null},12000,'READFIELD ready');
    const source=Array.from({length:96},(_,i)=>'word'+i).join(' ');
    D().getElementById('pasteText').value=source;D().getElementById('readPaste').click();
    await waitFor(()=>A.A?.label?.startsWith('PASTE')&&(A.A?.scales?.find(x=>x.id==='WORD')?.units?.length||0)>=90,12000,'paste loaded');
    A.setScale(A.scaleIndex('WORD'));A.setPos(57);await sleep(80);
    const before=A.snapshot();rec.beforeProgress=before.source_progress;rec.beforeChar=before.char_index;rec.beforeScale=before.scale;
    W().FieldAperture.handoff(source,{label:'SMOKE READ',from:'/docs/?smoke=1',focus:before});
    const packet=JSON.parse(W().sessionStorage.getItem('field.aperture.handoff.v01')||'null');
    rec.packetScale=packet?.focus?.scale||'';rec.packetChar=packet?.focus?.char_index;rec.packetProgress=packet?.focus?.source_progress;rec.sourceSame=packet?.source===source;
    const {buildTextCourse,nodeForProgress}=await import('/fold-bloom/lab/course.js');
    const course=buildTextCourse(packet.source,{maxLoci:16}),node=nodeForProgress(course,packet.focus.source_progress),at=packet.focus.source_progress*Math.max(0,source.length-1);
    rec.address=node?.address||'';rec.contains=!!node&&at>=node.start-1&&at<=node.end+1;rec.words=course.wordCount;rec.nodes=course.nodes.length;
    done(rec.sourceSame&&rec.beforeProgress>.4&&rec.beforeProgress<.8&&rec.packetScale==='WORD'&&rec.packetChar===rec.beforeChar&&Math.abs(rec.packetProgress-rec.beforeProgress)<1e-9&&rec.contains&&rec.words===96&&rec.nodes<=16,rec);
  }catch(e){done(false,{stage:'exception',error:String(e?.stack||e),...rec})}
  <\/script></body></html>`;
}


function readfieldApertureAliasFocusProbeHtml(){
  return `<!doctype html><html><body style="margin:0"><iframe id="f" style="width:430px;height:900px;border:0;display:block"></iframe><pre id="probeResult">PENDING</pre><script>
  const f=document.getElementById('f'),result=document.getElementById('probeResult'),rec={};let finished=false;
  const done=(ok,data)=>{if(finished)return;finished=true;result.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(data)};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const waitFor=async(fn,limit=14000,label='condition')=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(70)}throw new Error('waitFor timeout: '+label)};
  (async()=>{
    const source=Array.from({length:20},(_,i)=>'word'+i).join(' '),charIndex=source.indexOf('word6');
    sessionStorage.setItem('field.aperture.handoff.v01',JSON.stringify({source,label:'ALIAS FOCUS PROBE',from:'/foundry/?alias=1',focus:{scale:'WORD',index:6,address:'text://'+charIndex+':'+(charIndex+5),char_index:charIndex,source_progress:charIndex/Math.max(1,source.length-1),wpm:777}}));
    f.src='/foundry/aperture/';
    const W=()=>f.contentWindow,D=()=>W().document;
    const A=await waitFor(()=>{const a=D().getElementById('docAperture');return W().location.pathname==='/docs/'&&D().documentElement.dataset.readfieldHandoff==='focus-restored'&&a?.snapshot?.()?a:null},14000,'alias focus restored');
    await sleep(120);
    const snap=A.snapshot();rec.path=W().location.pathname;rec.restored=D().documentElement.dataset.readfieldHandoff;rec.scale=snap.scale;rec.index=snap.index;rec.wpm=snap.wpm;rec.charIndex=snap.char_index;rec.returnHref=D().getElementById('returnLink')?.getAttribute('href')||'';
    done(rec.path==='/docs/'&&rec.restored==='focus-restored'&&rec.scale==='WORD'&&rec.index===6&&rec.wpm===777&&rec.charIndex>=charIndex&&rec.charIndex<charIndex+'word6'.length&&rec.returnHref.startsWith('/foundry/'),rec);
  })().catch(e=>done(false,{stage:'exception',error:String(e?.stack||e),...rec}));
  <\/script></body></html>`;
}

function apertureMultilingualProbeHtml(){
  return `<!doctype html><html><body><pre id="probeResult">PENDING</pre><script src="/field-aperture.js"></script><script>
  const result=document.getElementById('probeResult'),rec={};
  const done=(ok,data)=>{result.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(data)};
  try{
   const cases=[['zh','庭院里的孔雀。'],['en','The window is open.'],['ms','Lihat tangga itu.'],['ta','தமிழ் மொழி'],['ja','窓の向こうを見る。'],['ar','انظر إلى النافذة'],['th','มองไปที่หน้าต่าง']];
   rec.languages={};let ok=true;
   for(const [lang,text] of cases){
    const a=document.createElement('field-aperture');document.body.appendChild(a);a.load(text,{locale:lang});
    const word=a.A.scales.find(x=>x.id==='WORD'),gr=a.A.scales.find(x=>x.id==='GRAPHEME');
    const offsets=!!word&&word.units.length>0&&word.units.every(u=>text.slice(u.start,u.end).replace(/\s/g,'')===String(u.text).replace(/\s/g,''));
    const plural=word?.units.length>1;rec.languages[lang]={word:word?.units.length||0,grapheme:gr?.units.length||0,offsets,plural};ok=ok&&offsets&&plural;
   }
   const g=document.createElement('field-aperture');document.body.appendChild(g);g.load('A👩‍🔬é',{locale:'en',scale:'GRAPHEME'});rec.emoji=g.snapshot();
   ok=ok&&rec.emoji.scale==='GRAPHEME'&&rec.emoji.count===3;done(ok,rec);
  }catch(e){done(false,{error:String(e?.stack||e),...rec})}
  <\/script></body></html>`;
}

function lensRealUseProbeHtml(){
  return `<!doctype html><html><body style="margin:0"><iframe id="f" style="width:1180px;height:820px;border:0;display:block" src="/?focus=%2Ffold-bloom%2Ftwo-dial%2F"></iframe><pre id="probeResult">PENDING</pre><script>
  const f=document.getElementById('f'),out=document.getElementById('probeResult'),rec={field:{},generic:{},studio:{}},done=(ok,data)=>out.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(data);
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const waitFor=async(fn,limit=12000)=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(100)}throw Error('waitFor timeout')};
  (async()=>{
    const W=()=>f.contentWindow,D=()=>W().document;

    // FIELD: open Lens, refract, collapse, let host select another object, then reopen/RETURN.
    await waitFor(()=>W().FieldLensHost?.focus?.()?.href==='/fold-bloom/two-dial/'&&W().LensFocusRing&&D().getElementById('apLens')&&D().getElementById('lens-focus-ring')?.shadowRoot);
    rec.field.start=W().FieldLensHost.focus().href;
    D().getElementById('apLens').click();
    let sh=await waitFor(()=>D().getElementById('lens-focus-ring')?.shadowRoot);
    await waitFor(()=>sh.querySelector('.panel.on'));
    const structure=await waitFor(()=>sh.querySelector('[data-mode="STRUCTURE"]'));structure.click();
    await waitFor(()=>W().FieldLensHost.uiState()?.projection==='STRUCTURE');
    rec.field.refracted=W().FieldLensHost.uiState().projection;
    sh.querySelector('.close').click();
    await waitFor(()=>!sh.querySelector('.panel.on'));
    W().FieldLensHost.dive();
    const target=await waitFor(()=>D().querySelector('.mapRow[data-href="/fold-bloom/live/"]'));target.click();
    await waitFor(()=>W().FieldLensHost.focus?.()?.href==='/fold-bloom/live/');
    rec.field.hostSelected=W().FieldLensHost.focus().href;
    D().getElementById('apLens').click();await waitFor(()=>sh.querySelector('.panel.on'));
    sh.querySelector('.return').click();
    await waitFor(()=>!sh.querySelector('.panel.on'));
    rec.field.afterReturn=W().FieldLensHost.focus().href;
    rec.field.staleOrigin=rec.field.afterReturn!==rec.field.hostSelected;

    // Generic route: inspect what is actually actionable, then enter Studio and return.
    W().location.href='/fold-bloom/instrument/';
    await waitFor(()=>W().location.pathname==='/fold-bloom/instrument/'&&D().getElementById('showcase-route-adapter'));
    let nav=await waitFor(()=>D().getElementById('showcase-route-adapter')?.shadowRoot),lensTab=await waitFor(()=>nav.querySelector('.tab.lens'));
    lensTab.click();await waitFor(()=>nav.querySelector('.panel.on.lens'));
    const transforms=['out','in','projection'].map(k=>nav.querySelector('[data-l="'+k+'"]'));
    rec.generic.disabledTransforms=transforms.filter(x=>x?.disabled&&!x.hidden).length;
    rec.generic.hiddenTransforms=transforms.filter(x=>x?.hidden).length;
    rec.generic.visibleActions=[...nav.querySelectorAll('.lensops button')].filter(x=>!x.hidden).map(x=>({label:x.textContent.trim(),disabled:x.disabled}));
    rec.generic.object=nav.querySelector('[data-l="object"]')?.textContent||null;
    rec.generic.returnBefore=W().location.pathname;
    nav.querySelector('[data-l="studio"]').click();
    await waitFor(()=>W().location.pathname==='/fold-bloom/lens/'&&W().ScaleLensStateAPI?.snapshot?.());
    rec.generic.studioObject=W().ScaleLensStateAPI.snapshot().objectId;
    rec.generic.returnTarget=D().getElementById('dockReturnPath')?.textContent||null;

    // Handoff Studio: use one real projection change; identity must remain the caller.
    rec.studio.handoffLabOpen=D().body.classList.contains('lab-open');
    const studioObject=W().ScaleLensStateAPI.snapshot().objectId;
    const buttons=[...D().querySelectorAll('#domains button')],alternate=buttons.find(b=>!b.classList.contains('on'));
    if(alternate){rec.studio.domainBefore=W().ScaleLensSpatialAPI.snapshot().domain;alternate.click();await waitFor(()=>W().ScaleLensSpatialAPI.snapshot().domain!==rec.studio.domainBefore);rec.studio.domainAfter=W().ScaleLensSpatialAPI.snapshot().domain}
    rec.studio.identityStable=W().ScaleLensStateAPI.snapshot().objectId===studioObject;
    const adapter=D().getElementById('showcase-route-adapter'),ash=adapter?.shadowRoot;
    const studioLensTab=ash?.querySelector('.tab.lens');
    rec.studio.duplicatePortableLens=!!studioLensTab&&!studioLensTab.hidden;
    W().ScaleLensSpatialAPI.return();
    await waitFor(()=>W().location.pathname==='/fold-bloom/instrument/');
    rec.generic.returnAfter=W().location.pathname;
    rec.generic.returnExact=rec.generic.returnAfter===rec.generic.returnBefore;

    // Direct Studio: record default LAB/RETURN presentation and duplicate Lens surface.
    W().location.href='/fold-bloom/lens/';
    await waitFor(()=>W().location.pathname==='/fold-bloom/lens/'&&W().ScaleLensStateAPI?.snapshot?.()&&D().getElementById('dockReturn'));
    rec.studio.directLabOpen=D().body.classList.contains('lab-open');
    rec.studio.headerReturn=D().getElementById('fieldBtn')?.textContent.trim()||null;
    rec.studio.dockReturn=D().getElementById('dockReturn')?.textContent.trim()||null;
    const directAdapter=await waitFor(()=>D().getElementById('showcase-route-adapter')),directTab=directAdapter.shadowRoot?.querySelector('.tab.lens');
    rec.studio.directDuplicatePortableLens=!!directTab&&!directTab.hidden;

    const ok=rec.field.staleOrigin===false&&rec.field.afterReturn===rec.field.hostSelected&&rec.generic.disabledTransforms===0&&rec.generic.hiddenTransforms===3&&rec.generic.returnExact===true&&rec.studio.identityStable===true&&rec.studio.duplicatePortableLens===false&&rec.studio.directDuplicatePortableLens===false&&rec.studio.headerReturn===rec.studio.dockReturn;
    done(ok,rec);
  })().catch(e=>done(false,{error:String(e?.stack||e),href:f.contentWindow?.location?.href||null,...rec}));
  <\/script></body></html>`;
}

function genericLensReturnProbeHtml(){
  return `<!doctype html><html><body style="margin:0"><iframe id="f" style="width:390px;height:844px;border:0;display:block" src="/fold-bloom/instrument/"></iframe><pre id="probeResult">PENDING</pre><script>
  const f=document.getElementById('f'),out=document.getElementById('probeResult'),rec={};
  const done=(ok,data)=>out.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(data);
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const waitFor=async(fn,limit=8000)=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(100)}throw Error('waitFor timeout')};
  (async()=>{
    const W=()=>f.contentWindow,D=()=>f.contentWindow.document;
    const host=await waitFor(()=>D().getElementById('showcase-route-adapter'));
    const sh=await waitFor(()=>host.shadowRoot),tab=await waitFor(()=>sh.querySelector('.tab.lens'));
    rec.before=W().location.pathname;rec.triggerGlyph=tab.textContent.trim();
    tab.click();
    await waitFor(()=>sh.querySelector('.panel.on.lens'));
    rec.copy=!!sh.querySelector('[data-l="copy"]');
    rec.deadStack=!!sh.querySelector('[data-l="stackBtn"]');
    rec.overflow=Math.max(D().documentElement.scrollWidth,D().body?.scrollWidth||0)-D().documentElement.clientWidth;
    const ret=sh.querySelector('[data-l="return"]');rec.returnButton=!!ret;
    if(!ret)throw Error('generic Lens RETURN missing');
    ret.click();
    await waitFor(()=>!sh.querySelector('.panel.on'));
    rec.after=W().location.pathname;
    rec.closed=!sh.querySelector('.panel.on');
    done(rec.before===rec.after&&rec.closed&&rec.copy&&!rec.deadStack&&rec.returnButton&&rec.overflow<=1&&rec.triggerGlyph==='◎',rec);
  })().catch(e=>done(false,{error:String(e?.stack||e),...rec}));
  <\/script></body></html>`;
}

function oneReturnGridReceiptProbeHtml(){
  return `<!doctype html><html><body><iframe id="f" style="width:1100px;height:820px;border:0" src="/sleeper/one-return/"></iframe><pre id="probeResult">PENDING</pre><script>
  const f=document.getElementById('f'),out=document.getElementById('probeResult'),rec={};
  const done=(ok,data)=>out.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(data);
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const waitFor=async(fn,limit=8000)=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(100)}throw Error('waitFor timeout')};
  (async()=>{
    const api=await waitFor(()=>f.contentWindow.OneReturnAPI);
    const receipt={format:'BY/GRID-PATH-2',source:{fingerprint:'src:nine:test',pack:'nine',rows:2,cols:2,matrix:[['A','B'],['C','D']]},path:{id:'path:test:abcd',cells:[{r:0,c:0,token:'A'},{r:0,c:1,token:'B'},{r:1,c:0,token:'C'},{r:1,c:1,token:'D'}],break_after:[1],edges:[]},compression:{address:'@00:E1/S1'},reading:{flat:'ABCD',strands:['AB','CD']},view:'TEXT'};
    api.importPacket(receipt);const snap=await waitFor(()=>{const x=api.snapshot();return x?.upstream?.pathId==='path:test:abcd'?x:null});
    rec.upstream=snap.upstream;rec.source=snap.source;rec.seed=snap.seed;rec.gates=snap.gates?.length||0;
    const packet=api.exportPacket();rec.packetUpstream=packet.upstream;
    done(snap.upstream.sourceFingerprint==='src:nine:test'&&snap.upstream.address==='@00:E1/S1'&&snap.source[0]==='AB'&&snap.source[1]==='CD'&&snap.seed.includes('path:test:abcd')&&rec.gates===9&&packet.upstream.pathId==='path:test:abcd',rec);
  })().catch(e=>done(false,{error:String(e?.stack||e),...rec}));
  <\/script></body></html>`;
}

function foldBloomReplayScoreProbeHtml(){
  return `<!doctype html><html><body><pre id="probeResult">PENDING</pre><script type="module">
  const out=document.getElementById('probeResult'),done=(ok,data)=>out.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(data);
  try{
    const m=await import('/fold-bloom/replay/score.js'),a=m.defaultScore(),url=await m.shareUrl(a,'http://example.test/fold-bloom/replay/'),token=url.split('#s=')[1],b=await m.decodeShare(token);
    const changed=m.setWordCue(a,0,{at:.44,emphasis:1.8}),rec={
      sourceSame:a.source.id===b.source.id,
      signatureSame:m.visualSignature(a)===m.visualSignature(b),
      changedSignature:m.visualSignature(changed)!==m.visualSignature(a),
      linkLength:url.length,
      compressed:token.startsWith('z.'),
      words:m.wordsOf(a.message).length,
      clip:m.clipDurationMs(a)
    };
    done(rec.sourceSame&&rec.signatureSame&&rec.changedSignature&&rec.linkLength<1600&&rec.words===5&&rec.clip===12000,rec);
  }catch(e){done(false,{error:String(e?.stack||e)})}
  <\/script></body></html>`;
}

const server=http.createServer((req,res)=>{
  if(String(req.url||'').startsWith('/__smoke/fold-bloom-replay-score')){
    res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
    res.end(foldBloomReplayScoreProbeHtml());return;
  }
  if(String(req.url||'').startsWith('/__smoke/lens-real-use')){
    res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
    res.end(lensRealUseProbeHtml());return;
  }
  if(String(req.url||'').startsWith('/__smoke/generic-lens-return')){
    res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
    res.end(genericLensReturnProbeHtml());return;
  }
  if(String(req.url||'').startsWith('/__smoke/one-return-grid-receipt')){
    res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
    res.end(oneReturnGridReceiptProbeHtml());return;
  }
  if(String(req.url||'').startsWith('/__smoke/aperture-multilingual')){
    res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
    res.end(apertureMultilingualProbeHtml());return;
  }
  if(String(req.url||'').startsWith('/__smoke/axial-continuity')){
    res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
    res.end(axialContinuityProbeHtml());return;
  }
  if(String(req.url||'').startsWith('/__smoke/docs-aperture')){
    res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
    res.end(docsApertureProbeHtml());return;
  }
  if(String(req.url||'').startsWith('/__smoke/reader-focus')){
    res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
    res.end(readerFocusProbeHtml());return;
  }
  if(String(req.url||'').startsWith('/__smoke/readfield-local-file')){
    res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
    res.end(readfieldLocalFileProbeHtml());return;
  }
  if(String(req.url||'').startsWith('/__smoke/readfield-focus-lens')){
    res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
    res.end(readfieldFocusLensProbeHtml());return;
  }
  if(String(req.url||'').startsWith('/__smoke/readfield-handoff')){
    res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
    res.end(readfieldRouteHandoffProbeHtml());return;
  }
  if(String(req.url||'').startsWith('/__smoke/readfield-loci-handoff')){
    res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
    res.end(readfieldLociHandoffProbeHtml());return;
  }
  if(String(req.url||'').startsWith('/__smoke/readfield-aperture-alias-focus')){
    res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
    res.end(readfieldApertureAliasFocusProbeHtml());return;
  }
  if(String(req.url||'').startsWith('/__smoke/lens-proof')){
    res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
    res.end(lensProbeHtml());return;
  }
  if(String(req.url||'').startsWith('/__smoke/listen-source')){
    res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
    res.end(listenSourceProbeHtml());return;
  }
  if(String(req.url||'').startsWith('/__smoke/field-listen')){
    res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
    res.end(fieldListenProbeHtml());return;
  }
  if(String(req.url||'').startsWith('/__smoke/listen-preview')){
    res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
    res.end(listenPreviewProbeHtml());return;
  }
  if(String(req.url||'').startsWith('/__smoke/listen-intake')){
    res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
    res.end(listenIntakeProbeHtml());return;
  }
  if(String(req.url||'').startsWith('/__smoke/field-activation')){
    res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
    res.end(fieldActivationProbeHtml());return;
  }
  if(String(req.url||'').startsWith('/__smoke/lens-studio')){
    res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
    res.end(studioProbeHtml());return;
  }
  if(String(req.url||'').startsWith('/__smoke/poem-map')){
    res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
    res.end(poemMapProbeHtml());return;
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
    options:{width:1040,height:820,budget:1800,timeout:18000},
    check:dom=>dom.includes('id="axialLatest"')&&dom.includes('FIELD / FOCUS')&&dom.includes('class="reentryFold"')&&/NOW \/ CURRENT/.test(dom)&&/RECOVER \/ VAULT/.test(dom)&&/CONVERGE \/ NEXUS/.test(dom)&&dom.includes('href="./recovery/"')&&dom.includes('class="syncLine"')&&dom.includes('id="syncCurrent"')&&dom.includes('id="syncFocus"')&&dom.includes('id="catchupFold"')&&dom.includes('id="catchupSignals"')&&dom.includes('id="catchupList"')&&dom.includes('id="catchupRewind"')&&dom.includes('id="catchupMark"')&&/FIELD \/ CATCH \+ ACT/.test(dom)&&dom.includes('id="capTrial"')&&/REWIND/.test(dom)&&/MARK ALL/.test(dom)&&dom.includes('id="touchList"')&&dom.includes('class="routeProjection"')&&/Φ \/ CURRENT/.test(dom)&&/CONFLUENCE/.test(dom)
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
    name:'ROOM MATERIAL DOM 0.4',
    route:'/foundry/room/?selftest=1',
    options:{width:1000,height:820,budget:4200,timeout:18000},
    check:dom=>dom.includes('ROOM 0.4')&&dom.includes('MATERIAL DOM')&&dom.includes('id="program"')&&dom.includes('data-schema="0xxx0/material-dom/v0.4"')&&dom.includes('id="compiler"')&&dom.includes('rel="next"')&&dom.includes('id="foldBtn"')&&dom.includes('id="roomSelftest"')&&/PASS · DOM PROGRAM · FOLD · RUN · BIND · RETURN/.test(dom)&&!dom.includes('space-core.js')
  },
  {
    name:'AXIAL continuity + RETURN replay',
    route:'/__smoke/axial-continuity',
    options:{width:1180,height:880,budget:18000,timeout:24000},
    check:dom=>/id="probeResult">PASS /.test(dom)&&/"backSame":true/.test(dom)&&/"replaySame":true/.test(dom)&&/"restoreButton":true/.test(dom)
  },
  {
    name:'APERTURE compatibility → READFIELD',
    route:'/foundry/aperture/',
    check:dom=>/READFIELD/i.test(dom)&&dom.includes('id="docAperture"')
  },
  {
    name:'APERTURE alias preserves READFIELD focus',
    route:'/__smoke/readfield-aperture-alias-focus',
    options:{width:520,height:940,budget:18000,timeout:24000},
    check:dom=>/id="probeResult">PASS /.test(dom)&&/"restored":"focus-restored"/.test(dom)&&/"scale":"WORD"/.test(dom)&&/"index":6/.test(dom)&&/"wpm":777/.test(dom)
  },
  {
    name:'APERTURE multilingual segmentation',
    route:'/__smoke/aperture-multilingual',
    options:{width:900,height:700,budget:9000},
    check:dom=>/id="probeResult">PASS /.test(dom)&&/"zh"/.test(dom)&&/"ta"/.test(dom)&&/"ja"/.test(dom)&&/"ar"/.test(dom)&&/"th"/.test(dom)&&/"count":3/.test(dom)
  },
  {
    name:'READFIELD',
    route:'/docs/',
    check:dom=>/READFIELD/i.test(dom)&&/RSVP 0\.8\.5/.test(dom)&&dom.includes('id="docAperture"')&&dom.includes('reader')&&dom.includes('RAW SOURCE')&&dom.includes('id="readerUses"')&&dom.includes('id="workRail"')&&dom.includes('id="workModeStatus"')&&dom.includes('id="pulseState"')&&dom.includes('id="localFile"')&&/SKIM → REVIEW/.test(dom)
  },
  {
    name:'READFIELD local file phone intake',
    route:'/__smoke/readfield-local-file',
    options:{width:430,height:900,budget:18000,timeout:24000},
    check:dom=>/id="probeResult">PASS /.test(dom)&&/"label":"field-note.md"/.test(dom)&&/"scale":"WORD"/.test(dom)&&/"wpm":900/.test(dom)&&/"local":true/.test(dom)&&/"copy":"COPY FOCUS"/.test(dom)
  },
  {
    name:'READFIELD explicit pulse mode',
    route:'/docs/?pulse=4',
    options:{width:430,height:900,budget:9000},
    check:dom=>/^PULSE ×4/.test(textAtId(dom,'pulseSync'))&&/NO FIELD PULSE CLOCK|LISTEN|LAB PULSE/.test(textAtId(dom,'pulseState'))&&/READ TO PULSE/.test(dom)
  },
  {
    name:'DOCS ADDRESS',
    route:'/docs/?src=/showcase-manifest.json&return=/',
    check:dom=>textAtId(dom,'title')==='showcase-manifest.json'&&dom.includes('id="returnLink"')&&dom.includes('href="/showcase-manifest.json"')
  },
  {
    name:'DOCS Aperture addressed resume',
    route:'/__smoke/docs-aperture',
    options:{width:1040,height:820,budget:12000,timeout:18000},
    check:dom=>/id="probeResult">PASS /.test(dom)&&/"scale":"LEAF"/.test(dom)&&/"wpm":650/.test(dom)&&/"copyView":true/.test(dom)&&/"throttled":true/.test(dom)&&/"ended":true/.test(dom)
  },
  {
    name:'READFIELD focus kernel + performance',
    route:'/__smoke/reader-focus',
    options:{width:1040,height:820,budget:16000,timeout:22000},
    check:dom=>/id="probeResult">PASS /.test(dom)&&/"same":true/.test(dom)&&/"spans":true/.test(dom)&&/"performance":true/.test(dom)&&/"reader":true/.test(dom)&&/"session":true/.test(dom)
  },
  {
    name:'READFIELD FOCUS lens convergence',
    route:'/__smoke/readfield-focus-lens',
    options:{width:520,height:940,budget:18000,timeout:24000},
    check:dom=>/id="probeResult">PASS /.test(dom)&&/"speed":6000/.test(dom)&&/"glyphSpokes":24/.test(dom)&&/"markers":72/.test(dom)&&/"min":true/.test(dom)&&/"plain":true/.test(dom)
  },
  {
    name:'READFIELD route handoff',
    route:'/__smoke/readfield-handoff',
    options:{width:1040,height:820,budget:14000,timeout:20000},
    check:dom=>/id="probeResult">PASS /.test(dom)&&/"label":"READ"/.test(dom)&&/"reader":true/.test(dom)
  },
  {
    name:'READFIELD → LOCI focus handoff',
    route:'/__smoke/readfield-loci-handoff',
    options:{width:520,height:940,budget:18000,timeout:24000},
    check:dom=>/id="probeResult">PASS /.test(dom)&&/"packetScale":"WORD"/.test(dom)&&/"sourceSame":true/.test(dom)&&/"contains":true/.test(dom)&&/"words":96/.test(dom)&&/"nodes":16/.test(dom)
  },
  {
    name:'TRIANGLE unified',
    route:'/forward-field-proof/triangle/',
    check:dom=>dom.includes('TRIANGLE · UNIFIED INSTRUMENT 1.0')&&dom.includes('data-mode="GLYPH"')&&dom.includes('data-mode="FORM"')&&dom.includes('data-mode="POWER"')&&dom.includes('data-mode="BENCH"')&&dom.includes('id="formRoot"')&&dom.includes('id="powerSolve"')
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
    name:'FIELD focus + addressed re-entry',
    route:'/__smoke/field-activation',
    options:{width:1040,height:820,budget:18000,timeout:24000},
    check:dom=>/id="probeResult">PASS /.test(dom)&&/"focused":"\//.test(dom)&&/"openHref":"\.\/fold-bloom\/"/.test(dom)&&/"returned":"\//.test(dom)
  },
  {
    name:'FIELD LISTEN candidate focus',
    route:'/__smoke/field-listen',
    options:{width:1040,height:820,budget:16000,timeout:22000},
    check:dom=>/id="probeResult">PASS /.test(dom)&&/"visible":true/.test(dom)&&/"focused":"\/fold-bloom\/listen\/"/.test(dom)&&/"href":"\/fold-bloom\/listen\/"/.test(dom)&&/"root":"\/"/.test(dom)
  },
  {
    name:'LENS STACK STUDIO RETURN',
    route:'/__smoke/lens-studio',
    options:{width:1280,height:900,budget:22000,timeout:28000},
    check:dom=>/id="probeResult">PASS /.test(dom)&&/"field-foveate"/.test(dom)&&/"studioObject":"\/fold-bloom\/lens\/"/.test(dom)&&/"endHref":"\/fold-bloom\/lens\/"/.test(dom)
  },
  {
    name:'LENS focused real-use observation',
    route:'/__smoke/lens-real-use',
    options:{width:1280,height:900,budget:24000,timeout:32000},
    check:dom=>/id="probeResult">PASS /.test(dom)&&/"staleOrigin":false/.test(dom)&&/"hiddenTransforms":3/.test(dom)&&/"duplicatePortableLens":false/.test(dom)&&/"directDuplicatePortableLens":false/.test(dom)&&/"returnExact":true/.test(dom)&&/"identityStable":true/.test(dom)
  },
  {
    name:'GENERIC LENS RETURN ≠ BACK',
    route:'/__smoke/generic-lens-return',
    options:{width:430,height:900,budget:9000,timeout:16000},
    check:dom=>/id="probeResult">PASS /.test(dom)&&/"before":"\/fold-bloom\/instrument\/"/.test(dom)&&/"after":"\/fold-bloom\/instrument\/"/.test(dom)&&/"closed":true/.test(dom)&&/"copy":true/.test(dom)&&/"deadStack":false/.test(dom)&&/"overflow":0/.test(dom)&&/"triggerGlyph":"◎"/.test(dom)
  },
  {
    name:'FOLD BLOOM MESSAGE REPLAY H1',
    route:'/spikes/fold-bloom-message-replay-001/',
    options:{width:430,height:900,budget:7000,timeout:16000},
    check:dom=>dom.includes('data-fold-bloom-message-replay="ready"')&&/MESSAGE REPLAY 001/.test(dom)&&dom.includes('id="replay"')&&dom.includes('id="mutate"')&&dom.includes('id="copy"')&&/synthetic:field-message:001/.test(dom)&&/fnv1a32-/.test(dom)&&/ARCHITECTURAL EVIDENCE ONLY/.test(dom)
  },
  {
    name:'FOLD BLOOM REPLAY score core',
    route:'/__smoke/fold-bloom-replay-score',
    options:{width:520,height:800,budget:9000,timeout:16000},
    check:dom=>/id="probeResult">PASS /.test(dom)&&/"sourceSame":true/.test(dom)&&/"signatureSame":true/.test(dom)&&/"changedSignature":true/.test(dom)&&/"linkLength":[0-9]+/.test(dom)
  },
  {
    name:'FOLD BLOOM REPLAY 0.2',
    route:'/fold-bloom/replay/',
    options:{width:430,height:900,budget:10000,timeout:18000},
    check:dom=>/REPLAY 0\.2/i.test(dom)&&dom.includes('data-fold-bloom-replay="ready"')&&dom.includes('data-replay-share-roundtrip="pass"')&&dom.includes('id="syncListen"')&&dom.includes('id="wordAt"')&&dom.includes('id="wordHold"')&&dom.includes('id="wordEmphasis"')&&dom.includes('id="opAt"')&&dom.includes('id="anticipation"')&&dom.includes('id="textOffset"')&&dom.includes('id="clip"')&&/WHAT THIS LINK CONTAINS/.test(dom)
  },
  {
    name:'FOLD BLOOM public front',
    route:'/fold-bloom/',
    options:{width:430,height:900,budget:5000},
    check:dom=>/FOLD ?\/\/ ?BLOOM/i.test(dom)&&/A source becomes a field/i.test(dom)&&/ENTER LIVE/.test(dom)&&!/PLAY CENTER MASS/.test(dom)&&/MAP A TRACK/.test(dom)&&/BUILD A SET/.test(dom)&&/WHAT DO YOU/.test(dom)&&/WANT TO DO/.test(dom)&&/Play a track as terrain/.test(dom)&&/Read fast without losing your place/.test(dom)&&/MORE USES · SABER/.test(dom)&&/SABER \/ TWO PHONES/.test(dom)&&/MESSAGE \/ REPLAY/.test(dom)&&/SURFACES \/ LINEAGE \/ WHY IT WORKS/.test(dom)&&/SOURCE → ADDRESS → TRANSFORM → RETURN/.test(dom)
  },
  {
    name:'FOLD BLOOM SABER 0.1',
    route:'/fold-bloom/saber/',
    options:{width:430,height:900,budget:7000},
    check:dom=>/SABER 0\.1/i.test(dom)&&dom.includes('data-fold-bloom-saber="ready"')&&dom.includes('data-saber-role="HOST"')&&dom.includes('id="offer"')&&dom.includes('id="motion"')&&dom.includes('id="returnBtn"')&&/SOURCE → EVENT TAPE → MOTION WITNESS → HIT TRACE → RETURN/.test(dom)
  },
  {
    name:'FOLD BLOOM VOICE 0.1',
    route:'/fold-bloom/voice/',
    options:{width:430,height:900,budget:8000},
    check:dom=>/VOICE 0\.1/i.test(dom)&&dom.includes('id="micBtn"')&&dom.includes('id="pulseBtn"')&&dom.includes('data-pattern="CALL"')&&/Microphone analysis stays in this browser/.test(dom)&&/EXPORT RETURN/.test(dom)
  },
  {
    name:'FOLD BLOOM FIELD LAB',
    route:'/fold-bloom/lab/',
    options:{width:430,height:900,budget:7000},
    check:dom=>{
      const parts={
        version:/FIELD LAB 0\.3(?:\.1)?/i.test(dom),
        ready:dom.includes('data-fold-bloom-field-lab="ready"'),
        ride:dom.includes('data-field-lab-mode="RIDE"'),
        verse:/VERSE/.test(dom),
        verseReplay:dom.includes('id="verseReplay"'),
        exportTape:dom.includes('id="exportTape"'),
        raceInput:dom.includes('id="raceInput"'),
        inkTrace:dom.includes('id="inkTrace"'),
        inkLoad:dom.includes('id="inkLoad"'),
        paperAbsorb:dom.includes('id="paperAbsorb"'),
        stateFrom:dom.includes('id="stateFrom"'),
        stateTo:dom.includes('id="stateTo"'),
        stateToken:dom.includes('id="stateToken"')&&/H\[010\|100\] Δ\{3,5\} → H\[011\|110\]/.test(dom),
        stateReady:dom.includes('data-fold-bloom-state="ready"'),
        dry:/DRY BRUSH/.test(dom),wash:/WASH/.test(dom)
      };
      const pass=Object.values(parts).every(Boolean);
      if(!pass){const boot=(dom.match(/id="labBootWitness"[^>]*>([^<]*)</)||[])[1]||'MISSING';console.error('FIELD LAB CHECK',JSON.stringify(parts),'BOOT',boot)}
      return pass
    }
  },
  {
    name:'FOLD BLOOM FIELD LAB VERSE',
    route:'/fold-bloom/lab/?mode=VERSE',
    options:{width:430,height:900,budget:9000,timeout:16000},
    check:dom=>/FIELD LAB 0\.3(?:\.1)?/i.test(dom)&&dom.includes('data-fold-bloom-field-lab="ready"')&&dom.includes('data-field-lab-mode="VERSE"')&&dom.includes('id="verseSource"')&&dom.includes('id="versePoemMap"')&&dom.includes('id="verseRead"')&&dom.includes('id="verseLoci"')&&dom.includes('id="verseReplay"')&&/MARKS/.test(dom)
  },
  {
    name:'FOLD BLOOM FIELD LAB READFIELD',
    route:'/fold-bloom/lab/?mode=READ',
    options:{width:430,height:900,budget:9000,timeout:16000},
    check:dom=>/FIELD LAB 0\.3(?:\.1)?/i.test(dom)&&dom.includes('data-fold-bloom-field-lab="ready"')&&dom.includes('data-field-lab-mode="READ"')&&dom.includes('data-field-lab-reader="ready"')&&dom.includes('data-field-lab-reader-scale="WORD"')&&dom.includes('data-field-lab-read-pulse="WITNESS"')&&dom.includes('data-field-lab-read-source="bound"')&&dom.includes('data-field-lab-loci-nodes="13"')&&dom.includes('data-field-lab-loci-words="13"')&&dom.includes('id="labReader"')&&/FULL READFIELD/.test(dom)&&/CARRY → LOCI/.test(dom)&&/CARRY → DATA/.test(dom)&&/EXPORT RETURN/.test(dom)
  },
  {
    name:'FOLD BLOOM FIELD LAB READFIELD PACE4',
    route:'/fold-bloom/lab/?mode=READ&pulse=4',
    options:{width:430,height:900,budget:9000,timeout:16000},
    check:dom=>/FIELD LAB 0\.3(?:\.1)?/i.test(dom)&&dom.includes('data-fold-bloom-field-lab="ready"')&&dom.includes('data-field-lab-mode="READ"')&&dom.includes('data-field-lab-reader="ready"')&&dom.includes('data-field-lab-read-pulse="PACE4"')&&dom.includes('data-field-lab-read-source="bound"')&&/PULSE · ×4 PACE/.test(dom)
  },
  {
    name:'FOLD BLOOM INK FIELD',
    route:'/fold-bloom/ink/',
    options:{width:430,height:900,budget:7000},
    check:dom=>/INK FIELD/i.test(dom)&&dom.includes('data-fold-bloom-ink="ready"')&&dom.includes('id="water"')&&dom.includes('id="load"')&&dom.includes('id="absorb"')&&dom.includes('data-mode="SUMI"')&&dom.includes('data-mode="DRY"')&&dom.includes('data-mode="WASH"')&&/PRESSURE \+ TILT/.test(dom)
  },
  {
    name:'FOLD BLOOM LIVE shareable demo',
    route:'/fold-bloom/live/?demo=1&profile=DRIVE',
    options:{width:430,height:900,budget:5000},
    check:dom=>dom.includes('data-fold-bloom-live="ready"')&&dom.includes('data-fold-bloom-launch="demo"')&&dom.includes('data-fold-bloom-ride-profile="')&&dom.includes('data-xp-preset="DRIVE"')&&dom.includes('id="anticipationTune"')&&dom.includes('id="motionGainTune"')
  },
  {
    name:'FOLD BLOOM LIVE clean-phone audio example',
    route:'/fold-bloom/live/?source=example&profile=DRIVE',
    options:{width:430,height:900,budget:12000,timeout:18000},
    check:dom=>dom.includes('data-fold-bloom-live="ready"')&&dom.includes('data-fold-bloom-launch="public-demo"')&&dom.includes('data-fold-bloom-demo-source="ready"')&&dom.includes('id="publicDemoBtn"')&&/PLAY AUDIO EXAMPLE/.test(dom)&&dom.includes('data-layer-mode="SOURCE"')&&dom.includes('data-layer-mode="MAP"')&&dom.includes('data-layer-mode="IMMERSION"')
  },
  {
    name:'FOLD BLOOM module boot',
    route:'/fold-bloom/instrument/',
    options:{width:430,height:900,budget:9000},
    check:dom=>dom.includes('data-fb-module="ready"')
  },
  {
    name:'FOLD BLOOM INTERPHASE host boot',
    route:'/fold-bloom/instrument/',
    options:{width:430,height:900,budget:9000},
    check:dom=>dom.includes('data-fb-host="ready"')
  },
  {
    name:'FOLD BLOOM instrument ready',
    route:'/fold-bloom/instrument/',
    options:{width:430,height:900,budget:9000},
    check:dom=>dom.includes('data-fb-ready="ready"')&&dom.includes('data-fold-bloom-instrument="ready"')&&dom.includes('data-object-kind="EMPTY"')
  },
  {
    name:'FOLD BLOOM convergence',
    route:'/fold-bloom/instrument/',
    options:{width:430,height:900,budget:9000},
    check:dom=>/FOLD ?\/\/ ?BLOOM/i.test(dom)&&/ONE OBJECT · ONE FOCUS/i.test(dom)&&dom.includes('data-fold-bloom-instrument="ready"')&&dom.includes('data-object-kind="EMPTY"')&&/SOURCE → FOCUS → FOLD \/ BLOOM → PROJECTION → RETURN/.test(dom)&&/LISTEN 0\.6/i.test(dom)&&/LIVE 0\.13/i.test(dom)&&/SET 0\.1\.1/i.test(dom)&&/JOURNEY 0\.1\.2/i.test(dom)&&/RIDE SET → LIVE/.test(dom)&&/next gate is ordinary 2–3-source phone use/i.test(dom)&&!/not yet LIVE-across-a-set/i.test(dom)&&/ONE-INSTRUMENT PROOF/i.test(dom)&&/INTERPHASE SYNC/i.test(dom)
  },
  {
    name:'FOLD BLOOM SET 0.1 compositor',
    route:'/fold-bloom/set/?demo=1',
    options:{width:430,height:900,budget:9000},
    check:dom=>/SET 0\.1/i.test(dom)&&/EXPERIENCE COMPOSITOR/i.test(dom)&&dom.includes('data-fold-bloom-set="ready"')&&dom.includes('data-set-entries="3"')&&/SOURCE A/.test(dom)&&/SOURCE B/.test(dom)&&/SOURCE C/.test(dom)&&/DISSOLVE/.test(dom)&&/RETURN/.test(dom)
  },
  {
    name:'FOLD BLOOM JOURNEY 0.1.2 exact seed witness',
    route:'/fold-bloom/set/journey.html?demo=seed&auto=1',
    options:{width:430,height:900,budget:9000,timeout:16000},
    check:dom=>/JOURNEY RIDE 0\.1\.2/i.test(dom)&&dom.includes('data-fold-bloom-journey="ready"')&&dom.includes('data-journey-demo="seed"')&&dom.includes('data-journey-demo-audio="private"')&&dom.includes('data-journey-entries="3"')&&/GHOST → FORGE → WILL/.test(dom)&&/preforme/.test(dom)&&/THROUGH THE FIRE/.test(dom)&&/BY YOUR WILL \/ 遺志/.test(dom)&&/CARRY/.test(dom)&&/DISSOLVE/.test(dom)&&/RETURN/.test(dom)&&/DEMO WITNESS/.test(dom)
  },
  {
    name:'FOLD BLOOM GLYPH ATLAS 0.2 INSIDE',
    route:'/fold-bloom/atlas/',
    options:{width:430,height:900,budget:5000},
    check:dom=>/GLYPH ATLAS/i.test(dom)&&/SYNTHETIC DEMO/i.test(dom)&&/SOURCE = CELL/i.test(dom)&&/GLYPH = THUMBNAIL/i.test(dom)&&/FOCUS = INSIDE/i.test(dom)&&dom.includes('data-glyph-atlas="ready"')&&dom.includes('data-atlas-idle="on"')&&dom.includes('id="inside"')&&dom.includes('id="originBtn"')&&dom.includes('id="pathRail"')&&dom.includes('id="message"')&&dom.includes('id="shareBtn"')&&dom.includes('id="readBtn"')&&dom.includes('id="rebindBtn"')&&dom.includes('document-structure.js')
  },
  {
    name:'FOLD BLOOM LIVE 0.13 source continuity',
    route:'/fold-bloom/live/',
    options:{width:430,height:900,budget:9000},
    check:dom=>/LIVE 0\.13/i.test(dom)&&dom.includes('data-fold-bloom-live="ready"')&&dom.includes('data-fold-bloom-pov="embodied-v0.4"')&&dom.includes('data-fold-bloom-macro-drop="v0.2"')&&dom.includes('data-fold-bloom-idle-law="witness-v0.1"')&&dom.includes('data-fold-bloom-idle="on"')&&dom.includes('data-fold-bloom-autopilot="on"')&&dom.includes('data-fold-bloom-landmarks="0"')&&dom.includes('data-fold-bloom-layer="IMMERSION"')&&dom.includes('id="demoBtn"')&&dom.includes('id="autoBtn"')&&dom.includes('id="publicDemoBtn"')&&/LOAD AUDIO EXAMPLE|PLAY AUDIO EXAMPLE/.test(dom)&&dom.includes('id="centerMassBtn"')&&/TRY CENTER MASS REMOTE/.test(dom)&&/PLAY FIELD COURSE/.test(dom)&&dom.includes('id="vaultSelect"')&&dom.includes('data-layer-mode="SOURCE"')&&dom.includes('data-layer-mode="MAP"')&&dom.includes('data-layer-mode="IMMERSION"')&&/SOURCE → MAP → IMMERSION/i.test(dom)&&dom.includes('id="call"')&&dom.includes('id="arc"')&&dom.includes('id="route"')&&dom.includes('id="trackFile"')&&dom.includes('id="lyric"')&&dom.includes('id="textBtn"')&&dom.includes('id="solidTune"')&&dom.includes('id="immersionTune"')&&dom.includes('id="anticipationTune"')&&dom.includes('id="motionGainTune"')&&dom.includes('id="dropGainTune"')&&dom.includes('id="textSyncTune"')&&dom.includes('data-xp-preset="DRIVE"')&&/data-fold-bloom-ride-profile="[^"]+"/.test(dom)&&/AUTOPILOT/.test(dom)&&/BEAT \/ PHRASE \/ SECTION/i.test(dom)&&/FIELD COURSE/.test(dom)&&dom.includes('data-trackfield-source="FIELD_PRACTICE"')&&/data-trackfield-motion="(?!NONE)[^"]+"/.test(dom)&&/data-fold-bloom-perf="[^"]+"/.test(dom)  },
  {
    name:'TWO DIAL 0.10.3 idle witness',
    route:'/fold-bloom/two-dial/',
    options:{width:1180,height:900,budget:9000},
    check:dom=>/SOUND FIELD 0\.10\.3/i.test(dom)&&/HOLD FAST \/ LET FLY/i.test(dom)&&/IDLE \/ WITNESS/i.test(dom)&&dom.includes('data-voice="FM"')&&dom.includes('data-groove="POLY"')&&dom.includes('data-world="TRANCE"')&&dom.includes('id="pulseLinkBtn"')&&dom.includes('id="trackLoadBtn"')&&dom.includes('id="trackToggleBtn"')&&dom.includes('data-fold-bloom-pulse="ready"')&&dom.includes('data-fold-bloom-local-track="ready"')&&dom.includes('data-fold-bloom-idle="on"')
  },
  {
    name:'FOLD BLOOM LISTEN 0.6 source bundle',
    route:'/fold-bloom/listen/',
    options:{width:1180,height:900,budget:9000},
    check:dom=>/LISTEN 0\.6/i.test(dom)&&/DROP A TRACK/i.test(dom)&&/SUNO SONG \/ PLAYLIST \/ DIRECT AUDIO/i.test(dom)&&/ADDRESS/.test(dom)&&/APERTURE/.test(dom)&&/BEAT/.test(dom)&&/PHRASE/.test(dom)&&/SECTION/.test(dom)&&/TRACK/.test(dom)&&dom.includes('id="file"')&&dom.includes('id="field"')&&dom.includes('id="key"')&&dom.includes('id="phrases"')&&dom.includes('id="glyphBtn"')&&dom.includes('id="idleBtn"')&&dom.includes('id="pinBtn"')&&dom.includes('id="pinsBtn"')&&dom.includes('id="pinKind"')&&dom.includes('id="pinShare"')&&/ARC · editable span/.test(dom)&&dom.includes('id="pinStart"')&&dom.includes('id="pinEnd"')&&dom.includes('id="pinPrev"')&&dom.includes('id="pinNext"')&&dom.includes('id="pinImportBtn"')&&dom.includes('id="savedSource"')&&dom.includes('id="beatSaberBtn"')&&/BEAT SABER/.test(dom)&&dom.includes('id="useReplay"')&&dom.includes('id="useAtlas"')&&dom.includes('id="useBeat"')&&dom.includes('id="useSaber"')&&/SABER · TWO PHONES/.test(dom)&&dom.includes('id="useSheet"')&&dom.includes('id="rideTune"')&&dom.includes('id="rideText"')&&dom.includes('data-listen-lens="field-addressed-stream/v0.1"')&&/data-listen-ride-profile="[^"]+"/.test(dom)&&/RETURN · MESSAGE MAP/.test(dom)
  },
  {
    name:'FOLD BLOOM LISTEN preview render',
    route:'/__smoke/listen-preview',
    options:{width:1000,height:820,budget:18000,timeout:32000},
    check:dom=>/id="probeResult">PASS /.test(dom)&&/"stage":"PREVIEW"/.test(dom)&&/"frames":[2-9][0-9]/.test(dom)&&/"after":[1-9][0-9]+/.test(dom)
  },
  {
    name:'FOLD BLOOM LISTEN intake activation',
    route:'/__smoke/listen-intake',
    options:{width:1000,height:820,budget:12000,timeout:18000},
    check:dom=>/id="probeResult">PASS /.test(dom)&&/"boot":"ready"/.test(dom)&&/"hidden":false/.test(dom)&&/"for":"file"/.test(dom)&&/"activated":1/.test(dom)
  },
  {
    name:'FOLD BLOOM LISTEN source adapter',
    route:'/__smoke/listen-source',
    options:{width:1000,height:820,budget:10000,timeout:16000},
    check:dom=>/id="probeResult">PASS /.test(dom)&&/"direct":"REMOTE_AUDIO"/.test(dom)&&/"limit":100663296/.test(dom)
  },
  {
    name:'SCALE LENS',
    route:'/fold-bloom/lens/',
    check:dom=>/SCALE LENS/i.test(dom)&&!dom.includes('load failure')
  },
  {
    name:'DAYLINE CONFLUENCE 0.1',
    route:'/dayline/',
    options:{width:430,height:900,budget:7000,timeout:14000},
    check:dom=>/DAYLINE \/\/ CONFLUENCE/i.test(dom)&&dom.includes('data-dayline-workfield="ready"')&&dom.includes('id="moves"')&&dom.includes('id="witnessInput"')&&dom.includes('id="returnBtn"')
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
    route:'/__smoke/poem-map',
    options:{width:980,height:760,budget:9000},
    check:dom=>/id="probeResult">PASS /.test(dom)&&/"fieldLoaded":true/.test(dom)&&/"mode":"PAGE"/.test(dom)&&/"controls":true/.test(dom)
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
    name:'CONFLUENCE ONE INSTRUMENT',
    route:'/spikes/003-one-instrument/?proof=1',
    options:{width:1180,height:900,budget:7000,timeout:14000},
    check:dom=>textAtId(dom,'proofState')==='PASS 12/12'&&dom.includes('data-proof="pass"')&&/CONTENT · AUTHORITY · DEPTH · TIME/.test(dom)
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
      return /CONFLUENCE/i.test(dom)&&/COORDINATION SURFACE/i.test(dom)&&dom.includes('<span>CANONICAL</span><b>ONE RETURN v2</b>')&&/ASCII RECON/.test(dom)&&/GRID PATH V4/.test(dom)&&/TRANSFER REGISTRY/i.test(dom)&&/IMPLEMENTED|PROOF_REQUIRED|PROPOSED/.test(tx)&&!/loading|unavailable/i.test(tx);
    }
  },
  {
    name:'ONE RETURN ← GRID PATH receipt seam',
    route:'/__smoke/one-return-grid-receipt',
    options:{width:1180,height:900,budget:9000,timeout:16000},
    check:dom=>/id="probeResult">PASS /.test(dom)&&/"pathId":"path:test:abcd"/.test(dom)&&/"sourceFingerprint":"src:nine:test"/.test(dom)&&/"gates":9/.test(dom)
  },
  {
    name:'ONE RETURN / NINE GATE',
    route:'/sleeper/one-return/',
    options:{width:1180,height:900,budget:5000},
    check:dom=>/ONE RETURN/i.test(dom)&&/NINE GATE/i.test(dom)&&dom.includes('id="city"')&&dom.includes('data-view="disc"')&&dom.includes('data-view="trace"')&&/previous RETURN ghost/i.test(dom)
  },
  {
    name:'SLEEPER RECOVERY',
    route:'/recovery/sleeper/',
    check:dom=>/Sleeper recovery/i.test(dom)&&/Exact source now recovered/i.test(dom)&&/Painting \/ Path/i.test(dom)
  }
];

await new Promise((resolve,reject)=>server.listen(PORT,HOST,e=>e?reject(e):resolve()));
const smokeOnly=String(process.env.SMOKE_ONLY||'').trim();
const RUN_CASES=smokeOnly?CASES.filter(c=>c.name===smokeOnly):CASES;
if(smokeOnly&&!RUN_CASES.length)throw new Error('unknown SMOKE_ONLY '+smokeOnly);
let fail=[];
try{
  const bin=browserBin();
  console.log('BROWSER SMOKE:',bin);
  for(const c of RUN_CASES){
    let r;
    try{r=await runChrome(bin,c.route,c.options||{})}
    catch(e){console.log('FAIL',c.name,c.route);console.log('SMOKE TIMEOUT',c.name,String(e?.message||e));fail.push(c.name+' '+c.route+' '+String(e?.message||e));continue}
    const fatal=/Uncaught (?:TypeError|ReferenceError|SyntaxError)|net::ERR_|Aw, Snap/i.test(r.err);
    const ok=r.code===0&&!fatal&&c.check(r.out);
    console.log((ok?'PASS':'FAIL'),c.name,c.route);
    if(c.name==='LENS focused real-use observation')console.log('LENS REAL USE',textAtId(r.out,'probeResult'));
    if(!ok){
      const source=textAtId(r.out,'sourceState'),probe=textAtId(r.out,'probeResult');if(probe)console.log('SMOKE PROBE',c.name,probe.slice(0,1800));
      const body=visibleText(r.out).slice(0,900);if(body)console.log('SMOKE BODY',c.name,body);
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
console.log('BROWSER SMOKE PASS · cases:',RUN_CASES.length);
