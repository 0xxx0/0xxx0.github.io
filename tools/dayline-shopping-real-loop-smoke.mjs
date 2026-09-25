#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';

const ROOT=process.cwd(),HOST='127.0.0.1',PORT=41764;
function browserBin(){
  for(const name of ['google-chrome-stable','google-chrome','chromium-browser','chromium']){
    const r=spawnSync('which',[name],{encoding:'utf8'});if(r.status===0&&r.stdout.trim())return r.stdout.trim();
  }
  throw Error('No Chrome/Chromium');
}
function type(p){if(p.endsWith('.html'))return'text/html; charset=utf-8';if(p.endsWith('.js')||p.endsWith('.mjs'))return'text/javascript; charset=utf-8';if(p.endsWith('.json'))return'application/json; charset=utf-8';if(p.endsWith('.css'))return'text/css'; if(p.endsWith('.svg'))return'image/svg+xml';return'application/octet-stream'}
function fileFor(url){let clean=decodeURIComponent(String(url||'/').split('?')[0]).replace(/^\/+/, '');if(!clean)clean='index.html';if(clean.endsWith('/'))clean+='index.html';const p=path.normalize(path.join(ROOT,clean));if(!p.startsWith(ROOT))return null;if(fs.existsSync(p)&&fs.statSync(p).isFile())return p;return null}
function probe(){return `<!doctype html><html><body style="margin:0"><iframe id="f" style="width:430px;height:900px;border:0;display:block"></iframe><pre id="probeResult">PENDING</pre><script>
const f=document.getElementById('f'),out=document.getElementById('probeResult'),rec={};let finished=false;
const done=(ok,data)=>{if(finished)return;finished=true;out.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(data)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const wait=async(fn,limit=18000,label='condition')=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(70)}throw Error('wait timeout '+label)};
(async()=>{
  f.src='/shopping/';
  const W=()=>f.contentWindow,D=()=>W().document;
  await wait(()=>D().getElementById('example'),16000,'Shopping boot');
  D().getElementById('example').click();
  await wait(()=>D().getElementById('dayline'),4000,'Shopping example selected');
  let shop=JSON.parse(W().localStorage.getItem('field.shopping.v01'));let item=shop.items.find(x=>x.id==='example-power');
  rec.initial={id:item.id,state:item.state,receipts:(item.receipts||[]).length};
  D().getElementById('dayline').click();

  await wait(()=>W().location.pathname==='/dayline/'&&W().DaylineConfluence?.snapshot?.(),16000,'Dayline handoff');
  const add=await wait(()=>[...D().querySelectorAll('#moves button')].find(b=>/ADD TO DAY/.test(b.textContent)),5000,'ADD TO DAY');add.click();
  await wait(()=>W().DaylineConfluence.snapshot().tasks.some(t=>t.sourceLink?.source?.object_id==='example-power'),5000,'source-linked Shopping task');
  let snap=W().DaylineConfluence.snapshot(),task=snap.tasks.find(t=>t.sourceLink?.source?.object_id==='example-power');rec.sourceLink=task.sourceLink;

  const run=await wait(()=>[...D().querySelectorAll('#moves button')].find(b=>/RUN/.test(b.textContent)),5000,'RUN');run.click();
  D().getElementById('witnessInput').value='Verified exact output rating and seller evidence.';
  D().getElementById('witnessBtn').click();
  await wait(()=>W().DaylineConfluence.snapshot().evidence.return.some(x=>x.task===task.id),4000,'witness');
  const complete=await wait(()=>[...D().querySelectorAll('#moves button')].find(b=>/COMPLETE/.test(b.textContent)),4000,'COMPLETE');complete.click();
  await wait(()=>W().DaylineConfluence.snapshot().tasks.find(t=>t.id===task.id)?.status==='done',4000,'done');
  try{Object.defineProperty(W().navigator,'clipboard',{configurable:true,value:{writeText:async()=>{}}})}catch(_){}
  D().getElementById('returnBtn').click();
  const offer=await wait(()=>W().DaylineConfluence.sourceReturn?.(),5000,'source return');
  rec.offer={authority:offer.authority,native_effect:offer.native_effect,proposed_native_state:offer.proposed_native_state,source:offer.source,task:offer.task,witness:offer.witness};
  const back=await wait(()=>{const a=D().getElementById('returnSourceBtn');return a&&!a.hidden?a:null},4000,'RETURN TO SOURCE');back.click();

  await wait(()=>W().location.pathname==='/shopping/'&&D().getElementById('daylineReturnOffer'),16000,'Shopping returned offer');
  rec.returnHash=W().location.hash;
  const accept=await wait(()=>D().getElementById('daylineReceiptAccept'),4000,'ACCEPT RECEIPT');accept.click();
  await sleep(150);
  shop=JSON.parse(W().localStorage.getItem('field.shopping.v01'));item=shop.items.find(x=>x.id==='example-power');
  const receipts=item.receipts||[],last=receipts.at(-1)||{};
  rec.final={state:item.state,receipts:receipts.length,last};
  rec.offerConsumed=!W().sessionStorage.getItem('atlas.dayline.source-return.v01');
  rec.overflow=Math.max(D().documentElement.scrollWidth,D().body.scrollWidth)-D().documentElement.clientWidth;
  const ok=rec.initial.state==='WATCH'&&
    rec.offer.authority==='OFFER_ONLY'&&rec.offer.native_effect==='RECEIPT_ONLY'&&rec.offer.proposed_native_state==='UNCHANGED'&&
    rec.offer.source?.route==='/shopping/'&&rec.offer.source?.object_id==='example-power'&&rec.offer.source?.state==='WATCH'&&
    rec.offer.task?.status==='done'&&rec.final.state==='WATCH'&&rec.final.receipts===1&&
    last.effect==='EVIDENCE_ONLY'&&last.shopping_state==='WATCH'&&rec.offerConsumed&&rec.returnHash==='#example-power'&&rec.overflow<=1;
  done(ok,rec);
})().catch(e=>done(false,{error:String(e?.stack||e),href:f.contentWindow?.location?.href||null,...rec}));
<\/script></body></html>`}
const server=http.createServer((req,res)=>{
  if(String(req.url).startsWith('/__dayline_shopping_real_loop')){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(probe());return}
  const file=fileFor(req.url);if(!file){res.writeHead(404);res.end('not found');return}
  res.writeHead(200,{'content-type':type(file),'cache-control':'no-store'});fs.createReadStream(file).pipe(res);
});
await new Promise(r=>server.listen(PORT,HOST,r));
const bin=browserBin(),args=['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--hide-scrollbars','--window-size=520,940','--virtual-time-budget=32000','--dump-dom','http://'+HOST+':'+PORT+'/__dayline_shopping_real_loop'];
const result=await new Promise((resolve,reject)=>{const p=spawn(bin,args,{stdio:['ignore','pipe','pipe']});let out='',err='';const timer=setTimeout(()=>{p.kill('SIGKILL');reject(Error('timeout'))},44000);p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('close',code=>{clearTimeout(timer);resolve({code,out,err})})});
server.close();
const m=result.out.match(/id="probeResult">(?:PASS|FAIL) ([^<]+)/),payload=m?.[1]||'';
const pass=/id="probeResult">PASS /.test(result.out)&&/"native_effect":"RECEIPT_ONLY"/.test(payload)&&/"state":"WATCH"/.test(payload)&&/"receipts":1/.test(payload)&&/"offerConsumed":true/.test(payload);
if(!pass){console.error('DAYLINE ↔ SHOPPING REAL-SOURCE LOOP FAIL');console.error(result.out.slice(-12000));console.error(result.err.slice(-1800));process.exit(1)}
console.log('DAYLINE ↔ SHOPPING REAL-SOURCE LOOP PASS');console.log(payload);
