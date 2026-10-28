/* SLEEPER / LADDER ↔ THREADWALK
   Projection bridge, not another text corpus or semantic oracle.
   The eight passages below are derived from the already-public, abridged LADDER
   source slice; their hashes/offsets address this projection, NOT Buddhadhamma.
   Script references are reading leads, NOT imported evidence. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.SleeperLadderThread=api;
})(typeof globalThis!=='undefined'?globalThis:this,()=>{
'use strict';
const SCHEMA='sleeper/source-slice@1';
const CANONICAL=[
'https://buddhadhamma.github.io/path-factors-of-wisdom.html',
'https://buddhadhamma.github.io/path-factors-of-wisdom.html',
'https://buddhadhamma.github.io/path-factors-of-virtuous-conduct.html',
'https://buddhadhamma.github.io/path-factors-of-virtuous-conduct.html',
'https://buddhadhamma.github.io/path-factors-of-virtuous-conduct.html',
'https://buddhadhamma.github.io/path-factors-of-concentration.html',
'https://buddhadhamma.github.io/path-factors-of-concentration.html',
'https://buddhadhamma.github.io/path-factors-of-concentration.html'
];
// Human-authored questions; NOT quotations or automatic conclusions.
// Editorial navigation through the treatise's distinct explanatory tasks.
// These questions are NOT excerpts, doctrinal quotations or generated proofs.
const READING_MAP=[
 {chapter:'Ch. 1',title:'Five Aggregates',lens:'COMPOSE',question:'What events and constituents make up this experience?',url:'https://buddhadhamma.github.io/five-aggregates.html'},
 {chapter:'Ch. 3',title:'Three Characteristics',lens:'CHANGE',question:'What here is changing, unreliable, or not mine to command?',url:'https://buddhadhamma.github.io/three-characteristics.html'},
 {chapter:'Ch. 4',title:'Dependent Origination',lens:'CONDITION',question:'What conditions gave rise to this reaction; which condition can cease?',url:'https://buddhadhamma.github.io/dependent-origination.html'},
 {chapter:'Ch. 15',title:'Wise Reflection',lens:'DISCERN',question:'Where did observation become interpretation, attachment, or assumption?',url:'https://buddhadhamma.github.io/wise-reflection.html'},
 {chapter:'Ch. 16–18',title:'Path Factors',lens:'PRACTISE',question:'What can be done skilfully, and which other factors support that action?',url:'https://buddhadhamma.github.io/path-factors.html'}
];
const QUESTIONS=[
'What did you directly observe, and what have you inferred? Which condition would change the inference?',
'What would happen if you followed this intention? Which alternative would reduce harm?',
'Is silence enough here? What distinguishes silence from truthful, timely, beneficial speech?',
'Whose wellbeing is altered by this action? Which consequences remain outside your view?',
'Who pays for the way this livelihood works, including indirect effects?',
'Which unwholesome condition can be prevented or abandoned, and which wholesome one cultivated or sustained?',
'Can you locate the instant between an event and your reaction without inventing a story about it?',
'Does steadiness support clearer seeing, or merely suppress movement? What would reveal the difference?'
];
const REFERENCES=[
[{id:'MN 117',label:'Factors working together',url:'https://suttacentral.net/mn117/en/sujato'},{id:'SN 56.11',label:'Four truths and the path',url:'https://suttacentral.net/sn56.11/en/sujato'}],
[{id:'MN 19',label:'Two kinds of intention',url:'https://suttacentral.net/mn19/en/sujato'},{id:'MN 117',label:'View, effort and mindfulness',url:'https://suttacentral.net/mn117/en/sujato'}],
[{id:'MN 117',label:'Right speech as practice',url:'https://suttacentral.net/mn117/en/sujato'},{id:'MN 58',label:'Speech, truth and benefit',url:'https://suttacentral.net/mn58/en/sujato'}],
[{id:'MN 117',label:'What right action means',url:'https://suttacentral.net/mn117/en/sujato'}],
[{id:'AN 5.177',label:'Livelihood and five trades',url:'https://suttacentral.net/an5.177/en/sujato'},{id:'MN 117',label:'Livelihood in the path',url:'https://suttacentral.net/mn117/en/sujato'}],
[{id:'MN 117',label:'Effort accompanies the path',url:'https://suttacentral.net/mn117/en/sujato'}],
[{id:'MN 10',label:'Four establishments of mindfulness',url:'https://suttacentral.net/mn10/en/sujato'},{id:'SN 12.2',label:'Contact, feeling, craving',url:'https://suttacentral.net/sn12.2/en/sujato'}],
[{id:'MN 117',label:'Concentration and supports',url:'https://suttacentral.net/mn117/en/sujato'},{id:'MN 10',label:'Mindfulness in practice',url:'https://suttacentral.net/mn10/en/sujato'}]
];
const ACTS=['see','letgo','silence','word','word','walk','return','stay'];
const SOURCE_SELECTION_SHA='52891ff29b442cbd51824c715f7a51206863916ef5dcd2384087b59380f8f7c6';
const FACTOR_TABLE_HASH='ac14d49b';
function sourceTableHash(rows){
 const packet=JSON.stringify(rows.map(({i,key,en,pali,act,locator,line})=>({i,key,en,pali,act,locator,line})));
 let h=2166136261;
 for(let i=0;i<packet.length;i++){h^=packet.charCodeAt(i);h=Math.imul(h,16777619);}
 return (h>>>0).toString(16).padStart(8,'0');
}
function validate(raw){
 if(!raw||raw.schema!==SCHEMA||raw.factors?.length!==8||!Array.isArray(raw.districts)||!raw.provenance||!raw.selection||!(/^[a-f0-9]{64}$/.test(raw.selection.sha256||'')))throw Error('LADDER_SOURCE_SLICE_INVALID');
 if(raw.selection.sha256!==SOURCE_SELECTION_SHA||sourceTableHash(raw.factors)!==FACTOR_TABLE_HASH)throw Error('LADDER_SOURCE_PROJECTION_CHANGED');
 const indices=new Set(),keys=new Set();
 for(let i=0;i<8;i++){
  const f=raw.factors[i];
  if(!f||f.i!==i||ACTS[i]!==f.act||typeof f.key!=='string'||keys.has(f.key)||
    !f.en||!f.pali||typeof f.locator!=='string'||!/^(Ch\. 1[678]) · ¶\d+$/.test(f.locator)||
    typeof f.line!=='string'||f.line.trim().length<24||f.line.length>350||
    !CANONICAL[i].startsWith('https://buddhadhamma.github.io/'))throw Error('LADDER_FACTOR_INVALID_'+i);
  keys.add(f.key);indices.add(f.i);
 }
 return raw;
}
function create(raw){
 validate(raw);
 const entries=raw.factors.map((f,i)=>{
  const text=f.en.toUpperCase()+' ('+f.pali+') — '+f.locator+'\n'+f.line.trim();
  return Object.freeze({index:i,key:f.key,name:f.en,pali:f.pali,act:f.act,locator:f.locator,
   excerpt:f.line.trim(),passage:text,question:QUESTIONS[i],
   // MN 117: view, effort and mindfulness accompany the factors; these are
   // editorial passages to compare, never automatic semantic links.
   compareIndices:[0,5,6].filter(j=>j!==i),
   canonical:CANONICAL[i],references:REFERENCES[i].map(r=>({...r}))});
 });
 const text=entries.map(e=>e.passage).join('\n\n');
 return Object.freeze({schema:'sleeper.ladder-threadwalk-projection/v1',
  sourceType:'DERIVED_ABRIDGED_PROJECTION_NOT_FULL_BOOK',
  originalSelectionSha256:raw.selection.sha256,
  title:'Buddhadhamma / eight path factors — LADDER excerpts',
  text,entries});
}
function selectedIndex(x){
 if(x==null||x==='')return 0;
 if(!/^[0-7]$/.test(String(x)))throw Error('LADDER_FACTOR_INDEX_INVALID');
 return Number(x);
}
return Object.freeze({create,validate,selectedIndex,SCHEMA,CANONICAL,REFERENCES,QUESTIONS,READING_MAP});
});