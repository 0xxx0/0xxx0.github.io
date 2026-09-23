const fs=require('fs');
const path=require('path');
const M=require('../lib/interphase-mapping.js');
const R=require('../lib/interphase-recovery.js');
const assert=(x,m)=>{if(!x)throw new Error(m)};

const contract=JSON.parse(fs.readFileSync(path.join(__dirname,'../control/INTERPHASE_MAPPING_CONTRACT.json'),'utf8'));
const schema=JSON.parse(fs.readFileSync(path.join(__dirname,'../control/schemas/interphase-recovery-packet.schema.json'),'utf8'));\nconst registry=JSON.parse(fs.readFileSync(path.join(__dirname,'../control/INTERPHASE_CORRESPONDENCE_REGISTRY.json'),'utf8'));
assert(contract.schema==='0xxx0/interphase-mapping-contract/v0.1','mapping contract schema');
assert(contract.laws.some(x=>/Identity is not a coordinate/.test(x)),'identity law');
assert(schema.properties?.artifacts&&schema.properties?.claims,'recovery schema object classes');\nassert(registry.schema==='0xxx0/interphase-correspondence-registry/v0.1','correspondence registry schema');\nconst hostIds=registry.mappings.map(x=>x.host_id);assert(new Set(hostIds).size===hostIds.length,'duplicate host mapping');\nassert(hostIds.includes('READFIELD')&&hostIds.includes('ROOM_STRUCTURAL_DOM')&&hostIds.includes('RECOVERY_PACKET')&&hostIds.includes('PHYSICAL_MAKE'),'registry missing key hosts');\nassert(registry.mappings.every(x=>x.canonical_truth&&x.facets?.SOURCE&&x.facets?.FOCUS&&x.facets?.RETURN&&Array.isArray(x.residue)),'registry mapping incomplete');

const formMapping={
  id:'form-correspondence-demo',
  host:'FORM',
  facets:[
    {facet_id:'SOURCE_SCHEMA',office:'SOURCE',selector:{id:'form.schema'},channels:['identity','address','content','evidence']},
    {facet_id:'FRAME_HELP',office:'FRAME',selector:{kind:'help'},channels:['identity','address','content']},
    {facet_id:'FOCUS_INPUT',office:'FOCUS',selector:{kind:'input'},channels:['identity','address','content','authority'],operations:[{id:'EDIT',authority:'EDIT'}],authority:'EDIT'},
    {facet_id:'OPERATE_ACTION',office:'OPERATE',selector:{kind:'action'},channels:['identity','address','authority'],operations:[{id:'ACT',authority:'EFFECT'}],authority:'EFFECT'},
    {facet_id:'WITNESS_VALIDATION',office:'WITNESS',selector:{kind:'validation'},channels:['identity','address','content','evidence']},
    {facet_id:'RETURN_CONTEXT',office:'RETURN',selector:{kind:'return'},channels:['identity','address','evidence']}
  ],
  placements:{
    LINE:{compact:{FOCUS_INPUT:{region:'cell:email',order:2,lod:'EDIT'}}},
    TABLE:{working:{FOCUS_INPUT:{region:'row:email/value',order:2,lod:'EDIT'}}},
    FLOWER_KEY:{expanded:{FOCUS_INPUT:{region:'sector:focus',orientation:'inward',lod:'EDIT'}}},
    ROOM:{room:{FOCUS_INPUT:{region:'left-wall',orientation:'toward-center',lod:'EDIT'}}},
    PHYSICAL:{physical:{FOCUS_INPUT:{region:'panel:left',lod:'CONTROL',binding_required:true}}}
  }
};
const input={id:'form.email',kind:'input',channels:['identity','address','content','authority'],capabilities:['read','edit'],authority:'EDIT',address:{path:'form://signup/email'}};
const views=[
  M.mapNode(formMapping,input,{projection:'LINE',scale:'compact'}),
  M.mapNode(formMapping,input,{projection:'TABLE',scale:'working'}),
  M.mapNode(formMapping,input,{projection:'FLOWER_KEY',scale:'expanded'}),
  M.mapNode(formMapping,input,{projection:'ROOM',scale:'room'}),
  M.mapNode(formMapping,input,{projection:'PHYSICAL',scale:'physical'})
];
assert(views.every(x=>x.ok&&x.node_id==='form.email'&&x.facet_id==='FOCUS_INPUT'),'identity/facet changed across scale');
assert(views[0].placement.region==='cell:email','line placement');
assert(views[3].placement.region==='left-wall','room left wall placement');
assert(views[4].placement.binding_required===true,'physical binding boundary');

const purity=M.checkProjectionPurity(input,x=>({id:x.id,region:'left-wall'}));
assert(purity.pass,'projection mutated canonical input');

const lens=M.checkLens({
  source:{value:'a@example.com',other:7},
  get:s=>({value:s.value}),
  put:(s,v)=>({...s,value:v.value}),
  edit:v=>({...v,value:'b@example.com'})
});
assert(lens.get_put&&lens.put_get,'lens round trip');

const square=M.checkCommutation({
  source:{n:1},
  canonicalOp:s=>({...s,n:s.n+1}),
  project:s=>({shown:s.n}),
  viewOp:v=>({...v,shown:v.shown+1})
});
assert(square.pass,'operation square does not commute');

const packet={
  schema:'0xxx0/interphase-recovery-packet/v0.1',
  packet_id:'recovery:test:2026-09-23',
  subject:'bounded archaeology test',
  scope:'fixture',
  as_of:'2026-09-23',
  anchors:['EXACT-NAME'],
  artifacts:[
    {
      artifact_id:'artifact:a',
      kind:'html',
      names:['A'],
      source_refs:['backup/A.html'],
      sha256:'sha256:abc',
      bytes_status:'EXACT',
      provenance_class:'SOURCE',
      addresses:[{path:'backup/A.html'}],
      parent:null,
      relations:[{type:'POSSIBLE_PREDECESSOR',to:'artifact:b'}],
      channels:['identity','address','content','evidence'],
      operations:[],
      authority:'VIEW',
      observed_projections:['PAGE'],
      mechanisms:['stable address'],
      unique_residue:['exact original styling'],
      disposition_candidate:'DONOR',
      mapping_candidate:null
    },
    {
      artifact_id:'artifact:b',
      kind:'spec',
      names:['A later reconstruction'],
      source_refs:['notes/B.md'],
      sha256:null,
      bytes_status:'EXACT',
      provenance_class:'SOURCE',
      addresses:[{path:'notes/B.md'}],
      parent:null,
      relations:[],
      channels:['identity','address','content','evidence'],
      operations:[],
      authority:'VIEW',
      observed_projections:['READFIELD'],
      mechanisms:['declared intent'],
      unique_residue:[],
      disposition_candidate:'MERGE_CANDIDATE',
      mapping_candidate:null
    }
  ],
  claims:[
    {claim_id:'claim:1',subject_ref:'artifact:a',field:'date',value:'2020',provenance_class:'SOURCE',source_ref:'backup/A.html',time:'2020',confidence:'HIGH',supersedes:[],conflicts_with:['claim:2']},
    {claim_id:'claim:2',subject_ref:'artifact:a',field:'date',value:'2021',provenance_class:'CONFLICT',source_ref:'notes/B.md',time:null,confidence:'LOW',supersedes:[],conflicts_with:['claim:1']}
  ],
  conflicts:[{claims:['claim:1','claim:2'],field:'date'}],
  superseded:[],
  unknowns:[{field:'original_runtime_receipt',status:'UNKNOWN'}],
  anti_merge_holds:[{a:'artifact:a',b:'artifact:b',reason:'name similarity without stable join key'}],
  next_information_gain:[{query:'find exact runtime receipt'}],
  return_paths:['backup/A.html','notes/B.md'],
  worker_receipt:{searched:['fixture'],not_searched:[],stop_reason:'fixture complete',exact_bytes_copied:2,exact_refs_only:0}
};
const adapter=R.create(packet);
assert(adapter.root()==='recovery:'+packet.packet_id,'recovery root id');
assert(adapter.describe('artifact:a').address.source_refs[0]==='backup/A.html','artifact return path');
assert(adapter.describe('claim:1').address.source_ref==='backup/A.html','claim provenance');
assert(adapter.describe('conflict:0').kind==='conflict','conflict flattened');
assert(adapter.describe('unknown:0').kind==='unknown','unknown flattened');
assert(adapter.describe('hold:0').kind==='anti-merge-hold','anti-merge flattened');

console.log(JSON.stringify({
  pass:true,
  mapping:M.VERSION,
  recovery:R.VERSION,
  input_identity:views.map(x=>({projection:x.placement.region,node:x.node_id,facet:x.facet_id})),
  lens:{get_put:lens.get_put,put_get:lens.put_get},
  operation_commutes:square.pass,
  recovery_refs:adapter.refs().length,\n  correspondence_hosts:hostIds.length
},null,2));
