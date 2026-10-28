// Host-neutral exact source DOOR. No projection, effects, global store or trust escalation.
const LIMITS=Object.freeze({doors:64,depth:16,quote:20000});
const TYPES=Object.freeze(['supports','contrasts','questions','explains']);
const HASH=/^sha256:[a-f0-9]{64}$/i,EXT=/\.(json|txt|md|markdown|csv|log|ya?ml)$/i;
function address(value,origin){
 if(typeof value!=='string'||value.length>1024)return '';
 try{const base=new URL(origin),u=new URL(value,base);
  return u.origin===base.origin&&EXT.test(u.pathname)&&!u.hash&&!u.username&&!u.password?u.pathname+u.search:'';
 }catch{return ''}
}
function endpointOK(e,origin){
 return !!e&&typeof e==='object'&&!!address(e.address,origin)&&address(e.address,origin)===e.address&&HASH.test(e.hash||'')&&
  Number.isInteger(e.start)&&Number.isInteger(e.end)&&e.start>=0&&e.end>e.start&&
  e.end-e.start<=LIMITS.quote&&typeof e.scope==='string'&&e.scope.length>0&&e.scope.length<=120&&
  typeof e.quote==='string'&&e.quote.length===e.end-e.start;
}
function linkOK(d,origin){return !!d&&TYPES.includes(d.type)&&d.authority==='INTERPRETATION_ONLY'&&endpointOK(d.from,origin)&&endpointOK(d.to,origin)&&d.from.address!==d.to.address}
function frameOK(f,origin){return !!f&&endpointOK(f.at,origin)&&typeof f.label==='string'&&f.label.length<=180&&
 !!f.attention&&Array.isArray(f.links)&&f.links.length<=128&&Array.isArray(f.marks)&&f.marks.length<=256&&
 Array.isArray(f.frames)&&f.frames.length<=64&&f.frames.every(x=>x.hash===f.at.hash)&&(!f.returnTo||typeof f.returnTo==='string')}
function endpoint({address:src,hash,raw,unit,scope},origin){
 const e={address:address(src,origin),hash,start:unit?.start,end:unit?.end,scope,quote:raw?.slice(unit?.start,unit?.end)};
 if(!endpointOK(e,origin))throw Error('DOOR requires a versioned, native range in an addressed source.');
 return e;
}
function check(e,raw,hash,units,origin){
 if(!endpointOK(e,origin)||e.hash!==hash||raw.slice(e.start,e.end)!==e.quote)throw Error('DOOR revision/quote drift; caller unchanged.');
 if(!units?.some(x=>x.start===e.start&&x.end===e.end))throw Error('DOOR range is not a native source unit; caller unchanged.');
 return true;
}
function citations(raw,span,from,origin){
 if(!span||typeof raw!=='string'||!address(from,origin))return [];
 const text=raw.slice(span.start,span.end),hits=[];
 // Only authored references: literal code-delimited paths and Markdown links.
 // Relative links resolve against the held document, not the FIELD website root.
 for(const m of text.matchAll(/`(\/[a-zA-Z0-9._\/-]+\.(?:md|markdown|txt|json|csv|log|ya?ml))`/g))hits.push({i:m.index,p:m[1]});
 for(const m of text.matchAll(/\[[^\]]{1,120}\]\(([^)\s]+)\)/g))hits.push({i:m.index,p:m[1]});
 hits.sort((a,b)=>a.i-b.i);
 const found=new Set(),base=new URL(from,origin);
 for(const hit of hits){
  let p='';
  try{const u=new URL(hit.p,base);p=address(u.href,origin)}catch{}
  if(p&&p!==from)found.add(p);
  if(found.size>=8)break;
 }
 return [...found];
}
export {LIMITS,address,endpointOK,linkOK,frameOK,endpoint,check,citations};
