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
assert(release.status==='FIELD_SOURCE_SET / AUTHORED_SOURCE_PATH / SOURCE_ECHO_EVIDENCE','release source-set + authored path + echo depth');
assert(release.operation==='READ / RIDE / SOURCE · passive ECHO in READ/RIDE','release operations');
assert(release.echo?.schema==='field-source-echo-index/v0.1'&&release.echo?.authority==='EVIDENCE_ONLY','echo release boundary');
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
const proto=sources.stories['proto-root-2021'];
assert(proto?.source_class==='RECOVERED_AUTHORED_SOURCE / DERIVED_ARRANGEMENT','2021 proto-root source class');
assert(proto?.path==='/fold-bloom/live/authored/prison-age-2021.txt','2021 proto-root exact source path');
assert(proto?.source_fingerprint?.algo==='sha256'&&proto.source_fingerprint?.value==='9b9be4ac4e24cb980d9f65bc948d6b3aaa9c514a84ee44a96142d526b2d25a6e','2021 proto-root exact source hash');
assert(proto?.authored_reader?.id==='prison-age-2021'&&proto.echo===false,'2021 authored RIDE / RECURRENCE != ECHO');
assert(active.includes('story.authored_reader?.id'),'resolver authored RIDE seam');

const prisonRoutes=manifest.routes.filter(r=>r.family==='PRISON AGE'||r.href==='/prison-age/'||String(r.href||'').startsWith('/prison-age/'));
assert(prisonRoutes.length===1,'exactly one Prison Age manifest route');
const route=prisonRoutes[0];
assert(route.href==='/prison-age/'&&route.tier==='FIELD'&&route.state==='ACTIVE','single active FIELD route');
assert(route.operation==='READ / RIDE / SOURCE','FIELD route operation');
assert(route.version==='0.6','FIELD route version');
assert((route.contract?.emits?.kinds||[]).includes('field-source-echo-index/v0.1 exact-fragment evidence'),'FIELD route echo evidence');
assert(route.field.exit_paths.length===3,'exactly three native exits');
assert(fs.existsSync('prison-age/echo-index.json')&&fs.existsSync('lib/source-echo.js'),'source echo evidence assets');
assert(route.field.exit_paths.map(x=>x.via).join('|')==='READ|RIDE|SOURCE','native exit labels');
const fieldContract=JSON.parse(fs.readFileSync('control/FIELD_INDEX_CONTRACT.json','utf8'));
const activityModes=new Set(Object.keys(fieldContract.activity_modes||{}));
assert((route.index.work_modes||[]).every(x=>activityModes.has(x)),'FIELD route work_modes must be activity modes');
assert(!(route.index.work_modes||[]).some(x=>['READ','RIDE','SOURCE','RETURN'].includes(x)),'native actions must stay operation/exit paths, never route work_modes');
assert((route.contract?.accepts?.kinds||[]).some(x=>/recovered authored Prison Age proto-root/i.test(x)),'manifest contract missing recovered authored source class');
assert((route.contract?.emits?.kinds||[]).some(x=>/authored-reader recurrence projection/i.test(x)),'manifest contract missing authored-reader projection');

assert(field.includes('function nativeRouteOwner(r)')&&field.includes("r?.field?.owner||''"),'FIELD owner must derive from explicit host manifest owner');
assert(field.includes('function nativeRouteActions(r)')&&field.includes('manifestExitPaths(r)'),'FIELD native actions must derive from manifest exits');
assert(route.field.owner==='PRISON AGE','manifest owns Prison Age authority label');
assert(route.field.exit_paths.map(x=>x.target).join('|')==='/prison-age/?intent=read&return=field|/prison-age/?intent=ride&return=field|/prison-age/?return=field','manifest owns exact READ/RIDE/SOURCE targets');
assert(!field.includes("owner:'PRISON AGE'"),'FIELD must not duplicate Prison Age capability owner');
assert(!field.includes("moves:['READ','RIDE','SOURCE']"),'FIELD must not duplicate Prison Age native move list');
assert(!field.includes("story=open-air&action=read"),'FIELD READ must not hide a default story');
assert(!field.includes("story=open-air&action=ride"),'FIELD RIDE must not hide a default story');
const last=fs.readFileSync('prison-age/stories/07-last-stall-extract.md','utf8');
assert(fnv(last)==='1856b483'&&last.length===4991,'Last Stall extract fingerprint');
assert(sources.stories['last-stall'].source_fingerprint?.value==='1856b483','Last Stall ledger fingerprint');
const fh=current.current_heads.find(h=>h.lineage==='field-index');
assert(fh?.route==='/'&&String(fh?.head||'').includes('FIELD INDEX'),'FIELD head missing');
assert(String(fh?.retained_function||'').includes('Explicit source-intent semantics remain generic'),'FIELD head lost generic source-intent boundary');
assert(!String(fh?.retained_function||'').includes('Prison Age source-intent semantics'),'FIELD head must not promote Prison Age into root law');
assert(!(fh?.evidence||[]).some(x=>/PRISON_AGE/.test(String(x))),'FIELD current-head evidence must not depend on Prison Age donor receipts');
assert(fh?.latest_return!=='/returns/PRISON_AGE_SOURCE_ECHO_2026-09-29.json','source ECHO must not own FIELD head RETURN');
assert(!(fh?.evidence||[]).includes('/returns/PRISON_AGE_SOURCE_ECHO_2026-09-29.json'),'projection-depth ECHO must not claim FIELD-head evidence');
console.log('PRISON AGE SOURCE CONTRACT + GENERIC FIELD INTENT + ECHO PASS',Object.fromEntries(Object.entries(expected).map(([id,x])=>[id,x[2]])),'· ONE ROUTE · READ/RIDE/SOURCE');
