// FIELD's local, pure projection algebra. Not a second object store or ontology.
// Shared bodies stay in /lib/: serialization, SHA-256, polar math, DOM, storage.
import {stableKey} from './lib/id.js';
import {esc} from './lib/dom.js';
import './lib/micro.js';
// The cube-net fold geometry is ONE implementation, absorbed from the browser-verified
// donor into lib/interphase-cube.js. This module only projects route records onto it.
import './lib/interphase-cube.js';
const {clamp,wrap}=globalThis.Micro;
// One cube implementation, reachable from the projection: lib/interphase-cube.js.
export const CUBE=globalThis.InterphaseCube;
export const SCALES=Object.freeze(['FIELD','SOURCE','KIND','STATE','OBJECT']);
const DIMS=['family','source','kind','state'];
// TURN measures one ring of axes: from rest each press advances state → time →
// depth → family → state. The frame RESTS on family (the declared taxonomy, and
// the scale ladder's first rung), so TURN 1 is the state axis, TURN 2 time, and so on.
// The axis is not decoration: it picks the partition dimension AND the map order.
export const AXES=Object.freeze(['family','state','time','depth']);
export const AXIS_DIM=Object.freeze({family:'family',state:'state',time:'day',depth:'depth'});
export const axis=s=>AXES[wrap(Math.trunc(Number(s?.turn)||0),AXES.length)];
export const axisDim=s=>AXIS_DIM[axis(s)];
// The scale ladder is the turned axis first, then every remaining facet, never twice.
export const ladder=s=>{const first=axisDim(s);return [first,...DIMS.filter(d=>d!==first)]};
// 'day' is the read-only UTC date of the manifest stamp; 'depth' is the declared
// hop count. Both are derived facts with one formula, never a second ontology.
const PREDICATES=DIMS.concat('id','parent','day','depth');
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
  const out=routes.map(r=>{
    const time=Date.parse(r.index?.updated_at||'')||null;
    return {id:r.id||r.href,address:r.href,title:r.title||r.href,
    family:r.family||'FIELD',source:'git',kind:r.kind||'route',state:r.state||'UNKNOWN',head:headSet.has(r.href),
    parent:byHref.get(r.parent)?.id||r.parent||null,depth:depth(r),time,
    // Read-only date projection: the time axis partitions on a legible key, never raw ms.
    day:time?new Date(time).toISOString().slice(0,10):'NO TIME',
    // Source is precisely this manifest projection, not the unseen origin of its content.
    provenance:'/showcase-manifest.json',payload:r};
  });
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
  const fold=(values,label)=>{
    const members=values.flatMap(k=>groups.get(k));
    return {id:stableKey([dim,values]),dim,values,ids:members.map(r=>r.id),count:members.length,
      label:label||(values.length>1?`${values[0]} … ${values.at(-1)}`:values[0]),range:values.length>1,
      object:members.length===1?members[0]:null};
  };
  // At a human-sized family fan-out, name the largest existing families and
  // explicitly count the remainder. Size is membership, never attention/rank.
  // Larger fan-outs retain balanced ranges, so this cannot become a long tail.
  if(dim==='family'&&keys.length>budget&&keys.length<=budget*budget){
    const named=keys.slice().sort((a,b)=>groups.get(b).length-groups.get(a).length||a.localeCompare(b)).slice(0,budget-1).sort();
    const rest=keys.filter(k=>!named.includes(k));
    return named.map(k=>fold([k])).concat(fold(rest,`MORE · ${rest.length} FAMILIES`));
  }
  const width=Math.max(1,Math.ceil(keys.length/budget)),out=[];
  for(let i=0;i<keys.length;i+=width){
    out.push(fold(keys.slice(i,i+width)));
  }
  return out;
}
// Walking follows declared parent edges only. Family, spelling and hashes are
// never evidence of adjacency. The three relations are disjoint, even in cycles.
export function neighbours(rows,id){
  const source=rows.find(r=>r.id===id);if(!source)return [];
  const used=new Set([id]),groups=[];
  for(const [relation,label,test] of [
    ['parent','Parent',r=>r.id===source.parent],
    ['child','Children',r=>r.parent===id],
    ['peer','Peers',r=>!!source.parent&&r.parent===source.parent]
  ]){
    const members=rows.filter(r=>!used.has(r.id)&&test(r)).sort((a,b)=>a.address.localeCompare(b.address));
    members.forEach(r=>used.add(r.id));if(members.length)groups.push({relation,label,members});
  }
  return groups;
}
// Only the relation view assigns domain meaning to placement. Other apertures
// use explicitly packed reading slots; their coordinates are not feature claims.
export function placements(v){
  return v.folds.map((g,i)=>{
    if(g.relation)return ({parent:{x:35,y:0},child:{x:35,y:66},peer:{x:0,y:33}})[g.relation];
    const lines=Math.ceil(v.folds.length/3),inRow=Math.min(3,v.folds.length-Math.floor(i/3)*3);
    return {x:(3-inRow)*16.666+(i%3)*33.333,y:(3-lines)*16.666+Math.floor(i/3)*33.333};
  });
}
// The same address has the same overview slot through every lens and one turn.
// Order is declared, inspectable and TOTAL: family/address/id for the resting axis,
// the turned axis's own value (then the same tie-break) for every other turn.
// Depth controls tick length. This context is not a replacement for readable,
// counted fold targets.
export function overview(rows,v,focus,ax='family'){
  const inside=new Set(v.folds.flatMap(g=>g.ids)),rank=AXIS_DIM[ax]||AXIS_DIM.family;
  const sorted=rows.slice().sort((a,b)=>{
    if(ax==='time')return ((a.time==null?Infinity:a.time)-(b.time==null?Infinity:b.time))||a.address.localeCompare(b.address)||a.id.localeCompare(b.id);
    if(ax==='depth')return (a.depth-b.depth)||a.address.localeCompare(b.address)||a.id.localeCompare(b.id);
    return String(a[rank]??'').localeCompare(String(b[rank]??''))||a.address.localeCompare(b.address)||a.id.localeCompare(b.id);
  });
  return sorted.map(r=>({id:r.id,family:r.family,depth:r.depth,inside:inside.has(r.id),held:r.id===focus}));
}
// The whole-field strip is a map, not a texture: ticks are folded into stacked
// lanes so the pixel pitch never drops below the readable floor at phone width.
// Every lane prints the count it carries. Pure, so the pitch is provable in node.
export const RIBBON=Object.freeze({lane:24,gap:3,gutter:15,minPitch:2});
export function ribbon(map,width){
  const W=Math.max(64,Math.floor(Number(width)||64)),usable=Math.max(16,W-RIBBON.gutter);
  const fit=Math.max(1,Math.floor(usable/RIBBON.minPitch)),lanes=Math.max(1,Math.ceil(Math.max(1,map.length)/fit));
  const per=Math.ceil(map.length/lanes),pitch=usable/Math.max(1,per);
  const groups=[];
  for(let i=0;i<lanes;i++){
    const items=map.slice(i*per,(i+1)*per);if(!items.length)continue;
    groups.push({lane:i,count:items.length,items,y:i*(RIBBON.lane+RIBBON.gap)});
  }
  return {width:W,usable,lanes,per,pitch,groups,height:lanes*RIBBON.lane+Math.max(0,lanes-1)*RIBBON.gap,gutter:RIBBON.gutter};
}
export function project(rows,s,seen){
  const d=delta(rows,seen),attention=new Set([...(d.hasBaseline?d.changed:[]),...d.needs,...d.stalled].map(r=>r.id));
  const near=s.mode==='RELATIONS'&&s.focus?neighbours(rows,s.focus):null;
  let mode=near?near.flatMap(g=>g.members):s.mode==='DELTA'?rows.filter(r=>attention.has(r.id)):rows;
  if(s.intent==='HEADS')mode=mode.filter(r=>r.head);
  const predicates=s.path.map(p=>[p.dim,new Set(p.values)]);
  const searched=matching(mode,s.query),inside=searched.filter(r=>predicates.every(([dim,values])=>values.has(String(r[dim]??'UNKNOWN'))));
  // The turned axis owns the partition; scale still walks the ladder it opens.
  const rungs=ladder(s);
  const dim=near?(s.path.length?'id':'relation'):s.scale===4?'id':s.mode==='RELATIONS'&&s.scale===0?'parent':rungs[Math.min(rungs.length-1,s.scale)];
  const allowed=new Set(inside.map(r=>r.id));
  const groups=dim==='relation'?near.flatMap(n=>{
    const xs=n.members.filter(r=>allowed.has(r.id));if(!xs.length)return [];
    const ids=xs.map(r=>r.id);
    return [{id:stableKey(['relation',s.focus,n.relation,ids]),dim:'id',values:ids,ids,count:ids.length,
      label:n.label,relation:n.relation,range:ids.length>1,object:ids.length===1?xs[0]:null}];
  }):partition(inside,dim);
  const folds=groups.map(g=>{
    const members=new Set(g.ids),changed=d.hasBaseline?d.changed.filter(r=>members.has(r.id)).length:null;
    const xs=inside.filter(r=>members.has(r.id)),hist=key=>[...xs.reduce((m,r)=>m.set(r[key],(m.get(r[key])||0)+1),new Map())].sort(([a],[b])=>String(a).localeCompare(String(b)));
    return {...g,changed,unknown:d.unknown.filter(r=>members.has(r.id)).length,unbased:d.unbased.filter(r=>members.has(r.id)).length,
      profile:{kinds:hist('kind'),states:hist('state'),sources:hist('source'),needs:d.needs.filter(r=>members.has(r.id)).length}};
  });
  const foldSum=groups.reduce((n,g)=>n+g.count,0);
  return {folds,inside:inside.length,outside:rows.length-inside.length,total:rows.length,delta:d,dim,foldSum,
    // The standing loss witness: partitions are disjoint and total, or they are not.
    witness:foldSum===inside.length?'loss: none':`folds drop: ${inside.length-foldSum}`,
    residue:s.mode==='RELATIONS'?'Declared parent/child/peer edges only. Missing parent records stay outside; no inferred similarity or merge.':d.coverage};
}
export function unfold(s,g){
  if(g.object)return {...s,scale:4,path:[...s.path,{dim:'id',values:[g.object.id],fromScale:s.scale}],focus:g.object.id,page:0};
  return {...s,path:[...s.path,{dim:g.dim,values:g.values,fromScale:s.scale}],scale:g.range?s.scale:Math.min(4,s.scale+1),page:0};
}
// Coarse material families are a rendering vocabulary, not a new object type.
// Exact native kinds remain in the reading; fine angular differences are not IDs.
// MATERIALS is the SAME list the help decode table prints — one source, no second one.
export const MATERIALS=Object.freeze({
  hub:Object.freeze(['root','system','hub','control','index']),
  tool:Object.freeze(['workbench','tool','utility','experiment','lab']),
  text:Object.freeze(['documentation','source']),
  trace:Object.freeze(['evidence','validator']),
  link:Object.freeze(['route','alias','adapter','derivative','donor','donor-hub','recovery','rendezvous'])
});
export function material(kind){for(const m of Object.keys(MATERIALS))if(MATERIALS[m].includes(kind))return m;return 'object'}
// The motif paths the marks actually draw, exported so READ THE MARK decodes the
// exact geometry in front of you instead of a parallel legend.
export const MOTIFS=Object.freeze({
  hub:'<circle cx="10" cy="10" r="7"/><circle cx="10" cy="10" r="2"/>',
  tool:'<path d="M0 0L16 16M16 0L0 16M8 0V16M0 8H16"/>',
  text:'<path d="M0 4H16M0 10H11"/>',
  trace:'<path d="M0 13H16M3 13V3M8 13V8M13 13V5"/>',
  link:'<path d="M0 4H5L11 12H16M0 12H5L11 4H16"/>',
  object:'<path d="M2 2H14V14H2ZM6 6H10V10H6Z"/>'
});
// The state vocabulary is field-wide, so a tick position means the SAME state on
// every mark and on every map lane — never a per-fold relabelling.
export const stateScale=rows=>[...new Set(rows.map(r=>String(r.state??'UNKNOWN')))].sort();
// The glyph is a reading of actual features, not a random surrogate for them.
// Camera turn is separate from the mark; hash identity lives in the moiré grating.
// Every channel returned here is RENDERED: length → depth bar / map tick length,
// tick → state position. Kind draws as the material motif, count as the underline.
// Nothing is carried that is not drawn — no angle, no lane, no arc, no tag.
export function reading(r,states=[]){
  return {length:20+7*Math.log2(1+Math.max(0,Number(r.depth)||0)),
    tick:states.indexOf(String(r.state??'UNKNOWN'))};
}
// One pure glyph builder: the selftest asserts the channels in the emitted HTML.
// Layout (viewBox 120×60): state ticks top-left (position = state, width = share),
// material motifs + count underline bottom-left, depth bar rising from the same
// baseline at the right (height = reading().length).
export function markGlyph(g,ctx={}){
  const states=Array.isArray(ctx.states)?ctx.states:[],rows=Array.isArray(ctx.rows)?ctx.rows:[],
    inside=Math.max(1,Number(ctx.inside)||1),slot=Number.isInteger(ctx.slot)?ctx.slot:0;
  if(g.relation){
    const paths={parent:'M60 43V15m-6 6 6-6 6 6',child:'M60 15v28m-6-6 6 6 6-6',peer:'M35 29h50m-6-6 6 6-6 6m-38-12-6 6 6 6'};
    return `<svg viewBox="0 0 120 60" aria-hidden="true"><path d="${paths[g.relation]}" stroke="currentColor" fill="none"/><path d="M43 51h${34*g.count/inside}" stroke="currentColor" fill="none" stroke-width="2"/></svg>`;
  }
  const ids=new Set(g.ids||[]),members=rows.filter(r=>ids.has(r.id)),writable=Math.max(1,g.count||members.length||1);
  const reads=members.map(r=>reading(r,states)),depthBar=reads.length?Math.max(...reads.map(x=>x.length)):20;
  const shares=new Map();
  for(const r of members){const t=Math.max(0,reading(r,states).tick);shares.set(t,(shares.get(t)||0)+1)}
  const step=states.length>1?24/(states.length-1):0;
  const ticks=[...shares].sort((a,b)=>a[0]-b[0]).map(([t,n])=>
    `<path class="fiStateTick" data-tick="${t}" data-count="${n}" d="M6 ${(3+t*step).toFixed(1)}h${Math.max(3,Math.round(54*n/writable))}" stroke="currentColor" fill="none" stroke-width="1.5"/>`).join('');
  const materials=new Map();
  for(const [kind,n] of g.profile?.kinds||[]){const m=material(kind);materials.set(m,(materials.get(m)||0)+n)}
  if(!materials.size)materials.set('object',writable);
  const ordered=[...materials].sort(([a],[b])=>a.localeCompare(b)),unit=94/ordered.length;
  const defs=ordered.map(([m])=>`<pattern id="fiGrain${slot}${m}" width="${m==='hub'?20:16}" height="${m==='hub'?20:16}" patternUnits="userSpaceOnUse"><g fill="none" stroke="currentColor" stroke-width="1.5">${MOTIFS[m]}</g></pattern>`).join('');
  const strips=ordered.map(([m,n],i)=>`<rect x="${(6+i*unit).toFixed(1)}" y="31" width="${Math.max(2,unit-2).toFixed(1)}" height="22" fill="url(#fiGrain${slot}${m})"/><path d="M${(6+i*unit).toFixed(1)} 57h${Math.max(1,(unit-2)*n/writable).toFixed(1)}" stroke="currentColor" fill="none" stroke-width="2"/>`).join('');
  return `<svg viewBox="0 0 120 60" aria-hidden="true"><defs>${defs}</defs>${ticks}${strips}<path class="fiDepthBar" data-len="${depthBar.toFixed(1)}" d="M108 57V${(57-depthBar).toFixed(1)}" stroke="currentColor" fill="none" stroke-width="2"/></svg>`;
}
// A menu that would outgrow its surface FOLDS and prints the number it hides.
// Hiding behind overflow is not folding.
export function foldOps(ops,max=6){
  const list=Array.isArray(ops)?ops:[];max=Math.max(1,Math.floor(max));
  return list.length<=max?{shown:list,hidden:0}:{shown:list.slice(0,max),hidden:list.length-max};
}
// Skip a facet only when it adds no choice, or when all objects fit the aperture.
// Skipped tautologies add no predicate: scope-out remains the exact inverse.
export function into(rows,s,g,seen){
  if(s.mode==='RELATIONS'&&g.object)return {...s,scale:0,path:[],query:'',intent:'SEARCH',focus:g.object.id,page:0};
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
// The rung is named by the dimension it actually measures. FIELD (the whole lens)
// and OBJECT (one addressed thing) are the only fixed names; anything between them
// is named by its own facet, so the bar can never claim a dimension it is not using.
export function scaleLabel(s,v){
  if(!s.scale)return 'FIELD';
  if(s.scale===4)return 'OBJECT';
  return String(v?.dim||SCALES[s.scale]||'').toUpperCase();
}
// The bar is a compact reading of the SAME frame and conservation witness.
// Parts partition the whole field; their pattern is categorical, never decorative.
export function bearing(rows,s,v,anchor){
  const target=rows.find(r=>r.id===s.focus),focusHere=!!target&&v.folds.some(g=>g.ids.includes(target.id));
  const near=s.mode==='RELATIONS'&&!!target;
  const last=s.path.at(-1),scope=last?(last.values.length===1?last.values[0]:`${last.values[0]} … ${last.values.at(-1)}`):s.intent==='HEADS'?'CURRENT':s.mode==='FIELD'?'ALL':s.mode;
  const title=s.query||((focusHere||near)?target.title:scope);
  const address=focusHere||near?target.address:`${v.dim}:${scope}`;
  const inside=new Set(v.folds.flatMap(g=>g.ids));
  const changed=new Set(v.delta.changed.map(r=>r.id)),unknown=new Set([...v.delta.unknown,...v.delta.unbased].map(r=>r.id));
  const parts=[{key:'changed',count:0},{key:'known',count:0},{key:'unknown',count:0},{key:'outside',count:v.outside}];
  for(const r of rows)if(inside.has(r.id))parts[!v.delta.hasBaseline||unknown.has(r.id)?2:changed.has(r.id)?0:1].count++;
  let offset=0;const ribbon=parts.map(p=>{const start=offset;offset+=p.count;return {...p,start,end:offset}});
  // The standing position line: axis · rung · n/total · what moved · breadcrumb.
  // Counts come first so a long path can only clip its own tail, never a number.
  const cut=v=>{const t=String(v);return t.length>17?t.slice(0,16)+'…':t};
  const crumb=s.path.map(p=>`${p.dim}:${p.values.length===1?cut(p.values[0]):cut(p.values[0])+' … '+cut(p.values.at(-1))}`).join(' › ');
  const line=`${axis(s)}·${scaleLabel(s,v)}·${v.inside}/${v.total}`
    +(v.delta.hasBaseline?' ∆'+v.delta.changed.length+(unknown.size?'+?':''):' ∆?')
    +(v.delta.needs.length?' !'+v.delta.needs.length:'')
    +((!!target&&!focusHere&&!near)?' HOLD↗':'')
    +(crumb?' › '+crumb:'');
  return {title,address,scope,focusHere,near,sourceDepth:target?.depth||0,heldOutside:!!target&&!focusHere&&!near,
    inside:v.inside,total:v.total,scale:s.scale,mode:s.mode,depth:s.path.length,line,
    away:!!anchor&&stableKey(s)!==stableKey(anchor),ribbon,
    delta:v.delta.hasBaseline?v.delta.changed.length:null,unmeasured:unknown.size,needs:v.delta.needs.length,
    label:`${title}. ${v.inside} ${near?'declared neighbours':'in scope'}; ${v.outside} outside; ${v.total} destinations. ${v.delta.hasBaseline?v.delta.changed.length+' measured changes since SEEN':'No SEEN baseline'}. ${unknown.size} changes unmeasured; ${v.delta.needs.length} need world. ${s.path.length} scope decisions. ${focusHere||near?address:target?'Held outside scope: '+target.address:'No object held'}.`};
}
/* ==== THE ROOM — six readings of one held object, hinged on cube-net edges ====
   The fold pivots AT the mark: the room's plane is positioned so the anchor cell (1,1)
   centre lands exactly on the mark's screen point, and the plane's transform-origin is
   that same point in BOTH fold states, so the anchor [x,y] is identical net ↔ cube ↔
   net (lib/interphase-cube.js proves it; the browser keeps it). Size is only the fit —
   the anchor is the datum and never moves. */
export function roomAnchor(point,box,bounds){return CUBE.roomGeometry(point,box,bounds)}
// A frame is legible as its own address line: axis · rung · scope.
export function frameLabel(s){
  if(!s)return 'NONE';
  const last=Array.isArray(s.path)?s.path.at(-1):null;
  const scope=last?(last.values.length===1?last.values[0]:`${last.values[0]} … ${last.values.at(-1)}`):(s.query||'ALL');
  return `${axis(s)}·${SCALES[clamp(Math.trunc(Number(s.scale)||0),0,4)]} · ${scope}`;
}
const clip=(v,n=64)=>{const t=String(v??'');return t.length>n?t.slice(0,n-1)+'…':t};
// SIX READINGS — one per cube face, every one generated from the REAL route record:
// title / held address / state / transform history from the local revision stack /
// proof from evidence.checks / return = the pin. Content, not chrome: each line is a
// datum the instrument already holds, and a count is printed whenever there is one.
export function roomReadings(r,{revisions=[],pin=null}={}){
  const ev=r?.payload?.evidence,
    checks=Array.isArray(ev?.checks)?ev.checks:[],
    claims=Array.isArray(ev)?ev.filter(c=>c&&c.claim):[],
    frames=Array.isArray(revisions)?revisions:[],
    trail=frames.slice(-3).map(frameLabel),
    earlier=Math.max(0,frames.length-trail.length);
  return [
    {face:'OBJECT',   cjk:'物',axis:'+Z PRESENT',count:1,text:clip(r.title||r.address)},
    {face:'ADDRESS',  cjk:'址',axis:'−X INPUT',  count:1,text:clip(r.address)},
    {face:'STATE',    cjk:'态',axis:'+Y UP',     count:1,text:clip(`${r.state??'UNKNOWN'} · ${r.day??'NO TIME'}`)},
    {face:'TRANSFORM',cjk:'变',axis:'+X OUTPUT', count:frames.length,
     text:clip(`${frames.length} MOVE${frames.length===1?'':'S'} · ${trail.length?trail.join(' → '):'NO MOVES YET'}${earlier?` + ${earlier} EARLIER`:''}`)},
    {face:'PROVE',    cjk:'证',axis:'−Y GROUND', count:checks.length||claims.length,
     text:clip(checks.length?`${checks.length} CHECK${checks.length===1?'':'S'} · ${checks[0]}`
       :claims.length?`${claims.length} CLAIM${claims.length===1?'':'S'} · ${claims.map(c=>c.status||'FILED').join(' · ')}`
       :'NO EVIDENCE FILED')},
    {face:'RETURN',   cjk:'返',axis:'−Z BEHIND', count:pin&&Array.isArray(pin.path)?pin.path.length:0,
     text:clip(`PIN ${frameLabel(pin)}`)}
  ];
}
// The hinge class is named by the MODEL, not typed into the markup twice.
export const HINGE_CLASS=Object.freeze({none:'h-none',top:'h-top',bottom:'h-bottom',left:'h-left',right:'h-right'});
// One pure markup builder (the markGlyph precedent): the room's DOM is the donor's
// cross net — 6 cells, 4 hinge groups, RETURN nested under PROVE — and the selftest
// asserts the emitted channels without a browser.
export function roomMarkup(readings){
  const byFace=new Map(readings.map((r,i)=>[r.face,i])),num=i=>`${String(i+1).padStart(2,'0')}/06`;
  const face=e=>{
    const i=byFace.get(e.face),r=readings[i],tappable=e.face==='OBJECT';
    if(i===undefined||!r)throw Error('ROOM_READING_MISSING:'+e.face);
    return `<section class="fiFace" data-face="${e.face}"${tappable?' role="button" data-room-fold tabindex="0" aria-label="Fold the room out into the plain six-reading view"':' tabindex="0" role="group" aria-label="reading '+num(i)+', '+e.face.toLowerCase()+'"'}>`
      +`<div class="fh"><span class="lab">${e.face}<span class="cjk">${esc(r.cjk)}</span></span><span class="num">${num(i)}</span></div>`
      +`<div class="ax">${esc(r.axis)}</div><div class="rd">${esc(r.text)}</div></section>`;
  };
  const cell=(e,nest)=>`<div class="cell${nest?' nest':''}"${nest?'':` style="--c:${e.cell[0]};--r:${e.cell[1]}"`}>`
    +`<div class="hinge ${HINGE_CLASS[e.hinge]}">${face(e)}${e.face==='PROVE'?cell(CUBE.LAYOUT.find(x=>x.face==='RETURN'),true):''}</div></div>`;
  const cells=CUBE.LAYOUT.filter(e=>!e.parent).map(e=>cell(e)).join('');
  return `<div class="fiRoomPlane" id="fiRoomPlane" data-fold="net">${cells}</div>`;
}
