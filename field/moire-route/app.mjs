import {makeFixture,nodeCue,routeChoiceAccuracy,plainAdjacencyBaseline,continuitySignal,phaseSweep,localFrame,TAU} from "./core.mjs";
const f=makeFixture(), q=s=>document.querySelector(s), phase=q("#phase"), rot=q("#rot");
const mc=q("#moire").getContext("2d"), ac=q("#adj").getContext("2d"), sc=q("#sweep").getContext("2d");
let reveal=false, sweep=phaseSweep(f,{orientation:0});
const C=100, P=id=>{const {x,y}=f.coords.get(id);return {x:x*C+C/2,y:y*C+C/2}};
const edgeKey=(a,b)=>a<b?a+"|"+b:b+"|"+a;
const routeEdges=new Set(f.route.slice(0,-1).map((x,i)=>edgeKey(x,f.route[i+1])));

function drawM(){
  const ph=+phase.value/100, ro=(+rot.value/40)*(Math.PI/2);
  mc.clearRect(0,0,600,600);mc.fillStyle="#080b0d";mc.fillRect(0,0,600,600);
  for(const [id,p] of f.coords){
    const cue=nodeCue(f,id,ph,ro), fr=localFrame(f,id);
    const x=p.x*C,y=p.y*C;
    mc.fillStyle=`rgba(120,190,210,${0.03+cue*0.18})`;mc.fillRect(x,y,C,C);
    mc.save();mc.beginPath();mc.rect(x,y,C,C);mc.clip();mc.translate(x+C/2,y+C/2);
    const phasePx=(fr.phaseOffset+ph)*10;
    mc.rotate(fr.route?ro:fr.angleOffset+ro);
    mc.strokeStyle=`rgba(230,230,220,${0.10+cue*0.32})`;mc.lineWidth=1;
    for(let z=-140;z<140;z+=9){mc.beginPath();mc.moveTo(z+phasePx,-90);mc.lineTo(z+phasePx,90);mc.stroke()}
    mc.rotate(fr.route?0:-(fr.angleOffset*0.55));
    mc.strokeStyle=`rgba(130,205,220,${0.09+cue*0.28})`;
    for(let z=-140;z<140;z+=10){mc.beginPath();mc.moveTo(-90,z-phasePx);mc.lineTo(90,z-phasePx);mc.stroke()}
    mc.restore();
  }
  mc.strokeStyle="rgba(255,255,255,.08)";for(let i=0;i<=6;i++){mc.beginPath();mc.moveTo(i*C,0);mc.lineTo(i*C,600);mc.stroke();mc.beginPath();mc.moveTo(0,i*C);mc.lineTo(600,i*C);mc.stroke()}
  if(reveal){mc.strokeStyle="rgba(186,80,57,.9)";mc.lineWidth=4;mc.beginPath();f.route.forEach((id,i)=>{const p=P(id);i?mc.lineTo(p.x,p.y):mc.moveTo(p.x,p.y)});mc.stroke()}
  mark(mc,f.start,"S","#9fd6a5");mark(mc,f.end,"E","#eaa1b5");
}
function drawA(){
  ac.clearRect(0,0,600,600);ac.fillStyle="#080b0d";ac.fillRect(0,0,600,600);ac.lineCap="round";
  for(const [a,ns] of f.edges)for(const b of ns)if(a<b){const A=P(a),B=P(b);ac.strokeStyle=reveal&&routeEdges.has(edgeKey(a,b))?"#ba5039":"#697278";ac.lineWidth=reveal&&routeEdges.has(edgeKey(a,b))?5:2;ac.beginPath();ac.moveTo(A.x,A.y);ac.lineTo(B.x,B.y);ac.stroke()}
  for(const id of f.edges.keys()){const p=P(id);ac.fillStyle="#d6d7d3";ac.beginPath();ac.arc(p.x,p.y,5,0,TAU);ac.fill()}
  mark(ac,f.start,"S","#9fd6a5");mark(ac,f.end,"E","#eaa1b5");
}
function mark(c,id,t,color){const p=P(id);c.fillStyle=color;c.beginPath();c.arc(p.x,p.y,15,0,TAU);c.fill();c.fillStyle="#071012";c.font="bold 13px monospace";c.textAlign="center";c.textBaseline="middle";c.fillText(t,p.x,p.y)}
function drawSweep(){
  const base=plainAdjacencyBaseline(f).localChoiceChance,w=1000,h=220,pad=24;
  sc.clearRect(0,0,w,h);sc.fillStyle="#080b0d";sc.fillRect(0,0,w,h);
  sc.strokeStyle="rgba(255,255,255,.09)";for(let i=0;i<=4;i++){const y=pad+(h-2*pad)*i/4;sc.beginPath();sc.moveTo(pad,y);sc.lineTo(w-pad,y);sc.stroke()}
  const by=pad+(h-2*pad)*(1-base);sc.strokeStyle="#9fd6a5";sc.lineWidth=2;sc.beginPath();sc.moveTo(pad,by);sc.lineTo(w-pad,by);sc.stroke();
  sc.strokeStyle="#86c8d8";sc.lineWidth=3;sc.beginPath();sweep.rows.forEach((r,i)=>{const x=pad+(w-2*pad)*i/(sweep.rows.length-1),y=pad+(h-2*pad)*(1-r.choice.accuracy);i?sc.lineTo(x,y):sc.moveTo(x,y)});sc.stroke();
}
function render(){
  const ph=+phase.value/100, ro=(+rot.value/40)*(Math.PI/2), choice=routeChoiceAccuracy(f,ph,ro), base=plainAdjacencyBaseline(f), cont=continuitySignal(f,ph,ro);
  q("#phaseV").textContent=ph.toFixed(2)+" rad";q("#rotV").textContent=(ro*180/Math.PI).toFixed(1)+"°";q("#acc").textContent=choice.accuracy.toFixed(2);q("#base").textContent=base.localChoiceChance.toFixed(2);q("#cont").textContent=cont.toFixed(2);
  const d=choice.accuracy-base.localChoiceChance;q("#result").textContent=(d>=0?"+":"")+d.toFixed(2);q("#result").className=d>0.12?"pass":d<0?"fail":"";
  drawM();drawA();drawSweep();
}
phase.oninput=render;rot.oninput=()=>{sweep=phaseSweep(f,{orientation:(+rot.value/40)*(Math.PI/2)});render()};
q("#best").onclick=()=>{phase.value=Math.round(sweep.best.phase*100);render()};q("#worst").onclick=()=>{phase.value=Math.round(sweep.worst.phase*100);render()};q("#reveal").onclick=()=>{reveal=!reveal;render()};
render();
