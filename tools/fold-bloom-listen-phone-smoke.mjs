#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';

const ROOT=process.cwd(),HOST='127.0.0.1',PORT=41743;
function browserBin(){for(const name of ['google-chrome-stable','google-chrome','chromium-browser','chromium']){const r=spawnSync('which',[name],{encoding:'utf8'});if(r.status===0&&r.stdout.trim())return r.stdout.trim()}throw Error('No Chrome/Chromium')}
function type(p){if(p.endsWith('.html'))return'text/html; charset=utf-8';if(p.endsWith('.js')||p.endsWith('.mjs'))return'text/javascript; charset=utf-8';if(p.endsWith('.json'))return'application/json; charset=utf-8';if(p.endsWith('.css'))return'text/css; charset=utf-8';if(p.endsWith('.mp3'))return'audio/mpeg';return'application/octet-stream'}
function fileFor(url){let clean=decodeURIComponent(String(url||'/').split('?')[0]).replace(/^\/+/, '');if(!clean)clean='index.html';if(clean.endsWith('/'))clean+='index.html';const p=path.normalize(path.join(ROOT,clean));if(!p.startsWith(ROOT))return null;if(fs.existsSync(p)&&fs.statSync(p).isFile())return p;return null}

function probe(){return `<!doctype html><html><body><img id="hold" src="/__hold" hidden><iframe id="f" style="width:430px;height:900px;border:0"></iframe><pre id="probeResult">PENDING</pre><script type="module">
const out=document.getElementById('probeResult'),f=document.getElementById('f'),hold=document.getElementById('hold'),rec={};let doneFlag=false;
const done=(ok,data)=>{if(doneFlag)return;doneFlag=true;out.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(data);hold.src='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const wait=async(fn,limit=24000)=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(80)}throw Error('wait timeout')};
const ptr=(el,type,x,y,id=19)=>el.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:id,pointerType:'touch',isPrimary:true,clientX:x,clientY:y,buttons:type==='pointerup'?0:1}));

try{
  f.src='/fold-bloom/listen/';
  await wait(()=>f.contentWindow?.FoldBloomListen?.boot==='ready');
  const d=f.contentWindow.document,input=d.getElementById('file'),fixture=await fetch('/fold-bloom/listen/test-fixtures/pulse-120bpm-2s.mp3'),blob=await fixture.blob(),file=new File([blob],'pulse-120bpm-2s.mp3',{type:'audio/mpeg'}),dt=new DataTransfer();dt.items.add(file);input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
  const first=await wait(()=>{const s=f.contentWindow.FoldBloomListen?.state?.();return s?.fileMeta?.hash&&s?.map?s:null},26000);
  rec.stage=first.stage;rec.hash=first.fileMeta.hash;rec.sourceTime0=first.time;rec.scope0=first.scope;
  const store=await import('/fold-bloom/local-media-store.js'),sourceId='sha256:'+rec.hash;
  await store.putLocalMedia({sourceId,blob,name:file.name,type:file.type,size:file.size,lastModified:0,meta:{origin:'PHONE_CONTINUITY_SMOKE',durationSeconds:2}});
  await wait(async()=>!!(await store.getLocalMedia(sourceId).catch(()=>null)),5000);
  rec.vaultStored=true;

  const ov=d.getElementById('overlay'),r=ov.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height*.53,rad=Math.min(r.width,r.height)*.28;
  ptr(ov,'pointerdown',cx+rad,cy);ptr(ov,'pointermove',cx,cy+rad);ptr(ov,'pointerup',cx,cy+rad);
  await sleep(120);
  const afterAddress=f.contentWindow.FoldBloomListen.state();rec.addressGesture=afterAddress.gesture;rec.sourceTime1=afterAddress.time;rec.addressMoved=Math.abs(rec.sourceTime1-rec.sourceTime0)>.03;

  const scopeBefore=afterAddress.scope;
  ptr(ov,'pointerdown',cx,cy,23);ptr(ov,'pointermove',cx,cy+64,23);ptr(ov,'pointerup',cx,cy+64,23);
  await sleep(120);
  const afterAperture=f.contentWindow.FoldBloomListen.state();rec.apertureGesture=afterAperture.gesture;rec.scopeBefore=scopeBefore;rec.scopeAfter=afterAperture.scope;rec.apertureChanged=scopeBefore!==rec.scopeAfter;

  f.contentWindow.FoldBloomListen.openPin();await sleep(80);
  d.getElementById('pinLabel').value='PHONE CONTINUITY';d.getElementById('pinNote').value='real MP3 smoke';d.getElementById('pinSave').click();
  await wait(()=>f.contentWindow.FoldBloomListen.state().pins.length===1);
  rec.pinSaved=true;rec.pinAddress=f.contentWindow.FoldBloomListen.state().pins[0].address;

  f.src='/fold-bloom/listen/?source='+encodeURIComponent(sourceId);
  await wait(()=>f.contentWindow?.document?.documentElement?.dataset?.localVaultSource==='ready',26000);
  const reloaded=await wait(()=>{const s=f.contentWindow?.FoldBloomListen?.state?.();return s?.fileMeta?.hash===rec.hash&&s?.pins?.length===1?s:null},16000);
  rec.pinPersisted=reloaded.pins.length===1;rec.reloadHash=reloaded.fileMeta.hash;

  f.src='/fold-bloom/live/?source='+encodeURIComponent(sourceId)+'&return='+encodeURIComponent('/fold-bloom/listen/');
  await wait(()=>f.contentWindow?.document?.documentElement?.dataset?.localVaultSource==='ready',26000);
  const live=await wait(()=>f.contentWindow?.FoldBloomLive?.state?.().sourceMeta?.hash===rec.hash?f.contentWindow.FoldBloomLive:null,16000);
  const ld=f.contentWindow.document,audio=ld.getElementById('trackAudio');audio.pause();audio.currentTime=.05;await sleep(220);
  let ls=live.state(),world=ls.trackfield;
  rec.liveHash=ls.sourceMeta.hash;rec.liveSource=ld.documentElement.dataset.trackfieldSource;rec.returnLink=!!ld.getElementById('vaultReturn');
  const grades=(world?.points||[]).map(x=>Number(x.grade)||0),speeds=(world?.points||[]).map(x=>Number(x.speed)||0);
  rec.gradeSpan=grades.length?Math.max(...grades)-Math.min(...grades):0;rec.speedSpan=speeds.length?Math.max(...speeds)-Math.min(...speeds):0;
  rec.terrainVaries=rec.gradeSpan>.08||rec.speedSpan>.04;
  const evidenceBefore={hash:ls.sourceMeta.hash,sourceHash:ls.linkedTrack?.sourceHash||null,duration:ls.linkedTrack?.duration||null,bpm:ls.linkedTrack?.bpm||null,stage:ls.linkedTrack?.stage||null};

  const engine=await import('/fold-bloom/live/engine.js');
  async function rotateTo(slot){
    const st=live.state(),want=engine.wrap(-slot,12);let delta=engine.wrap(want-st.rotation,12);if(delta>6)delta-=12;
    if(delta)live.step(Math.sign(delta),Math.abs(delta));
    await sleep(30);
  }
  let split=null;
  for(let round=0;round<16&&!split;round++){
    const st=live.state(),opts=engine.availableForecasts(st);
    const pick=opts.find(x=>x.verb==='SPLIT')||opts.find(x=>x.edgeAdded)||opts.find(x=>x.verb==='RETURN')||opts[0];
    if(!pick)break;
    await rotateTo(pick.slot);await live.release();await sleep(45);
    split=live.deformations().find(x=>x.verb==='SPLIT')||null;
  }
  rec.splitWritten=!!split;
  if(split){
    audio.pause();audio.currentTime=Math.max(0,Math.min(1.6,Number(split.start)-.16));await sleep(260);
    const opp=await wait(()=>live.ride().opportunity,3000).catch(()=>null);rec.splitOpportunity=!!opp;
    if(opp){live.step(-1,1);await sleep(160)}
  }
  rec.branchChoices=live.ride().branchChoices;rec.branchChosen=rec.branchChoices>0;

  const solid=ld.getElementById('solidTune');if(solid){solid.value='78';solid.dispatchEvent(new Event('input',{bubbles:true}));solid.dispatchEvent(new Event('change',{bubbles:true}))}
  await sleep(120);ls=live.state();
  const evidenceAfter={hash:ls.sourceMeta.hash,sourceHash:ls.linkedTrack?.sourceHash||null,duration:ls.linkedTrack?.duration||null,bpm:ls.linkedTrack?.bpm||null,stage:ls.linkedTrack?.stage||null};
  rec.evidenceStable=JSON.stringify(evidenceBefore)===JSON.stringify(evidenceAfter);

  const ok=['PREVIEW','DEEP'].includes(rec.stage)&&rec.addressGesture==='ADDRESS'&&rec.addressMoved&&rec.apertureGesture==='APERTURE'&&rec.apertureChanged&&rec.pinPersisted&&rec.reloadHash===rec.hash&&rec.liveHash===rec.hash&&rec.liveSource==='LOCAL_FILE'&&rec.returnLink&&rec.terrainVaries&&rec.splitWritten&&rec.branchChosen&&rec.evidenceStable;
  done(ok,rec);
}catch(error){done(false,{error:String(error?.stack||error),...rec})}
setTimeout(()=>done(false,{error:'probe timeout',...rec}),52000);
<\/script></body></html>`}

const holds=new Set();
const server=http.createServer((req,res)=>{
  if(String(req.url).startsWith('/__hold')){holds.add(res);req.on('close',()=>holds.delete(res));return}
  if(String(req.url).startsWith('/__phone_continuity')){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(probe());return}
  const file=fileFor(req.url);if(!file){res.writeHead(404);res.end('not found');return}res.writeHead(200,{'content-type':type(file),'cache-control':'no-store'});fs.createReadStream(file).pipe(res)
});
await new Promise(r=>server.listen(PORT,HOST,r));
const bin=browserBin(),args=['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--hide-scrollbars','--autoplay-policy=no-user-gesture-required','--window-size=520,940','--dump-dom',`http://${HOST}:${PORT}/__phone_continuity`];
const result=await new Promise((resolve,reject)=>{const p=spawn(bin,args,{stdio:['ignore','pipe','pipe']});let out='',err='';const timer=setTimeout(()=>{p.kill('SIGKILL');reject(Error('timeout'))},62000);p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('close',code=>{clearTimeout(timer);resolve({code,out,err})})});
for(const res of holds){try{res.destroy()}catch(_){}}server.close();
const pass=/id="probeResult">PASS /.test(result.out)&&/"addressGesture":"ADDRESS"/.test(result.out)&&/"apertureGesture":"APERTURE"/.test(result.out)&&/"pinPersisted":true/.test(result.out)&&/"liveSource":"LOCAL_FILE"/.test(result.out)&&/"splitWritten":true/.test(result.out)&&/"branchChosen":true/.test(result.out)&&/"evidenceStable":true/.test(result.out);
if(!pass){console.error('FOLD BLOOM LISTEN PHONE CONTINUITY SMOKE FAIL');console.error(result.out.slice(-9000));console.error(result.err.slice(-2200));process.exit(1)}
console.log('FOLD BLOOM LISTEN PHONE CONTINUITY SMOKE PASS');
