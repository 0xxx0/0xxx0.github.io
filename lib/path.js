// lib/path.js — path optics: getIn / setIn / optic / compose / pathsFor / prop / index / all / where (+ clone)
//
// EXTRACTED 2026-09-26 (lib/ extraction wave 1): moved VERBATIM from lib/interphase-core.js —
// clone (lines 21-24) and the optic block getIn..pathsFor (lines 41-92). interphase-core.js
// now loads this module first and destructures these names from it; any page that loads
// /lib/interphase-core.js must load /lib/path.js BEFORE it, or core throws
// INTERPHASE PATH REQUIRED. The optic algebra walks plain values and nothing else.
//
// SCOPE — what this module must NOT become:
//   - must not know any instrument's address format: never parse set:// or L3C5-style
//     addresses; stepping/format helpers, if ever added, only take a value + range
//   - not a query language, not a schema, not a state store

(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.InterphasePath=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const clone=x=>{
    if(typeof structuredClone==='function')return structuredClone(x);
    return JSON.parse(JSON.stringify(x));
  };
  function getIn(source,path){let x=source;for(const k of path){if(x==null)return undefined;x=x[k]}return x}
  function setIn(source,path,value){
    const out=clone(source);let x=out;
    for(let i=0;i<path.length-1;i++)x=x[path[i]];
    if(path.length)x[path[path.length-1]]=value;
    return path.length?out:value;
  }
  function optic(step){
    return Object.freeze({
      steps:[step],
      compose(other){return compose(this,other)},
      paths(source){return pathsFor(source,this.steps)},
      view(source){return this.paths(source).map(p=>getIn(source,p))},
      over(source,fn){let out=source;const ps=this.paths(source);for(const p of ps)out=setIn(out,p,fn(getIn(out,p),p));return out},
      set(source,value){return this.over(source,()=>value)}
    });
  }
  const prop=key=>optic({kind:'prop',key});
  const index=i=>optic({kind:'index',index:Number(i)});
  const all=()=>optic({kind:'all'});
  const where=pred=>optic({kind:'where',pred});
  function compose(...os){
    const steps=os.flatMap(o=>o?.steps||[]);
    return Object.freeze({
      steps,
      compose(other){return compose(this,other)},
      paths(source){return pathsFor(source,steps)},
      view(source){return this.paths(source).map(p=>getIn(source,p))},
      over(source,fn){let out=source;const ps=this.paths(source);for(const p of ps)out=setIn(out,p,fn(getIn(out,p),p));return out},
      set(source,value){return this.over(source,()=>value)}
    });
  }
  function pathsFor(source,steps){
    let paths=[[]];
    for(const s of steps){
      const next=[];
      for(const p of paths){
        const v=getIn(source,p);
        if(s.kind==='prop'&&v!=null&&Object.prototype.hasOwnProperty.call(Object(v),s.key))next.push(p.concat(s.key));
        else if(s.kind==='index'&&Array.isArray(v)&&s.index>=0&&s.index<v.length)next.push(p.concat(s.index));
        else if(s.kind==='all'&&v!=null){
          if(Array.isArray(v))v.forEach((_,i)=>next.push(p.concat(i)));
          else if(typeof v==='object')Object.keys(v).forEach(k=>next.push(p.concat(k)));
        }else if(s.kind==='where'&&v!=null){
          if(Array.isArray(v))v.forEach((x,i)=>{if(s.pred(x,i,v))next.push(p.concat(i))});
          else if(typeof v==='object')Object.entries(v).forEach(([k,x])=>{if(s.pred(x,k,v))next.push(p.concat(k))});
        }
      }
      paths=next;
    }
    return paths;
  }

  return Object.freeze({getIn,setIn,optic,compose,pathsFor,prop,index,all,where,clone});
});