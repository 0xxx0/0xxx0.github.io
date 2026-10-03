#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';

const ROOT=process.cwd(),HOST='127.0.0.1',PORT=Number(process.env.AWAKE_SMOKE_PORT||43183);
function browserBin(){
  const want=String(process.env.SMOKE_BROWSER||'').trim();if(want&&fs.existsSync(want))return want;
  for(const name of ['google-chrome-stable','google-chrome','chromium-browser','chromium']){const r=spawnSync('which',[name],{encoding:'utf8'});if(r.status===0&&r.stdout.trim())return r.stdout.trim()}
  for(const p of ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/Applications/Brave Browser.app/Contents/MacOS/Brave Browser','/Applications/Chromium.app/Contents/MacOS/Chromium'])if(fs.existsSync(p))return p;
  throw Error('No Chrome/Chromium');
}
function type(p){if(p.endsWith('.html'))return'text/html; charset=utf-8';if(p.endsWith('.js')||p.endsWith('.mjs'))return'text/javascript; charset=utf-8';if(p.endsWith('.json'))return'application/json; charset=utf-8';if(p.endsWith('.css'))return'text/css; charset=utf-8';if(p.endsWith('.svg'))return'image/svg+xml';return'application/octet-stream'}
function fileFor(url){let clean=decodeURIComponent(String(url||'/').split('?')[0]).replace(/^\/+/, '');if(!clean)clean='index.html';if(clean.endsWith('/'))clean+='index.html';const p=path.normalize(path.join(ROOT,clean));if(!p.startsWith(ROOT))return null;if(fs.existsSync(p)&&fs.statSync(p).isFile())return p;return null}
function probe(){return `<!doctype html><html><body style="margin:0"><iframe id="f" style="width:430px;height:900px;border:0;display:block"></iframe><pre id="probeResult">PENDING</pre><script>
const f=document.getElementById('f'),out=document.getElementById('probeResult'),rec={};let doneFlag=false;
const done=(ok,data)=>{if(doneFlag)return;doneFlag=true;out.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(data)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const wait=async(fn,limit=20000,label='condition')=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(80)}throw Error('timeout '+label)};
(async()=>{
  f.src='/?visor=1';const W=()=>f.contentWindow,D=()=>W().document;
  await wait(()=>W().FieldAwakeVisor&&W().FieldLensHost&&D().querySelector('.feedChip[data-href]'),20000,'FIELD unheld + visor mounted');
  rec.unheld=!W().FieldLensHost.focus?.();
  const chosen=await wait(()=>D().querySelector('.feedChip[data-href="/fold-bloom/"]')||D().querySelector('.feedChip[data-href]'),5000,'CURRENT head chip');
  rec.chosen=chosen.dataset.href;chosen.click();
  await wait(()=>W().FieldLensHost.focus?.()?.href===rec.chosen&&W().FieldAwakeVisor?.state?.().open&&W().FieldIndexCarrier?.current?.()&&D().getElementById('runDock')&&!D().getElementById('runDock').hidden,20000,'HOLD + visor + run dock');
  const visor=D().getElementById('fieldAwakeVisor'),carrier=W().FieldIndexCarrier.current(),state=W().FieldAwakeVisor.state(),trigger=D().querySelector('.fieldAwakeTrigger');
  rec.frameCarrier=carrier.frameId;rec.frameVisor=visor?.dataset.frameId||'';rec.authority=state.authority;rec.donor=state.donor;rec.triggerInMore=!!trigger?.closest('.footMenu');
  rec.moveCount=visor?.querySelectorAll('[data-move-index]').length||0;rec.title=visor?.querySelector('[data-awake-title]')?.textContent||'';
  const ids=[['runDockTurn','[data-awake-turn]','turn'],['runDockTrace','[data-awake-trace]','trace'],['runDockReturn','[data-awake-return]','return']],hits={turn:0,trace:0,return:0};
  for(const [nativeId,selector,key] of ids){const native=D().getElementById(nativeId),button=visor.querySelector(selector);if(!native||!button||button.disabled)throw Error('missing/disabled '+key);native.addEventListener('click',e=>{hits[key]++;e.preventDefault();e.stopImmediatePropagation()},{capture:true,once:true});button.click();await sleep(60)}
  rec.hits=hits;rec.nativeTurn=visor.dataset.nativeTurn;rec.overflow=Math.max(D().documentElement.scrollWidth,D().body.scrollWidth)-D().documentElement.clientWidth;
  rec.sameObject=rec.frameCarrier===rec.frameVisor&&rec.title===(carrier.object?.label||carrier.object?.id||'FIELD object');
  const ok=rec.unheld&&rec.sameObject&&rec.moveCount<=3&&rec.moveCount>0&&rec.authority==='DELEGATES_HOST_NATIVE_ONLY'&&rec.donor==='/recovery/semantic-painting-v0.8/'&&rec.triggerInMore&&hits.turn===1&&hits.trace===1&&hits.return===1&&rec.nativeTurn==='ready'&&rec.overflow<=1;
  done(ok,rec);
})().catch(e=>done(false,{error:String(e?.stack||e),...rec}));
<\/script></body></html>`}
const server=http.createServer((req,res)=>{if(String(req.url).startsWith('/__awake_probe')){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(probe());return}const file=fileFor(req.url);if(!file){res.writeHead(404);res.end('not found');return}res.writeHead(200,{'content-type':type(file),'cache-control':'no-store'});fs.createReadStream(file).pipe(res)});
await new Promise(r=>server.listen(PORT,HOST,r));
const bin=browserBin(),args=['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--hide-scrollbars','--window-size=520,940','--virtual-time-budget=32000','--dump-dom','http://'+HOST+':'+PORT+'/__awake_probe'];
const result=await new Promise((resolve,reject)=>{const p=spawn(bin,args,{stdio:['ignore','pipe','pipe']});let out='',err='';const timer=setTimeout(()=>{p.kill('SIGKILL');reject(Error('timeout'))},44000);p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('close',code=>{clearTimeout(timer);resolve({code,out,err})})});server.close();
const m=result.out.match(/id="probeResult">(?:PASS|FAIL) ([^<]+)/),payload=m?.[1]||'';const pass=/id="probeResult">PASS /.test(result.out)&&/"unheld":true/.test(payload)&&/"sameObject":true/.test(payload)&&/"triggerInMore":true/.test(payload)&&/"turn":1/.test(payload)&&/"trace":1/.test(payload)&&/"return":1/.test(payload);
if(!pass){console.error('FIELD AWAKE OPERABLE VISOR FAIL');console.error(result.out.slice(-12000));console.error(result.err.slice(-1800));process.exit(1)}
console.log('FIELD AWAKE OPERABLE VISOR PASS');console.log(payload);
