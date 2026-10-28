// Source ranges are the substrate. Analysis and playback remain READFIELD-owned.
const MAX_BYTES=2000000;
const RELATIONS=Object.freeze(['supports','contrasts','questions','explains']);
function clamp(n,a,b){return Math.max(a,Math.min(b,Number(n)||0))}
function wellFormed(s){return typeof s.isWellFormed==='function'?s.isWellFormed():new TextDecoder('utf-8',{ignoreBOM:true}).decode(new TextEncoder().encode(s))===s}
function compile(raw,analysis,jsonAnalysis=null,sourceSpans=[]){
 if(typeof raw!=='string'||!raw.trim())throw Error('Choose a non-empty source.');
 if(!wellFormed(raw))throw Error('Source contains an unpaired Unicode surrogate.');
 if(new TextEncoder().encode(raw).length>MAX_BYTES)throw Error('Source exceeds 2 MB.');
 if(analysis?.raw!==raw||analysis.kind!=='TEXT')throw Error('Exact READFIELD analysis required.');
 const textLevels=analysis.scales.filter(s=>['DOC','SECTION','PARA','SENT','PHRASE','WORD'].includes(s.id));
 const structured=jsonAnalysis?.kind==='JSON'?jsonAnalysis:null;
 if(structured&&(structured.raw!==raw||!sourceSpans.length))throw Error('Exact JSON source spans required.');
 if(sourceSpans.some(n=>n.ambiguous))throw Error('Repeated JSON keys have ambiguous source addresses.');
 const collections=structured?structured.nodes.filter(n=>n.type==='array'&&n.depth<=1).map(n=>({id:'COLLECTION:'+n.path,label:n.key==='$'?'ITEMS':String(n.key).toUpperCase(),units:structured.nodes.filter(x=>x.parent===n.path)})).filter(l=>l.units.length):[];
 const levels=structured?[structured.scales[0],...collections,...structured.scales.slice(1).filter(s=>s.id!=='LEAF'),textLevels.find(s=>s.id==='WORD')].filter(Boolean):textLevels;
 return Object.freeze({raw,levels,nodes:structured?.nodes||[],kind:structured?'JSON':'TEXT',words:textLevels.find(s=>s.id==='WORD')?.units||[],sections:analysis.sections||[]});
}
function level(model,id){return model.levels.find(s=>s.id===id)||model.levels[0]}
function containing(units,char){
 if(!units.length)return null;
 const inside=units.filter(u=>u.start<=char&&char<u.end);if(inside.length)return inside.reduce((a,b)=>b.end-b.start<a.end-a.start?b:a);
 return units.reduce((a,b)=>Math.abs((b.start+b.end)/2-char)<Math.abs((a.start+a.end)/2-char)?b:a);
}
function at(model,char,scope){return containing(level(model,scope).units,clamp(char,0,model.raw.length-1))}
function facets(value){return{title:['title','head','name','label','id'].find(k=>typeof value[k]==='string'&&value[k].trim()),body:['role','retained_function','description','summary','text','content','body'].find(k=>typeof value[k]==='string'&&value[k].trim())}}
function focusChar(model,unit){
 if(!unit)return 0;
 if(model.kind==='JSON'&&unit.value&&typeof unit.value==='object'&&!Array.isArray(unit.value)){
  const f=facets(unit.value),key=f.body||f.title,node=key&&model.nodes.find(n=>n.path===unit.path+'.'+key);if(node)return node.contentStart??node.start;
 }
 return clamp(unit.contentStart??unit.start,unit.start,Math.max(unit.start,unit.end-1));
}
function zoomScope(model,char,scope,direction){
 const current=at(model,char,scope);if(!current)return scope;
 const choices=model.levels.map(l=>({id:l.id,unit:at(model,char,l.id)})).filter(x=>x.unit&&x.unit.start<=char&&char<x.unit.end&&x.id!==scope).filter(({unit:u})=>direction<0?u.start<=current.start&&u.end>=current.end&&u.end-u.start>current.end-current.start:u.start>=current.start&&u.end<=current.end&&u.end-u.start<current.end-current.start);
 choices.sort((a,b)=>(direction<0?1:-1)*((a.unit.end-a.unit.start)-(b.unit.end-b.unit.start)));return choices[0]?.id||scope;
}
function exactSpan(model,span){return !!span&&Number.isInteger(span.start)&&Number.isInteger(span.end)&&span.start>=0&&span.end>span.start&&span.end<=model.raw.length}
function charIn(model,span,fraction){if(!exactSpan(model,span))throw Error('Invalid source range.');return span.start+Math.round(clamp(fraction,0,1)*Math.max(0,span.end-span.start-1))}
function ordered(model,scope,query=''){
 const units=level(model,scope).units,terms=String(query).toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu)||[];
 if(!terms.length)return units;
 return units.map((unit,i)=>({unit,i,score:terms.reduce((sum,t)=>sum+(model.raw.slice(unit.start,unit.end).toLocaleLowerCase().includes(t)?1:0),0)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.i-b.i).map(x=>x.unit);
}
function neighbors(model,char,scope,query=''){
 const current=at(model,char,scope),units=ordered(model,scope,query),index=units.indexOf(current);
 return{current,units,index,before:index>0?units[index-1]:null,after:index>=0?units[index+1]||null:units[0]||null,total:level(model,scope).units.length};
}
function describe(model,unit){
 if(!unit)return{title:'No matching passage',body:'Clear the search to restore the source order.',hidden:0};
 const raw=model.raw.slice(unit.start,unit.end);
 if(model.kind==='JSON'){
  try{const v=JSON.parse(raw);if(v&&typeof v==='object'){
   const entries=Object.entries(v),f=facets(v),title=String(f.title?v[f.title]:unit.key||unit.path),body=f.body?v[f.body]:'',shown=new Set([f.title,...(f.body?[f.body]:entries.slice(0,7).map(([k])=>k))]);
   return{title,body:body||entries.slice(0,7).map(([k,x])=>k+': '+(typeof x==='object'&&x!==null?(Array.isArray(x)?x.length+' items':Object.keys(x).length+' fields'):String(x))).join('\n'),hidden:entries.filter(([k])=>!shown.has(k)).length,value:v};
  }}catch{}
 }
 return{title:unit.key&&/^(?:DOC|SECTION)$/.test(unit.type)?String(unit.key):'',body:raw,hidden:0};
}
function patch(model,span,replacement){
 if(!exactSpan(model,span)||typeof replacement!=='string')throw Error('Invalid local edit.');
 if(replacement.length>100_000)throw Error('Edit exceeds 100,000 characters.');
 const raw=model.raw.slice(0,span.start)+replacement+model.raw.slice(span.end);
 if(!wellFormed(raw))throw Error('Edit contains an unpaired Unicode surrogate.');
 if(!raw.trim())throw Error('The source cannot become empty.');
 if(new TextEncoder().encode(raw).length>MAX_BYTES)throw Error('Source exceeds 2 MB.');
 if(model.kind==='JSON')JSON.parse(raw);
 return{raw,changed:raw!==model.raw,span:{start:span.start,end:span.start+replacement.length}};
}
function relation(model,hash,from,to,type){
 if(!RELATIONS.includes(type)||!exactSpan(model,from)||!exactSpan(model,to))throw Error('Select two source ranges and a relation.');
 if(from.end-from.start>20000||to.end-to.start>20000)throw Error('Narrow scope before linking; each quote is limited to 20,000 characters.');
 if(from.start===to.start&&from.end===to.end)throw Error('Select a different destination.');
 const endpoint=span=>{const match=model.levels.find(l=>(!span.scope||l.id===span.scope)&&l.units.some(u=>u.start===span.start&&u.end===span.end));if(!match)throw Error('Relation must name a native source range.');return{start:span.start,end:span.end,scope:match.id,quote:model.raw.slice(span.start,span.end)}};
 return{type,hash,from:endpoint(from),to:endpoint(to),authority:'INTERPRETATION_ONLY'};
}
function validRelation(model,hash,r){return !!r&&r.hash===hash&&r.authority==='INTERPRETATION_ONLY'&&RELATIONS.includes(r.type)&&[r.from,r.to].every(s=>exactSpan(model,s)&&s.end-s.start<=20000&&s.quote===model.raw.slice(s.start,s.end)&&model.levels.some(l=>l.id===s.scope&&l.units.some(u=>u.start===s.start&&u.end===s.end)))&&!(r.from.start===r.to.start&&r.from.end===r.to.end)}
function relationDoors(model,hash,links,char){return links.filter(r=>validRelation(model,hash,r)).flatMap(r=>[...(char>=r.from.start&&char<r.from.end?[{...r,destination:r.to,direction:'→'}]:[]),...(char>=r.to.start&&char<r.to.end?[{...r,destination:r.from,direction:'←'}]:[])])}
// Two honest coordinates sharing one source: the outer dial is absolute
// character position; the inner dial is position inside the currently held
// native range. The window on the outer dial always uses ABSOLUTE coordinates.
function dialReading(model,scope,char){
 const span=at(model,char,scope);
 if(!span)throw Error('No native scope at this source position.');
 const length=model.raw.length;
 return {absolute:clamp(char/Math.max(1,length-1),0,1),
  local:clamp((char-span.start)/Math.max(1,span.end-span.start-1),0,1),
  window:[span.start/Math.max(1,length-1),(span.end-1)/Math.max(1,length-1)],span:{start:span.start,end:span.end}};
}
function dialChar(model,scope,char,band,fraction){
 if(!['absolute','local'].includes(band))throw Error('Unknown source dial.');
 const span=band==='absolute'?{start:0,end:model.raw.length}:at(model,char,scope);
 return charIn(model,span,fraction);
}
// A source is an interval, not a cycle. Leave a quarter-turn seam so its two
// endpoints remain different, including after pointer-coordinate rounding.
const DIAL_START=-Math.PI/4,DIAL_SWEEP=Math.PI*1.5;
function dialFraction(x,y,endpointSlop=0){
 if(!Number.isFinite(x)||!Number.isFinite(y))throw Error('Invalid dial coordinate.');
 const delta=(Math.atan2(y,x)-DIAL_START+Math.PI*2)%(Math.PI*2);
 if(delta<=DIAL_SWEEP+1e-8)return clamp(delta/DIAL_SWEEP,0,1);
 // Pointer targets have round ends. Accept their finite hit area on either
 // side of an endpoint; keep the rest of the seam inert. Math stays exact
 // unless the host explicitly supplies this hit radius in SVG coordinates.
 for(const f of [0,1]){const p=dialXY(f,Math.hypot(x,y));if(Math.hypot(x-(p.x-90),y-(p.y-90))<=endpointSlop)return f}
 return null;
}
function dialXY(fraction,radius=69){
 const a=DIAL_START+DIAL_SWEEP*clamp(fraction,0,1);
 return {x:90+radius*Math.cos(a),y:90+radius*Math.sin(a)};
}
function dialArc(start,end,radius=69){
 const a=dialXY(start,radius),b=dialXY(end,radius);
 return `M ${a.x} ${a.y} A ${radius} ${radius} 0 ${(end-start)*DIAL_SWEEP>Math.PI?1:0} 1 ${b.x} ${b.y}`;
}
// A projection is only a readable address for a source-owned object.
// There is no inferred meaning, simulated authority, or second annotation store.
// Source interval endpoints stay distinct: DIAL's missing quadrant is a seam.
function witnessMarkValid(model,hash,m){
 return !!m&&m.revision===hash&&typeof m.id==='string'&&!!m.id&&
  Number.isInteger(m.charIndex)&&Number.isInteger(m.endIndex)&&
  m.charIndex>=0&&m.endIndex>m.charIndex&&m.endIndex<=model.raw.length&&
  m.quote===model.raw.slice(m.charIndex,m.endIndex)&&
  ['NOTE','QUESTION','APPLIED'].includes(m.kind)&&
  typeof m.note==='string'&&!!m.note.trim()&&m.note.length<=500;
}
function projectWitnesses(model,hash,marks=[],relations=[]){
 if(!model||typeof model.raw!=='string'||typeof hash!=='string')throw Error('Exact source identity required.');
 const length=Math.max(1,model.raw.length-1);
 const seen=new Set(),notes=[];
 for(const m of Array.isArray(marks)?marks:[]){
  if(!witnessMarkValid(model,hash,m)||seen.has(m.id))continue;
  seen.add(m.id);
  const start=m.charIndex/length,end=(m.endIndex-1)/length;
  const point=dialXY(start,78),edge=dialXY(end,78);
  notes.push(Object.freeze({id:m.id,kind:m.kind,resolved:!!m.resolved,
   charIndex:m.charIndex,endIndex:m.endIndex,quote:m.quote,note:m.note,
   point,edge,start,end,sourceHash:hash}));
 }
 notes.sort((a,b)=>a.charIndex-b.charIndex||a.id.localeCompare(b.id));
 const edges=[];
 for(const r of Array.isArray(relations)?relations:[]){
  if(!validRelation(model,hash,r))continue;
  const a=dialXY(r.from.start/length,57),b=dialXY(r.to.start/length,57);
  edges.push(Object.freeze({type:r.type,from:r.from,to:r.to,sourceHash:hash,
   a,b,relation:r}));
 }
 return Object.freeze({schema:'interphase/witness-projection/v1',sourceHash:hash,
  sourceLength:model.raw.length,notes:Object.freeze(notes),relations:Object.freeze(edges),
  residue:Object.freeze({unboundNotes:(Array.isArray(marks)?marks.length:0)-notes.length,
   unboundRelations:(Array.isArray(relations)?relations.length:0)-edges.length})});
}
// Inverse of the visual witness: a tap selects a revision- and quote-verified
// source mark. Dense marks at nearly the same position are cycled, not merged,
// averaged, or silently made unreachable. Host may then SEEK + RETURN.
function witnessAtPoint(projection,x,y,{radius=19,previousId=null}={}){
 if(!Number.isFinite(x)||!Number.isFinite(y)||!projection?.notes)return null;
 const matches=projection.notes.map(n=>({note:n,
  d:Math.hypot(n.point.x-x,n.point.y-y)})).filter(x=>x.d<=radius)
  .sort((a,b)=>a.d-b.d||a.note.charIndex-b.note.charIndex||a.note.id.localeCompare(b.note.id));
 if(!matches.length)return null;
 const prior=previousId===null?-1:matches.findIndex(x=>x.note.id===previousId);
 return Object.freeze({note:matches[(prior+1)%matches.length].note,
  candidates:matches.length});
}
function witnessAddress(projection,sourceRaw,sourceHash,noteId){
 if(projection?.sourceHash!==sourceHash||projection?.sourceLength!==sourceRaw?.length)
  throw Error('Source revision changed.');
 const note=projection.notes.find(n=>n.id===noteId);
 if(!note||note.sourceHash!==sourceHash||sourceRaw.slice(note.charIndex,note.endIndex)!==note.quote)
  throw Error('Unbound or changed source witness.');
 return Object.freeze({char:note.charIndex,end:note.endIndex,quote:note.quote,
  kind:note.kind,id:note.id,sourceHash});
}
function validateAttention(model,a){
 if(!a||!Number.isInteger(a.char)||a.char<0||a.char>=model.raw.length||!model.levels.some(s=>s.id===a.scope)||!['plain','walk','dial'].includes(a.view)||!Number.isFinite(a.wpm)||a.wpm<60||a.wpm>6000||typeof a.query!=='string'||a.query.length>200)throw Error('Invalid RETURN attention.');
 return{char:a.char,scope:a.scope,view:a.view,wpm:a.wpm,query:a.query};
}
export {MAX_BYTES,RELATIONS,clamp,compile,level,containing,at,focusChar,zoomScope,exactSpan,charIn,ordered,neighbors,describe,patch,relation,validRelation,relationDoors,validateAttention,dialReading,dialChar,dialFraction,dialXY,dialArc,witnessMarkValid,projectWitnesses,witnessAtPoint,witnessAddress};
