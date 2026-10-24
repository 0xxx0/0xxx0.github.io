// Data projections inside the existing INTERPHASE host. Path optics, evidence
// and hashing keep their native implementations; this file owns no effects.
import '../lib/path.js';
import '../lib/interphase-composition.js';
const P=globalThis.InterphasePath,C=globalThis.InterphaseComposition;
import {stableKey,hashText} from '../lib/id.js';
export const VERSION='interphase-work/v0.1';
export const LIMITS=Object.freeze({bytes:2_000_000,steps:16,rows:100_000});
const own=(x,k)=>x!=null&&Object.hasOwn(Object(x),k);
const fail=m=>{throw Error(m)};
export function path(value=''){
 if(Array.isArray(value))return value.map(String);
 if(value==='')return[];
 if(typeof value!=='string'||!value.startsWith('/')||/~(?![01])/u.test(value))fail('Use a JSON pointer, for example /current_heads');
 if(value.length>4000||value.split('/').length>65)fail('Pointer exceeds its bounds');
 return value.slice(1).split('/').map(s=>s.replaceAll('~1','/').replaceAll('~0','~'));
}
export const pointer=p=>p.length?'/'+p.map(k=>String(k).replaceAll('~','~0').replaceAll('/','~1')).join('/'):'';
function get(value,p){let v=value;for(const k of p){if(!own(v,k))fail('Missing source field '+pointer(p));v=v[k]}return P.getIn(value,p)}
function optional(value,p){try{return get(value,p)}catch{return undefined}}
export const type=v=>v===null?'null':Array.isArray(v)?'rows':typeof v;
export const count=v=>Array.isArray(v)?v.length:typeof v==='string'?v.length:v&&typeof v==='object'?Object.keys(v).length:1;
const compare=(a,b)=>{if(a===b)return 0;if(a==null)return 1;if(b==null)return-1;if(typeof a==='number'&&typeof b==='number')return a-b;const x=typeof a==='object'?stableKey(a):String(a),y=typeof b==='object'?stableKey(b):String(b);return x===y?0:x<y?-1:1};
export function run(input,steps=[]){
 if(!Array.isArray(steps)||steps.length>LIMITS.steps)fail('A workflow has at most '+LIMITS.steps+' steps');
 if(Array.isArray(input)&&input.length>LIMITS.rows)fail('Source exceeds '+LIMITS.rows+' rows');
 let value=input,refs=Array.isArray(input)?input.map((_,i)=>[String(i)]):[[]],columns=null;
 const trace=[],losses=[];
 for(const [index,s] of steps.entries()){
  const before={type:type(value),count:count(value)},p=path(s.path||'');let loss='';
  if(s.op==='at'){
   let base=[];
   let nextColumns=null;
   if(Array.isArray(value)&&p.length){const i=Number(p[0]);if(!Number.isInteger(i)||!refs[i])fail('Missing row '+p[0]);base=refs[i].concat(columns&&p.length>1?(columns[p[1]]||[p[1]]).concat(p.slice(2)):p.slice(1));if(p.length===1)nextColumns=columns}
   else{base=(refs[0]||[]).concat(columns&&p.length?(columns[p[0]]||[p[0]]).concat(p.slice(1)):p);if(!p.length)nextColumns=columns}
   value=get(value,p);if(Array.isArray(value)&&value.length>LIMITS.rows)fail('Source exceeds '+LIMITS.rows+' rows');refs=Array.isArray(value)?value.map((_,i)=>base.concat(String(i))):[base];columns=nextColumns;
  }else{
   if(!Array.isArray(value))fail(String(s.op).toUpperCase()+' needs rows; choose an array with AT first');
   if(value.length>LIMITS.rows)fail('Source exceeds '+LIMITS.rows+' rows');
   if(s.op==='where'){
    const test=s.test||'contains',target=s.value;if(!['exists','equals','not','contains','gt','lt'].includes(test))fail('Unknown filter '+test);
    const pairs=value.map((v,i)=>({v,ref:refs[i]})).filter(({v})=>{
     const x=p.length?optional(v,p):v;
     if(test==='exists')return x!==undefined;
     if(test==='equals')return stableKey(x)===stableKey(target);
     if(test==='not')return stableKey(x)!==stableKey(target);
     if(test==='contains')return String(x==null?'':typeof x==='object'?JSON.stringify(x):x).toLowerCase().includes(String(target??'').toLowerCase());
     if(test==='gt'||test==='lt')return typeof x==='number'&&typeof target==='number'&&(test==='gt'?x>target:x<target);
     fail('Unknown filter '+test);
    });loss=(value.length-pairs.length)+' rows excluded by filter';value=pairs.map(x=>x.v);refs=pairs.map(x=>x.ref);
   }else if(s.op==='pick'){
    if(!Array.isArray(s.fields)||!s.fields.length||s.fields.length>32)fail('Choose between 1 and 32 fields');
    const fields=s.fields.map(f=>({p:path(f),name:path(f).at(-1)||'$'}));
    if(new Set(fields.map(f=>f.name)).size!==fields.length)fail('PICK field names must be distinct');
    const previous=columns;columns=Object.fromEntries(fields.map(f=>[f.name,previous?.[f.p[0]]?previous[f.p[0]].concat(f.p.slice(1)):f.p]));
    value=value.map(v=>Object.fromEntries(fields.filter(f=>optional(v,f.p)!==undefined).map(f=>[f.name,optional(v,f.p)])));loss='Only '+fields.map(f=>f.name).join(', ')+' shown; other fields remain in source';
   }else if(s.op==='sort'){
    const direction=s.desc?-1:1,pairs=value.map((v,i)=>({v,ref:refs[i],i}));
    pairs.sort((a,b)=>direction*compare(p.length?optional(a.v,p):a.v,p.length?optional(b.v,p):b.v)||a.i-b.i);value=pairs.map(x=>x.v);refs=pairs.map(x=>x.ref);
   }else if(s.op==='take'){
    const n=Number(s.count);if(!Number.isInteger(n)||n<0||n>LIMITS.rows)fail('TAKE needs a nonnegative integer');
    loss=Math.max(0,value.length-n)+' rows folded by limit';value=value.slice(0,n);refs=refs.slice(0,n);
   }else if(s.op==='unique'){
    const seen=new Set(),pairs=value.map((v,i)=>({v,ref:refs[i]})).filter(({v})=>{const k=stableKey(p.length?optional(v,p):v);if(seen.has(k))return false;seen.add(k);return true});
    loss=(value.length-pairs.length)+' repeated values excluded; source rows retain distinct addresses';value=pairs.map(x=>x.v);refs=pairs.map(x=>x.ref);
   }else fail('Unknown operation '+String(s.op));
  }
  if(new TextEncoder().encode(stableKey(value)).length>LIMITS.bytes)fail('Derived result exceeds 2 MB');
  if(loss)losses.push(loss);
  trace.push({index,step:structuredClone(s),before,after:{type:type(value),count:count(value)},loss,refs:refs.map(r=>r.slice()),columns:columns&&structuredClone(columns),value});
 }
 return {value,refs,columns,trace,losses};
}
export async function sourceObject(raw,label='Source',address=''){
 if(typeof raw!=='string'||!raw.trim())fail('Choose a nonempty source');
 if(new TextEncoder().encode(raw).length>LIMITS.bytes)fail('Source exceeds 2 MB');
 let data=raw,format='TEXT';try{data=JSON.parse(raw);format='JSON'}catch{if(/\.json$/i.test(label))fail('Invalid JSON; the current source is unchanged')}
 if(format==='JSON'&&globalThis.FieldAperture?.jsonSpans?.(raw).some(n=>n.ambiguous))fail('Repeated JSON keys have ambiguous source addresses; keep this text in the reader');
 const hash=await hashText(raw);
 return {schema:'interphase.object/v0.1',id:'source:'+hash,kind:'DATA_SOURCE',title:label,thesis:address||'Local source · this tab only',state:'SOURCE',provenance:{origin:address||'session',hash},payload:{raw,data,format,address}};
}
export function sourceData(source){return source.kind==='DATA_SOURCE'?source.payload.data:source.payload??source}
export async function receipt(source,steps,result,focus=null,view='TABLE'){
 const input=sourceData(source),sourceHash=await hashText(source.kind==='DATA_SOURCE'?source.payload.raw:stableKey(input)),outputHash=await hashText(stableKey(result.value));
 return {schema:VERSION,source:{id:source.id,label:source.title,address:source.payload?.address||'',hash:sourceHash,serialization:source.kind==='DATA_SOURCE'?'EXACT_TEXT':'CANONICAL_JSON'},steps:structuredClone(steps),focus,view,
  projection:C.projection({id:source.id+':workflow:'+outputHash,sourceRef:{id:source.id,kind:source.kind},sourceRevision:sourceHash,value:result.value,authority:'DERIVED',updatePolicy:'NONE',losses:result.losses,provenance:{wasGeneratedBy:VERSION,wasDerivedFrom:[source.id]}}),
  trace:result.trace.map(({index,step,before,after,loss})=>({index,step,before,after,loss})),refs:result.refs,outputHash,return:{source:source.id,next_authority:'NONE'}};
}
export const PRESETS=Object.freeze({
 heads:[{op:'at',path:'/current_heads'},{op:'pick',fields:['/head','/route','/state','/retained_function']}],
 routes:[{op:'at',path:'/routes'},{op:'pick',fields:['/title','/href','/operation','/state']}],
 read:[{op:'at',path:'/routes'},{op:'where',path:'/operation',test:'equals',value:'READ'},{op:'pick',fields:['/title','/href','/role']}]
});
