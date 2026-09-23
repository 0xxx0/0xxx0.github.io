import {InstrumentState,PROJECTIONS,OFFICES,identityGlyph,residueFor,residueInventory,runInvariantSuite,stableString} from "./core.js";
const $=s=>document.querySelector(s),NS="http://www.w3.org/2000/svg";
const I=new InstrumentState(), six=$("#six"), svg=$("#svgStage"), sixStage=$("#sixStage");
const panelRefs={};
for(const o of OFFICES){
  const el=document.createElement("section");el.className="face"+(o.id==="FOCUS"?" focusOffice":"");el.dataset.office=o.id;
  el.innerHTML=`<h3>${o.label}</h3><div class="office">${o.prompt}</div><div class="body"></div>`;
  six.appendChild(el);panelRefs[o.id]=el;
}
const originalPanelRefs={...panelRefs};
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function svgEl(name,attrs={}){const e=document.createElementNS(NS,name);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);return e}
function glyphPath(id,cx,cy,R){
  const g=identityGlyph(id),pts=[];for(let i=0;i<g.sides;i++){const a=(g.rotation-90+i*360/g.sides)*Math.PI/180;pts.push([cx+Math.cos(a)*R,cy+Math.sin(a)*R])}
  return pts.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" ")+" Z";
}
function drawNode(n,x,y,R=24,label=true){
  const g=svgEl("g",{class:"node"+(I.workspace.focusId===n.id?" focus":"")+(I.workspace.selectedIds.includes(n.id)?" selected":""),"data-id":n.id});
  const p=svgEl("path",{d:glyphPath(n.id,x,y,R)});g.appendChild(p);
  if(label){const t=svgEl("text",{x,y:y+R+16,"text-anchor":"middle"});t.textContent=n.label;g.appendChild(t)}
  g.addEventListener("click",e=>{if(e.shiftKey)I.toggleSelection(n.id);else I.focus(n.id);render()});svg.appendChild(g);
}
function drawLine(){
  const ns=I.fixture.nodes,n=ns.length;svg.appendChild(svgEl("line",{x1:60,y1:350,x2:940,y2:350,stroke:"#253239"}));
  ns.forEach((x,i)=>drawNode(x,70+i*(860/(n-1)),350,22,true));
}
function drawRadial(){
  const ns=I.fixture.nodes,cx=500,cy=350,R=245;svg.appendChild(svgEl("circle",{cx,cy,r:R,fill:"none",stroke:"#253239"}));
  ns.forEach((x,i)=>{const a=-Math.PI/2+i*Math.PI*2/ns.length;drawNode(x,cx+Math.cos(a)*R,cy+Math.sin(a)*R,22,false)});
  const f=I.node(I.workspace.focusId);if(f){drawNode(f,cx,cy,34,true)}
  const a=svgEl("circle",{cx,cy,r:Math.max(55,R*I.workspace.aperture),fill:"none",stroke:"#d9b36a","stroke-dasharray":"4 7","stroke-opacity":".45"});svg.appendChild(a);
}
function drawGlyph(){
  const ns=I.fixture.nodes;ns.forEach((x,i)=>{const col=i%4,row=Math.floor(i/4);drawNode(x,160+col*225,145+row*190,38,true)});
}
function updateSix(){
  for(const o of OFFICES){
    const p=panelRefs[o.id],bucket=I.fixture.nodes.filter(n=>n.office===o.id),f=I.node(I.workspace.focusId);
    const body=p.querySelector(".body");
    const names=bucket.map(n=>`<span data-id="${esc(n.id)}">${esc(n.label)}</span>`).join(" · ");
    const extra=o.id==="FOCUS"&&f?`<br><b>${esc(f.label)}</b><br><span class="tiny">${esc(f.kind)} · ${esc(f.id)}</span>`:"";
    body.innerHTML=names+extra;
    p.onclick=e=>{const target=e.target.closest("[data-id]");if(target){I.focus(target.dataset.id);render()}};
  }
}
function showSix(mode){
  svg.style.display="none";sixStage.style.display="flex";six.dataset.mode=mode;
  updateSix();
}
function renderProjection(){
  svg.innerHTML="";svg.style.display="block";sixStage.style.display="none";
  if(I.workspace.projection==="LINE")drawLine();
  else if(I.workspace.projection==="RADIAL")drawRadial();
  else if(I.workspace.projection==="GLYPH")drawGlyph();
  else if(I.workspace.projection==="FLOWER_KEY")showSix("flower");
  else if(I.workspace.projection==="ROOM")showSix("room");
}
function renderNodeList(){
  $("#nodeList").innerHTML=I.fixture.nodes.map(n=>`<button class="nodeBtn ${I.workspace.focusId===n.id?"focused":""}" data-id="${esc(n.id)}"><span class="sel">${I.workspace.selectedIds.includes(n.id)?"◆":"·"}</span><span>${esc(n.label)}</span><span class="tiny">${esc(n.kind)}</span></button>`).join("");
  document.querySelectorAll(".nodeBtn").forEach(b=>b.onclick=e=>{if(e.shiftKey)I.toggleSelection(b.dataset.id);else I.focus(b.dataset.id);render()});
}
function renderResidue(){
  const hits=residueInventory(I.fixture).filter(x=>x.projection===I.workspace.projection);
  $("#residueBox").innerHTML=hits.length?hits.map(x=>`<div class="residue">${esc(x.kind)} · ${esc(x.reason)}</div>`).join(""):`<span class="good">no declared residue for this fixture</span>`;
}
function renderInspector(){
  const n=I.node(I.workspace.focusId);if(!n)return;
  const residue=residueFor(I.workspace.projection,n);
  $("#focusCard").innerHTML=`<b>${esc(n.label)}</b><div class="tiny">${esc(n.id)} · ${esc(n.kind)} · office ${esc(n.office)}</div>
  <div class="tiny">source ${esc(n.source)} · authority ${esc(n.authority)} · depth ${n.depth}</div>
  <div class="mono" style="margin-top:7px">${esc(typeof n.content==="string"?n.content:JSON.stringify(n.content))}</div>
  <div class="tiny" style="margin-top:7px">provenance ${esc(n.provenance.join(" · "))}</div>
  ${residue?`<div class="residue" style="margin-top:7px">projection residue: ${esc(residue)}</div>`:""}`;
  $("#draft").value=I.workspace.drafts[n.id]??"";
  const timed=!!n.time;$("#timeWrap").style.display=timed?"block":"none";if(timed){$("#clock").value=I.workspace.clocks[n.id]??n.time.t0;$("#clockOut").textContent=`${$("#clock").value}s · ${n.time.clock}`}
  $("#aperture").value=Math.round(I.workspace.aperture*100);$("#authority").value=I.workspace.authorityMode;
}
function render(){
  document.querySelectorAll("[data-p]").forEach(b=>b.classList.toggle("on",b.dataset.p===I.workspace.projection));
  renderProjection();renderNodeList();renderResidue();renderInspector();
  $("#focusChip").textContent="FOCUS · "+I.workspace.focusId;$("#semChip").textContent="SEM · "+I.semanticFingerprint();
  $("#domChip").textContent="SIX-DOM · SAME NODES";$("#status").textContent=I.workspace.projection+" · selected "+I.workspace.selectedIds.length+" · marks "+I.workspace.marks.length;
}
document.querySelectorAll("[data-p]").forEach(b=>b.onclick=()=>{I.checkpoint("projection");I.switchProjection(b.dataset.p);render()});
$("#returnBtn").onclick=()=>{I.doReturn();render()};
$("#draft").oninput=e=>{I.setDraft(I.workspace.focusId,e.target.value);$("#semChip").textContent="SEM · "+I.semanticFingerprint()};
$("#aperture").oninput=e=>{I.setAperture(Number(e.target.value)/100);renderProjection();$("#semChip").textContent="SEM · "+I.semanticFingerprint()};
$("#authority").onchange=e=>{I.setAuthorityMode(e.target.value);render()};
$("#selectBtn").onclick=()=>{I.toggleSelection(I.workspace.focusId);render()};
$("#markBtn").onclick=()=>{I.annotate(I.workspace.focusId,"safe annotation @ "+I.workspace.projection);render()};
$("#clock").oninput=e=>{I.setClock(I.workspace.focusId,Number(e.target.value));$("#clockOut").textContent=e.target.value+"s · "+I.node(I.workspace.focusId).time.clock;$("#semChip").textContent="SEM · "+I.semanticFingerprint()};
function domInvariant(){
  const before=Object.fromEntries(Object.entries(panelRefs).map(([k,v])=>[k,v]));
  const old=I.workspace.projection;I.switchProjection("FLOWER_KEY");showSix("flower");I.switchProjection("ROOM");showSix("room");
  const same=Object.keys(before).every(k=>before[k]===panelRefs[k]&&panelRefs[k]===originalPanelRefs[k]);
  I.switchProjection(old);return same;
}
$("#proofBtn").onclick=()=>{
  const r=runInvariantSuite(),dom=domInvariant();render();
  const rows=[...r.results,{name:"same_six_panel_dom_flower_room",pass:dom,detail:"panel element identity retained"}];
  $("#tests").innerHTML=rows.map(x=>`<div class="row"><b class="${x.pass?"pass":"fail"}">${x.pass?"PASS":"FAIL"}</b><div><b>${esc(x.name)}</b><div class="tiny">${esc(x.detail)}</div></div></div>`).join("");
  const pass=r.pass&&dom;$("#proofState").textContent=(pass?"PASS ":"FAIL ")+(r.passed+(dom?1:0))+"/"+(r.total+1);$("#proofState").className="proof "+(pass?"pass":"fail");
};
window.SPIKE3=Object.freeze({
 state:()=>I.workspaceSnapshot(),fixture:()=>JSON.parse(JSON.stringify(I.fixture)),setProjection:p=>{I.switchProjection(p);render();return I.workspaceSnapshot()},
 focus:id=>{I.focus(id);render();return I.workspaceSnapshot()},doReturn:()=>{const x=I.doReturn();render();return x},
 run:runInvariantSuite,domInvariant,panelRefs:()=>({...panelRefs})
});
render();
if(new URLSearchParams(location.search).get("proof")==="1"){$("#proofBtn").click();document.body.dataset.proof=$("#proofState").classList.contains("pass")?"pass":"fail"}
