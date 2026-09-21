export const FIELD_PULSE_SCHEMA='field-pulse/v0.1';
export const FIELD_PULSE_CHANNEL='field-pulse-v0';

const finite=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const text=(v,f='')=>String(v??f);

export function normalizePulse(input={}){
  const data=input&&typeof input.data==='object'&&input.data?input.data:{};
  return {
    schema:FIELD_PULSE_SCHEMA,
    source:text(input.source,'UNKNOWN'),
    instance:text(input.instance,''),
    kind:text(input.kind,'state'),
    seq:Math.max(0,Math.trunc(finite(input.seq,0))),
    wall:Math.max(0,Math.trunc(finite(input.wall,Date.now()))),
    at:Math.max(0,finite(input.at,0)),
    data
  };
}

export function createFieldPulse(source,opt={}){
  const channelName=text(opt.channelName,FIELD_PULSE_CHANNEL);
  const instance=text(opt.instance,(globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2)));
  let seq=0,closed=false;
  const listeners=new Set();
  let channel=null;
  try{if(typeof BroadcastChannel==='function')channel=new BroadcastChannel(channelName)}catch(_){}
  const onMessage=e=>{
    const msg=normalizePulse(e?.data||{});
    if(msg.instance===instance)return;
    for(const fn of listeners){try{fn(msg)}catch(_){}}
  };
  channel?.addEventListener?.('message',onMessage);
  const onLocal=e=>{
    const msg=normalizePulse(e?.detail||{});
    if(msg.instance===instance)return;
    for(const fn of listeners){try{fn(msg)}catch(_){}}
  };
  if(typeof globalThis.addEventListener==='function')globalThis.addEventListener('field-pulse-local',onLocal);

  function publish(kind,data={}){
    if(closed)return null;
    const msg=normalizePulse({
      source,instance,kind,seq:++seq,wall:Date.now(),
      at:typeof performance!=='undefined'&&Number.isFinite(performance.now?.())?performance.now():0,
      data
    });
    try{channel?.postMessage(msg)}catch(_){}
    try{globalThis.dispatchEvent?.(new CustomEvent('field-pulse-local',{detail:msg}))}catch(_){}
    try{sessionStorage?.setItem?.('field.pulse.last.v0',JSON.stringify(msg))}catch(_){}
    return msg;
  }

  function subscribe(fn){
    if(typeof fn!=='function')return()=>{};
    listeners.add(fn);
    return()=>listeners.delete(fn);
  }

  function last(){
    try{return normalizePulse(JSON.parse(sessionStorage?.getItem?.('field.pulse.last.v0')||'null')||{})}catch(_){return null}
  }

  function close(){
    if(closed)return;closed=true;
    listeners.clear();
    try{channel?.removeEventListener?.('message',onMessage);channel?.close?.()}catch(_){}
    try{globalThis.removeEventListener?.('field-pulse-local',onLocal)}catch(_){}
  }

  return {schema:FIELD_PULSE_SCHEMA,channel:channelName,source:text(source,'UNKNOWN'),instance,publish,subscribe,last,close};
}
