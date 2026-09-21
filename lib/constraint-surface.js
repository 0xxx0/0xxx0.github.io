(function(root){'use strict';
const ANY='ANY';
const arr=v=>Array.isArray(v)?v:(v==null?[]:[v]);
function dimKey(d){return typeof d==='string'?d:d.key}
function defaultValues(record,key){
  const v=record==null?undefined:record[key];
  return arr(v).map(String);
}
function matchRecord(record,dimensions,selection,getValues,predicate,overrideKey,overrideValue){
  if(predicate&&!predicate(record))return false;
  for(const d of dimensions||[]){
    const key=dimKey(d);
    const wanted=key===overrideKey?overrideValue:(selection&&selection[key]!=null?selection[key]:ANY);
    if(wanted===ANY)continue;
    const values=(getValues||defaultValues)(record,key,d);
    if(!arr(values).map(String).includes(String(wanted)))return false;
  }
  return true;
}
function survivors(records,dimensions,selection,getValues,predicate){
  return (records||[]).filter(r=>matchRecord(r,dimensions,selection,getValues,predicate));
}
function support(records,dimensions,selection,candidateKey,candidateValue,getValues,predicate){
  let n=0;
  for(const r of records||[])if(matchRecord(r,dimensions,selection,getValues,predicate,candidateKey,candidateValue))n++;
  return n;
}
function supports(records,dimensions,selection,key,values,getValues,predicate){
  return (values||[]).map(v=>support(records,dimensions,selection,key,v,getValues,predicate));
}
function candidates(records,dimension,getValues){
  const key=dimKey(dimension),declared=typeof dimension==='object'&&Array.isArray(dimension.values)?dimension.values:null;
  if(declared)return [...declared];
  const out=new Set();
  for(const r of records||[])for(const v of arr((getValues||defaultValues)(r,key,dimension)))out.add(String(v));
  return [ANY,...[...out].filter(v=>v!==ANY).sort((a,b)=>a.localeCompare(b))];
}
function status(count){return count===0?'DEAD':count===1?'LOCK':'LIVE'}
function explain(record,dimensions,getValues){
  const out={};
  for(const d of dimensions||[]){const key=dimKey(d);out[key]=arr((getValues||defaultValues)(record,key,d)).map(String)}
  return out;
}
function evaluate(config){
  const records=config.records||[],dimensions=config.dimensions||[],selection=config.selection||{},getValues=config.getValues||defaultValues,predicate=config.predicate;
  const live=survivors(records,dimensions,selection,getValues,predicate),matrix={};
  for(const d of dimensions){
    const key=dimKey(d),vals=candidates(records,d,getValues);
    matrix[key]=Object.fromEntries(vals.map(v=>[v,support(records,dimensions,selection,key,v,getValues,predicate)]));
  }
  return {selection:{...selection},survivors:live,support:matrix,status:status(live.length)};
}
const api=Object.freeze({version:'0.1',ANY,survivors,support,supports,candidates,status,explain,evaluate});
root.ConstraintSurfaceCore=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
