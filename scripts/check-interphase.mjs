#!/usr/bin/env node
/**
 * check-interphase.mjs — executable conformance gate for the INTERPHASE registry.
 *
 * Critical law: a checkout may prove only itself. Evidence from another clone,
 * $HOME path, sibling worktree, or absolute filesystem path cannot make this
 * checkout green. Legacy absolute strings that merely serialize a path *inside
 * this repository* are normalized to the current checkout before resolution;
 * the external filesystem location itself is never consulted.
 *
 * Exit: 0 CLEAN · 1 VIOLATIONS · 2 usage · 3 INDETERMINATE.
 */
import {readFileSync,existsSync} from 'node:fs';
import {basename,join,resolve,sep} from 'node:path';

const argv=process.argv.slice(2),asJson=argv.includes('--json'),rootArg=argv.indexOf('--root');
if(rootArg>=0&&!argv[rootArg+1]){console.error('usage: check-interphase.mjs [--root <checkout>] [--json]');process.exit(2)}
const ROOT=resolve(rootArg>=0?argv[rootArg+1]:process.cwd());
const REPO_DIR=basename(ROOT);
const REGISTRY=join(ROOT,'control/INTERPHASE_CORRESPONDENCE_REGISTRY.json');
const MANIFEST=join(ROOT,'showcase-manifest.json');
const FACETS=['SOURCE','FRAME','FOCUS','OPERATE','WITNESS','RETURN'];
const CHANNELS=['identity','address','content','depth','time','authority','raster','evidence'];
const MERGE=['union','lww-with-single-writer','serialize-then-regenerate','none-requires-coordination','append-only-gset'];

function die(code,msg){
 const out={status:'INDETERMINATE',root:ROOT,resolution:'ROOT_ONLY',error:msg};
 if(asJson)console.log(JSON.stringify(out,null,1));else console.error(`INDETERMINATE — ${msg}`);
 process.exit(code);
}
function repoPath(raw){
 const s=String(raw??'').trim();if(!s)return null;
 // Published addresses (/foo/bar.js) resolve from this checkout. Older registry
 // records sometimes serialized the same repo-relative path behind an absolute
 // clone prefix (.../<repo-dir>/foo/bar.js). Strip only through the *last*
 // matching repo-directory segment, then resolve the suffix under ROOT. We do
 // not stat/read the serialized external path, so another clone cannot prove us.
 const marker=`/${REPO_DIR}/`;
 const at=s.lastIndexOf(marker);
 const rel=at>=0?s.slice(at+marker.length):(s.startsWith('/')?s.slice(1):s);
 const full=resolve(ROOT,rel),prefix=ROOT.endsWith(sep)?ROOT:ROOT+sep;
 if(full===ROOT||!full.startsWith(prefix))return null;
 return full;
}
const repoExists=raw=>{const p=repoPath(raw);return !!p&&existsSync(p)};
const hrefLike=p=>typeof p==='string'&&p.startsWith('/')&&p.endsWith('/');

if(!existsSync(REGISTRY))die(3,`registry not found at ${REGISTRY}`);
if(!existsSync(MANIFEST))die(3,`manifest not found at ${MANIFEST}`);
let reg,man;
try{reg=JSON.parse(readFileSync(REGISTRY,'utf8'))}catch(e){die(3,`registry unparseable: ${e.message}`)}
try{man=JSON.parse(readFileSync(MANIFEST,'utf8'))}catch(e){die(3,`manifest unparseable: ${e.message}`)}
if(!Array.isArray(reg?.mappings))die(3,'registry has no mappings array');

const violations=[],info=[];
const fail=(rule,host,detail)=>violations.push({rule,host,detail});
const note=(rule,host,detail)=>info.push({rule,host,detail});
const routes=new Set((man.routes||[]).map(r=>r.href));

// R1 registry shape.
if(!reg.schema)fail('R1','-','registry has no schema');
if(!reg.updated)fail('R1','-','registry has no updated');

// R2 unique host identity.
const seen=new Set();
for(const m of reg.mappings){const id=m.host_id||'(missing host_id)';if(seen.has(id))fail('R2',id,'duplicate host_id');seen.add(id)}

for(const m of reg.mappings){
 const id=m.host_id||'(missing host_id)',facets=m.facets||{},facetKeys=Object.keys(facets);

 // R3: facets exist. Six offices are a preset, not an ontology (law 11).
 if(!facetKeys.length)fail('R3',id,'no facets declared');
 const outside=facetKeys.filter(f=>!FACETS.includes(f));
 if(outside.length)note('I1',id,`facet(s) outside six-office preset: ${outside.join(', ')} — lawful; channels=${CHANNELS.join('/')}`);
 const missing=FACETS.filter(f=>!(f in facets));
 if(missing.length&&facetKeys.length)note('I2',id,`omits preset office(s): ${missing.join(', ')} — lawful if preserved as residue`);

 // R4: residue is the explicit non-crossing state.
 if(!Array.isArray(m.residue)||!m.residue.length)fail('R4',id,'no residue declared');

 // R5/R6/R7: this checkout alone must resolve evidence.
 const evidence=Array.isArray(m.evidence)?m.evidence:[];let anyExists=false;
 for(const e of evidence){
  if(typeof e!=='string')continue;
  if(hrefLike(e)){
   if(!routes.has(e))fail('R7',id,`route ${e} is not registered in showcase-manifest.json`);else anyExists=true;
   continue;
  }
  if(e.startsWith('/')){
   if(repoExists(e))anyExists=true;else fail('R5',id,`evidence path does not exist in this checkout: ${e}`);
  }
 }
 if(String(m.status||'').startsWith('IMPLEMENTED')&&!anyExists)fail('R6',id,`status ${m.status} but no evidence resolves in this checkout`);

 // R8: merge algebra must be one of the declared forms.
 if(!MERGE.includes(String(m.merge||'')))fail('R8',id,`merge ${JSON.stringify(m.merge??null)} is not one of: ${MERGE.join(' | ')}`);

 // R9: claimed commutation requires a test in this checkout. A legacy absolute
 // clone prefix may identify the in-repo suffix, but only the current checkout
 // is resolved; no external absolute path can satisfy the rule directly.
 const claimed=Array.isArray(m.commutes_claimed)?m.commutes_claimed:[];
 if(claimed.length){
  const t=typeof m.commutes_tested==='string'?m.commutes_tested:'';
  if(!t||!repoExists(t))fail('R9',id,`claims ${claimed.length} commuting operation(s) but commutes_tested does not resolve in this checkout: ${JSON.stringify(m.commutes_tested??null)}`);
 }

 // R10: state spaces name their writer and canonical copy.
 if(!String(m.owner||'').trim())fail('R10',id,'no owner declared');
 if(!String(m.canonical_copy||'').trim())fail('R10',id,'no canonical_copy declared');
}

const report={
 status:violations.length?'VIOLATIONS':'CLEAN',
 root:ROOT,
 resolution:'ROOT_ONLY',
 registry:reg.schema,
 registry_updated:reg.updated,
 hosts:reg.mappings.length,
 rules:['R1 registry shape','R2 unique host_id','R3 facets non-empty','R4 non-empty residue','R5 evidence resolves in current checkout','R6 IMPLEMENTED implies current-checkout evidence','R7 route evidence is registered','R8 merge algebra declared','R9 commutation test resolves in current checkout','R10 owner and canonical_copy declared'],
 notes:['I1 facets outside six-office preset (lawful — law 11)','I2 preset offices omitted'],
 violations,
 info
};
if(asJson)console.log(JSON.stringify(report,null,1));
else{
 console.log(`registry ${reg.schema} · updated ${reg.updated} · hosts ${reg.mappings.length} · resolution ROOT_ONLY`);
 console.log('');
 if(!violations.length)console.log('OK — this checkout alone resolves every required INTERPHASE evidence/test path.');
 else{for(const x of violations)console.log(`  ${x.rule}  ${String(x.host).padEnd(26)} ${x.detail}`);console.log(`\n${violations.length} violation(s).`)}
 if(info.length){console.log('');for(const x of info)console.log(`  ${x.rule} (info)  ${String(x.host).padEnd(22)} ${x.detail}`)}
}
process.exit(violations.length?1:0);