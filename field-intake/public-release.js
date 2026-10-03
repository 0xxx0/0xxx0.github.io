(()=>{'use strict';
const SCHEMA='field/intake-public-release/v0.1';
const ALLOWED=['id','kind','title','contexts','tags','refs','observedAt','confidence','value','unit','duration','setup','earliest','latest','start','end','depends','status','anchor'];
function clone(v){return v==null?v:JSON.parse(JSON.stringify(v))}
function publicRecord(record){
  if(!record||typeof record!=='object')throw new Error('record required');
  const out={};
  for(const key of ALLOWED){
    if(record[key]!==undefined)out[key]=clone(record[key]);
  }
  if(!out.id||!out.kind||!out.title)throw new Error('record requires id, kind and title');
  return out;
}
function packet(record,meta={}){
  return {
    schema:SCHEMA,
    projected_at:meta.projectedAt||new Date().toISOString(),
    source:{surface:'/field-intake/',record_id:record.id},
    authority:'DRAFT_ONLY',
    effect:'NONE_UNTIL_OPERATOR_SUBMITS',
    record:publicRecord(record)
  };
}
function issueDraft(value,repo='0xxx0/0xxx0.github.io'){
  if(!value||value.schema!==SCHEMA)throw new Error('public-release packet required');
  const r=value.record||{};
  const compact=String(r.title||r.id||'record').replace(/\s+/g,' ').trim().slice(0,90);
  const title=`[FIELD] ${String(r.kind||'record').toUpperCase()} · ${compact}`;
  const body=[
    '## FIELD INTAKE public release candidate',
    '',
    'Drafted from the local FIELD INTAKE review gate. Opening this draft does not authorize or imply any action beyond this GitHub issue.',
    '',
    '```json',
    JSON.stringify(value,null,2),
    '```',
    '',
    '### Operator disposition',
    '- [ ] evidence/reference checked',
    '- [ ] public-safe text checked',
    '- [ ] intended next move stated in a comment or edit before acting'
  ].join('\n');
  return {title,body,url:`https://github.com/${repo}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`};
}
const api={SCHEMA,ALLOWED:[...ALLOWED],publicRecord,packet,issueDraft};
if(typeof globalThis!=='undefined')globalThis.FieldIntakePublicRelease=api;
})();
