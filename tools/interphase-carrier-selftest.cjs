const fs=require('fs');
const C=require('../lib/interphase-carrier.js');
const assert=(x,m)=>{if(!x)throw new Error(m)};

const fieldProjection={
  host:'FIELD',projection:'FOVEA',
  spec:{channels:['identity','address','content','authority','evidence']},
  nodes:[{id:'/sleeper/',kind:'artifact',label:'SLEEPER',address:{href:'/sleeper/'}}],
  selection:['/sleeper/'],focus:[{id:'/sleeper/',aperture:'ROUTE'}],
  residue:[{id:'/sleeper/',channel:'time',projection:'FOVEA'}]
};
const field=C.fromProjection(fieldProjection,{
  owner:'FIELD',
  returnAddress:'/?focus=%2Fsleeper%2F',
  next:[
    {id:'OPEN',label:'OPEN',authority:'NAVIGATION',target:'/sleeper/'},
    {id:'CARRY',label:'INTERPHASE → DAYLINE',authority:'OFFER',target:'/dayline/'}
  ],
  witness:{class:'OBSERVED',summary:'manifest route held'}
});
assert(C.validate(field).ok,'field carrier valid');
assert(field.next.length===2,'field next');
assert(field.authority===C.AUTHORITY,'carrier authority');
assert(field.next.every(x=>x.dispatch==='HOST_NATIVE_ONLY'),'moves cannot dispatch');

const sleeper=C.make({
  object:{id:'sleeper:return:11KF1IO',kind:'return-artifact',label:'SLEEPER RETURN 11KF1IO',owner:'SLEEPER',address:'sleeper://11KF1IO/return',contract:'sleeper.one-return/v2'},
  focus:{id:'transfer:W8',label:'Name the constraint that must survive the next change.',address:'sleeper://11KF1IO/return#transfer',aperture:'TRANSFER'},
  next:[{id:'CARRY_OPERATOR',label:'CARRY OPERATOR → DAYLINE',authority:'OFFER',target:'/dayline/'}],
  witness:{class:'RETURN',summary:'8/8 enacted gates',evidenceRefs:['sleeper://11KF1IO/return#proofs']},
  return:{address:'/sleeper/project/?world=11KF1IO',owner:'SLEEPER'}
});
assert(C.validate(sleeper).ok,'sleeper carrier valid');
const round=C.deserialize(C.serialize(sleeper));
assert(C.sameObject(sleeper,round),'round trip object identity');
assert(round.return.address===sleeper.return.address,'return survives');
assert(round.next[0].authority==='OFFER','offer survives');
const witnessed=C.withWitness(round,{class:'EVIDENCE',summary:'real-world consequence observed'});
assert(witnessed.lineage.parentFrameId===round.frameId,'witness lineage');
assert(C.sameObject(round,witnessed),'witness does not replace object');

let threw=false;
try{C.make({object:{id:'x',owner:'X',address:'x://1'},return:{address:''}})}catch(_){threw=true}
assert(threw,'missing return rejected');

let tooMany=false;
try{C.make({
  object:{id:'x',owner:'X',address:'x://1'},focus:{id:'x',address:'x://1'},
  return:{address:'x://1'},next:[1,2,3,4].map(i=>({id:'M'+i,label:'M'+i,authority:'VIEW'}))
})}catch(_){tooMany=true}
assert(tooMany,'NEXT > 3 must reject, not truncate silently');

let elevated=false;
try{C.make({authority:'EFFECT',object:{id:'x',owner:'X',address:'x://1'},focus:{id:'x',address:'x://1'},return:{address:'x://1'}})}catch(_){elevated=true}
assert(elevated,'carrier authority injection must reject');

let directDispatch=false;
try{C.make({object:{id:'x',owner:'X',address:'x://1'},focus:{id:'x',address:'x://1'},return:{address:'x://1'},next:[{id:'M',label:'M',authority:'EFFECT',dispatch:'DIRECT'}]})}catch(_){directDispatch=true}
assert(directDispatch,'direct move dispatch must reject');

const fieldHtml=fs.readFileSync('index.html','utf8');
const daylineHtml=fs.readFileSync('dayline/index.html','utf8');
assert(fieldHtml.includes('/lib/interphase-carrier.js'),'FIELD carrier lib missing');
assert(fieldHtml.includes("window.InterphaseCarrier.fromProjection"),'FIELD held route is not carrierized');
assert(fieldHtml.includes("carrier,\n  interphase"),'FIELD Dayline packet does not carry carrier alongside legacy interphase');
assert(daylineHtml.includes('/lib/interphase-carrier.js'),'Dayline carrier lib missing');

console.log('INTERPHASE CARRIER SELFTEST PASS',C.SCHEMA);
