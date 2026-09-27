const fs=require('fs');
const C=require('../lib/interphase-carrier.js');
const assert=(x,m)=>{if(!x)throw new Error(m)};

const sleeper=fs.readFileSync('sleeper/project/index.html','utf8');
const dayline=fs.readFileSync('dayline/app.js','utf8');
const daylinePage=fs.readFileSync('dayline/index.html','utf8');

assert(sleeper.includes('/lib/interphase-carrier.js'),'Sleeper carrier lib missing');
assert(daylinePage.includes('/lib/interphase-carrier.js'),'Dayline carrier lib missing');
assert(sleeper.includes("data-act=\"carry-dayline\""),'Sleeper carry action missing');
assert(sleeper.includes("transferInstruction"),'Sleeper carry must use artifact transferInstruction');
assert(sleeper.includes("schema:'atlas-dayline-handoff/v0.1'"),'Sleeper Dayline handoff schema missing');
assert(sleeper.includes("authority:'OFFER'"),'Sleeper carrier move must be offer only');
assert(sleeper.includes("cannot satisfy or rewrite Sleeper Gate proofs"),'Sleeper proof boundary missing');
assert(sleeper.includes("DAYLINE RETURN OFFER · EVIDENCE ONLY"),'Sleeper evidence-only return surface missing');
assert(dayline.includes("carrier:h.carrier&&typeof h.carrier==='object'?clone(h.carrier):null"),'Dayline does not retain incoming carrier');
assert(dayline.includes('function continuationCarrier()'),'Dayline continuation carrier missing');
assert(dayline.includes('object=parent?.object||'),'Dayline must preserve parent object when supplied');
assert(dayline.includes('parentFrameId:parent?.frameId'), 'Dayline carrier lineage missing');
assert(dayline.includes('carrier:packet.continuationCarrier||link.carrier||null'),'Dayline source return carrier missing');

const parent=C.make({
  object:{id:'sleeper:return:11KF1IO',kind:'return-artifact',label:'SLEEPER RETURN',owner:'SLEEPER',address:'sleeper://11KF1IO/return'},
  focus:{id:'transfer:w8',label:'transfer',address:'sleeper://11KF1IO/return#transfer'},
  next:[{id:'CARRY',label:'CARRY OPERATOR → DAYLINE',authority:'OFFER',target:'/dayline/'}],
  witness:{class:'RETURN',summary:'8/8'},
  return:{address:'/sleeper/project/?world=11KF1IO',owner:'SLEEPER'}
});
const returned=C.make({
  object:parent.object,
  focus:{id:'t:work-transfer',label:'real-world enactment',address:'DAYLINE local · t:work-transfer',aperture:'DAYLINE'},
  next:[{id:'DAYLINE_1',label:'COMPLETE',authority:'EFFECT',target:'/dayline/'}],
  witness:{class:'OBSERVED',summary:'constraint survived'},
  return:parent.return,
  projection:{host:'DAYLINE',name:'FOVEA',channels:['identity','address','content','time','authority','evidence']},
  parentFrameId:parent.frameId
});
assert(C.sameObject(parent,returned),'cross-host continuation replaced source object');
assert(returned.focus.id!==parent.focus.id,'focus should be free to change across host');
assert(returned.return.address===parent.return.address,'source return address lost');
assert(returned.authority===C.AUTHORITY,'recipient carrier gained authority');
assert(returned.next[0].dispatch==='HOST_NATIVE_ONLY','effect escaped native authority');

console.log('SLEEPER → DAYLINE CARRIER LOOP SELFTEST PASS',returned.frameId);
