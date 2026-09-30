(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ShoppingInterphase=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const PHASES=Object.freeze(['NEED','CANDIDATE','READY','INBOUND','ON_HAND','ADOPTED','CLOSED']);
  const GATES=Object.freeze(['duplicate_checked','two_project_or_safety','storage_home','test_72h','interface_fit','seller_verified']);
  const CLOSED_STATES=new Set(['SKIP','EXPIRED','RETURNED','ABANDONED','ARCHIVE']);
  const PRE_STATES=new Set(['FOUND','VERIFY','WATCH','DECIDE']);
  const NEED_STATES=new Set(['NEED','QUERY']);

  const text=(x,f='')=>x==null?f:String(x);
  const arr=x=>Array.isArray(x)?x:[];
  function gateReady(item={}){
    const g=item.gate||{},yes=GATES.filter(k=>g[k]===true).length;
    return yes>=5&&g.two_project_or_safety===true;
  }
  function phaseOf(item={}){
    const s=text(item.state,'NEED').toUpperCase();
    if(NEED_STATES.has(s))return'NEED';
    if(CLOSED_STATES.has(s))return'CLOSED';
    if(s==='ADOPTED')return'ADOPTED';
    if(['RECEIVED','TESTED','REPAIR'].includes(s))return'ON_HAND';
    if(s==='BOUGHT')return'INBOUND';
    if(s==='HOLD')return'CANDIDATE';
    if(PRE_STATES.has(s))return gateReady(item)?'READY':'CANDIDATE';
    return'CANDIDATE';
  }
  function apertureOf(item={}){
    return({
      NEED:'NEED',CANDIDATE:'VERIFY',READY:'DECIDE',INBOUND:'RECEIVE',
      ON_HAND:'PROVE',ADOPTED:'SYSTEM',CLOSED:'HISTORY'
    })[phaseOf(item)];
  }
  function transitionModel(item={}){
    const p=phaseOf(item),out=[];
    if(p==='NEED')out.push({id:'FIND',to:'CANDIDATE',requires:['exact candidate identity']});
    if(p==='CANDIDATE')out.push({id:'VERIFY',to:'READY',requires:['required evidence gates'],supported:gateReady(item)});
    if(p==='READY')out.push({id:'ACQUIRE',to:'INBOUND',requires:['human money/seller action','receipt/order evidence']});
    if(p==='INBOUND')out.push({id:'RECEIVE',to:'ON_HAND',requires:['physical possession evidence']});
    if(p==='ON_HAND')out.push({id:'PROVE',to:'ADOPTED',requires:['named adoption criterion','accepted test evidence']});
    if(p!=='CLOSED')out.push({id:'CLOSE',to:'CLOSED',requires:['typed close reason']});
    return out;
  }
  function nativeMoves(item={}){
    const p=phaseOf(item),moves=[],source=text(item.source_url);
    const push=x=>{if(moves.length<3&&!moves.some(y=>y.id===x.id))moves.push(x)};
    if(p==='NEED')push({id:'AGENT_PACKET',label:'RESEARCH PACKET',authority:'VIEW',target:'/shopping/#'+encodeURIComponent(text(item.id))});
    if(['CANDIDATE','READY','ON_HAND','ADOPTED'].includes(p))push({id:'HOUSE_FIT',label:'HOUSE FIT',authority:'OFFER',target:'/house/?fit=shopping'});
    if(source&&p!=='CLOSED')push({id:'OPEN_SOURCE',label:'OPEN SOURCE',authority:'NAVIGATION',target:source});
    if(p!=='CLOSED')push({id:'DAYLINE',label:p==='ON_HAND'?'PROVE IN DAYLINE':'DAYLINE',authority:'OFFER',target:'/dayline/?handoff=shopping'});
    if(p==='CLOSED'&&source)push({id:'OPEN_SOURCE',label:'OPEN SOURCE',authority:'NAVIGATION',target:source});
    return moves.slice(0,3);
  }
  function carrierFor(item={},ctx={},carrierApi){
    const C=carrierApi;if(!C||typeof C.make!=='function')throw Error('InterphaseCarrier required');
    const id=text(item.id),address='/shopping/#'+encodeURIComponent(id),phase=phaseOf(item),ev=ctx.evidence||{};
    return C.make({
      object:{id,kind:phase==='NEED'?'need':'thing',label:text(item.label,id),owner:'SHOPPING',address,contract:'shopping-item/v0.1'},
      focus:{id,label:text(item.label,id),address,aperture:apertureOf(item)},
      next:nativeMoves(item),
      witness:{class:phase==='ADOPTED'?'EVIDENCE':'UNPROVED',summary:[phase,text(item.state),text(ev.boundary)].filter(Boolean).join(' · '),evidenceRefs:arr(ctx.evidenceRefs)},
      return:{address,owner:'SHOPPING',label:'RETURN TO SHOPPING'},
      projection:{host:'SHOPPING',name:'ONE_OBJECT',channels:['identity','lifecycle','cost','fit','burden','evidence'],residue:[
        {id:'native-state',channel:'lifecycle',projection:text(item.state)},
        {id:'detailed-ledger',channel:'evidence',projection:'legacy/detail fields remain host-owned'}
      ]},
      sourceRefs:[address,...arr(ctx.sourceRefs)],
      meta:{phase,sourceState:text(item.state),gateReady:gateReady(item),lane:text(item.lane,'CAPABILITY')}
    });
  }
  function actionSurface(item={},ctx={},carrierApi){
    const C=carrierApi;if(!C||typeof C.actionSurface!=='function')throw Error('InterphaseCarrier required');
    return C.actionSurface(carrierFor(item,ctx,C));
  }
  return Object.freeze({PHASES,GATES,gateReady,phaseOf,apertureOf,transitionModel,nativeMoves,carrierFor,actionSurface});
});