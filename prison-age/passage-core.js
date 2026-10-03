(function(root,factory){
'use strict';
const api=factory();
if(typeof module==='object'&&module.exports)module.exports=api;
if(root)root.PrisonAgePassageCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';

const SCHEMA='prison-age.passage-route/v0.1';
const AUTHORITY='EVIDENCE_ONLY';
const MAX_TRAIL=12;
const text=x=>x==null?'':String(x);
const arr=x=>Array.isArray(x)?x:[];
const clone=x=>x==null?x:JSON.parse(JSON.stringify(x));

function nodeKey(card,side){
  const n=Number(card),s=text(side).toLowerCase();
  if(!Number.isInteger(n)||n<1||!['a','b'].includes(s))throw Error('PASSAGE_NODE');
  return String(n)+s;
}
function parseNode(raw){
  const m=/^(\d+)([ab])$/i.exec(text(raw).trim());
  if(!m)return null;
  return{card:Number(m[1]),side:m[2].toLowerCase(),key:String(Number(m[1]))+m[2].toLowerCase()};
}
function cardOf(atlas,n){return arr(atlas?.cards).find(c=>Number(c?.n)===Number(n))||null}
function endpoint(card,side){return side==='b'?card?.b:card?.a}
function otherSide(side){return side==='a'?'b':'a'}
function nodeOf(atlas,key){
  const p=parseNode(key);if(!p)return null;const card=cardOf(atlas,p.card);if(!card)return null;
  const x=endpoint(card,p.side);if(!x)return null;
  return{key:p.key,card:p.card,side:p.side,class:text(card.class),score:Number(card.score)||0,pair:text(card.pair),shared:arr(card.shared).map(text),phrases:arr(card.phrases).map(text),endpoint:clone(x)};
}
function isBoilerplate(node){return /^MARGIN\s*\/\//i.test(text(node?.endpoint?.text).trim())}
function sourceNodes(atlas,sourceId){
  const out=[];
  for(const c of arr(atlas?.cards)){
    if(c?.a?.source_id===sourceId)out.push(nodeOf(atlas,nodeKey(c.n,'a')));
    if(c?.b?.source_id===sourceId)out.push(nodeOf(atlas,nodeKey(c.n,'b')));
  }
  return out.filter(Boolean);
}
function rankNodes(xs=[]){
  const classRank={PHRASE:0,DENSE:1,TERM:2};
  return [...xs].sort((a,b)=>
    Number(isBoilerplate(a))-Number(isBoilerplate(b))
    ||(classRank[a.class]??9)-(classRank[b.class]??9)
    ||b.score-a.score
    ||a.card-b.card
    ||a.side.localeCompare(b.side)
  );
}
function entryNodes(atlas){
  const ids=[];
  for(const c of arr(atlas?.cards))for(const x of [c?.a,c?.b])if(x?.source_id&&!ids.includes(x.source_id))ids.push(x.source_id);
  return ids.map(id=>rankNodes(sourceNodes(atlas,id))[0]).filter(Boolean);
}
function transition(atlas,fromKey,toKey){
  const a=nodeOf(atlas,fromKey),b=nodeOf(atlas,toKey);if(!a||!b)return null;
  if(a.card===b.card&&a.side!==b.side)return{kind:'CROSS_ECHO',from:a.key,to:b.key,evidence:{card:a.card,class:a.class,shared:a.shared,phrases:a.phrases}};
  if(a.endpoint.source_id===b.endpoint.source_id&&a.key!==b.key)return{kind:'TURN_SOURCE',from:a.key,to:b.key,evidence:{source_id:a.endpoint.source_id}};
  return null;
}
function decodeTrail(raw){
  const xs=text(raw).split(/[.,]/).map(x=>x.trim()).filter(Boolean).map(parseNode).filter(Boolean).map(x=>x.key);
  return xs.slice(-MAX_TRAIL);
}
function encodeTrail(xs=[]){return arr(xs).map(x=>parseNode(x)?.key).filter(Boolean).slice(-MAX_TRAIL).join('.')}
function validateTrail(atlas,trail=[]){
  const xs=arr(trail).map(x=>parseNode(x)?.key).filter(Boolean),errors=[];
  if(xs.length>MAX_TRAIL)errors.push('TRAIL_TOO_LONG');
  for(const k of xs)if(!nodeOf(atlas,k))errors.push('UNKNOWN_NODE:'+k);
  for(let i=1;i<xs.length;i++)if(!transition(atlas,xs[i-1],xs[i]))errors.push('ILLEGAL_TRANSITION:'+xs[i-1]+'>'+xs[i]);
  return{ok:errors.length===0,errors,trail:xs};
}
function choices(atlas,currentKey,trail=[]){
  const current=nodeOf(atlas,currentKey);if(!current)return{cross:null,turns:[]};
  const seen=new Set(arr(trail));
  const cross=nodeOf(atlas,nodeKey(current.card,otherSide(current.side)));
  const turns=rankNodes(sourceNodes(atlas,current.endpoint.source_id).filter(x=>x.key!==current.key&&!seen.has(x.key)&&x.endpoint.address!==current.endpoint.address)).slice(0,3);
  return{cross,turns};
}
function routePacket(atlas,trail=[]){
  const v=validateTrail(atlas,trail);if(!v.ok)throw Error(v.errors.join(' / '));
  const nodes=v.trail.map(k=>nodeOf(atlas,k));
  const transitions=[];for(let i=1;i<nodes.length;i++)transitions.push(transition(atlas,nodes[i-1].key,nodes[i].key));
  return{
    schema:SCHEMA,
    authority:AUTHORITY,
    source_set:'PRISON_AGE',
    created_at:new Date().toISOString(),
    nodes:nodes.map(n=>({key:n.key,card:n.card,side:n.side,source_id:n.endpoint.source_id,title:n.endpoint.title,path:n.endpoint.path,start:n.endpoint.start,end:n.endpoint.end,address:n.endpoint.address,text:n.endpoint.text})),
    transitions,
    law:text(atlas?.law),
    boundary:'The route is reader-selected traversal across exact source spans and source-derived lexical evidence. Sequence is not claimed as canon order, theme, intent, causality, equivalence or comprehension.'
  };
}
function append(atlas,trail=[],nextKey){
  const xs=arr(trail).map(x=>parseNode(x)?.key).filter(Boolean),n=parseNode(nextKey)?.key;if(!n||!nodeOf(atlas,n))throw Error('PASSAGE_APPEND_NODE');
  if(!xs.length)return[n];
  if(!transition(atlas,xs.at(-1),n))throw Error('PASSAGE_APPEND_TRANSITION');
  return[...xs,n].slice(-MAX_TRAIL);
}
function shareQuery(trail=[]){const t=encodeTrail(trail);return t?'passage=1&trail='+encodeURIComponent(t):'passage=1'}

return Object.freeze({SCHEMA,AUTHORITY,MAX_TRAIL,nodeKey,parseNode,nodeOf,entryNodes,transition,decodeTrail,encodeTrail,validateTrail,choices,routePacket,append,shareQuery,isBoilerplate});
});
