import {ring as R} from '../lib/interphase.mjs';

export const SCHEMA='interphase-compositor/v0.1';
export const ROOT=Object.freeze([
  Object.freeze({id:'VIEW',label:'VIEW',hint:'project the same thing'}),
  Object.freeze({id:'FIND',label:'FIND',hint:'narrow the field'}),
  Object.freeze({id:'RETURN',label:'RETURN',hint:'history before effect'})
]);
export const VIEWS=Object.freeze([
  Object.freeze({id:'COMPACT',label:'FOCUS',hint:'read / edit'}),
  Object.freeze({id:'PLAIN',label:'SOURCE',hint:'plain witness'}),
  Object.freeze({id:'FIELD',label:'ROOM',hint:'spatial view'}),
  Object.freeze({id:'DISC',label:'HISTORY',hint:'causal receipts'}),
  Object.freeze({id:'DAYLINE',label:'DAYLINE',hint:'linear time'}),
  Object.freeze({id:'FAN',label:'FAN',hint:'folded time'}),
  Object.freeze({id:'AXIS',label:'AXIS',hint:'constrain set'}),
  Object.freeze({id:'RESEARCH',label:'Ω 0.4',hint:'deep source'})
]);
export const RETURN=Object.freeze([
  Object.freeze({id:'HISTORY',label:'HISTORY',hint:'preview receipts'}),
  Object.freeze({id:'LAST',label:'LAST EDIT',hint:'explicit commit'})
]);

const norm=s=>String(s??'').trim().toLowerCase();
export function routeMatches(routes,query,{limit=8}={}){
  const q=norm(query);
  if(!q)return {items:[],total:0,overflow:0};
  const xs=(Array.isArray(routes)?routes:[]).filter(r=>norm(`${r?.title||''} ${r?.href||''}`).includes(q));
  const items=xs.slice(0,Math.max(1,Math.trunc(limit)||8));
  return Object.freeze({items,total:xs.length,overflow:Math.max(0,xs.length-items.length)});
}

export function radialSlots(items,{rotation=0,phase=-Math.PI/2,radius=.39}={}){
  const xs=Array.from(items||[]);
  if(xs.length===0)return [];
  if(xs.length===1)return [Object.freeze({index:0,angle:phase+rotation,x:.5,y:.5-radius,item:xs[0]})];
  return R.slots(xs.length,{rotation,phase}).map(s=>Object.freeze({
    index:s.index,angle:s.angle,x:.5+Math.cos(s.angle)*radius,y:.5+Math.sin(s.angle)*radius,item:xs[s.index]
  }));
}

export function pointIndex(x,y,cx,cy,count,{rotation=0,phase=-Math.PI/2}={}){
  const n=Math.trunc(Number(count)||0);
  if(n<=1)return n===1?0:-1;
  return R.pointIndex(x,y,cx,cy,n,{rotation,phase});
}

export function stepIndex(index,dir,count){
  const n=Math.trunc(Number(count)||0);
  if(n<=0)return -1;
  return R.wrap((Math.trunc(Number(index)||0)+Math.sign(Number(dir)||0)),n);
}

export function stageItems(stage){
  if(stage==='VIEW')return VIEWS;
  if(stage==='RETURN')return RETURN;
  return ROOT;
}

export function pathLabel({stage='ROOT',mode='COMPACT',query='',total=0}={}){
  if(stage==='VIEW')return `TURN › VIEW › ${mode}`;
  if(stage==='FIND')return query?`TURN › FIND › ${total}`:'TURN › FIND › ∞→?';
  if(stage==='RETURN')return 'TURN › RETURN › PREVIEW';
  return `TURN › ${mode}`;
}

export default Object.freeze({SCHEMA,ROOT,VIEWS,RETURN,routeMatches,radialSlots,pointIndex,stepIndex,stageItems,pathLabel});