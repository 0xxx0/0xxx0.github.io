const fs=require('fs');
(async()=>{
 const E=await import('../fold-bloom/read-experience.js');
 const source='ALPHA.\n\nThe door opened.\n\nOMEGA.';
 const x=E.makeReadExperience({owner:'TEST',source,sourceIdentity:{address:'/x',hash:'h'},initial:{scene:'DEEP',profile:'NORMAL'},cues:[
   {id:'door',quote:'The door opened.',presentation:{scene:'TRANCE',profile:'DRIVE'}},
   {id:'end',quote:'OMEGA.',presentation:{scene:'WOOD',profile:'SOFT'}}
 ]});
 if(!E.validateReadExperience(x,source,{address:'/x',hash:'h'}).ok)throw Error('valid score rejected');
 if(E.readExperienceCueAt(x,0)!==null)throw Error('pre-cue should be initial');
 if(E.readExperienceCueAt(x,source.indexOf('The door')).id!=='door')throw Error('door cue');
 if(E.readExperienceCueAt(x,source.length-1).id!=='end')throw Error('end cue');
 let dup=false;try{E.makeReadExperience({source:'X X',cues:[{quote:'X',presentation:{scene:'DEEP'}}]})}catch(_){dup=true}
 if(!dup)throw Error('duplicate quote must reject');
 const bad=JSON.parse(JSON.stringify(x));bad.cues[0].quote='wrong';
 if(E.validateReadExperience(bad,source,{address:'/x',hash:'h'}).ok)throw Error('tamper must reject');
 console.log('READ EXPERIENCE PASS ·',x.cues.map(c=>c.id).join(' → '));
})().catch(e=>{console.error(e);process.exit(1)});
