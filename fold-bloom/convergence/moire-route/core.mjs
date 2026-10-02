export const TAU = Math.PI * 2;

export function wrapPhase(x){
  let y = x % TAU;
  if (y > Math.PI) y -= TAU;
  if (y < -Math.PI) y += TAU;
  return y;
}

function hash01(id){
  let h = 2166136261;
  for (let i=0;i<id.length;i++){
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

export function makeFixture(){
  const route = ["0,2","1,2","2,2","2,3","3,3","4,3","4,2","5,2"];
  const coords = new Map();
  for(let y=0;y<6;y++) for(let x=0;x<6;x++) coords.set(`${x},${y}`, {x,y});
  const edges = new Map();
  const add=(a,b)=>{
    if(!edges.has(a)) edges.set(a,new Set());
    if(!edges.has(b)) edges.set(b,new Set());
    edges.get(a).add(b); edges.get(b).add(a);
  };
  for(let i=0;i<route.length-1;i++) add(route[i],route[i+1]);
  [
    ["1,2","1,1"],["1,1","0,1"],
    ["2,2","3,2"],["3,2","3,1"],
    ["2,3","1,3"],["1,3","1,4"],
    ["3,3","3,4"],["3,4","2,4"],
    ["4,3","5,3"],["5,3","5,4"],
    ["4,2","4,1"],["4,1","5,1"]
  ].forEach(e=>add(e[0],e[1]));
  return {
    width:6,height:6,route,routeSet:new Set(route),coords,edges,
    start:route[0],end:route[route.length-1]
  };
}

export function localFrame(fixture,id){
  const i = fixture.route.indexOf(id);
  if(i >= 0){
    const here = fixture.coords.get(id);
    const prev = fixture.coords.get(fixture.route[Math.max(0,i-1)]);
    const next = fixture.coords.get(fixture.route[Math.min(fixture.route.length-1,i+1)]);
    const angle = Math.atan2(next.y-prev.y, next.x-prev.x || 1e-9);
    return {route:true,phaseOffset:0,angleOffset:angle};
  }
  const h = hash01(id);
  return {
    route:false,
    phaseOffset:0.7 + h * 4.8,
    angleOffset:(0.25 + h * 0.65) * (h > 0.5 ? 1 : -1)
  };
}

export function nodeCue(fixture,id,phase=0,orientation=0){
  const f = localFrame(fixture,id);
  const phaseErr = wrapPhase(phase + f.phaseOffset);
  const angleErr = f.route ? orientation : orientation - f.angleOffset;
  const phaseCue = 0.5 + 0.5 * Math.cos(phaseErr);
  const angleCue = Math.exp(-Math.pow(angleErr/0.52,2));
  const cue = phaseCue * 0.72 + angleCue * 0.28;
  return Math.max(0,Math.min(1,cue));
}

function forwardCandidates(fixture, routeIndex){
  const here = fixture.route[routeIndex];
  const prev = routeIndex > 0 ? fixture.route[routeIndex-1] : null;
  return [...(fixture.edges.get(here) || [])].filter(id=>id!==prev);
}

export function routeChoiceAccuracy(fixture,phase=0,orientation=0){
  let correct=0, cases=0, marginSum=0;
  for(let i=0;i<fixture.route.length-1;i++){
    const candidates=forwardCandidates(fixture,i);
    const target=fixture.route[i+1];
    if(!candidates.includes(target) || candidates.length<1) continue;
    const scored=candidates.map(id=>({id,score:nodeCue(fixture,id,phase,orientation)}))
      .sort((a,b)=>b.score-a.score || a.id.localeCompare(b.id));
    if(scored[0].id===target) correct++;
    const targetScore=scored.find(x=>x.id===target).score;
    const bestOther=Math.max(0,...scored.filter(x=>x.id!==target).map(x=>x.score));
    marginSum += targetScore-bestOther;
    cases++;
  }
  return {
    accuracy:cases?correct/cases:0,
    meanMargin:cases?marginSum/cases:0,
    cases
  };
}

export function plainAdjacencyBaseline(fixture){
  let chance=0, cases=0, branchPoints=0;
  for(let i=0;i<fixture.route.length-1;i++){
    const candidates=forwardCandidates(fixture,i);
    if(!candidates.length) continue;
    chance += 1/candidates.length;
    if(candidates.length>1) branchPoints++;
    cases++;
  }
  return {
    localChoiceChance:cases?chance/cases:0,
    branchPoints,
    cases
  };
}

export function continuitySignal(fixture,phase=0,orientation=0){
  const routeVals=fixture.route.map(id=>nodeCue(fixture,id,phase,orientation));
  const off=[...fixture.coords.keys()].filter(id=>!fixture.routeSet.has(id))
    .map(id=>nodeCue(fixture,id,phase,orientation));
  const mean=a=>a.reduce((s,x)=>s+x,0)/Math.max(1,a.length);
  let smooth=0;
  for(let i=0;i<routeVals.length-1;i++) smooth += 1-Math.abs(routeVals[i]-routeVals[i+1]);
  smooth /= Math.max(1,routeVals.length-1);
  const separation=mean(routeVals)-mean(off);
  return Math.max(0,Math.min(1,0.62*separation+0.38*smooth));
}

export function phaseSweep(fixture,{orientation=0,steps=144}={}){
  const rows=[];
  for(let i=0;i<=steps;i++){
    const phase=TAU*i/steps;
    const choice=routeChoiceAccuracy(fixture,phase,orientation);
    const continuity=continuitySignal(fixture,phase,orientation);
    rows.push({phase,choice,continuity});
  }
  const best=[...rows].sort((a,b)=>
    b.choice.accuracy-a.choice.accuracy ||
    b.choice.meanMargin-a.choice.meanMargin ||
    b.continuity-a.continuity
  )[0];
  const worst=[...rows].sort((a,b)=>
    a.choice.accuracy-b.choice.accuracy ||
    a.choice.meanMargin-b.choice.meanMargin ||
    a.continuity-b.continuity
  )[0];
  return {rows,best,worst,baseline:plainAdjacencyBaseline(fixture)};
}

export function evaluateFixture(fixture=makeFixture(),opts={}){
  const sweep=phaseSweep(fixture,opts);
  return {
    ...sweep,
    hypothesis:"Phase-aligned interference provides a stronger local next-route cue than an unlabeled adjacency-only view.",
    falsifier:"Best aligned moire local-choice accuracy fails to exceed the plain local adjacency chance baseline, or continuity does not materially separate aligned from misaligned phase.",
    scope:"Architectural proxy only; does not establish human perceptual superiority."
  };
}
