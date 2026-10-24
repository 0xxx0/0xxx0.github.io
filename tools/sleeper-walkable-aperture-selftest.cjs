/* Read-only route proof for existing Sleeper host. node tools/sleeper-walkable-aperture-selftest.cjs */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const G=require('../sleeper/route-guide-core.js');
const native=fs.readFileSync('sleeper/native-core.js','utf8');
const C=vm.runInNewContext(native+';globalThis.fixture={buildCity,CELLS,FIGURES};globalThis.fixture;',{}, {filename:'sleeper/native-core.js'});
const html=fs.readFileSync('sleeper/index.html','utf8');
const view=fs.readFileSync('sleeper/route-guide-view.js','utf8');
new vm.Script(view,{filename:'sleeper/route-guide-view.js'});
assert(html.indexOf('route-guide-core.js')>html.indexOf('native-presence.js'));
assert(html.indexOf('route-guide-view.js')>html.indexOf('route-guide-core.js'));
for(const name of ['openGate','useTool','finishReturn','recordEvent'])assert(!view.includes(name+'('),'route view must not invoke authority: '+name);
let count=0;
for(const cell of C.CELLS)for(const figure of C.FIGURES){
  const g=C.buildCity('ALL MAPS ARE WRONG. SOME BECOME DOORS.',cell.id,figure.id);
  const before=JSON.stringify(g);
  const state={...g,player:g.start,start:g.start};
  const all=G.solve(state);
  assert.equal(all.status,'ok','auto target '+cell.id+'/'+figure.id);
  for(const gate of g.gates){
    const p=G.solve({...state,selected:gate.name});
    if(p.status==='locked'){assert.equal(gate.name,'TRANSFER');continue}
    assert.equal(p.status,'ok','route '+cell.id+'/'+figure.id+'/'+gate.name);
    assert.equal(p.path.length,p.steps+1);
    assert.equal(p.path[0].x,g.start.x);
    assert.equal(p.path[0].y,g.start.y);
    for(let i=0;i<p.path.length;i++){
      const {x,y}=p.path[i];
      assert.equal(g.grid[Math.floor(y)][Math.floor(x)],0,'path enters a wall');
      if(i>0)assert.equal(Math.abs(x-p.path[i-1].x)+Math.abs(y-p.path[i-1].y),1,'nonadjacent route segment');
    }
    if(gate.name==='MEASURE'){
      assert(p.range>=g.law.figure.measureMin);
      assert(p.range<=g.law.figure.measureMax);
    }else assert.deepEqual({x:p.path.at(-1).x,y:p.path.at(-1).y},{x:gate.x,y:gate.y});
    count++;
  }
  assert.equal(JSON.stringify(g),before,'solver changed canonical city');
  const r=G.solve({...state,gates:[],returnOpen:true,player:g.gates[0]});
  assert.equal(r.status,'ok');assert.equal(r.target,'RETURN');
  assert.equal(r.path.at(-1).x,g.start.x);assert.equal(r.path.at(-1).y,g.start.y);
}
const toy={grid:[[1,1,1,1,1],[1,0,1,0,1],[1,0,0,0,1],[1,1,1,1,1]],start:{x:1.5,y:1.5},player:{x:1.5,y:1.5},gates:[{name:'TRANSFER',x:3.5,y:1.5}],law:{transferTool:'keris',figure:{measureMin:1.5,measureMax:2.5}}};
assert.equal(G.solve(toy).status,'locked');
assert.equal(G.solve({...toy,gates:[{...toy.gates[0],name:'TRUTH'}]}).steps,4);
console.log('SLEEPER WALKABLE APERTURE PASS · '+C.CELLS.length*C.FIGURES.length+' worlds · '+count+' actionable routes + 18 returns · pure / canonical law unchanged');