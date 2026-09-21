(()=>{'use strict';
if(!globalThis.ConstraintSurfaceCore)throw new Error('ConstraintSurfaceCore missing');
const C=globalThis.ConstraintSurfaceCore;
function support(records,keys,selected,candidateKey,candidateValue,match,recordPredicate){
  return C.support(records,keys,selected,candidateKey,candidateValue,(rec,key)=> {
    const wanted=key===candidateKey?candidateValue:selected[key];
    return wanted==='ANY'?['ANY']:(match(rec,key,wanted)?[wanted]:[]);
  },recordPredicate);
}
function supports(records,keys,selected,key,values,match,recordPredicate){
  return (values||[]).map(v=>{
    let n=0;
    for(const rec of records||[]){
      if(recordPredicate&&!recordPredicate(rec))continue;
      let ok=true;
      for(const k of keys||[]){const wanted=k===key?v:selected[k];if(!match(rec,k,wanted)){ok=false;break}}
      if(ok)n++;
    }
    return n;
  });
}
function position(values,index){const n=Math.max(0,(values||[]).length),i=n?((Number(index)%n+n)%n):0;return{index:i,ordinal:n?i+1:0,total:n,label:n?String(i+1).padStart(String(n).length,'0')+'/'+n:'0/0'}}
function angle(index,total,rotation=0){total=Math.max(1,Number(total)||1);return-Math.PI/2+(Number(index)||0)*(Math.PI*2/total)+(Number(rotation)||0)}
window.AxialFocusCore={version:'0.2',support,supports,position,angle,constraintSurface:C};
})();