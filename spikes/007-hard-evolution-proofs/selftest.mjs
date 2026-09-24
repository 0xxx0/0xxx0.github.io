import assert from 'node:assert/strict';

const VERSION='hard-evolution-proof/v0.1';

function stable(value){
  if(value===null||typeof value!=='object') return JSON.stringify(value);
  if(Array.isArray(value)) return '['+value.map(stable).join(',')+']';
  return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}';
}
function hash32(input=''){
  let h=2166136261>>>0;
  for(const c of String(input)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)>>>0}
  return (h>>>0).toString(16).padStart(8,'0');
}
const clone=x=>structuredClone(x);
const arr=x=>Array.isArray(x)?x:[];

function indexComposition(c){
  const parts=new Map(arr(c.parts).map(x=>[x.id,x]));
  const ports=new Map();
  for(const p of parts.values()) for(const q of arr(p.ports)) ports.set(q.id,{...q,part_id:p.id});
  for(const q of arr(c.ports)) ports.set(q.id,{...q,part_id:c.id});
  const relations=new Map(arr(c.relations).map(x=>[x.id,x]));
  const constraints=new Map(arr(c.constraints).map(x=>[x.id,x]));
  const operators=new Map(arr(c.operators).map(x=>[x.id,x]));
  return {parts,ports,relations,constraints,operators};
}

function structuralAddresses(c){
  const i=indexComposition(c);
  return {
    object:[c.id],
    parts:[...i.parts.keys()].sort(),
    ports:[...i.ports.keys()].sort(),
    relations:[...i.relations.keys()].sort(),
    constraints:[...i.constraints.keys()].sort(),
    operators:[...i.operators.keys()].sort()
  };
}

function validateComposition(c){
  const errors=[];
  if(!c?.id)errors.push('OBJECT_ID_REQUIRED');
  const i=indexComposition(c);
  const all=[c.id,...i.parts.keys(),...i.ports.keys(),...i.relations.keys(),...i.constraints.keys(),...i.operators.keys()];
  if(new Set(all).size!==all.length)errors.push('DUPLICATE_STRUCTURAL_ID');
  for(const p of i.parts.values()){
    if(p.parent!==c.id && !i.parts.has(p.parent)) errors.push('MISSING_PARENT:'+p.id+'->'+p.parent);
  }
  const addressable=new Set([c.id,...i.parts.keys(),...i.ports.keys()]);
  for(const r of i.relations.values()){
    if(!r.type)errors.push('RELATION_TYPE_REQUIRED:'+r.id);
    if(arr(r.members).length<2)errors.push('RELATION_ARITY_LT_2:'+r.id);
    for(const ref of arr(r.members)) if(!addressable.has(ref)) errors.push('RELATION_REF_MISSING:'+r.id+'->'+ref);
  }
  for(const x of i.constraints.values()) for(const ref of arr(x.targets)) if(!addressable.has(ref)) errors.push('CONSTRAINT_REF_MISSING:'+x.id+'->'+ref);
  for(const x of i.operators.values()) for(const ref of arr(x.targets)) if(!addressable.has(ref)&&!i.relations.has(ref)) errors.push('OPERATOR_REF_MISSING:'+x.id+'->'+ref);
  return {ok:errors.length===0,errors,index:i};
}

function focusContext(c,focusId){
  const {ok,errors,index:i}=validateComposition(c); if(!ok)throw new Error(errors.join(','));
  const focus=focusId===c.id?c:i.parts.get(focusId); if(!focus)throw new Error('FOCUS_NOT_FOUND:'+focusId);
  const path=[];let cur=focus;
  while(cur){path.unshift(cur.id);if(cur.id===c.id)break;cur=cur.parent===c.id?c:i.parts.get(cur.parent);if(!cur)throw new Error('BROKEN_CONTEXT_PATH:'+focusId)}
  const parentId=focus.id===c.id?null:focus.parent;
  const siblings=parentId==null?[]:arr(c.parts).filter(x=>x.parent===parentId).sort((a,b)=>(a.order??0)-(b.order??0)||a.id.localeCompare(b.id));
  const at=siblings.findIndex(x=>x.id===focus.id);
  const before=at<0?[]:siblings.slice(0,at).map(x=>x.id);
  const after=at<0?[]:siblings.slice(at+1).map(x=>x.id);
  return {
    schema:VERSION+'/focus-context',object_id:c.id,focus_id:focus.id,
    focus_address:focus.address||('obj://'+c.id+'/'+focus.id),
    context_path:path,before,after,
    return_address:c.return_address||('obj://'+c.id),
    source_ref:c.source_ref||null
  };
}

function projectionEnvelope(c,kind,payload,residue=[]){
  return {schema:VERSION+'/projection',kind,object_id:c.id,source_ref:c.source_ref||null,addresses:structuralAddresses(c),payload,residue:[...residue]};
}

function projectFormula(c){
  const i=indexComposition(c);
  const parts=[...i.parts.values()].sort((a,b)=>(a.order??0)-(b.order??0)||a.id.localeCompare(b.id));
  const rels=[...i.relations.values()].map(r=>r.id+':'+r.type+'('+arr(r.members).join(',')+')');
  const cons=[...i.constraints.values()].map(x=>x.id+':'+x.type+'('+arr(x.targets).join(',')+')');
  const ops=[...i.operators.values()].map(x=>x.id+':'+x.type+'['+(x.authority||'VIEW')+']('+arr(x.targets).join(',')+')');
  const formula=c.id+'{PARTS['+parts.map(p=>p.id).join(' ')+']|REL['+rels.join(';')+' ]|CON['+cons.join(';')+' ]|OP['+ops.join(';')+' ]|RETURN['+(c.return_address||'')+']}';
  return projectionEnvelope(c,'FORMULA',{formula},['part payload/content omitted','geometry omitted']);
}

function projectHypergraph(c){
  const i=indexComposition(c);
  const nodes=[{id:c.id,kind:'object'},...[...i.parts.values()].map(x=>({id:x.id,kind:x.kind||'part',parent:x.parent})),...[...i.ports.values()].map(x=>({id:x.id,kind:'port',part_id:x.part_id,port_type:x.type||null}))];
  const hyperedges=[...i.relations.values()].map(x=>({id:x.id,type:x.type,members:[...x.members]}));
  return projectionEnvelope(c,'HYPERGRAPH',{nodes,hyperedges},['part content omitted','constraint/operator detail reduced to address index']);
}

function projectFlower(c){
  const i=indexComposition(c),parts=[...i.parts.values()].sort((a,b)=>(a.order??0)-(b.order??0)||a.id.localeCompare(b.id));
  const sectors=parts.map((p,n)=>({slot:n,id:p.id,ports:arr(p.ports).map(x=>x.id)}));
  const rings={relations:[...i.relations.keys()],constraints:[...i.constraints.keys()],operators:[...i.operators.keys()]};
  return projectionEnvelope(c,'FLOWER',{center:c.id,sectors,rings},['relation topology not geometrically encoded','part content omitted']);
}

function verifyProjection(c,p){
  const a=stable(structuralAddresses(c)),b=stable(p.addresses);
  return {ok:p.object_id===c.id&&a===b&&Array.isArray(p.residue)&&p.residue.length>0,identity:p.object_id===c.id,addresses:a===b,residue_declared:Array.isArray(p.residue)&&p.residue.length>0};
}

function provenance(derived,because=[]){
  return {schema:VERSION+'/provenance',derived,because:because.map(x=>({source:x.source,op:x.op,version:x.version||null,evidence:x.evidence||null}))};
}

function applyRewrite(c,rule,{commit=false}={}){
  const v=validateComposition(c);if(!v.ok)return{ok:false,reason:'INVALID_SOURCE',errors:v.errors};
  if(rule.authority==='EFFECT')return{ok:false,reason:'MODEL_PROOF_CANNOT_EXECUTE_EFFECT'};
  if(rule.commit_required&&!commit)return{ok:false,reason:'EXPLICIT_COMMIT_REQUIRED'};
  for(const p of arr(rule.preconditions)){
    if(p.kind==='PART_FIELD_EQUALS'){
      const part=v.index.parts.get(p.id);if(!part||part[p.field]!==p.value)return{ok:false,reason:'PRECONDITION_FAILED:'+p.id+':'+p.field};
    }
    if(p.kind==='RELATION_TYPE_EQUALS'){
      const rel=v.index.relations.get(p.id);if(!rel||rel.type!==p.value)return{ok:false,reason:'PRECONDITION_FAILED:'+p.id+':type'};
    }
  }
  const before=clone(c),next=clone(c);
  const preserveView=(obj,id)=>{
    const idx=indexComposition(obj);
    if(id===obj.id)return{kind:'object',id:obj.id,type:obj.kind||obj.type||null,source_ref:obj.source_ref||null,return_address:obj.return_address||null};
    const part=idx.parts.get(id);if(part)return{kind:'part',value:part};
    const port=idx.ports.get(id);if(port)return{kind:'port',value:port};
    const relation=idx.relations.get(id);if(relation)return{kind:'relation',value:relation};
    const constraint=idx.constraints.get(id);if(constraint)return{kind:'constraint',value:constraint};
    const operator=idx.operators.get(id);if(operator)return{kind:'operator',value:operator};
    return null;
  };
  const preservedBefore=new Map();
  for(const id of arr(rule.preserve)){
    const x=preserveView(before,id);
    if(!x)return{ok:false,reason:'PRESERVE_REF_MISSING:'+id};
    preservedBefore.set(id,stable(x));
  }
  for(const ch of arr(rule.changes)){
    if(ch.kind==='PATCH_PART'){
      const p=next.parts.find(x=>x.id===ch.id);if(!p)return{ok:false,reason:'CHANGE_PART_MISSING:'+ch.id};Object.assign(p,clone(ch.patch));
    } else if(ch.kind==='PATCH_RELATION'){
      const r=next.relations.find(x=>x.id===ch.id);if(!r)return{ok:false,reason:'CHANGE_RELATION_MISSING:'+ch.id};Object.assign(r,clone(ch.patch));
    } else if(ch.kind==='PATCH_CONSTRAINT'){
      const q=next.constraints.find(x=>x.id===ch.id);if(!q)return{ok:false,reason:'CHANGE_CONSTRAINT_MISSING:'+ch.id};Object.assign(q,clone(ch.patch));
    } else if(ch.kind==='PATCH_OPERATOR'){
      const o=next.operators.find(x=>x.id===ch.id);if(!o)return{ok:false,reason:'CHANGE_OPERATOR_MISSING:'+ch.id};Object.assign(o,clone(ch.patch));
    } else if(ch.kind==='REMOVE_PART'){
      next.parts=next.parts.filter(x=>x.id!==ch.id);
      next.relations=next.relations.filter(r=>!arr(r.members).includes(ch.id)&&!arr(r.members).some(m=>String(m).startsWith(ch.id+':')));
    } else if(ch.kind==='ADD_PART') next.parts.push(clone(ch.part));
    else if(ch.kind==='ADD_RELATION') next.relations.push(clone(ch.relation));
    else return{ok:false,reason:'UNKNOWN_CHANGE:'+ch.kind};
  }
  const vv=validateComposition(next);if(!vv.ok)return{ok:false,reason:'INVALID_RESULT',errors:vv.errors};
  const preserved=[];
  for(const [id,s] of preservedBefore){
    const x=preserveView(next,id);
    if(!x||stable(x)!==s)return{ok:false,reason:'PRESERVED_INTERFACE_CHANGED:'+id};
    preserved.push(id);
  }
  const receipt={schema:VERSION+'/rewrite-receipt',rule_id:rule.id,object_id:c.id,authority:rule.authority||'EDIT',before_hash:hash32(stable(before)),after_hash:hash32(stable(next)),preserved,changed:arr(rule.changes).map(x=>x.id||x.part?.id||x.relation?.id),evidence:arr(rule.evidence),return_address:c.return_address||('obj://'+c.id)};
  return{ok:true,object:next,receipt};
}

const readfield={
 id:'readfield:proof',kind:'document',source_ref:'fixture://readfield/source',return_address:'readfield://return',
 parts:[
  {id:'sec:1',kind:'section',parent:'readfield:proof',order:0,address:'section://0'},
  {id:'para:1',kind:'paragraph',parent:'sec:1',order:0,address:'para://0'},
  {id:'sent:1',kind:'sentence',parent:'para:1',order:0,address:'sent://0'},
  {id:'word:0',kind:'word',parent:'sent:1',order:0,address:'word://0',text:'the'},
  {id:'word:1',kind:'word',parent:'sent:1',order:1,address:'word://1',text:'door'},
  {id:'word:2',kind:'word',parent:'sent:1',order:2,address:'word://2',text:'remembers'}
 ],ports:[],relations:[],constraints:[],operators:[]
};

const poem={
 id:'poem:proof',kind:'poem',source_ref:'fixture://poem/source',return_address:'poem://return',
 parts:[
  {id:'L1',kind:'line',parent:'poem:proof',order:0,ports:[{id:'L1:rhyme',type:'RHYME'},{id:'L1:end',type:'SEQUENCE'}]},
  {id:'L2',kind:'line',parent:'poem:proof',order:1,ports:[{id:'L2:rhyme',type:'RHYME'},{id:'L2:end',type:'SEQUENCE'}]},
  {id:'L3',kind:'line',parent:'poem:proof',order:2,ports:[{id:'L3:rhyme',type:'RHYME'},{id:'L3:turn',type:'TURN'},{id:'L3:end',type:'SEQUENCE'}]},
  {id:'L4',kind:'line',parent:'poem:proof',order:3,ports:[{id:'L4:rhyme',type:'RHYME'},{id:'L4:end',type:'SEQUENCE'}]},
  {id:'L3T1',kind:'token',parent:'L3',order:0,text:'the',locked:true},
  {id:'L3T2',kind:'token',parent:'L3',order:1,text:'rain'},
  {id:'L3T3',kind:'token',parent:'L3',order:2,text:'turns'}
 ],
 ports:[],
 relations:[
  {id:'order:lines',type:'ORDER',members:['L1','L2','L3','L4'],ordered:true},
  {id:'rhyme:A',type:'RHYME_GROUP',members:['L1:rhyme','L3:rhyme']},
  {id:'rhyme:B',type:'RHYME_GROUP',members:['L2:rhyme','L4:rhyme']}
 ],
 constraints:[
  {id:'constraint:turn',type:'TURN_AT',targets:['L3:turn']},
  {id:'constraint:lock',type:'LOCK',targets:['L3T1']}
 ],
 operators:[{id:'op:replace-token',type:'REPLACE_TOKEN',authority:'EDIT',targets:['L3T2']}]
};

const setFixture={
 id:'set:proof',kind:'experience-set',source_ref:'fixture://fold-bloom/set',return_address:'set://return',
 parts:[
  {id:'S1',kind:'source',parent:'set:proof',order:0,source_sha256:'sha256:a',ports:[{id:'S1:out',type:'OUT'}]},
  {id:'S2',kind:'source',parent:'set:proof',order:1,source_sha256:'sha256:b',ports:[{id:'S2:in',type:'IN'},{id:'S2:out',type:'OUT'}]},
  {id:'S3',kind:'source',parent:'set:proof',order:2,source_sha256:'sha256:c',ports:[{id:'S3:in',type:'IN'},{id:'S3:out',type:'OUT'}]}
 ],
 ports:[{id:'set:return',type:'RETURN'}],
 relations:[
  {id:'seam:1',type:'CARRY',members:['S1:out','S2:in']},
  {id:'seam:2',type:'DISSOLVE',members:['S2:out','S3:in']},
  {id:'seam:return',type:'RETURN',members:['S3:out','set:return']}
 ],
 constraints:[{id:'constraint:source-identity',type:'PRESERVE_SOURCE_HASH',targets:['S1','S2','S3']}],
 operators:[{id:'op:shape-seam',type:'SHAPE_SEAM',authority:'EDIT',targets:['seam:1','seam:2']}]
};

const physical={
 id:'make:proof',kind:'assembly-model',source_ref:'fixture://physical/synthetic',return_address:'make://return',
 parts:[
  {id:'wall',kind:'substrate',parent:'make:proof',order:0,ports:[{id:'wall:contact',type:'CONTACT'}]},
  {id:'rail',kind:'rail',parent:'make:proof',order:1,ports:[{id:'rail:wall',type:'CONTACT'},{id:'rail:mount',type:'MOUNT'}]},
  {id:'panel:A',kind:'panel',parent:'make:proof',order:2,ports:[{id:'panel:A:mount',type:'MOUNT'}]}
 ],
 ports:[],
 relations:[
  {id:'contact:rail-wall',type:'EC',members:['wall:contact','rail:wall']},
  {id:'mate:panel',type:'MATE_MODEL',members:['rail:mount','panel:A:mount']}
 ],
 constraints:[
  {id:'constraint:measured-fit',type:'PHYSICAL_FIT_UNKNOWN',targets:['rail:mount','panel:A:mount']}
 ],
 operators:[{id:'op:replace-panel',type:'REPLACE_DETACHABLE_PANEL_MODEL',authority:'EDIT',targets:['rail:mount','panel:A']}]
};

const rewrites={
 poem:{
  id:'rewrite:poem-token',authority:'EDIT',commit_required:true,
  preserve:['poem:proof','L1','L2','L3','L4','L3T1','L3T3','order:lines','rhyme:A','rhyme:B','constraint:turn','constraint:lock'],
  preconditions:[{kind:'PART_FIELD_EQUALS',id:'L3T2',field:'text',value:'rain'}],
  changes:[{kind:'PATCH_PART',id:'L3T2',patch:{text:'fire'}}],
  evidence:['fixture://human-choice/replace-rain-with-fire']
 },
 set:{
  id:'rewrite:set-seam',authority:'EDIT',commit_required:true,
  preserve:['set:proof','S1','S2','S3','S1:out','S2:in','S2:out','S3:in','S3:out','set:return','seam:1','seam:return','constraint:source-identity'],
  preconditions:[{kind:'RELATION_TYPE_EQUALS',id:'seam:2',value:'DISSOLVE'}],
  changes:[{kind:'PATCH_RELATION',id:'seam:2',patch:{type:'CARRY'}}],
  evidence:['fixture://authored-seam-choice']
 },
 physical:{
  id:'rewrite:replace-panel-model',authority:'EDIT',commit_required:true,
  preserve:['make:proof','wall','rail','wall:contact','rail:wall','rail:mount','contact:rail-wall'],
  preconditions:[],
  changes:[
   {kind:'REMOVE_PART',id:'panel:A'},
   {kind:'ADD_PART',part:{id:'panel:B',kind:'panel',parent:'make:proof',order:2,ports:[{id:'panel:B:mount',type:'MOUNT'}]}},
   {kind:'ADD_RELATION',relation:{id:'mate:panel:B',type:'MATE_MODEL',members:['rail:mount','panel:B:mount']}},
   {kind:'PATCH_CONSTRAINT',id:'constraint:measured-fit',patch:{targets:['rail:mount','panel:B:mount']}},
   {kind:'PATCH_OPERATOR',id:'op:replace-panel',patch:{targets:['rail:mount','panel:B']}}
  ],
  evidence:['fixture://model-only/no-physical-fit-claim']
 }
};

const fixtures=[readfield,poem,setFixture,physical];
for(const f of fixtures){const v=validateComposition(f);assert.equal(v.ok,true,f.id+': '+v.errors.join(','))}

const rf=focusContext(readfield,'word:1');
assert.deepEqual(rf.context_path,['readfield:proof','sec:1','para:1','sent:1','word:1']);
assert.deepEqual(rf.before,['word:0']);
assert.deepEqual(rf.after,['word:2']);
assert.equal(rf.focus_address,'word://1');
assert.equal(rf.return_address,'readfield://return');

const pf=focusContext(poem,'L3T2');
assert.deepEqual(pf.context_path,['poem:proof','L3','L3T2']);
assert.deepEqual(pf.before,['L3T1']);
assert.deepEqual(pf.after,['L3T3']);
assert.equal(pf.return_address,'poem://return');

const projectionReport={};
for(const f of [poem,setFixture,physical]){
  projectionReport[f.id]={};
  for(const p of [projectFormula(f),projectHypergraph(f),projectFlower(f)]){
    const chk=verifyProjection(f,p);assert.equal(chk.ok,true,f.id+'/'+p.kind);projectionReport[f.id][p.kind]=chk;
  }
}
assert.equal(projectHypergraph(poem).payload.hyperedges.find(x=>x.id==='order:lines').members.length,4,'n-ary ORDER lost');
assert.equal(projectFlower(setFixture).payload.sectors.length,3,'set sectors lost');
assert.equal(projectFormula(physical).payload.formula.includes('mate:panel'),true,'physical relation omitted from formula');

const noCommit=applyRewrite(poem,rewrites.poem);assert.equal(noCommit.ok,false);assert.equal(noCommit.reason,'EXPLICIT_COMMIT_REQUIRED');
const pr=applyRewrite(poem,rewrites.poem,{commit:true});assert.equal(pr.ok,true);assert.equal(pr.object.parts.find(x=>x.id==='L3T2').text,'fire');assert.equal(pr.object.parts.find(x=>x.id==='L3T1').locked,true);
const sr=applyRewrite(setFixture,rewrites.set,{commit:true});assert.equal(sr.ok,true);assert.equal(sr.object.relations.find(x=>x.id==='seam:2').type,'CARRY');
for(const id of ['S1','S2','S3']) assert.equal(sr.object.parts.find(x=>x.id===id).source_sha256,setFixture.parts.find(x=>x.id===id).source_sha256,'source identity drift '+id);
const mr=applyRewrite(physical,rewrites.physical,{commit:true});assert.equal(mr.ok,true);assert.equal(mr.object.parts.some(x=>x.id==='panel:A'),false);assert.equal(mr.object.parts.some(x=>x.id==='panel:B'),true);assert.equal(mr.object.parts.find(x=>x.id==='rail').id,'rail');
assert.equal(mr.object.constraints[0].type,'PHYSICAL_FIT_UNKNOWN','model rewrite laundered physical fit');

const prov=provenance('candidate:fire',[{source:'L3T2',op:'HUMAN_ADOPT',version:'fixture-v1',evidence:'fixture://human-choice/replace-rain-with-fire'}]);
assert.equal(prov.because[0].source,'L3T2');

console.log(JSON.stringify({
 pass:true,
 proof:'P1+P2+P3',
 p1:{readfield:rf,poem:pf},
 p2:projectionReport,
 p3:{poem:pr.receipt,set:sr.receipt,physical:mr.receipt},
 invariants:{
  fixture_count:fixtures.length,
  projection_count:9,
  poem_addresses:structuralAddresses(poem),
  source_identity_preserved:stable(setFixture.parts.map(x=>x.source_sha256))===stable(sr.object.parts.map(x=>x.source_sha256)),
  physical_fit_still_unknown:mr.object.constraints[0].type==='PHYSICAL_FIT_UNKNOWN'
 }
},null,2));
