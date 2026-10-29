import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {browserBin} from './browser-bin.mjs';
const root=process.cwd();
const probe=[
'<!doctype html><meta charset="utf-8"><iframe id="host" style="width:390px;height:820px;border:0"></iframe><pre id="result">PENDING</pre>',
'<script>',
'const f=document.getElementById("host"),out=document.getElementById("result");',
'const wait=ms=>new Promise(ok=>setTimeout(ok,ms));',
'const assert=(x,m)=>{if(!x)throw Error(m)};',
'(async()=>{try{',
' f.src="/sleeper/";await new Promise((ok,no)=>{f.onload=ok;f.onerror=no});',
' const w=f.contentWindow,d=f.contentDocument,read=expr=>w.eval(expr);',
' d.getElementById("enter").click();await wait(160);read("cancelAnimationFrame(raf)");',
' const L=w.SleeperFocus,E=w.SleeperEcho,C=w.SleeperWordEcho;',
' assert(L&&E&&C,"focus, echo and pure path law loaded");',
' const native=()=>read("JSON.stringify({key:game.law.key,player:game.player,steps:game.steps,proofs:game.proofs,grid:game.grid})");',
' const start=native();',
' for(const width of [320,390,1280]){f.style.width=width+"px";await wait(70);d.getElementById("focusBtn").click();',
'  assert(L.isOpen(),"native LOOK at "+width);',
'  const sel=L.selection();assert(sel&&Number.isInteger(sel.start)&&sel.word,"source selection at "+width);',
'  assert(d.documentElement.scrollWidth<=width+2,"viewport overflow at "+width);',
'  d.getElementById("fClose").click();',
' }',
' f.style.width="390px";await wait(70);d.getElementById("focusBtn").click();',
' d.querySelectorAll("#fPassage button")[2].click();const selected=L.selection();',
' const before=native(),old=read("game");',
' const point=C.locate(old,{x:old.player.x,y:old.player.y},selected.start,selected.word);',
' assert(point&&old.grid[Math.floor(point.y)][Math.floor(point.x)]===0,"word projected to a real open native coordinate");',
' assert(JSON.stringify(point)===JSON.stringify(C.locate(old,{x:old.player.x,y:old.player.y},selected.start,selected.word)),"waypoint deterministic");',
' const exact=[...old.law.source.matchAll(/[\\p{L}\\p{N}][\\p{L}\\p{M}\\p{N}\x27’\\-]*/gu)];',
' const ordered=exact.map(m=>C.locate(old,old.player,m.index,m[0]));',
' assert(ordered.every(p=>p&&p.mapping==="SOURCE_ORDER_TO_WALK_DISTANCE"),"every original source word has ordered projection");',
' assert(ordered.every((p,i)=>p.sourceOrdinal===i&&p.sourceTotal===exact.length),"projection carries actual original word ordinal");',
' assert(ordered.every((p,i)=>i===0||p.steps>=ordered[i-1].steps),"source reading order never reverses native walk-distance");',
' assert(C.locate(old,old.player,selected.start,"WRONG")===null,"invented source word rejected");',
' assert(JSON.stringify(point)===JSON.stringify(C.locate(old,{x:old.start.x+0.1,y:old.start.y+0.1},selected.start,selected.word)),"same source word maps to fixed site regardless of player origin");',
' const hop=C.nextHop(old,old.player,point);assert(hop&&old.grid[Math.floor(hop.y)][Math.floor(hop.x)]===0,"compass points into a real walkable cell");',
' assert(hop.steps>=1&&hop.steps<=16,"the cue reports true BFS path length");',
' const edited={...old,grid:old.grid.map(row=>row.slice())};edited.grid[Math.floor(hop.y)][Math.floor(hop.x)]=1;',
' const reroute=C.nextHop(edited,old.player,point);assert(reroute===null||edited.grid[Math.floor(reroute.y)][Math.floor(reroute.x)]===0,"native geometry mutation recalculates route or declares blocked");',
' d.getElementById("eFollow").click();',
' assert(!L.isOpen()&&E.state().phase==="seek","word activates same POV without replacing world");',
' assert(nativ e()===before,"word projection does not mutate native world");',
' const map=read("game.grid"),S=read("game.size");',
' function route(from,to){',
'  const sx=Math.floor(from.x),sy=Math.floor(from.y),tx=Math.floor(to.x),ty=Math.floor(to.y);',
'  const q=[[sx,sy]],prev=new Map(),seen=new Set([sy*S+sx]);let found=false;',
'  for(let i=0;i<q.length;i++){const [x,y]=q[i];if(x===tx&&y===ty){found=true;break}',
'   for(const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0]]){const nx=x+dx,ny=y+dy,k=ny*S+nx;',
'    if(nx>=0&&ny>=0&&nx<S&&ny<S&&map[ny][nx]===0&&!seen.has(k)){seen.add(k);prev.set(k,[x,y]);q.push([nx,ny])}',
'   }',
'  }',
'  assert(found,"actual maze path exists");const path=[[tx,ty]];while(path[0][0]!==sx||path[0][1]!==sy){const p=prev.get(path[0][1]*S+path[0][0]);assert(p,"reconstruct path");path.unshift(p)}',
'  return path.slice(1).map(([x,y])=>({x:x+.5,y:y+.5}));',
' }',
' function walk(to){',
'  let p=read("game.player");const stops=route(p,to);',
'  for(const goal of stops){let i=0;',
'   while(Math.hypot(p.x-goal.x,p.y-goal.y)>.105){assert(i++<30,"native actor blocked at "+goal.x+","+goal.y+" actual "+p.x+","+p.y);',
'    const a=Math.atan2(goal.y-p.y,goal.x-p.x);',
'    read("game.player.direction="+a+";game.keys.add(\\"w\\");move(performance.now(),48);game.keys.delete(\\"w\\")");',
'    p=read("game.player");',
'   }',
'  }',
'  read("render(performance.now())");',
' }',
' const origin={...read("game.player")};walk(point);',
' assert(E.state().phase==="return","contact only after real native traversal");',
' walk(origin);assert(E.state().phase==="choice"&&E.state().first>3,"a return leaves actual route memory");',
' assert(!d.getElementById("eRepeat").hidden,"a second traversal is explicitly offered");',
' const first=E.sidecar();assert(first.first.length>3&&first.projectedWaypoint[0]===point.x,"source-anchored first witness");',
' d.getElementById("eRepeat").click();assert(E.state().phase==="seek2","the second journey has same target");',
' walk(point);assert(E.state().phase==="return2","second contact traversed");',
' walk(origin);assert(E.state().phase==="done","second actual return");',
' const echo=E.sidecar();assert(echo.first&&echo.second&&echo.comparison,"two native routes compared");',
' assert(echo.comparison.overlap>.6,"same physical path produces substantial actual overlap, not random score");',
' assert(echo.worldKey===read("game.law.key")&&echo.authority.includes("NOT_GATE_PROOF"),"authority unchanged");',
' const attached=L.sidecar();assert(attached.echo&&attached.echo.phase==="done","LOOK carries ECHO as evidence-only return sidecar");',
' assert(read("game.gateCount")===0,"projecting, reading and routing minted no Gate proofs");',
' assert(read("game.steps")>0,"walk really used native step counter");',
' d.getElementById("eRelease").click();assert(E.sidecar().phase==="released","can cease pursuing word without geometry reset");',
' out.textContent="PASS native ONE RETURN / source waypoint, actual 2x BFS walk, real 3D echo, 320/390/1280, Gate isolation";',
'}catch(e){out.textContent="FAIL "+String(e.stack||e)}})();',
'</script>'
].join('\n').replace('nativ e()','native()');
const server=http.createServer((req,res)=>{
 if(req.url==='/__probe'){res.setHeader('content-type','text/html');return res.end(probe)}
 const p=decodeURIComponent(req.url.split('?')[0]);let file=path.resolve(root,'.'+p);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
 if(!fs.existsSync(file)){res.writeHead(404);return res.end()}
 const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};
 res.setHeader('content-type',mime[path.extname(file)]||'text/plain');fs.createReadStream(file).pipe(res);
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
try{
 const result=await new Promise((resolve,reject)=>{
  const p=spawn(browserBin(),['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--window-size=1450,1020','--virtual-time-budget=9000','--dump-dom','http://127.0.0.1:'+server.address().port+'/__probe']);
  let out='',err='';const t=setTimeout(()=>{p.kill('SIGKILL');reject(Error('word echo smoke timed out'))},45000);
  p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('error',reject);p.on('close',code=>{clearTimeout(t);resolve({code,out,err})});
 });
 const match=result.out.match(/<pre id="result">([\s\S]*?)<\/pre>/);
 if(result.code||!match?.[1]?.startsWith('PASS '))throw Error((match?.[1]||'no DOM result')+'\n'+result.err.slice(-900));
 console.log('SLEEPER WORD ECHO',match[1]);
}finally{server.close()}