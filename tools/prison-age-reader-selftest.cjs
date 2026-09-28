const fs=require('fs');
const assert=(x,m)=>{if(!x)throw new Error(m)};
const fnv=s=>{let h=2166136261>>>0;for(const ch of s){h^=ch.codePointAt(0)??0;h=Math.imul(h,16777619)>>>0}return(h>>>0).toString(16).padStart(8,'0')};
const pack=JSON.parse(fs.readFileSync('prison-age/pack.json','utf8'));
assert(pack.schema==='prison-age.reader-pack/v0.2','pack schema');
assert(pack.status.includes('2026 READER CONTINUATION'),'continuation status');
assert(pack.motif?.text==="I'm always behind you.",'motif text');
assert(pack.motif?.historical_canon===false,'motif must not be historical canon');
assert(JSON.stringify(pack.order)===JSON.stringify(['open-air','fandom-court','last-stall','successful-escape']),'curated path order');
const expected={
 'open-air':['prison-age/stories/03-open-air.md',3912,'ee35b81f'],
 'fandom-court':['prison-age/stories/05-fandom-court.md',4056,'5523dd07'],
 'successful-escape':['prison-age/stories/08-successful-escape.md',3674,'5a038d8a']
};
for(const [id,[path,len,hash]] of Object.entries(expected)){
 const text=fs.readFileSync(path,'utf8'),meta=pack.stories[id];
 assert(text.length===len,id+' source length');
 assert(fnv(text)===hash,id+' source hash');
 assert(meta.source_fingerprint?.value===hash,id+' pack hash');
 assert(!text.includes("I'm always behind you"),id+' source must not contain P26 motif');
 assert(text.includes('MARGIN // Ask which rule is being protected by appearing natural.'),id+' margin source');
}
const extract=fs.readFileSync('prison-age/stories/07-last-stall-extract.md','utf8');
assert(extract.includes('Every procedure had succeeded.\n\nThe person had not.'),'Last Stall protocol/person anchor');
assert(extract.includes('This plan is accurate'),'Last Stall plan anchor');
assert(extract.includes('Together, they mapped the camera.'),'Last Stall camera anchor');
assert(extract.includes('PLEASE LEAVE THIS PLACE ABLE TO FIND THE NEXT PERSON.'),'Last Stall next-person anchor');
assert(extract.includes('[ … SOURCE PASSAGE OMITTED … ]'),'Last Stall editorial omissions explicit');
assert(!extract.includes("I'm always behind you"),'P26 motif must not be inserted into sourced extract');
assert(pack.stories['last-stall']?.source_class==='CURATED_SOURCE_EXTRACT','Last Stall source class');
assert(pack.ninePressures?.stages?.length===9,'nine-pressure spine');
assert(pack.ninePressures?.status?.includes('NOT RECOVERED 2021 GATE RULES'),'nine-pressure truth boundary');
assert(pack.carry?.law?.includes('Only a paragraph explicitly marked'),'carry must derive only from explicit marks');
assert(pack.readingPath.classification.includes('NOT CANON ORDER'),'curated path truth label');
assert(JSON.stringify(pack.operations)===JSON.stringify(['READ','MARK','FOCUS','RETURN']),'bounded operations');
const manifest=JSON.parse(fs.readFileSync('showcase-manifest.json','utf8')),route=manifest.routes.find(r=>r.href==='/prison-age/');
assert(route?.state==='ACTIVE','FIELD route must be ACTIVE');
assert(route?.operation==='READ','FIELD route verb');
assert(route?.showcase_card===true,'FIELD route must be showcase-visible');
assert(route?.tier==='FIELD','FIELD tier');
console.log('PRISON AGE READER SOURCE CONTRACT PASS',Object.fromEntries(Object.entries(expected).map(([id,x])=>[id,x[2]])),'· LAST STALL EXTRACT · NINE PRESSURES 9');
