import {appliedResearchFrame,steppedStatePath} from './kernel.mjs';
import {candidateEpochWitness,runLiveVerbCommutator} from './live-step-order.mjs';

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

let hexByBin={};
fetch('/iching/hexagrams.json',{cache:'no-cache'}).then(r=>r.json()).then(d=>{for(const h of d.hexagrams||[])hexByBin[h.binary]=h;calculate()}).catch(()=>calculate());

function form(v){return String(v||'').split(',').map(x=>x.trim().toUpperCase()).filter(Boolean)}
function metric(k,v){return '<span class="m">'+esc(k)+' <b>'+esc(v)+'</b></span>'}
function hexLabel(binary){
  const h=hexByBin[binary];
  return h?'<a href="/iching/#h='+h.id+'"><b>'+esc(h.unicode+' '+h.name_zh+' · №'+h.id+' · '+h.name_en)+'</b></a>':'<b>'+esc(binary)+'</b>';
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
    metric('selected order',path.selected_order.length?path.selected_order.map(x=>'L'+x).join('→'):'∅')+
    metric('possible orders',path.possible_one_line_orders)+metric('order info',path.order_ambiguity_bits+' bits')+
    '</div><p><code>'+esc(primary)+'</code></p>'+
    (alternate&&alternate!==primary?'<p class="cool">reverse order: <code>'+esc(alternate)+'</code></p>':'')+
    (rows?'<table><thead><tr><th>step</th><th>line</th><th>bit</th><th>Yi value</th><th>intermediate</th></tr></thead><tbody>'+rows+'</tbody></table>':'<p>Stable endpoint: no moving-line step required.</p>')+
    '<p>Same endpoints do not imply the same path. Intermediate state is evidence whenever downstream consequences can depend on order.</p>';
}

function calculate(){
  let trace=null,forecasts=[];try{trace=JSON.parse($('#trace').value)}catch(_){}try{forecasts=JSON.parse($('#forecasts').value)}catch(_){}
  const [layer,position]=String($('#target').value).split(',').map(Number);
  const frame=appliedResearchFrame({
    fromState:$('#fromState').value,toState:$('#toState').value,
    fromForm:form($('#fromForm').value),toForm:form($('#toForm').value),
    trace,target:{layer,position},nativeForecasts:forecasts
  });
  const s=frame.state,sp=frame.state_step,e=frame.exact,p=frame.step,j=frame.steering;
  if(!s?.ok){$('#stateOut').innerHTML='<h2>STATE</h2><span class="hot">'+esc(s?.reason)+'</span>';return}
  $('#stateOut').innerHTML='<h2>STATE</h2><div class="metrics">'+
    metric('d_H',s.metrics.hamming_distance)+metric('d_H/6',s.metrics.normalized_hamming)+
    metric('stable',s.metrics.stable_lines)+metric('STEP orders',s.metrics.one_line_step_orders)+
    metric('order ambiguity',s.metrics.step_order_ambiguity_bits+' bits')+
    '</div><code>'+esc(s.from.token+'  '+s.mask+'  →  '+s.to.token)+'</code>'+
    '<p>'+esc(s.formulas.one_line_step_orders)+'. The moving set specifies changed coordinates, not their temporal order.</p>'+
    (sp?.ok?statePathWitness(sp,s):'');

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
      '</div><p><code>4^6 = 4096 → 2^6 = 64; fiber = 64 exact forms / hexagram</code>. This loses 6 uniform-description bits. Loss does not imply uselessness; it means the quotient cannot silently become full control state.</p>'+
      '<table><thead><tr><th>step</th><th>address</th><th>exact edit</th><th>hex token</th><th>quotient moves?</th></tr></thead><tbody>'+rows+'</tbody></table>';
  }

  if(j?.ok){
    const rows=j.rows.map(x=>'<tr><td>'+x.rank+'</td><td>'+esc(x.token)+'</td><td>'+(x.conditional_weight==null?'—':x.conditional_weight)+'</td><td>'+esc(x.mapped_verb||'—')+'</td><td>'+x.native_candidate_count+'</td><td>'+esc(x.support)+'</td></tr>').join('');
    $('#steerOut').innerHTML='<h2>J-SPACE → NATIVE SUPPORT</h2><div class="metrics">'+metric('basis',j.weight_basis)+metric('top',j.top.status)+metric('candidate ambiguity',j.top.candidate_ambiguity_bits==null?'—':j.top.candidate_ambiguity_bits+' bits')+metric('mapped weight',j.mapped_weight??'—')+metric('host-supported weight',j.host_supported_weight??'—')+'</div>'+
      '<table><thead><tr><th>rank</th><th>token</th><th>top-k weight</th><th>mapped verb</th><th>candidates</th><th>support</th></tr></thead><tbody>'+rows+'</tbody></table>'+
      '<p>'+esc(j.formulas.warning)+'. '+esc(j.formulas.decision)+'.</p>';
  }else $('#steerOut').innerHTML='<h2>J-SPACE → NATIVE SUPPORT</h2><span class="hot">'+esc(j?.reason||'TRACE NOT PARSED')+'</span>';

  $('#residueOut').innerHTML='<h2>RESIDUE / NON-EQUIVALENCE</h2><ul>'+frame.residue.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>'+
    '<p>Alignment check: '+esc(JSON.stringify(frame.alignment))+'</p><p><a href="/fold-bloom/lab/?mode=DATA">↩ FIELD LAB / DATA</a> · <a href="/iching/">I CHING source lens →</a></p>';
  if($('#claimOut'))$('#claimOut').innerHTML='<h2>EVIDENCE LADDER · CURRENT</h2><table><tbody>'+
    '<tr><td>six-bit / hex state</td><td><b>DESCRIPTIVE LENS</b></td><td>native one-step control sufficiency already falsified</td></tr>'+
    '<tr><td>recent exact six-verb form</td><td><b>HISTORY WITNESS</b></td><td>also not sufficient native control state</td></tr>'+
    '<tr><td>native forecast aperture</td><td><b>ONE-EPOCH SUPPORT</b></td><td>alternatives expire and must be refreshed after commit</td></tr>'+
    '<tr><td>J-Lens arithmetic here</td><td><b>READ / SUPPORT HYPOTHESIS</b></td><td>default fixture is synthetic; real tiny-model smoke proves plumbing only</td></tr>'+
    '<tr><td>causal steering</td><td><b class="hot">BLOCKED</b></td><td>requires semantic evidence + real direction + controls + receipt</td></tr>'+
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
$('#commute').onclick=runOrderResearch;
$('#calc').onclick=calculate;
['#fromState','#toState','#fromForm','#toForm','#target'].forEach(id=>$(id).addEventListener('change',calculate));
calculate();
