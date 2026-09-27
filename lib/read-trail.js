(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.FieldSourceTrail=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const SCHEMA='field-source-trail/v0.1';
  const PREFIX='readfield.trail.v01:';
  const LAW='VISITED / MARKED records human traversal evidence only; it never means read, understood, agreed, verified or complete.';
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number(v)||0));
  const clone=x=>x==null?x:JSON.parse(JSON.stringify(x));
  const now=()=>new Date().toISOString();
  const text=(x,f='')=>x==null?f:String(x);
  function hashString(value=''){
    let h=2166136261>>>0;
    for(const ch of text(value)){h^=ch.codePointAt(0)??0;h=Math.imul(h,16777619)>>>0}
    return (h>>>0).toString(16).padStart(8,'0');
  }
  function sourceKey({address='',source='',label=''}={}){
    const a=text(address).trim();
    if(a)return 'address:'+a;
    const s=text(source);
    return 'content:'+s.length+':'+hashString(s||label);
  }
  function storageKey(key){return PREFIX+encodeURIComponent(text(key))}
  function normalize(input={},key=''){
    const x=input&&typeof input==='object'?input:{};
    const marks=Array.isArray(x.marks)?x.marks:[];
    const visits=Array.isArray(x.visits)?x.visits:[];
    return {
      schema:SCHEMA,
      sourceKey:text(x.sourceKey||key),
      updatedAt:text(x.updatedAt||now()),
      last:x.last&&typeof x.last==='object'?{
        address:text(x.last.address),
        progress:clamp(x.last.progress),
        focus:text(x.last.focus).slice(0,220),
        charIndex:Number.isFinite(Number(x.last.charIndex))?Math.max(0,Math.trunc(Number(x.last.charIndex))):null,
        at:text(x.last.at||x.updatedAt||now()),
        via:text(x.last.via||'READFIELD')
      }:null,
      furthest:clamp(x.furthest),
      marks:marks.slice(-64).map((m,i)=>({
        id:text(m.id||('mark:'+i+':'+Date.now())),
        address:text(m.address),
        progress:clamp(m.progress),
        label:text(m.label||m.address||'MARK').slice(0,160),
        note:text(m.note).slice(0,500),
        at:text(m.at||now()),
        via:text(m.via||'READFIELD')
      })).sort((a,b)=>a.progress-b.progress||a.at.localeCompare(b.at)),
      visits:visits.slice(-96).map(v=>({
        address:text(v.address),
        progress:clamp(v.progress),
        charIndex:Number.isFinite(Number(v.charIndex))?Math.max(0,Math.trunc(Number(v.charIndex))):null,
        at:text(v.at||now()),
        via:text(v.via||'READFIELD')
      })),
      law:LAW
    };
  }
  function read(key,storage){
    const target=storage||(typeof localStorage!=='undefined'?localStorage:null);
    if(!target||!key)return normalize({},key);
    try{const raw=target.getItem(storageKey(key));return raw?normalize(JSON.parse(raw),key):normalize({},key)}catch(_){return normalize({},key)}
  }
  function write(trail,storage){
    const target=storage||(typeof localStorage!=='undefined'?localStorage:null),x=normalize(trail,trail?.sourceKey);
    if(target&&x.sourceKey){try{target.setItem(storageKey(x.sourceKey),JSON.stringify(x))}catch(_){}}
    return x;
  }
  function record(key,{address='',progress=0,focus='',charIndex=null,via='READFIELD',at=null}={},storage){
    const x=read(key,storage),p=clamp(progress),stamp=text(at||now()),last=x.visits.at(-1);
    const ci=Number.isFinite(Number(charIndex))?Math.max(0,Math.trunc(Number(charIndex))):null;
    x.last={address:text(address),progress:p,focus:text(focus).slice(0,220),charIndex:ci,at:stamp,via:text(via||'READFIELD')};
    x.furthest=Math.max(x.furthest,p);x.updatedAt=stamp;
    const materiallyNew=!last||last.address!==x.last.address||Math.abs(last.progress-p)>=.01||last.via!==x.last.via;
    if(materiallyNew)x.visits.push({address:x.last.address,progress:p,charIndex:ci,at:stamp,via:x.last.via});
    if(x.visits.length>96)x.visits=x.visits.slice(-96);
    return write(x,storage);
  }
  function addMark(key,{address='',progress=0,label='',note='',via='READFIELD',at=null}={},storage){
    const x=read(key,storage),p=clamp(progress),stamp=text(at||now());
    const near=x.marks.find(m=>m.address&&m.address===text(address));
    if(near)return x;
    x.marks.push({
      id:'mark:'+hashString(key+'|'+address+'|'+p+'|'+stamp),
      address:text(address),progress:p,label:text(label||address||'MARK').slice(0,160),
      note:text(note).slice(0,500),at:stamp,via:text(via||'READFIELD')
    });
    x.marks=x.marks.slice(-64).sort((a,b)=>a.progress-b.progress||a.at.localeCompare(b.at));x.updatedAt=stamp;
    return write(x,storage);
  }
  function removeMark(key,id,storage){
    const x=read(key,storage);x.marks=x.marks.filter(m=>m.id!==id);x.updatedAt=now();return write(x,storage);
  }
  function nextMark(trail,progress=0,dir=1){
    const xs=normalize(trail,trail?.sourceKey).marks,p=clamp(progress);
    if(!xs.length)return null;
    if(Number(dir)<0){for(let i=xs.length-1;i>=0;i--)if(xs[i].progress<p-1e-6)return clone(xs[i]);return clone(xs.at(-1))}
    return clone(xs.find(m=>m.progress>p+1e-6)||xs[0]);
  }
  function clear(key,storage){
    const target=storage||(typeof localStorage!=='undefined'?localStorage:null);
    try{target?.removeItem(storageKey(key))}catch(_){}
    return normalize({},key);
  }
  return Object.freeze({SCHEMA,PREFIX,LAW,hashString,sourceKey,storageKey,normalize,read,write,record,addMark,removeMark,nextMark,clear});
});
