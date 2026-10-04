import {
  TAU,buildHeldField,normalizeProjection,projectionProfile,
  representationMismatch,residualMismatch,lineageAngles
} from "./core.mjs";
import {
  projectionPairMismatch,chooseCounterProjection,pairResidual,pairLineageAngles
} from "./pair.mjs";
import {mountPaintingPlainTrial} from "./painting-plain.mjs";

const q=s=>document.querySelector(s);
const params=new URLSearchParams(location.search);
const focusHref=params.get("focus"),requestedCompare=params.get("compare");
let manifest=null,current=null,held=null,report=null,pairReport=null,counterChoice=null;
let compensation=0;
const projectionEl=q("#projection"),comp=q("#compensation");
const mc=q("#moire").getContext("2d"),cc=q("#coords").getContext("2d");

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const pct=v=>Math.round(clamp(v)*100)+"%";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
const wrap=a=>{while(a>Math.PI)a-=TAU;while(a<-Math.PI)a+=TAU;return a};
const interpAngle=(a,b,t)=>a+wrap(b-a)*t;
const returnHref=()=>{
  const p=new URLSearchParams();
  if(focusHref)p.set("focus",focusHref);
  for(const k of ["ax_state","ax_op","ax_mode"])if(params.get(k))p.set(k,params.get(k));
  return "/"+(p.toString()?"?"+p.toString():"");
};
q("#returnLink").href=returnHref();

function serialPair(){
  if(!pairReport)return null;
  return {
    schema:pairReport.schema,
    left:{id:pairReport.left,label:pairReport.left_label},
    right:{id:pairReport.right,label:pairReport.right_label},
    mismatch:{
      total:pairReport.total,
      channel:pairReport.channel,
      coordinate:pairReport.coordinate,
      held_displacement:pairReport.held_displacement,
      compensation,
      visible_residual:pairResidual(pairReport,compensation)
    },
    channels:pairReport.channels,
    material_threshold:.24,
    material:pairReport.total>=.24
  };
}
function serialReport(){
  if(!report)return null;
  return {
    schema:"field-representation-mismatch/v0.3",
    generated_at:new Date().toISOString(),
    source:{
      route:held.route.href,
      title:held.route.title||held.route.href,
      manifest_updated:manifest.updated||null,
      current_head:held.head?{route:held.head.route,state:held.head.state,head:held.head.head||null}:null
    },
    projection:{
      id:report.projection,
      label:report.label,
      policy:projectionProfile(report.projection)
    },
    mismatch:{
      total:report.total,
      channel_residue:report.irreducible,
      coordinate_displacement:report.transformable,
      held_displacement:report.held_displacement,
      compensation,
      visible_residual:pairReport?pairResidual(pairReport,compensation):residualMismatch(report,compensation)
    },
    comparison:serialPair(),
    channels:report.channels,
    lineage:held.lineage.map(r=>r.href),
    context:held.context.map(r=>r.href),
    law:"Alignment may remove coordinate displacement; hidden/derived channel residue and pairwise channel disagreement remain. Projection evidence does not mutate FIELD truth.",
    authority:"VIEW / EVIDENCE ONLY"
  };
}

function selectPair(selected){
  const explicit=requestedCompare?normalizeProjection(requestedCompare):null;
  if(explicit&&explicit!==selected){
    pairReport=projectionPairMismatch(manifest,current,focusHref,selected,explicit);
    counterChoice={current:selected,alternative:explicit,material:!!pairReport&&pairReport.total>=.24,threshold:.24,pair:pairReport,candidates:[]};
    return;
  }
  counterChoice=chooseCounterProjection(manifest,current,focusHref,selected,{threshold:.24});
  pairReport=counterChoice?.pair||null;
}
function loadReport(){
  const p=normalizeProjection(projectionEl.value);
  projectionEl.value=p;
  report=representationMismatch(manifest,current,focusHref,p);
  if(!report)return;
  selectPair(p);
  render();
}
function channelResidueText(row){
  const bits=[];
  if(row.derived.length)bits.push("derived: "+row.derived.join(", "));
  if(row.hidden.length)bits.push("hidden: "+row.hidden.join(", "));
  return bits.join(" · ")||"none";
}
function renderFacts(){
  q("#objectTitle").textContent=held.route.title||held.route.href;
  q("#objectPath").textContent=held.route.href;
  const owner=held.route.field?.owner||"FIELD ROUTE";
  q("#objectMeta").textContent=[held.route.state||"—",held.route.operation||held.route.kind||"—",owner,report.label].join(" · ");
  q("#sourceStatus").innerHTML="SOURCE <strong>"+esc(manifest.updated||"manifest")+"</strong> · "+(held.head?("CURRENT "+esc(held.head.state||"HEAD")):"no exact CURRENT head · manifest object")+" · <span class=\"pass\">synthetic fixture absent</span>";
  q("#pairTotal").textContent=pairReport?pct(pairReport.total):"—";
  q("#pairMeta").textContent=pairReport
    ?pairReport.left_label+" ↔ "+pairReport.right_label+" · channels "+pct(pairReport.channel)+" · coordinates "+pct(pairReport.coordinate)+(pairReport.total>=.24?" · MATERIAL":" · below live-mark threshold")
    :"no lawful counterprojection available";
  q("#total").textContent=pct(report.total);
  q("#irreducible").textContent=pct(report.irreducible);
  q("#transformable").textContent=pct(report.transformable);
  q("#residual").textContent=pct(pairReport?pairResidual(pairReport,compensation):residualMismatch(report,compensation));
  q("#compV").textContent=Math.round(compensation*100)+"%";
  q("#channels").innerHTML=report.channels.map(r=>{
    const retained=[...r.preserved,...r.derived.map(x=>x+"*")];
    return "<tr><td><b>"+esc(r.channel.toUpperCase())+"</b></td><td>"+r.facts+"</td><td>"+esc(retained.join(", ")||"—")+"</td><td><small>"+esc(channelResidueText(r))+"</small></td><td>"+pct(r.mismatch)+"<div class=\"bar\"><i style=\"width:"+pct(r.mismatch)+"\"></i></div></td></tr>";
  }).join("");
  q("#lineage").innerHTML=held.lineage.map(r=>"<span title=\""+esc(r.href)+"\">"+esc((r.title||r.href).slice(0,34))+"</span>").join("");
  q("#raw").textContent=JSON.stringify(serialReport(),null,2);
}
function drawLineField(ctx,w,h,angle,phase,spacing,alpha,stroke){
  ctx.save();ctx.translate(w/2,h/2);ctx.rotate(angle);ctx.strokeStyle=stroke;ctx.globalAlpha=alpha;ctx.lineWidth=1;
  const R=Math.hypot(w,h),shift=(phase/TAU)*spacing;
  for(let y=-R;y<=R;y+=spacing){ctx.beginPath();ctx.moveTo(-R,y+shift);ctx.lineTo(R,y+shift);ctx.stroke()}
  ctx.restore();
}
function drawMoiré(){
  const w=q("#moire").width,h=q("#moire").height;
  mc.clearRect(0,0,w,h);mc.fillStyle="#070a0c";mc.fillRect(0,0,w,h);
  let firstAngle=0,secondAngle=0,phase=0,res=0,label="",residueStrength=0;
  if(pairReport){
    const a=pairLineageAngles(pairReport);
    firstAngle=a.left;secondAngle=interpAngle(a.right,a.left,compensation);phase=a.phase*(1-compensation);
    res=pairResidual(pairReport,compensation);label=pairReport.left_label+" ↔ "+pairReport.right_label;residueStrength=pairReport.channel;
    q("#moireLabel").textContent="INTERFERENCE · "+pairReport.left+" × "+pairReport.right;
  }else{
    const a=lineageAngles(report);
    firstAngle=a.canonical;secondAngle=interpAngle(a.projected,a.canonical,compensation);phase=a.phase*(1-compensation);
    res=residualMismatch(report,compensation);label=report.label+" ↔ CANONICAL";residueStrength=report.irreducible;
    q("#moireLabel").textContent="INTERFERENCE · CANONICAL × PROJECTION";
  }
  drawLineField(mc,w,h,firstAngle,0,11,.34,"#dfe5df");
  drawLineField(mc,w,h,secondAngle,phase,10.4,.24+.42*res,"#72bce7");
  if(residueStrength>0){
    const residueAngle=firstAngle+0.42+residueStrength*.8;
    drawLineField(mc,w,h,residueAngle,residueStrength*Math.PI,17,.08+.30*residueStrength,"#ed7447");
  }
  const g=mc.createRadialGradient(w*.5,h*.5,10,w*.5,h*.5,w*.55);
  g.addColorStop(0,"rgba(255,255,255,0)");g.addColorStop(1,"rgba(0,0,0,.72)");mc.fillStyle=g;mc.fillRect(0,0,w,h);
  mc.fillStyle="rgba(8,10,12,.74)";mc.fillRect(18,18,w-36,76);
  mc.fillStyle="#edf0ed";mc.font="700 15px ui-monospace,monospace";mc.fillText((held.route.title||held.route.href).slice(0,48),30,45);
  mc.fillStyle="#8f9ba0";mc.font="12px ui-monospace,monospace";mc.fillText(label.slice(0,62)+" · visible "+pct(res),30,67);
  mc.fillStyle="#d5ad68";mc.fillText("NON-ALIGNABLE "+pct(residueStrength),30,85);
}
function pos(map,id,w,h){
  const p=map.get(id)||{x:.5,y:.5};return{x:55+p.x*(w-110),y:55+p.y*(h-110)};
}
function contextEdgePairs(nodes=held.context){
  const set=new Set(nodes.map(r=>r.href)),out=[];
  for(const r of nodes){const p=r.parent||"/";if(set.has(p)&&p!==r.href)out.push([p,r.href])}
  return out;
}
function drawCoords(){
  const canvas=q("#coords"),w=canvas.width,h=canvas.height;
  cc.clearRect(0,0,w,h);cc.fillStyle="#070a0c";cc.fillRect(0,0,w,h);
  const left=pairReport?pairReport.coordinates.left:report.coordinates.canonical;
  const right=pairReport?pairReport.coordinates.right:report.coordinates.projected;
  const nodes=pairReport?pairReport.coordinates.nodes:held.context;
  const edges=contextEdgePairs(nodes);
  const leftLabel=pairReport?pairReport.left:"CANONICAL",rightLabel=pairReport?pairReport.right:report.projection;
  q("#coordLabel").textContent="REAL ROUTE CONTEXT · "+leftLabel+" × "+rightLabel;
  cc.lineWidth=1.2;
  for(const [a,b] of edges){
    const A=pos(left,a,w,h),B=pos(left,b,w,h);
    cc.strokeStyle="rgba(220,226,221,.20)";cc.beginPath();cc.moveTo(A.x,A.y);cc.lineTo(B.x,B.y);cc.stroke();
    const RA=pos(right,a,w,h),RB=pos(right,b,w,h);
    const IA={x:RA.x+(A.x-RA.x)*compensation,y:RA.y+(A.y-RA.y)*compensation};
    const IB={x:RB.x+(B.x-RB.x)*compensation,y:RB.y+(B.y-RB.y)*compensation};
    cc.strokeStyle="rgba(114,188,231,.38)";cc.beginPath();cc.moveTo(IA.x,IA.y);cc.lineTo(IB.x,IB.y);cc.stroke();
  }
  const lineSet=new Set(held.lineage.map(r=>r.href));
  for(const r of nodes){
    const A=pos(left,r.href,w,h),P0=pos(right,r.href,w,h),P={x:P0.x+(A.x-P0.x)*compensation,y:P0.y+(A.y-P0.y)*compensation};
    cc.strokeStyle="rgba(237,116,71,.30)";cc.beginPath();cc.moveTo(A.x,A.y);cc.lineTo(P.x,P.y);cc.stroke();
    cc.fillStyle=lineSet.has(r.href)?"#d5ad68":"#657279";cc.beginPath();cc.arc(A.x,A.y,lineSet.has(r.href)?4.5:3,0,TAU);cc.fill();
    cc.strokeStyle=r.href===held.route.href?"#edf0ed":"#72bce7";cc.lineWidth=r.href===held.route.href?2.2:1.2;cc.beginPath();cc.arc(P.x,P.y,r.href===held.route.href?8:4,0,TAU);cc.stroke();
    if(lineSet.has(r.href)){
      cc.fillStyle=r.href===held.route.href?"#edf0ed":"#9ba5a8";cc.font=(r.href===held.route.href?"700 ":"")+"10px ui-monospace,monospace";
      cc.fillText((r.title||r.href).slice(0,22),P.x+10,P.y-7);
    }
  }
  cc.fillStyle="#8f9ba0";cc.font="11px ui-monospace,monospace";
  cc.fillText("• "+leftLabel.slice(0,18),18,h-27);cc.fillStyle="#72bce7";cc.fillText("○ "+rightLabel.slice(0,18)+" / compensated",150,h-27);cc.fillStyle="#ed7447";cc.fillText("— displacement",410,h-27);
}
function render(){
  renderFacts();drawMoiré();drawCoords();
}
async function copyReport(){
  const txt=JSON.stringify(serialReport(),null,2);
  try{await navigator.clipboard.writeText(txt);q("#copy").textContent="COPIED";setTimeout(()=>q("#copy").textContent="COPY REPORT",800)}
  catch(_){prompt("Copy mismatch report:",txt)}
}
async function boot(){
  projectionEl.value=normalizeProjection(params.get("projection")||"AXIAL_LATEST");
  if(!focusHref){q("#noHeld").hidden=false;return}
  try{
    [manifest,current]=await Promise.all([
      fetch("/showcase-manifest.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("manifest "+r.status);return r.json()}),
      fetch("/control/CURRENT.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("CURRENT "+r.status);return r.json()})
    ]);
    held=buildHeldField(manifest,current,focusHref,projectionEl.value);
    if(!held.ok){q("#noHeld").hidden=false;q("#noHeld p").textContent="Held address cannot be resolved against the current manifest: "+held.reason+" · "+(held.href||focusHref);return}
    q("#instrument").hidden=false;loadReport();
    mountPaintingPlainTrial({manifest,current,held});
  }catch(err){
    q("#noHeld").hidden=false;q("#noHeld p").textContent="Could not load FIELD truth sources. "+String(err?.message||err);
  }
}
projectionEl.onchange=()=>{compensation=0;comp.value="0";loadReport()};
comp.oninput=()=>{compensation=Number(comp.value)/100;render()};
q("#align").onclick=()=>{compensation=1;comp.value="100";render()};
q("#reset").onclick=()=>{compensation=0;comp.value="0";render()};
q("#glyph").onclick=()=>{projectionEl.value="GLYPH";compensation=0;comp.value="0";loadReport()};
q("#copy").onclick=copyReport;
boot();
