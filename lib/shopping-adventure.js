(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ShoppingAdventure=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const PACK_SCHEMA='shopping-adventure-pack/v0.1';
  const STATE_SCHEMA='field-shopping-state/v0.1';
  const clone=x=>x==null?x:JSON.parse(JSON.stringify(x));
  const arr=x=>Array.isArray(x)?x:[];
  const text=x=>x==null?'':String(x);
  const uniq=xs=>[...new Set(arr(xs).map(text).filter(Boolean))];
  const missing=v=>v==null||v===''||(Array.isArray(v)&&v.length===0);
  function adventureMeta(raw={}){
    const a=raw.adventure||{};
    return{
      id:text(a.id||raw.id||('adventure-'+Date.now())),
      label:text(a.label||raw.label||'Shopping adventure'),
      occurred_at:text(a.occurred_at||a.date||raw.occurred_at||''),
      source_refs:uniq(a.source_refs||a.sources||raw.source_refs),
      notes:text(a.notes||raw.notes||'')
    };
  }
  function normalizePack(raw={}){
    if(raw.schema===PACK_SCHEMA){
      if(!Array.isArray(raw.items))throw Error('adventure items array required');
      return{schema:PACK_SCHEMA,adventure:adventureMeta(raw),items:clone(raw.items)};
    }
    if(raw.schema===STATE_SCHEMA&&Array.isArray(raw.items)){
      return{schema:PACK_SCHEMA,adventure:adventureMeta({
        id:raw.trial_pack?.id||raw.id||('state-import-'+Date.now()),
        label:raw.trial_pack?.kind||raw.label||'Shopping Field import',
        occurred_at:raw.updated||'',
        source_refs:raw.trial_pack?.source_refs||[],
        notes:raw.trial_pack?.basis||''
      }),items:clone(raw.items)};
    }
    if(Array.isArray(raw.items)){
      return{schema:PACK_SCHEMA,adventure:adventureMeta(raw),items:clone(raw.items)};
    }
    throw Error('unsupported shopping adventure pack');
  }
  function mergeItem(existing,incoming,adventureId){
    const out=clone(existing||{});
    const src=clone(incoming||{});
    for(const [k,v] of Object.entries(src)){
      if(k==='id'||k==='adventure_ids')continue;
      if(missing(out[k])&&!missing(v))out[k]=v;
    }
    out.id=text(out.id||src.id);
    out.adventure_ids=uniq([...(out.adventure_ids||[]),...(src.adventure_ids||[]),adventureId]);
    return out;
  }
  function merge(state={},raw={}){
    const base=state&&state.schema===STATE_SCHEMA&&Array.isArray(state.items)?clone(state):{schema:STATE_SCHEMA,updated:null,currency:'SGD',items:[]};
    const pack=normalizePack(raw),aid=pack.adventure.id;
    const byId=new Map(base.items.map((x,i)=>[text(x.id),{item:x,index:i}]).filter(x=>x[0]));
    let added=0,matched=0;
    for(const incoming of pack.items){
      const id=text(incoming?.id);if(!id)continue;
      const found=byId.get(id);
      if(found){base.items[found.index]=mergeItem(found.item,incoming,aid);matched++}
      else{
        const next=mergeItem({id},incoming,aid);
        base.items.unshift(next);added++;
      }
    }
    base.adventures=arr(base.adventures).filter(x=>x&&x.id!==aid);
    base.adventures.push(pack.adventure);
    base.updated=new Date().toISOString();
    return{state:base,adventure:pack.adventure,added,matched,total:base.items.length};
  }
  return Object.freeze({PACK_SCHEMA,STATE_SCHEMA,normalizePack,merge,mergeItem});
});