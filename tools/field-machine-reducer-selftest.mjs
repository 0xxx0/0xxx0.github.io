import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const run=(args)=>spawnSync(process.execPath,['scripts/emit-agent-transcript.mjs',...args],{encoding:'utf8'});
const helpRun=run(['--help','--json']);
assert.equal(helpRun.status,0,helpRun.stderr);
const help=JSON.parse(helpRun.stdout);
assert.equal(help.schema,'field-machine-entrypoint-help/v0.1');
assert.equal(help.authority,'NONE');
assert.deepEqual(help.modes.map(x=>x.mode),['transcript','transcript-json','crystal','packet-reduce','contribution-converge','crew-handoff']);
assert.deepEqual(help.converge_attestations.merge_requires,['ci PASS','exact_head true','base_current true','mergeable true']);
assert.match(help.converge_attestations.base_current,/behind_by === 0/);
const llms=fs.readFileSync('llms.txt','utf8');
for(const cmd of help.modes.map(x=>x.command))assert.ok(llms.includes(cmd),'llms.txt missing machine mode: '+cmd);
assert.ok(llms.includes('node scripts/emit-agent-transcript.mjs --help --json'),'llms.txt missing machine-readable help');

const crystalRun=run(['--crystal','--json']);
assert.equal(crystalRun.status,0,crystalRun.stderr);
const crystal=JSON.parse(crystalRun.stdout);
assert.equal(crystal.schema,'field-crystal/v0.1');
assert.equal(crystal.authority,'NONE');
assert.ok(crystal.paths.length>=1,'CRYSTAL must expose current paths');
assert.ok(crystal.archive.addressed_route_count>=crystal.paths.length,'CRYSTAL archive scale must contain current heads');
assert.equal(crystal.packets.counts.NOW,0,'CRYSTAL packet shelf cannot self-authorize NOW');
assert.ok(crystal.return?.target,'CRYSTAL must retain RETURN');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'field-machine-reducer-'));
const write=(name,value)=>{const p=path.join(dir,name);fs.writeFileSync(p,JSON.stringify(value));return p};

write('a.json',{packet_id:'gate-a',WAITING:{exists:true,external:true,dependency_kind:'REAL_DEVICE'},NEXT:'continue'});
write('b.json',[
  {packet_id:'delta-b',DELTA:{material:true},EVIDENCE:{refs:['proof://b']}},
  {packet_id:'next-c',NEXT:{exists:true,executable:true,action:'continue'}},
  {packet_id:'empty-proof',DELTA:{material:true},EVIDENCE:{refs:[]}}
]);

const sweepRun=run(['--reduce',dir]);
assert.equal(sweepRun.status,0,sweepRun.stderr);
const sweep=JSON.parse(sweepRun.stdout);
assert.equal(sweep.schema,'field-egress-sweep/v0.1');
assert.equal(sweep.authority,'NONE');
assert.equal(sweep.packet_count,4);
assert.equal(sweep.counts.GATE,1);
assert.equal(sweep.counts.DELTA,1);
assert.equal(sweep.counts.NEXT,1);
assert.equal(sweep.counts.RESIDUE,1);
assert.equal(sweep.counts.NOW,0,'batch contents cannot self-authorize NOW');

const selectedRun=run(['--reduce',dir,'--selected-id','next-c']);
assert.equal(selectedRun.status,0,selectedRun.stderr);
const selected=JSON.parse(selectedRun.stdout);
assert.equal(selected.items.find(x=>x.packet_id==='next-c').class,'NOW');
assert.equal(selected.counts.NOW,1);
assert.equal(selected.items.find(x=>x.packet_id==='delta-b').class,'DELTA');

const blanket=run(['--reduce',dir,'--selected']);
assert.notEqual(blanket.status,0,'blanket selection over a batch must fail closed');

const actual=run(['--reduce','control/packets']);
assert.equal(actual.status,0,actual.stderr);
const live=JSON.parse(actual.stdout);
assert.ok(live.packet_count>=1,'real control/packets shelf must expose packets');
assert.equal(live.counts.NOW,0,'real packet shelf cannot self-authorize NOW');

const contributionCases=[
  ['dirty-delta',{id:'dirty',host:'/',changes_existing_head:true,ci:'FAIL',exact_head:true,base_current:true,mergeable:true},'DELTA','REPAIR'],
  ['map-donor',{id:'map',host:'/',donor_only:true,architectural_only:true,ci:'PASS',exact_head:true,base_current:true,mergeable:true},'DONOR','HOLD'],
  ['repair-merge',{id:'repair',host:'/comms/',changes_existing_head:true,ci:'PASS',exact_head:true,base_current:true,mergeable:true},'DELTA','MERGE'],
  ['superseded',{id:'echo',host:'/docs/',changes_existing_head:true,ci:'PASS',exact_head:true,base_current:true,mergeable:true,superseded:true},'DELTA','DROP'],
  ['frontier-donor',{id:'frontier',host:'skills/research-design-loop',architectural_only:true,transfer_applied:false,ci:'PASS',exact_head:true,base_current:true,mergeable:true},'DONOR','HOLD'],
  ['external-donor-blocked',{id:'blocked-donor',host:'/',external_donor:true,donor_gate:'PARK',changes_existing_head:true,ci:'PASS',exact_head:true,base_current:true,mergeable:true},'DONOR','HOLD'],
  ['external-donor-admitted',{id:'admitted-donor',host:'/',external_donor:true,donor_gate:'PASS',changes_existing_head:true,ci:'PASS',exact_head:true,base_current:true,mergeable:true},'DELTA','MERGE'],
  ['stale-head',{id:'stale-head',host:'/',changes_existing_head:true,ci:'PASS',exact_head:false,base_current:true,mergeable:true},'DELTA','REPAIR'],
  ['stale-base',{id:'stale-base',host:'/',changes_existing_head:true,ci:'PASS',exact_head:true,base_current:false,mergeable:true},'DELTA','REPAIR'],
  ['unresolved',{id:'orphan',ci:'PASS',exact_head:true,base_current:true,mergeable:true},'UNRESOLVED','HOLD']
];
for(const [name,packet,wantClass,wantDisposition] of contributionCases){
  const p=write(name+'.json',packet),r=run(['--converge',p]);
  assert.equal(r.status,0,r.stderr);
  const out=JSON.parse(r.stdout);
  assert.equal(out.class,wantClass,name+' class');
  assert.equal(out.disposition,wantDisposition,name+' disposition');
  assert.match(out.authority,/ADVISORY_ONLY/);
  assert.match(out.base_current_semantics,/behind_by === 0/);
}

const handoffBase={
  source_ref:'conversation:crew-test',
  intent:'Make one bounded existing-host change without reconstructing context',
  object_ref:'/docs/',
  contribution_class:'DELTA',
  evidence_class:'SPEC',
  delta_or_question:'Reduce one concrete reader friction',
  proof_available:'source request + current route',
  contributor_ref:'human:test',
  receiver_hint:'coding-worker:any',
  execution:{
    moves:[
      {id:'inspect',label:'READ CURRENT HOST',authority:'VIEW',target:'/docs/',reversibility:'NONE',commit_boundary:'NONE'},
      {id:'patch',label:'PATCH EXISTING HOST',authority:'EDIT',target:'/docs/',reversibility:'git revert TURN',commit_boundary:'HOST_NATIVE'}
    ],
    selected_move_id:'patch',
    return_to:'/?focus=%2Fdocs%2F',
    evidence_refs:['/control/CURRENT.json','/showcase-manifest.json']
  }
};
const handoffPath=write('crew-handoff.json',handoffBase);
const handoffRun=run(['--handoff',handoffPath,'--json']);
assert.equal(handoffRun.status,0,handoffRun.stderr);
const handoff=JSON.parse(handoffRun.stdout);
assert.equal(handoff.schema,'field-crew-handoff/v0.1');
assert.match(handoff.context_handle,/^crew:[0-9a-f]{16}$/);
assert.equal(handoff.authority,'NONE / TRANSIENT HANDOFF ONLY');
assert.equal(handoff.status.state,'TURN_READY');
assert.equal(handoff.hold.moves.length,2);
assert.equal(handoff.hold.selected_move_id,'patch');
assert.equal(handoff.return.next_authority,'NONE');
assert.equal(handoff.return.target,'/?focus=%2Fdocs%2F');
assert.match(handoff.crew.law,/never grant/);
const handoffAgain=JSON.parse(run(['--handoff',handoffPath,'--json']).stdout);
assert.equal(handoffAgain.context_handle,handoff.context_handle,'same submission must keep the same opaque crew handle');

const unresolvedPath=write('crew-unresolved.json',{...handoffBase,object_ref:'UNRESOLVED',execution:{moves:[]}});
const unresolvedRun=run(['--handoff',unresolvedPath,'--json']);
assert.equal(unresolvedRun.status,0,unresolvedRun.stderr);
const unresolved=JSON.parse(unresolvedRun.stdout);
assert.equal(unresolved.status.state,'SOURCE_REQUIRED');
assert.equal(unresolved.hold.focus,null);
assert.equal(unresolved.return.next_authority,'NONE');

const tooManyPath=write('crew-too-many.json',{...handoffBase,execution:{moves:[
  {id:'a',label:'A',authority:'VIEW',target:'/',reversibility:'NONE',commit_boundary:'NONE'},
  {id:'b',label:'B',authority:'VIEW',target:'/',reversibility:'NONE',commit_boundary:'NONE'},
  {id:'c',label:'C',authority:'VIEW',target:'/',reversibility:'NONE',commit_boundary:'NONE'},
  {id:'d',label:'D',authority:'VIEW',target:'/',reversibility:'NONE',commit_boundary:'NONE'}
]}});
const tooManyRun=run(['--handoff',tooManyPath,'--json']);
assert.notEqual(tooManyRun.status,0,'crew handoff must fail closed above three moves');
assert.match(tooManyRun.stderr,/TOO_MANY_MOVES/);

const selectedUnresolvedPath=write('crew-unresolved-selected.json',{...handoffBase,object_ref:'UNRESOLVED'});
const selectedUnresolvedRun=run(['--handoff',selectedUnresolvedPath,'--json']);
assert.notEqual(selectedUnresolvedRun.status,0,'unresolved object may not carry a selected TURN');
assert.match(selectedUnresolvedRun.stderr,/UNRESOLVED_CANNOT_SELECT_TURN/);

fs.rmSync(dir,{recursive:true,force:true});
console.log('FIELD machine reducer surface PASS · canonical help + crystal + packet sweep + contribution convergence + transient crew handoff + zero implicit authority');
