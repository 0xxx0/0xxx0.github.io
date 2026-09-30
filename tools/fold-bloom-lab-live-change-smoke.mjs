#!/usr/bin/env node
'use strict';

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';

const ROOT=process.cwd(),HOST='127.0.0.1';let PORT=0;
function browserBin(){
  for(const n of ['google-chrome-stable','google-chrome','chromium-browser','chromium']){
    const r=spawnSync('which',[n],{encoding:'utf8'});if(r.status===0&&r.stdout.trim())return r.stdout.trim();
  }
  for(const p of ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/Applications/Brave Browser.app/Contents/MacOS/Brave Browser','/Applications/Chromium.app/Contents/MacOS/Chromium','/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge']){
    if(spawnSync('test',['-x',p]).status===0)return p;
  }
  throw Error('No Chrome/Chromium for FIELD LAB live-change smoke');
}
function ct(p){if(p.endsWith('.html'))return'text/html; charset=utf-8';if(p.endsWith('.js')||p.endsWith('.mjs'))return'text/javascript; charset=utf-8';if(p.endsWith('.json'))return'application/json; charset=utf-8';if(p.endsWith('.css'))return'text/css; charset=utf-8';return'application/octet-stream'}
function resolveFile(url){let q=decodeURIComponent(String(url||'/').split('?')[0]).replace(/^\/+/, '');if(!q)q='index.html';if(q.endsWith('/'))q+='index.html';const p=path.normalize(path.join(ROOT,q));if(!p.startsWith(ROOT))return null;if(fs.existsSync(p)&&fs.statSync(p).isFile())return p;if(fs.existsSync(p+'.html'))return p+'.html';return null}

function probe(){return `<!doctype html><html><body><iframe id="f" style="width:430px;height:900px;border:0" src="/fold-bloom/lab/?mode=DATA"></iframe><pre id="probeResult">PENDING</pre><script>
const f=document.getElementById('f'),o=document.getElementById('probeResult'),rec={};let finished=false;
const done=(ok,x)=>{if(finished)return;finished=true;o.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(x)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const wait=async(fn,limit=10000,label='condition')=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(50)}throw Error('timeout '+label)};
(async()=>{try{
  const W=()=>f.contentWindow,D=()=>W().document;
  await wait(()=>D().documentElement.dataset.foldBloomFieldLab==='ready'&&W().FoldBloomFieldLab?.liveChange,12000,'LAB ready');
  const emit=detail=>W().dispatchEvent(new (W().CustomEvent)('field-pulse-local',{detail}));
  const native=(seq,targetType,call,forecasts)=>({schema:'FOLD_BLOOM_FORECAST_CONTEXT_0.1',authority:'NATIVE_EVIDENCE',seq,rotation:0,gate:0,targetType,anchors:[null,null,null],creases:[],charge:.2,call,mode:'RATCHET',forecasts});
  const nativeA=native(6,0,{verb:'FOLD',chain:2,candidates:1},[{slot:2,type:0,typeName:'EMBER',verb:'FOLD',cadence:null,chain:2,span:2,power:1.3,path:[2],edgeAdded:[0,2]},{slot:5,type:0,typeName:'EMBER',verb:'RETURN',cadence:null,chain:1,span:0,power:.9,path:[5],edgeAdded:null}]);
  const nativeB=native(12,1,{verb:'RETURN',chain:1,candidates:1},[{slot:3,type:1,typeName:'WATER',verb:'BLOOM',cadence:null,chain:1,span:0,power:1,path:[3],edgeAdded:null}]);
  const op=(seq,verb,nativeForecast=null)=>({schema:'field-pulse/v0.1',source:'FOLD_BLOOM_LIVE',instance:'probe-live-instance-123456',kind:'operation',seq,wall:1000+seq,data:{operation:verb,slot:seq%12,chain:1,charge:.2,trackTime:seq*.5,...(nativeForecast?{nativeForecast}:{})}});
  const a=['BLOOM','FOLD','SPLIT','RETURN','BLOOM','FOLD'];
  const b=['FOLD','BLOOM','RETURN','SPLIT','FOLD','BLOOM'];
  a.forEach((verb,i)=>emit(op(i+1,verb,i===5?nativeA:null)));
  await wait(()=>D().documentElement.dataset.fieldLabLiveChange==='window-ready',3000,'first live window');
  rec.windowA=D().getElementById('liveChangeWindow').textContent;
  D().getElementById('liveCaptureFrom').click();
  await wait(()=>D().getElementById('liveFromRead').textContent.includes('ATTACHED'),2000,'FROM capture');
  emit({schema:'field-pulse/v0.1',source:'MODEL_RESEARCH',instance:'probe-model',kind:'steering',seq:20,wall:Date.now(),data:{authority:'NONE',direction_label:'FOLD',direction_ref:'dir://fold',request_id:'req-probe',strength:.75}});
  await wait(()=>D().documentElement.dataset.fieldLabLiveSupport==='unique-native-candidate',1500,'unique steering support');
  rec.supportA=D().getElementById('liveChangeSupport').textContent;
  rec.liveA=W().FoldBloomFieldLab.liveChange();
  W().dispatchEvent(new (W().Event)('resize'));await sleep(80);
  const cv=D().getElementById('field'),cr=cv.getBoundingClientRect(),cw=cr.width,ch=cr.height,rr=Math.max(96,Math.min(180,Math.min(cw,ch)*.43)),aa=-Math.PI/2+2*Math.PI*2/12;
  const haloX=cr.left+cw*.5+Math.cos(aa)*rr,haloY=cr.top+ch*.505+Math.sin(aa)*rr,haloHit=D().elementFromPoint(haloX,haloY);
  rec.haloHit=haloHit?.id||haloHit?.tagName||null;
  cv.dispatchEvent(new (W().PointerEvent)('pointerdown',{bubbles:true,pointerId:77,clientX:haloX,clientY:haloY,pointerType:'touch',isPrimary:true}));
  await wait(()=>D().getElementById('liveNativeFocus').textContent.includes('SLOT 2'),1500,'native halo slot focus');
  rec.focusA=D().getElementById('liveNativeFocus').textContent;
  rec.focusAddressA=D().getElementById('addressRead').textContent;
  b.forEach((verb,i)=>emit(op(i+7,verb,i===5?nativeB:null)));
  await wait(()=>D().getElementById('liveChangeWindow').textContent.includes('#7–12'),3000,'second live window');
  D().getElementById('liveCaptureTo').click();
  await wait(()=>D().documentElement.dataset.fieldLabLiveCompare==='residue-visible',2500,'comparison');
  await wait(()=>D().documentElement.dataset.fieldLabLiveSupport==='no-native-candidate',1500,'support follows native aperture');
  rec.supportB=D().getElementById('liveChangeSupport').textContent;
  rec.liveB=W().FoldBloomFieldLab.liveChange();
  rec.focusB=D().getElementById('liveNativeFocus').textContent;
  await wait(()=>D().getElementById('liveChangeSteering').textContent.includes('FOLD'),1500,'steering witness');
  emit({schema:'field-pulse/v0.1',source:'MODEL_RESEARCH',instance:'probe-model',kind:'steering',seq:21,wall:Date.now(),data:{authority:'EFFECT',direction_label:'RETURN',strength:1}});
  await sleep(80);
  const packet=W().FoldBloomFieldLab.returnPacket(),live=packet?.projection?.liveChange;
  rec.windowB=D().getElementById('liveChangeWindow').textContent;
  rec.from=D().getElementById('liveFromRead').textContent;
  rec.to=D().getElementById('liveToRead').textContent;
  rec.metrics=[D().getElementById('liveExactDelta').textContent,D().getElementById('liveHexDelta').textContent,D().getElementById('liveInvisible').textContent,D().getElementById('liveNativeNext').textContent];
  rec.residue=D().getElementById('liveChangeResidue').textContent;
  rec.native=D().getElementById('liveChangeNative').textContent;
  rec.steering=D().getElementById('liveChangeSteering').textContent;
  rec.support=D().getElementById('liveChangeSupport').textContent;
  rec.apertureMetric=[D().getElementById('liveApertureCount').textContent,D().getElementById('liveSupportCount').textContent];
  rec.state=[D().getElementById('stateFrom').value,D().getElementById('stateTo').value];
  rec.return={authority:live?.authority,from:live?.from_capture?.exact_form,to:live?.to_capture?.exact_form,comparison:live?.comparison,steering:live?.steering,steeringSupport:live?.steering_support,nativeFocus:packet?.projection?.nativeFocus};
  const pass=rec.windowA.includes('H[110|011]')&&rec.windowB.includes('H[110|011]')&&
    rec.metrics.join(',')==='6,0,6,DIFF'&&rec.residue.includes('INVISIBLE 6')&&rec.residue.includes('FIBER 64×')&&rec.residue.includes('CONTROL-SUFFICIENCY COUNTEREXAMPLE OBSERVED')&&
    rec.native.includes('SAME HEX ≠ SAME NEXT')&&rec.native.includes('FROM 2 CANDIDATES')&&rec.native.includes('TO 1 CANDIDATES')&&
    rec.steering.includes('FOLD')&&rec.steering.includes('AUTHORITY NONE')&&!rec.steering.includes('RETURN')&&
    rec.supportA.includes('C=1')&&rec.supportA.includes('UNIQUE_NATIVE_CANDIDATE')&&rec.supportB.includes('C=0')&&rec.supportB.includes('NO_NATIVE_CANDIDATE')&&rec.support===rec.supportB&&
    rec.liveA?.native_latest?.candidate_count===2&&rec.liveA?.steering_support?.native_candidate_count===1&&rec.liveA?.steering_support?.candidate_slots?.join(',')==='2'&&
    rec.haloHit==='field'&&rec.focusA.includes('SLOT 2')&&rec.focusA.includes('FOLD')&&rec.focusA.includes('MODEL-SUPPORTED')&&rec.focusA.includes('WITNESS ONLY')&&
    rec.focusAddressA==='field://lab/live/probe-live-instance-123456/seq/6/slot/2'&&
    rec.liveB?.native_latest?.candidate_count===1&&rec.liveB?.steering_support?.native_candidate_count===0&&rec.focusB.includes('SLOT 2')&&rec.focusB.includes('NO LAWFUL FORECAST')&&
    rec.apertureMetric.join(',')==='1/12,0'&&rec.windowA.includes('probe-li')&&
    rec.state.join(',')==='110|011,110|011'&&live?.authority==='WITNESS_ONLY'&&live?.comparison?.same_hex_endpoints===true&&
    live?.comparison?.quotient_invisible_exact_changes===6&&live?.comparison?.native_next?.same_hex_unequal_native===true&&
    live?.comparison?.native_next?.from?.candidate_count===2&&live?.comparison?.native_next?.to?.candidate_count===1&&
    live?.from_capture?.event_refs?.length===6&&live?.to_capture?.event_refs?.length===6&&
    live?.from_capture?.native_after?.authority==='NATIVE_EVIDENCE'&&live?.to_capture?.native_after?.authority==='NATIVE_EVIDENCE'&&
    live?.steering?.direction_label==='FOLD'&&live?.steering?.authority==='NONE'&&live?.steering_support?.status==='NO_NATIVE_CANDIDATE'&&live?.steering_support?.authority==='CALCULATION_ONLY'&&
    rec.return.nativeFocus?.authority==='VIEW_ONLY'&&rec.return.nativeFocus?.slot===2&&rec.return.nativeFocus?.available===false;
  done(pass,rec);
}catch(e){done(false,{...rec,error:String(e?.stack||e)})}})();
<\/script></body></html>`}

const server=http.createServer((req,res)=>{if(String(req.url||'').startsWith('/__probe')){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(probe());return}const p=resolveFile(req.url);if(!p){res.writeHead(404);res.end('not found');return}res.writeHead(200,{'content-type':ct(p),'cache-control':'no-store'});fs.createReadStream(p).pipe(res)});
function run(bin){return new Promise((resolve,reject)=>{const a=['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--window-size=460,980','--virtual-time-budget=9000','--dump-dom','http://'+HOST+':'+PORT+'/__probe'];const p=spawn(bin,a,{stdio:['ignore','pipe','pipe']});let out='',err='';const tm=setTimeout(()=>{p.kill('SIGKILL');reject(Error('timeout'))},22000);p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('error',e=>{clearTimeout(tm);reject(e)});p.on('close',code=>{clearTimeout(tm);resolve({code,out,err})})})}
await new Promise((resolve,reject)=>server.listen(PORT,HOST,e=>e?reject(e):resolve()));PORT=server.address().port;
try{
  const r=await run(browserBin()),m=r.out.match(/id="probeResult"[^>]*>([\s\S]*?)<\/pre>/i),result=(m?.[1]||'').replace(/&quot;/g,'"').replace(/&amp;/g,'&').trim(),fatal=/Uncaught (?:TypeError|ReferenceError|SyntaxError)|net::ERR_|Aw, Snap/i.test(r.err);
  if(r.code!==0||fatal||!result.startsWith('PASS ')){console.error('FIELD LAB LIVE CHANGE SMOKE FAIL',result||'(no result)');if(r.err.trim())console.error(r.err.slice(-2200));process.exitCode=1}
  else console.log('FIELD LAB LIVE CHANGE SMOKE PASS',result.slice(5));
}finally{await new Promise(r=>server.close(()=>r()))}
