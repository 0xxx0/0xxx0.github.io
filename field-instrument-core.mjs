// FIELD's local, pure projection algebra. Not a second object store or ontology.
// Shared bodies stay in /lib/: serialization, SHA-256, polar math, DOM, storage.
import {stableKey} from './lib/id.js';
import './lib/micro.js';
const {clamp,wrap}=globalThis.Micro;
export const SCALES=Object.freeze(['FIELD','SOURCE','KIND','STATE','OBJECT']);
const DIMS=['family','source','kind','state'];
const PREDICATES=DIMS.concat('id','parent');
export const initial=()=>({scale:0,path:[],focus:null,query:'',intent:'SEARCH',mode:'FIELD',turn:0,page:0});
export function frame(s){return JSON.parse(JSON.stringify(s))}
export function restore(token){
  if(!token||!Number.isInteger(token.scale)||token.scale<0||token.scale>4||!Array.isArray(token.path)||token.path.length>80)throw Error('INVALID_FIELD_FRAME');
  if(token.path.some(p=>!PREDICATES.includes(p.dim)||!Number.isInteger(p.fromScale)||p.fromScale<0||p.fromScale>4||!Array.isArray(p.values)||p.values.some(v=>typeof v!=='string')))throw Error('INVALID_FIELD_PATH');
  if(!['FIELD','DELTA','RELATIONS'].includes(token.mode)||!Number.isFinite(token.turn)||typeof token.query!=='string'||!(token.focus===null||typeof token.focus==='string'))throw Error('INVALID_FIELD_FRAME');
  if(token.intent&&!['SEARCH','HEADS','TURN','HERMES','RISE'].includes(token.intent))throw Error('INVALID_FIELD_INTENT');
  return {...initial(),...frame(token),page:Math.max(0,Math.floor(Number(token.page)||0)),turn:wrap(token.turn,4)};
}
// An address remains identity. A content digest may change without moving it.
export function records(routes,heads=[]){
  const headSet=new Set(heads);
  const byHref=new Map(routes.map(r=>[r.href,r]));
  const depth=r=>{let n=0,p=r.parent;const seen=new Set([r.href]);while(p&&!seen.has(p)){seen.add(p);n++;p=byHref.get(p)?.parent}return n};
  const out=routes.map(r=>({id:r.id||r.href,address:r.href,title:r.title||r.href,
    family:r.family||'FIELD',source:'git',kind:r.kind||'route',state:r.state||'UNKNOWN',head:headSet.has(r.href),
    parent:byHref.get(r.parent)?.id||r.parent||null,depth:depth(r),time:Date.parse(r.index?.updated_at||'')||null,
    // Source is precisely this manifest projection, not the unseen origin of its content.
    provenance:'/showcase-manifest.json',payload:r}));
  if(new Set(out.map(r=>r.id)).size!==out.length)throw Error('DUPLICATE_FIELD_ID');
  return out;
}
export function admitted(r,s){
  return s.path.every(p=>p.values.includes(String(r[p.dim]??'UNKNOWN')));
}
export function matching(rows,q){
  const tokens=String(q||'').trim().toLowerCase().split(/\s+/).filter(Boolean);
  return rows.filter(r=>tokens.every(t=>{
    const m=t.match(/^(family|source|kind|state|id):(.*)$/);
    return m?String(r[m[1]]).toLowerCase().startsWith(m[2]):`${r.address} ${r.title}`.toLowerCase().includes(t);
  }));
}
// Native SEEN is the only catch-up authority. Missing timestamps are explicit residue.
export function delta(rows,seen){
  const global=Math.max(0,Number(seen?.stamp)||0),items=seen?.items||{},boundary=r=>Math.max(global,Number(items[r.address])||0);
  const hasBaseline=global>0||rows.some(r=>boundary(r)>0),unknown=rows.filter(r=>!r.time);
  const unbased=rows.filter(r=>r.time&&boundary(r)<=0),changed=rows.filter(r=>r.time&&boundary(r)>0&&r.time>boundary(r));
  const gates=new Set(seen?.needs||[]),needs=rows.filter(r=>gates.has(r.address)),stalled=rows.filter(r=>/^(STALLED|BLOCKED)$/.test(r.state));
  return {hasBaseline,changed,unknown,unbased,needs,stalled,unchanged:rows.length-changed.length-unknown.length-unbased.length,coverage:'manifest timestamps; no removal or unstamped-content detection'};
}
// A fold is a disjoint explicit membership predicate. It never absorbs source data.
// >budget values become counted range folds, including their distinct-value count.
// Repeated unfolding refines a range at the SAME semantic scale: no infinity lie.
export function partition(rows,dim,budget=9){
  budget=Math.max(2,Math.floor(budget));const groups=new Map();
  for(const r of rows){const k=String(r[dim]??'UNKNOWN');if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r)}
  const keys=[...groups.keys()].sort();
  const width=Math.max(1,Math.ceil(keys.length/budget)),out=[];
  for(let i=0;i<keys.length;i+=width){
    const values=keys.slice(i,i+width),members=values.flatMap(k=>groups.get(k));
    out.push({id:stableKey([dim,values]),dim,values,ids:members.map(r=>r.id),count:members.length,
      label:values.length>1?`${values[0]} … ${values.at(-1)}`:values[0],range:values.length>1,
      object:dim==='id'&&values.length===1?members[0]:null});
  }
  return out;
}
export function project(rows,s,seen){
  const d=delta(rows,seen),attention=new Set([...(d.hasBaseline?d.changed:[]),...d.needs,...d.stalled].map(r=>r.id));
  let mode=s.mode==='DELTA'?rows.filter(r=>attention.has(r.id)):rows;
  if(s.intent==='HEADS')mode=mode.filter(r=>r.head);
  const predicates=s.path.map(p=>[p.dim,new Set(p.values)]);
  const searched=matching(mode,s.query),inside=searched.filter(r=>predicates.every(([dim,values])=>values.has(String(r[dim]??'UNKNOWN'))));
  const dim=s.scale===4?'id':s.mode==='RELATIONS'&&s.scale===0?'parent':DIMS[s.scale];
  const folds=partition(inside,dim).map(g=>{
    const members=new Set(g.ids),changed=d.hasBaseline?d.changed.filter(r=>members.has(r.id)).length:null;
    const xs=inside.filter(r=>members.has(r.id)),hist=key=>[...xs.reduce((m,r)=>m.set(r[key],(m.get(r[key])||0)+1),new Map())].sort(([a],[b])=>String(a).localeCompare(String(b)));
    return {...g,changed,unknown:d.unknown.filter(r=>members.has(r.id)).length,unbased:d.unbased.filter(r=>members.has(r.id)).length,
      profile:{kinds:hist('kind'),states:hist('state'),sources:hist('source'),needs:d.needs.filter(r=>members.has(r.id)).length}};
  });
  return {folds,inside:inside.length,outside:rows.length-inside.length,total:rows.length,delta:d,dim,
    residue:s.mode==='RELATIONS'?'Declared family/parent relations only; no inferred equivalence or merge.':d.coverage};
}
export function unfold(s,g){
  if(g.object)return {...s,focus:g.object.id,page:0};
  return {...s,path:[...s.path,{dim:g.dim,values:g.values,fromScale:s.scale}],scale:g.range?s.scale:Math.min(4,s.scale+1),page:0};
}
// Skip a facet only when it adds no choice, or when all objects fit the aperture.
// Skipped tautologies add no predicate: scope-out remains the exact inverse.
export function into(rows,s,g,seen){
  let next=unfold(s,g);if(g.object||g.range)return next;
  let v=project(rows,next,seen);
  if(v.inside>0&&v.inside<=9)return {...next,scale:4};
  while(next.scale<4&&v.folds.length===1&&!v.folds[0].range){
    next={...next,scale:next.scale+1};v=project(rows,next,seen);
  }
  return next;
}
export function parent(s){
  if(!s.path.length)return {...s,scale:0,page:0};
  const path=s.path.slice(0,-1),scale=s.path.at(-1).fromScale;
  return {...s,path,scale,page:0};
}
export function locate(s,r){
  return {...s,scale:4,path:[{dim:'id',values:[r.id],fromScale:0}],focus:r.id,query:'',intent:'SEARCH',mode:'FIELD',page:0};
}
// The glyph is a reading of actual features, not a random surrogate for them.
// Camera turn is separate from kind angle. Hash tag is a content witness only.
export function reading(r,kinds,states){
  const y=r.time?new Date(r.time).getUTCFullYear():null;
  return {angle:kinds.includes(r.kind)?kinds.indexOf(r.kind)*180/Math.max(1,kinds.length):null,
    length:20+7*Math.log2(1+Math.max(0,r.depth)),lane:['chat','git','local','web'].indexOf(r.source),
    tick:states.indexOf(r.state),arc:r.time?(r.time-Date.UTC(y,0,1))/(Date.UTC(y+1,0,1)-Date.UTC(y,0,1)):null,
    tag:String(r.digest||'').replace('sha256:','').slice(0,8)};
}
export function textPage(text,page=0,size=150){
  const chars=Array.from(String(text)),pages=[];size=Math.max(1,Math.floor(size));
  for(let start=0;start<chars.length;){
    let end=Math.min(start+size,chars.length),cut=end;
    if(end<chars.length){while(cut>start+size*.6&&!/\s/.test(chars[cut-1]))cut--;if(cut>start+size*.6)end=cut}
    pages.push(chars.slice(start,end).join(''));start=end;
  }
  if(!pages.length)pages.push('');const at=clamp(Math.floor(page),0,pages.length-1);
  return {text:pages[at],at,count:pages.length,total:chars.length};
}
// A short human tag disambiguates only the currently reachable objects. Unlike a
// content hash, an exact address is an identity witness even for byte-identical content.
export function addressTags(objects){
  const parts=objects.map(r=>r.address.split('/').filter(Boolean)),out=new Map();
  objects.forEach((r,i)=>{
    let n=1,tag;
    do{tag=parts[i].slice(-n).join('/')||'/';n++}while(n<=parts[i].length&&parts.some((p,j)=>j!==i&&(p.slice(-(n-1)).join('/')||'/')===tag));
    // Distinct ids may share an address in a future adapter; never silently alias them.
    if(objects.some((x,j)=>j!==i&&x.address===r.address))tag+=' · '+r.id;
    out.set(r.id,tag);
  });return out;
}
// The bar is a compact reading of the SAME frame and conservation witness.
// Parts partition the whole field; their pattern is categorical, never decorative.
export function bearing(rows,s,v,anchor){
  const target=rows.find(r=>r.id===s.focus),focusHere=!!target&&v.folds.some(g=>g.ids.includes(target.id));
  const last=s.path.at(-1),scope=last?(last.values.length===1?last.values[0]:`${last.values[0]} … ${last.values.at(-1)}`):s.mode;
  const title=s.query||(!s.query&&focusHere?target.title:scope);
  const address=focusHere?target.address:`${v.dim}:${scope}`;
  const inside=new Set(v.folds.flatMap(g=>g.ids));
  const changed=new Set(v.delta.changed.map(r=>r.id)),unknown=new Set([...v.delta.unknown,...v.delta.unbased].map(r=>r.id));
  const parts=[{key:'changed',count:0},{key:'known',count:0},{key:'unknown',count:0},{key:'outside',count:v.outside}];
  for(const r of rows)if(inside.has(r.id))parts[!v.delta.hasBaseline||unknown.has(r.id)?2:changed.has(r.id)?0:1].count++;
  let offset=0;const ribbon=parts.map(p=>{const start=offset;offset+=p.count;return {...p,start,end:offset}});
  return {title,address,scope,focusHere,heldOutside:!!target&&!focusHere,
    inside:v.inside,total:v.total,scale:s.scale,mode:s.mode,depth:s.path.length,
    away:!!anchor&&stableKey(s)!==stableKey(anchor),ribbon,
    delta:v.delta.hasBaseline?v.delta.changed.length:null,unmeasured:unknown.size,needs:v.delta.needs.length,
    label:`${title}. ${v.inside} in scope; ${v.outside} outside; ${v.total} destinations. ${v.delta.hasBaseline?v.delta.changed.length+' measured changes since SEEN':'No SEEN baseline'}. ${unknown.size} changes unmeasured; ${v.delta.needs.length} need world. ${s.path.length} scope decisions. ${focusHere?address:target?'Held outside scope: '+target.address:'No object held'}.`};
}
