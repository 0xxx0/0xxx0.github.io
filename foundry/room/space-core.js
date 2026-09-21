(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.SpaceScale=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const SCHEMA='0xxx0/space-scale/v0.2';
  const MODEL_VERSION='0.2';
  const LEVELS=Object.freeze({GLYPH:'GLYPH',BLOCK:'BLOCK',ROOM:'ROOM'});
  const clone=x=>JSON.parse(JSON.stringify(x));
  const arr=x=>Array.isArray(x)?x:[];
  const byId=(m,id)=>arr(m.nodes).find(n=>n.id===id)||null;
  const edgeById=(m,id)=>arr(m.edges).find(e=>e.id===id)||null;
  const uid=(p='n')=>p+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
  const typeEq=(a,b)=>a===b||a==='ANY'||b==='ANY';

  function model(input={}){
    return {
      schema:SCHEMA,
      version:MODEL_VERSION,
      nodes:clone(arr(input.nodes)),
      edges:clone(arr(input.edges)),
      view:{x:0,y:0,scale:1,scope:null,...clone(input.view||{})},
      meta:{title:'SPACE SCALE',...clone(input.meta||{})}
    };
  }

  function primitive(id,label,x,y,ports=[],operator={kind:'PASS'},extra={}){
    return {
      id,label:label||id,kind:'primitive',parent:null,x:Number(x)||0,y:Number(y)||0,w:170,h:96,
      ports:clone(ports),operator:clone(operator),...clone(extra)
    };
  }

  function port(id,dir,type='ANY',label=null,extra={}){
    if(!['in','out'].includes(dir))throw new Error('port dir must be in|out');
    return {id,dir,type:String(type||'ANY'),label:label||id,...clone(extra)};
  }

  function getPort(m,ref){
    const n=byId(m,ref?.node);
    if(!n)throw new Error('node not found: '+ref?.node);
    const p=arr(n.ports).find(x=>x.id===ref?.port);
    if(!p)throw new Error('port not found: '+ref?.node+'#'+ref?.port);
    return {node:n,port:p};
  }

  function resolveEndpoint(m,ref,seen=new Set()){
    const key=ref?.node+'#'+ref?.port;
    if(seen.has(key))throw new Error('proxy port cycle: '+key);
    seen.add(key);
    const got=getPort(m,ref);
    if(got.port.mapsTo)return resolveEndpoint(m,got.port.mapsTo,seen);
    return {node:got.node.id,port:got.port.id};
  }

  function compatible(m,a,b){
    let A=getPort(m,a),B=getPort(m,b);
    if(A.port.dir==='in'&&B.port.dir==='out'){[A,B]=[B,A];[a,b]=[b,a]}
    const ok=A.port.dir==='out'&&B.port.dir==='in'&&typeEq(A.port.type,B.port.type);
    return {
      ok,
      from:a,to:b,
      fromType:A.port.type,toType:B.port.type,
      reason:ok?'COMPATIBLE':
        A.port.dir!=='out'||B.port.dir!=='in'?'DIRECTION_MISMATCH':'TYPE_MISMATCH'
    };
  }

  function incomingEdges(m,endpoint){
    const r=resolveEndpoint(m,endpoint);
    return arr(m.edges).filter(e=>{
      const t=resolveEndpoint(m,e.to);
      return t.node===r.node&&t.port===r.port;
    });
  }

  function dock(input,a,b,opts={}){
    const m=model(input),c=compatible(m,a,b);
    if(!c.ok)return {ok:false,reason:c.reason,model:m};
    const from=resolveEndpoint(m,c.from),to=resolveEndpoint(m,c.to);
    if(incomingEdges(m,to).length)return {ok:false,reason:'INPUT_ALREADY_CONNECTED',model:m};
    if(arr(m.edges).some(e=>{
      const ef=resolveEndpoint(m,e.from),et=resolveEndpoint(m,e.to);
      return ef.node===from.node&&ef.port===from.port&&et.node===to.node&&et.port===to.port;
    }))return {ok:false,reason:'DUPLICATE_EDGE',model:m};
    const edge={
      id:opts.id||uid('e'),from,to,type:c.fromType==='ANY'?c.toType:c.fromType,
      via:{from:clone(c.from),to:clone(c.to)},created_at:new Date().toISOString()
    };
    m.edges.push(edge);
    return {ok:true,edge,model:m};
  }

  function parentOf(m,id){return byId(m,id)?.parent??null}
  function childrenOf(m,id){return arr(m.nodes).filter(n=>n.parent===id)}
  function descendants(m,id){
    const out=[];const walk=x=>childrenOf(m,x).forEach(n=>(out.push(n.id),walk(n.id)));walk(id);return out;
  }
  function leavesOf(m,id){
    const n=byId(m,id);if(!n)return[];
    if(n.kind!=='composite')return[id];
    const out=[];childrenOf(m,id).forEach(c=>out.push(...leavesOf(m,c.id)));return out;
  }
  function selectionLeaves(m,ids){
    const out=[];for(const id of arr(ids)){const n=byId(m,id);if(!n)continue;out.push(...(n.kind==='composite'?leavesOf(m,id):[id]))}
    return [...new Set(out)];
  }

  function edgeTouchesPort(m,e,nodeId,portId,side=null){
    if(!side||side==='from'){
      const r=resolveEndpoint(m,e.from);if(r.node===nodeId&&r.port===portId)return true;
    }
    if(!side||side==='to'){
      const r=resolveEndpoint(m,e.to);if(r.node===nodeId&&r.port===portId)return true;
    }
    return false;
  }

  function boundaryPorts(input,ids){
    const m=model(input),leafIds=selectionLeaves(m,ids),inside=new Set(leafIds),out=[];
    for(const id of leafIds){
      const n=byId(m,id);if(!n)continue;
      for(const p of arr(n.ports)){
        const endpoint={node:id,port:p.id};
        const touching=arr(m.edges).filter(e=>edgeTouchesPort(m,e,id,p.id));
        const internal=touching.some(e=>{
          const f=resolveEndpoint(m,e.from),t=resolveEndpoint(m,e.to);
          return inside.has(f.node)&&inside.has(t.node);
        });
        const external=touching.some(e=>{
          const f=resolveEndpoint(m,e.from),t=resolveEndpoint(m,e.to);
          return inside.has(f.node)!==inside.has(t.node);
        });
        const unused=touching.length===0;
        if(unused||external){
          out.push({
            id:'p'+out.length,dir:p.dir,type:p.type,label:p.label||p.id,
            mapsTo:endpoint,source:{node:id,port:p.id},status:external?'CONNECTED_EXTERNAL':'FREE'
          });
        } else if(!internal){
          out.push({
            id:'p'+out.length,dir:p.dir,type:p.type,label:p.label||p.id,
            mapsTo:endpoint,source:{node:id,port:p.id},status:'FREE'
          });
        }
      }
    }
    return out;
  }

  function fold(input,ids,opts={}){
    const m=model(input),selected=[...new Set(arr(ids))].filter(id=>byId(m,id));
    if(selected.length<2)return {ok:false,reason:'NEED_TWO_OR_MORE_NODES',model:m};
    const parents=[...new Set(selected.map(id=>parentOf(m,id)))];
    if(parents.length!==1)return {ok:false,reason:'SELECTION_MUST_SHARE_PARENT',model:m};
    for(const id of selected){
      if(selected.some(other=>other!==id&&descendants(m,other).includes(id)))
        return {ok:false,reason:'SELECTION_CONTAINS_ANCESTOR_AND_DESCENDANT',model:m};
    }
    const id=opts.id||uid('block'),chosen=selected.map(x=>byId(m,x)),xs=chosen.map(x=>x.x),ys=chosen.map(x=>x.y);
    const minX=Math.min(...xs),minY=Math.min(...ys),maxX=Math.max(...chosen.map(n=>n.x+(n.w||170))),maxY=Math.max(...chosen.map(n=>n.y+(n.h||96)));
    const pad=Number(opts.pad??24),ports=boundaryPorts(m,selected);
    const composite={
      id,label:opts.label||'COMPOSITE',kind:'composite',parent:parents[0],x:opts.x??(minX-pad),
      y:opts.y??(minY-pad),w:opts.w||Math.max(210,maxX-minX+pad*2),h:opts.h||Math.max(128,maxY-minY+pad*2),ports,collapsed:opts.collapsed!==false,
      operator:{kind:'COMPOSITE'},created_at:new Date().toISOString()
    };
    m.nodes.push(composite);
    selected.forEach(cid=>{byId(m,cid).parent=id});
    return {ok:true,node:composite,model:m};
  }

  function dissolve(input,id){
    const m=model(input),n=byId(m,id);
    if(!n||n.kind!=='composite')return {ok:false,reason:'NOT_COMPOSITE',model:m};
    childrenOf(m,id).forEach(c=>{c.parent=n.parent??null});
    m.nodes=m.nodes.filter(x=>x.id!==id);
    return {ok:true,model:m};
  }

  function setCollapsed(input,id,collapsed){
    const m=model(input),n=byId(m,id);
    if(!n||n.kind!=='composite')return {ok:false,reason:'NOT_COMPOSITE',model:m};
    n.collapsed=!!collapsed;return {ok:true,model:m};
  }

  function ancestorChain(m,id){
    const out=[];let cur=byId(m,id);const seen=new Set();
    while(cur&&cur.parent){
      if(seen.has(cur.parent))throw new Error('parent cycle');
      seen.add(cur.parent);out.push(cur.parent);cur=byId(m,cur.parent);
    }
    return out;
  }

  function visibleRepresentative(m,id,scope=null){
    let n=byId(m,id);if(!n)return null;
    const chain=ancestorChain(m,id);
    for(const aid of chain){
      const a=byId(m,aid);
      if(a?.collapsed&&aid!==scope)return a;
    }
    return n;
  }

  function semanticLevel(scale){
    const s=Number(scale)||1;
    return s<0.48?LEVELS.GLYPH:s<1.15?LEVELS.BLOCK:LEVELS.ROOM;
  }

  function scopeMembers(m,scope){
    if(!scope)return arr(m.nodes).filter(n=>!n.parent);
    return childrenOf(m,scope);
  }

  function forkSubtree(input,id,opts={}){
    const m=model(input),root=byId(m,id);if(!root)return {ok:false,reason:'NODE_NOT_FOUND',model:m};
    const ids=[id,...descendants(m,id)],set=new Set(ids),map=new Map();
    const suffix=opts.suffix||'-fork';
    for(const old of ids){
      let nid=old+suffix,i=2;while(byId(m,nid)||[...map.values()].includes(nid))nid=old+suffix+i++;
      map.set(old,nid);
    }
    const clones=ids.map(old=>{
      const n=clone(byId(m,old)),nid=map.get(old);n.id=nid;n.label=(old===id?(opts.label||n.label+' / FORK'):n.label);
      n.parent=old===id?(root.parent??null):(map.get(n.parent)||n.parent);
      n.x+=(opts.dx??44);n.y+=(opts.dy??44);
      n.ports=arr(n.ports).map(p=>({...p,mapsTo:p.mapsTo?{node:map.get(p.mapsTo.node)||p.mapsTo.node,port:p.mapsTo.port}:undefined}));
      return n;
    });
    m.nodes.push(...clones);
    const internal=arr(m.edges).filter(e=>{
      const f=resolveEndpoint(m,e.from),t=resolveEndpoint(m,e.to);return set.has(f.node)&&set.has(t.node);
    }).map(e=>({...clone(e),id:uid('e'),from:{node:map.get(e.from.node)||e.from.node,port:e.from.port},to:{node:map.get(e.to.node)||e.to.node,port:e.to.port},created_at:new Date().toISOString()}));
    m.edges.push(...internal);
    return {ok:true,node:byId(m,map.get(id)),map:Object.fromEntries(map),model:m};
  }

  function primitiveGraph(m){
    const leaves=arr(m.nodes).filter(n=>n.kind!=='composite');
    return {nodes:leaves,edges:arr(m.edges).map(e=>({...e,from:resolveEndpoint(m,e.from),to:resolveEndpoint(m,e.to)}))};
  }

  function applyOperator(op,inputs,sourceValue){
    const kind=String(op?.kind||'PASS').toUpperCase(),first=inputs[0];
    if(kind==='SOURCE')return sourceValue!==undefined?sourceValue:clone(op.value);
    if(kind==='PASS'||kind==='SINK')return first;
    if(kind==='MERGE')return inputs.flat();
    if(kind==='MAP'){
      const fn=String(op.fn||'IDENTITY').toUpperCase();
      if(fn==='TOKENS')return String(first??'').trim().split(/\s+/).filter(Boolean);
      if(fn==='UPPER')return String(first??'').toUpperCase();
      if(fn==='COUNT')return Array.isArray(first)?first.length:String(first??'').length;
      if(fn==='WRAP')return {value:first,label:op.label||'value'};
      if(fn==='CONFIG')return {intent:first,constraints:clone(op.constraints||{}),status:'CANDIDATE'};
      return first;
    }
    if(kind==='FILTER'){
      const xs=Array.isArray(first)?first:[first],fn=String(op.fn||'NONEMPTY').toUpperCase();
      if(fn==='NONEMPTY')return xs.filter(x=>x!=null&&String(x).trim()!=='');
      return xs;
    }
    if(kind==='COMPILE')return {schema:'room-block/recipe/v0.1',input:first,pattern:clone(op.pattern||[]),compiler:op.name||'COMPILE'};
    if(kind==='VERIFY')return {pass:first!=null,input:first,checks:clone(op.checks||['non-null']),at:new Date().toISOString()};
    if(kind==='RETURN')return {returned:first,at:new Date().toISOString(),status:'RETURNED'};
    return first;
  }

  function run(input,sources={}){
    const m=model(input),g=primitiveGraph(m),vals={},pending=new Set(g.nodes.map(n=>n.id)),trace=[];
    let guard=0;
    while(pending.size&&guard++<g.nodes.length*3){
      let progressed=false;
      for(const id of [...pending]){
        const incoming=g.edges.filter(e=>e.to.node===id),deps=incoming.map(e=>e.from.node);
        const node=g.nodes.find(n=>n.id===id);
        if(String(node.operator?.kind||'').toUpperCase()!=='SOURCE'&&deps.some(d=>!(d in vals)))continue;
        const inputs=incoming.map(e=>vals[e.from.node]);
        vals[id]=applyOperator(node.operator,inputs,sources[id]);
        trace.push({node:id,operator:node.operator?.kind||'PASS',inputs:deps,output:clone(vals[id])});
        pending.delete(id);progressed=true;
      }
      if(!progressed)break;
    }
    return {ok:pending.size===0,values:vals,trace,pending:[...pending]};
  }

  function materialize(input){
    const m=model(input);
    return {
      schema:'0xxx0/materialization-recipe/v0.1',
      source_schema:m.schema,
      title:m.meta.title,
      nodes:m.nodes.map(n=>({id:n.id,label:n.label,kind:n.kind,parent:n.parent,ports:clone(n.ports),operator:clone(n.operator),x:n.x,y:n.y})),
      connections:m.edges.map(e=>({id:e.id,from:clone(e.from),to:clone(e.to),type:e.type})),
      warning:'DECLARATIVE RECIPE ONLY · physical fit/load/safety not inferred'
    };
  }

  function receipt(input,events=[]){
    const m=model(input);
    return {
      schema:'0xxx0/space-scale-return/v0.2',
      object_id:m.meta.id||m.meta.title||'SPACE_SCALE',
      model_schema:m.schema,
      node_count:m.nodes.length,edge_count:m.edges.length,
      composites:m.nodes.filter(n=>n.kind==='composite').map(n=>({id:n.id,label:n.label,children:childrenOf(m,n.id).map(x=>x.id),collapsed:!!n.collapsed})),
      view:clone(m.view),events:clone(arr(events)),
      recipe:materialize(m),
      residue:[],
      at:new Date().toISOString()
    };
  }

  function seedFurnisher(){
    let m=model({meta:{id:'FURNISHER_ALT_TREE',title:'FURNISHER / PROGRAM SPACE'}});
    const nodes=[
      primitive('intent','INTENT',40,180,[port('out','out','INTENT')],{kind:'SOURCE',value:'make one useful physical configuration'}),
      primitive('bound','BOUND',280,180,[port('in','in','INTENT'),port('out','out','CONSTRAINT')],{kind:'MAP',fn:'WRAP',label:'bounded intent'}),
      primitive('search','SEARCH',520,90,[port('in','in','CONSTRAINT'),port('out','out','CONFIG')],{kind:'MAP',fn:'CONFIG',constraints:{reversible:true,analog_first:true}}),
      primitive('compile','COMPILE',760,90,[port('in','in','CONFIG'),port('out','out','PATTERN')],{kind:'COMPILE',name:'JOINT PATTERN COMPILER',pattern:['POINT','PATH','PLANE','POWER']}),
      primitive('verify','VERIFY',1000,90,[port('in','in','PATTERN'),port('out','out','EVIDENCE')],{kind:'VERIFY',checks:['typed ports','reversible','manual fallback']}),
      primitive('return','RETURN',1240,180,[port('in','in','EVIDENCE'),port('out','out','RECEIPT')],{kind:'RETURN'})
    ];
    m.nodes.push(...nodes);
    const links=[
      ['intent','out','bound','in'],['bound','out','search','in'],['search','out','compile','in'],['compile','out','verify','in'],['verify','out','return','in']
    ];
    for(const [a,ap,b,bp] of links){const d=dock(m,{node:a,port:ap},{node:b,port:bp});m=d.model}
    const f=fold(m,['search','compile','verify'],{id:'compiler-room',label:'FURNISHER COMPILER',collapsed:true,x:510,y:58,w:670,h:170});
    m=f.model;
    return m;
  }

  function seedBlocks(){
    let m=model({meta:{id:'BLOCK_ROOM_DEMO',title:'BLOCK ⇄ ROOM'}});
    m.nodes.push(
      primitive('source','SOURCE',80,160,[port('out','out','TEXT')],{kind:'SOURCE',value:'room becomes block becomes room'}),
      primitive('tokens','TOKENIZE',340,100,[port('in','in','TEXT'),port('out','out','TOKENS')],{kind:'MAP',fn:'TOKENS'}),
      primitive('count','COUNT',590,100,[port('in','in','TOKENS'),port('out','out','NUMBER')],{kind:'MAP',fn:'COUNT'}),
      primitive('sink','WITNESS',850,160,[port('in','in','NUMBER'),port('out','out','EVIDENCE')],{kind:'VERIFY',checks:['non-null']})
    );
    for(const [a,ap,b,bp] of [['source','out','tokens','in'],['tokens','out','count','in'],['count','out','sink','in']]){
      m=dock(m,{node:a,port:ap},{node:b,port:bp}).model;
    }
    m=fold(m,['tokens','count'],{id:'text-room',label:'TEXT TRANSFORM',collapsed:true,x:325,y:70,w:460,h:150}).model;
    return m;
  }

  return {
    SCHEMA,MODEL_VERSION,LEVELS,model,primitive,port,byId,getPort,resolveEndpoint,compatible,dock,
    childrenOf,descendants,leavesOf,boundaryPorts,fold,dissolve,setCollapsed,ancestorChain,
    visibleRepresentative,semanticLevel,scopeMembers,forkSubtree,primitiveGraph,run,materialize,receipt,
    seedFurnisher,seedBlocks
  };
});
