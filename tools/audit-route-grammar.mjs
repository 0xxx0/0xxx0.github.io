import fs from 'node:fs';
const manifest=JSON.parse(fs.readFileSync(new URL('../showcase-manifest.json',import.meta.url),'utf8'));
const routes=manifest.routes||[];
const errors=[],warnings=[];
const hrefs=new Set(),titles=new Map();
for(const r of routes){
  if(hrefs.has(r.href))errors.push('duplicate href: '+r.href);hrefs.add(r.href);
  if(r.href!=='/'&&!r.operation)errors.push('missing operation: '+r.href);
  if(['EXPERIMENT','SEED'].includes(String(r.state||'').toUpperCase()))errors.push('deprecated state '+r.state+': '+r.href);
  if(r.kind==='alias'){
    if(!r.alias_of)errors.push('alias missing alias_of: '+r.href);
    if(r.state!=='UTILITY')errors.push('alias must be UTILITY: '+r.href);
    if(r.showcase_card!==false)warnings.push('alias should not be primary card: '+r.href);
  }
  const t=String(r.title||'').trim().toLowerCase();
  if(t){const xs=titles.get(t)||[];xs.push(r.href);titles.set(t,xs)}
}
for(const [t,xs] of titles)if(xs.length>1)warnings.push('duplicate title '+JSON.stringify(t)+': '+xs.join(', '));
const out={schema:'0xxx0/route-grammar-check/v0.1',routeCount:routes.length,errorCount:errors.length,warningCount:warnings.length,errors,warnings};
console.log(JSON.stringify(out,null,2));
if(errors.length)process.exit(1);
