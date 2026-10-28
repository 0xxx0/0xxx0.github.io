#!/usr/bin/env node
// Root-to-native-work regression proof: truthful NEXT -> OPEN, no duplicated overview.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {browserBin} from './browser-bin.mjs';
const ROOT=process.cwd(),HOST='127.0.0.1';
const page=`<!doctype html><html><body><iframe id="f" src="/" style="width:390px;height:844px;border:0"></iframe><pre id="result">PENDING</pre><script>
const frame=document.querySelector('#f'),out=document.querySelector('#result'),rec={};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const wait=async(fn,label)=>{for(let i=0;i<220;i++){try{let v=fn();if(v)return v}catch(_){}await sleep(100)}throw Error('wait '+label)};
const finish=(ok,o)=>out.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(o);
(async()=>{try{
 const W=()=>frame.contentWindow,D=()=>W().document,$=id=>D().getElementById(id);
 await wait(()=>W().FieldIndexReadModel?.snapshot?.().routes?.length>100&&W().FieldBarLanding?.reveal&&D().querySelectorAll('#feedRail .feedChip').length>=2&&W().LandingTower?.state?.().ready,'boot');
 const source=await (await W().fetch('/control/CURRENT.json',{cache:'no-store'})).json();
 const old=W().FieldLensHost.focus()?.href,now=source.next_single_action;
 await wait(()=>now?.target_route&&W().FieldLensHost.focus()?.href===now.target_route&&$('apCueText')?.textContent===now.instruction,'typed CURRENT cold resume');
 rec.initial={route:old,declared:now.target_route,cue:$('apCueText').textContent,primary:new URL($('apOpen').href).pathname,updated:source.updated};
 const head=(source.current_heads||[]).find(h=>h.route&&h.route!==old&&h.next_executable?.objective&&D().querySelectorAll('#feedRail .feedChip').length&&[...D().querySelectorAll('#feedRail .feedChip')].some(b=>b.dataset.href===h.route));
 if(!head)throw Error('no second CURRENT head with an exact objective');
 const tile=[...D().querySelectorAll('#feedRail .feedChip')].find(b=>b.dataset.href===head.route);tile.click();
 await wait(()=>W().FieldLensHost.focus()?.href===head.route&&$('apCueText')?.textContent===head.next_executable.objective,'hold exact task');
 rec.held=W().FieldLensHost.focus()?.href;rec.cue=$('apCueText').textContent;rec.kind=$('apCueKind').textContent;rec.provenance=$('apCue').dataset.cueSource;
 const r=W().__fieldRouteMap.get(head.route),acts=W().FieldIndexReadModel.actions(head.route);
 const canonical=new URL('.'+(r.alias_of||r.href),W().location.href),actual=new URL($('apOpen').href);
 rec.nativeOpen={expected:canonical.pathname+canonical.search,actual:actual.pathname+actual.search,alternate:acts[0]?.target||null};
 W().__fieldAct.focus('/port/comms/');
 await wait(()=>W().FieldLensHost.focus()?.href==='/port/comms/','native COMMS hold');
 const owned=new URL($('apOpen').href);
 rec.comms={primary:owned.pathname+owned.search,label:$('apOpen').textContent,
   alternate:W().FieldIndexReadModel.actions('/port/comms/')[0]?.target||null,
   secondary:[...$('capMoves').querySelectorAll('.capMove[href]')].map(a=>{const u=new URL(a.href);return u.pathname+u.search})};
 W().__fieldAct.focus(head.route);
 await wait(()=>W().FieldLensHost.focus()?.href===head.route,'resume selected head');
 rec.openVisible=W().getComputedStyle($('apOpen')).display!=='none';
 rec.doorAtRest=W().getComputedStyle($('apDoor')).display;
 rec.towerAtBrowse=W().getComputedStyle($('tower')).display;
 const originalFocus=rec.held;
 W().FieldBarLanding.reveal('work');
 rec.work={tower:W().getComputedStyle($('tower')).display,section:W().getComputedStyle($('workDepth')).display,open:$('workDepth').open,focus:W().FieldLensHost.focus()?.href};
 W().FieldBarLanding.reveal('prove');
 rec.prove={tower:W().getComputedStyle($('tower')).display,section:W().getComputedStyle($('refineFold')).display};
 W().FieldBarLanding.reveal('map');
 rec.map={tower:W().getComputedStyle($('tower')).display,section:W().getComputedStyle($('mapFold')).display};
 W().FieldBarLanding.reveal('browse');
 rec.return={tower:W().getComputedStyle($('tower')).display,focus:W().FieldLensHost.focus()?.href,cue:$('apCueText').textContent};
 $('fieldWords').click();
 rec.expanded={words:D().documentElement.dataset.fieldWords,door:W().getComputedStyle($('apDoor')).display};
 $('fieldWords').click();
 const ext=()=>{let d=D().documentElement;return{width:d.scrollWidth-d.clientWidth,height:d.scrollHeight-d.clientHeight,clientHeight:d.clientHeight}};
 rec.viewport390=ext();
 frame.style.width='320px';frame.style.height='568px';await sleep(250);rec.viewport320=ext();
 frame.style.width='1280px';frame.style.height='900px';await sleep(250);rec.viewport1280=ext();
 const pass=rec.initial.route===rec.initial.declared&&rec.initial.primary===rec.initial.declared&&rec.initial.cue===source.next_single_action.instruction&&rec.comms.primary==='/port/comms/?transport=1'&&rec.comms.label.includes('RELEASE EMAIL')&&rec.comms.secondary.length===0&&rec.held===head.route&&rec.cue===head.next_executable.objective&&rec.provenance==='CURRENT'&&
  ['NEXT','STATUS'].includes(rec.kind)&&rec.nativeOpen.actual===rec.nativeOpen.expected&&rec.openVisible&&rec.doorAtRest==='none'&&
  rec.towerAtBrowse!=='none'&&rec.work.tower==='none'&&rec.work.section!=='none'&&rec.work.open&&rec.work.focus===originalFocus&&
  rec.prove.tower==='none'&&rec.prove.section!=='none'&&rec.map.tower==='none'&&rec.return.tower!=='none'&&
  rec.return.focus===originalFocus&&rec.return.cue===head.next_executable.objective&&rec.expanded.words==='open'&&rec.expanded.door!=='none'&&
  rec.viewport390.width<=1&&rec.viewport320.width<=1&&rec.viewport1280.width<=1;
 finish(pass,rec);
}catch(e){finish(false,{...rec,error:String(e?.stack||e)})}})();
<\/script></body></html>`;
const mime=p=>p.endsWith('.html')?'text/html':p.endsWith('.json')?'application/json':p.endsWith('.css')?'text/css':p.endsWith('.js')||p.endsWith('.mjs')?'text/javascript':'text/plain';
const server=http.createServer((req,res)=>{
 if(String(req.url||'').startsWith('/__root_probe')){res.writeHead(200,{'content-type':'text/html','cache-control':'no-store'});res.end(page);return}
 let p=decodeURIComponent(String(req.url||'/').split('?')[0]).replace(/^\/+/,'');
 if(!p||p.endsWith('/'))p+='index.html';
 let full=path.resolve(ROOT,p);
 if(!full.startsWith(ROOT+path.sep)||!fs.existsSync(full)||!fs.statSync(full).isFile()){res.writeHead(404);res.end('not found');return}
 res.writeHead(200,{'content-type':mime(full),'cache-control':'no-store'});fs.createReadStream(full).pipe(res)
});
await new Promise(resolve=>server.listen(0,HOST,resolve));
try{
 const result=await new Promise((resolve,reject)=>{
  const proc=spawn(browserBin(),['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--window-size=1350,900','--virtual-time-budget=32000','--dump-dom','http://'+HOST+':'+server.address().port+'/__root_probe'],{stdio:['ignore','pipe','pipe']});
  let stdout='',stderr='';const timer=setTimeout(()=>{proc.kill('SIGKILL');reject(Error('browser timeout'))},47000);
  proc.stdout.on('data',d=>stdout+=d);proc.stderr.on('data',d=>stderr+=d);
  proc.on('close',code=>{clearTimeout(timer);resolve({code,stdout,stderr})});proc.on('error',reject)
 });
 const m=result.stdout.match(/id="result"[^>]*>([\s\S]*?)<\/pre>/),text=(m?.[1]||'').replace(/&quot;/g,'"').replace(/&amp;/g,'&');
 if(result.code||!text.startsWith('PASS ')){console.error('FAIL FIELD task cue',text||'no probe result',result.stderr.slice(-500));process.exitCode=1}
 else console.log('PASS FIELD task cue',text.slice(5))
}finally{await new Promise(r=>server.close(r))}
