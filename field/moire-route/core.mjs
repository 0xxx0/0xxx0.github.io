export const TAU=Math.PI*2;
export const CHANNELS=["identity","address","content","depth","authority","evidence"];

const PROJECTIONS={
  AXIAL_LATEST:{
    label:"FIELD / AXIAL",
    layout:"AXIAL",
    preserve:["href","title","state","operation","work_modes","role","owner","head_state"],
    derive:["kind"]
  },
  VISUAL:{
    label:"FIELD / VISUAL MAP",
    layout:"TREE",
    preserve:["href","title","parent","children"],
    derive:["kind"]
  },
  STRUCTURE:{
    label:"FIELD / STRUCTURE",
    layout:"STRUCTURE",
    preserve:["href","title","state","evolution_stage"],
    derive:["kind"]
  },
  EVOLVE:{
    label:"FIELD / EVOLVE",
    layout:"EVOLVE",
    preserve:["href","title","state","evolution_stage","evolution_question","evolution_gate"],
    derive:["kind"]
  },
  VERSIONS:{
    label:"FIELD / VERSIONS",
    layout:"VERSIONS",
    preserve:["href","title","version","versions"],
    derive:["kind"]
  },
  RECENT:{
    label:"FIELD / RECENT",
    layout:"RECENT",
    preserve:["href","title","state","index_updated_at"],
    derive:["kind"]
  },
  GLYPH:{
    label:"FIELD / GLYPH",
    layout:"GLYPH",
    preserve:["href","parent"],
    derive:["kind","operation","state"]
  }
};

export function normalizeProjection(name){
  const n=String(name||"AXIAL_LATEST").toUpperCase().replace(/\s+/g,"_");
  return PROJECTIONS[n]?n:"AXIAL_LATEST";
}
export function projectionProfile(name){
  const id=normalizeProjection(name),p=PROJECTIONS[id];
  return {id,...p,preserve:[...p.preserve],derive:[...p.derive]};
}
const present=v=>{
  if(v==null)return false;
  if(Array.isArray(v))return v.length>0;
  if(typeof v==="string")return v.trim()!=="";
  if(typeof v==="object")return Object.keys(v).length>0;
  return true;
};
const compact=o=>Object.fromEntries(Object.entries(o).filter(([,v])=>present(v)));
const uniq=xs=>[...new Set((xs||[]).filter(Boolean))];

export function routeMap(manifest){
  return new Map((manifest?.routes||[]).filter(r=>r?.href).map(r=>[r.href,r]));
}
export function headForRoute(current,href){
  const hs=Array.isArray(current?.current_heads)?current.current_heads:[];
  return hs.find(h=>h.route===href)||hs.find(h=>href&&h.route&&h.route!=="/"&&href.startsWith(h.route))||null;
}
export function routeDepth(map,href){
  let d=0,r=map.get(href),seen=new Set();
  while(r&&r.href!=="/"&&!seen.has(r.href)){
    seen.add(r.href);d++;r=map.get(r.parent||"/");
  }
  return d;
}
export function lineageFor(manifest,href){
  const map=routeMap(manifest),out=[],seen=new Set();let r=map.get(href);
  while(r&&!seen.has(r.href)){
    seen.add(r.href);out.push(r);
    if(r.href==="/")break;
    r=map.get(r.parent||"/");
  }
  if(!out.length||out.at(-1)?.href!=="/"){
    const root=map.get("/");if(root&&!seen.has("/"))out.push(root);
  }
  return out.reverse();
}
export function contextRoutes(manifest,href,limit=28){
  const map=routeMap(manifest),line=lineageFor(manifest,href),keep=new Map(line.map(r=>[r.href,r]));
  for(const node of line){
    const p=node.parent||"/";
    for(const r of map.values())if((r.parent||"/")===p)keep.set(r.href,r);
  }
  const focus=map.get(href);
  if(focus)for(const r of map.values())if((r.parent||"/")===focus.href)keep.set(r.href,r);
  const all=[...keep.values()];
  const lineSet=new Set(line.map(r=>r.href));
  all.sort((a,b)=>(lineSet.has(a.href)?0:1)-(lineSet.has(b.href)?0:1)||routeDepth(map,a.href)-routeDepth(map,b.href)||String(a.href).localeCompare(String(b.href)));
  return all.slice(0,limit);
}
export function canonicalFacts(manifest,current,href){
  const map=routeMap(manifest),r=map.get(href);
  if(!r)return null;
  const children=[...map.values()].filter(x=>(x.parent||"/")===r.href).map(x=>x.href);
  const head=headForRoute(current,href);
  const exits=Array.isArray(r.field?.exit_paths)?r.field.exit_paths.filter(x=>String(x?.status||"AVAILABLE").toUpperCase()==="AVAILABLE").map(x=>compact({class:x.class,via:x.via,target:x.target})):[];

  const flat=compact({
    href:r.href,title:r.title,kind:r.kind,parent:r.parent||"/",
    state:r.state,operation:r.operation,role:r.role,version:r.version,family:r.family,
    work_modes:r.index?.work_modes,index_updated_at:r.index?.updated_at,
    children,
    owner:r.field?.owner,
    available_exits:exits,
    receipt:r.receipt,
    evolution_stage:r.evolution?.stage,
    evolution_question:r.evolution?.question,
    evolution_gate:r.evolution?.evidence_gate,
    versions:Array.isArray(r.versions)?r.versions.map(v=>v.version||v):undefined,
    head_state:head?.state,
    head_next:head?.next_executable?.objective||head?.next_executable?.id,
    latest_return:head?.latest_return||head?.last_return||r.latest_return||r.last_return,
    evidence_count:Array.isArray(head?.evidence)?head.evidence.length:undefined
  });
  const groups={
    identity:compact({href:flat.href,title:flat.title,kind:flat.kind}),
    address:compact({href:flat.href,parent:flat.parent}),
    content:compact({
      title:flat.title,state:flat.state,operation:flat.operation,role:flat.role,
      kind:flat.kind,version:flat.version,family:flat.family,work_modes:flat.work_modes,
      index_updated_at:flat.index_updated_at,evolution_stage:flat.evolution_stage,
      versions:flat.versions
    }),
    depth:compact({parent:flat.parent,children:flat.children}),
    authority:compact({owner:flat.owner,available_exits:flat.available_exits}),
    evidence:compact({
      receipt:flat.receipt,evolution_question:flat.evolution_question,evolution_gate:flat.evolution_gate,
      head_state:flat.head_state,head_next:flat.head_next,latest_return:flat.latest_return,
      evidence_count:flat.evidence_count
    })
  };
  return {route:r,head,flat,groups};
}
export function channelMismatch(manifest,current,href,projection){
  const facts=canonicalFacts(manifest,current,href);
  if(!facts)return null;
  const p=projectionProfile(projection),preserve=new Set(p.preserve),derive=new Set(p.derive);
  const rows=[];let cost=0,weight=0;
  for(const ch of CHANNELS){
    const entries=Object.entries(facts.groups[ch]||{});
    if(!entries.length){rows.push({channel:ch,facts:0,mismatch:0,preserved:[],derived:[],hidden:[]});continue}
    let c=0;const kept=[],made=[],hidden=[];
    for(const [k,v] of entries){
      if(preserve.has(k)){kept.push(k);continue}
      if(derive.has(k)){made.push(k);c+=0.45;continue}
      hidden.push(k);c+=1;
    }
    const m=c/entries.length;
    rows.push({channel:ch,facts:entries.length,mismatch:m,preserved:kept,derived:made,hidden});
    cost+=m;weight++;
  }
  return {projection:p,rows,mismatch:weight?cost/weight:0,facts};
}
const rankMap=values=>{
  const xs=uniq(values.map(v=>String(v??"—"))).sort();
  return new Map(xs.map((v,i)=>[v,xs.length===1?.5:i/(xs.length-1)]));
};
function versionScalar(r){
  const raw=String(r.version||r.versions?.at?.(-1)?.version||"0");
  const nums=raw.match(/\d+(?:\.\d+)?/g);return nums?Number(nums.at(-1)):0;
}
function timeScalar(r){
  const t=Date.parse(r.index?.updated_at||0);return Number.isFinite(t)?t:0;
}
export function canonicalCoordinates(manifest,nodes){
  const map=routeMap(manifest),depths=nodes.map(r=>routeDepth(map,r.href)),max=Math.max(1,...depths);
  const byDepth=new Map();
  for(const r of nodes){const d=routeDepth(map,r.href);if(!byDepth.has(d))byDepth.set(d,[]);byDepth.get(d).push(r)}
  for(const xs of byDepth.values())xs.sort((a,b)=>String(a.href).localeCompare(String(b.href)));
  const out=new Map();
  for(const r of nodes){
    const d=routeDepth(map,r.href),xs=byDepth.get(d),i=xs.findIndex(x=>x.href===r.href);
    out.set(r.href,{x:d/max,y:(i+1)/(xs.length+1)});
  }
  return out;
}
export function projectionCoordinates(manifest,nodes,projection){
  const id=normalizeProjection(projection);
  if(id==="VISUAL")return canonicalCoordinates(manifest,nodes);
  const out=new Map(),hrefRank=rankMap(nodes.map(r=>r.href));
  if(id==="STRUCTURE"){
    for(const r of nodes)out.set(r.href,{x:.5,y:hrefRank.get(String(r.href))});return out;
  }
  if(id==="RECENT"){
    const vals=nodes.map(timeScalar),min=Math.min(...vals),max=Math.max(...vals),span=max-min||1;
    for(const r of nodes)out.set(r.href,{x:(timeScalar(r)-min)/span,y:hrefRank.get(String(r.href))});return out;
  }
  if(id==="VERSIONS"){
    const vals=nodes.map(versionScalar),min=Math.min(...vals),max=Math.max(...vals),span=max-min||1;
    for(const r of nodes)out.set(r.href,{x:(versionScalar(r)-min)/span,y:hrefRank.get(String(r.href))});return out;
  }
  if(id==="EVOLVE"){
    const xr=rankMap(nodes.map(r=>r.evolution?.stage||"NONE"));
    for(const r of nodes)out.set(r.href,{x:xr.get(String(r.evolution?.stage||"NONE")),y:hrefRank.get(String(r.href))});return out;
  }
  if(id==="GLYPH"){
    const xr=rankMap(nodes.map(r=>r.kind||"route")),yr=rankMap(nodes.map(r=>r.operation||"—"));
    for(const r of nodes)out.set(r.href,{x:xr.get(String(r.kind||"route")),y:yr.get(String(r.operation||"—"))});return out;
  }
  const xr=rankMap(nodes.map(r=>r.state||"UNSET")),yr=rankMap(nodes.map(r=>(r.operation||"—")+"|"+(r.index?.work_modes?.[0]||"UNKNOWN")));
  for(const r of nodes)out.set(r.href,{x:xr.get(String(r.state||"UNSET")),y:yr.get(String((r.operation||"—")+"|"+(r.index?.work_modes?.[0]||"UNKNOWN")))});
  return out;
}
export function coordinateMismatch(manifest,href,projection,nodes=contextRoutes(manifest,href)){
  const line=lineageFor(manifest,href),canon=canonicalCoordinates(manifest,nodes),proj=projectionCoordinates(manifest,nodes,projection);
  const ds=[];
  for(const r of line){
    const a=canon.get(r.href),b=proj.get(r.href);if(!a||!b)continue;
    ds.push(Math.hypot(a.x-b.x,a.y-b.y)/Math.SQRT2);
  }
  const heldA=canon.get(href),heldB=proj.get(href);
  const held=heldA&&heldB?Math.hypot(heldA.x-heldB.x,heldA.y-heldB.y)/Math.SQRT2:0;
  return {mismatch:ds.length?ds.reduce((a,b)=>a+b,0)/ds.length:0,held,canonical:canon,projected:proj,nodes,lineage:line};
}
export function representationMismatch(manifest,current,href,projection){
  const ch=channelMismatch(manifest,current,href,projection);
  if(!ch)return null;
  const coord=coordinateMismatch(manifest,href,projection);
  const irreducible=ch.mismatch,transformable=coord.mismatch,total=0.68*irreducible+0.32*transformable;
  return {
    href,projection:ch.projection.id,label:ch.projection.label,
    total,irreducible,transformable,held_displacement:coord.held,
    channels:ch.rows,facts:ch.facts,coordinates:coord
  };
}
export function residualMismatch(report,compensation=0){
  if(!report)return 1;
  const c=Math.max(0,Math.min(1,Number(compensation)||0));
  return Math.max(0,Math.min(1,0.68*report.irreducible+0.32*report.transformable*(1-c)));
}
export function lineageAngles(report){
  const line=report?.coordinates?.lineage||[],c=report?.coordinates?.canonical,p=report?.coordinates?.projected;
  if(line.length<2)return{canonical:0,projected:0,phase:0};
  const a=line.at(-2).href,b=line.at(-1).href,ca=c.get(a),cb=c.get(b),pa=p.get(a),pb=p.get(b);
  if(!ca||!cb||!pa||!pb)return{canonical:0,projected:0,phase:0};
  const canon=Math.atan2(cb.y-ca.y,cb.x-ca.x),proj=Math.atan2(pb.y-pa.y,pb.x-pa.x);
  const phase=(pb.x-cb.x+pb.y-cb.y)*Math.PI;
  return{canonical:canon,projected:proj,phase};
}
export function buildHeldField(manifest,current,href,projection){
  if(!href)return{ok:false,reason:"NO_HELD_FIELD_OBJECT"};
  const map=routeMap(manifest),route=map.get(href);
  if(!route)return{ok:false,reason:"HELD_ROUTE_NOT_IN_MANIFEST",href};
  const report=representationMismatch(manifest,current,href,projection);
  return {
    ok:true,route,head:headForRoute(current,href),report,
    lineage:report.coordinates.lineage,
    context:report.coordinates.nodes
  };
}
