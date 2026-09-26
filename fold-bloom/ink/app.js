import {InkField} from './ink-engine.js?v=0.5';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const cv=$('#paper'),g=cv.getContext('2d'),stage=$('#stage');
const IW=256,IH=170,field=new InkField({width:IW,height:IH,seed:31}),off=document.createElement('canvas'),ox=off.getContext('2d');
off.width=IW;off.height=IH;const image=ox.createImageData(IW,IH);
let W=1,H=1,DPR=1,down=false,lastX=0,lastY=0,lastT=0,strokeSeed=0,mode='SUMI',guideIndex=0,water=.62,load=.76,size=18,absorb=.58,lastStep=0,smoothPressure=.55,smoothSpeed=0;
const guides=['永','一','○',''];

function resize(){DPR=Math.min(devicePixelRatio||1,2);W=cv.clientWidth;H=cv.clientHeight;cv.width=Math.max(1,Math.round(W*DPR));cv.height=Math.max(1,Math.round(H*DPR));g.setTransform(DPR,0,0,DPR,0,0)}
addEventListener('resize',resize,{passive:true});resize();

function sync(){ $('#modeRead').textContent=mode;$('#guideRead').textContent=guides[guideIndex]||'OFF' }
$$('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;$$('[data-mode]').forEach(x=>x.classList.toggle('on',x===b));sync()});
for(const [id,set,read] of [
 ['water',v=>water=v/100,'waterVal'],['load',v=>load=v/100,'loadVal'],['size',v=>size=v,'sizeVal'],['absorb',v=>absorb=v/100,'paperVal']
]){$('#'+id).oninput=e=>{set(+e.target.value);$('#'+read).textContent=e.target.value}}
$('#clear').onclick=()=>field.clear();
$('#dry').onclick=()=>field.dry(.025);
$('#guide').onclick=()=>{guideIndex=(guideIndex+1)%guides.length;const x=guides[guideIndex];$('#guide').textContent=x?'GUIDE '+x:'GUIDE OFF';sync()};

function pointerPressure(e){
  const p=Number(e.pressure);return p>0?Math.max(.05,Math.min(1,p)):(e.pointerType==='mouse'?.56:.48);
}
function brushOpts(e,speed,flow=null,pressure=smoothPressure){
  const pointer=e.pointerType||'mouse',minDim=Math.max(1,Math.min(W,H));$('#pointerRead').textContent=(pointer==='pen'?'PEN · PRESSURE/TILT':pointer.toUpperCase());
  return {speed,pressure,tiltX:e.tiltX||0,tiltY:e.tiltY||0,size:.018+size/42*.095,water,load,mode,strokeSeed,metricX:minDim/Math.max(1,W),metricY:minDim/Math.max(1,H),...(flow==null?{}:{flow})};
}
cv.addEventListener('pointerdown',e=>{
  const r=cv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top,t=Number(e.timeStamp)||performance.now();
  down=true;lastX=x;lastY=y;lastT=t;strokeSeed=(strokeSeed+1)>>>0;smoothPressure=pointerPressure(e);smoothSpeed=0;
  field.deposit(x/Math.max(1,W),y/Math.max(1,H),brushOpts(e,0,.28,smoothPressure));cv.setPointerCapture?.(e.pointerId)
});
cv.addEventListener('pointermove',e=>{
  if(!down)return;e.preventDefault();
  const r=cv.getBoundingClientRect(),coalesced=e.getCoalescedEvents?.(),points=coalesced?.length?coalesced:[e];
  for(const p of points){
    const x=p.clientX-r.left,y=p.clientY-r.top,t=Number(p.timeStamp)||performance.now(),dt=Math.max(2,t-lastT),rawSpeed=Math.hypot(x-lastX,y-lastY)/(dt/16.7);
    smoothSpeed+=(Math.min(42,rawSpeed)-smoothSpeed)*.28;smoothPressure+=(pointerPressure(p)-smoothPressure)*.38;
    field.strokeSegment(lastX/Math.max(1,W),lastY/Math.max(1,H),x/Math.max(1,W),y/Math.max(1,H),brushOpts(p,smoothSpeed,null,smoothPressure));
    lastX=x;lastY=y;lastT=t;
  }
},{passive:false});
const up=()=>{down=false;smoothSpeed=0};cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);

function render(t){
  if(t-lastStep>24){field.step({bleed:1,absorb:.25+absorb*1.05,evaporation:.0045+.004*absorb});lastStep=t}
  image.data.set(field.rgba({warmth:.11}));ox.putImageData(image,0,0);g.clearRect(0,0,W,H);g.imageSmoothingEnabled=true;g.drawImage(off,0,0,W,H);
  const mark=guides[guideIndex];if(mark){g.save();g.globalAlpha=.09;g.fillStyle='#34444a';g.textAlign='center';g.textBaseline='middle';g.font='900 '+Math.min(W,H)*.54+'px "Noto Serif CJK SC","Songti SC",serif';g.fillText(mark,W/2,H/2);g.restore()}
  requestAnimationFrame(render)
}
requestAnimationFrame(render);

$('#export').onclick=()=>{const outCv=document.createElement('canvas');outCv.width=Math.round(W*DPR);outCv.height=Math.round(H*DPR);const q=outCv.getContext('2d');q.scale(DPR,DPR);q.drawImage(cv,0,0,W,H);outCv.toBlob(blob=>{if(!blob)return;const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='fold-bloom-ink-'+Date.now()+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)},'image/png')};

const params=new URLSearchParams(location.search),m=String(params.get('mode')||'SUMI').toUpperCase();
if(['SUMI','DRY','WASH'].includes(m)){mode=m;$$('[data-mode]').forEach(x=>x.classList.toggle('on',x.dataset.mode===m))}
const qg=params.get('guide');if(qg!==null){const i=guides.indexOf(qg);if(i>=0)guideIndex=i}
sync();
document.documentElement.dataset.foldBloomInk='ready';
window.FoldBloomInk={field,mode:()=>mode,metrics:()=>field.metrics(),clear:()=>field.clear(),dry:()=>field.dry(.025)};
