(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.Interphase=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const VERSION='interphase/v0.2';
  const CHANNELS=Object.freeze(['identity','address','content','depth','time','authority','raster','evidence']);
  const EXPLICIT_PRIMITIVES=Object.freeze(['CONTENT','AUTHORITY','DEPTH','TIME']);
  const OFFICES=Object.freeze([
    {id:'SOURCE',label:'SOURCE',prompt:'material / input / object'},
    {id:'FRAME',label:'FRAME',prompt:'context / constraints / relations'},
    {id:'FOCUS',label:'FOCUS',prompt:'current object / working surface'},
    {id:'OPERATE',label:'OPERATE',prompt:'actions / transforms / choices'},
    {id:'WITNESS',label:'WITNESS',prompt:'evidence / preview / delta'},
    {id:'RETURN',label:'RETURN',prompt:'history / provenance / exit'}
  ]);
  const uniq=xs=>[...new Set((xs||[]).filter(Boolean))];
  const clone=x=>{
    if(typeof structuredClone==='function')return structuredClone(x);
    return JSON.parse(JSON.stringify(x));
  };
  const canonical=x=>Array.isArray(x)?x.map(canonical):(x&&typeof x==='object'?Object.keys(x).sort().reduce((o,k)=>(o[k]=canonical(x[k]),o),{}):x);
  const stable=x=>JSON.stringify(canonical(x));
  const now=()=>new Date().toISOString();

  const DEFAULT_PROJECTIONS=Object.freeze({
    PAGE:{label:'PAGE',channels:CHANNELS.slice(),description:'native host representation'},
    FOVEA:{label:'FOVEA',channels:['identity','address','content','depth','time','authority','raster','evidence'],description:'local focus + context'},
    LINE:{label:'LINE',channels:['identity','address','content','time','authority'],description:'ordered address strip'},
    RING:{label:'RING',channels:['identity','address','time','authority'],description:'compact ordinal/cyclic overview'},
    SIX:{label:'SIX',channels:['identity','address','content','depth','authority'],description:'six addressable slots / net carrier'},
    ROOM:{label:'ROOM',channels:['identity','address','content','depth','authority','evidence'],description:'spatial orientation carrier'},
    GLYPH:{label:'GLYPH',channels:['identity','address'],description:'compact identity witness'},
    RSVP:{label:'RSVP',channels:['identity','address','content','time'],description:'temporal focus'},
    TABLE:{label:'TABLE',channels:['identity','address','content','authority','evidence'],description:'attribute rows/columns'}
  });

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

  class Host{
    constructor(adapter,opt={}){
      if(!adapter||typeof adapter.describe!=='function')throw new Error('INTERPHASE_ADAPTER_REQUIRED');
      this.adapter=adapter;
      this.id=opt.id||adapter.id||'interphase-host';
      this.projections={...DEFAULT_PROJECTIONS,...(opt.projections||{})};
      this.state={projection:opt.projection||'PAGE',projectionParams:{},selection:[],focus:[],revision:0};
      this.returns=[];
      this.events=[];
      this.listeners=new Set();
    }
    _id(ref){return typeof this.adapter.idOf==='function'?this.adapter.idOf(ref):String(ref)}
    _resolve(ref){return typeof this.adapter.resolve==='function'?this.adapter.resolve(ref):ref}
    describe(ref){const r=this._resolve(ref);return this.adapter.describe(r)}
    read(ref){const r=this._resolve(ref);return typeof this.adapter.read==='function'?this.adapter.read(r):this.adapter.describe(r)}
    select(ref,opt={}){
      const id=this._id(ref),set=new Set(opt.add?this.state.selection:[]);
      if(opt.toggle&&set.has(id))set.delete(id);else set.add(id);
      this.state.selection=[...set];this._emit('SELECT',{id,selection:this.state.selection.slice()});return this.snapshot();
    }
    selectMany(refs,opt={}){
      const ids=uniq((refs||[]).map(x=>this._id(x)));
      this.state.selection=opt.add?uniq(this.state.selection.concat(ids)):ids;
      this._emit('SELECT_MANY',{selection:this.state.selection.slice()});return this.snapshot();
    }
    clearSelection(){this.state.selection=[];this._emit('SELECT_CLEAR',{});return this.snapshot()}
    focus(ref,opt={}){
      const id=this._id(ref),xs=opt.add?this.state.focus.filter(x=>x.id!==id):[];
      xs.push({id,aperture:opt.aperture||'DETAIL'});this.state.focus=xs;
      this._emit('FOCUS',{id,focus:clone(xs)});return this.snapshot();
    }
    focusMany(refs,opt={}){
      const aperture=opt.aperture||'DETAIL';
      const next=(refs||[]).map(r=>({id:this._id(r),aperture:typeof aperture==='function'?aperture(r):aperture}));
      this.state.focus=opt.add?uniqFocus(this.state.focus.concat(next)):uniqFocus(next);
      this._emit('FOCUS_MANY',{focus:clone(this.state.focus)});return this.snapshot();
    }
    clearFocus(){this.state.focus=[];this._emit('FOCUS_CLEAR',{});return this.snapshot()}
    project(name,params={}){
      if(!this.projections[name])throw new Error('INTERPHASE_UNKNOWN_PROJECTION:'+name);
      const rev=this.state.revision;
      this.state.projection=name;this.state.projectionParams=clone(params);
      this._emit('PROJECT',{projection:name,params:clone(params),canonical_revision_unchanged:this.state.revision===rev});
      return this.projectionResult(name);
    }
    projectionResult(name=this.state.projection){
      const spec=this.projections[name]||this.projections.PAGE;
      const ids=uniq(this.state.selection.concat(this.state.focus.map(x=>x.id)));
      const nodes=ids.map(id=>{
        try{return this.describe(id)}catch(_){return{id,kind:'UNKNOWN',channels:['identity','address'],error:'UNRESOLVED'}}
      });
      const supported=new Set(spec.channels||[]),residue=[];
      for(const n of nodes){
        for(const ch of uniq(n.channels||['identity','address','content']))if(!supported.has(ch))residue.push({id:n.id,channel:ch,projection:name});
      }
      return {schema:VERSION+'/projection',host:this.id,projection:name,spec:clone(spec),nodes:clone(nodes),residue,selection:this.state.selection.slice(),focus:clone(this.state.focus),revision:this.state.revision};
    }
    captureReturn(label='RETURN'){
      const frame={schema:VERSION+'/return-frame',label,at:now(),host:this.id,state:clone(this.state),adapter:typeof this.adapter.capture==='function'?clone(this.adapter.capture()):null};
      this.returns.push(frame);this._emit('RETURN_CAPTURE',{label});return clone(frame);
    }
    return(){
      const frame=this.returns.pop();if(!frame)return null;
      const currentRevision=this.state.revision;
      this.state={...clone(frame.state),revision:currentRevision};
      if(frame.adapter&&typeof this.adapter.restore==='function')this.adapter.restore(clone(frame.adapter));
      this._emit('RETURN',{label:frame.label,canonical_revision_preserved:currentRevision});return clone(frame);
    }
    write(ref,patch,opt={}){
      const r=this._resolve(ref),d=this.adapter.describe(r),caps=new Set(d.capabilities||[]);
      if(!caps.has('edit'))return{ok:false,reason:'SUPPORT=0:EDIT'};
      if(typeof this.adapter.write!=='function')return{ok:false,reason:'ADAPTER_READ_ONLY'};
      const before=this.read(r),out=this.adapter.write(r,patch,{commit:opt.commit!==false,authority:opt.authority||'EDIT'}),after=this.read(r);
      if(out?.ok===false)return out;
      if(stable(before)===stable(after))return{ok:true,no_op:true,before,after,revision:this.state.revision};
      this.state.revision++;
      const receipt={schema:VERSION+'/event',at:now(),op:'EDIT',target:this._id(r),before,after,revision:this.state.revision,evidence:out?.evidence||null};
      this.events.push(receipt);this._emit('EDIT',receipt);return{ok:true,no_op:false,receipt};
    }
    invoke(ref,operation,args={},opt={}){
      const r=this._resolve(ref),d=this.adapter.describe(r),ops=d.operations||[];
      const spec=ops.find(x=>(typeof x==='string'?x:x.id)===operation);
      if(!spec)return{ok:false,reason:'SUPPORT=0:'+operation};
      const authority=typeof spec==='string'?'VIEW':(spec.authority||'VIEW');
      if(authority==='EFFECT'&&!opt.commit)return{ok:false,reason:'EXPLICIT_COMMIT_REQUIRED'};
      if(typeof this.adapter.invoke!=='function')return{ok:false,reason:'ADAPTER_NO_INVOKE'};
      const before=this.read(r),out=this.adapter.invoke(r,operation,args,{commit:!!opt.commit,authority}),after=this.read(r);
      if(out?.ok===false)return out;
      if((authority==='EDIT'&&stable(before)!==stable(after))||authority==='EFFECT')this.state.revision++;
      const receipt={schema:VERSION+'/event',at:now(),op:operation,target:this._id(r),authority,before,after,revision:this.state.revision,evidence:out?.evidence||null};
      this.events.push(receipt);this._emit('INVOKE',receipt);return{ok:true,receipt,result:out};
    }
    snapshot(){return{schema:VERSION+'/state',host:this.id,state:clone(this.state),return_depth:this.returns.length,event_count:this.events.length}}
    subscribe(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn)}
    _emit(type,detail){const e={type,detail:clone(detail),snapshot:this.snapshot()};for(const fn of this.listeners){try{fn(e)}catch(_){}}return e}
  }
  function uniqFocus(xs){const m=new Map();for(const x of xs)m.set(x.id,x);return[...m.values()]}

  return Object.freeze({VERSION,CHANNELS,EXPLICIT_PRIMITIVES,OFFICES,DEFAULT_PROJECTIONS,Host,createHost:(adapter,opt)=>new Host(adapter,opt),optic:Object.freeze({prop,index,all,where,compose,getIn,setIn})});
});