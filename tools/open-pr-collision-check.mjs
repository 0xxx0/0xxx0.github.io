#!/usr/bin/env node
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const HARD_DOMAINS=Object.freeze([
  {id:'attention-authority',paths:['control/CURRENT.json','control/QUEUE.json','control/WAITING.json']},
  {id:'policy-authority',paths:['AGENTS.md','control/POLICY_INDEX.json','control/HERMES_QUEUE.json']},
  {id:'public-registry-authority',paths:['showcase-manifest.json','return-index.json','manifest.json']},
  {id:'field-root-runtime',paths:['index.html','field-aperture.js','field-glyph.js','field-lens.js','field-presentation.js','field-signals.js','interphase-extension.js','interphase-extension.css','lib/interphase-carrier.js','lib/interphase-field.js']}
]);

const SOFT_DOMAINS=Object.freeze([
  {id:'dayline',paths:['dayline/**','atlas-dayline/**','lib/interphase-dayline.js']},
  {id:'comms',paths:['comms/**','port/comms/**']},
  {id:'readfield',paths:['docs/**','reader/**','lib/interphase-readfield.js','lib/readfield-**']},
  {id:'fold-bloom',paths:['fold-bloom/**']},
  {id:'sleeper',paths:['sleeper/**']},
  {id:'house',paths:['house/**']},
  {id:'poetry',paths:['poetry/**']},
  {id:'recovery',paths:['recovery/**','migration/**']},
  {id:'shared-library',paths:['lib/**']}
]);

function match(path,pattern){
  if(pattern.endsWith('/**')){const root=pattern.slice(0,-3);return path===root||path.startsWith(root+'/')}
  if(pattern.endsWith('-**'))return path.startsWith(pattern.slice(0,-2));
  return path===pattern;
}
function domains(files,spec){
  const out=new Map();
  for(const d of spec){const hits=files.filter(f=>d.paths.some(p=>match(f,p)));if(hits.length)out.set(d.id,hits)}
  return out;
}
function sharedDomains(a,b){
  const out=[];for(const [id,ours] of a)if(b.has(id))out.push({id,ours,theirs:b.get(id)});return out;
}
function classify(ours,theirs){
  const exact=ours.filter(f=>theirs.includes(f));
  const hard=sharedDomains(domains(ours,HARD_DOMAINS),domains(theirs,HARD_DOMAINS));
  const soft=sharedDomains(domains(ours,SOFT_DOMAINS),domains(theirs,SOFT_DOMAINS));
  return {exact,hard,soft};
}
function uniq(xs){return [...new Set(xs)]}
function git(...args){return execFileSync('git',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim()}
function parseRepo(remote){
  const m=String(remote||'').trim().match(/github\.com[/:]([^/]+)\/(.+)$/);
  if(!m)return null;
  return [m[1],m[2].replace(/\.git$/,'')];
}
function headers(){
  const h={Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'field-open-pr-collision'};
  if(process.env.GITHUB_TOKEN)h.Authorization=`Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}
async function api(url){
  const r=await fetch(url,{headers:headers()});
  if(!r.ok)throw new Error(`${r.status} ${r.statusText} for ${url}`);
  return r.json();
}
async function listOpen(apiBase,owner,repo){
  const out=[];
  for(let page=1;page<=10;page++){
    const batch=await api(`${apiBase}/repos/${owner}/${repo}/pulls?state=open&per_page=100&page=${page}`);out.push(...batch);if(batch.length<100)break;
  }
  return out;
}
async function listFiles(apiBase,owner,repo,n){
  const out=[];
  for(let page=1;page<=10;page++){
    const batch=await api(`${apiBase}/repos/${owner}/${repo}/pulls/${n}/files?per_page=100&page=${page}`);out.push(...batch.map(x=>x.filename));if(batch.length<100)break;
  }
  return out;
}
function annotate(kind,msg){
  if(process.env.GITHUB_ACTIONS==='true')console.log(`::${kind}::${msg.replace(/\r?\n/g,'%0A')}`);
  else console.error(`${kind.toUpperCase()}: ${msg}`);
}
function selftest(){
  let r=classify(['control/CURRENT.json'],['control/QUEUE.json']);
  if(!r.hard.some(x=>x.id==='attention-authority'))throw new Error('attention hard-domain control failed');
  r=classify(['showcase-manifest.json'],['showcase-manifest.json']);
  if(r.exact[0]!=='showcase-manifest.json'||!r.hard.some(x=>x.id==='public-registry-authority'))throw new Error('registry exact/hard control failed');
  r=classify(['fold-bloom/live/app.js'],['fold-bloom/listen/app.js']);
  if(r.exact.length||r.hard.length||!r.soft.some(x=>x.id==='fold-bloom'))throw new Error('soft-domain control failed');
  r=classify(['returns/A.json'],['returns/B.json']);
  if(r.exact.length||r.hard.length||r.soft.length)throw new Error('unique receipt control failed');
  r=classify(['AGENTS.md'],['control/POLICY_INDEX.json']);
  if(!r.hard.some(x=>x.id==='policy-authority'))throw new Error('policy-authority control failed');
  const https=parseRepo('https://github.com/0xxx0/0xxx0.github.io.git');
  const ssh=parseRepo('git@github.com:0xxx0/0xxx0.github.io.git');
  if(https?.[1]!=='0xxx0.github.io'||ssh?.[1]!=='0xxx0.github.io')throw new Error('dotted repo parse control failed');
  console.log('OPEN PR COLLISION SELFTEST PASS');
}

if(process.argv.includes('--selftest')){selftest();process.exit(0)}

const strict=process.env.GITHUB_ACTIONS==='true';
const apiBase=process.env.GITHUB_API_URL||'https://api.github.com';
let owner,repo,selfNumber=null,selfBranch='',selfFiles=[];

try{
  const eventPath=process.env.GITHUB_EVENT_PATH;
  if(eventPath&&fs.existsSync(eventPath)){
    const event=JSON.parse(fs.readFileSync(eventPath,'utf8'));
    const pr=event.pull_request;
    if(!pr){console.log('open-pr-collision: non-PR event; skip');process.exit(0)}
    [owner,repo]=String(process.env.GITHUB_REPOSITORY||event.repository?.full_name||'').split('/');
    selfNumber=pr.number;selfBranch=pr.head?.ref||'';selfFiles=await listFiles(apiBase,owner,repo,selfNumber);
  }else{
    const parsed=parseRepo(git('config','--get','remote.origin.url'));
    if(!parsed)throw new Error('cannot resolve GitHub owner/repo from origin');
    [owner,repo]=parsed;selfBranch=git('branch','--show-current');
    selfFiles=git('diff','--name-only','origin/master...HEAD').split(/\r?\n/).filter(Boolean);
    if(!selfFiles.length){console.log('open-pr-collision: no branch delta against origin/master');process.exit(0)}
  }

  const open=await listOpen(apiBase,owner,repo);
  const errors=[],warnings=[];
  for(const pr of open){
    if(pr.number===selfNumber||pr.head?.ref===selfBranch)continue;
    const other=await listFiles(apiBase,owner,repo,pr.number);
    const hit=classify(selfFiles,other);
    if(hit.exact.length)errors.push(`PR #${pr.number} exact-file overlap: ${hit.exact.join(', ')}`);
    for(const x of hit.hard)errors.push(`PR #${pr.number} hard-domain overlap '${x.id}': ours [${x.ours.join(', ')}] vs theirs [${x.theirs.join(', ')}]`);
    for(const x of hit.soft)warnings.push(`PR #${pr.number} shares soft domain '${x.id}': ours [${x.ours.join(', ')}] vs theirs [${x.theirs.join(', ')}]`);
  }

  console.log(`open-pr-collision: ${selfNumber?`PR #${selfNumber}`:`branch ${selfBranch||'(detached)'}`} · ${selfFiles.length} changed file(s) · ${open.length} open PR(s)`);
  for(const w of uniq(warnings))annotate('warning',w);
  for(const e of uniq(errors))annotate('error',e);
  if(errors.length){
    console.error('open-pr-collision: REFUSED — converge, sequence, rebase, or supersede the named owner before publishing another truth.');
    process.exit(1);
  }
  console.log(`open-pr-collision: PASS${warnings.length?' with soft-overlap warning(s)':''}`);
}catch(err){
  const msg=`open-pr-collision could not inspect live PR state: ${err.message}`;
  if(strict){annotate('error',msg);process.exit(1)}
  annotate('warning',msg+' — local push continues; PR CI must still prove collision state.');
  process.exit(0);
}
