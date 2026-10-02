import {transparentStateCalculation,stepOrderAt,steppedStatePath} from './kernel.mjs';
import {compareStatePaths} from './path-compare.mjs';

const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));
const metric=(k,v)=>'<span class="m">'+esc(k)+' <b>'+esc(v)+'</b></span>';
const token=b=>/^[01]{6}$/.test(String(b||''))?'H['+b.slice(0,3)+'|'+b.slice(3)+']':String(b||'—');
const lineOrder=xs=>(xs?.length?xs.map(x=>'L'+x).join('→'):'∅');

function stateLensHref(calc,order){
  if(!calc?.ok)return '/iching/';
  const q=new URLSearchParams({b:calc.from.binary,to:calc.to.binary});
  if(order?.length)q.set('order',order.join(','));
  return '/iching/#'+q.toString();
}

function labHref(calc,order){
  if(!calc?.ok)return '/fold-bloom/lab/?mode=DATA';
  const q=new URLSearchParams({
    mode:'DATA',
    stateFrom:calc.from.binary,
    stateTo:calc.to.binary
  });
  if(order?.length)q.set('stateOrder',order.join(','));
  return '/fold-bloom/lab/?'+q.toString();
}

function renderCounterpath(){
  const out=$('#counterpathOut');if(!out)return null;
  const calc=transparentStateCalculation($('#fromState')?.value,$('#toState')?.value);
  if(!calc?.ok){
    out.innerHTML='<h2>COUNTERPATH / COMMUTATOR</h2><p class="hot">'+esc(calc?.reason||'STATE ENDPOINTS REQUIRED')+'</p>';
    document.documentElement.dataset.changeCounterpath='invalid';
    return null;
  }
  const aIndex=Number($('#stateOrderIndex')?.value||0),bIndex=Number($('#counterOrderIndex')?.value||0);
  const orderA=stepOrderAt(calc.moving,aIndex),orderB=stepOrderAt(calc.moving,bIndex);
  if(orderA?.ok&&$('#stateOrderIndex'))$('#stateOrderIndex').value=String(orderA.index);
  if(orderB?.ok&&$('#counterOrderIndex'))$('#counterOrderIndex').value=String(orderB.index);
  const pathA=steppedStatePath($('#fromState').value,$('#toState').value,orderA?.order);
  const pathB=steppedStatePath($('#fromState').value,$('#toState').value,orderB?.order);
  const cmp=compareStatePaths(pathA,pathB);
  if(!cmp.ok){
    out.innerHTML='<h2>COUNTERPATH / COMMUTATOR</h2><p class="hot">'+esc(cmp.reason)+'</p>';
    document.documentElement.dataset.changeCounterpath='invalid';
    return cmp;
  }
  const rows=cmp.rows.map(r=>{
    const aPrefix=r.a_prefix.length?lineOrder(r.a_prefix):'START',bPrefix=r.b_prefix.length?lineOrder(r.b_prefix):'START';
    const residue=r.prefix_symmetric_difference.length?'L'+r.prefix_symmetric_difference.join(', L'):'∅';
    return '<tr><td>'+r.depth+'</td><td>'+esc(aPrefix)+'</td><td><code>'+esc(token(r.a_binary))+'</code></td><td>'+esc(bPrefix)+'</td><td><code>'+esc(token(r.b_binary))+'</code></td><td><b class="'+(r.hamming_distance?'hot':'cool')+'">'+r.hamming_distance+'</b></td><td>'+esc(residue)+'</td></tr>';
  }).join('');
  const rejoin=cmp.rejoin_depths.length?cmp.rejoin_depths.join(','):'—';
  const status=cmp.trajectory_equivalent?'SAME TRAJECTORY':'ABSTRACT PATHS DIVERGE';
  out.innerHTML='<h2>COUNTERPATH / COMMUTATOR · SAME ENDPOINTS, TWO ORDERS</h2>'+
    '<div class="metrics">'+
      metric('status',status)+
      metric('A',(cmp.path_a.index+1)+'/'+pathA.possible_one_line_orders+' · '+lineOrder(cmp.path_a.order))+
      metric('B',(cmp.path_b.index+1)+'/'+pathB.possible_one_line_orders+' · '+lineOrder(cmp.path_b.order))+
      metric('Kendall',cmp.order_distance.inversions+'/'+cmp.order_distance.max)+
      metric('path area',cmp.path_area_hamming+'/'+cmp.max_path_area_hamming)+
      metric('max d_H',cmp.max_intermediate_hamming)+
      metric('first split',cmp.first_divergence_depth??'—')+
      metric('rejoin',rejoin)+
    '</div>'+
    '<p><code>'+esc(cmp.formulas.order_distance)+'</code><br><code>'+esc(cmp.formulas.path_area)+'</code> · maximum <code>'+esc(cmp.formulas.max_path_area)+'</code>.</p>'+
    '<table><thead><tr><th>depth</th><th>A prefix</th><th>A state</th><th>B prefix</th><th>B state</th><th>d_H</th><th>prefix residue</th></tr></thead><tbody>'+rows+'</tbody></table>'+
    '<p><b>Boundary:</b> '+esc(cmp.law)+'. A J-space direction is not propagated down either counterpath because native/model support expires at the current host aperture.</p>'+
    '<p><a href="'+esc(stateLensHref(calc,cmp.path_a.order))+'">I CHING STATE LENS · A →</a> · <a href="'+esc(stateLensHref(calc,cmp.path_b.order))+'">I CHING STATE LENS · B →</a><br>'+
    '<a href="'+esc(labHref(calc,cmp.path_a.order))+'">↩ LAB · A</a> · <a href="'+esc(labHref(calc,cmp.path_b.order))+'">↩ LAB · B</a></p>'+
    '<button id="counterRunNative" type="button">TEST NATIVE ORDER CLASS BELOW · NO COMMIT</button>';
  $('#counterRunNative')?.addEventListener('click',()=>{
    $('#commute')?.click();
    $('#stepOrderOut')?.scrollIntoView({behavior:'smooth',block:'start'});
  });
  document.documentElement.dataset.changeCounterpath=cmp.trajectory_equivalent?'same':'divergent';
  return cmp;
}

for(const id of ['#fromState','#toState','#stateOrderIndex','#counterOrderIndex'])$(id)?.addEventListener('change',renderCounterpath);
$('#calc')?.addEventListener('click',renderCounterpath);
queueMicrotask(renderCounterpath);

window.FoldBloomCounterpath={render:renderCounterpath};
