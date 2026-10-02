export const PATH_COMPARE_SCHEMA='fold-bloom-change-calculus/path-compare/v0.1';

const round=(x,n=6)=>Number(Number(x).toFixed(n));
const tokenBinary=token=>{
  const m=String(token||'').match(/^H\[([01]{3})\|([01]{3})\]$/);
  return m?m[1]+m[2]:null;
};
const binaryOk=x=>/^[01]{6}$/.test(String(x||''));
const hamming=(a,b)=>{
  if(!binaryOk(a)||!binaryOk(b))return null;
  let d=0;for(let i=0;i<6;i++)if(a[i]!==b[i])d++;
  return d;
};
const sameSet=(a,b)=>a.length===b.length&&a.every(x=>b.includes(x));
const symdiff=(a,b)=>[...new Set([...a.filter(x=>!b.includes(x)),...b.filter(x=>!a.includes(x))])].sort((x,y)=>x-y);

function pathStates(path){
  const steps=Array.isArray(path?.steps)?path.steps:[];
  const start=steps[0]?.before_binary||tokenBinary(path?.from_token);
  if(!binaryOk(start))return null;
  const states=[String(start)];
  for(const step of steps){
    const after=step?.after_binary||tokenBinary(step?.after_token);
    if(!binaryOk(after))return null;
    states.push(String(after));
  }
  return states;
}

function kendallDistance(orderA,orderB){
  if(!sameSet(orderA,orderB))return null;
  const pos=new Map(orderB.map((x,i)=>[x,i]));
  const projected=orderA.map(x=>pos.get(x));
  let inversions=0;
  for(let i=0;i<projected.length;i++)for(let j=i+1;j<projected.length;j++)if(projected[i]>projected[j])inversions++;
  const max=orderA.length*(orderA.length-1)/2;
  return {inversions,max,normalized:max?round(inversions/max):0};
}

export function compareStatePaths(pathA,pathB){
  if(!pathA?.ok||!pathB?.ok)return {ok:false,schema:PATH_COMPARE_SCHEMA,reason:'TWO_VALID_STATE_PATHS_REQUIRED'};
  if(pathA.from_token!==pathB.from_token||pathA.to_token!==pathB.to_token){
    return {ok:false,schema:PATH_COMPARE_SCHEMA,reason:'PATH_ENDPOINTS_MUST_MATCH'};
  }
  const orderA=(pathA.selected_order||[]).map(Number),orderB=(pathB.selected_order||[]).map(Number);
  if(!sameSet(orderA,orderB))return {ok:false,schema:PATH_COMPARE_SCHEMA,reason:'PATHS_MUST_PERMUTE_THE_SAME_MOVING_LINES'};
  const statesA=pathStates(pathA),statesB=pathStates(pathB);
  if(!statesA||!statesB||statesA.length!==statesB.length){
    return {ok:false,schema:PATH_COMPARE_SCHEMA,reason:'ADDRESSED_INTERMEDIATE_STATES_REQUIRED'};
  }
  const rows=statesA.map((binary,depth)=>{
    const b=statesB[depth],distance=hamming(binary,b),prefixA=orderA.slice(0,depth),prefixB=orderB.slice(0,depth);
    return {
      depth,
      a_binary:binary,
      b_binary:b,
      hamming_distance:distance,
      same_state:distance===0,
      a_prefix:prefixA,
      b_prefix:prefixB,
      prefix_symmetric_difference:symdiff(prefixA,prefixB)
    };
  });
  const divergent=rows.filter(x=>x.hamming_distance>0),rejoins=[];
  for(let i=1;i<rows.length;i++)if(rows[i].same_state&&!rows[i-1].same_state)rejoins.push(rows[i].depth);
  const k=orderA.length,area=rows.reduce((n,x)=>n+(x.hamming_distance||0),0),maxArea=Math.floor((k*k)/2),kendall=kendallDistance(orderA,orderB);
  return {
    ok:true,
    schema:PATH_COMPARE_SCHEMA,
    authority:'CALCULATION_ONLY',
    from_token:pathA.from_token,
    to_token:pathA.to_token,
    moving_lines:[...orderA].sort((a,b)=>a-b),
    path_a:{index:pathA.selected_order_index,address:pathA.path_address,order:orderA},
    path_b:{index:pathB.selected_order_index,address:pathB.path_address,order:orderB},
    order_distance:kendall,
    first_divergence_depth:divergent.length?divergent[0].depth:null,
    rejoin_depths:rejoins,
    max_intermediate_hamming:divergent.length?Math.max(...divergent.map(x=>x.hamming_distance)):0,
    path_area_hamming:area,
    max_path_area_hamming:maxArea,
    normalized_path_area:maxArea?round(area/maxArea):0,
    trajectory_equivalent:area===0,
    rows,
    formulas:{
      order_distance:'Kendall inversions between the two moving-line permutations',
      depth_distance:'d_H(A_d,B_d) at equal STEP depth d',
      path_area:'Σ_d d_H(A_d,B_d)',
      max_path_area:'floor(k^2/2) for two k-change endpoint-preserving paths'
    },
    law:'same endpoints and moving lines can still define unequal intermediate trajectories; this comparator proves abstract path divergence only, while native non-commutation requires a host consequence witness after re-resolution'
  };
}

const isCli=typeof process!=='undefined'&&process?.argv?.[1]&&import.meta.url===new URL(process.argv[1],'file://').href;
if(isCli){
  const A={ok:true,from_token:'H[010|100]',to_token:'H[011|110]',selected_order:[3,5],selected_order_index:0,path_address:'change://fixture/A',steps:[
    {before_binary:'010100',after_binary:'011100',after_token:'H[011|100]'},
    {before_binary:'011100',after_binary:'011110',after_token:'H[011|110]'}
  ]};
  const B={ok:true,from_token:'H[010|100]',to_token:'H[011|110]',selected_order:[5,3],selected_order_index:1,path_address:'change://fixture/B',steps:[
    {before_binary:'010100',after_binary:'010110',after_token:'H[010|110]'},
    {before_binary:'010110',after_binary:'011110',after_token:'H[011|110]'}
  ]};
  const out=compareStatePaths(A,B);
  if(!out.ok||out.order_distance.inversions!==1||out.path_area_hamming!==2||out.first_divergence_depth!==1||out.rejoin_depths[0]!==2)throw new Error('path comparator selftest failed');
  console.log(JSON.stringify({status:'PASS',comparison:out},null,2));
}
