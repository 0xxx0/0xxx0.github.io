(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.RoomRail=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const clone=x=>JSON.parse(JSON.stringify(x));
  const arr=x=>Array.isArray(x)?x:[];
  function hash(s){let h=2166136261;for(const c of String(s||'')){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
  function typeKey(type,width=5){
    const t=String(type||'VOID').toUpperCase(),h=hash(t),bits=[];
    for(let i=0;i<width;i++)bits.push((h>>>(i*5))&1);
    if(!bits.some(Boolean))bits[0]=1;
    return {type:t,bits:bits.join(''),hash:h.toString(16).padStart(8,'0')};
  }
  function io(n){
    const ps=arr(n?.ports),ins=ps.filter(p=>p.dir==='in'),outs=ps.filter(p=>p.dir==='out');
    const pick=xs=>xs.length?xs[0]:null;
    return {in:pick(ins),out:pick(outs),ins,outs};
  }
  function typeFit(a,b){
    const A=String(a||''),B=String(b||'');
    if(!A||!B)return {ok:false,status:'OPEN',type:A||B||'VOID'};
    const ok=A==='ANY'||B==='ANY'||A===B;
    return {ok,status:ok?'FIT':'MISMATCH',type:A==='ANY'?B:A};
  }
  function nodesFor(m,scope=null){
    return arr(m?.nodes).filter(n=>(n.parent??null)===(scope??null))
      .sort((a,b)=>(Number(a.x)||0)-(Number(b.x)||0)||(Number(a.y)||0)-(Number(b.y)||0)||String(a.id).localeCompare(String(b.id)));
  }
  function rail(m,scope=null){
    const nodes=nodesFor(m,scope),seams=[];
    for(let i=0;i<nodes.length-1;i++){
      const L=nodes[i],R=nodes[i+1],A=io(L).out,B=io(R).in,fit=typeFit(A?.type,B?.type);
      seams.push({index:i,left:L.id,right:R.id,left_type:A?.type||null,right_type:B?.type||null,...fit,key:typeKey(fit.type)});
    }
    return {scope:scope||null,nodes,seams};
  }
  function span(ids,a,b){
    const xs=arr(ids),ia=xs.indexOf(a),ib=xs.indexOf(b);
    if(ia<0||ib<0)return[];
    const lo=Math.min(ia,ib),hi=Math.max(ia,ib);
    return xs.slice(lo,hi+1);
  }
  function binding(predicted,measured,tolerance,contractFit=true){
    const p=Number(predicted),m=Number(measured),t=Math.abs(Number(tolerance));
    const valid=[p,m,t].every(Number.isFinite)&&t>0;
    const gap=valid?Math.abs(m-p)/t:null,modelFit=valid?gap<=1:false;
    return {
      valid,predicted:p,measured:m,tolerance:t,normalized_gap:gap,
      model_fit:modelFit,contract_fit:!!contractFit,
      interpretation:!valid?'INVALID':
        modelFit&&contractFit?'MODEL_AND_CONTRACT_FIT':
        !modelFit&&contractFit?'MODEL_RECALIBRATION_REQUIRED':
        modelFit&&!contractFit?'PHYSICAL_CONTRACT_FAILED':'MODEL_AND_CONTRACT_FAILED'
    };
  }
  function recipe(m,scope=null){
    const r=rail(m,scope);
    return {
      schema:'0xxx0/material-rail-recipe/v0.3',
      object_id:m?.meta?.id||m?.meta?.title||'ROOM_RAIL',
      scope:scope||null,
      slots:r.nodes.map((n,i)=>{
        const q=io(n);
        return {
          address:'@'+String(i).padStart(2,'0'),id:n.id,label:n.label,kind:n.kind,
          input:q.in?.type||null,output:q.out?.type||null,
          input_key:q.in?typeKey(q.in.type):null,output_key:q.out?typeKey(q.out.type):null,
          operator:clone(n.operator||{}),child_count:arr(m.nodes).filter(x=>x.parent===n.id).length
        };
      }),
      seams:r.seams.map(s=>({left:s.left,right:s.right,status:s.status,type:s.type,key:s.key})),
      warning:'TOPOLOGY / KEYING RECIPE ONLY · physical dimensions, loads, tolerance and safety require independent evidence'
    };
  }
  function receipt(m,scope,focus,events=[],bind=null){
    const rec=recipe(m,scope);
    return {
      schema:'0xxx0/material-rail-return/v0.3',
      object_id:rec.object_id,scope:scope||null,focus:focus||null,
      slots:rec.slots.length,seams:rec.seams,
      binding:bind?clone(bind):null,events:clone(arr(events)).slice(-64),
      recipe:rec,at:new Date().toISOString()
    };
  }
  return {hash,typeKey,io,typeFit,nodesFor,rail,span,binding,recipe,receipt};
});