const fs=require('fs');
const path=require('path');
const assert=(x,m)=>{if(!x)throw new Error(m)};
const root=path.join(__dirname,'..');
const s=JSON.parse(fs.readFileSync(path.join(root,'control/INTERPHASE_SUCCESSOR.json'),'utf8'));
assert(s.schema==='0xxx0/interphase-successor/v0.1','successor schema');
assert(s.status==='ACTIVE_HANDOFF','successor status');
assert(s.current_model?.transform_distinctions?.correspond,'missing CORRESPOND');
assert(s.current_model?.transform_distinctions?.project,'missing PROJECT');
assert(s.current_model?.transform_distinctions?.operate,'missing OPERATE');
assert(Array.isArray(s.latest_updates)&&s.latest_updates.length>=3,'latest updates missing');
assert(Array.isArray(s.next_transformations)&&s.next_transformations.length>=3,'next transformations missing');
assert(Array.isArray(s.do_not_do)&&s.do_not_do.length>=5,'stop rules missing');
for(const p of s.entrypoints||[]){
  if(/^https?:/.test(p))continue;
  const file=path.join(root,String(p).replace(/^\//,''));
  assert(fs.existsSync(file),'missing successor entrypoint '+p);
}
for(const p of Object.values(s.current_implementation?.host_adapters||{})){
  const file=path.join(root,String(p).replace(/^\//,''));
  assert(fs.existsSync(file),'missing host adapter '+p);
}
assert(fs.existsSync(path.join(root,'control/confluence/INTERPHASE_SUCCESSOR_HANDOFF_2026-09-23.md')),'missing handoff');
assert(fs.existsSync(path.join(root,'control/confluence/INTERPHASE_SESSION_STARTERS_2026-09-23.md')),'missing session starters');
console.log('INTERPHASE SUCCESSOR SELFTEST PASS',s.latest_updates.map(x=>x.sha.slice(0,8)).join(','));
