import {appliedResearchFrame} from './kernel.mjs';

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

let hexByBin={};
fetch('/iching/hexagrams.json',{cache:'no-cache'}).then(r=>r.json()).then(d=>{for(const h of d.hexagrams||[])hexByBin[h.binary]=h;calculate()}).catch(()=>calculate());

function form(v){return String(v||'').split(',').map(x=>x.trim().toUpperCase()).filter(Boolean)}
function metric(k,v){return '<span class="m">'+esc(k)+' <b>'+esc(v)+'</b></span>'}
function hexLabel(binary){
  const h=hexByBin[binary];
  return h?'<a href="/iching/#h='+h.id+'"><b>'+esc(h.unicode+' '+h.name_zh+' · №'+h.id+' · '+h.name_en)+'</b></a>':'<b>'+esc(binary)+'</b>';
}
function calculate(){
  let trace=null,forecasts=[];try{trace=JSON.parse($('#trace').value)}catch(_){}try{forecasts=JSON.parse($('#forecasts').value)}catch(_){}
  const [layer,position]=String($('#target').value).split(',').map(Number);
  const frame=appliedResearchFrame({
    fromState:$('#fromState').value,toState:$('#toState').value,
    fromForm:form($('#fromForm').value),toForm:form($('#toForm').value),
    trace,target:{layer,position},nativeForecasts:forecasts
  });
  const s=frame.state,e=frame.exact,p=frame.step,j=frame.steering;
  if(!s?.ok){$('#stateOut').innerHTML='<h2>STATE</h2><span class="hot">'+esc(s?.reason)+'</span>';return}
  $('#stateOut').innerHTML='<h2>STATE</h2><div class="metrics">'+
    metric('d_H',s.metrics.hamming_distance)+metric('d_H/6',s.metrics.normalized_hamming)+
    metric('stable',s.metrics.stable_lines)+metric('STEP orders',s.metrics.one_line_step_orders)+
    metric('order ambiguity',s.metrics.step_order_ambiguity_bits+' bits')+
    '</div><code>'+esc(s.from.token+'  '+s.mask+'  →  '+s.to.token)+'</code>'+
    '<p>'+esc(s.formulas.one_line_step_orders)+'. The moving set specifies changed coordinates, not their temporal order.</p>';

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
}
$('#calc').onclick=calculate;
['#fromState','#toState','#fromForm','#toForm','#target'].forEach(id=>$(id).addEventListener('change',calculate));
calculate();
