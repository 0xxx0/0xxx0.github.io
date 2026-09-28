(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.SleeperRouteWitness=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const SCHEMA='sleeper.route-witness/v0.1';
  const OWNER='SLEEPER_DONOR';
  const AUTHORITY='EVIDENCE_ONLY';
  const LAW='TRAVERSED != OPTIMAL != UNDERSTOOD != PROVED. RouteWitness records where this run moved inside one exact world; it cannot satisfy canonical ONE RETURN v2 Gate proofs.';

  const text=(x,d='')=>x==null?d:String(x);
  const arr=x=>Array.isArray(x)?x:[];
  const int=x=>Number.isInteger(x)?x:null;
  const clone=x=>x==null?x:JSON.parse(JSON.stringify(x));

  function hashString(value=''){
    let h=2166136261>>>0;
    for(const ch of text(value).normalize('NFC')){
      h^=ch.codePointAt(0)??0;
      h=Math.imul(h,16777619)>>>0;
    }
    return (h>>>0).toString(16).padStart(8,'0');
  }
  function sourceUnits(source){
    return arr(source).map(x=>text(x).trim()).filter(Boolean);
  }
  function canonicalWorldInput({seed='',source=[],adapter='mixed',epoch=0,size={w:39,h:23}}={}){
    const w=Number(size?.w),h=Number(size?.h);
    return{
      seed:text(seed).trim()||'sleeper',
      source:sourceUnits(source),
      adapter:text(adapter||'mixed'),
      epoch:Math.max(0,Math.trunc(Number(epoch)||0)),
      size:{w:Number.isFinite(w)?Math.max(1,Math.trunc(w)):39,h:Number.isFinite(h)?Math.max(1,Math.trunc(h)):23}
    };
  }
  function worldId(input){
    const x=canonicalWorldInput(input);
    return 'donor-world:'+hashString(JSON.stringify(x));
  }
  function point(p){
    if(!Array.isArray(p)||p.length<2||int(Number(p[0]))==null||int(Number(p[1]))==null)throw Error('route point must be integer [x,y]');
    return [Number(p[0]),Number(p[1])];
  }
  function normalizePositions(positions=[]){
    const xs=arr(positions).map(point);
    if(!xs.length)throw Error('route requires at least one position');
    return xs;
  }
  function direction(a,b){
    const dx=b[0]-a[0],dy=b[1]-a[1];
    if(dx===1&&dy===0)return 'R';
    if(dx===-1&&dy===0)return 'L';
    if(dx===0&&dy===1)return 'D';
    if(dx===0&&dy===-1)return 'U';
    throw Error('route contains non-cardinal or non-adjacent movement');
  }
  function directions(positions=[]){
    const xs=normalizePositions(positions),out=[];
    for(let i=1;i<xs.length;i++)out.push(direction(xs[i-1],xs[i]));
    return out;
  }
  function encodeDirections(ds=[]){
    const xs=arr(ds).map(text).filter(Boolean);
    if(!xs.length)return '';
    const out=[];let prev=xs[0],n=1;
    if(!/^[UDLR]$/.test(prev))throw Error('invalid direction');
    for(let i=1;i<xs.length;i++){
      const d=xs[i];if(!/^[UDLR]$/.test(d))throw Error('invalid direction');
      if(d===prev)n++;else{out.push(prev+String(n));prev=d;n=1}
    }
    out.push(prev+String(n));
    return out.join(',');
  }
  function decodeDirections(rle=''){
    const raw=text(rle).trim();if(!raw)return[];
    return raw.split(',').map(part=>{
      const m=/^([UDLR])([1-9]\d*)$/.exec(part.trim());
      if(!m)throw Error('invalid route RLE');
      return Array.from({length:Number(m[2])},()=>m[1]);
    }).flat();
  }
  function positionsFrom(start,rle=''){
    const p=point(start),out=[p.slice()];
    for(const d of decodeDirections(rle)){
      const q=out.at(-1).slice();
      if(d==='U')q[1]--;else if(d==='D')q[1]++;else if(d==='L')q[0]--;else q[0]++;
      out.push(q);
    }
    return out;
  }
  function uniqueStats(xs){
    const seen=new Set(xs.map(p=>p.join(','))),xv=xs.map(p=>p[0]),yv=xs.map(p=>p[1]);
    return{
      uniquePositions:seen.size,
      revisits:Math.max(0,xs.length-seen.size),
      bounds:{minX:Math.min(...xv),maxX:Math.max(...xv),minY:Math.min(...yv),maxY:Math.max(...yv)}
    };
  }
  function gateCheckpoints(gates,positions){
    const out=[];
    for(const g of arr(gates)){
      if(!g||!Number.isInteger(Number(g.x))||!Number.isInteger(Number(g.y)))continue;
      const key=Number(g.x)+','+Number(g.y),hits=[];
      positions.forEach((p,i)=>{if(p.join(',')===key)hits.push(i)});
      out.push({
        gate:Number.isFinite(Number(g.id))?Number(g.id):text(g.id),
        x:Number(g.x),y:Number(g.y),status:text(g.status),
        firstStep:hits.length?hits[0]:null,lastStep:hits.length?hits.at(-1):null,visits:hits.length
      });
    }
    return out;
  }
  function eventWindow(events=[]){
    const xs=arr(events),types={};
    for(const e of xs){const k=text(e?.type||'UNKNOWN');types[k]=(types[k]||0)+1}
    return{observed:xs.length,bounded:xs.length>=700,types};
  }
  function make({
    seed='',source=[],adapter='mixed',epoch=0,size={w:39,h:23},
    positions=[],runSteps=null,gates=[],events=[],returnsBefore=0,
    startedAt=null,endedAt=null,status='COMPLETE',label=''
  }={}){
    const world=canonicalWorldInput({seed,source,adapter,epoch,size}),wid=worldId(world),xs=normalizePositions(positions);
    const ds=directions(xs),rle=encodeDirections(ds),movementSteps=ds.length;
    const steps=runSteps==null?movementSteps:Math.max(0,Math.trunc(Number(runSteps)||0));
    if(steps<movementSteps)throw Error('runSteps cannot be less than movementSteps');
    const stats=uniqueStats(xs),checkpoints=gateCheckpoints(gates,xs);
    const pathHash='route:'+hashString(wid+'|'+xs[0].join(',')+'|'+rle);
    return{
      schema:SCHEMA,owner:OWNER,authority:AUTHORITY,status:text(status||'COMPLETE'),
      label:text(label||'SLEEPER ROUTE').slice(0,120),
      world:{id:wid,inputs:world},
      route:{
        encoding:'CARDINAL_RLE_V1',start:xs[0],end:xs.at(-1),rle,pathHash,
        movementSteps,runSteps:steps,nonMovementSteps:steps-movementSteps,
        uniquePositions:stats.uniquePositions,revisits:stats.revisits,bounds:stats.bounds,
        checkpoints
      },
      eventWindow:eventWindow(events),
      run:{
        returnsBefore:Math.max(0,Math.trunc(Number(returnsBefore)||0)),
        startedAt:text(startedAt),endedAt:text(endedAt)
      },
      law:LAW
    };
  }
  function validate(w){
    const errors=[];
    if(!w||typeof w!=='object')return{ok:false,errors:['witness must be object']};
    if(w.schema!==SCHEMA)errors.push('schema mismatch');
    if(w.owner!==OWNER)errors.push('owner mismatch');
    if(w.authority!==AUTHORITY)errors.push('authority mismatch');
    const wi=w.world?.inputs,expectedWorld=wi?worldId(wi):'';
    if(!wi)errors.push('world inputs missing');
    if(text(w.world?.id)!==expectedWorld)errors.push('world id mismatch');
    let ps=[];
    try{ps=positionsFrom(w.route?.start,w.route?.rle)}catch(e){errors.push(String(e.message||e))}
    if(ps.length){
      if(JSON.stringify(ps.at(-1))!==JSON.stringify(w.route?.end))errors.push('route end mismatch');
      const ds=ps.length-1;
      if(Number(w.route?.movementSteps)!==ds)errors.push('movementSteps mismatch');
      if(Number(w.route?.runSteps)<ds)errors.push('runSteps precede movementSteps');
      const ph='route:'+hashString(expectedWorld+'|'+ps[0].join(',')+'|'+text(w.route?.rle));
      if(text(w.route?.pathHash)!==ph)errors.push('path hash mismatch');
      const stats=uniqueStats(ps);
      if(Number(w.route?.uniquePositions)!==stats.uniquePositions)errors.push('uniquePositions mismatch');
      if(Number(w.route?.revisits)!==stats.revisits)errors.push('revisits mismatch');
      const sz=canonicalWorldInput(wi).size;
      if(ps.some(p=>p[0]<0||p[1]<0||p[0]>=sz.w||p[1]>=sz.h))errors.push('route leaves declared world bounds');
    }
    return{ok:errors.length===0,errors,positions:ps,worldId:expectedWorld};
  }
  function overlap(a,b){
    const A=new Set(a.map(p=>p.join(','))),B=new Set(b.map(p=>p.join(',')));
    let inter=0;for(const k of A)if(B.has(k))inter++;
    const union=new Set([...A,...B]).size;
    return union?inter/union:1;
  }
  function compare(a,b){
    const A=validate(a),B=validate(b);
    if(!A.ok||!B.ok)return{ok:false,status:'INVALID_WITNESS',errors:[...A.errors,...B.errors]};
    if(A.worldId!==B.worldId)return{ok:false,status:'DIFFERENT_WORLD',a:A.worldId,b:B.worldId};
    const n=Math.min(A.positions.length,B.positions.length);let divergence=null;
    for(let i=0;i<n;i++){if(A.positions[i][0]!==B.positions[i][0]||A.positions[i][1]!==B.positions[i][1]){divergence=i;break}}
    if(divergence==null&&A.positions.length!==B.positions.length)divergence=n;
    const cpA=new Map(arr(a.route?.checkpoints).map(x=>[String(x.gate),x]));
    const cpB=new Map(arr(b.route?.checkpoints).map(x=>[String(x.gate),x]));
    const gateDeltas=[];
    for(const [gate,x] of cpA){if(cpB.has(gate)){const y=cpB.get(gate);gateDeltas.push({gate,firstStepA:x.firstStep,firstStepB:y.firstStep,delta:(x.firstStep==null||y.firstStep==null)?null:y.firstStep-x.firstStep})}}
    return{
      ok:true,status:'SAME_WORLD',worldId:A.worldId,
      pathOverlap:Number(overlap(A.positions,B.positions).toFixed(6)),
      divergenceStep:divergence,
      sameEnd:JSON.stringify(A.positions.at(-1))===JSON.stringify(B.positions.at(-1)),
      movementSteps:{a:a.route.movementSteps,b:b.route.movementSteps,delta:b.route.movementSteps-a.route.movementSteps},
      runSteps:{a:a.route.runSteps,b:b.route.runSteps,delta:b.route.runSteps-a.route.runSteps},
      revisits:{a:a.route.revisits,b:b.route.revisits,delta:b.route.revisits-a.route.revisits},
      gateDeltas,
      law:'SAME_WORLD comparison describes route difference only; shorter, earlier or more overlapping is not automatically better.'
    };
  }

  return Object.freeze({
    SCHEMA,OWNER,AUTHORITY,LAW,hashString,canonicalWorldInput,worldId,
    directions,encodeDirections,decodeDirections,positionsFrom,make,validate,compare
  });
});
