const assert=(x,m)=>{if(!x)throw new Error(m)};
global.window=global;
global.Interphase=require('../lib/interphase-core.js');
global.InterphaseCarrier=require('../lib/interphase-carrier.js');
const held={
 id:'t:field-proof',kind:'task',title:'FIELD · proof',owner:'FIELD / CURRENT',
 address:'/proof/ · t:field-proof',route:'/proof/',status:'open',
 channels:['identity','address','content','depth','time','authority','evidence'],
 authority:'VIEW / NATIVE_DAYLINE_EFFECTS_ONLY',
 moves:[{id:'DAYLINE_1',label:'RUN',href:null,effect:true,action:'RELEASE'},{id:'DAYLINE_2',label:'SOURCE ↗',href:'/proof/',effect:false,action:'TURN'}],
 witness:null,
 sourceLink:{return_to:'/?focus=%2Fproof%2F',source:{route:'/proof/',object_id:'route:/proof/'},
   interphase:{schema:'interphase/v0.2/handoff',host:'FIELD',projection:'RING',object_id:'/proof/',selection:['/proof/'],focus:[{id:'/proof/',aperture:'ROUTE'}],residue:[{id:'/proof/',channel:'content',projection:'RING'}]}},
 inheritedInterphase:{schema:'interphase/v0.2/handoff',host:'FIELD',projection:'RING',object_id:'/proof/'},
 returnTo:'/?focus=%2Fproof%2F'
};
global.DaylineConfluence={interphaseObject:()=>JSON.parse(JSON.stringify(held))};
require('../lib/interphase-dayline.js');
assert(global.DaylineInterphase,'DaylineInterphase host missing');
const snap=global.DaylineInterphase.snapshot();
assert(snap.host==='DAYLINE','wrong host');
assert(snap.state.selection[0]==='t:field-proof','held identity not selected');
assert(snap.state.focus[0]?.id==='t:field-proof','held identity not focused');
const p=global.DaylineInterphase.projectionResult();
assert(p.projection==='FOVEA','default projection not FOVEA');
assert(p.nodes[0]?.value?.inherited_interphase?.host==='FIELD','FIELD interphase witness lost');
assert(p.nodes[0]?.authority==='VIEW','projection gained authority');
assert(p.nodes[0]?.value?.moves?.map(x=>x.action).join(',')==='RELEASE,TURN','shared Dayline actions lost in projection');
assert(global.InterphaseCarrier.classifyAction({label:'RUN',authority:'EFFECT'})==='RELEASE','native effect must project to RELEASE');
assert(global.InterphaseCarrier.classifyAction({label:'SOURCE ↗',authority:'NAVIGATION'})==='TURN','navigation must project to TURN');
assert(global.DaylineInterphase.invoke('t:field-proof','RUN',{}, {commit:true}).ok===false,'adapter must not invoke native Dayline effects');
global.DaylineInterphase.project('RING');
const ring=global.DaylineInterphase.projectionResult();
assert(ring.residue.some(x=>x.channel==='content'),'RING should expose suppressed content as residue');
const fs=require('fs');
const app=fs.readFileSync('dayline/app.js','utf8');
assert(app.includes("globalThis.InterphaseCarrier")&&app.includes("classifyAction"),'Dayline runtime does not consume carrier action classifier');
assert(app.includes("actionSurface:()=>"),'Dayline action surface is not exposed');
assert(app.includes("shared+' · '+m.label"),'visible Dayline moves do not preserve shared action + native label');
console.log('DAYLINE INTERPHASE SELFTEST PASS',global.Interphase.VERSION);
