const fs=require('fs');
const path=require('path');
const assert=(x,m)=>{if(!x)throw new Error(m)};
const readJson=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const route=readJson('prison-age/passage.json');
const pack=readJson('prison-age/sources.json');
const atlas=readJson('prison-age/evidence-atlas.json');

assert(route.schema==='prison-age.source-route/v0.1','route schema');
assert(route.authority==='CURATED_SOURCE_ROUTE / EVIDENCE_ONLY','route authority');
assert(route.order_authority==='EDITORIAL_NON_CANON','route order authority');
assert(Array.isArray(route.gates)&&route.gates.length===9,'exactly nine gates');
assert(JSON.stringify(route.gates.map(x=>x.gate))===JSON.stringify([1,2,3,4,5,6,7,8,9]),'gate ordinals');
assert(JSON.stringify(route.gates.map(x=>x.key))===JSON.stringify(['ORIGIN','WEATHER','FOLD','PROVENANCE','PRISON','MODEL','NEXT','TOOL','RETURN']),'gate roles');
assert(JSON.stringify(pack.operations)===JSON.stringify(['READ','RIDE','SOURCE','RETURN FIELD']),'Passage must not become a FIELD operation');

const resolved=[];
for(const node of route.gates){
  const story=pack.stories[node.source_id];
  assert(story,'unknown source '+node.source_id);
  assert(Array.isArray(node.fragments)&&node.fragments.length,'fragments '+node.gate);
  const disk='.'+story.path;
  assert(fs.existsSync(disk),'source file missing '+disk);
  const source=fs.readFileSync(disk,'utf8');
  let previous=-1;const spans=[];
  for(const fragment of node.fragments){
    const start=source.indexOf(fragment);
    assert(start>=0,'missing exact fragment gate '+node.gate+': '+fragment.slice(0,72));
    assert(source.indexOf(fragment,start+1)<0,'ambiguous fragment gate '+node.gate+': '+fragment.slice(0,72));
    assert(start>=previous,'fragment order gate '+node.gate);
    const end=start+fragment.length;spans.push({start,end,text:fragment});previous=end;
  }
  resolved.push({...node,story,source,start:spans[0].start,end:spans.at(-1).end,spans});
  const allowed=new Set(['gate','key','source_id','fragments','edge']);
  assert(Object.keys(node).every(k=>allowed.has(k)),'generated narrative field on gate '+node.gate);
}

for(let i=0;i<resolved.length-1;i++){
  const a=resolved[i],b=resolved[i+1],edge=a.edge;
  assert(edge,'edge missing after gate '+a.gate);
  if(edge.kind==='SOURCE_CONTINUITY'){
    assert(a.source_id===b.source_id,'source continuity source mismatch');
    assert(a.end<=b.start,'source continuity must move forward in exact source');
  }
  if(String(edge.kind).startsWith('ECHO_')){
    const card=atlas.cards.find(x=>Number(x.n)===Number(edge.atlas_card));
    assert(card,'atlas card '+edge.atlas_card+' missing');
    const cardPair=[card.a.source_id,card.b.source_id].sort().join('|');
    const routePair=[a.source_id,b.source_id].sort().join('|');
    assert(cardPair===routePair,'atlas source pair mismatch gate '+a.gate);
    if(edge.kind==='ECHO_EXACT_SELECTED'){
      const left=card.a.source_id===a.source_id?card.a:card.b;
      const right=card.a.source_id===b.source_id?card.a:card.b;
      assert(a.fragments.some(x=>x.includes(left.text)),'selected current fragment does not contain atlas evidence');
      assert(b.fragments.some(x=>x.includes(right.text)),'selected next fragment does not contain atlas evidence');
    }
  }
}

assert(!String(route.gates[0].edge?.kind||'').startsWith('ECHO_'),'2021 proto-root must remain outside ECHO atlas');
assert(route.gates.at(-1).edge===null,'RETURN must not invent successor edge');
assert(route.return?.authority==='EVIDENCE_ONLY','return authority');
assert(route.return?.field_return==='/?focus=%2Fprison-age%2F','exact FIELD return');
assert(route.return.residue.includes('curated order != canon'),'canon residue');
assert(route.return.residue.includes('traversal != comprehension'),'comprehension residue');

console.log('PRISON AGE NINE GATE PASSAGE PASS · 9 exact addressed movements · FIELD actions unchanged · ECHO edges bounded');
