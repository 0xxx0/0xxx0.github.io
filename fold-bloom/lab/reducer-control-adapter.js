(()=>{'use strict';
const support=document.getElementById('stateReduceSupport');
const ret=document.getElementById('stateReduceReturn');
if(!support||!ret)return;

const resolved=/^SUPPORT · C=(\d+)/;
const sync=()=>{
  const hit=String(support.textContent||'').match(resolved);
  if(hit){
    const count=Math.max(0,Math.trunc(Number(hit[1])||0));
    const state=count===0?'NONE':count===1?'VIEW':'AMBIG';
    const label='SUPPORT · C='+count+' · '+state;
    if(support.textContent!==label)support.textContent=label;
    if(support.disabled)support.disabled=false;
    support.dataset.supportOutcome=state.toLowerCase();
    support.setAttribute('aria-label',count===0
      ?'Support resolved: no lawful native candidate. Inspect no-match result; no commit.'
      :count===1
        ?'Support resolved: one lawful native candidate. Inspect view-only focus; no commit.'
        :'Support resolved: '+count+' lawful native candidates. Inspect preserved ambiguity; no auto-choice or commit.');
    support.title=count===0
      ?'Resolved C=0 · inspect NO LAWFUL MATCH · no focus / no commit'
      :count===1
        ?'Resolved C=1 · VIEW ONLY · one already-lawful native candidate may be focused · no commit'
        :'Resolved C='+count+' · AMBIGUITY PRESERVED · no auto-focus / no commit';
  }else{
    support.removeAttribute('data-support-outcome');
    support.setAttribute('aria-label','Support unresolved: waiting for an authority-none direction and current native aperture.');
    support.title='Requires current native aperture + authority-NONE steering witness';
  }
  const returnLabel='RETURN · RESET';
  if(ret.textContent!==returnLabel)ret.textContent=returnLabel;
  ret.setAttribute('aria-label','Return: reset STEP preview and native focus; leave LIVE untouched.');
  ret.title='Reset preview + native focus · LIVE untouched';
};

const observer=new MutationObserver(sync);
observer.observe(support,{attributes:true,childList:true,subtree:true,attributeFilter:['disabled']});
sync();
document.documentElement.dataset.fieldLabReducerControls='operable';
})();
