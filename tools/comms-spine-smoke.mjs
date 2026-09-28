#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';

const ROOT=process.cwd(),HOST='127.0.0.1';let PORT=0;
function browserBin(){for(const name of ['google-chrome-stable','google-chrome','chromium-browser','chromium','brave-browser','brave']){const r=spawnSync('which',[name],{encoding:'utf8'});if(r.status===0&&r.stdout.trim())return r.stdout.trim()}for(const p of ['/Applications/Brave Browser.app/Contents/MacOS/Brave Browser','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/Applications/Chromium.app/Contents/MacOS/Chromium']){if(fs.existsSync(p))return p}throw Error('No Chrome/Chromium')}
function type(p){if(p.endsWith('.html'))return'text/html; charset=utf-8';if(p.endsWith('.js')||p.endsWith('.mjs'))return'text/javascript; charset=utf-8';if(p.endsWith('.json'))return'application/json; charset=utf-8';if(p.endsWith('.css'))return'text/css; charset=utf-8';return'application/octet-stream'}
function fileFor(url){let clean=decodeURIComponent(String(url||'/').split('?')[0]).replace(/^\/+/, '');if(!clean)clean='index.html';if(clean.endsWith('/'))clean+='index.html';const p=path.normalize(path.join(ROOT,clean));if(!p.startsWith(ROOT))return null;if(fs.existsSync(p)&&fs.statSync(p).isFile())return p;return null}
function probe(){return '<!doctype html><html><body><iframe id="f" style="width:430px;height:900px;border:0"></iframe><pre id="probeResult">PENDING</pre><script>'+
"const f=document.getElementById('f'),out=document.getElementById('probeResult'),rec={};let doneFlag=false;"+
"const done=(ok,data)=>{if(doneFlag)return;doneFlag=true;out.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(data)};"+
"const sleep=ms=>new Promise(r=>setTimeout(r,ms));const wait=async(fn,limit=16000,label='condition')=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(70)}throw Error('wait timeout '+label)};"+
"(async()=>{f.src='/port/comms/?demo=1';const W=()=>f.contentWindow,D=()=>W().document;"+
"await wait(()=>D().documentElement.dataset.commsSpine==='ready',16000,'ready');rec.messages=D().documentElement.dataset.commsMessages;rec.signals0=Number(D().documentElement.dataset.commsSignals||0);rec.open0=Number(D().documentElement.dataset.commsOpen||0);"+
"const firstClause=D().querySelector('.clause');firstClause.click();D().querySelector('[data-mark=\"NOTE\"]').click();await sleep(120);rec.signals1=Number(D().documentElement.dataset.commsSignals||0);"+
"const doc=W().CommsSpine.state().doc,c0=doc.messages[0].clauses[0],c2=doc.messages[0].clauses[2];"+
"const m1=W().CommsSpine.spotMachine({kind:'WAITING',messageId:c0.messageId,clauseId:c0.id,speaker:'USER',start:c0.start,end:c0.end,text:c0.text});"+
"const m2=W().CommsSpine.spotMachine({kind:'CONSTRAINT',messageId:c2.messageId,clauseId:c2.id,speaker:'USER',start:c2.start,end:c2.end,text:c2.text});"+
"await sleep(140);rec.machineSpotted=!!(m1&&m2);rec.machineId1=m1&&m1.id;rec.machineId2=m2&&m2.id;rec.signals2=Number(D().documentElement.dataset.commsSignals||0);"+
"const cardFor=id=>[...D().querySelectorAll('.signalCard')].find(c=>c.querySelector('.signalAddr').textContent.includes(id));"+
"const mc1=cardFor(rec.machineId1),mc2=cardFor(rec.machineId2);rec.machineRendered=!!(mc1&&mc2)&&D().querySelectorAll('.signalCard.machine').length===2;"+
"rec.machineOriginText=!!mc1&&mc1.querySelector('.origin').textContent.includes('MACHINE');"+
"const borderStyle=el=>W().getComputedStyle(el).borderLeftStyle,hcm=D().querySelector('.signalCard.human'),dcm=D().querySelector('.signalCard.derived');"+
"rec.cardGrammar3=!!mc1&&!!hcm&&!!dcm&&borderStyle(hcm)==='solid'&&borderStyle(dcm)==='dashed'&&borderStyle(mc1)==='double';"+
"rec.machineTwoActions=!!mc1&&!!mc1.querySelector('[data-jump]')&&!!mc1.querySelector('[data-confirm]')&&!!mc1.querySelector('[data-dismiss]')&&!mc1.querySelector('[data-target]')&&!mc1.querySelector('[data-remove]')&&mc1.querySelectorAll('.signalActions button').length===3;"+
"const ask=[...D().querySelectorAll('.signalCard')].find(x=>x.querySelector('.kind.ASK')&&x.querySelector('.state.OPEN'));if(!ask)throw Error('no open ASK card');ask.querySelector('[data-target]').click();"+
"const draft=D().getElementById('draft');draft.value='I will handle the addressed request without duplicating the other branch.';draft.dispatchEvent(new Event('input',{bubbles:true}));D().getElementById('coverBtn').click();await sleep(140);"+
"const st=W().CommsSpine.state(),covered=st.signals.filter(x=>x.kind==='ASK'&&x.state==='COVERED');rec.covered=covered.length;rec.human=st.signals.filter(x=>x.origin==='HUMAN').length;rec.sourceId=st.sourceId;rec.draft=st.draft.length;rec.overflow=Math.max(D().documentElement.scrollWidth,D().body.scrollWidth)-D().documentElement.clientWidth;rec.packet=W().CommsSpine.buildAgentPacket()?.schema;"+
"rec.machineUncovered=st.signals.filter(x=>x.id===rec.machineId1||x.id===rec.machineId2).every(x=>x.state==='OPEN');"+
"const a1=cardFor(rec.machineId1);a1.querySelector('[data-confirm]').click();await sleep(140);"+
"const one=W().CommsSpine.state().signals.find(x=>x.id===rec.machineId1),hc1=cardFor(rec.machineId1);"+
"rec.confirmFlips=!!(one&&one.origin==='HUMAN'&&one.confidence===1);"+
"rec.confirmCard=!!hc1&&hc1.classList.contains('human')&&!hc1.querySelector('[data-confirm]')&&!hc1.querySelector('[data-dismiss]')&&D().querySelectorAll('.signalCard.machine').length===1;"+
"const a2=cardFor(rec.machineId2),countBefore=W().CommsSpine.state().signals.length;a2.querySelector('[data-dismiss]').click();await sleep(140);"+
"const two=W().CommsSpine.state().signals.find(x=>x.id===rec.machineId2),mc2b=cardFor(rec.machineId2);"+
"rec.dismissFlips=!!(two&&two.state==='DROPPED'&&two.origin==='MACHINE'&&two.confidence<1);"+
"rec.dismissKeeps=!!two&&W().CommsSpine.state().signals.length===countBefore&&!!mc2b&&mc2b.classList.contains('machine')&&mc2b.querySelector('.state').textContent==='DROPPED';"+
"rec.noPromoteOnAuthored=[...D().querySelectorAll('.signalCard.human,.signalCard.derived')].every(c=>!c.querySelector('[data-confirm]')&&!c.querySelector('[data-dismiss]'));"+
"const tks=[...D().querySelectorAll('.signalCell i')],tickG=el=>{const r=el.getBoundingClientRect(),cr=el.parentElement.getBoundingClientRect();return{top:Math.round((r.top-cr.top)*100)/100,h:Math.round(r.height*100)/100}};const hT=tks.find(t=>t.dataset.origin==='HUMAN'),dT=tks.find(t=>t.dataset.origin==='DERIVED'),mT=tks.find(t=>t.dataset.origin==='MACHINE');"+
"rec.originGeometry=(hT&&dT&&mT)?{human:tickG(hT),derived:tickG(dT),machine:tickG(mT)}:'origins-absent';"+
"if(hT&&dT&&mT){const G=rec.originGeometry,dA=(A,B)=>Math.abs(A.top-B.top)>0.5||Math.abs(A.h-B.h)>0.5;G.distinct=dA(G.human,G.derived)&&dA(G.human,G.machine)&&dA(G.machine,G.derived)&&G.human.h>G.derived.h+0.5&&G.human.h>G.machine.h+0.5&&G.machine.top>G.derived.top+0.5;}"+
"const returned=W().CommsSpine.returnObject();await W().CommsSpine.loadSource('User: temporary source','TEMP');rec.temporary=W().CommsSpine.state().sourceId!==rec.sourceId;rec.resumed=W().CommsSpine.loadReturn(returned);const resumed=W().CommsSpine.state();rec.resumeSource=resumed.sourceId===rec.sourceId;rec.resumeDraft=resumed.draft===st.draft;rec.resumeCovered=resumed.signals.some(x=>x.kind==='ASK'&&x.state==='COVERED');rec.resumeConfirmed=resumed.signals.some(x=>x.id===rec.machineId1&&x.origin==='HUMAN'&&x.confidence===1);rec.resumeDismissed=resumed.signals.some(x=>x.id===rec.machineId2&&x.origin==='MACHINE'&&x.state==='DROPPED');"+
"done(rec.messages==='4'&&rec.signals0>0&&rec.signals1>rec.signals0&&rec.signals2===rec.signals1+2&&rec.covered>=1&&rec.human>=1&&/^sha256:/.test(rec.sourceId)&&rec.draft>10&&rec.packet==='comms-spine-agent-packet/v0.1'&&rec.overflow<=1&&rec.temporary&&rec.resumed&&rec.resumeSource&&rec.resumeDraft&&rec.resumeCovered&&rec.resumeConfirmed&&rec.resumeDismissed&&rec.machineSpotted&&rec.machineRendered&&rec.machineOriginText&&rec.cardGrammar3&&rec.machineTwoActions&&rec.machineUncovered&&rec.confirmFlips&&rec.confirmCard&&rec.dismissFlips&&rec.dismissKeeps&&rec.noPromoteOnAuthored&&rec.originGeometry&&rec.originGeometry.distinct===true,rec)})().catch(e=>done(false,{error:String(e&&e.stack||e),...rec}));"+
'</scr'+'ipt></body></html>'}
const server=http.createServer((req,res)=>{if(String(req.url).startsWith('/__comms')){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(probe());return}const file=fileFor(req.url);if(!file){res.writeHead(404);res.end('not found');return}res.writeHead(200,{'content-type':type(file),'cache-control':'no-store'});fs.createReadStream(file).pipe(res)});
await new Promise(r=>server.listen(PORT,HOST,r));PORT=server.address().port;
const bin=browserBin(),args=['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--hide-scrollbars','--window-size=520,940','--virtual-time-budget=24000','--dump-dom','http://'+HOST+':'+PORT+'/__comms'];
const result=await new Promise((resolve,reject)=>{const p=spawn(bin,args,{stdio:['ignore','pipe','pipe']});let out='',err='';const timer=setTimeout(()=>{p.kill('SIGKILL');reject(Error('timeout'))},36000);p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('close',code=>{clearTimeout(timer);resolve({code,out,err})})});
server.close();
const pass=/id="probeResult">PASS /.test(result.out)&&/"packet":"comms-spine-agent-packet\/v0.1"/.test(result.out)&&/"human":[1-9]/.test(result.out)&&/"covered":[1-9]/.test(result.out)&&/"confirmFlips":true/.test(result.out)&&/"dismissFlips":true/.test(result.out)&&/"cardGrammar3":true/.test(result.out);
if(!pass){console.error('COMMS SPINE SMOKE FAIL');console.error(result.out.slice(-7000));console.error(result.err.slice(-1600));process.exit(1)}
console.log('COMMS SPINE 0.1 PHONE SMOKE PASS');
