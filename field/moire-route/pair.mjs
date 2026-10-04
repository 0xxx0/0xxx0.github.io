import {
  CHANNELS,normalizeProjection,projectionProfile,canonicalFacts,
  contextRoutes,lineageFor,projectionCoordinates,representationMismatch
} from "./core.mjs";

export {normalizeProjection};

export const AUTO_COMPARE_PROJECTIONS=Object.freeze([
  "AXIAL_LATEST","VISUAL","STRUCTURE","EVOLVE","VERSIONS","RECENT"
]);

const clamp01=v=>Math.max(0,Math.min(1,Number(v)||0));
const uniq=xs=>[...new Set((xs||[]).filter(Boolean))];

function factState(profile,key){
  if(profile.preserve.includes(key))return "PRESERVED";
  if(profile.derive.includes(key))return "DERIVED";
  return "HIDDEN";
}
function stateCost(a,b){
  if(a===b)return 0;
  const pair=new Set([a,b]);
  if(pair.has("PRESERVED")&&pair.has("HIDDEN"))return 1;
  if(pair.has("DERIVED")&&pair.has("HIDDEN"))return .7;
  if(pair.has("PRESERVED")&&pair.has("DERIVED"))return .35;
  return 1;
}

export function availableRepresentations(manifest,href){
  const nodes=contextRoutes(manifest,href),route=(manifest?.routes||[]).find(r=>r.href===href);
  if(!route)return [];
  const out=["AXIAL_LATEST","VISUAL","STRUCTURE","RECENT"];
  if(nodes.some(r=>r?.evolution))out.push("EVOLVE");
  if(nodes.some(r=>r?.version||(Array.isArray(r?.versions)&&r.versions.length)))out.push("VERSIONS");
  return uniq(out);
}

export function projectionPairMismatch(manifest,current,href,leftProjection,rightProjection){
  const facts=canonicalFacts(manifest,current,href);
  if(!facts)return null;
  const left=projectionProfile(leftProjection),right=projectionProfile(rightProjection);
  const rows=[];let channelCost=0,channelWeight=0;
  for(const channel of CHANNELS){
    const entries=Object.entries(facts.groups[channel]||{});
    if(!entries.length){rows.push({channel,facts:0,mismatch:0,disagreements:[]});continue}
    let cost=0;const disagreements=[];
    for(const [key] of entries){
      const l=factState(left,key),r=factState(right,key),c=stateCost(l,r);
      cost+=c;
      if(c>0)disagreements.push({fact:key,left:l,right:r,cost:c});
    }
    const mismatch=cost/entries.length;
    rows.push({channel,facts:entries.length,mismatch,disagreements});
    channelCost+=mismatch;channelWeight++;
  }
  const channel=channelWeight?channelCost/channelWeight:0;
  const nodes=contextRoutes(manifest,href),lineage=lineageFor(manifest,href);
  const leftCoords=projectionCoordinates(manifest,nodes,left.id),rightCoords=projectionCoordinates(manifest,nodes,right.id);
  const distances=[];
  for(const r of lineage){
    const a=leftCoords.get(r.href),b=rightCoords.get(r.href);if(!a||!b)continue;
    distances.push(Math.hypot(a.x-b.x,a.y-b.y)/Math.SQRT2);
  }
  const la=leftCoords.get(href),ra=rightCoords.get(href);
  const held=la&&ra?Math.hypot(la.x-ra.x,la.y-ra.y)/Math.SQRT2:0;
  const coordinate=distances.length?distances.reduce((a,b)=>a+b,0)/distances.length:0;
  const total=clamp01(.68*channel+.32*coordinate);
  return {
    schema:"field-representation-pair/v0.1",
    href,
    left:left.id,right:right.id,
    left_label:left.label,right_label:right.label,
    total,channel,coordinate,held_displacement:held,
    channels:rows,
    facts,
    coordinates:{left:leftCoords,right:rightCoords,nodes,lineage}
  };
}

export function pairResidual(pair,compensation=0){
  if(!pair)return 1;
  const c=clamp01(compensation);
  return clamp01(.68*pair.channel+.32*pair.coordinate*(1-c));
}

export function chooseCounterProjection(manifest,current,href,currentProjection,opt={}){
  const currentId=normalizeProjection(currentProjection);
  const threshold=opt.threshold==null?.24:clamp01(opt.threshold);
  const allowed=Array.isArray(opt.candidates)&&opt.candidates.length
    ?uniq(opt.candidates.map(normalizeProjection))
    :availableRepresentations(manifest,href);
  const candidates=allowed.filter(id=>id!==currentId).map(id=>{
    const pair=projectionPairMismatch(manifest,current,href,currentId,id);
    const canonical=representationMismatch(manifest,current,href,id);
    return pair?{id,pair,canonical}:null;
  }).filter(Boolean).sort((a,b)=>b.pair.total-a.pair.total||a.id.localeCompare(b.id));
  const best=candidates[0]||null;
  return {
    current:currentId,
    alternative:best?.id||null,
    material:!!best&&best.pair.total>=threshold,
    threshold,
    pair:best?.pair||null,
    candidates:candidates.map(x=>({id:x.id,total:x.pair.total,channel:x.pair.channel,coordinate:x.pair.coordinate,canonical_total:x.canonical?.total??null}))
  };
}

export function pairLineageAngles(pair){
  const line=pair?.coordinates?.lineage||[],left=pair?.coordinates?.left,right=pair?.coordinates?.right;
  if(line.length<2||!left||!right)return{left:0,right:0,phase:0};
  const a=line.at(-2).href,b=line.at(-1).href,la=left.get(a),lb=left.get(b),ra=right.get(a),rb=right.get(b);
  if(!la||!lb||!ra||!rb)return{left:0,right:0,phase:0};
  const l=Math.atan2(lb.y-la.y,lb.x-la.x),r=Math.atan2(rb.y-ra.y,rb.x-ra.x);
  const phase=(rb.x-lb.x+rb.y-lb.y)*Math.PI;
  return{left:l,right:r,phase};
}
