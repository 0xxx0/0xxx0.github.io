import test from 'node:test';
import assert from 'node:assert/strict';
import {LIVE_CALCULUS_SCHEMA,forecastSeekDelta,recentExactForm,buildLiveCalculation,liveCalculationSummary} from '../live-calculus.js';

const history=verbs=>verbs.map((verb,i)=>({kind:'RELEASE',id:i+1,verb}));

test('recent six exact releases remain exact history while HEX is a lossy non-control quotient',()=>{
  const r=recentExactForm(history(['BLOOM','FOLD','SPLIT','RETURN','BLOOM','FOLD']));
  assert.equal(r.authority,'HISTORY_ONLY');
  assert.equal(r.complete,true);
  assert.deepEqual(r.verbs,['BLOOM','FOLD','SPLIT','RETURN','BLOOM','FOLD']);
  assert.equal(r.exact_token,'F[BLOOM|FOLD|SPLIT|RETURN|BLOOM|FOLD]');
  assert.equal(r.hex.token,'H[110|011]');
  assert.equal(r.hex.exact_forms_per_hexagram,64);
  assert.equal(r.hex.exact_space,4096);
  assert.equal(r.hex.quotient_space,64);
  assert.equal(r.hex.information_loss_bits,6);
  assert.equal(r.hex.control_sufficient,false);
  assert.match(r.hex.law,/history quotient/i);
});

test('partial release history refuses to pretend a complete HEX witness exists',()=>{
  const r=recentExactForm(history(['BLOOM','FOLD','SPLIT']));
  assert.equal(r.complete,false);
  assert.equal(r.count,3);
  assert.equal(r.hex,null);
  assert.equal(r.exact_token,null);
});

test('forecast seek delta chooses the shortest signed rotation without implying a release',()=>{
  assert.equal(forecastSeekDelta(0,0,12),0);
  assert.equal(forecastSeekDelta(0,1,12),-1);
  assert.equal(forecastSeekDelta(0,11,12),1);
  assert.equal(forecastSeekDelta(8,4,12),0);
  assert.equal(forecastSeekDelta(0,6,12),6);
  assert.equal(forecastSeekDelta(11,0,12),1);
});

test('LIVE calculus keeps native control, model support, history quotient and traversal authority separate',()=>{
  const nativeContext={
    authority:'NATIVE_EVIDENCE',seq:12,gate:4,rotation:8,targetType:1,charge:1.25,
    call:{verb:'FOLD',chain:2,candidates:1},
    forecasts:[
      {slot:1,verb:'BLOOM',chain:1,power:1,path:[1]},
      {slot:4,verb:'FOLD',chain:2,power:2,path:[4,5]},
      {slot:7,verb:'FOLD',chain:1,power:1.4,path:[7]},
      {slot:10,verb:'RETURN',chain:1,power:1.2,path:[10]}
    ]
  };
  const selected=nativeContext.forecasts[1];
  const steering={
    ok:true,authority:'PREVIEW',source:'TEST',direction_ref:'test://fold',verb:'FOLD',strength:1,
    candidate_count:2,candidate_ambiguity_bits:1,commit_operation:null
  };
  const traversal={
    mode:'RELEASE_STEP',grain:'PARAGRAPH',address:'read://x/paragraph/2',index:2,count:9,
    next_address:'read://x/paragraph/3',policy:'RELEASE_THEN_ONE_ADDRESS',
    law:'commit then advance one addressed paragraph'
  };
  const w=buildLiveCalculation({
    nativeContext,currentForecast:selected,
    history:history(['BLOOM','FOLD','SPLIT','RETURN','BLOOM','FOLD']),
    steering,traversal
  });
  assert.equal(w.schema,LIVE_CALCULUS_SCHEMA);
  assert.equal(w.authority,'WITNESS_ONLY');
  assert.equal(w.native.authority,'NATIVE_EVIDENCE');
  assert.equal(w.native.selected.verb,'FOLD');
  assert.equal(w.native.candidate_count,4);
  assert.equal(w.native.candidate_ambiguity_bits,2);
  assert.deepEqual(w.native.candidates_by_verb,{BLOOM:1,FOLD:2,SPLIT:0,RETURN:1});
  assert.equal(w.native.choice_aperture.authority,'HUMAN_NAVIGATION_ONLY');
  assert.equal(w.native.choice_aperture.all_before_one,true);
  assert.equal(w.native.choice_aperture.release_separate,true);
  assert.equal(w.native.candidates.length,4);
  assert.equal(w.native.candidates.find(x=>x.slot===4)?.seek_delta,0);
  assert.equal(w.native.candidates.find(x=>x.slot===4)?.steering_supported,false);
  assert.match(w.formulas.direct_seek,/never implies RELEASE/i);
  assert.equal(w.recent.authority,'HISTORY_ONLY');
  assert.equal(w.recent.hex.control_sufficient,false);
  assert.equal(w.steering.authority,'PREVIEW_ONLY');
  assert.equal(w.steering.native_candidate_count,2);
  assert.equal(w.steering.native_candidate_fraction,.5);
  assert.equal(w.steering.commit_operation,null);
  assert.equal(w.traversal.authority,'NAVIGATION_POLICY');
  assert.equal(w.traversal.policy,'RELEASE_THEN_ONE_ADDRESS');
  assert.equal(w.traversal.next_address,'read://x/paragraph/3');
  assert.match(w.formulas.hex_compression,/4\^6/);
  assert.match(w.formulas.release_step,/commit native LIVE operation first/i);
  const summary=liveCalculationSummary(w);
  assert.match(summary,/HERE FOLD×2/);
  assert.match(summary,/H\[110\|011\]/);
  assert.match(summary,/LENS FOLD 2\/4/);
  assert.match(summary,/RELEASE→STEP PARAGRAPH 3\/9/);
});
