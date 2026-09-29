#!/usr/bin/env node
import fs from 'node:fs';

const html=fs.readFileSync('index.html','utf8');
const audit=JSON.parse(fs.readFileSync('control/FIELD_COAXIALITY_AUDIT_2026-09-29.json','utf8'));
const contract=JSON.parse(fs.readFileSync('control/FIELD_INDEX_CONTRACT.json','utf8'));
const law=JSON.parse(fs.readFileSync('control/FIELD_COAXIALITY_LAW.json','utf8'));
const fail=[];
const need=(ok,msg)=>{if(!ok)fail.push(msg)};

const ids=new Set((law.invariants||[]).map(x=>x.id));
for(const id of ['A_STATE','B_RELATION','C_GESTURE','D_IDENTITY','E_REVERSAL','F_LIVE','G_RETURN','H_COMPRESSION']) need(ids.has(id),'law missing '+id);

const mechanisms=audit.mechanisms||[];
need(mechanisms.length>=10,'audit surface too small');
need(audit.summary?.DELETE===1,'audit must carry one executed deletion');
need(audit.executed_deletion==='map-pulse','executed deletion must be map-pulse');

for(const m of mechanisms){
  need(['KEEP','REPAIR','DELETE'].includes(m.decision),'invalid decision '+m.id);
  for(const k of ['A','B','C','D','E','F','G','H']) need(['PASS','FAIL','NA'].includes(m.tests?.[k]),m.id+' missing '+k);
  if(m.decision==='KEEP'){
    for(const k of ['A','B','C','D','E','G','H']) need(m.tests?.[k]==='PASS',m.id+' KEEP fails '+k);
    need(['PASS','NA'].includes(m.tests?.F),m.id+' KEEP invalid F');
  }
}
const pulse=mechanisms.find(x=>x.id==='map-pulse');
need(pulse?.decision==='DELETE','map-pulse not deleted');
need(pulse?.tests?.B==='FAIL','map-pulse must fail relation semantics');
need(pulse?.tests?.H==='FAIL','map-pulse must fail compression');

need(!html.includes('data-mode="PULSE"'),'PULSE map control survived');
need(!html.includes("mapMode==='PULSE'"),'PULSE map branch survived');
need(!html.includes('pulsePath'),'PULSE path CSS/runtime survived');
need(!html.includes('pulseDot'),'PULSE dot CSS/runtime survived');
need(/VISUAL\/STRUCTURE\/EVOLVE\/VERSIONS\/RECENT/.test(contract.ui_contract?.root_map||''),'contract active map set not contracted');
need(!('root_pulse' in (contract.ui_contract||{})),'obsolete root_pulse contract survived');
need(contract.coaxiality_audit==='/control/FIELD_COAXIALITY_AUDIT_2026-09-29.json','audit pointer missing');

if(fail.length){
  console.error('FIELD COAXIALITY AUDIT FAIL · '+fail.join(' · '));
  process.exit(1);
}
console.log('FIELD COAXIALITY AUDIT PASS · 11 KEEP · 1 DELETE · MAP/PULSE removed as redundant projection');
