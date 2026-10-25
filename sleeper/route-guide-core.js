(function(root,factory){
'use strict';
const api=factory();
if(typeof module==='object'&&module.exports)module.exports=api;
if(root)root.SleeperRouteGuide=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const PRIMARY={conch:'PROVENANCE',keris:'OPERATION',w8:'RETRIEVAL',spiral:'COMPRESSION'};
const NEIGHBORS=[[1,0],[0,1],[-1,0],[0,-1]];
function solve(field){
  const {grid,player,gates,start,law,returnOpen,selected='auto'}=field||{};
  if(!Array.isArray(grid)||!player||!Array.isArray(gates)||!start)return{status:'unavailable'};
  const h=grid.length,w=grid[0]?.length||0,sx=Math.floor(player.x),sy=Math.floor(player.y);
  if(!w||sy<0||sx<0||sy>=h||sx>=w||grid[sy][sx]!==0)return{status:'unavailable'};
  const ix=(x,y)=>y*w+x,n=w*h,prev=new Int32Array(n).fill(-1),dist=new Int32Array(n).fill(-1);
  const q=[ix(sx,sy)];dist[q[0]]=0;
  for(let head=0;head<q.length;head++){
    const a=q[head],x=a%w,y=Math.floor(a/w);
    for(const [dx,dy] of NEIGHBORS){
      const nx=x+dx,ny=y+dy,k=ix(nx,ny);
      if(nx<0||ny<0||nx>=w||ny>=h||grid[ny][nx]!==0||dist[k]!==-1)continue;
      dist[k]=dist[a]+1;prev[k]=a;q.push(k);
    }
  }
  const visited=new Set(gates.filter(g=>g.collected).map(g=>g.name));
  let pending=gates.filter(g=>!g.collected);
  if(!pending.length||returnOpen)pending=[];
  else if(selected!=='auto')pending=pending.filter(g=>g.name===selected);
  if(selected!=='auto'&&pending.length===0&&!returnOpen)return{status:'done',detail:'Selected Gate already proved.'};
  let blocked=false,reachable=[];
  const targetCandidates=pending.length?pending:[];
  if(!targetCandidates.length&&returnOpen)targetCandidates.push({name:'RETURN',x:start.x,y:start.y,instruction:'Return to the origin.',method:'return'});
  for(const gate of targetCandidates){
    if(gate.name==='TRANSFER'&&!visited.has(PRIMARY[law?.transferTool])){
      blocked=true;continue;
    }
    const x0=gate.x,y0=gate.y,measure=gate.name==='MEASURE',min=law?.figure?.measureMin,max=law?.figure?.measureMax;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const k=ix(x,y);
      if(dist[k]<0)continue;
      const range=Math.hypot(x+.5-x0,y+.5-y0);
      if(measure?!(range>=min&&range<=max):(x!==Math.floor(x0)||y!==Math.floor(y0)))continue;
      reachable.push({gate,cell:{x,y},key:k,steps:dist[k],range});
    }
  }
  reachable.sort((a,b)=>a.steps-b.steps||targetCandidates.indexOf(a.gate)-targetCandidates.indexOf(b.gate)||a.key-b.key);
  if(!reachable.length)return{status:blocked?'locked':'unreachable',detail:blocked?'Prove the world-assigned operator before TRANSFER.':'No reachable target in the current grid.'};
  const winner=reachable[0],path=[];let k=winner.key;
  while(k!==-1){path.push({x:k%w+.5,y:Math.floor(k/w)+.5});k=prev[k]}
  path.reverse();
  return{status:'ok',target:winner.gate.name,instruction:winner.gate.instruction||'Return to the origin.',steps:winner.steps,path,range:winner.range,method:winner.gate.method||null};
}
return Object.freeze({solve});
});