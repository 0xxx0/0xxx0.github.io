(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.InterphaseMapping=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION='interphase-mapping/v0.1';
  const clone=x=>x==null?x:JSON.parse(JSON.stringify(x));
  const stable=x=>{
    const norm=v=>Array.isArray(v)?v.map(norm):(v&&typeof v==='object'?Object.keys(v).sort().reduce((o,k)=>(o[k]=norm(v[k]),o),{}):v);
    return JSON.stringify(norm(x));
  };
  const arr=x=>Array.isArray(x)?x:[];

  function normalize(spec={}){
    return {
      schema:spec.schema||VERSION,
      id:String(spec.id||'mapping'),
      host:String(spec.host||'UNKNOWN'),
      facets:arr(spec.facets).map((f,i)=>({
        facet_id:String(f.facet_id||('facet_'+i)),
        label:String(f.label||f.facet_id||('FACET '+i)),
        office:f.office==null?null:String(f.office),
        selector:clone(f.selector||{}),
        channels:arr(f.channels).map(String),
        operations:arr(f.operations).map(x=>typeof x==='string'?{id:x,authority:'VIEW'}:clone(x)),
        authority:String(f.authority||'VIEW'),
        residue:clone(f.residue||{})
      })),
      placements:clone(spec.placements||{}),
      fallback_facet:spec.fallback_facet==null?null:String(spec.fallback_facet)
    };
  }

  function matches(sel={},node={}){
    if(sel.id!=null&&String(node.id)!==String(sel.id))return false;
    if(sel.kind!=null&&String(node.kind)!==String(sel.kind))return false;
    if(sel.role!=null&&String(node.role)!==String(sel.role))return false;
    if(sel.channel!=null&&!arr(node.channels).includes(sel.channel))return false;
    if(sel.capability!=null&&!arr(node.capabilities).includes(sel.capability))return false;
    if(sel.path!=null){
      const a=String(node.address?.path??node.address?.selector??node.address??'');
      if(!a.includes(String(sel.path)))return false;
    }
    return true;
  }

  function facetFor(spec,node){
    const m=normalize(spec);
    return m.facets.find(f=>matches(f.selector,node))||m.facets.find(f=>f.facet_id===m.fallback_facet)||null;
  }

  function placementFor(spec,projection,scale,facetId){
    const m=normalize(spec),p=m.placements?.[projection]||{};
    const s=p?.[scale]||p?.DEFAULT||{};
    return clone(s?.[facetId]??p?.facets?.[facetId]??null);
  }

  function mapNode(spec,node,{projection='PAGE',scale='working'}={}){
    const facet=facetFor(spec,node);
    if(!facet)return{ok:false,node_id:node?.id||null,reason:'NO_FACET_MAPPING'};
    const placement=placementFor(spec,projection,scale,facet.facet_id);
    const declared=new Set(facet.channels),actual=arr(node.channels);
    const residue=actual.filter(ch=>!declared.has(ch)).map(channel=>({node_id:node.id,facet_id:facet.facet_id,channel,reason:'FACET_CHANNEL_NOT_DECLARED'}));
    if(placement?.visible===false)for(const channel of actual)residue.push({node_id:node.id,facet_id:facet.facet_id,channel,reason:'PROJECTION_SUPPRESSED'});
    return{ok:true,node_id:node.id,facet_id:facet.facet_id,office:facet.office,authority:facet.authority,placement,residue};
  }

  function mapNodes(spec,nodes,opt){return arr(nodes).map(n=>mapNode(spec,n,opt))}

  function checkProjectionPurity(source,project){
    const before=stable(source);project(source);return{pass:stable(source)===before,before,after:stable(source)};
  }

  function checkLens({source,get,put,edit=x=>x}){
    const view=get(source),getPut=put(source,clone(view)),edited=edit(clone(view)),putSource=put(source,edited),putGet=get(putSource);
    return{
      get_put:stable(getPut)===stable(source),
      put_get:stable(putGet)===stable(edited),
      source:clone(source),view:clone(view),edited_view:clone(edited),put_source:clone(putSource)
    };
  }

  function checkCommutation({source,canonicalOp,project,viewOp,equal=(a,b)=>stable(a)===stable(b)}){
    const canonicalThenProject=project(canonicalOp(clone(source)));
    const projectThenViewOp=viewOp(project(clone(source)));
    return{pass:!!equal(canonicalThenProject,projectThenViewOp),canonicalThenProject,projectThenViewOp};
  }

  return Object.freeze({VERSION,normalize,matches,facetFor,placementFor,mapNode,mapNodes,checkProjectionPurity,checkLens,checkCommutation,stable});
});