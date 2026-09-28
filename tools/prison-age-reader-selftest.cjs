const fs=require('fs');
const assert=(x,m)=>{if(!x)throw new Error(m)};
const fnv=s=>{let h=2166136261>>>0;for(const ch of s){h^=ch.codePointAt(0)??0;h=Math.imul(h,16777619)>>>0}return(h>>>0).toString(16).padStart(8,'0')};
const sources=JSON.parse(fs.readFileSync('prison-age/sources.json','utf8'));
const legacy=JSON.parse(fs.readFileSync('prison-age/pack.json','utf8'));
const release=JSON.parse(fs.readFileSync('prison-age/release.json','utf8'));
const active=fs.readFileSync('prison-age/index.html','utf8');
const frozen=fs.readFileSync('prison-age/reader-0.2/index.html','utf8');

assert(sources.schema==='prison-age.source-pack/v0.1','source pack schema');
assert(sources.status==='ACTIVE_SOURCE_DOORWAY','source pack active');
assert(sources.default==='successful-escape','default source should be strongest transfer story');
assert(!JSON.stringify(sources).includes("I'm always behind you"),'active source pack must not carry rejected motif');
assert(release.status.includes('LEGACY_READER_FROZEN'),'release must freeze reader 0.2');
assert(release.operation==='READ / RIDE','active operation');
assert(release.legacy?.status==='FROZEN_FAILED_PROJECTION','legacy freeze status');
assert(release.boundaries.some(x=>x.includes("remains preserved only in frozen reader 0.2")),'motif boundary');
assert(!active.includes("I'M ALWAYS <b>BEHIND YOU</b>"),'active surface must not present rejected motif');
assert(active.includes('RIDE SAME SOURCE'),'active ride aperture');
assert(active.includes("makeReadRidePacket"),'active route must use shared READ/RIDE contract');
assert(active.includes("authority:'PRISON_AGE'"),'source authority must remain Prison Age');
assert(frozen.includes("I'M ALWAYS <b>BEHIND YOU</b>"),'frozen reader bytes must remain inspectable');

const expected={
 'open-air':['prison-age/stories/03-open-air.md',3912,'ee35b81f'],
 'fandom-court':['prison-age/stories/05-fandom-court.md',4056,'5523dd07'],
 'successful-escape':['prison-age/stories/08-successful-escape.md',3674,'5a038d8a']
};
for(const [id,[path,len,hash]] of Object.entries(expected)){
 const text=fs.readFileSync(path,'utf8'),meta=sources.stories[id];
 assert(text.length===len,id+' source length');
 assert(fnv(text)===hash,id+' source hash');
 assert(meta.source_fingerprint?.value===hash,id+' source-pack hash');
 assert(meta.source_class==='EXACT_ANTHOLOGY_STORY',id+' source class');
}
const extract=fs.readFileSync('prison-age/stories/07-last-stall-extract.md','utf8');
assert(extract.includes('Every procedure had succeeded.\n\nThe person had not.'),'Last Stall source anchor');
assert(extract.includes('[ … SOURCE PASSAGE OMITTED … ]'),'Last Stall omissions explicit');
assert(sources.stories['last-stall']?.source_class.includes('CURATED_SOURCE_EXTRACT'),'Last Stall source class');

const manifest=JSON.parse(fs.readFileSync('showcase-manifest.json','utf8'));
const route=manifest.routes.find(r=>r.href==='/prison-age/');
const legacyRoute=manifest.routes.find(r=>r.href==='/prison-age/reader-0.2/');
assert(route?.state==='ACTIVE','active route');
assert(route?.operation==='READ / RIDE','FIELD route verb');
assert(route?.showcase_card===true,'active route visible');
assert(route?.version==='0.3','active route version');
assert(route?.tier==='FIELD','active FIELD tier');
assert(route?.role.includes('Source-first'),'active route role');
assert(route?.field?.exit_paths?.some(x=>x.class==='FOLD_BLOOM_LIVE'),'LIVE exit');
assert(legacyRoute?.state==='FROZEN_DONOR'&&legacyRoute?.showcase_card===false,'legacy reader must be frozen and hidden');
console.log('PRISON AGE SOURCE / READ-RIDE CONTRACT PASS',Object.fromEntries(Object.entries(expected).map(([id,x])=>[id,x[2]])),'· LEGACY 0.2 FROZEN_DONOR');
