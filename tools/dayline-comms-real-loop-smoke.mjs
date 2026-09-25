#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';

const ROOT=process.cwd(),HOST='127.0.0.1',PORT=41763;
const USER_SOURCE='User: Run the real COMMS OPEN signal → Dayline → act and witness → RETURN TO SOURCE loop, then report whether PR #296 is ready to merge.';
const WITNESS='BROWSER OBSERVED: exact COMMS source SHA + signal/message/range survived into Dayline and RUN was enacted before RETURN.';

function browserBin(){
  for(const name of ['google-chrome-stable','google-chrome','chromium-browser','chromium']){
    const r=spawnSync('which',[name],{encoding:'utf8'});
    if(r.status===0&&r.stdout.trim())return r.stdout.trim();
  }
  throw Error('No Chrome/Chromium');
}
function type(p){
  if(p.endsWith('.html'))return'text/html; charset=utf-8';
  if(p.endsWith('.js')||p.endsWith('.mjs'))return'text/javascript; charset=utf-8';
  if(p.endsWith('.json'))return'application/json; charset=utf-8';
  if(p.endsWith('.css'))return'text/css; charset=utf-8';
  if(p.endsWith('.svg'))return'image/svg+xml';
  return'application/octet-stream';
}
function fileFor(url){
  let clean=decodeURIComponent(String(url||'/').split('?')[0]).replace(/^\/+/, '');
  if(!clean)clean='index.html';
  if(clean.endsWith('/'))clean+='index.html';
  const p=path.normalize(path.join(ROOT,clean));
  if(!p.startsWith(ROOT))return null;
  if(fs.existsSync(p)&&fs.statSync(p).isFile())return p;
  return null;
}
function probe(){
  return `<!doctype html><html><body style="margin:0"><iframe id="f" style="width:430px;height:900px;border:0;display:block"></iframe><pre id="probeResult">PENDING</pre><script>
  const USER_SOURCE=${JSON.stringify(USER_SOURCE)},WITNESS=${JSON.stringify(WITNESS)};
  const f=document.getElementById('f'),out=document.getElementById('probeResult'),rec={};let finished=false;
  const done=(ok,data)=>{if(finished)return;finished=true;out.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(data)};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const wait=async(fn,limit=18000,label='condition')=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(70)}throw Error('wait timeout '+label)};
  (async()=>{
    f.src='/port/comms/';
    const W=()=>f.contentWindow,D=()=>W().document;
    await wait(()=>D().documentElement.dataset.commsSpine==='idle',16000,'COMMS idle');
    D().getElementById('sourceInput').value=USER_SOURCE;
    D().getElementById('titleInput').value='REAL LOOP · USER INSTRUCTION';
    D().getElementById('loadSource').click();
    await wait(()=>D().documentElement.dataset.commsSpine==='ready',16000,'COMMS ready');
    rec.sourceText=W().CommsSpine.state().doc?.source||'';
    rec.sourceId=W().CommsSpine.state().sourceId;
    const clause=await wait(()=>D().querySelector('.clause'),4000,'source clause');clause.click();
    D().querySelector('[data-mark="ASK"]').click();
    await sleep(120);
    const human=W().CommsSpine.state().signals.find(x=>x.origin==='HUMAN'&&x.kind==='ASK'&&x.state==='OPEN');
    if(!human)throw Error('real source did not produce HUMAN OPEN ASK');
    rec.signal={id:human.id,messageId:human.messageId,start:human.start,end:human.end,text:human.text,state:human.state};
    rec.exactSlice=rec.sourceText.slice(human.start,human.end);
    D().getElementById('daylineBtn').click();

    await wait(()=>W().location.pathname==='/dayline/'&&W().DaylineConfluence?.snapshot?.(),16000,'Dayline handoff');
    rec.daylinePath=W().location.pathname;
    const add=await wait(()=>[...D().querySelectorAll('#moves button')].find(b=>/ADD TO DAY/.test(b.textContent)),5000,'ADD TO DAY');
    add.click();
    await wait(()=>W().DaylineConfluence.snapshot().tasks.some(t=>t.sourceLink?.source?.signal_id===human.id),5000,'source-linked task');
    let snap=W().DaylineConfluence.snapshot(),task=snap.tasks.find(t=>t.sourceLink?.source?.signal_id===human.id);
    rec.sourceLink={object_id:task?.sourceLink?.source?.object_id,signal_id:task?.sourceLink?.source?.signal_id,address:task?.sourceLink?.source?.address,return_to:task?.sourceLink?.return_to};
    const run=await wait(()=>[...D().querySelectorAll('#moves button')].find(b=>/RUN/.test(b.textContent)),5000,'RUN');
    run.click();
    await wait(()=>W().DaylineConfluence.snapshot().state.route.includes(task.id),4000,'RUN enacted');
    rec.ran=true;
    D().getElementById('witnessInput').value=WITNESS;
    D().getElementById('witnessBtn').click();
    await wait(()=>W().DaylineConfluence.snapshot().evidence.return.some(x=>x.task===task.id&&x.note===WITNESS),4000,'witness recorded');
    rec.witness=true;
    try{Object.defineProperty(W().navigator,'clipboard',{configurable:true,value:{writeText:async()=>{}}})}catch(_){}
    D().getElementById('returnBtn').click();
    const offer=await wait(()=>W().DaylineConfluence.sourceReturn?.(),5000,'source return offer');
    rec.offer={schema:offer.schema,authority:offer.authority,source:offer.source,task:offer.task,witness:offer.witness,proposed_native_state:offer.proposed_native_state};
    const back=await wait(()=>{const a=D().getElementById('returnSourceBtn');return a&&!a.hidden?a:null},4000,'RETURN TO SOURCE');
    back.click();

    await wait(()=>W().location.pathname==='/port/comms/'&&D().documentElement.dataset.commsSpine==='ready',16000,'COMMS returned');
    rec.returnPath=W().location.pathname;
    await wait(()=>{const x=D().getElementById('daylineReturnOffer');return x&&!x.hidden?x:null},5000,'native return offer');
    rec.offerMeta=D().getElementById('daylineReturnMeta').textContent;
    const pre=W().CommsSpine.state().signals.find(x=>x.id===human.id);rec.beforeAccept=pre?.state||null;
    D().getElementById('daylineCover').click();
    await wait(()=>W().CommsSpine.state().signals.find(x=>x.id===human.id)?.state==='COVERED',4000,'native COVERED');
    const post=W().CommsSpine.state().signals.find(x=>x.id===human.id);rec.afterAccept=post?.state||null;
    rec.offerConsumed=D().getElementById('daylineReturnOffer').hidden===true;
    rec.finalSourceId=W().CommsSpine.state().sourceId;
    rec.overflow=Math.max(D().documentElement.scrollWidth,D().body.scrollWidth)-D().documentElement.clientWidth;

    const a=rec.signal,b=rec.sourceLink.address||{},o=rec.offer.source||{};
    const exact=
      rec.sourceText===USER_SOURCE &&
      rec.exactSlice===human.text &&
      /^sha256:/.test(rec.sourceId) &&
      rec.finalSourceId===rec.sourceId &&
      rec.sourceLink.object_id===rec.sourceId &&
      rec.sourceLink.signal_id===a.id &&
      b.message_id===a.messageId&&b.start===a.start&&b.end===a.end &&
      o.object_id===rec.sourceId&&o.signal_id===a.id&&o.address?.message_id===a.messageId&&o.address?.start===a.start&&o.address?.end===a.end;
    const ok=exact&&rec.ran&&rec.witness&&rec.offer.schema==='atlas-dayline-source-return/v0.1'&&rec.offer.authority==='OFFER_ONLY'&&rec.offer.task?.status==='open'&&rec.offer.proposed_native_state==='OPEN'&&rec.beforeAccept==='OPEN'&&rec.afterAccept==='COVERED'&&rec.offerConsumed&&rec.overflow<=1;
    done(ok,{...rec,exact});
  })().catch(e=>done(false,{error:String(e?.stack||e),href:f.contentWindow?.location?.href||null,...rec}));
  <\/script></body></html>`;
}
const server=http.createServer((req,res)=>{
  if(String(req.url).startsWith('/__dayline_comms_real_loop')){
    res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(probe());return;
  }
  const file=fileFor(req.url);if(!file){res.writeHead(404);res.end('not found');return}
  res.writeHead(200,{'content-type':type(file),'cache-control':'no-store'});fs.createReadStream(file).pipe(res);
});
await new Promise(r=>server.listen(PORT,HOST,r));
const bin=browserBin(),args=['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--hide-scrollbars','--window-size=520,940','--virtual-time-budget=32000','--dump-dom','http://'+HOST+':'+PORT+'/__dayline_comms_real_loop'];
const result=await new Promise((resolve,reject)=>{
  const p=spawn(bin,args,{stdio:['ignore','pipe','pipe']});let out='',err='';
  const timer=setTimeout(()=>{p.kill('SIGKILL');reject(Error('timeout'))},44000);
  p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);
  p.on('close',code=>{clearTimeout(timer);resolve({code,out,err})});
});
server.close();
const m=result.out.match(/id="probeResult">(?:PASS|FAIL) ([^<]+)/),payload=m?.[1]||'';
const pass=/id="probeResult">PASS /.test(result.out)&&/"afterAccept":"COVERED"/.test(payload)&&/"authority":"OFFER_ONLY"/.test(payload)&&/"exact":true/.test(payload);
if(!pass){
  console.error('DAYLINE ↔ COMMS REAL-SOURCE LOOP FAIL');
  console.error(result.out.slice(-12000));console.error(result.err.slice(-1800));process.exit(1);
}
console.log('DAYLINE ↔ COMMS REAL-SOURCE LOOP PASS');
console.log(payload);
