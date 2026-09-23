(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.InterphaseRing=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION='interphase-ring/v0.1';
  const TAU=Math.PI*2;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const wrap=(v,n=1)=>((v%n)+n)%n;
  function assertCount(count){
    const n=Math.trunc(Number(count));
    if(!(n>=2))throw new TypeError('ring count must be >= 2');
    return n;
  }
  function circularDelta(a,b,n=1){
    n=Number(n)||1;
    let d=(Number(a)-Number(b))%n;
    if(d>n/2)d-=n;
    if(d<-n/2)d+=n;
    return d;
  }
  function circularDistance(a,b,n=1){return Math.abs(circularDelta(a,b,n))}
  function nearestEquivalent(target,current,period=TAU){
    let t=Number(target)||0,c=Number(current)||0,p=Math.abs(Number(period)||TAU);
    while(t-c>p/2)t-=p;
    while(t-c<-p/2)t+=p;
    return t;
  }
  function slotAngle(index,count,{rotation=0,phase=-Math.PI/2}={}){
    const n=assertCount(count),i=wrap(Math.trunc(Number(index)||0),n);
    return Number(phase)+Number(rotation)+i*TAU/n;
  }
  function positionFromAngle(angle,count,{rotation=0,phase=-Math.PI/2}={}){
    const n=assertCount(count);
    return wrap(((Number(angle)-Number(phase)-Number(rotation))/TAU)*n,n);
  }
  function pointPosition(x,y,cx,cy,count,opt={}){
    return positionFromAngle(Math.atan2(Number(y)-Number(cy),Number(x)-Number(cx)),count,opt);
  }
  function pointIndex(x,y,cx,cy,count,opt={}){
    const n=assertCount(count);
    return wrap(Math.round(pointPosition(x,y,cx,cy,n,opt)),n);
  }
  function gateIndex({count,rotation=0,phase=-Math.PI/2,gateAngle=-Math.PI/2}={}){
    const n=assertCount(count);
    return wrap(Math.round(positionFromAngle(gateAngle,n,{rotation,phase})),n);
  }
  function rotationForSlot(index,{count,gateAngle=-Math.PI/2,phase=-Math.PI/2,current=0}={}){
    const n=assertCount(count),i=wrap(Math.trunc(Number(index)||0),n);
    const raw=Number(gateAngle)-Number(phase)-i*TAU/n;
    return nearestEquivalent(raw,Number(current)||0,TAU);
  }
  function stepRotation(rotation,dir,count){
    const n=assertCount(count),d=Math.sign(Number(dir)||0);
    return Number(rotation)+(d*TAU/n);
  }
  function relation(a,b,count){
    const n=assertCount(count),signed=circularDelta(Number(b)||0,Number(a)||0,n),distance=Math.abs(signed);
    const opposite=n%2===0&&Math.abs(distance-n/2)<1e-9;
    const kind=distance<1e-9?'SAME':opposite?'OPPOSITE':distance<=1?'NEAR':'FAR';
    return Object.freeze({kind,signed,distance,offset:wrap((Number(b)||0)-(Number(a)||0),n),count:n,opposite});
  }
  function relationVerb(a,b,count,map={}){
    const r=relation(a,b,count);
    const verbs={SAME:'BLOOM',NEAR:'FOLD',FAR:'RETURN',OPPOSITE:'SPLIT',...map};
    return verbs[r.kind];
  }
  function slots(count,{rotation=0,phase=-Math.PI/2,gateAngle=-Math.PI/2}={}){
    const n=assertCount(count),gate=gateIndex({count:n,rotation,phase,gateAngle});
    return Array.from({length:n},(_,index)=>Object.freeze({
      index,
      angle:slotAngle(index,n,{rotation,phase}),
      gate:index===gate,
      opposite:n%2===0?((index+n/2)%n):null
    }));
  }
  function model({count,rotation=0,phase=-Math.PI/2,gateAngle=-Math.PI/2,items=[]}={}){
    const n=assertCount(count),ss=slots(n,{rotation,phase,gateAngle});
    return Object.freeze({
      schema:VERSION,count:n,rotation:Number(rotation)||0,phase:Number(phase),gateAngle:Number(gateAngle),
      gateIndex:ss.find(x=>x.gate)?.index??0,
      slots:ss.map(s=>Object.freeze({...s,item:items[s.index]??null}))
    });
  }
  return Object.freeze({
    VERSION,TAU,clamp,wrap,circularDelta,circularDistance,nearestEquivalent,
    slotAngle,positionFromAngle,pointPosition,pointIndex,gateIndex,rotationForSlot,stepRotation,
    relation,relationVerb,slots,model
  });
});