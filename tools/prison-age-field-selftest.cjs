const fs=require('fs');
const assert=(x,m)=>{if(!x)throw new Error(m)};
const fnv=s=>{let h=2166136261>>>0;for(const ch of s){h^=ch.codePointAt(0)??0;h=Math.imul(h,16777619)>>>0}return(h>>>0).toString(16).padStart(8,'0')};

const sources=JSON.parse(fs.readFileSync('prison-age/sources.json','utf8'));
const release=JSON.parse(fs.readFileSync('prison-age/release.json','utf8'));
const manifest=JSON.parse(fs.readFileSync('showcase-manifest.json','utf8'));
const current=JSON.parse(fs.readFileSync('control/CURRENT.json','utf8'));
const field=fs.readFileSync('index.html','utf8');
const active=fs.readFileSync('prison-age/index.html','utf8');

assert(sources.schema==='prison-age.source-pack/v0.1','source schema');
assert(sources.status==='FIELD_SOURCE_SET','source set status');
assert(sources.default==='open-air','stable source-order default');
assert(sources.operations.join('|')==='READ|RIDE|SOURCE|RETURN FIELD','source-set operations');
for(const [id,x] of Object.entries(sources.stories)){
  assert(!Object.prototype.hasOwnProperty.call(x,'engine'),id+' interpretive engine removed');
  assert(!Object.prototype.hasOwnProperty.call(x,'token'),id+' interpretive token removed');
}
assert(release.status==='FIELD_SOURCE_SET / NO_BESPOKE_READER','release contraction');
assert(release.operation==='READ / RIDE / SOURCE','release operations');
assert(release.field.native_actions.join('|')==='READ|RIDE|SOURCE','FIELD native actions');
assert(release.retired_runtime.status==='REMOVED_FROM_RUNTIME_TREE','retired runtime status');

assert(!fs.existsSync('prison-age/pack.json'),'reader pack removed from runtime');
assert(!fs.existsSync('prison-age/reader-0.2/index.html'),'bespoke reader html removed');
assert(!fs.existsSync('prison-age/reader-0.2/release.json'),'bespoke reader release removed');
assert(!fs.existsSync('tools/prison-age-reader-selftest.cjs'),'old reader selftest removed');
assert(!fs.existsSync('tools/prison-age-reader-smoke.mjs'),'old reader smoke removed');

for(const txt of [active,JSON.stringify(sources),JSON.stringify(release)]){
  assert(!/I'M ALWAYS BEHIND YOU/i.test(txt),'rejected motif absent from active runtime');
}
assert(!active.includes('reader-0.2'),'active page must not expose retired reader');
assert(!active.includes('id="engine"'),'active page must not expose interpretive engine');
assert(active.includes('READ →')&&active.includes('RIDE →')&&active.includes('>SOURCE<')&&active.includes('RETURN FIELD'),'source resolver operations');

const expected={
 'open-air':['prison-age/stories/03-open-air.md',3912,'ee35b81f'],
 'fandom-court':['prison-age/stories/05-fandom-court.md',4056,'5523dd07'],
 'successful-escape':['prison-age/stories/08-successful-escape.md',3674,'5a038d8a']
};
for(const [id,[path,len,hash]] of Object.entries(expected)){
 const text=fs.readFileSync(path,'utf8'),meta=sources.stories[id];
 assert(text.length===len,id+' source length unchanged');
 assert(fnv(text)===hash,id+' source hash unchanged');
 assert(meta.source_fingerprint?.value===hash,id+' ledger hash unchanged');
 assert(meta.source_class==='EXACT_ANTHOLOGY_STORY',id+' exact source class');
}
const extract=fs.readFileSync('prison-age/stories/07-last-stall-extract.md','utf8');
assert(extract.includes('Every procedure had succeeded.\n\nThe person had not.'),'Last Stall source anchor');
assert(extract.includes('[ … SOURCE PASSAGE OMITTED … ]'),'Last Stall omissions explicit');
assert(sources.stories['last-stall']?.source_class.includes('CURATED_SOURCE_EXTRACT'),'Last Stall extract class');

const prisonRoutes=manifest.routes.filter(r=>r.family==='PRISON AGE'||r.href==='/prison-age/'||String(r.href||'').startsWith('/prison-age/'));
assert(prisonRoutes.length===1,'exactly one Prison Age manifest route');
const route=prisonRoutes[0];
assert(route.href==='/prison-age/'&&route.tier==='FIELD'&&route.state==='ACTIVE','single active FIELD route');
assert(route.operation==='READ / RIDE / SOURCE','FIELD route operation');
assert(route.version==='0.4','FIELD route version');
assert(route.index.work_modes.join('|')==='READ|RIDE|SOURCE|RETURN','FIELD work modes');
assert(route.field.exit_paths.length===3,'exactly three native exits');
assert(route.field.exit_paths.map(x=>x.via).join('|')==='READ|RIDE|SOURCE','native exit labels');

assert(field.includes("owner:'PRISON AGE'"),'FIELD capability owner');
assert(field.includes("moves:['READ','RIDE','SOURCE']"),'FIELD native move list');
assert(field.includes("story=open-air&action=read&return=field"),'FIELD READ target');
assert(field.includes("story=open-air&action=ride&return=field"),'FIELD RIDE target');
assert(field.includes("story=open-air&return=field"),'FIELD SOURCE target');
const fh=current.current_heads.find(h=>h.lineage==='field-index');
assert(fh?.route==='/'&&String(fh?.head||'').includes('FIELD INDEX'),'FIELD head missing');
assert((fh?.evidence||[]).includes('/returns/PRISON_AGE_FIELD_CONVERGENCE_2026-09-29.json'),'FIELD head lost Prison Age convergence evidence');
console.log('PRISON AGE → FIELD CONVERGENCE PASS',Object.fromEntries(Object.entries(expected).map(([id,x])=>[id,x[2]])),'· ONE ROUTE · READ/RIDE/SOURCE');
