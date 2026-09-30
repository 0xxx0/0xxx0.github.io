import {appliedResearchFrame,transparentStateCalculation,stepOrderAt,steppedStatePath} from './kernel.mjs';
import {candidateEpochWitness,runLiveVerbCommutator} from './live-step-order.mjs';
import {runLiveMacrostateSufficiency,runLiveForecastFactorization} from './live-sufficiency.mjs';

const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const traceFixture={
  schema:'field-jlens-trace/v0.1',trace_id:'synthetic-change-lab',
  model:{id:'Qwen/Qwen2.5-1.5B',revision:'SYNTHETIC',n_layers:28},
  lens:{id:'local/jlens-demo',revision:'SYNTHETIC',n_prompts:100,d_model:1536},
  source:{prompt:'choose one relation',token_count:4,token_ids:[1,2,3,4]},
  cells:[{layer:12,position:3,top:[
    {token_id:1,token:'FOLD',logit:4,rank:1},
    {token_id:2,token:'RETURN',logit:3,rank:2},
    {token_id:3,token:' weather',logit:2,rank:3}
  ]}]
};
const forecastFixture=[
  {slot:2,verb:'FOLD',chain:2,power:1.3},
  {slot:8,verb:'FOLD',chain:1,power:1.0},
  {slot:5,verb:'RETURN',chain:1,power:.9}
];
$('#trace').value=JSON.stringify(traceFixture,null,2);$('#forecasts').value=JSON.stringify(forecastFixture,null,2);

const boot=new URLSearchParams(location.search);
if(boot.get('from'))$('#fromState').value=boot.get('from');
if(boot.get('to'))$('#toState').value=boot.get('to');
if(boot.get('order'))$('#stateOrderIndex').value=boot.get('order');

let hexByBin={};
fetch('/iching/hexagrams.json',{cache:'no-cache'}).then(r=>r.json()).then(d=>{for(const h of d.hexagrams||[])hexByBin[h.binary]=h;calculate()}).catch(()=>calculate());

function form(v){return String(v||'').split(',').map(x=>x.trim().toUpperCase()).filter(Boolean)}
function metric(k,v){return '<span class="m">'+esc(k)+' <b>'+esc(v)+'</b></span>'}
function hexLabel(binary){
  const h=hexByBin[binary];
  return h?'<a href="/iching/#h='+h.id+'"><b>'+esc(h.unicode+' '+h.name_zh+' · №'+h.id+' · '+h.name_en)+'</b></a>':'<b>'+esc(binary)+'</b>';
}
function promotionWitness(g,source){
  if(!g)return '';
  const rows=(g.checks||[]).map(x=>'<tr><td>'+esc(x.id)+'</td><td><b class="'+(x.pass?'cool':'hot')+'">'+(x.pass?'PASS':'FAIL')+'</b></td><td>'+esc(x.observed==null?'—':x.observed)+'</td><td>'+esc(x.required==null?'—':x.required)+'</td></tr>').join('');
  return '<h2 style="margin-top:12px">CAUSAL PROMOTION GATE</h2><div class="metrics">'+
    metric('status',g.status)+metric('passed',g.summary?.passed??'—')+metric('failed',g.summary?.failed??'—')+
    metric('obligations',g.summary?.total??'—')+metric('evidence',source||'SUPPLIED')+
    '</div><table><thead><tr><th>obligation</th><th>result</th><th>observed</th><th>required</th></tr></thead><tbody>'+rows+'</tbody></table>'+
    '<p>'+esc(g.law)+'</p><p><b>Support ≠ permission.</b> A token may map to one lawful host candidate and still fail this independent causal-evidence gate.</p>';
}
function residueLadderWitness(ladder){
  if(!ladder?.levels?.length)return '<p class="hot">Residue ladder unavailable.</p>';
  const rows=ladder.levels.map((x,i)=>'<tr><td>'+(i+1)+'</td><td><b>'+esc(x.id)+'</b><br><span class="note">'+esc(x.claim||'')+'</span></td><td>'+esc(x.keeps||'—')+'</td><td>'+esc(x.drops||'—')+'</td><td>'+esc(x.authority||'—')+'</td></tr>').join('');
  return '<div class="metrics">'+metric('strongest claim',ladder.strongest_claim)+metric('levels',ladder.levels.length)+'</div>'+
    '<table><thead><tr><th>#</th><th>lens / claim</th><th>keeps</th><th>residue / drops</th><th>authority</th></tr></thead><tbody>'+rows+'</tbody></table>'+
    '<p>'+esc(ladder.law)+'</p>';
}

function statePathWitness(path,state){
  const fmt=p=>[path.from_token,...p.steps.map(x=>x.after_token)].join(' → ');
  const primary=fmt(path);
  let alternate=null;
  if(path.changed_lines.length>1){
    const reverse=steppedStatePath($('#fromState').value,$('#toState').value,[...path.changed_lines].reverse());
    if(reverse?.ok)alternate=fmt(reverse);
  }
  const rows=path.steps.map(x=>'<tr><td>'+x.step+'</td><td>L'+x.line+'</td><td>'+x.from_bit+'→'+x.to_bit+'</td><td>'+x.iching_line_value+'</td><td>'+esc(x.after_token)+'</td></tr>').join('');
  return '<h2 style="margin-top:12px">STATE STEP PATH</h2><div class="metrics">'+
    metric('path',String(path.selected_order_index+1)+'/'+path.possible_one_line_orders)+
    metric('selected order',path.selected_order.length?path.selected_order.map(x=>'L'+x).join('→'):'∅')+
    metric('possible orders',path.possible_one_line_orders)+metric('order info',path.order_ambiguity_bits+' bits')+
    '</div><p><code>'+esc(path.path_address)+'</code></p><p><code>'+esc(primary)+'</code></p>'+
    (alternate&&alternate!==primary?'<p class="cool">reverse order: <code>'+esc(alternate)+'</code></p>':'')+
    (rows?'<table><thead><tr><th>step</th><th>line</th><th>bit</th><th>Yi value</th><th>intermediate</th></tr></thead><tbody>'+rows+'</tbody></table>':'<p>Stable endpoint: no moving-line step required.</p>')+
    '<p>Same endpoints do not imply the same path. Intermediate state is evidence whenever downstream consequences can depend on order.</p>';
}


function stateFrontierWitness(frontier){
  if(!frontier?.ok)return '';
  const rows=frontier.candidates.map(x=>'<tr><td>L'+x.line+'</td><td>'+esc(x.transition)+' · '+x.iching_line_value+'</td><td>'+esc((x.before_trigram?.glyph||'')+' '+(x.before_trigram?.key||'OPEN')+' → '+(x.after_trigram?.glyph||'')+' '+(x.after_trigram?.key||'OPEN'))+'</td><td>'+esc(x.after_token)+'</td><td>'+x.future_paths_after+'</td><td>'+x.histories_collapsed_at_successor+'</td><td>'+esc(x.order_address_if_chosen||'—')+'</td></tr>').join('');
  return '<h2 style="margin-top:12px">CURRENT FRONTIER · ALL LAWFUL NEXT EDGES</h2><div class="metrics">'+
    metric('cursor',frontier.cursor)+metric('NEXT',frontier.candidates.length)+metric('future paths',frontier.current_future_paths)+
    metric('future order info',frontier.current_future_order_ambiguity_bits+' bits')+metric('histories collapsed here',frontier.current_histories_collapsed)+
    '</div><p><code>'+esc(frontier.current.address)+'</code> · <code>'+esc(frontier.current.token)+'</code></p>'+
    (rows?'<table><thead><tr><th>NEXT</th><th>line</th><th>trigram consequence</th><th>successor</th><th>future paths</th><th>histories at successor</th><th>path if chosen</th></tr></thead><tbody>'+rows+'</tbody></table>':'<p class="cool">Target reached. No lawful one-line successors remain inside this endpoint interval.</p>')+
    '<p>'+esc(frontier.law)+'</p>';
}
function exactFrontierWitness(frontier){
  if(!frontier?.ok)return '';
  const rows=frontier.candidates.map(x=>'<tr><td>L'+x.line+'</td><td>'+esc(x.from_verb+'→'+x.to_verb)+'</td><td>'+esc(x.after_token)+(x.quotient_changed?'':' · quotient residue')+'</td><td>'+(x.model_topk_conditional_weight==null?'—':x.model_topk_conditional_weight)+'</td><td>'+x.native_candidate_count+'</td><td>'+esc(x.support_status)+'</td><td>'+x.future_paths_after+'</td></tr>').join('');
  return '<h2 style="margin-top:12px">EXACT NEXT FRONTIER · J-SPACE / HOST SUPPORT OVERLAY</h2><div class="metrics">'+
    metric('cursor',frontier.cursor)+metric('NEXT',frontier.candidates.length)+metric('future exact orders',frontier.current_future_paths)+metric('authority',frontier.authority)+
    '</div>'+(rows?'<table><thead><tr><th>NEXT</th><th>exact edit</th><th>hex witness</th><th>top-k weight</th><th>native candidates</th><th>support</th><th>future orders</th></tr></thead><tbody>'+rows+'</tbody></table>':'<p class="cool">Exact target reached.</p>')+
    '<p>'+esc(frontier.law)+'</p><p><b>Epoch law:</b> any native-support annotation is valid only for the supplied current forecast aperture. A real commit requires a fresh host aperture before the next intent is interpreted.</p>';
}

function calculate(){
  let trace=null,forecasts=[];try{trace=JSON.parse($('#trace').value)}catch(_){}try{forecasts=JSON.parse($('#forecasts').value)}catch(_){}
  const [layer,position]=String($('#target').value).split(',').map(Number);
  const stateBase=transparentStateCalculation($('#fromState').value,$('#toState').value);
  const indexed=stateBase?.ok?stepOrderAt(stateBase.moving,Number($('#stateOrderIndex')?.value||0)):null;
  if(indexed?.ok&&$('#stateOrderIndex'))$('#stateOrderIndex').value=String(indexed.index);
  const frame=appliedResearchFrame({
    fromState:$('#fromState').value,toState:$('#toState').value,
    stateStepOrder:indexed?.ok?indexed.order:null,
    fromForm:form($('#fromForm').value),toForm:form($('#toForm').value),
    trace,target:{layer,position},nativeForecasts:forecasts
  });
  const s=frame.state,sp=frame.state_step,sf=frame.state_frontier,e=frame.exact,p=frame.step,xp=frame.exact_path_projection,ef=frame.exact_frontier,j=frame.steering,g=frame.promotion;
  if(!s?.ok){$('#stateOut').innerHTML='<h2>STATE</h2><span class="hot">'+esc(s?.reason)+'</span>';return}
  $('#stateOut').innerHTML='<h2>STATE</h2><div class="metrics">'+
    metric('d_H',s.metrics.hamming_distance)+metric('d_H/6',s.metrics.normalized_hamming)+
    metric('stable',s.metrics.stable_lines)+metric('STEP orders',s.metrics.one_line_step_orders)+
    metric('order ambiguity',s.metrics.step_order_ambiguity_bits+' bits')+
    '</div><code>'+esc(s.from.token+'  '+s.mask+'  →  '+s.to.token)+'</code>'+
    '<p>'+esc(s.formulas.one_line_step_orders)+'. The moving set specifies changed coordinates, not their temporal order.</p>'+
    (sp?.ok?statePathWitness(sp,s):'')+
    (sf?.ok?stateFrontierWitness(sf):'');

  const fromHex=hexLabel(s.from.binary),toHex=hexLabel(s.to.binary);
  $('#ichingOut').innerHTML='<h2>I CHING LOOKUP · NOT A CAST</h2><p>'+fromHex+'<br>→ '+toHex+'</p>'+
    '<div class="metrics">'+s.iching_projection.line_values.map((v,i)=>metric('L'+(i+1),v)).join('')+'</div>'+
    '<p>'+esc(s.iching_projection.law)+'</p>';

  if(e?.ok&&p?.ok){
    const rows=p.steps.map(x=>'<tr><td>'+x.step+'</td><td>L'+x.line+'</td><td>'+esc(x.from_verb+'→'+x.to_verb)+'</td><td>'+esc(x.before_token+'→'+x.after_token)+'</td><td>'+(x.quotient_changed?'YES':'NO · residue')+'</td></tr>').join('');
    $('#formOut').innerHTML='<h2>EXACT → QUOTIENT → STEP</h2><div class="metrics">'+
      metric('exact space',e.metrics.exact_state_count)+metric('hex quotient',e.metrics.quotient_state_count)+
      metric('fiber',e.metrics.exact_forms_per_hexagram+':1')+metric('uniform bits','12→6')+
      metric('exact edits',e.metrics.exact_changed_lines)+metric('visible quotient edits',e.metrics.quotient_changed_lines)+
      metric('invisible exact edits',e.metrics.quotient_invisible_exact_changes)+metric('exact STEP orders',p.possible_one_edit_orders)+
      (xp?.ok?metric('visible STEP orders',xp.quotient_visible_path_count)+metric('path fiber',xp.exact_paths_per_visible_path+'×')+metric('path loss',xp.path_information_loss_bits+' bits'):'')+
      '</div><p><code>4^6 = 4096 → 2^6 = 64; fiber = 64 exact forms / hexagram</code>. This loses 6 uniform-description bits. Loss does not imply uselessness; it means the quotient cannot silently become full control state.</p>'+
      (xp?.ok?'<p><code>'+esc(xp.formulas.path_fiber)+'</code>. '+esc(xp.law)+'</p>':'')+
      '<table><thead><tr><th>step</th><th>address</th><th>exact edit</th><th>hex token</th><th>quotient moves?</th></tr></thead><tbody>'+rows+'</tbody></table>'+
      (ef?.ok?exactFrontierWitness(ef):'');
  }

  if(j?.ok){
    const rows=j.rows.map(x=>'<tr><td>'+x.rank+'</td><td>'+esc(x.token)+'</td><td>'+(x.conditional_weight==null?'—':x.conditional_weight)+'</td><td>'+esc(x.mapped_verb||'—')+'</td><td>'+x.native_candidate_count+'</td><td>'+esc(x.support)+'</td></tr>').join('');
    $('#steerOut').innerHTML='<h2>J-SPACE → NATIVE SUPPORT</h2><div class="metrics">'+metric('basis',j.weight_basis)+metric('top',j.top.status)+metric('candidate ambiguity',j.top.candidate_ambiguity_bits==null?'—':j.top.candidate_ambiguity_bits+' bits')+metric('mapped weight',j.mapped_weight??'—')+metric('host-supported weight',j.host_supported_weight??'—')+'</div>'+
      '<table><thead><tr><th>rank</th><th>token</th><th>top-k weight</th><th>mapped verb</th><th>candidates</th><th>support</th></tr></thead><tbody>'+rows+'</tbody></table>'+
      '<p>'+esc(j.formulas.warning)+'. '+esc(j.formulas.decision)+'.</p>'+promotionWitness(g,frame.promotion_evidence_source);
  }else $('#steerOut').innerHTML='<h2>J-SPACE → NATIVE SUPPORT</h2><span class="hot">'+esc(j?.reason||'TRACE NOT PARSED')+'</span>'+promotionWitness(g,frame.promotion_evidence_source);

  $('#residueOut').innerHTML='<h2>RESIDUE LADDER · WHAT EACH READING CANNOT CARRY</h2>'+
    '<p>Zooming out is lawful only when the discarded detail stays named. The ladder below is a witness of compression/support boundaries, not a universal ontology.</p>'+
    residueLadderWitness(frame.residue_ladder)+
    '<details><summary>DECLARED NON-EQUIVALENCES</summary><ul>'+frame.residue.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></details>'+
    '<p>Alignment check: '+esc(JSON.stringify(frame.alignment))+'</p><p><a href="/fold-bloom/lab/?mode=DATA">↩ FIELD LAB / DATA</a> · <a href="/iching/">I CHING source lens →</a></p>';
  if($('#claimOut'))$('#claimOut').innerHTML='<h2>EVIDENCE LADDER · CURRENT</h2><table><tbody>'+
    '<tr><td>six-bit / hex state</td><td><b>DESCRIPTIVE LENS</b></td><td>native one-step control sufficiency already falsified</td></tr>'+
    '<tr><td>recent exact six-verb form</td><td><b>HISTORY WITNESS</b></td><td>also not sufficient native control state</td></tr>'+
    '<tr><td>native forecast aperture</td><td><b>ONE-EPOCH SUPPORT</b></td><td>alternatives expire and must be refreshed after commit</td></tr>'+
    '<tr><td>J-Lens arithmetic here</td><td><b>READ / SUPPORT HYPOTHESIS</b></td><td>default fixture is synthetic; real Qwen2.5-1.5B read trace exists but has no control-verb top-8 hit and remains observation-only</td></tr>'+
    '<tr><td>causal steering</td><td><b class="'+(g?.eligible?'cool':'hot')+'">'+esc(g?.status||'UNKNOWN')+'</b></td><td>'+esc(g?.summary?g.summary.failed+'/'+g.summary.total+' promotion obligations fail':'promotion evidence unavailable')+'</td></tr>'+
    '</tbody></table><p>The common primitive is not a common ontology: <code>STATE → APERTURE → INTENT → SUPPORT/AMBIGUITY → COMMIT → APERTURE′ → WITNESS → RETURN</code>.</p>';
}

function pathSummary(path){
  if(!path)return '—';
  const steps=(path.steps||[]).map(x=>x.requested_verb+'@'+x.chosen_slot+(x.candidate_count>1?' ['+x.candidate_count+' candidates]':'')).join(' → ');
  const call=path.final_aperture?.call;
  const tail=path.status==='COMPLETE'
    ?'target '+path.final_aperture.target_type+' · call '+(call?call.verb+'×'+call.chain:'OPEN')
    :'BLOCKED '+(path.blocked_verb||'')+' · '+(path.reason||'');
  return (steps||'∅')+' · '+tail;
}

function runSufficiencyResearch(){
  const macro=runLiveMacrostateSufficiency({seeds:64,rounds:24});
  const factor=runLiveForecastFactorization({seeds:64,rounds:24});
  const h=macro.hexCounterexample;
  const x=macro.exactCounterexample;
  let html='<h2>PROJECTION SUFFICIENCY → NATIVE FORECAST FACTOR</h2><div class="metrics">'+
    metric('snapshots',macro.samples)+
    metric('HEX sufficient?',macro.hexControlSufficient?'NOT FALSIFIED':'NO')+
    metric('recent exact form sufficient?',macro.exactRecentFormControlSufficient?'NOT FALSIFIED':'NO')+
    metric('topology factor',factor.topology_factor.reproduces_structural_forecasts?'PASS':'MISMATCH')+
    metric('full factor',factor.full_factor.reproduces_full_forecasts?'PASS':'MISMATCH')+
    metric('charge residue',factor.charge_residue.affects_full_forecast?'OBSERVED':'NOT SEEN')+
    '</div>';
  if(h){
    html+='<p><b>HEX COUNTEREXAMPLE:</b> <code>'+esc(h.macrostate)+'</code> labels two lawful snapshots with different native next-forecast apertures.</p>'+
      '<table><thead><tr><th>witness</th><th>seed / round</th><th>target</th><th>call</th><th>verbs</th><th>max chain</th></tr></thead><tbody>'+
      '<tr><td>A</td><td>'+h.a.seed+' / '+h.a.round+'</td><td>'+h.a.behavior.targetType+'</td><td>'+esc(JSON.stringify(h.a.behavior.call))+'</td><td>'+esc(JSON.stringify(h.a.behavior.verbs))+'</td><td>'+h.a.behavior.maxChain+'</td></tr>'+
      '<tr><td>B</td><td>'+h.b.seed+' / '+h.b.round+'</td><td>'+h.b.behavior.targetType+'</td><td>'+esc(JSON.stringify(h.b.behavior.call))+'</td><td>'+esc(JSON.stringify(h.b.behavior.verbs))+'</td><td>'+h.b.behavior.maxChain+'</td></tr>'+
      '</tbody></table>';
  }
  if(x) html+='<p><b>Recent exact-form history also collapses unequal native futures.</b> History is evidence, not the live control aperture.</p>';
  html+='<h2 style="margin-top:12px">MECHANISTIC FACTORIZATION</h2>'+
    '<p><code>STRUCTURAL FORECAST = f(cell types, target type, anchors, creases)</code></p>'+
    '<p><code>FULL FORECAST = f(structural factor, charge)</code></p>'+
    '<div class="metrics">'+
      metric('structural fields',factor.topology_factor.fields.join(' · '))+
      metric('full adds','charge')+
      '</div>'+
    '<p>'+esc(factor.law)+'</p>'+
    '<p><b>Boundary:</b> this factor reconstructs <code>availableForecasts()</code> for the current engine. It does not claim minimality, current gate alignment, CALL/history, release mutation, source timing, or presentation. After any real RELEASE, recompute the native aperture.</p>'+
    '<p><b>J-space consequence:</b> model readout may annotate candidates inside this native aperture. It does not replace the factor, select an edge, or carry support across the next commit.</p>';
  $('#sufficiencyOut').innerHTML=html;
}

function runOrderResearch(){
  const epoch=candidateEpochWitness();
  const search=runLiveVerbCommutator({seeds:32,rounds:20,maxPairsPerState:6});
  const w=search.strongest_witness;
  let html='<h2>NATIVE STEP / ORDER</h2><div class="metrics">'+
    metric('pairs',search.tested_pairs)+metric('both defined',search.both_defined_pairs)+
    metric('noncommuting',search.noncommuting_pairs)+metric('domain-dependent',search.domain_dependent_pairs)+
    metric('resolver',search.resolver)+'</div>';
  if(epoch.ok){
    html+='<p><b>FORECAST EPOCH:</b> '+esc(epoch.committed.verb+'@'+epoch.committed.slot)+
      ' commits target '+esc(epoch.old_target_type)+'→'+esc(epoch.new_target_type)+
      '; sibling '+esc(epoch.sibling_before.verb+'@'+epoch.sibling_before.slot)+
      ' survives? <b>'+esc(epoch.sibling_remains_supported?'YES':'NO')+'</b>.</p>'+
      '<p>'+esc(epoch.law)+'</p>';
  }
  if(w){
    html+='<p><b>'+esc(w.classification)+'</b> · seed '+esc(w.seed)+' · round '+esc(w.round)+
      ' · intents '+esc(w.intents.join(' ↔ '))+'</p>'+
      '<table><thead><tr><th>order</th><th>witness</th></tr></thead><tbody>'+
      '<tr><td>'+esc(w.intents.join(' → '))+'</td><td>'+esc(pathSummary(w.forward))+'</td></tr>'+
      '<tr><td>'+esc([...w.intents].reverse().join(' → '))+'</td><td>'+esc(pathSummary(w.reverse))+'</td></tr>'+
      '</tbody></table><p>'+esc(w.law)+'</p>';
  }else html+='<p class="hot">No distinct-verb order witness found in this bounded search.</p>';
  html+='<p>Interpretation: a forecast set is one decision aperture, not a queue. Multi-step STEP research must either preserve explicit edit operators or declare how a higher-level intent is re-resolved after every commit.</p>';
  $('#stepOrderOut').innerHTML=html;
}
$('#sufficiency').onclick=runSufficiencyResearch;
$('#commute').onclick=runOrderResearch;
$('#calc').onclick=calculate;
['#fromState','#toState','#stateOrderIndex','#fromForm','#toForm','#target'].forEach(id=>$(id).addEventListener('change',calculate));
calculate();
