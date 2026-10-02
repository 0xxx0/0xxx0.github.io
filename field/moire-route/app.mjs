import {
  TAU,buildHeldField,normalizeProjection,projectionProfile,
  representationMismatch,residualMismatch,lineageAngles
} from "./core.mjs";

const q=s=>document.querySelector(s);
const params=new URLSearchParams(location.search);
const focusHref=params.get("focus");
let manifest=null,current=null,held=null,report=null;
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

function serialReport(){
  if(!report)return null;
  return {
    schema:"field-representation-mismatch/v0.2",
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
      visible_residual:residualMismatch(report,compensation)
    },
    channels:report.channels,
    lineage:held.lineage.map(r=>r.href),
    context:held.context.map(r=>r.href),
    law:"Alignment may remove coordinate displacement; hidden/derived channel residue remains. Projection evidence does not mutate FIELD truth.",
    authority:"VIEW / EVIDENCE ONLY"
  };
}

function loadReport(){
  const p=normalizeProjection(projectionEl.value);
  projectionEl.value=p;
  report=representationMismatch(manifest,current,focusHref,p);
  if(!report)return;
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
  q("#total").textContent=pct(report.total);
  q("#irreducible").textContent=pct(report.irreducible);
  q("#transformable").textContent=pct(report.transformable);
  q("#residual").textContent=pct(residualMismatch(report,compensation));
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
  const a=lineageAngles(report),res=residualMismatch(report,compensation);
  const bAngle=interpAngle(a.projected,a.canonical,compensation);
  const bPhase=a.phase*(1-compensation);
  drawLineField(mc,w,h,a.canonical,0,11,.34,"#dfe5df");
  drawLineField(mc,w,h,bAngle,bPhase,10.4,.24+.42*res,"#72bce7");

  // Hidden/derived channels remain as a non-alignable residue field.
  const hidden=report.channels.reduce((n,r)=>n+r.hidden.length+r.derived.length*.45,0);
  if(hidden>0){
    const residueAngle=a.canonical+0.42+report.irreducible*.8;
    drawLineField(mc,w,h,residueAngle,report.irreducible*Math.PI,17,.08+.30*report.irreducible,"#ed7447");
  }

  const g=mc.createRadialGradient(w*.5,h*.5,10,w*.5,h*.5,w*.55);
  g.addColorStop(0,"rgba(255,255,255,0)");g.addColorStop(1,"rgba(0,0,0,.72)");mc.fillStyle=g;mc.fillRect(0,0,w,h);
  mc.fillStyle="rgba(8,10,12,.74)";mc.fillRect(18,18,w-36,76);
  mc.fillStyle="#edf0ed";mc.font="700 15px ui-monospace,monospace";mc.fillText((held.route.title||held.route.href).slice(0,48),30,45);
  mc.fillStyle="#8f9ba0";mc.font="12px ui-monospace,monospace";mc.fillText(report.label+" · actual "+pct(report.total)+" · visible "+pct(res),30,67);
  const residue=report.channels.filter(r=>r.hidden.length||r.derived.length).map(r=>r.channel.toUpperCase()).join(" / ");
  mc.fillStyle="#d5ad68";mc.fillText("RESIDUE "+(residue||"NONE"),30,85);
}
function pos(map,id,w,h){
  const p=map.get(id)||{x:.5,y:.5};return{x:55+p.x*(w-110),y:55+p.y*(h-110)};
}
function contextEdgePairs(){
  const set=new Set(held.context.map(r=>r.href)),out=[];
  for(const r of held.context){const p=r.parent||"/";if(set.has(p)&&p!==r.href)out.push([p,r.href])}
  return out;
}
function drawCoords(){
  const canvas=q("#coords"),w=canvas.width,h=canvas.height;
  cc.clearRect(0,0,w,h);cc.fillStyle="#070a0c";cc.fillRect(0,0,w,h);
  const canon=report.coordinates.canonical,proj=report.coordinates.projected;
  const edges=contextEdgePairs();
  cc.lineWidth=1.2;
  for(const [a,b] of edges){
    const A=pos(canon,a,w,h),B=pos(canon,b,w,h);
    cc.strokeStyle="rgba(220,226,221,.20)";cc.beginPath();cc.moveTo(A.x,A.y);cc.lineTo(B.x,B.y);cc.stroke();
    const PA=pos(proj,a,w,h),PB=pos(proj,b,w,h);
    const IA={x:PA.x+(A.x-PA.x)*compensation,y:PA.y+(A.y-PA.y)*compensation};
    const IB={x:PB.x+(B.x-PB.x)*compensation,y:PB.y+(B.y-PB.y)*compensation};
    cc.strokeStyle="rgba(114,188,231,.38)";cc.beginPath();cc.moveTo(IA.x,IA.y);cc.lineTo(IB.x,IB.y);cc.stroke();
  }
  const lineSet=new Set(held.lineage.map(r=>r.href));
  for(const r of held.context){
    const A=pos(canon,r.href,w,h),P0=pos(proj,r.href,w,h),P={x:P0.x+(A.x-P0.x)*compensation,y:P0.y+(A.y-P0.y)*compensation};
    cc.strokeStyle="rgba(237,116,71,.30)";cc.beginPath();cc.moveTo(A.x,A.y);cc.lineTo(P.x,P.y);cc.stroke();
    cc.fillStyle=lineSet.has(r.href)?"#d5ad68":"#657279";cc.beginPath();cc.arc(A.x,A.y,lineSet.has(r.href)?4.5:3,0,TAU);cc.fill();
    cc.strokeStyle=r.href===held.route.href?"#edf0ed":"#72bce7";cc.lineWidth=r.href===held.route.href?2.2:1.2;cc.beginPath();cc.arc(P.x,P.y,r.href===held.route.href?8:4,0,TAU);cc.stroke();
    if(lineSet.has(r.href)){
      cc.fillStyle=r.href===held.route.href?"#edf0ed":"#9ba5a8";cc.font=(r.href===held.route.href?"700 ":"")+"10px ui-monospace,monospace";
      cc.fillText((r.title||r.href).slice(0,22),P.x+10,P.y-7);
    }
  }
  cc.fillStyle="#8f9ba0";cc.font="11px ui-monospace,monospace";
  cc.fillText("• canonical tree",18,h-27);cc.fillStyle="#72bce7";cc.fillText("○ projection / compensated",145,h-27);cc.fillStyle="#ed7447";cc.fillText("— displacement",365,h-27);
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
