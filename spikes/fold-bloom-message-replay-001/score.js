export const SCORE_SCHEMA='fold-bloom-message-score/v0.1';
export const OP_TYPES=['COMPRESS','DROP','BLOOM','SPLIT','MESSAGE','RETURN'];

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number(v)||0));
const round=(v,n=5)=>Number(Number(v).toFixed(n));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
const opWindow=(p,op)=>{
  const span=Math.max(.02,Math.min(.35,Number(op.span)||.12));
  const d=Math.abs(p-clamp(op.at));
  return d>=span?0:smooth(1-d/span);
};

export function defaultScore(){
  return normalizeScore({
    schema:SCORE_SCHEMA,
    source:{id:'synthetic:field-message:001',kind:'SYNTHETIC',duration_ms:12000,interval_ms:[0,12000]},
    message:'MEET ME AT THE DROP',
    operations:[
      {type:'COMPRESS',at:.18,span:.14,intensity:.74},
      {type:'MESSAGE',at:.31,span:.16,intensity:.82},
      {type:'DROP',at:.48,span:.09,intensity:1},
      {type:'BLOOM',at:.57,span:.18,intensity:.88},
      {type:'SPLIT',at:.73,span:.12,intensity:.68},
      {type:'RETURN',at:.91,span:.16,intensity:1}
    ],
    presentation:{palette:'FIELD_DARK',reduced_motion:false}
  });
}

export function normalizeScore(raw={}){
  const source=raw.source||{};
  const duration=Math.max(4000,Math.min(60000,Math.round(Number(source.duration_ms)||12000)));
  const interval=Array.isArray(source.interval_ms)&&source.interval_ms.length===2
    ? [Math.max(0,Math.round(Number(source.interval_ms[0])||0)),Math.min(duration,Math.round(Number(source.interval_ms[1])||duration))]
    : [0,duration];
  const operations=(Array.isArray(raw.operations)?raw.operations:[])
    .filter(op=>OP_TYPES.includes(String(op?.type||'').toUpperCase()))
    .map(op=>({
      type:String(op.type).toUpperCase(),
      at:round(clamp(op.at),5),
      span:round(Math.max(.02,Math.min(.35,Number(op.span)||.12)),5),
      intensity:round(clamp(op.intensity==null?1:op.intensity),5)
    }))
    .sort((a,b)=>a.at-b.at||a.type.localeCompare(b.type));
  return {
    schema:SCORE_SCHEMA,
    source:{
      id:String(source.id||'synthetic:field-message:unknown').slice(0,160),
      kind:String(source.kind||'SYNTHETIC').slice(0,32),
      duration_ms:duration,
      interval_ms:interval
    },
    message:String(raw.message||'').slice(0,120),
    operations,
    presentation:{
      palette:String(raw.presentation?.palette||'FIELD_DARK').slice(0,32),
      reduced_motion:!!raw.presentation?.reduced_motion
    }
  };
}

export function serializeScore(score){return JSON.stringify(normalizeScore(score));}

function toBase64Url(text){
  if(typeof Buffer!=='undefined')return Buffer.from(text,'utf8').toString('base64url');
  const bytes=new TextEncoder().encode(text);
  let bin=''; for(const b of bytes)bin+=String.fromCharCode(b);
  return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function fromBase64Url(encoded){
  if(typeof Buffer!=='undefined')return Buffer.from(String(encoded),'base64url').toString('utf8');
  const s=String(encoded).replace(/-/g,'+').replace(/_/g,'/');
  const padded=s+'='.repeat((4-s.length%4)%4);
  const bin=atob(padded),bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
export function encodeScore(score){return toBase64Url(serializeScore(score));}
export function decodeScore(encoded){return normalizeScore(JSON.parse(fromBase64Url(encoded)));}

export function retimeOperation(score,type,delta=.04){
  const next=normalizeScore(score);
  const t=String(type||'').toUpperCase();
  const i=next.operations.findIndex(op=>op.type===t);
  if(i<0)return next;
  next.operations[i]={...next.operations[i],at:round(clamp(next.operations[i].at+Number(delta||0)),5)};
  next.operations.sort((a,b)=>a.at-b.at||a.type.localeCompare(b.type));
  return next;
}

export function sampleScore(score,timeMs){
  const s=normalizeScore(score),duration=s.source.duration_ms;
  const p=((Number(timeMs)||0)%duration+duration)%duration/duration;
  const weights=Object.fromEntries(OP_TYPES.map(k=>[k,0]));
  for(const op of s.operations)weights[op.type]=Math.max(weights[op.type],opWindow(p,op)*op.intensity);
  const compress=weights.COMPRESS,drop=weights.DROP,bloom=weights.BLOOM,split=weights.SPLIT,ret=weights.RETURN,msg=weights.MESSAGE;
  const radius=round(.76-compress*.28+drop*.14+bloom*.36-ret*.18,5);
  const horizon=round(.5-drop*.24+bloom*.08+ret*(.5-(.5-drop*.24+bloom*.08)),5);
  const fork=round(split*(1-ret),5);
  const contrast=round(.34+drop*.5+bloom*.26+msg*.08-ret*.12,5);
  const messageOpacity=round(clamp(msg*.92+drop*.18+ret*.15),5);
  const settle=round(clamp(ret+Math.max(0,(p-.92)/.08)),5);
  return {p:round(p,5),radius,horizon,fork,contrast,messageOpacity,settle,weights:Object.fromEntries(Object.entries(weights).map(([k,v])=>[k,round(v,5)]))};
}

function fnv1a(text){
  let h=0x811c9dc5;
  for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,0x01000193)}
  return (h>>>0).toString(16).padStart(8,'0');
}
export function visualSignature(score,samples=32){
  const s=normalizeScore(score),frames=[];
  for(let i=0;i<samples;i++)frames.push(sampleScore(s,s.source.duration_ms*i/samples));
  return 'fnv1a32-'+fnv1a(JSON.stringify({source:s.source,message:s.message,frames}));
}

export function packetBytes(score){
  return new TextEncoder().encode(serializeScore(score)).byteLength;
}
