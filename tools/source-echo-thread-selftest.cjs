const T=require('../lib/prison-age-echo-thread.js');
const ok=(x,m)=>{if(!x)throw Error(m)};
const a={source_id:'a',path:'/prison-age/stories/03-open-air.md',title:'A',start:10,end:20,address:'read://a/10-20'};
let t=T.create(a);
t=T.append(t,{from:a,to:{source_id:'b',path:'/prison-age/stories/08-successful-escape.md',title:'B',start:30,end:40,address:'echo://b/30-40'},evidence:{shared:['door']}});
ok(t.hops.length===1,'hop');
ok(T.parseCompact(T.compact(t)).length===2,'compact');
console.log('SOURCE ECHO THREAD PASS');
