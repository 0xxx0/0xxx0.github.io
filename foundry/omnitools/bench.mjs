// foundry/omnitools/bench.mjs — conservative Form / Function / Fortitude decision bench.
// Pure module: no DOM, storage, network, or authority side effects.

export const AXES=['form','function','fortitude'];

const finite=n=>Number.isFinite(n);
const clean=s=>String(s??'').trim();

export function parseScore(raw){
  const s=clean(raw);
  if(!s||s==='?'||/^unknown$/i.test(s))return{kind:'unknown',lo:null,hi:null,raw:s||'?'};
  const m=s.match(/^(-?\d+(?:\.\d+)?)\s*(?:\.\.|–|—|-)\s*(-?\d+(?:\.\d+)?)$/);
  if(m){
    const a=Number(m[1]),b=Number(m[2]);
    if(!finite(a)||!finite(b))return{kind:'invalid',lo:null,hi:null,raw:s};
    return{kind:'range',lo:Math.min(a,b),hi:Math.max(a,b),raw:s};
  }
  const n=Number(s);
  if(finite(n))return{kind:'exact',lo:n,hi:n,raw:s};
  return{kind:'invalid',lo:null,hi:null,raw:s};
}

export function parseCandidates(text){
  const errors=[],items=[];
  clean(text).split(/\r?\n/).forEach((line,i)=>{
    const raw=line.trim();
    if(!raw||raw.startsWith('#'))return;
    const p=raw.split('|').map(x=>x.trim());
    if(p.length<4){errors.push({line:i+1,error:'expected NAME | FORM | FUNCTION | FORTITUDE | note',raw});return}
    const [name,f,fn,ft,...note]=p;
    if(!name){errors.push({line:i+1,error:'name required',raw});return}
    const scores={form:parseScore(f),function:parseScore(fn),fortitude:parseScore(ft)};
    const bad=AXES.filter(a=>scores[a].kind==='invalid');
    if(bad.length){errors.push({line:i+1,error:'invalid score: '+bad.join(', '),raw});return}
    items.push({id:'c'+(items.length+1),name,scores,note:note.join(' | '),source_line:i+1});
  });
  return{items,errors};
}

export function normalizeMinima(minima={}){
  return Object.fromEntries(AXES.map(a=>{
    const n=Number(minima[a]);
    return[a,finite(n)?n:0];
  }));
}

export function feasibility(candidate,minima={}){
  const mins=normalizeMinima(minima),reasons=[],unknown=[];
  let state='VIABLE';
  for(const axis of AXES){
    const s=candidate.scores[axis],min=mins[axis];
    if(s.kind==='unknown'){
      unknown.push(axis);state=state==='REJECT'?'REJECT':'POTENTIAL';
      reasons.push(axis+' unknown vs min '+min);
      continue;
    }
    if(s.hi<min){state='REJECT';reasons.push(axis+' max '+s.hi+' < min '+min);continue}
    if(s.lo<min){if(state!=='REJECT')state='POTENTIAL';reasons.push(axis+' range crosses min '+min)}
  }
  return{state,reasons,unknown,minima:mins};
}

// A dominates B only when the evidence guarantees A is >= B on every axis,
// and guarantees strict superiority on at least one axis. Unknowns or overlapping
// ranges preserve uncertainty and therefore cannot prove dominance.
export function guaranteedDominates(a,b){
  let strict=false;
  for(const axis of AXES){
    const x=a.scores[axis],y=b.scores[axis];
    if(x.kind==='unknown'||y.kind==='unknown'||x.kind==='invalid'||y.kind==='invalid')return false;
    if(x.lo<y.hi)return false;
    if(x.lo>y.hi)strict=true;
  }
  return strict;
}

export function evaluateBench(candidates,minima={}){
  const mins=normalizeMinima(minima);
  const rows=candidates.map(c=>({...c,feasibility:feasibility(c,mins),dominated_by:[]}));
  for(const b of rows){
    if(b.feasibility.state==='REJECT')continue;
    for(const a of rows){
      if(a.id===b.id||a.feasibility.state==='REJECT')continue;
      if(guaranteedDominates(a,b))b.dominated_by.push(a.id);
    }
  }
  const byId=Object.fromEntries(rows.map(r=>[r.id,r]));
  for(const r of rows){
    r.disposition=r.feasibility.state==='REJECT'?'REJECT':r.dominated_by.length?'DOMINATED':'FRONT';
    r.dominated_by_names=r.dominated_by.map(id=>byId[id]?.name||id);
    r.missing_evidence=[...r.feasibility.unknown];
  }
  const counts={FRONT:0,DOMINATED:0,REJECT:0};
  for(const r of rows)counts[r.disposition]++;
  return{
    schema:'omnitools-bench/v0.1',
    authority:'ADVISORY_ONLY',
    axes:[...AXES],
    minima:mins,
    counts,
    rows,
    laws:[
      'Hard minima reject only when the observed/ranged maximum is below the limit.',
      'Unknown or threshold-crossing evidence remains POTENTIAL, never silently rejected.',
      'Dominance is conservative: A removes B only when A is guaranteed no worse on every axis and strictly better on at least one.',
      'Overlapping ranges and unknowns preserve alternatives; no weighted winner is invented.'
    ]
  };
}

export function parseAndEvaluate(text,minima={}){
  const parsed=parseCandidates(text);
  return{...parsed,evaluation:evaluateBench(parsed.items,minima)};
}
