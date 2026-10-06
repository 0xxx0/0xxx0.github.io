(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.InterphaseHistory=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const VERSION='interphase-history/v0.1';
  const DOC_SCHEMA='interphase-history/v0.1';
  const CHANGE_SCHEMA='interphase-change/v0.1';
  const RETURN_SCHEMA='interphase-return-token/v0.1';
  const SEMANTIC_FIELDS=Object.freeze(['title','thesis','state']);
  const clone=x=>x==null?x:JSON.parse(JSON.stringify(x));
  const canonical=x=>Array.isArray(x)?x.map(canonical):(x&&typeof x==='object'?Object.keys(x).sort().reduce((o,k)=>(o[k]=canonical(x[k]),o),{}):x);
  const stable=x=>JSON.stringify(canonical(x));
  const same=(a,b)=>stable(a)===stable(b);

  function fingerprint(value){
    const s=stable(value),mask=(1n<<64n)-1n,prime=1099511628211n;
    let a=14695981039346656037n,b=7809847782465536322n;
    for(let i=0;i<s.length;i++){
      const c=BigInt(s.charCodeAt(i));
      a=((a^c)*prime)&mask;
      b=((b^(c+BigInt(i&255)))*prime)&mask;
    }
    return a.toString(16).padStart(16,'0')+b.toString(16).padStart(16,'0');
  }

  function semantic(source={}){
    return {
      title:String(source.title??''),
      thesis:String(source.thesis??''),
      state:String(source.state??'SOURCE')
    };
  }
  function applySemantic(source,patch={}){
    const out=clone(source||{});
    for(const k of SEMANTIC_FIELDS)if(Object.prototype.hasOwnProperty.call(patch,k))out[k]=String(patch[k]??'');
    return out;
  }
  function semanticDiff(a,b){
    const before=semantic(a),after=semantic(b),out={};
    for(const k of SEMANTIC_FIELDS)if(!same(before[k],after[k]))out[k]={before:before[k],after:after[k]};
    return out;
  }

  function objectFromRoute(route){
    if(!route||typeof route!=='object'||!route.href)throw new Error('INTERPHASE_ROUTE_REQUIRED');
    const href=String(route.href);
    return {
      schema:'interphase.object/v0.1',
      id:'route:'+href,
      kind:'FIELD_ROUTE',
      title:String(route.title||href),
      thesis:String(route.role||''),
      state:'SOURCE',
      provenance:{
        origin:'/showcase-manifest.json',
        href,
        receipt:route.receipt||null,
        version:route.version||null,
        fingerprint:fingerprint(route)
      },
      payload:clone(route)
    };
  }

  function normalizeAnchor(input={},objectId){
    return {
      object_id:String(input.object_id||objectId||''),
      projection:String(input.projection||'PLAIN').toUpperCase(),
      focus:String(input.focus||objectId||''),
      task:input.task==null?null:String(input.task),
      viewport:clone(input.viewport||null)
    };
  }

  function nodeBody(node){
    return {
      schema:CHANGE_SCHEMA,
      object_id:node.object_id,
      op:node.op,
      parents:clone(node.parents||[]),
      patch:clone(node.patch||{}),
      snapshot:clone(node.snapshot),
      anchor:clone(node.anchor||null),
      meta:clone(node.meta||{})
    };
  }
  function nodeId(body){return 'chg:'+fingerprint(body)};
  function makeNode(objectId,op,parents,patch,snapshot,anchor,meta){
    const body={schema:CHANGE_SCHEMA,object_id:objectId,op,parents:clone(parents||[]),patch:clone(patch||{}),snapshot:clone(snapshot),anchor:normalizeAnchor(anchor,objectId),meta:clone(meta||{})};
    return Object.freeze({id:nodeId(body),...body});
  }
  function verifyNode(node){
    return !!node&&node.schema===CHANGE_SCHEMA&&node.id===nodeId(nodeBody(node));
  }

  function makeGraph(objectId,nodeList,headId){
    const nodes=new Map(nodeList.map(n=>[n.id,Object.freeze(clone(n))]));
    let head=headId;
    const requireNode=id=>{const n=nodes.get(id);if(!n)throw new Error('INTERPHASE_UNKNOWN_CHANGE:'+id);return n};
    const snapshot=id=>clone(requireNode(id).snapshot);
    const source=()=>snapshot(head);

    function add(node,advance=true){
      if(!verifyNode(node))throw new Error('INTERPHASE_BAD_CHANGE_HASH');
      if(node.object_id!==objectId)throw new Error('INTERPHASE_OBJECT_DRIFT');
      for(const p of node.parents)requireNode(p);
      nodes.set(node.id,Object.freeze(clone(node)));
      if(advance)head=node.id;
      return {ok:true,id:node.id,node:clone(node),source:clone(node.snapshot),head};
    }
    function commit(patch={},opts={}){
      const parent=opts.parent||head,base=requireNode(parent),after=applySemantic(base.snapshot,patch),delta=semanticDiff(base.snapshot,after);
      if(!Object.keys(delta).length)return{ok:true,no_op:true,id:parent,source:clone(base.snapshot),head};
      const node=makeNode(objectId,'EDIT',[parent],delta,after,opts.anchor,{lens:opts.lens||'PLAIN',cause:opts.cause||null});
      return add(node,opts.advance!==false);
    }
    function branch(parent,patch={},opts={}){return commit(patch,{...opts,parent,advance:false});}
    function checkout(id){requireNode(id);head=id;return{ok:true,head,source:snapshot(head)};}
    function allAncestors(start){
      const dist=new Map([[start,0]]),q=[start];
      while(q.length){const id=q.shift(),d=dist.get(id);for(const p of requireNode(id).parents){if(!dist.has(p)){dist.set(p,d+1);q.push(p);}}}
      return dist;
    }
    function commonAncestor(a,b){
      const aa=allAncestors(a),bb=allAncestors(b);let best=null,score=Infinity;
      for(const [id,da] of aa){if(!bb.has(id))continue;const s=da+bb.get(id);if(s<score){best=id;score=s;}}
      if(!best)throw new Error('INTERPHASE_NO_COMMON_ANCESTOR');
      return best;
    }
    function merge(leftId,rightId,opts={}){
      const left=requireNode(leftId),right=requireNode(rightId),base=requireNode(commonAncestor(leftId,rightId));
      const bs=semantic(base.snapshot),ls=semantic(left.snapshot),rs=semantic(right.snapshot),merged={},conflicts={};
      for(const k of SEMANTIC_FIELDS){
        if(same(ls[k],rs[k]))merged[k]=ls[k];
        else if(same(ls[k],bs[k]))merged[k]=rs[k];
        else if(same(rs[k],bs[k]))merged[k]=ls[k];
        else conflicts[k]={base:bs[k],left:ls[k],right:rs[k]};
      }
      if(Object.keys(conflicts).length)return{ok:false,reason:'SEMANTIC_CONFLICT',conflicts,base:base.id,left:leftId,right:rightId};
      const after=applySemantic(left.snapshot,merged),delta=semanticDiff(left.snapshot,after);
      const node=makeNode(objectId,'MERGE',[leftId,rightId],delta,after,opts.anchor,{base:base.id,cause:opts.cause||null});
      return add(node,opts.advance!==false);
    }
    function returnTo(targetId,opts={}){
      const from=requireNode(opts.from||head),target=requireNode(targetId),after=applySemantic(from.snapshot,semantic(target.snapshot)),delta=semanticDiff(from.snapshot,after);
      if(!Object.keys(delta).length)return{ok:true,no_op:true,id:from.id,source:clone(from.snapshot),head};
      const node=makeNode(objectId,'RETURN',[from.id],delta,after,opts.anchor,{target:targetId,cause:opts.cause||null});
      return add(node,opts.advance!==false);
    }
    function heads(){
      const parents=new Set();for(const n of nodes.values())for(const p of n.parents)parents.add(p);
      return [...nodes.keys()].filter(id=>!parents.has(id)).sort();
    }
    function makeReturnToken(changeId=head,anchor={}){
      requireNode(changeId);
      const body={schema:RETURN_SCHEMA,object_id:objectId,change:changeId,anchor:normalizeAnchor(anchor,objectId)};
      return Object.freeze({id:'ret:'+fingerprint(body),...body});
    }
    function resolveReturn(token){
      if(!token||token.schema!==RETURN_SCHEMA)throw new Error('INTERPHASE_BAD_RETURN_TOKEN');
      const body={schema:RETURN_SCHEMA,object_id:token.object_id,change:token.change,anchor:token.anchor};
      if(token.id!=='ret:'+fingerprint(body))throw new Error('INTERPHASE_RETURN_TOKEN_TAMPERED');
      if(token.object_id!==objectId)throw new Error('INTERPHASE_RETURN_OBJECT_DRIFT');
      const node=requireNode(token.change);
      return {source:clone(node.snapshot),anchor:{...clone(token.anchor),history_cursor:token.change},change:token.change};
    }
    function serialize(){
      return {schema:DOC_SCHEMA,object_id:objectId,head,nodes:[...nodes.values()].map(clone).sort((a,b)=>a.id.localeCompare(b.id))};
    }
    return Object.freeze({object_id:objectId,head:()=>head,source,snapshot,commit,branch,merge,returnTo,checkout,heads,makeReturnToken,resolveReturn,serialize,nodes:()=>[...nodes.values()].map(clone)});
  }

  function createHistory(initial,opts={}){
    if(!initial||!initial.id)throw new Error('INTERPHASE_OBJECT_ID_REQUIRED');
    const objectId=String(initial.id);
    const root=makeNode(objectId,'IMPORT',[],{},initial,opts.anchor,{cause:opts.cause||'IMPORT'});
    return makeGraph(objectId,[root],root.id);
  }
  function restoreHistory(doc){
    const data=typeof doc==='string'?JSON.parse(doc):clone(doc);
    if(!data||data.schema!==DOC_SCHEMA||!data.object_id||!Array.isArray(data.nodes))throw new Error('INTERPHASE_BAD_HISTORY_DOC');
    const ids=new Set(data.nodes.map(n=>n.id));
    for(const n of data.nodes){
      if(!verifyNode(n))throw new Error('INTERPHASE_BAD_CHANGE_HASH:'+String(n&&n.id));
      if(n.object_id!==data.object_id)throw new Error('INTERPHASE_OBJECT_DRIFT');
      for(const p of n.parents||[])if(!ids.has(p))throw new Error('INTERPHASE_MISSING_PARENT:'+p);
    }
    if(!ids.has(data.head))throw new Error('INTERPHASE_BAD_HEAD');
    return makeGraph(String(data.object_id),data.nodes,data.head);
  }

  return Object.freeze({VERSION,DOC_SCHEMA,CHANGE_SCHEMA,RETURN_SCHEMA,SEMANTIC_FIELDS,stable,fingerprint,semantic,applySemantic,semanticDiff,objectFromRoute,normalizeAnchor,createHistory,restoreHistory});
});
