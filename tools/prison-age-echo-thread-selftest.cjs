const T=require('../lib/prison-age-echo-thread.js');
const assert=(x,m)=>{if(!x)throw new Error(m)};
const origin={source_id:'open-air',path:'/prison-age/stories/03-open-air.md',title:'Open Air',start:1450,end:1516,address:'read://open-air/sentence/1@1450-1516'};
let thread=T.create(origin);
thread=T.append(thread,{
 from:origin,
 to:{source_id:'successful-escape',path:'/prison-age/stories/08-successful-escape.md',title:'The Successful Escape Changes the Next Prison',start:100,end:150,address:'source-echo://successful-escape/100-150'},
 evidence:{entry_id:'successful-escape:100-150',shared:['open'],phrases:[],score:4.25}
});
assert(thread.hops.length===1,'hop');
assert(thread.authority==='EVIDENCE_ONLY','authority');
const c=T.compact(thread);assert(c.includes('open-air:1450-1516'),'compact origin');
assert(T.parseCompact(c).length===2,'compact roundtrip');
let rejected=false;try{T.append(thread,{from:origin,to:{...origin,start:0,end:0},evidence:{shared:['x']}})}catch(_){rejected=true}
assert(rejected,'invalid span rejected');
console.log('PRISON AGE ECHO THREAD PASS',c);
