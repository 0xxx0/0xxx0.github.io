import {radialSlots,pointIndex,stepIndex,stageItems,pathLabel} from './compositor-kernel.mjs';
import {esc} from '../lib/dom.js';

const control=document.querySelector('#control');
const omni=document.querySelector('#omnibar');
const nativeResults=document.querySelector('#omniResults');
const nativeModes=document.querySelector('.modes');
if(control&&omni&&nativeResults&&nativeModes){
  const body=control.querySelector('.control-body');
  const host=document.createElement('section');
  host.className='compositor';
  host.setAttribute('aria-label','TURN compositor');
  host.innerHTML=`
    <div class="comp-head"><span id="compPath">TURN</span><span id="compCount">3</span></div>
    <div class="comp-wheel" id="compositorWheel" role="group" aria-label="Radial TURN choices" tabindex="0">
      <div class="comp-items"></div>
      <button class="comp-center" type="button"><b>ROOT</b><small>same object</small></button>
    </div>
    <div class="comp-foot"><button type="button" class="comp-back">← ROOT</button><button type="button" class="comp-unfold" aria-expanded="false">UNFOLD LIST</button></div>
    <div class="comp-confirm" hidden><span>RETURN LAST EDIT?</span><button type="button" class="comp-commit">COMMIT RETURN</button><button type="button" class="comp-cancel">CANCEL</button></div>`;
  nativeModes.insertAdjacentElement('beforebegin',host);
  document.body.classList.add('compositor-ready');

  const wheel=host.querySelector('#compositorWheel');
  const itemsEl=host.querySelector('.comp-items');
  const center=host.querySelector('.comp-center');
  const back=host.querySelector('.comp-back');
  const unfold=host.querySelector('.comp-unfold');
  const confirm=host.querySelector('.comp-confirm');
  const commit=host.querySelector('.comp-commit');
  const cancel=host.querySelector('.comp-cancel');
  let stage='ROOT',active=0,unfolded=false,gesture=null;

  const mode=()=>document.querySelector('.mode.active')?.dataset.mode||String(document.querySelector('#viewLabel')?.textContent||'COMPACT').trim().toUpperCase();
  const focusObject=()=>({id:document.querySelector('#railId')?.textContent?.trim()||'—',title:document.querySelector('#focusTitle')?.textContent?.trim()||'INTERPHASE'});
  const routeButtons=()=>[...nativeResults.querySelectorAll('[data-address]')].slice(0,8);
  const currentItems=()=>{
    if(stage==='FIND')return routeButtons().map((b,i)=>({id:'ROUTE:'+i,label:(b.childNodes[0]?.textContent||b.textContent||'OBJECT').trim().slice(0,18),hint:b.dataset.address||'',address:b.dataset.address,native:b}));
    return stageItems(stage);
  };
  function setStage(next){stage=next;active=0;confirm.hidden=true;if(stage==='FIND'){omni.focus();omni.select()}render()}
  function nativeView(id){return document.querySelector(`.mode[data-mode="${CSS.escape(id)}"]`)}
  function choose(item){
    if(!item)return;
    if(stage==='ROOT'){
      if(item.id==='VIEW')return setStage('VIEW');
      if(item.id==='FIND')return setStage('FIND');
      if(item.id==='RETURN')return setStage('RETURN');
    }
    if(stage==='VIEW'){
      stage='ROOT';active=0;nativeView(item.id)?.click();return;
    }
    if(stage==='FIND'){
      const keep=mode();stage='ROOT';active=0;item.native?.click();
      if(keep&&keep!=='COMPACT')nativeView(keep)?.click();return;
    }
    if(stage==='RETURN'){
      if(item.id==='HISTORY'){stage='ROOT';active=0;nativeView('DISC')?.click();return}
      if(item.id==='LAST'){confirm.hidden=false;commit.focus();return}
    }
  }
  function render(){
    const xs=currentItems();active=xs.length?Math.max(0,Math.min(active,xs.length-1)):0;
    const slots=radialSlots(xs);
    itemsEl.innerHTML=slots.map(({index,x,y,item})=>`<button type="button" class="comp-item ${index===active?'active':''}" style="--x:${(x*100).toFixed(3)}%;--y:${(y*100).toFixed(3)}%" data-comp-index="${index}" ${item.address?`data-comp-address="${esc(item.address)}"`:''} data-comp-action="${esc(item.id)}"><b>${esc(item.label)}</b><small>${esc(item.hint||'')}</small></button>`).join('');
    itemsEl.querySelectorAll('.comp-item').forEach(b=>b.onclick=()=>{active=Number(b.dataset.compIndex);choose(xs[active])});
    const f=focusObject(),count=stage==='FIND'?nativeResults.querySelectorAll('[data-address]').length:xs.length;
    host.querySelector('#compPath').textContent=pathLabel({stage,mode:mode(),query:omni.value,total:count});
    host.querySelector('#compCount').textContent=stage==='FIND'?(count>8?`8 / ${count}`:String(count)):String(xs.length);
    center.innerHTML=stage==='ROOT'?`<b>${esc(f.title.slice(0,22))}</b><small>${esc(f.id)}</small>`:`<b>← ${esc(stage)}</b><small>${esc(f.title.slice(0,22))}</small>`;
    back.hidden=stage==='ROOT';
    wheel.dataset.stage=stage;
    if(stage==='FIND'&&!xs.length)itemsEl.innerHTML='<div class="comp-empty">TYPE TO NARROW ∞<small>results stay linear when the ring would lie</small></div>';
  }
  center.onclick=()=>stage==='ROOT'?control.removeAttribute('open'):setStage('ROOT');
  back.onclick=()=>setStage('ROOT');
  unfold.onclick=()=>{unfolded=!unfolded;body.classList.toggle('compositor-unfold',unfolded);unfold.setAttribute('aria-expanded',String(unfolded));unfold.textContent=unfolded?'FOLD LIST':'UNFOLD LIST'};
  commit.onclick=()=>{confirm.hidden=true;stage='ROOT';document.querySelector('#returnBtn')?.click();render()};
  cancel.onclick=()=>{confirm.hidden=true;wheel.focus()};

  omni.addEventListener('input',()=>queueMicrotask(()=>{if(stage!=='FIND')stage='FIND';active=0;render()}));
  nativeResults.addEventListener('click',()=>queueMicrotask(render));
  control.addEventListener('toggle',()=>{if(control.open){stage='ROOT';active=0;render()}});
  new MutationObserver(()=>{if(stage==='FIND')render()}).observe(nativeResults,{childList:true});
  const railId=document.querySelector('#railId');if(railId)new MutationObserver(()=>{if(control.open)render()}).observe(railId,{childList:true,characterData:true,subtree:true});

  wheel.addEventListener('keydown',e=>{
    const xs=currentItems();
    if(e.key==='Escape'&&stage!=='ROOT'){e.preventDefault();e.stopPropagation();setStage('ROOT');return}
    if(!xs.length)return;
    if(['ArrowRight','ArrowDown'].includes(e.key)){e.preventDefault();active=stepIndex(active,1,xs.length);render();wheel.focus()}
    else if(['ArrowLeft','ArrowUp'].includes(e.key)){e.preventDefault();active=stepIndex(active,-1,xs.length);render();wheel.focus()}
    else if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(xs[active])}
  });
  wheel.addEventListener('pointerdown',e=>{
    if(e.target.closest('button'))return;
    const r=wheel.getBoundingClientRect();gesture={id:e.pointerId,cx:r.left+r.width/2,cy:r.top+r.height/2,x:e.clientX,y:e.clientY,index:-1};wheel.setPointerCapture(e.pointerId);
  });
  wheel.addEventListener('pointermove',e=>{
    if(!gesture||gesture.id!==e.pointerId)return;
    const xs=currentItems();if(!xs.length)return;
    gesture.index=pointIndex(e.clientX,e.clientY,gesture.cx,gesture.cy,xs.length);
    active=gesture.index;render();
  });
  const endGesture=e=>{
    if(!gesture||gesture.id!==e.pointerId)return;
    const g=gesture;gesture=null;const moved=Math.hypot(e.clientX-g.x,e.clientY-g.y);
    if(moved>24&&g.index>=0)choose(currentItems()[g.index]);
  };
  wheel.addEventListener('pointerup',endGesture);wheel.addEventListener('pointercancel',()=>{gesture=null});

  render();
}
