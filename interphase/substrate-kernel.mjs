export const SCHEMA='interphase-substrate/v0.1';
export const DEFAULT_KERNEL=Object.freeze(['OBJECT','ADDRESS','PROJECT','OPERATE','RETURN']);
export const OP_MARK=Object.freeze({OBJECT:'●',ADDRESS:'◎',PROJECT:'◇',OPERATE:'→',RETURN:'↶'});
export const REL_MARK=Object.freeze({FOCUS:'⊙',UP:'↑',DOWN:'↓',ACROSS:'↔'});

const norm=s=>String(s??'').trim();
const routeKey=r=>norm(r?.href);
const clampInt=(n,lo,hi)=>Math.max(lo,Math.min(hi,Math.trunc(Number(n)||0)));

export function graphIndex(routes=[]){
  const by=new Map();
  for(const r of Array.isArray(routes)?routes:[]){const href=routeKey(r);if(href&&!by.has(href))by.set(href,r)}
  const adjacent=new Map([...by.keys()].map(k=>[k,new Set()]));
  for(const [href,r] of by){const p=norm(r?.parent);if(p&&by.has(p)){adjacent.get(href).add(p);adjacent.get(p).add(href)}}
  return {by,adjacent};
}

export function isAncestor(by,ancestor,child){
  const a=norm(ancestor),c=norm(child);if(!a||!c||a===c)return false;
  const seen=new Set();let cur=by.get(c);
  while(cur){const p=norm(cur.parent);if(!p||seen.has(p))return false;if(p===a)return true;seen.add(p);cur=by.get(p)}
  return false;
}

export function neighborhood(routes,focusHref,{maxHops=3}={}){
  const {by,adjacent}=graphIndex(routes),focus=norm(focusHref),limit=clampInt(maxHops,1,4);
  if(!by.has(focus))return Object.freeze({focus,status:'UNRESOLVED_FOCUS',items:[],by,adjacent,maxHops:limit});
  const distance=new Map([[focus,0]]),queue=[focus];
  for(let q=0;q<queue.length;q++){
    const href=queue[q],d=distance.get(href);if(d>=limit)continue;
    for(const next of [...(adjacent.get(href)||[])].sort())if(!distance.has(next)){distance.set(next,d+1);queue.push(next)}
  }
  const items=[...distance].map(([href,d])=>{
    const record=by.get(href);
    const relation=d===0?'FOCUS':isAncestor(by,href,focus)?'UP':isAncestor(by,focus,href)?'DOWN':'ACROSS';
    return Object.freeze({href,distance:d,relation,record});
  }).sort((a,b)=>a.distance-b.distance||a.href.localeCompare(b.href));
  return Object.freeze({focus,status:'OK',items,by,adjacent,maxHops:limit});
}

export function semanticPoint(operation,distance,{kernel=DEFAULT_KERNEL,maxHops=3}={}){
  const ops=[...new Set((Array.isArray(kernel)?kernel:DEFAULT_KERNEL).map(norm).filter(Boolean))];
  const op=norm(operation),i=ops.indexOf(op),d=clampInt(distance,0,4),h=clampInt(maxHops,1,4);
  if(i<0||d<=0)return null;
  // Angle is declared operation. Radius is exact parent-edge hop count.
  const angle=-Math.PI/2+(Math.PI*2*i/Math.max(1,ops.length));
  const radius=.13+(.31*d/h);
  return Object.freeze({operation:op,operationIndex:i,distance:d,angle,radius,x:.5+Math.cos(angle)*radius,y:.5+Math.sin(angle)*radius});
}

export function substrateModel(routes,focusHref,{kernel=DEFAULT_KERNEL,maxHops=3}={}){
  const n=neighborhood(routes,focusHref,{maxHops}),ops=[...new Set((Array.isArray(kernel)?kernel:DEFAULT_KERNEL).map(norm).filter(Boolean))];
  if(n.status!=='OK')return Object.freeze({schema:SCHEMA,status:n.status,focus:n.focus,kernel:ops,maxHops:n.maxHops,groups:[],edges:[],unplaced:[]});
  const focusItem=n.items.find(x=>x.distance===0),groups=new Map(),unplaced=[];
  const keyOf=new Map([[n.focus,'FOCUS']]);
  for(const item of n.items){
    if(item.distance===0)continue;
    const op=norm(item.record?.operation),point=semanticPoint(op,item.distance,{kernel:ops,maxHops:n.maxHops});
    if(!point){unplaced.push(item);continue}
    const key=`${item.distance}|${op}`;keyOf.set(item.href,key);
    if(!groups.has(key))groups.set(key,{key,operation:op,distance:item.distance,point,items:[]});
    groups.get(key).items.push(item);
  }
  const frozenGroups=[...groups.values()].sort((a,b)=>a.distance-b.distance||a.operation.localeCompare(b.operation)).map(g=>Object.freeze({...g,items:Object.freeze(g.items.sort((a,b)=>a.href.localeCompare(b.href)))}));
  const groupByKey=new Map(frozenGroups.map(g=>[g.key,g]));
  const edgeMap=new Map();
  for(const item of n.items){
    const p=norm(item.record?.parent);if(!p||!keyOf.has(p)||!keyOf.has(item.href))continue;
    const a=keyOf.get(p),b=keyOf.get(item.href);if(a===b)continue;
    const k=[a,b].sort().join('→');
    const e=edgeMap.get(k)||{key:k,from:a,to:b,count:0};e.count++;edgeMap.set(k,e);
  }
  const coord=key=>key==='FOCUS'?{x:.5,y:.5}:groupByKey.get(key)?.point;
  const edges=[...edgeMap.values()].map(e=>Object.freeze({...e,a:coord(e.from),b:coord(e.to)})).filter(e=>e.a&&e.b);
  return Object.freeze({schema:SCHEMA,status:'OK',focus:n.focus,focusItem,kernel:Object.freeze(ops),maxHops:n.maxHops,groups:Object.freeze(frozenGroups),edges:Object.freeze(edges),unplaced:Object.freeze(unplaced)});
}

export default Object.freeze({SCHEMA,DEFAULT_KERNEL,OP_MARK,REL_MARK,graphIndex,isAncestor,neighborhood,semanticPoint,substrateModel});
