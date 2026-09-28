(async()=>{
 const T=await import('../fold-bloom/live/read-trackfield.js');
 const course={kind:'READFIELD_TEXT',sourceId:'s1',label:'SOURCE',grain:'PARAGRAPH',sourceIdentity:{authority:'TEST'},source:'Short.\n\nA much longer paragraph, with punctuation! And another sentence?\n\nShort returns.',points:[
  {start:0,end:6},{start:8,end:72},{start:74,end:88}
 ]};
 const a=T.makeReadTrackMap(course),b=T.makeReadTrackMap(course);
 if(JSON.stringify(a)!==JSON.stringify(b))throw Error('map not deterministic');
 if(a.structure.unitCount!==3||a.frames.length<10)throw Error('map shape');
 if(!/STRUCTURE != MEANING/.test(a.structure.law))throw Error('truth law');
 const w0=T.buildReadTrackfield(a,0,{count:24}),w1=T.buildReadTrackfield(a,.75,{count:24});
 if(!w0||!w1||w0.sourceKind!=='READFIELD_TEXT')throw Error('world missing');
 if(w0.time===w1.time)throw Error('address does not move terrain');
 const changed={...course,source:course.source.replace('Short returns.','Different ending!'),points:course.points};
 const c=T.makeReadTrackMap(changed);
 if(JSON.stringify(a.frames)===JSON.stringify(c.frames))throw Error('source structure change not reflected');
 console.log('READ TRACKFIELD PASS ·',a.structure.unitCount,'units ·',a.frames.length,'frames ·',w0.schema);
})().catch(e=>{console.error(e);process.exit(1)});
