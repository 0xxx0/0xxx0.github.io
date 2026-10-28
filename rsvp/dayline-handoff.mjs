// A reading observation becomes a proposed task ONLY through an explicit
// human action. No automatic Dayline writes, no autonomous task inference,
// and no second annotation store. The original quote remains source-owned.
export function proposedDaylineHandoff({raw,hash,label='',sourceAddress='',mark,returnTo='/rsvp/?handoff=1',at=new Date().toISOString()}={}){
 if(typeof raw!=='string'||!/^sha256:[0-9a-f]{64}$/.test(String(hash)))
  throw Error('Exact source identity required');
 if(!mark||mark.kind!=='APPLIED'||mark.revision!==hash||
  !Number.isInteger(mark.charIndex)||!Number.isInteger(mark.endIndex)||
  mark.charIndex<0||mark.endIndex<=mark.charIndex||mark.endIndex>raw.length||
  raw.slice(mark.charIndex,mark.endIndex)!==mark.quote)
  throw Error('Only a source-bound APPLIED annotation can be carried');
 const title=String(mark.note||'').trim();
 if(!title||title.length>500)throw Error('Write an actual next action before carrying');
 if(!/^\/rsvp\/\?handoff=1$/.test(returnTo))throw Error('RETURN must resolve to the original WRIST source');
 const name=String(label||'READING').slice(0,120),pos=mark.charIndex,end=mark.endIndex;
 const src=String(sourceAddress||'');
 const rooted=src.startsWith('/')&&!src.startsWith('//')&&!/[\r\n]/.test(src);
 const url=rooted?new URL('/docs/','https://field.local'):null;
 if(url){url.searchParams.set('src',src);url.searchParams.set('ap_char',String(pos));url.searchParams.set('ap_scale','SENT')}
 const sourceRef=url?url.pathname+url.search:(hash+'#char='+pos);
 const notes=[
  'SOURCE: '+name,
  'REVISION: '+hash,
  'EXACT UTF-16: '+pos+':'+end,
  'QUOTE: '+mark.quote.slice(0,360),
  'AUTHOR: '+title
 ].join('\n');
 return Object.freeze({
  schema:'atlas-dayline-handoff/v0.1',kind:'TASK',created_at:at,
  source:{label:name,route:'/rsvp/',address:hash+' · '+pos+':'+end,revision:hash,
   quote:mark.quote.slice(0,360)},
  payload:{task:{title:title.slice(0,160),notes,sourceRef,
   provenance:'READFIELD / APPLIED · '+hash+' · '+pos+':'+end,
   sourceUpdated:at,sourceClass:'IMPORTED',contexts:['computer'],duration:25,value:3,setup:1}},
  return_to:returnTo,
  authority:'NONE',
  approval:'EXPLICIT_ADD_TO_DAY_REQUIRED'
 });
}
