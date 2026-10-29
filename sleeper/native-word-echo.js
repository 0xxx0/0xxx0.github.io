/* Source-addressed wayfinding in the native ONE RETURN labyrinth.
   Geometry comes only from the actual native grid. Never a Gate, teleport or
   semantic translation: word address selects a reproducible reachable waypoint. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.SleeperWordEcho=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const DIR=[[0,-1],[1,0],[0,1],[-1,0]];
 function hash(text){let h=2166136261;for(const c of String(text)){h^=c.codePointAt(0);h=Math.imul(h,16777619)}return h>>>0}
 function locate(g,origin,at,quote){
  if(!g||!g.grid||!g.size||!g.law||!g.law.key||!origin||!Number.isInteger(at)||at<0||!quote)return null;
  const size=g.size,ox=Math.floor(origin.x),oy=Math.floor(origin.y);
  if(g.grid[oy]?.[ox]!==0)return null;
  // One exact source order, one stable world origin. Selecting a word at a
  // different player position must NOT relocate the word's projected address.
  const lex=[...String(g.law.source).matchAll(/[\p{L}\p{N}][\p{L}\p{M}\p{N}'’\-]*/gu)];
  const ordinal=lex.findIndex(m=>m.index===at&&m[0]===quote);
  if(ordinal<0)return null; // never project a fabricated or drifted source quote
  const sx=Math.floor(g.start.x),sy=Math.floor(g.start.y);
  if(g.grid[sy]?.[sx]!==0)return null;
  const queue=[[sx,sy,0]],seen=new Set([sy*size+sx]),candidates=[];
  for(let i=0;i<queue.length;i++){
   const [x,y,d]=queue[i];
   if(d>=6&&d<=16){
    const gate=g.gates&&g.gates.some(p=>Math.hypot(x+.5-p.x,y+.5-p.y)<1.5);
    if(!gate)candidates.push({x:x+.5,y:y+.5,steps:d});
   }
   if(d>=16)continue;
   for(const [dx,dy] of DIR){const nx=x+dx,ny=y+dy,k=ny*size+nx;
    if(nx>=0&&ny>=0&&nx<size&&ny<size&&g.grid[ny][nx]===0&&!seen.has(k)){
     seen.add(k);queue.push([nx,ny,d+1]);
    }
   }
  }
  if(!candidates.length)return null;
  // BFS discovers real open cells in increasing walk-distance from the stable
  // origin. Source order selects an increasing rank along that distance axis.
  // This is an explicit ORDER → DISTANCE projection, not semantic translation.
  const index=Math.min(candidates.length-1,Math.floor((ordinal+.5)*candidates.length/lex.length));
  return Object.freeze({...candidates[index],sourceIndex:at,quote,
    sourceOrdinal:ordinal,sourceTotal:lex.length,mapping:'SOURCE_ORDER_TO_WALK_DISTANCE'});
 }
 function nextHop(g,origin,target){
  if(!g?.grid||!g.size||!origin||!target)return null;
  const size=g.size,sx=Math.floor(origin.x),sy=Math.floor(origin.y),tx=Math.floor(target.x),ty=Math.floor(target.y);
  if(g.grid[sy]?.[sx]!==0||g.grid[ty]?.[tx]!==0)return null;
  // First align to the current open cell's centre. A diagonal turn at the
  // corner of a corridor is not a traversable instruction for the native actor.
  const center={x:sx+.5,y:sy+.5};
  if(Math.hypot(center.x-origin.x,center.y-origin.y)>.18)return {...center,steps:null,align:true};
  if(sx===tx&&sy===ty)return {x:target.x,y:target.y,steps:0,align:false};
  const q=[[sx,sy]],seen=new Set([sy*size+sx]),prev=new Map();let reached=false;
  for(let i=0;i<q.length;i++){
   const [x,y]=q[i];if(x===tx&&y===ty){reached=true;break}
   for(const [dx,dy] of DIR){
    const nx=x+dx,ny=y+dy,k=ny*size+nx;
    if(nx>=0&&ny>=0&&nx<size&&ny<size&&g.grid[ny][nx]===0&&!seen.has(k)){
     seen.add(k);prev.set(k,[x,y]);q.push([nx,ny]);
    }
   }
  }
  if(!reached)return null;
  let x=tx,y=ty,steps=0;
  while(!(x===sx&&y===sy)){
   const prior=prev.get(y*size+x);if(!prior)return null;
   steps++;if(prior[0]===sx&&prior[1]===sy)break;
   x=prior[0];y=prior[1];
  }
  return {x:x+.5,y:y+.5,steps,align:false};
 }
 function trackSegment(path,startIndex,origin,end){
  const raw=path.slice(Math.max(0,startIndex)).map(p=>[+p.x.toFixed(3),+p.y.toFixed(3)]);
  const first=[+origin.x.toFixed(3),+origin.y.toFixed(3)];
  if(!raw.length||raw[0][0]!==first[0]||raw[0][1]!==first[1])raw.unshift(first);
  if(end){const last=[+end.x.toFixed(3),+end.y.toFixed(3)];if(raw.at(-1)[0]!==last[0]||raw.at(-1)[1]!==last[1])raw.push(last)}
  return raw;
 }
 function footprint(path){
  const result=new Set();
  for(let j=1;j<path.length;j++){
   const a=path[j-1],b=path[j],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
   const n=Math.max(1,Math.ceil(length/.25));
   for(let k=0;k<=n;k++){const t=k/n,x=a[0]*(1-t)+b[0]*t,y=a[1]*(1-t)+b[1]*t;
    result.add(Math.floor(x*2)+','+Math.floor(y*2));
   }
  }
  if(path.length===1)result.add(Math.floor(path[0][0]*2)+','+Math.floor(path[0][1]*2));
  return result;
 }
 function compare(a,b){
  const A=footprint(a),B=footprint(b);
  let common=0;for(const x of B)if(A.has(x))common++;
  const distance=p=>p.slice(1).reduce((n,v,i)=>n+Math.hypot(v[0]-p[i][0],v[1]-p[i][1]),0);
  return Object.freeze({overlap:B.size?common/B.size:null,firstLength:distance(a),secondLength:distance(b),
   firstCells:A.size,secondCells:B.size,commonCells:common});
 }
 return Object.freeze({locate,nextHop,trackSegment,compare,footprint,hash});
});