(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.SleeperReturnV2=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const SCHEMA='sleeper.one-return', VERSION=2;
  const TOOLS=Object.freeze(['conch','keris','w8','spiral']);
  const GATES=Object.freeze(['PROVENANCE','TRUTH','COMPRESSION','RETRIEVAL','OPERATION','MEASURE','TRANSFER','RESILIENCE']);
  const GATE_METHOD=Object.freeze({
    PROVENANCE:'conch',TRUTH:'stillness',COMPRESSION:'spiral',RETRIEVAL:'w8',
    OPERATION:'keris',MEASURE:'distance',RESILIENCE:'relocation'
  });
  const CELLS=Object.freeze({
    doors:{text:'ALL MAPS ARE WRONG. SOME BECOME DOORS.',provenance:'Sleeper field line / current working canon',gateOrder:['PROVENANCE','TRUTH','COMPRESSION','RETRIEVAL','OPERATION','MEASURE','TRANSFER','RESILIENCE']},
    'one-return':{text:'GOOD FOR ONE RETURN.',provenance:'Sleeper return line / current working canon',gateOrder:['PROVENANCE','RETRIEVAL','TRUTH','OPERATION','COMPRESSION','TRANSFER','MEASURE','RESILIENCE']},
    'four-verbs':{text:'LISTEN. CUT. CARRY. RETURN.',provenance:'Recovered Sleeper operator sequence',gateOrder:['TRUTH','PROVENANCE','OPERATION','RETRIEVAL','TRANSFER','MEASURE','COMPRESSION','RESILIENCE']},
    'eighth-position':{text:'未始来时末已示空',provenance:'Jointly evolved working line; philological status remains open',gateOrder:['PROVENANCE','COMPRESSION','TRUTH','MEASURE','OPERATION','RETRIEVAL','RESILIENCE','TRANSFER']},
    wind:{text:'SOME REPLIES TAKE WIND.',provenance:'Sleeper kite line / current working canon',gateOrder:['MEASURE','TRUTH','PROVENANCE','OPERATION','RETRIEVAL','COMPRESSION','RESILIENCE','TRANSFER']},
    question:{text:'ASK BETTER.',provenance:'Sleeper oracle line / current working canon',gateOrder:['TRUTH','MEASURE','PROVENANCE','OPERATION','RESILIENCE','COMPRESSION','RETRIEVAL','TRANSFER']}
  });
  const FIGURES=Object.freeze(['urchin','slothcake','kite']);
  const INSTRUCTION=Object.freeze({
    conch:'Listen for a signal and name its source before answering.',
    keris:'Make the smallest cut that changes the next possible action.',
    w8:'Name the constraint that must survive the next change.',
    spiral:'Change the representation; verify that the underlying thing survives.'
  });

  const arr=x=>Array.isArray(x)?x:[];
  const obj=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
  const str=x=>x==null?'':String(x);
  const normalizeSource=x=>str(x).trim().replace(/\s+/g,' ');
  const integer=x=>Number.isInteger(x)&&x>=0;

  function hashString(value){
    let hash=2166136261;
    for(const character of str(value).normalize('NFC')){
      hash^=character.codePointAt(0)??0;
      hash=Math.imul(hash,16777619);
    }
    return hash>>>0;
  }
  function seedFromSource(source){return hashString(str(source).trim().replace(/\s+/g,' ').toUpperCase())}
  function wordsForCell(cellId){
    const cell=CELLS[cellId]; if(!cell)return [];
    if(cellId==='eighth-position')return Array.from(cell.text).slice(0,8);
    const glyphs=Array.from(cell.text.match(/[\p{L}\p{N}]+|[^\s]/gu)??[]);
    if(!glyphs.length)return ['RETURN'];
    return Array.from({length:8},(_,i)=>glyphs[i%glyphs.length]);
  }
  function compile(source,cellId,figure){
    const normalized=normalizeSource(source);
    const cell=CELLS[cellId];
    if(!normalized||!cell||!FIGURES.includes(figure))return null;
    const seed=seedFromSource(normalized+'\u241f'+cellId+'\u241f'+figure);
    return{
      source:normalized,cellId,figure,seed,
      worldKey:seed.toString(36).toUpperCase().padStart(7,'0'),
      transferTool:TOOLS[seed%TOOLS.length],
      gateOrder:[...cell.gateOrder],
      tokens:wordsForCell(cellId)
    };
  }
  function expectedGateMap(law){
    const out={};
    law.gateOrder.forEach((gate,i)=>{out[gate]={token:law.tokens[i],method:gate==='TRANSFER'?law.transferTool:GATE_METHOD[gate]}});
    return out;
  }
  function dominantOperator(counts,seed){
    return [...TOOLS].sort((left,right)=>
      (Number(counts?.[right]||0)-Number(counts?.[left]||0))
      ||((hashString(seed+':'+left)%97)-(hashString(seed+':'+right)%97))
    )[0];
  }
  function returnSource(source,operator,pathSignature){
    const words=normalizeSource(source).split(/\s+/).filter(Boolean);
    if(!words.length)return 'RETURNED';
    if(words.length===1)return words[0]+' / RETURNED';
    const pivot=hashString(str(pathSignature)+':'+operator)%words.length;
    if(operator==='conch')return [...words.slice(pivot),words[pivot],...words.slice(0,pivot)].join(' ');
    if(operator==='keris')return [...words.slice(0,pivot),'—',...words.slice(pivot)].join(' ');
    if(operator==='w8')return [...words.slice(pivot),...words.slice(0,pivot)].join(' ');
    return [...words].reverse().join(' ');
  }

  function validate(input){
    const a=typeof input==='string'?(()=>{try{return JSON.parse(input)}catch(_){return null}})():input;
    const errors=[],warnings=[];
    if(!obj(a))return{ok:false,errors:['artifact must be an object'],warnings,derived:null,artifact:null};
    if(a.schema!==SCHEMA)errors.push('schema mismatch');
    if(a.version!==VERSION)errors.push('version mismatch');
    if(typeof a.source!=='string'||!a.source.trim()||a.source.length>120)errors.push('source invalid');
    const cellId=str(a.cell?.id),figure=str(a.figure);
    if(!CELLS[cellId])errors.push('verse cell unknown');
    if(!FIGURES.includes(figure))errors.push('figure unknown');
    const law=errors.some(x=>/source|cell|figure/.test(x))?null:compile(a.source,cellId,figure);
    if(!law)return{ok:false,errors,warnings,derived:null,artifact:a};

    if(str(a.worldKey)!==law.worldKey)errors.push('world key mismatch: expected '+law.worldKey);
    const cell=CELLS[cellId];
    if(str(a.cell?.source)!==cell.text)errors.push('cell source mismatch');
    if(str(a.cell?.provenance)!==cell.provenance)errors.push('cell provenance mismatch');

    const proofs=arr(a.proofs);
    if(proofs.length!==8)errors.push('expected exactly 8 Gate proofs');
    const seen=new Set(), gateMap=expectedGateMap(law),proofUseCounts={conch:0,keris:0,w8:0,spiral:0};
    let prevStep=-1,prevMs=-1;
    for(let i=0;i<proofs.length;i++){
      const p=proofs[i]||{},gate=str(p.gate);
      if(!GATES.includes(gate)){errors.push('proof '+i+' gate invalid');continue}
      if(seen.has(gate))errors.push('duplicate Gate proof: '+gate);seen.add(gate);
      const expected=gateMap[gate];
      if(str(p.token)!==str(expected?.token))errors.push(gate+' token mismatch: expected '+str(expected?.token));
      if(str(p.method)!==str(expected?.method))errors.push(gate+' method mismatch: expected '+str(expected?.method));
      if(TOOLS.includes(str(p.method)))proofUseCounts[str(p.method)]++;
      if(!integer(p.step))errors.push(gate+' step invalid');
      else if(p.step<=prevStep)errors.push(gate+' step is not strictly increasing');
      if(!integer(p.elapsedMs))errors.push(gate+' elapsedMs invalid');
      else if(p.elapsedMs<=prevMs)errors.push(gate+' elapsedMs is not strictly increasing');
      if(integer(p.step))prevStep=p.step;if(integer(p.elapsedMs))prevMs=p.elapsedMs;
      if(typeof p.note!=='string'||!p.note.trim())warnings.push(gate+' note empty');
    }
    for(const gate of GATES)if(!seen.has(gate))errors.push('missing Gate proof: '+gate);
    const primaryByTool={conch:'PROVENANCE',keris:'OPERATION',w8:'RETRIEVAL',spiral:'COMPRESSION'};
    const transferIndex=proofs.findIndex(p=>p?.gate==='TRANSFER'),primaryIndex=proofs.findIndex(p=>p?.gate===primaryByTool[law.transferTool]);
    if(transferIndex>=0&&primaryIndex>=0&&primaryIndex>=transferIndex)errors.push('TRANSFER occurred before its primary '+primaryByTool[law.transferTool]+' proof');

    const counts=a.operatorCounts;
    if(!obj(counts))errors.push('operatorCounts invalid');
    else for(const tool of TOOLS){
      if(!integer(counts[tool]))errors.push(tool+' count invalid');
      else if(counts[tool]<proofUseCounts[tool])errors.push(tool+' count is below proof-bearing uses: expected at least '+proofUseCounts[tool]);
    }

    const dominant=obj(counts)&&TOOLS.every(t=>integer(counts[t]))?dominantOperator(counts,law.seed):null;
    if(dominant&&str(a.dominantOperator)!==dominant)errors.push('dominant operator mismatch: expected '+dominant);
    if(dominant&&str(a.transferInstruction)!==INSTRUCTION[dominant])errors.push('transfer instruction mismatch');

    const path=str(a.pathSignature);
    if(!(path==='•'||(/^[UDLR]{1,36}$/.test(path))))errors.push('path signature invalid');
    if(dominant&&str(a.returnedSource)!==returnSource(law.source,dominant,path))errors.push('returned source mismatch');

    const expectedWitness=proofs.map(p=>str(p?.token)).join(' · ');
    if(str(a.cell?.witness)!==expectedWitness)errors.push('cell witness does not match proof enactment order');

    if(!obj(a.measures)||!integer(a.measures.steps)||!integer(a.measures.elapsedMs))errors.push('measures invalid');
    else{
      if(proofs.length&&integer(proofs.at(-1)?.step)&&a.measures.steps<proofs.at(-1).step)errors.push('final steps precede last proof');
      if(proofs.length&&integer(proofs.at(-1)?.elapsedMs)&&a.measures.elapsedMs<proofs.at(-1).elapsedMs)errors.push('final elapsedMs precedes last proof');
    }
    if(a.route?.worldKey&&a.route.worldKey!==a.worldKey)errors.push('route world key mismatch');

    return{
      ok:errors.length===0,errors,warnings,artifact:a,
      derived:{
        worldKey:law.worldKey,seed:law.seed,transferTool:law.transferTool,
        gateMap,dominantOperator:dominant,
        transferInstruction:dominant?INSTRUCTION[dominant]:null,
        returnedSource:dominant?returnSource(law.source,dominant,path):null,
        witness:expectedWitness
      }
    };
  }

  return Object.freeze({SCHEMA,VERSION,TOOLS,GATES,CELLS,FIGURES,INSTRUCTION,hashString,seedFromSource,compile,expectedGateMap,dominantOperator,returnSource,validate});
});
