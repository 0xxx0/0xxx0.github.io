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
      const apLens=d?.getElementById('apLens'),apProof=d?.getElementById('apProof');
      const proof=d?.getElementById('lens-proof-bench'),proofOpen=!!proof?.classList.contains('on');
      const ready=w?.FieldLensHost?.uiState?.();
      if(!apLens||!apProof||!w?.LensFocusRing||!w?.FieldLensHost||ready?.focusHref!=='/fold-bloom/lens/'){
        if(tries<40){setTimeout(()=>boot(tries+1),100);return}
        done(false,{stage:'boot',tries,apLens:!!apLens,apProof:!!apProof,proofOpen,ring:!!w?.LensFocusRing,host:!!w?.FieldLensHost,focusHref:ready?.focusHref||null});return
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

function fieldActivationProbeHtml(){
  return `<!doctype html><html><body style="margin:0"><iframe id="f" style="width:980px;height:760px;border:0;display:block" src="/"></iframe><pre id="probeResult">PENDING</pre><script>
  const result=document.getElementById('probeResult'),f=document.getElementById('f'),rec={};let finished=false;
  const done=(ok,data)=>{if(finished)return;finished=true;result.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(data)};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const waitFor=async(fn,limit=12000)=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(100)}throw new Error('waitFor timeout')};
  (async()=>{
    const W=()=>f.contentWindow,D=()=>W().document;
    await waitFor(()=>W().FieldLensHost?.focus?.()?.href);
    W().FieldLensHost.project('STRUCTURE');
    const row=await waitFor(()=>D().querySelector('.mapRow[data-href]')),href=row.dataset.href;rec.href=href;
    row.click();await waitFor(()=>W().FieldLensHost?.focus?.()?.href===href&&W().location.pathname==='/');
    rec.focused=W().FieldLensHost.focus().href;rec.focusUrl=W().location.search;
    const same=await waitFor(()=>D().querySelector('.mapRow[data-href="'+href+'"]'));same.click();
    await waitFor(()=>W().location.pathname===href);rec.opened=W().location.pathname;
    W().history.back();
    await waitFor(()=>W().location.pathname==='/'&&W().FieldLensHost?.focus?.()?.href===href);
    rec.returned=W().FieldLensHost.focus().href;rec.returnUrl=W().location.search;
    done(rec.focused===href&&rec.opened===href&&rec.returned===href&&/focus=/.test(rec.returnUrl),rec);
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
    await waitFor(()=>D().getElementById('apLens')&&W().FieldLensHost&&W().FieldLensAPI&&W().LensFocusRing&&W().FieldLensHost.focus?.()?.href==='/fold-bloom/lens/');
    rec.startHref=W().FieldLensHost.focus()?.href||null;rec.start=compact(W().FieldLensHost.uiState());
    D().getElementById('apLens').click();
    const sh=await waitFor(()=>D().getElementById('lens-focus-ring')?.shadowRoot);await waitFor(()=>sh.querySelector('.panel')?.classList.contains('on'));
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
  return `<!doctype html><html><body style="margin:0"><iframe id="f" style="width:980px;height:760px;border:0;display:block" src="/docs/"></iframe><pre id="probeResult">PENDING</pre><script>
  const f=document.getElementById('f'),result=document.getElementById('probeResult'),rec={};let finished=false;
  const done=(ok,data)=>{if(finished)return;finished=true;result.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(data)};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const waitFor=async(fn,limit=12000)=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(80)}throw new Error('waitFor timeout')};
  (async()=>{
    const W=()=>f.contentWindow,D=()=>W().document;
    const A=await waitFor(()=>D().getElementById('docAperture')?.snapshot?.()&&D().getElementById('docAperture'));
    const sample='# Alpha\\nThe first paragraph establishes context.\\n\\n# Beta\\nRead this second phrase and keep position. [CURRENT](/control/CURRENT.json) ![map](/field-map.svg)';
    const pt=D().getElementById('pasteText'),pb=D().getElementById('readPaste');pt.value=sample;pb.click();
    await waitFor(()=>A.A?.label==='PASTE'&&A.A?.kind==='TEXT'&&W().location.search.includes('paste=1'));
    const target=sample.indexOf('second');A.restore({scale:'WORD',char_index:target,wpm:1200});
    rec.word=await waitFor(()=>{const x=A.snapshot();return x.scale==='WORD'&&x.wpm===1200?x:null});
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
    rec.session=!!W().sessionStorage.getItem('docs.reader.paste.v1');
    const same=[rec.sent,rec.para,rec.section].every(x=>x.char_index===rec.word.char_index&&Math.abs(x.source_progress-rec.word.source_progress)<1e-9);
    const spans=[rec.sent,rec.para,rec.section].every(x=>x.span&&x.span.start<=x.char_index&&x.char_index<=x.span.end);
    const checks={same,spans,structure:rec.structure.length===2,xrefs:rec.xrefs.length>=2,session:rec.session,orp:!!rec.orp,wordMark:rec.wordMark.toLowerCase().includes('second'),urlChar:/ap_char=/.test(rec.url),current:/CURRENT/.test(rec.xrefs.join(' ')),media:/MEDIA/.test(rec.xrefs.join(' '))};
    const ok=Object.values(checks).every(Boolean);
    done(!!ok,{checks,structure:rec.structure,xrefs:rec.xrefs,wordMark:rec.wordMark,orp:rec.orp,url:rec.url,chars:[rec.word.char_index,rec.sent.char_index,rec.para.char_index,rec.section.char_index],progress:[rec.word.source_progress,rec.sent.source_progress,rec.para.source_progress,rec.section.source_progress],session:rec.session});
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

function genericLensReturnProbeHtml(){
  return `<!doctype html><html><body style="margin:0"><iframe id="f" style="width:390px;height:844px;border:0;display:block" src="/fold-bloom/"></iframe><pre id="probeResult">PENDING</pre><script>
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

const server=http.createServer((req,res)=>{
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
  if(String(req.url||'').startsWith('/__smoke/lens-proof')){
    res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
    res.end(lensProbeHtml());return;
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
    check:dom=>dom.includes('id="axialLatest"')&&dom.includes('AXIAL / LATEST')&&/NOW/.test(dom)&&/POLISHED ONE RETURN v2/.test(dom)&&/CONFLUENCE/.test(dom)
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
    name:'AXIAL continuity + RETURN replay',
    route:'/__smoke/axial-continuity',
    options:{width:1180,height:880,budget:18000,timeout:24000},
    check:dom=>/id="probeResult">PASS /.test(dom)&&/"backSame":true/.test(dom)&&/"replaySame":true/.test(dom)&&/"restoreButton":true/.test(dom)
  },
  {
    name:'APERTURE',
    route:'/foundry/aperture/',
    check:dom=>/APERTURE/i.test(dom)&&dom.includes('field-aperture')&&dom.includes('60–3000 WPM')
  },
  {
    name:'APERTURE multilingual segmentation',
    route:'/__smoke/aperture-multilingual',
    options:{width:900,height:700,budget:9000},
    check:dom=>/id="probeResult">PASS /.test(dom)&&/"zh"/.test(dom)&&/"ta"/.test(dom)&&/"ja"/.test(dom)&&/"ar"/.test(dom)&&/"th"/.test(dom)&&/"count":3/.test(dom)
  },
  {
    name:'READFIELD over APERTURE',
    route:'/foundry/readfield/',
    options:{width:430,height:900,budget:7000},
    check:dom=>/READFIELD/i.test(dom)&&/RF\\/02/i.test(dom)&&dom.includes('id=\"ap\"')&&dom.includes('id=\"lineMap\"')&&dom.includes('id=\"discMap\"')&&dom.includes('HOLD CONTEXT')&&dom.includes('field-aperture.js')&&!dom.includes('load failure')
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
    name:'DOCS Aperture addressed resume',
    route:'/__smoke/docs-aperture',
    options:{width:1040,height:820,budget:12000,timeout:18000},
    check:dom=>/id="probeResult">PASS /.test(dom)&&/"scale":"LEAF"/.test(dom)&&/"wpm":650/.test(dom)&&/"copyView":true/.test(dom)&&/"throttled":true/.test(dom)&&/"ended":true/.test(dom)
  },
  {
    name:'DOCS RSVP focus kernel',
    route:'/__smoke/reader-focus',
    options:{width:1040,height:820,budget:14000,timeout:20000},
    check:dom=>/id="probeResult">PASS /.test(dom)&&/"same":true/.test(dom)&&/"spans":true/.test(dom)&&/"structure":\["Alpha","Beta"\]/.test(dom)&&/"session":true/.test(dom)
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
    name:'FIELD activation + re-entry',
    route:'/__smoke/field-activation',
    options:{width:1040,height:820,budget:18000,timeout:24000},
    check:dom=>/id="probeResult">PASS /.test(dom)&&/"focused":"\//.test(dom)&&/"opened":"\//.test(dom)&&/"returned":"\//.test(dom)
  },
  {
    name:'LENS STACK STUDIO RETURN',
    route:'/__smoke/lens-studio',
    options:{width:1280,height:900,budget:22000,timeout:28000},
    check:dom=>/id="probeResult">PASS /.test(dom)&&/"field-foveate"/.test(dom)&&/"studioObject":"\/fold-bloom\/lens\/"/.test(dom)&&/"endHref":"\/fold-bloom\/lens\/"/.test(dom)
  },
  {
    name:'GENERIC LENS RETURN ≠ BACK',
    route:'/__smoke/generic-lens-return',
    options:{width:430,height:900,budget:9000,timeout:16000},
    check:dom=>/id="probeResult">PASS /.test(dom)&&/"before":"\/fold-bloom\/"/.test(dom)&&/"after":"\/fold-bloom\/"/.test(dom)&&/"closed":true/.test(dom)&&/"copy":true/.test(dom)&&/"deadStack":false/.test(dom)&&/"overflow":0/.test(dom)&&/"triggerGlyph":"◎"/.test(dom)
  },
  {
    name:'FOLD BLOOM convergence',
    route:'/fold-bloom/',
    check:dom=>/FOLD ?\/\/ ?BLOOM/i.test(dom)&&/FOLD WEAVE 0\.1/i.test(dom)&&/EXTRACTED DESCENDANT · SCALE LENS/i.test(dom)&&/TWO DIAL 0\.10/i.test(dom)&&/href="\.\/ecology\/"/i.test(dom)
  },
  {
    name:'FOLD BLOOM LIVE demo',
    route:'/fold-bloom/live/',
    check:dom=>/LIVE 0\.1/i.test(dom)&&dom.includes('id="demoBtn"')&&/WATCH DEMO/i.test(dom)
  },
  {
    name:'TWO DIAL sound field 0.10',
    route:'/fold-bloom/two-dial/',
    options:{width:1180,height:900,budget:9000},
    check:dom=>/HOLD FAST \/ LET FLY/i.test(dom)&&/SCALE OF CONSEQUENCE/i.test(dom)&&dom.includes('data-voice="FM"')&&dom.includes('data-groove="POLY"')&&dom.includes('data-world="TRANCE"')
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
      return /CONFLUENCE/i.test(dom)&&/COORDINATION SURFACE/i.test(dom)&&/POLISHED ONE RETURN v2/.test(dom)&&/ASCII RECON/.test(dom)&&/GRID PATH V4/.test(dom)&&/TRANSFER REGISTRY/i.test(dom)&&/IMPLEMENTED|PROOF_REQUIRED|PROPOSED/.test(tx)&&!/loading|unavailable/i.test(tx);
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
