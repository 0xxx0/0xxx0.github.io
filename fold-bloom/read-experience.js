export const READ_EXPERIENCE_SCHEMA='field-read-experience/v0.1';
export const READ_EXPERIENCE_AUTHORITY='PROJECTION_ONLY';
export const READ_EXPERIENCE_SCENES=Object.freeze(['DEEP','TRANCE','WOOD','VOID']);
export const READ_EXPERIENCE_PROFILES=Object.freeze(['NORMAL','DRIVE','TRANCE','SOFT']);
export const READ_EXPERIENCE_LAYERS=Object.freeze(['SOURCE','MAP','IMMERSION']);

const clone=x=>x==null?x:JSON.parse(JSON.stringify(x));
const str=x=>x==null?'':String(x);
function presentation(raw={}){
  const scene=String(raw.scene||'').toUpperCase(),profile=String(raw.profile||'').toUpperCase(),layer=String(raw.layer||'').toUpperCase();
  return {
    scene:READ_EXPERIENCE_SCENES.includes(scene)?scene:null,
    profile:READ_EXPERIENCE_PROFILES.includes(profile)?profile:null,
    layer:READ_EXPERIENCE_LAYERS.includes(layer)?layer:null
  };
}
function uniqueSpan(source,quote){
  const q=str(quote);if(!q)throw Error('READ_EXPERIENCE_QUOTE_REQUIRED');
  const start=source.indexOf(q);if(start<0)throw Error('READ_EXPERIENCE_QUOTE_NOT_FOUND');
  if(source.indexOf(q,start+1)>=0)throw Error('READ_EXPERIENCE_QUOTE_NOT_UNIQUE');
  return {start,end:start+q.length,quote:q};
}
export function makeReadExperience({owner='SOURCE',source='',sourceIdentity={},initial={},cues=[]}={}){
  const text=str(source);if(!text)throw Error('READ_EXPERIENCE_SOURCE_REQUIRED');
  const xs=(Array.isArray(cues)?cues:[]).map((cue,i)=>{
    const span=uniqueSpan(text,cue.quote),p=presentation(cue.presentation||{});
    if(!p.scene&&!p.profile&&!p.layer)throw Error('READ_EXPERIENCE_PRESENTATION_REQUIRED');
    return {id:str(cue.id||('cue-'+(i+1))),...span,presentation:p};
  }).sort((a,b)=>a.start-b.start);
  for(let i=1;i<xs.length;i++)if(xs[i].start<xs[i-1].end)throw Error('READ_EXPERIENCE_CUE_OVERLAP');
  if(xs.length>32)throw Error('READ_EXPERIENCE_TOO_MANY_CUES');
  const out={
    schema:READ_EXPERIENCE_SCHEMA,authority:READ_EXPERIENCE_AUTHORITY,owner:str(owner||'SOURCE'),
    sourceIdentity:{id:str(sourceIdentity.id||''),address:str(sourceIdentity.address||''),hash:str(sourceIdentity.hash||'')},
    initial:presentation(initial),cues:xs,
    law:'Exact source spans may change presentation only. SOURCE / cursor / native effects / comprehension claims remain outside this score.'
  };
  validateReadExperience(out,text,sourceIdentity);return out;
}
export function validateReadExperience(raw,source='',sourceIdentity={}){
  const x=clone(raw),errors=[],text=str(source);
  if(!x||x.schema!==READ_EXPERIENCE_SCHEMA)errors.push('schema mismatch');
  if(x?.authority!==READ_EXPERIENCE_AUTHORITY)errors.push('authority mismatch');
  if(!text)errors.push('source required');
  if(x?.sourceIdentity?.address&&sourceIdentity?.address&&x.sourceIdentity.address!==String(sourceIdentity.address))errors.push('source address mismatch');
  if(x?.sourceIdentity?.hash&&sourceIdentity?.hash&&x.sourceIdentity.hash!==String(sourceIdentity.hash))errors.push('source hash mismatch');
  const cues=Array.isArray(x?.cues)?x.cues:[];
  if(cues.length>32)errors.push('too many cues');
  let prev=-1;
  cues.forEach((c,i)=>{
    const a=Number(c?.start),b=Number(c?.end),q=str(c?.quote);
    if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<=a||b>text.length)errors.push('cue '+i+' bounds');
    else if(text.slice(a,b)!==q)errors.push('cue '+i+' quote mismatch');
    if(a<prev)errors.push('cue order');prev=b;
    const p=presentation(c?.presentation||{});
    if(!p.scene&&!p.profile&&!p.layer)errors.push('cue '+i+' presentation');
  });
  return {ok:errors.length===0,errors,experience:x};
}
export function normalizeReadExperience(raw,source='',sourceIdentity={}){
  const v=validateReadExperience(raw,source,sourceIdentity);if(!v.ok)throw Error('READ_EXPERIENCE_INVALID:'+v.errors.join('|'));return v.experience;
}
export function readExperienceCueAt(experience,charIndex=0){
  const x=experience;if(!x||x.schema!==READ_EXPERIENCE_SCHEMA)return null;
  const n=Math.max(0,Math.trunc(Number(charIndex)||0));let hit=null;
  for(const cue of x.cues||[]){if(Number(cue.start)<=n)hit=cue;else break}
  return hit?clone(hit):null;
}
export function readExperienceView(experience,charIndex=0){
  if(!experience)return null;const cue=readExperienceCueAt(experience,charIndex);
  return {schema:experience.schema,authority:experience.authority,owner:experience.owner,current:cue?{id:cue.id,start:cue.start,end:cue.end,quote:cue.quote,presentation:cue.presentation}:null,initial:experience.initial,law:experience.law};
}
