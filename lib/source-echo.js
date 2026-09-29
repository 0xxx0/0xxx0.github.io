(function(root,factory){
'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.FieldSourceEcho=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const SCHEMA='field-source-echo-index/v0.1';
const LAW='ECHO exposes exact source fragments and lexical overlap only. It does not assert theme, intent, causality, canon order, equivalence, comprehension or interpretation.';
const STOP=new Set(["the","a","an","and","or","but","if","then","than","to","of","in","on","at","for","from","by","with","without","into","through","over","under","as","is","are","was","were","be","been","being","it","its","this","that","these","those","he","she","they","them","their","his","her","you","your","we","our","i","me","my","who","whom","which","what","when","where","why","how","not","no","do","did","does","done","had","has","have","can","could","would","should","will","shall","may","might","must","one","two","three","four","five","six","seven","eight","nine","season","prison","age","source","universe","engine","token","margin","said","asked","every","only","still","then","there","here","where","while","before","after","again","same","some","more","most","much","many","very","just","also","each","someone","something","anything","nothing"]);
const words=s=>(String(s||'').toLowerCase().normalize('NFKC').match(/[a-z0-9’'-]+/g)||[]).map(x=>x.replace(/^['’\\-]+|['’\\-]+$/g,'')).filter(x=>x.length>2&&!STOP.has(x));
const uniq=xs=>[...new Set(xs)];
function validateIndex(index){
 const errors=[];if(!index||index.schema!==SCHEMA)errors.push('schema mismatch');
 if(index?.authority!=='EVIDENCE_ONLY')errors.push('authority mismatch');
 if(!Array.isArray(index?.sources)||index.sources.length<2)errors.push('sources missing');
 if(!Array.isArray(index?.entries)||!index.entries.length)errors.push('entries missing');
 const ids=new Set((index?.sources||[]).map(x=>x.id));
 for(const e of index?.entries||[]){if(!ids.has(e.source_id))errors.push('entry source missing');if(!Number.isInteger(e.start)||!Number.isInteger(e.end)||e.start<0||e.end<=e.start)errors.push('entry span invalid');if(!String(e.text||''))errors.push('entry text missing')}
 return{ok:!errors.length,errors};
}
function bigrams(xs){const out=[];for(let i=0;i<xs.length-1;i++)out.push(xs[i]+' '+xs[i+1]);return out}
function rank(index,{sourceId='',text='',limit=3}={}){
 const check=validateIndex(index);if(!check.ok)return[];
 const current=words(text),currentSet=new Set(current),currentBi=new Set(bigrams(current)),N=index.sources.length,df=index.document_frequency||{},out=[];
 if(!current.length)return[];
 for(const e of index.entries){
   if(e.source_id===sourceId)continue;
   const ets=uniq((e.tokens||[]).filter(Boolean)),shared=ets.filter(w=>currentSet.has(w));
   if(!shared.length)continue;
   const rare=shared.filter(w=>(Number(df[w])||N)<=2);
   if(!rare.length&&shared.length<2)continue;
   const ebi=bigrams(words(e.text)),phrases=ebi.filter(x=>currentBi.has(x));
   let score=0;
   for(const w of shared){const d=Math.max(1,Number(df[w])||N);score+=1+(N-d)*1.75}
   score+=phrases.length*4+shared.length*.25;
   out.push({score:+score.toFixed(4),shared,phrases,entry:{id:e.id,source_id:e.source_id,title:e.title,path:e.path,start:e.start,end:e.end,text:e.text,address:'source-echo://'+encodeURIComponent(e.source_id)+'/'+e.start+'-'+e.end}});
 }
 return out.sort((a,b)=>b.score-a.score||b.phrases.length-a.phrases.length||b.shared.length-a.shared.length||a.entry.id.localeCompare(b.entry.id)).slice(0,Math.max(1,Number(limit)||3));
}
function best(index,input){return rank(index,{...input,limit:1})[0]||null}
return Object.freeze({SCHEMA,LAW,words,validateIndex,rank,best});
});
