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
  const intOrNull=x=>Number.isFinite(Number(x))?Math.max(0,Math.trunc(Number(x))):null;
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
  function mark(m={},i=0){
    return{
      id:text(m.id||('mark:'+i+':'+hashString(JSON.stringify(m)))),
      address:text(m.address),
      progress:clamp(m.progress),
      label:text(m.label||m.focus||m.address||'MARK').slice(0,180),
      note:text(m.note).slice(0,500),
      charIndex:intOrNull(m.charIndex??m.char_index),
      scale:text(m.scale).slice(0,48),
      index:intOrNull(m.index),
      wpm:intOrNull(m.wpm),
      at:text(m.at||now()),
      via:text(m.via||'READFIELD').slice(0,48)
    };
  }
  function normalize(input={},key=''){
    const x=input&&typeof input==='object'?input:{},marks=Array.isArray(x.marks)?x.marks:[],visits=Array.isArray(x.visits)?x.visits:[];
    return{
      schema:SCHEMA,sourceKey:text(x.sourceKey||key),updatedAt:text(x.updatedAt||now()),
      last:x.last&&typeof x.last==='object'?{
        address:text(x.last.address),progress:clamp(x.last.progress),focus:text(x.last.focus).slice(0,220),
        charIndex:intOrNull(x.last.charIndex??x.last.char_index),scale:text(x.last.scale).slice(0,48),
        at:text(x.last.at||x.updatedAt||now()),via:text(x.last.via||'READFIELD').slice(0,48)
      }:null,
      furthest:clamp(x.furthest),
      marks:marks.slice(-64).map(mark).sort((a,b)=>a.progress-b.progress||a.at.localeCompare(b.at)),
      visits:visits.slice(-96).map(v=>({
        address:text(v.address),progress:clamp(v.progress),charIndex:intOrNull(v.charIndex??v.char_index),
        scale:text(v.scale).slice(0,48),at:text(v.at||now()),via:text(v.via||'READFIELD').slice(0,48)
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
  function record(key,{address='',progress=0,focus='',charIndex=null,scale='',via='READFIELD',at=null}={},storage){
    const x=read(key,storage),p=clamp(progress),stamp=text(at||now()),last=x.visits.at(-1),ci=intOrNull(charIndex);
    x.last={address:text(address),progress:p,focus:text(focus).slice(0,220),charIndex:ci,scale:text(scale).slice(0,48),at:stamp,via:text(via||'READFIELD').slice(0,48)};
    x.furthest=Math.max(x.furthest,p);x.updatedAt=stamp;
    const materiallyNew=!last||last.address!==x.last.address||Math.abs(last.progress-p)>=.01||last.via!==x.last.via;
    if(materiallyNew)x.visits.push({address:x.last.address,progress:p,charIndex:ci,scale:x.last.scale,at:stamp,via:x.last.via});
    if(x.visits.length>96)x.visits=x.visits.slice(-96);
    return write(x,storage);
  }
  function setMarks(key,marks,storage){
    const x=read(key,storage);x.marks=(Array.isArray(marks)?marks:[]).slice(-64).map(mark).sort((a,b)=>a.progress-b.progress||a.at.localeCompare(b.at));x.updatedAt=now();return write(x,storage)
  }
  function addMark(key,{address='',progress=0,label='',note='',charIndex=null,scale='',index=null,wpm=null,via='READFIELD',at=null,id=''}={},storage){
    const x=read(key,storage),p=clamp(progress),stamp=text(at||now()),ci=intOrNull(charIndex),sc=text(scale).slice(0,48);
    const identity=text(id)||[text(address),ci??'',sc].join('|');
    const existing=x.marks.find(m=>m.id===identity||(ci!=null&&m.charIndex===ci)||(m.address&&m.address===text(address)));
    if(existing)return x;
    x.marks.push(mark({id:identity||('mark:'+hashString(key+'|'+address+'|'+p+'|'+stamp)),address,progress:p,label,note,charIndex:ci,scale:sc,index,wpm,at:stamp,via},x.marks.length));
    x.marks=x.marks.slice(-64).sort((a,b)=>a.progress-b.progress||a.at.localeCompare(b.at));x.updatedAt=stamp;
    return write(x,storage);
  }
  function removeMark(key,id,storage){const x=read(key,storage);x.marks=x.marks.filter(m=>m.id!==id);x.updatedAt=now();return write(x,storage)}
  function nextMark(trail,progress=0,dir=1){
    const xs=normalize(trail,trail?.sourceKey).marks,p=clamp(progress);if(!xs.length)return null;
    if(Number(dir)<0){for(let i=xs.length-1;i>=0;i--)if(xs[i].progress<p-1e-6)return clone(xs[i]);return clone(xs.at(-1))}
    return clone(xs.find(m=>m.progress>p+1e-6)||xs[0])
  }
  function clear(key,storage){const target=storage||(typeof localStorage!=='undefined'?localStorage:null);try{target?.removeItem(storageKey(key))}catch(_){}return normalize({},key)}
  return Object.freeze({SCHEMA,PREFIX,LAW,hashString,sourceKey,storageKey,normalize,read,write,record,setMarks,addMark,removeMark,nextMark,clear});
});
