(()=>{'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function imageRegionAddress(r){return'image://region/'+[r.x,r.y,r.w,r.h].map(v=>Number(v).toFixed(4)).join(',')}
async function mountImage(el,envelope,blob){
 el.innerHTML='';
 const wrap=document.createElement('div');wrap.className='object-image-wrap';
 const canvas=document.createElement('canvas'),meta=document.createElement('div');meta.className='object-image-meta';
 wrap.append(canvas,meta);el.append(wrap);
 const ctx=canvas.getContext('2d'),img=new Image(),url=URL.createObjectURL(blob);
 let sel=null,start=null,drag=false,raf=0;
 const api=new EventTarget();
 function resize(){
  const maxW=Math.max(240,Math.min(720,el.clientWidth||720)),ratio=img.naturalHeight/img.naturalWidth;
  canvas.width=Math.round(maxW*devicePixelRatio);canvas.height=Math.round(maxW*ratio*devicePixelRatio);
  canvas.style.width=maxW+'px';canvas.style.height=Math.round(maxW*ratio)+'px';draw();
 }
 function draw(){
  cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{
   ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
   if(sel){ctx.save();ctx.strokeStyle='#ed7245';ctx.lineWidth=Math.max(2,2*devicePixelRatio);ctx.setLineDash([6*devicePixelRatio,4*devicePixelRatio]);ctx.strokeRect(sel.x*canvas.width,sel.y*canvas.height,sel.w*canvas.width,sel.h*canvas.height);ctx.fillStyle='rgba(237,114,69,.10)';ctx.fillRect(sel.x*canvas.width,sel.y*canvas.height,sel.w*canvas.width,sel.h*canvas.height);ctx.restore();}
   meta.textContent=sel?'REGION · '+imageRegionAddress(sel):'WHOLE IMAGE · drag to address a region';
  });
 }
 function point(e){const r=canvas.getBoundingClientRect();return{x:clamp((e.clientX-r.left)/r.width,0,1),y:clamp((e.clientY-r.top)/r.height,0,1)}}
 function emit(){api.dispatchEvent(new CustomEvent('object-focus',{detail:api.snapshot()}))}
 canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);start=point(e);sel={x:start.x,y:start.y,w:0,h:0};drag=true;draw()});
 canvas.addEventListener('pointermove',e=>{if(!drag)return;const p=point(e),x=Math.min(start.x,p.x),y=Math.min(start.y,p.y);sel={x,y,w:Math.abs(p.x-start.x),h:Math.abs(p.y-start.y)};draw()});
 canvas.addEventListener('pointerup',e=>{if(!drag)return;drag=false;if(sel.w<.01||sel.h<.01)sel=null;draw();emit()});
 api.snapshot=()=>sel?{kind:'IMAGE_REGION',scale:'REGION',scale_label:'REGION',address:imageRegionAddress(sel),region:{...sel},index:0,count:1,focus:'image region'}:{kind:'IMAGE_WHOLE',scale:'WHOLE',scale_label:'WHOLE IMAGE',address:'image://whole',region:null,index:0,count:1,focus:'whole image'};
 api.clear=()=>{sel=null;draw();emit()};
 api.destroy=()=>{URL.revokeObjectURL(url);el.innerHTML=''};
 img.onload=()=>{resize();meta.textContent=envelope.label+' · '+img.naturalWidth+'×'+img.naturalHeight;emit()};
 img.onerror=()=>{meta.textContent='IMAGE DECODE FAILED';URL.revokeObjectURL(url)};
 img.src=url;window.addEventListener('resize',resize,{passive:true,once:true});
 return api;
}
window.PortObjectAperture=Object.freeze({mountImage,imageRegionAddress});
})();