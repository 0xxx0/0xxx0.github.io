import {
  RUN_LENGTH,RUN_WIN_HITS,PUZZLE_ROUNDS,PUZZLE_WIN_STARS,DUET_ROUNDS,DUET_WIN_HITS,
  GARDEN_GENERATIONS,GARDEN_MOVES,GARDEN_SURVIVAL_TARGET,HEX_LINES,HEX_CHANGE_TARGET,HEX_CHANGE_LIMIT
} from './play-core.js?v=0.5';

export const PLAY_LOOP_CONTRACT_VERSION='FOLD_BLOOM_PLAY_LOOP_0.1';

const CONTRACTS=Object.freeze({
  PLAY:Object.freeze({
    mode:'PLAY',archetype:'REPEAT',label:'RUN',terminal:'BOUNDED',
    phases:Object.freeze(['RUN']),
    operators:Object.freeze(['TURN','RELEASE']),
    law:'Repeat a legible move; clear by sustained response, while misses still change the road.'
  }),
  PUZZLE:Object.freeze({
    mode:'PUZZLE',archetype:'FORM_CHANGE',label:'HEX',terminal:'BOUNDED',
    phases:Object.freeze(['FORM','CHANGE']),
    operators:Object.freeze(['TURN','RELEASE']),
    law:'Construct a form, then make an addressed transformation of that form.'
  }),
  PATH:Object.freeze({
    mode:'PATH',archetype:'OPTIMIZE',label:'PATH',terminal:'BOUNDED',
    phases:Object.freeze(['PATH']),
    operators:Object.freeze(['TURN','RELEASE']),
    law:'Reach the same lawful consequence with lower action cost.'
  }),
  DUET:Object.freeze({
    mode:'DUET',archetype:'COORDINATE',label:'DUET',terminal:'BOUNDED',
    phases:Object.freeze(['SYNC']),
    operators:Object.freeze(['TURN','PARTNER_DIAL','RELEASE']),
    law:'Two unequal controls must independently describe the same consequence before commitment.'
  }),
  GARDEN:Object.freeze({
    mode:'GARDEN',archetype:'SELECT_INHERIT',label:'GARDEN',terminal:'BOUNDED',
    phases:Object.freeze(['OBSERVE','CHOOSE','INHERIT']),
    operators:Object.freeze(['TURN','RELEASE','SELECT_TRAIT']),
    law:'A completed generation selects one pressure that the next generation must preserve.'
  }),
  ZEN:Object.freeze({
    mode:'ZEN',archetype:'OPEN_PRACTICE',label:'ZEN',terminal:'OPEN',
    phases:Object.freeze(['OPEN']),
    operators:Object.freeze(['TURN','RELEASE']),
    law:'Practice the same causal field without a terminal score condition.'
  })
});

export function normalizeLoopMode(mode){
  const m=String(mode||'PLAY').toUpperCase();
  return CONTRACTS[m]?m:'PLAY';
}
export function loopContract(mode){
  const c=CONTRACTS[normalizeLoopMode(mode)];
  return {...c,phases:[...c.phases],operators:[...c.operators]};
}
export function loopContracts(){
  return Object.fromEntries(Object.keys(CONTRACTS).map(k=>[k,loopContract(k)]));
}

const n=v=>Number.isFinite(Number(v))?Number(v):0;
const bounded=(value,target)=>({value:Math.max(0,n(value)),target:target==null?null:Math.max(0,n(target))});

/**
 * Partition engine sequence movement around one release.
 * LIVE seq increments by |turn steps| and once for each release. event.id equals
 * the seq immediately after that release, so motion after a release can be kept
 * for the next round even when polling observes both in one sample.
 */
export function partitionTurnDelta(previousSeq,currentSeq,releaseSeq=null){
  const prev=n(previousSeq),cur=n(currentSeq);
  if(!(cur>prev))return {before:0,after:0,total:0};
  const rel=Number(releaseSeq);
  if(!Number.isFinite(rel)||rel<=prev||rel>cur){
    const total=cur-prev;return {before:total,after:0,total};
  }
  const before=Math.max(0,rel-prev-1),after=Math.max(0,cur-rel);
  return {before,after,total:before+after};
}

export function loopWitness(mode,state={}){
  const m=normalizeLoopMode(mode),contract=loopContract(m),active=!!state.active,ended=!!state.ended;
  let phase=contract.phases[0],progress=bounded(0,null),success=bounded(0,null),clear=null;

  if(m==='PLAY'){
    phase='RUN';progress=bounded(state.releases,RUN_LENGTH);success=bounded(state.hits,RUN_WIN_HITS);clear=state.win?.run?.clear??null;
  }else if(m==='PATH'){
    phase='PATH';progress=bounded(state.releases,PUZZLE_ROUNDS);success=bounded(state.stars,PUZZLE_WIN_STARS);clear=state.win?.path?.clear??null;
  }else if(m==='PUZZLE'){
    phase=state.hex?.phase==='CHANGE'?'CHANGE':'FORM';
    if(phase==='FORM'){
      progress=bounded(state.hex?.lines?.length,HEX_LINES);
      success=bounded(state.hex?.form?.matches,HEX_LINES);
      clear=ended?!!state.hex?.form?.clear:null;
    }else{
      const changed=state.hex?.change?.changed?.length??state.hex?.delta?.moving?.length??0;
      progress=bounded(state.hex?.moves,HEX_CHANGE_LIMIT);
      success=bounded(changed,HEX_CHANGE_TARGET);
      clear=ended?!!state.hex?.change?.clear:null;
    }
  }else if(m==='DUET'){
    phase='SYNC';progress=bounded(state.releases,DUET_ROUNDS);success=bounded(state.duet?.hits,DUET_WIN_HITS);clear=state.win?.duet?.clear??null;
  }else if(m==='GARDEN'){
    phase=state.garden?.choice?'CHOOSE':state.garden?.trait?'INHERIT':'OBSERVE';
    progress=bounded(state.garden?.generation,GARDEN_GENERATIONS);
    success=bounded(state.garden?.survived,GARDEN_SURVIVAL_TARGET);
    clear=state.win?.garden?.clear??null;
  }else{
    phase='OPEN';progress=bounded(state.releases,null);success=bounded(state.hits,null);clear=null;
  }

  return {
    schema:'0xxx0/fold-bloom-play-loop-witness/v0.1',
    version:PLAY_LOOP_CONTRACT_VERSION,
    authority:'DERIVED_WITNESS_ONLY',
    mode:m,
    archetype:contract.archetype,
    phase,
    status:ended?'COMPLETE':active?'ACTIVE':m==='GARDEN'&&state.garden?.choice?'CHOICE':'IDLE',
    terminal:contract.terminal,
    progress,
    success,
    clear,
    operators:[...contract.operators]
  };
}
