import {drumSlots,stepIndex,stageItems,pathLabel} from './compositor-kernel.mjs';
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
    <button class="comp-center" type="button"><b>ROOT</b><small>same object</small></button>
    <div class="comp-wheel" id="compositorWheel" role="group" aria-label="Rotary TURN choices: arrows rotate, Enter selects" tabindex="0">
      <div class="comp-items"></div>
    </div>
    <div class="comp-readout" role="status" aria-live="polite" aria-atomic="true"></div>
    <div class="comp-foot"><button type="button" class="comp-back">← ROOT</button><span>↕ ROTATE · ENTER SELECTS</span><button type="button" class="comp-unfold" aria-expanded="false">UNFOLD LIST</button></div>
    <div class="comp-confirm" hidden><span>RETURN LAST EDIT?</span><button type="button" class="comp-commit">COMMIT RETURN</button><button type="button" class="comp-cancel">CANCEL</button></div>`;
  nativeModes.insertAdjacentElement('beforebegin',host);
  document.body.classList.add('compositor-ready');
  const wheel=host.querySelector('#compositorWheel'),itemsEl=host.querySelector('.comp-items');
  const center=host.querySelector('.comp-center'),back=host.querySelector('.comp-back');
  const unfold=host.querySelector('.comp-unfold'),confirm=host.querySelector('.comp-confirm');
  const commit=host.querySelector('.comp-commit'),cancel=host.querySelector('.comp-cancel');
  let stage='ROOT',active=0,unfolded=false,gesture=null,wheelDelta=0,suppressClick=false,itemsKey='';
  const mode=()=>document.querySelector('.mode.active')?.dataset.mode||'COMPACT';
  const focusObject=()=>({id:document.querySelector('#railId')?.textContent?.trim()||'—',title:document.querySelector('#focusTitle')?.textContent?.trim()||'INTERPHASE'});
  const currentItems=()=>stage==='FIND'
    ?[...nativeResults.querySelectorAll('[data-address],[data-view]')].map((b,i)=>({id:b.dataset.view||'ROUTE:'+i,label:(b.childNodes[0]?.textContent||b.textContent||'OBJECT').trim(),hint:b.dataset.address||'view of the same object',address:b.dataset.address,native:b}))
    :stageItems(stage);
  function nativeView(id){return document.querySelector(`.mode[data-mode="${CSS.escape(id)}"]`)}
  function setStage(next){
    stage=next;active=0;confirm.hidden=true;wheelDelta=0;
    if(stage==='FIND'){omni.dispatchEvent(new Event('input'));omni.focus();omni.select()}
    render();if(stage!=='FIND')wheel.focus();
  }
  function choose(item){
    if(!item)return;
    if(stage==='ROOT')return setStage(item.id);
    if(stage==='VIEW'){stage='ROOT';active=0;nativeView(item.id)?.click();render();return}
    if(stage==='FIND'){
      const keep=mode();stage='ROOT';active=0;item.native?.click();
      if(item.address&&keep!=='COMPACT')nativeView(keep)?.click();render();return;
    }
    if(stage==='RETURN'){
      if(item.id==='HISTORY'){stage='ROOT';active=0;nativeView('DISC')?.click();render();return}
      if(item.id==='LAST'){confirm.hidden=false;commit.focus()}
    }
  }
  function rotate(dir){
    const xs=currentItems();if(!xs.length)return;
    active=stepIndex(active,dir,xs.length);render();
  }
  function render(){
    const xs=currentItems();active=xs.length?Math.max(0,Math.min(active,xs.length-1)):0;
    const slots=drumSlots(xs,active),f=focusObject();
    const nextKey=JSON.stringify(xs.map(x=>[x.id,x.label,x.hint,x.address]));
    if(nextKey!==itemsKey){itemsKey=nextKey;itemsEl.innerHTML=slots.map(({index,angle,visible,item})=>`<button type="button" class="comp-item ${index===active?'active':''}" style="--angle:${angle}deg" data-comp-index="${index}" ${item.address?`data-comp-address="${esc(item.address)}"`:''} data-comp-action="${esc(item.id)}" ${visible?'':'hidden inert'} tabindex="-1" aria-label="${esc(item.label+' · '+(item.hint||''))}" ${index===active?'aria-current="true"':''}><b>${esc(item.label)}</b><small>${esc(item.hint||'')}</small></button>`).join('');}
    itemsEl.querySelectorAll('[data-comp-index]').forEach((b,i)=>{
      const slot=slots[i];b.style.setProperty('--angle',slot.angle+'deg');b.hidden=!slot.visible;b.inert=!slot.visible;
      b.classList.toggle('active',i===active);if(i===active)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current');
    });
    host.querySelector('#compPath').textContent=pathLabel({stage,mode:mode(),query:omni.value,total:xs.length});
    host.querySelector('#compCount').textContent=stage==='ROOT'?String(xs.length):`${xs.length?active+1:0} / ${xs.length}`;
    center.innerHTML=`<b>${esc(f.title)}</b><small>${esc(f.id)}</small>`;
    center.title=stage==='ROOT'?'Close TURN':'Return to the three root choices';
    host.querySelector('.comp-readout').textContent=xs[active]?`${xs[active].label} · ${xs[active].hint||''}`:'No matches. Change the query.';
    back.hidden=stage==='ROOT';wheel.dataset.stage=stage;wheel.dataset.active=String(active);
    if(!xs.length)itemsEl.innerHTML='<div class="comp-empty">NO MATCHES</div>';
  }
  itemsEl.addEventListener('click',e=>{
    if(suppressClick){suppressClick=false;return}
    const b=e.target.closest('[data-comp-index]');if(!b)return;
    active=Number(b.dataset.compIndex);choose(currentItems()[active]);
  });
  center.onclick=()=>stage==='ROOT'?control.removeAttribute('open'):setStage('ROOT');
  back.onclick=()=>setStage('ROOT');
  unfold.onclick=()=>{unfolded=!unfolded;body.classList.toggle('compositor-unfold',unfolded);unfold.setAttribute('aria-expanded',String(unfolded));unfold.textContent=unfolded?'FOLD LIST':'UNFOLD LIST'};
  commit.onclick=()=>{confirm.hidden=true;stage='ROOT';document.querySelector('#returnBtn')?.click();render()};
  cancel.onclick=()=>{confirm.hidden=true;wheel.focus()};
  omni.addEventListener('input',()=>queueMicrotask(()=>{stage='FIND';active=0;confirm.hidden=true;render()}));
  omni.addEventListener('keydown',e=>{
    if(stage!=='FIND'||unfolded)return;
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();rotate(e.key==='ArrowDown'?1:-1)}
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();setStage('ROOT')}
  });
  document.querySelector('#omniForm').addEventListener('submit',e=>{
    if(stage!=='FIND'||unfolded)return;
    e.preventDefault();e.stopImmediatePropagation();choose(currentItems()[active]);
  },true);
  nativeResults.addEventListener('click',()=>queueMicrotask(render));
  control.addEventListener('toggle',()=>{if(control.open){stage='ROOT';active=0;render()}});
  new MutationObserver(()=>{if(stage==='FIND')render()}).observe(nativeResults,{childList:true});
  const railId=document.querySelector('#railId');if(railId)new MutationObserver(()=>{if(control.open)render()}).observe(railId,{childList:true,characterData:true,subtree:true});
  wheel.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&stage!=='ROOT'){e.preventDefault();e.stopPropagation();setStage('ROOT');return}
    if(['ArrowRight','ArrowDown','ArrowLeft','ArrowUp'].includes(e.key)){e.preventDefault();rotate(['ArrowRight','ArrowDown'].includes(e.key)?1:-1)}
    else if(e.key==='Home'){e.preventDefault();active=0;render()}
    else if(e.key==='End'){e.preventDefault();active=Math.max(0,currentItems().length-1);render()}
    else if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(currentItems()[active])}
  });
  wheel.addEventListener('wheel',e=>{
    if(e.ctrlKey||!currentItems().length)return;
    e.preventDefault();wheelDelta+=(e.deltaY||e.deltaX)*(e.deltaMode===1?16:1);
    if(Math.abs(wheelDelta)>=24){rotate(Math.sign(wheelDelta));wheelDelta=0}
  },{passive:false});
  wheel.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;
    suppressClick=false;gesture={id:e.pointerId,y:e.clientY,moved:false,steps:0};
  });
  wheel.addEventListener('pointermove',e=>{
    if(!gesture||gesture.id!==e.pointerId)return;
    const dy=gesture.y-e.clientY;if(Math.abs(dy)<8)return;
    if(!gesture.moved){gesture.moved=true;wheel.setPointerCapture(e.pointerId)}
    const steps=Math.trunc(dy/44),delta=steps-gesture.steps;
    if(delta){for(let n=0;n<Math.min(20,Math.abs(delta));n++)rotate(Math.sign(delta));gesture.steps=steps}
  });
  wheel.addEventListener('pointerup',e=>{
    if(!gesture||gesture.id!==e.pointerId)return;
    suppressClick=gesture.moved;gesture=null;
    if(wheel.hasPointerCapture(e.pointerId))wheel.releasePointerCapture(e.pointerId);
  });
  wheel.addEventListener('pointercancel',()=>{gesture=null;suppressClick=false});
  render();
}
