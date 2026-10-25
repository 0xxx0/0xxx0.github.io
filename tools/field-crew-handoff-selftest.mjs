import {compileCrewHandoff,projectCrewTurn} from '../lib/field-crew-handoff.mjs';

const assert=(v,m)=>{if(!v)throw new Error(m)};
const base={
  source_ref:'selftest:crew-turn',intent:'reduce one concrete reader friction',object_ref:'/docs/',
  contribution_class:'DELTA',evidence_class:'SPEC',
  delta_or_question:'make one existing READFIELD action easier to reach',proof_available:'selftest fixture',
  execution:{moves:[{id:'patch',label:'PATCH EXISTING HOST',authority:'EDIT',target:'/docs/',reversibility:'git revert TURN',commit_boundary:'HOST_NATIVE'}],selected_move_id:'patch',return_to:'/?focus=%2Fdocs%2F',evidence_refs:['fixture:reader']}
};
const edit=compileCrewHandoff(base);
assert(edit.status.state==='TURN_READY','selected EDIT');
const turn=projectCrewTurn(edit,'READFIELD');
assert(turn.schema==='field-crew-turn/v0.1','turn schema');
assert(turn.source.object==='/docs/'&&turn.source.owner==='READFIELD','source/owner');
assert(turn.turn.move.startsWith('EDIT · PATCH EXISTING HOST'),'move');
assert(turn.trace.status==='UNKNOWN'&&turn.trace.result==='NOT_EXECUTED','trace seed');
assert(String(turn.return.gate).startsWith('UNSPECIFIED:'),'non-effect unresolved gate preserved');
assert(turn.return.to==='/?focus=%2Fdocs%2F','return');

const effect=JSON.parse(JSON.stringify(base));
effect.execution.moves[0].authority='EFFECT';effect.execution.moves[0].label='SEND EXTERNAL EFFECT';
const blocked=compileCrewHandoff(effect);
assert(blocked.status.state==='HUMAN_REQUIRED','unspecified EFFECT blocked');
assert(blocked.status.requires[0].includes('UNSPECIFIED cannot cross an effect boundary'),'effect gate requirement');
let notReady=false;try{projectCrewTurn(blocked,'READFIELD')}catch(e){notReady=String(e.message).includes('FIELD_CREW_TURN_NOT_READY_HUMAN_REQUIRED')}
assert(notReady,'blocked effect no turn projection');

const explicitNone=JSON.parse(JSON.stringify(effect));explicitNone.waiting_on={class:'NONE'};
const effectReady=compileCrewHandoff(explicitNone);
assert(effectReady.status.state==='TURN_READY','explicit NONE effect');
assert(projectCrewTurn(effectReady,'READFIELD').turn.release==='HOST_NATIVE','release retained');

const choose=JSON.parse(JSON.stringify(base));choose.waiting_on={class:'CHOOSE',reason:'human must choose'};
assert(compileCrewHandoff(choose).status.state==='HUMAN_REQUIRED','CHOOSE blocked');

const tooMany=JSON.parse(JSON.stringify(base));
tooMany.execution.moves=[1,2,3,4].map(n=>({id:'m'+n,label:'MOVE '+n,authority:'VIEW',target:'/docs/',reversibility:'NONE',commit_boundary:'NONE'}));
tooMany.execution.selected_move_id=null;
let bounded=false;try{compileCrewHandoff(tooMany)}catch(e){bounded=String(e.message).includes('FIELD_HANDOFF_TOO_MANY_MOVES')}
assert(bounded,'>3 moves blocked');

const unresolved=JSON.parse(JSON.stringify(base));unresolved.object_ref='UNRESOLVED';
let sourceBlocked=false;try{compileCrewHandoff(unresolved)}catch(e){sourceBlocked=String(e.message).includes('FIELD_HANDOFF_UNRESOLVED_CANNOT_SELECT_TURN')}
assert(sourceBlocked,'unresolved selected turn blocked');

console.log('FIELD CREW HANDOFF / TURN SELFTEST PASS');
