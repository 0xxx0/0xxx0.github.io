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
function validateAttention(model,a){
 if(!a||!Number.isInteger(a.char)||a.char<0||a.char>=model.raw.length||!model.levels.some(s=>s.id===a.scope)||!['plain','walk'].includes(a.view)||!Number.isFinite(a.wpm)||a.wpm<60||a.wpm>6000||typeof a.query!=='string'||a.query.length>200)throw Error('Invalid RETURN attention.');
 return{char:a.char,scope:a.scope,view:a.view,wpm:a.wpm,query:a.query};
}
export {MAX_BYTES,RELATIONS,clamp,compile,level,containing,at,focusChar,zoomScope,exactSpan,charIn,ordered,neighbors,describe,patch,relation,validRelation,relationDoors,validateAttention};
