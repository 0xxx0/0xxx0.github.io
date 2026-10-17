'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const E=require('../sleeper/encounter.js'),V=require('../lib/sleeper-return-v2.js');
let now=1000;
const node={innerHTML:'',textContent:'',style:{},classList:{contains:()=>false,toggle(){},add(){},remove(){}}};
const context=vm.createContext({console,Math,JSON,Intl,performance:{now:()=>now},setTimeout:()=>0,localStorage:{getItem:()=>null,setItem(){}},SleeperEncounter:E});
for(const p of ['native-core.js','native-engine.js','native-ui.js'])vm.runInContext(fs.readFileSync('sleeper/'+p,'utf8').replace(/\ninit\(\);\s*$/,'\n'),context);
context.document={querySelector:s=>s==='#modal'?{classList:{contains:()=>true}}:node,querySelectorAll:()=>[]};
const run=s=>vm.runInContext(s,context);
run('globalThis.spec={CELLS,FIGURES};renderHUD=()=>{};showReturn=()=>{};');
function tick(ms=250){now+=ms;run('activeTool=null;updateProofs(performance.now(),'+ms+');')}
function act(tool){run('useTool('+JSON.stringify(tool)+')');tick()}
function walk(x,y){
 context.target={x,y};run(`{
 const end=[Math.floor(target.x),Math.floor(target.y)],origin=[Math.floor(game.player.x),Math.floor(game.player.y)],queue=[origin],seen=new Map([[origin.join(','),null]]);
 for(let i=0;i<queue.length&&!seen.has(end.join(','));i++)for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const [x,y]=queue[i],p=[x+dx,y+dy],k=p.join(',');if(game.grid[p[1]]?.[p[0]]===0&&!seen.has(k)){seen.set(k,queue[i]);queue.push(p)}}
 if(!seen.has(end.join(',')))throw Error('unreachable');let trail=[],p=end;while(p){trail.push(p);p=seen.get(p.join(','))}trail.reverse();
 for(const p of trail){const dx=p[0]+.5-game.player.x,dy=p[1]+.5-game.player.y,d=Math.hypot(dx,dy);if(d>.001){game.player.direction=Math.atan2(dy,dx);game.keys.add('w');move(performance.now(),d/game.law.figure.movementSpeed*1000);game.keys.clear()}}
 }`);
}
function gate(name){return run('JSON.parse(JSON.stringify(game.gates.find(g=>g.name==='+JSON.stringify(name)+')))')}
function cutNear(name){const g=gate(name);const p=run(`(()=>{const gate=game.gates.find(g=>g.name===${JSON.stringify(name)});for(let y=1;y<game.size-1;y++)for(let x=1;x<game.size-1;x++)if(game.grid[y][x]===0&&Math.hypot(x+.5-gate.x,y+.5-gate.y)<=2.25)for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])if(game.grid[y+dy][x+dx]>0&&game.grid[y+dy][x+dx]!==9&&x+dx>0&&y+dy>0&&x+dx<26&&y+dy<26)return{x:x+.5,y:y+.5,direction:Math.atan2(dy,dx)};throw Error('no cut approach')})()`);walk(p.x,p.y);context.facing=p.direction;run('game.player.direction=facing;game.kerisReadyAt=0');act('keris')}
let count=0;
for(const cell of context.spec.CELLS)for(const figure of context.spec.FIGURES){
 run('game=newGame("ALL MAPS ARE WRONG. SOME BECOME DOORS.",'+JSON.stringify(cell.id)+','+JSON.stringify(figure.id)+');');
 // Premature recovery releases a mark and does not manufacture retrieval proof.
 act('w8');assert.equal(run('game.retrievalArmed'),false);act('w8');assert.equal(run('game.anchor'),null);assert.equal(gate('RETRIEVAL').collected,false);
 const before=run('JSON.stringify(game)');const cue=E.aperture(run('game'),now);assert.ok(cue.line);assert.equal(run('JSON.stringify(game)'),before);
 let g=gate('PROVENANCE');walk(g.x,g.y);act('conch');assert.equal(gate('PROVENANCE').collected,true);
 g=gate('COMPRESSION');walk(g.x,g.y);act('spiral');assert.equal(gate('COMPRESSION').collected,true);
 cutNear('OPERATION');assert.equal(gate('OPERATION').collected,true);
 g=gate('RETRIEVAL');walk(g.x,g.y);act('w8');assert.equal(run('game.retrievalArmed'),true);assert.equal(gate('RETRIEVAL').collected,false);
 const far=run(`(()=>{for(let y=1;y<26;y++)for(let x=1;x<26;x++)if(game.grid[y][x]===0&&Math.hypot(x+.5-game.anchor.x,y+.5-game.anchor.y)>=3.1)return{x:x+.5,y:y+.5}})()`);walk(far.x,far.y);tick();act('w8');assert.equal(gate('RETRIEVAL').collected,true);assert.equal(run('game.anchor'),null);
 g=gate('TRANSFER');if(g.method==='keris')cutNear('TRANSFER');else{walk(g.x,g.y);act(g.method)}assert.equal(gate('TRANSFER').collected,true);
 g=gate('TRUTH');walk(g.x,g.y);tick(figure.truthHoldMs+1);assert.equal(gate('TRUTH').collected,true);
 g=gate('MEASURE');const band=run(`(()=>{const g=game.gates.find(g=>g.name==='MEASURE'),f=game.law.figure;for(let y=1;y<26;y++)for(let x=1;x<26;x++){const d=Math.hypot(x+.5-g.x,y+.5-g.y);if(game.grid[y][x]===0&&d>=f.measureMin&&d<=f.measureMax)return{x:x+.5,y:y+.5}}throw Error('no measure band')})()`);walk(band.x,band.y);tick(figure.measureHoldMs+1);assert.equal(gate('MEASURE').collected,true);
 g=gate('RESILIENCE');walk(g.x,g.y);tick();assert.equal(gate('RESILIENCE').relocated,true);g=gate('RESILIENCE');walk(g.x,g.y);tick();assert.equal(g.collected,false);assert.equal(gate('RESILIENCE').collected,true);
 assert.equal(run('game.gateCount'),8);walk(1.5,1.5);assert.equal(run('game.finished'),true);const artifact=run('makeArtifact()'),v=V.validate(JSON.parse(JSON.stringify(artifact)));assert.ok(v.ok,v.errors?.join(' | '));
 const svg=E.wovenTraceSVG(run('game'));assert.ok(svg.includes('EVIDENCE ONLY'));const trace=run('snapshotWitness()');assert.ok(E.validGhost(trace,artifact.worldKey));assert.equal(E.validGhost({...trace,path:[[NaN,0]]},artifact.worldKey),false);assert.equal(E.validGhost(trace,'WRONG'),false);count++;
}
console.log('SLEEPER NATIVE ENCOUNTER PASS ·',count,'CELL / FIGURE LOOPS · BFS WALK / ACTUAL OPERATORS / RETURN V2 · MATERIAL READ ONLY');
