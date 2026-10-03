(function(root,factory){
'use strict';
const api=factory();
if(typeof module==='object'&&module.exports)module.exports=api;
if(root)root.PrisonAgeEvidenceRide=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';

const SCHEMA='prison-age.evidence-ride/v0.1';
const ROUTE_SCHEMA='prison-age.evidence-route/v0.2';
const READ_RIDE_SCHEMA='field-read-ride/v0.1';
const READ_RIDE_STORAGE='fold-bloom.read-ride.handoff.v01';
const AUTHORITY='EVIDENCE_ONLY';
const MAX_CARDS=3;
const LAW='The route order is chosen by the reader. Every ridden paragraph is an exact fragment already present in the source-derived Evidence Atlas. The montage adds no connective prose, theme, causality, canon order or equivalence; blank lines are separators only. FOLD//BLOOM may traverse the derived arrangement; PRISON AGE source bytes remain authoritative.';

const text=(x,d='')=>x==null?d:String(x);
const arr=x=>Array.isArray(x)?x:[];
const clone=x=>x==null?x:JSON.parse(JSON.stringify(x));
function hashString(value=''){
  let h=2166136261>>>0;
  for(const ch of text(value).normalize('NFC')){h^=ch.codePointAt(0)??0;h=Math.imul(h,16777619)>>>0}
  return (h>>>0).toString(16).padStart(8,'0');
}
function cardByNumber(pack,n){return arr(pack?.cards).find(c=>Number(c?.n)===Number(n))||null}
function normalizeNumbers(pack,numbers){
  const seen=new Set(),out=[];
  for(const raw of arr(numbers)){
    const n=Number(raw);if(!Number.isInteger(n)||seen.has(n))continue;
    const c=cardByNumber(pack,n);if(!c)continue;seen.add(n);out.push(n);if(out.length>=MAX_CARDS)break;
  }
  return out;
}
function fragment(x,{card,side,ordinal,start}){
  if(!x||typeof x.text!=='string'||!x.text.length)throw Error('EVIDENCE_FRAGMENT_TEXT');
  const end=start+x.text.length;
  return {ordinal,card:Number(card),side,source_id:text(x.source_id),title:text(x.title),path:text(x.path),source_start:Number(x.start),source_end:Number(x.end),source_address:text(x.address),montage_start:start,montage_end:end,text:x.text};
}
function build(pack,numbers,{returnAddress='/prison-age/?atlas=evidence'}={}){
  if(!pack||pack.schema!=='prison-age.evidence-atlas/v0.1')throw Error('EVIDENCE_ATLAS_SCHEMA');
  const nums=normalizeNumbers(pack,numbers);if(!nums.length)throw Error('EVIDENCE_TRAIL_EMPTY');
  const cards=nums.map(n=>cardByNumber(pack,n));
  const fragments=[];let cursor=0,ordinal=0;
  for(const c of cards)for(const [side,x] of [['A',c.a],['B',c.b]]){const f=fragment(x,{card:c.n,side,ordinal:ordinal++,start:cursor});fragments.push(f);cursor=f.montage_end+2}
  const source=fragments.map(f=>f.text).join('\n\n'),sourceHash='fnv1a32:'+hashString(source);
  const routeKey=nums.join('-'),id='prison-age-evidence:'+hashString(text(pack.version)+'|'+routeKey+'|'+fragments.map(f=>f.source_address).join('|'));
  const route={schema:ROUTE_SCHEMA,authority:AUTHORITY,source_set:'PRISON_AGE',atlas_version:text(pack.version),id,cards:cards.map(c=>({n:Number(c.n),class:text(c.class),pair:text(c.pair),shared:clone(c.shared),phrases:clone(c.phrases)})),fragments:fragments.map(({text:_,...f})=>f),fragment_count:fragments.length,source_length:source.length,source_hash:sourceHash,returnAddress:text(returnAddress),law:LAW};
  const routeCopy=clone(route);
  const packet={schema:READ_RIDE_SCHEMA,created:new Date().toISOString(),source,label:'PRISON AGE · EVIDENCE TRAIL '+nums.map(n=>String(n).padStart(2,'0')).join(' → '),sourceIdentity:{id,address:'prison-age-evidence://'+encodeURIComponent(text(pack.version))+'/'+routeKey,kind:'PRISON_AGE_EVIDENCE_ROUTE',format:'TXT',authority:'PRISON_AGE_EVIDENCE_ROUTE',hash:sourceHash,evidenceRoute:routeCopy},focus:{char_index:0,source_progress:0},from:text(returnAddress),returnAddress:text(returnAddress),carrier:null,evidenceRoute:route};
  validate(pack,packet);return packet;
}
function validate(pack,packet){
  const errors=[],route=packet?.evidenceRoute;
  if(!packet||packet.schema!==READ_RIDE_SCHEMA)errors.push('read-ride schema');
  if(!route||route.schema!==ROUTE_SCHEMA)errors.push('evidence-route schema');
  if(route?.authority!==AUTHORITY)errors.push('route authority');
  const nums=arr(route?.cards).map(x=>Number(x?.n));
  if(!nums.length||nums.length>MAX_CARDS||new Set(nums).size!==nums.length)errors.push('card count/uniqueness');
  const canonical=normalizeNumbers(pack,nums);if(canonical.length!==nums.length||canonical.some((n,i)=>n!==nums[i]))errors.push('unknown/reordered card identity');
  const expected=[];for(const n of nums){const c=cardByNumber(pack,n);if(c)expected.push(c.a,c.b)}
  const fs=arr(route?.fragments);if(fs.length!==expected.length)errors.push('fragment count');
  let cursor=0;const texts=[];
  for(let i=0;i<expected.length;i++){const x=expected[i],f=fs[i];if(!f)continue;if(text(f.source_address)!==text(x.address)||text(f.source_id)!==text(x.source_id))errors.push('fragment provenance '+i);if(Number(f.source_start)!==Number(x.start)||Number(f.source_end)!==Number(x.end))errors.push('fragment bounds '+i);if(Number(f.montage_start)!==cursor||Number(f.montage_end)!==cursor+x.text.length)errors.push('montage bounds '+i);texts.push(x.text);cursor+=x.text.length+2}
  const expectedSource=texts.join('\n\n'),expectedHash='fnv1a32:'+hashString(expectedSource);
  if(text(packet?.source)!==expectedSource)errors.push('montage source bytes');
  if(Number(route?.source_length)!==expectedSource.length)errors.push('source length');
  if(text(route?.source_hash)!==expectedHash)errors.push('route source hash');
  if(text(packet?.sourceIdentity?.hash)!==expectedHash)errors.push('identity source hash');
  if(text(packet?.sourceIdentity?.authority)!=='PRISON_AGE_EVIDENCE_ROUTE')errors.push('source authority');
  if(JSON.stringify(packet?.sourceIdentity?.evidenceRoute)!==JSON.stringify(route))errors.push('identity route witness mismatch');
  if(!text(packet?.returnAddress).startsWith('/prison-age/'))errors.push('return address');
  return{ok:errors.length===0,errors};
}
function sharePath(numbers,{card=null}={}){const xs=arr(numbers).map(Number).filter(Number.isInteger).slice(0,MAX_CARDS),u=new URL('/prison-age/','https://field.invalid');u.searchParams.set('atlas','evidence');if(xs.length)u.searchParams.set('trail',xs.join(','));const held=Number(card);if(Number.isInteger(held))u.searchParams.set('card',String(held));return u.pathname+u.search}
return Object.freeze({SCHEMA,ROUTE_SCHEMA,READ_RIDE_SCHEMA,READ_RIDE_STORAGE,AUTHORITY,MAX_CARDS,LAW,hashString,normalizeNumbers,build,validate,sharePath});
});
