import {ring as R, constraints as C, history as H} from '../lib/interphase.mjs';
import {esc} from '../lib/dom.js';
export const daylineKey='poly-atlas-dayline-branch-i-public-v1';
const safeRoute=s=>typeof s==='string' && s.startsWith('/') && !s.startsWith('//') && !/[\\\u0000-\u0020]/.test(s);
export function daylineSnapshot(storage=localStorage){
  const raw=storage.getItem(daylineKey);if(!raw)return {tasks:[],anchors:[],state:{},meta:{}};
  const d=JSON.parse(raw);
  if(!d||!Array.isArray(d.tasks)||!Array.isArray(d.anchors)||!d.state||!d.meta)throw Error('Dayline source has invalid shape; open its owner');
  const ids=new Set();for(const t of d.tasks){if(typeof t.id!=='string'||typeof t.title!=='string'||ids.has(t.id))throw Error('Dayline task identity invalid');ids.add(t.id)}
  return d;
}
export function taskObject(t){return {schema:'interphase.object/v0.1',id:t.id,kind:'DAYLINE_TASK',title:t.title,thesis:String(t.notes||''),state:t.status==='done'?'RETURN':'SOURCE',provenance:{origin:'/dayline/',task:t.id,fingerprint:H.fingerprint(t)},payload:t};}
const point=(x,y)=>`${x.toFixed(2)} ${y.toFixed(2)}`;
export function causalOrder(nodes){
  const byId=new Map(nodes.map(n=>[n.id,n])),seen=new Set(),ordered=[];
  const visit=n=>{if(seen.has(n.id))return;seen.add(n.id);n.parents.forEach(id=>visit(byId.get(id)));ordered.push(n)};
  [...nodes].sort((a,b)=>a.id.localeCompare(b.id)).forEach(visit);
  return ordered;
}
export function historyDisc(nodes,head,selected){
  nodes=causalOrder(nodes);
  const positions=new Map(nodes.map((n,i)=>[n.id,R.polar(320,270,32+Math.sqrt(i)*39,-Math.PI/2+i*2.399963)]));
  const paths=nodes.flatMap(n=>n.parents.filter(p=>positions.has(p)).map(p=>`<path d="M${point(...positions.get(p))} L${point(...positions.get(n.id))}"/>`)).join('');
  const marks=nodes.map((n,i)=>{const [x,y]=positions.get(n.id);return `<g class="${n.id===head?'head':''} ${n.id===selected?'selected':''}"><circle cx="${x}" cy="${y}" r="${n.id===head?9:5}"/><text x="${x+13}" y="${y+3}">${i} · ${esc(n.op)}</text></g>`}).join('');
  return `<div class="instrument"><svg viewBox="0 0 640 540" role="img" aria-label="History spiral: actual parent edges, numbered causal receipts"><g class="edges">${paths}</g><g class="marks">${marks}</g></svg><div class="instrument-caption">SPIRAL · each mark is a receipt · lines are recorded parents</div></div><div class="receipt-picker">${nodes.map((n,i)=>`<button data-receipt="${esc(n.id)}" aria-pressed="${n.id===selected}">${i} ${esc(n.op)} · ${esc(n.snapshot.title)}</button>`).join('')}</div>`;
}
const minute=s=>{const m=/^(\d{2}):(\d{2})$/.exec(String(s||''));return m&&+m[1]<24&&+m[2]<60?+m[1]*60+ +m[2]:null;};
export function dayView(d,focus,folded=false){
  const lo=minute(d.meta.dayStart)??0,hi=minute(d.meta.dayEnd)??1440,span=Math.max(1,hi-lo);
  const items=d.tasks.map(t=>({t,a:minute(t.earliest),b:minute(t.latest)}));
  const points=items.map(({t,a,b},i)=>{
    if(a==null||b==null||b<=a)return '';
    const angle=-Math.PI+(R.clamp((a-lo)/span,0,1))*Math.PI;
    const [x,y]=folded?R.polar(320,390,290,angle):[90+R.clamp((a-lo)/span,0,1)*460,80+i*38];
    const [x2,y2]=folded?[320,390]:[90+R.clamp((b-lo)/span,0,1)*460,y];
    return `<g class="${t.id===focus?'selected':''} ${t.status==='done'?'done':''}"><path d="M${point(x,y)} L${point(x2,y2)}"/><circle cx="${x}" cy="${y}" r="5"/><text x="${x+9}" y="${y-9}">${esc(t.earliest)} · ${esc(t.title.slice(0,26))}</text></g>`;
  }).join('');
  const now=minute(d.state.now),nowMark=now==null?'':folded?(()=>{const [x,y]=R.polar(320,390,300,-Math.PI+R.clamp((now-lo)/span,0,1)*Math.PI);return `<path class="now" d="M320 390 L${point(x,y)}"/>`})():`<path class="now" d="M${90+R.clamp((now-lo)/span,0,1)*460} 45 V${Math.max(250,items.length*38+100)}"/>`;
  const height=folded?460:Math.max(300,items.length*38+120);
  return `<div class="instrument"><svg viewBox="0 0 640 ${height}" role="img" aria-label="${folded?'Fan: task window starts spread across the day':'Dayline: exact task windows on a linear time axis'}"><g class="marks">${points}${nowMark}</g></svg><div class="instrument-caption">${folded?'FAN · angle = earliest time · each rib = a task':'DAYLINE · horizontal distance = time · each line = earliest–latest window'} · NOW ${esc(d.state.now||'unset')}</div></div>${d.tasks.length?'':'<div class="empty">Your day is empty. Capture a real task in <a href="/dayline/">Dayline ↗</a>.</div>'}<div class="receipt-picker">${d.tasks.map(t=>`<div class="task-row"><button data-task="${esc(t.id)}" aria-pressed="${t.id===focus}">${esc(t.earliest)}–${esc(t.latest)} · ${esc(t.title)} · ${esc(t.status)}</button><a href="/dayline/?task=${encodeURIComponent(t.id)}">OPEN / ACT ↗</a></div>`).join('')}</div><p class="micro">Read from the existing Atlas Dayline source. Task changes happen in its owner. INTERPHASE edits are local drafts.</p>`;
}
export function axisView(routes,selection={}){
  const dimensions=['kind','state','family'];
  const model=C.evaluate({records:routes,dimensions,selection});
  return `<div class="axis"><h2>Find the smallest live set.</h2><p class="micro">Constraints use the same evaluator as AXIAL. Relax one constraint to return.</p>${dimensions.map(key=>`<label>${key}<select data-axis="${key}">${C.candidates(routes,key).map(v=>`<option value="${esc(v)}" ${selection[key]===v?'selected':''}>${esc(v)} · ${model.support[key][v]}</option>`).join('')}</select></label>`).join('')}<p>${model.survivors.length} objects · ${esc(model.status)}</p><div class="receipt-picker">${model.survivors.map(r=>`<button data-route="${esc(r.href)}">${esc(r.title)} <small>${esc(r.href)}</small></button>`).join('')}</div><a class="btn" href="/foundry/axial/">OPEN AXIAL ↗</a></div>`;
}
export function sourceAddress(source){
  if(source.kind==='DAYLINE_TASK')return '/dayline/?task='+encodeURIComponent(source.id);
  const href=source.provenance?.href||source.provenance?.origin;
  return safeRoute(href)?href:null;
}
