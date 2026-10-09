// Recovered from omega-interphase-v0.4.html (2026-09-10), adapted to an existing host.
// Private seed corpus stays out of the public repository. Imports remain device-local.
const specification = {"qtypes":[{"id":"Q0","name":"PURPOSE","question":"What must become possible, decidable, buildable or recoverable after this work?","output":"task contract + success/failure observable","failure":"artifact without downstream state change"},{"id":"Q1","name":"IDENTITY","question":"What exactly is the thing independent of its current name, view, file, glyph or implementation?","output":"stable identity + aliases + manifestations","failure":"names become ontology or distinct evidence is deduplicated"},{"id":"Q2","name":"STRUCTURE","question":"Which relations are asserted, derived, spatial, temporal, causal, compositional or merely visual adjacency?","output":"typed directed relations + provenance","failure":"proximity masquerades as meaning"},{"id":"Q3","name":"TRANSFORM","question":"What changes, by which operator, and what must remain invariant through the transformation?","output":"transform + invariants + loss/reversal record","failure":"analogy promoted to algebra"},{"id":"Q4","name":"EVIDENCE","question":"Why may this be believed, from where, when was it valid, and how was it derived?","output":"source-returnable bitemporal lineage","failure":"evidence laundering or stale state"},{"id":"Q5","name":"COMPACTION","question":"What can disappear, aggregate or regenerate without crossing the task's distortion budget?","output":"smallest representation meeting recovery thresholds","failure":"semantic collapse"},{"id":"Q6","name":"PERCEPTION","question":"Which perceptual channel makes each required distinction fast, reliable and robust under the actual medium?","output":"channel contract + decoder + degradation limits","failure":"beauty mistaken for comprehension"},{"id":"Q7","name":"FALSIFY","question":"What is missing, contradictory, stale, ambiguous or still worth searching for—and what would disconfirm the current model?","output":"bounded probe + stop/revision criterion","failure":"endless search or forced reconciliation"},{"id":"Q8","name":"RETURN","question":"What durable state change, artifact, test or receipt closes the loop and enables the next move?","output":"verified return + residual open state","failure":"research terminates in prose"}],"qoperators":[{"id":"OP_IDENTIFY","mark":"I","name":"IDENTIFY","question_form":"What is this; what is its stable identity or class?","returns":"identity/type"},{"id":"OP_LOCATE","mark":"L","name":"LOCATE","question_form":"Where/when is the relevant source, state, region or event?","returns":"address/span/time"},{"id":"OP_COMPARE","mark":"C","name":"COMPARE","question_form":"Which distinctions between candidates matter under the task?","returns":"difference/order"},{"id":"OP_DECOMPOSE","mark":"D","name":"DECOMPOSE","question_form":"What parts, generators, constraints or latent variables produce this?","returns":"components/factors"},{"id":"OP_TRACE","mark":"T","name":"TRACE","question_form":"Through which lineage, path, dependency or causal sequence did this arise?","returns":"path/lineage"},{"id":"OP_TRANSFORM","mark":"X","name":"TRANSFORM","question_form":"What operation converts the current state to the target while preserving named invariants?","returns":"operator/state transition"},{"id":"OP_DESIGN","mark":"G","name":"DESIGN","question_form":"What construct satisfies this task contract and failure envelope?","returns":"candidate artifact/system"},{"id":"OP_OPTIMIZE","mark":"O","name":"OPTIMIZE","question_form":"Which feasible candidate best satisfies explicit objectives and constraints?","returns":"choice/Pareto set"},{"id":"OP_PREDICT","mark":"P","name":"PREDICT","question_form":"What follows under this model, intervention or trajectory?","returns":"forecast/consequence"},{"id":"OP_FALSIFY","mark":"F","name":"FALSIFY","question_form":"What observation or test would reject or revise this claim/model?","returns":"probe/revision trigger"},{"id":"OP_RECOVER","mark":"R","name":"RECOVER","question_form":"What prior decision, source, artifact or unfinished state must be reconstructed?","returns":"recovered state + provenance"},{"id":"OP_SYNTHESIZE","mark":"S","name":"SYNTHESIZE","question_form":"What coherent result can be composed from several independently grounded parts?","returns":"composition + component lineage"}],"benchmark_primary_lens":{"factual_recovery":"Q1","source_recovery":"Q4","decision_rationale":"Q4","temporal_update":"Q4","contradiction":"Q7","open_loop":"Q8","artifact_recovery":"Q1","composed":"Q2"},"benchmark_operator":{"factual_recovery":"OP_RECOVER","source_recovery":"OP_LOCATE","decision_rationale":"OP_TRACE","temporal_update":"OP_TRACE","contradiction":"OP_COMPARE","open_loop":"OP_RECOVER","artifact_recovery":"OP_LOCATE","composed":"OP_SYNTHESIZE"},"channel_contract":{"schema":"omega.channel-contract.v1","purpose":"No visual feature may carry semantic meaning without an explicit decode, degradation and source-return contract.","required_fields":["id","semantic_target","visual_channel","decoder","degradation","source_return","precision_class","status"],"precision_classes":["exact","ordered","categorical","approximate","interface-only"],"status_values":["ADOPT","PROVISIONAL","TEST","UNASSIGNED","REJECT"],"channels":[{"id":"CH_TEXT_ID","semantic_target":"stable object/source identity","visual_channel":"literal text label / machine ID","decoder":"read exact label or ID","degradation":"must remain available through detail/source-return even if hidden at overview scale","source_return":"ID resolves to canonical semantic/source record","precision_class":"exact","status":"ADOPT"},{"id":"CH_RADIAL_DEPTH","semantic_target":"resolution/source depth L4→L0","visual_channel":"radial position","decoder":"move outward to descend toward episode/source; inward to task context","degradation":"ring labels remain textual; coarse ring membership must survive monochrome and low resolution","source_return":"selected identity remains stable while depth changes","precision_class":"ordered","status":"PROVISIONAL"},{"id":"CH_ANGLE_ADDRESS","semantic_target":"stable nominal address","visual_channel":"angle around DataDisc","decoder":"recognize/revisit stable location; do not compare angular magnitude","degradation":"exact identity always recoverable by label/search","source_return":"angle derives deterministically from stable ID","precision_class":"categorical","status":"TEST"},{"id":"CH_LINE_REL","semantic_target":"explicit typed relation","visual_channel":"continuous line + textual/redundant relation role","decoder":"follow endpoints and relation direction/type","degradation":"critical relation type cannot depend on color alone; source/trace view provides exact relation","source_return":"relation resolves to semantic relation record and its evidence","precision_class":"categorical","status":"ADOPT"},{"id":"CH_X_PROCESS","semantic_target":"process stage INPUT→FOCUS→OUTPUT","visual_channel":"horizontal position in FIELD/BRUSH","decoder":"left is evidence ingress; center is active task; right is forward transform/return","degradation":"stage labels remain present; direction survives monochrome","source_return":"left-side strands terminate in source/retrieval IDs","precision_class":"ordered","status":"PROVISIONAL"},{"id":"CH_PATH_TOPOLOGY","semantic_target":"branch/convergence/continuity of evidence or transform paths","visual_channel":"path topology","decoder":"continuous strands = tracked path; branching = alternatives; convergence = multiple paths arriving at same focus","degradation":"topological connectivity must survive grayscale and moderate downsampling","source_return":"each strand endpoint maps to an explicit retrieval/source identity","precision_class":"categorical","status":"TEST"},{"id":"CH_DASH_DERIVED","semantic_target":"derived/lower-priority computational relation","visual_channel":"dash pattern plus text/legend","decoder":"dashed path is non-authoritative/derived cue rather than asserted semantic edge","degradation":"legend/text must remain available; never rely on dash pattern for safety-critical meaning","source_return":"derived relation exposes generating query/operator","precision_class":"categorical","status":"PROVISIONAL"},{"id":"CH_ORANGE_FORWARD","semantic_target":"current forward/action emphasis","visual_channel":"orange accent","decoder":"attentional emphasis only; accompanying position/label defines semantics","degradation":"all meaning survives without color","source_return":"not applicable as evidence channel; selected action has textual identity","precision_class":"interface-only","status":"ADOPT"},{"id":"CH_BLUE_PROVENANCE","semantic_target":"provenance/audit emphasis","visual_channel":"ultramarine accent","decoder":"attentional emphasis only; accompanying source label/shape defines semantics","degradation":"all meaning survives without color","source_return":"source/gold lineage retains exact ID","precision_class":"interface-only","status":"ADOPT"},{"id":"CH_WIDTH_SALIENCE","semantic_target":"approximate task salience/rank only","visual_channel":"stroke width","decoder":"thicker may indicate stronger local emphasis, never an exact quantity","degradation":"ranking must also be available numerically/textually when needed","source_return":"rank derives from explicit retrieval result","precision_class":"approximate","status":"TEST"},{"id":"CH_DIFFUSION","semantic_target":"unassigned; candidate uncertainty/material transfer channel","visual_channel":"edge diffusion / ink spread","decoder":"none until calibrated","degradation":"treat as rendering noise/style before validation","source_return":"none","precision_class":"interface-only","status":"UNASSIGNED"}],"forbidden":["color-only encoding of critical state","visual proximity promoted to semantic relation","area/angle used for precision-critical quantities without redundant exact representation","dynamic layout position used as stable semantic identity","unvalidated texture/diffusion interpreted as uncertainty","glyph appearance used as canonical semantic ID"]}};
export function fieldSeed(objects) {
 const questions=objects.map(o=>({id:o.id,query:o.title+' · '+o.thesis,class:'source_recovery',gold_turn_ids:[],source:o}));
 return {...specification,questions,threads:[],rows:questions.map(q=>({id:q.id,top_hits:[],rank:null})),by_class:{},summary:[],raw_chars:0};
}
function admit(data,{rowsMayDiffer=false}={}){
 if(!Array.isArray(data.questions)||!data.questions.length||data.questions.length>10000)throw Error('1–10000 questions required');
 const ids=new Set();for(const q of data.questions){if(typeof q.id!=='string'||!q.id||typeof q.query!=='string'||typeof q.class!=='string'||ids.has(q.id))throw Error('unique textual questions required');ids.add(q.id);if(q.gold_turn_ids&&(!Array.isArray(q.gold_turn_ids)||q.gold_turn_ids.some(v=>typeof v!=='string')))throw Error('gold IDs must be textual array');}
 if(!Array.isArray(data.rows)||!Array.isArray(data.threads)||!data.by_class||!Array.isArray(data.summary))throw Error('snapshot needs rows, threads, by_class, summary');
 for(const t of data.threads)if(typeof t.conversation_id!=='string'||typeof t.title!=='string')throw Error('thread identity/title required');
 for(const r of data.rows){if(typeof r.id!=='string'||(!rowsMayDiffer&&!ids.has(r.id))||!Array.isArray(r.top_hits))throw Error('row/question mismatch');for(const h of r.top_hits)if(typeof h.unit_id!=='string'||typeof h.title!=='string'||(h.turn_index!=null&&!Number.isFinite(h.turn_index)))throw Error('hit identity/title required');for(const [key,v] of Object.entries(r)){if((key.includes('@')||['rank','latency_ms'].includes(key))&&v!=null&&typeof v!=='boolean'&&!Number.isFinite(v))throw Error('finite benchmark measure required');}}
 for(const stats of Object.values(data.by_class))for(const v of Object.values(stats))if(v!=null&&!Number.isFinite(v))throw Error('finite class measure required');
 for(const row of data.summary){if(typeof row.file!=='string')throw Error('representation file required');for(const [k,v] of Object.entries(row))if(k!=='file'&&v!=null&&!Number.isFinite(Number(v)))throw Error('finite summary measure required');}
 if(data.sources!=null){if(!Array.isArray(data.sources))throw Error('sources must be array');const refs=new Set();for(const source of data.sources){if(typeof source.unit_id!=='string'||typeof source.text!=='string'||refs.has(source.unit_id))throw Error('unique textual source units required');refs.add(source.unit_id)}}
 if(data.raw_chars!=null&&!Number.isFinite(data.raw_chars))throw Error('finite character count required');
}
export function mountResearch(root, seed, onSelect=()=>{}, onData=()=>{}, selectedId=seed.questions[0]?.id) {
 admit(seed);
 const events=new AbortController();
 root.classList.add('research');root.tabIndex=-1;
 root.innerHTML = "\n<div class=\"app\">\n  <header class=\"top\">\n    <div>\n      <div class=\"brandline\"><b>Ω // INTERPHASE 0.4 / RECOVERED</b> &nbsp; semantic compaction × perceptual action</div>\n      <h1>FORWARD <span class=\"orange\">CENTER</span> <span class=\"blue\">MASS</span></h1>\n    </div>\n    <div class=\"topmeta\" id=\"topmeta\"></div>\n  </header>\n\n  <nav class=\"kernel\" aria-label=\"kernel trajectory\">\n    <div class=\"kstep\"><b>INPUT</b><span>raw / event / corpus</span></div>\n    <div class=\"kstep\"><b>XFORM</b><span>register / lineage / retrieval</span></div>\n    <div class=\"kstep active\"><b>FOCUS</b><span>task-conditioned center mass</span></div>\n    <div class=\"kstep\"><b>OUTPUT</b><span>decision / artifact / test</span></div>\n  </nav>\n\n  <section class=\"shell\">\n    <aside class=\"rail left\">\n      <div class=\"railhead\"><div><div class=\"eyebrow\">INPUT / SELECT</div><h2>Question field</h2></div><button class=\"tiny\" id=\"importBtn\">IMPORT</button></div>\n      <div class=\"railbody\">\n        <input class=\"search\" id=\"search\" type=\"search\" placeholder=\"/ find question, class, thread…\" autocomplete=\"off\" />\n        <div class=\"filters\" id=\"filters\"></div>\n        <div class=\"qList\" id=\"qList\"></div>\n        <input class=\"fileInput\" id=\"fileInput\" type=\"file\" multiple accept=\".json,.jsonl,.csv\" />\n      </div>\n    </aside>\n\n    <main class=\"center\">\n      <div class=\"centerhead\">\n        <div><div class=\"eyebrow\">L4 / ACTIVE PROJECTION</div><h2 id=\"projectionTitle\">Focus</h2></div>\n        <div class=\"viewtabs\">\n          <button class=\"viewbtn active\" data-view=\"focus\">FOCUS</button>\n          <button class=\"viewbtn\" data-view=\"disc\">DISC</button>\n          <button class=\"viewbtn\" data-view=\"field\">FIELD</button>\n          <button class=\"viewbtn\" data-view=\"ledger\">LEDGER</button>\n        </div>\n      </div>\n      <div class=\"centerbody\" id=\"centerbody\"></div>\n    </main>\n\n    <aside class=\"rail right\">\n      <div class=\"railhead\"><div><div class=\"eyebrow\">OUTPUT / CONTROL</div><h2>Forward rail</h2></div><div class=\"filters\" style=\"margin:0\"><button class=\"modebtn active\" data-mode=\"operate\">OPERATE</button><button class=\"modebtn audit\" data-mode=\"audit\">AUDIT</button></div></div>\n      <div class=\"railbody\">\n        <div class=\"actionStack\">\n          <button class=\"action primary\" id=\"forwardBtn\"><b>→ Find weakest live case</b><span>center the next question most likely to expose missing machinery</span></button>\n          <details><summary>Depth / local marks</summary><button class=\"action\" id=\"queueBtn\"><b>+ Queue for R3</b><span>persistent local mark; does not mutate Ω source</span></button>\n          </details><button class=\"action\" id=\"packetBtn\"><b>⧉ Copy agent packet</b><span>query + retrieved source IDs + explicit epistemic status</span></button>\n          <button class=\"action\" id=\"turnBtn\"><b>↻ Turn projection</b><span>FOCUS → DISC → FIELD → LEDGER; selected identity stays fixed</span></button>\n          <details><summary>Descend</summary><button class=\"action\" id=\"depthBtn\"><b>↓ Descend toward source</b><span>L4 → L3 → L2 → L1 → L0</span></button></details>\n        </div>\n        <div class=\"stateBox\" id=\"stateBox\"></div>\n        <div class=\"stateBox\"><div class=\"eyebrow\">QUESTION LENS / Q0–Q8</div><div id=\"qLens\"></div></div>\n        <div class=\"stateBox\"><div class=\"eyebrow\">CHANNEL GATE</div><div id=\"channelGate\"></div></div>\n        <div class=\"stateBox\"><div class=\"eyebrow\">R3 QUEUE</div><div class=\"queue\" id=\"queue\"></div></div>\n        <div class=\"stateBox\"><div class=\"eyebrow\">AGENT / CONTEXT</div><div class=\"agentPacket\" id=\"agentPacket\"></div></div>\n      </div>\n    </aside>\n  </section>\n\n  <footer class=\"footer\">\n    <span>Authority remains below this interface. Projection never becomes evidence.</span>\n    <div class=\"keys\"><span><b class=\"key\">J/K</b> next/prev</span><span><b class=\"key\">[ ]</b> depth</span><span><b class=\"key\">V</b> turn</span><span><b class=\"key\">F</b> weakest</span><span><b class=\"key\">A</b> audit</span><span><b class=\"key\">C</b> copy packet</span></div>\n  </footer>\n</div>\n<div class=\"toast\" id=\"toast\"></div>\n";
 const readQueue=()=>{try{const q=JSON.parse(localStorage.getItem('omega.interphase.queue')||'[]');return Array.isArray(q)?q.filter(x=>typeof x==='string'):[]}catch{return[]}};
 const notify=()=>{const q=selectedQ();onSelect(q.source||{schema:'interphase.object/v0.1',id:q.id,kind:'RESEARCH_QUESTION',title:q.query,thesis:forwardStatement(q),state:'SOURCE',provenance:{origin:'local benchmark import',sourceRefs:q.gold_turn_ids||[]}})};
  'use strict';
  const $ = s => root.querySelector(s);
  const $$ = s => [...root.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pct = v => v == null ? '—' : (100*v).toFixed(v < .1 ? 1 : 0)+'%';
  const short = s => String(s||'').replace(/^chat:/,'').replace(/:turn:/,' · t');
  const classLabel = s => String(s||'').replaceAll('_',' ');
  const threadIdFromTurn = id => String(id||'').split(':turn:')[0];
  const stableAngle = str => { let h=2166136261; for(const c of str){h^=c.charCodeAt(0);h=Math.imul(h,16777619)} return ((h>>>0)%360)*Math.PI/180; };
  const views=['focus','disc','field','ledger'];
  const depths=[
    {id:'L4',name:'TASK',hint:'current question / decision'},
    {id:'L3',name:'LINEAGE',hint:'relations / retrieval / contradiction'},
    {id:'L2',name:'REGISTER',hint:'semantic atoms / future R3'},
    {id:'L1',name:'EPISODE',hint:'thread / episode packet'},
    {id:'L0',name:'SOURCE',hint:'exact turn / raw source'}
  ];
  let data = structuredClone(seed), sourceRef=null;
  let state={
    selected: data.questions.find(q=>q.id===selectedId)?.id || data.questions[0]?.id || null,
    filter:'all', search:'', view:'focus', depth:0, mode:'operate',
    queue: readQueue()
  };
  function row(q){return data.rows.find(r=>r.id===q.id)||{top_hits:[],rank:null,'coverage@10':0,'root_coverage@10':0,'hit@10':false};}
  function selectedQ(){return data.questions.find(q=>q.id===state.selected)||data.questions[0];}
  function threadFor(id){return data.threads.find(t=>`chat:${t.conversation_id}`===threadIdFromTurn(id));}
  function score(q){const r=row(q); const exact=Number(r['coverage@10']||0), root=Number(r['root_coverage@10']||0), hit=r['hit@10']?1:0; return exact*.55+root*.25+hit*.2;}
  function weakest(){const measured=data.questions.filter(q=>Number.isFinite(row(q)['coverage@10']));return [...(measured.length?measured:data.questions)].sort((a,b)=>score(a)-score(b) || a.id.localeCompare(b.id))[0];}
  function forwardStatement(q){
    const r=row(q), cls=q.class;
    if(cls==='composed') return 'Recover multiple required evidence components without allowing one lexical hit to masquerade as a complete answer.';
    if(cls==='open_loop') return 'Promote implicit unfinished work into an explicit ACT/QST register while retaining the turn that generated it.';
    if(cls==='temporal_update') return 'Separate current state from historical state; make supersession and valid-time visible before answering.';
    if(cls==='contradiction') return 'Keep both competing claims and expose the relation; do not collapse them into a synthetic compromise.';
    if(cls==='decision_rationale') return 'Bind the decision to its rationale and supporting source, not merely the final action phrase.';
    if(cls==='source_recovery') return 'Return the exact source turn with minimal semantic mediation.';
    if(cls==='artifact_recovery') return 'Recover artifact identity and state without reconstructing a fictional artifact from summary language.';
    return 'Answer from recoverable evidence, then descend to the exact turn that supports the answer.';
  }
  function render(){renderTop();renderFilters();renderQuestions();renderRight();renderCenter();syncControls();}
  function renderTop(){
    $('#forwardBtn').disabled=!data.rows.some(r=>Number.isFinite(r['coverage@10']));
    const weak=weakest(), wr=row(weak);
    $('#topmeta').innerHTML=`<span class="tag">${data.threads.length} THREADS</span><span class="tag">${data.questions.length} BENCH Q</span><span class="tag">${data.qtypes?.length||9} Q-FAMILIES</span><span class="tag">${data.qoperators?.length||12} OPS</span><span class="tag cold">${(data.raw_chars/1e6).toFixed(2)}M CHARS</span><span class="tag hot">WEAK ${esc(weak.id)} · ${pct(wr['coverage@10'])}</span>`;
  }
  function renderFilters(){
    const classes=['all',...new Set(data.questions.map(q=>q.class))];
    $('#filters').innerHTML=classes.map(c=>`<button class="chip ${state.filter===c?'active':''}" data-filter="${esc(c)}">${c==='all'?'ALL':esc(classLabel(c).toUpperCase())}</button>`).join('');
    $$('#filters [data-filter]').forEach(b=>b.onclick=()=>{state.filter=b.dataset.filter;render()});
  }
  function filteredQuestions(){
    const s=state.search.toLowerCase().trim();
    return data.questions.filter(q=>(state.filter==='all'||q.class===state.filter) && (!s || (q.id+' '+q.class+' '+q.query+' '+(threadFor(q.gold_turn_ids?.[0])?.title||'')).toLowerCase().includes(s)));
  }
  function renderQuestions(){
    const qs=filteredQuestions();
    $('#qList').innerHTML=qs.length?qs.map(q=>{const r=row(q);return `<button class="qitem ${q.id===state.selected?'active':''}" data-q="${esc(q.id)}"><div class="qid">${q.id}<div class="qclass">${pct(r['coverage@10'])}</div></div><div><div class="qtext">${esc(q.query)}</div><div class="qclass">${esc(classLabel(q.class))}</div></div></button>`}).join(''):`<div class="empty">No questions match this view.</div>`;
    $$('#qList [data-q]').forEach(b=>b.onclick=()=>{state.selected=b.dataset.q;notify();render()});
  }
  function renderRight(){
    const q=selectedQ(), r=row(q), weak=weakest();
    $('#stateBox').innerHTML=`<div class="eyebrow">STATE</div>
      <div class="stateLine"><span>identity</span><b>${esc(q.id)}</b></div>
      <div class="stateLine"><span>projection</span><b>${state.view.toUpperCase()}</b></div>
      <div class="stateLine"><span>depth</span><b>${depths[state.depth].id} / ${depths[state.depth].name}</b></div>
      <div class="stateLine"><span>mode</span><b>${state.mode.toUpperCase()}</b></div>
      <div class="stateLine"><span>R0 exact@10</span><b>${pct(r['coverage@10'])}</b></div>
      <div class="stateLine"><span>R0 root@10</span><b>${pct(r['root_coverage@10'])}</b></div>
      <div class="stateLine"><span>weakest</span><b>${esc(weak.id)}</b></div>`;
    const lensId=(data.benchmark_primary_lens||{})[q.class]||'Q0';
    const lens=(data.qtypes||[]).find(x=>x.id===lensId);
    const opId=(data.benchmark_operator||{})[q.class]||'OP_RECOVER';
    const op=(data.qoperators||[]).find(x=>x.id===opId);
    $('#qLens').innerHTML=(data.qtypes||[]).map(x=>`<div class="stateLine"><span>${x.id} ${esc(x.name)}</span><b class="${x.id===lensId?'hotText':''}">${x.id===lensId?'ACTIVE':'·'}</b></div>`).join('') + (lens?`<div class="micro"><b>${esc(lensId)}×${esc(op?.name||opId.replace('OP_',''))}</b><br>${esc(lens.question)}<br><span style="color:#666">${esc(op?.question_form||'')}</span></div>`:'');
    const activeChannels=state.view==='disc'?['CH_TEXT_ID','CH_RADIAL_DEPTH','CH_ANGLE_ADDRESS','CH_LINE_REL','CH_ORANGE_FORWARD','CH_BLUE_PROVENANCE']:
      state.view==='field'?['CH_TEXT_ID','CH_X_PROCESS','CH_PATH_TOPOLOGY','CH_DASH_DERIVED','CH_WIDTH_SALIENCE','CH_ORANGE_FORWARD','CH_BLUE_PROVENANCE']:
      state.view==='focus'?['CH_TEXT_ID','CH_ORANGE_FORWARD','CH_BLUE_PROVENANCE']:['CH_TEXT_ID'];
    const channels=(data.channel_contract?.channels||[]).filter(c=>activeChannels.includes(c.id));
    $('#channelGate').innerHTML=channels.map(c=>`<div class="stateLine"><span>${esc(c.id.replace('CH_',''))}</span><b>${esc(c.status)}</b></div>`).join('')+`<div class="micro">Every semantic mark requires decoder + degradation + source-return. <b>${(data.channel_contract?.forbidden||[]).length}</b> forbidden mappings loaded.</div>`;
    $('#queue').innerHTML=state.queue.length?state.queue.map(id=>`<div class="queueItem">${esc(id)}</div>`).join(''):`<div class="empty">No persistent marks.</div>`;
    $('#agentPacket').textContent=packet(q);
  }
  function packet(q){
    const r=row(q), hits=(r.top_hits||[]).slice(0,5);
    const lens=(data.benchmark_primary_lens||{})[q.class]||'Q0';
    const op=(data.benchmark_operator||{})[q.class]||'OP_RECOVER';
    return `Ω INTERPHASE PACKET\nstatus: derived task context; NOT evidence\nquestion: ${q.id} / ${q.class}\nresearch_lens: ${lens} × ${op}\nquery: ${q.query}\nprojection: ${state.view}\ndepth: ${depths[state.depth].id}\nretrieved:\n${hits.map((h,i)=>`${i+1}. ${h.unit_id} | ${h.title}`).join('\n')||'—'}\nnext: ${forwardStatement(q)}`;
  }
  function renderCenter(){
    $('#projectionTitle').textContent=state.view==='focus'?'Focus / center mass':state.view==='disc'?'DataDisc / source depth':state.view==='field'?'Field / brush topology':'Ledger / benchmark';
    if(state.view==='focus') renderFocus(); else if(state.view==='disc') renderDisc(); else if(state.view==='field') renderField(); else renderLedger();
  }
  function descent(q){
    const hits=row(q).top_hits||[],ref=sourceRef||hits[0]?.unit_id;
    const source=(data.sources||[]).find(s=>s.unit_id===ref);
    if(state.depth===0)return '';
    let content;
    if(state.depth===1)content=hits.map(h=>`<button class="action" data-ref="${esc(h.unit_id)}"><b>${esc(h.title)}</b><span>RETRIEVED_BY · ${esc(h.unit_id)} · relation is derived, not asserted support</span></button>`).join('')||'<p class="micro">No retrieved relations loaded.</p>';
    else if(state.depth===2)content=`<pre class="agentPacket">${esc(JSON.stringify({question:q.id,lens:(data.benchmark_primary_lens||{})[q.class]||'Q0',operator:(data.benchmark_operator||{})[q.class]||'OP_RECOVER',contract:'derived query context, not source evidence'},null,2))}</pre>`;
    else if(state.depth===3)content=`<pre class="agentPacket">${esc(JSON.stringify(threadFor(ref)||{id:threadIdFromTurn(ref),status:'Episode metadata not loaded'},null,2))}</pre>`;
    else content=`<div class="micro">${esc(ref||'No source selected')} · ${source?'IMPORTED SOURCE BYTES · hash/authenticity not independently verified':'RAW SOURCE NOT LOADED · import a sources array with unit_id and text'}</div>${source?`<pre class="agentPacket">${esc(source.text)}</pre>`:''}`;
    return `<section class="block descent"><div class="blockHead"><b>${depths[state.depth].id} / ${depths[state.depth].name}</b><span>same question · explicit source descent</span></div>${content}</section>`;
  }
  function renderFocus(){
    const q=selectedQ(), r=row(q), hits=(r.top_hits||[]).slice(0,10), classStats=data.by_class[q.class]||{};
    const gold=new Set(q.gold_turn_ids||[]);
    $('#centerbody').innerHTML=`<div class="focusView">
      <section class="mass">
        <div class="massTop"><span class="massFlag">FWD / CENTER MASS · ${esc(q.id)}</span><span class="massFlag">${esc(classLabel(q.class).toUpperCase())}</span></div>
        <h2>${esc(q.query)}</h2>
        <div class="massFoot"><span class="massTag">HIT@10 ${r['hit@10']==null?'UNKNOWN':r['hit@10']?'YES':'NO'}</span><span class="massTag">EXACT ${pct(r['coverage@10'])}</span><span class="massTag">ROOT ${pct(r['root_coverage@10'])}</span><span class="massTag">${depths[state.depth].id} ${depths[state.depth].name}</span></div>
      </section>
      <section class="forward">
        <div class="block nextAction"><div class="blockHead"><b>NEXT TRANSFORMATION</b><span>task-conditioned</span></div><div class="forwardStatement">${esc(forwardStatement(q))}</div><div class="micro">Do not optimize the interface around the answer. R3 extraction remains blind to this gold set.</div></div>
        <div class="block why"><div class="blockHead"><b>WHY THIS MATTERS</b><span>${esc(classLabel(q.class))}</span></div><div class="forwardStatement">Class exact recovery: ${pct(classStats['coverage@10'])}</div><div class="micro">Imported benchmark · ${classStats.n||'—'} cases · root recovery ${pct(classStats['root_coverage@10'])}</div></div>
      </section>
      <section class="block"><div class="blockHead"><b>RESOLUTION / DESCENT</b><span>one cursor, five layers</span></div><div class="depth">${depths.map((d,i)=>`<button class="depthbtn ${i===state.depth?'active':''}" data-depth="${i}"><b>${d.id} · ${d.name}</b><span>${d.hint}</span></button>`).join('')}</div></section>
      <section class="block"><div class="blockHead"><b>${state.mode==='audit'?'AUDIT: RETRIEVAL × GOLD':'R0 RETRIEVAL'}</b><span>${hits.length} / 10 shown</span></div><div class="hitList">${hits.map((h,i)=>{const isGold=gold.has(h.unit_id);return `<div class="hit"><div class="rank">${String(i+1).padStart(2,'0')}</div><div><div class="hitTitle">${esc(h.title)}</div><div class="hitId">${esc(short(h.unit_id))}</div></div>${state.mode==='audit'?`<span class="hitState ${isGold?'gold':'miss'}">${isGold?'GOLD':'OTHER'}</span>`:`<span class="hitState">TURN ${h.turn_index??'—'}</span>`}</div>`}).join('')||'<div class="empty">No retrieval row loaded.</div>'}</div></section>
      ${state.mode==='audit'?`<section class="block"><div class="blockHead"><b>GOLD LINEAGE</b><span>evaluation-only / hidden in operate mode</span></div><div class="hitList">${(q.gold_turn_ids||[]).map((id,i)=>{const t=threadFor(id);return `<div class="hit"><div class="rank">G${i+1}</div><div><div class="hitTitle">${esc(t?.title||'Unknown source')}</div><div class="hitId">${esc(short(id))}</div></div><span class="hitState gold">SOURCE</span></div>`}).join('')}</div></section>`:''}
    </div>`;
    $('#centerbody .focusView').insertAdjacentHTML('beforeend',descent(q));
    $$('[data-depth]').forEach(b=>b.onclick=()=>{state.depth=+b.dataset.depth;render()});
  }
  function renderDisc(){
    const q=selectedQ(), r=row(q), hits=(r.top_hits||[]).slice(0,10), gold=new Set(q.gold_turn_ids||[]);
    const W=1000,H=700,cx=500,cy=350;
    const rings=[72,150,245,315];
    const nodes=[];
    // retrieved turns occupy L3/L0-derived rings; thread roots occupy outer ring.
    hits.forEach((h,i)=>{const a=stableAngle(h.unit_id), rr=i<3?rings[1]:rings[2];nodes.push({kind:'hit',id:h.unit_id,label:`${i+1} ${h.title}`,x:cx+Math.cos(a)*rr,y:cy+Math.sin(a)*rr,gold:gold.has(h.unit_id),rank:i+1})});
    data.threads.forEach(t=>{const id=`chat:${t.conversation_id}`,a=stableAngle(id),rr=rings[3];nodes.push({kind:'thread',id,label:t.title,x:cx+Math.cos(a)*rr,y:cy+Math.sin(a)*rr})});
    const svg=[];
    svg.push(`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="DataDisc source depth projection">`);
    svg.push(`<defs><pattern id="dots" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#171717"/></pattern></defs><rect width="100%" height="100%" fill="url(#dots)"/>`);
    rings.forEach((rr,i)=>svg.push(`<circle cx="${cx}" cy="${cy}" r="${rr}" fill="none" stroke="${i===3?'#333':'#222'}" stroke-width="1"/><text x="${cx+rr+6}" y="${cy-4}" fill="#65625d" font-size="10" font-family="monospace">${['L4','L3','L1','L0/ROOT'][i]}</text>`));
    hits.forEach((h,i)=>{const n=nodes.find(n=>n.id===h.unit_id);svg.push(`<line x1="${cx}" y1="${cy}" x2="${n.x}" y2="${n.y}" stroke="${i<3?'#ff6426':'#383838'}" stroke-width="${i<3?1.5:1}" stroke-dasharray="${i<3?'0':'3 6'}" opacity=".75"/>`)});
    if(state.mode==='audit') (q.gold_turn_ids||[]).forEach(id=>{const root=threadIdFromTurn(id),t=nodes.find(n=>n.id===root); if(t) svg.push(`<line x1="${cx}" y1="${cy}" x2="${t.x}" y2="${t.y}" stroke="#315bff" stroke-width="2" opacity=".8"/>`)});
    nodes.filter(n=>n.kind==='thread').forEach(n=>svg.push(`<g><circle cx="${n.x}" cy="${n.y}" r="4" fill="#f3f0e8"/><text x="${n.x+7}" y="${n.y+3}" fill="#8f8c85" font-size="9" font-family="monospace">${esc(n.label.slice(0,28))}</text></g>`));
    nodes.filter(n=>n.kind==='hit').forEach(n=>svg.push(`<g data-ref="${esc(n.id)}" tabindex="0" role="button" aria-label="Open source ${esc(n.id)}"><rect x="${n.x-8}" y="${n.y-8}" width="16" height="16" rx="2" fill="${n.rank<=3?'#ff6426':'#101010'}" stroke="${state.mode==='audit'&&n.gold?'#315bff':'#777'}" stroke-width="${state.mode==='audit'&&n.gold?3:1}"/><text x="${n.x}" y="${n.y+3}" text-anchor="middle" fill="${n.rank<=3?'#050505':'#ddd'}" font-size="8" font-weight="800" font-family="monospace">${n.rank}</text></g>`));
    svg.push(`<g><circle cx="${cx}" cy="${cy}" r="58" fill="#f3f0e8"/><circle cx="${cx}" cy="${cy}" r="48" fill="none" stroke="#050505" stroke-width="1"/><text x="${cx}" y="${cy-8}" text-anchor="middle" fill="#050505" font-size="11" font-weight="900" font-family="monospace">${esc(q.id)}</text><text x="${cx}" y="${cy+9}" text-anchor="middle" fill="#050505" font-size="9" font-family="monospace">CENTER MASS</text></g>`);
    svg.push('</svg>');
    $('#centerbody').innerHTML=`<div class="discWrap"><div class="discStage">${svg.join('')}</div><div class="discLegend"><span class="legendItem"><i class="swatch orange"></i>top retrieval relation (derived)</span><span class="legendItem"><i class="swatch dash"></i>lower-ranked retrieval</span><span class="legendItem"><i class="swatch blue"></i>gold provenance only in AUDIT</span><span class="legendItem"><i class="swatch"></i>thread root / stable hash address</span></div></div>`;
  }
  function fieldY(id, top=115, bottom=585){const a=stableAngle(id)/(Math.PI*2);return top+a*(bottom-top)}
  function curve(x1,y1,x2,y2,b=.42){const dx=x2-x1;return `M ${x1.toFixed(1)},${y1.toFixed(1)} C ${(x1+dx*b).toFixed(1)},${y1.toFixed(1)} ${(x2-dx*b).toFixed(1)},${y2.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`}
  function renderField(){
    const q=selectedQ(), r=row(q), hits=(r.top_hits||[]).slice(0,10), gold=new Set(q.gold_turn_ids||[]);
    const W=1000,H=700,xin=90,xf=500,xout=910,cy=350;
    const roots=[...new Map(hits.map(h=>[threadIdFromTurn(h.unit_id),threadFor(h.unit_id)]).filter(x=>x[1])).entries()];
    const svg=[];
    svg.push(`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="FIELD BRUSH semantic evidence projection">`);
    svg.push(`<defs><pattern id="fdots" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#171717"/></pattern><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill="none" stroke="#f3f0e8" stroke-width="1.2"/></marker></defs><rect width="100%" height="100%" fill="url(#fdots)"/>`);
    svg.push(`<text x="55" y="48" fill="#96938b" font-size="10" font-family="monospace">INPUT / EVIDENCE</text><text x="500" y="48" text-anchor="middle" fill="#96938b" font-size="10" font-family="monospace">CENTER MASS</text><text x="945" y="48" text-anchor="end" fill="#96938b" font-size="10" font-family="monospace">OUTPUT / RETURN</text>`);
    svg.push(`<line x1="55" y1="66" x2="945" y2="66" stroke="#292929"/>`);
    // One bristle per retrieved turn: explicit derived retrieval relation, never semantic support by itself.
    hits.forEach((h,i)=>{const y1=fieldY(threadIdFromTurn(h.unit_id),105,595)+(i%3-1)*7; const y2=cy+(i-(hits.length-1)/2)*13; const isGold=gold.has(h.unit_id); const stroke=i<3?'#ff6426':'#77736d'; const dash=i<3?'':' stroke-dasharray="4 7"'; const width=i<3?1.8:1; svg.push(`<path d="${curve(xin,y1,xf-62,y2)}" fill="none" stroke="${stroke}" stroke-width="${width}" opacity="${i<3?.86:.48}"${dash}/>`); svg.push(`<circle cx="${xin}" cy="${y1.toFixed(1)}" r="${i<3?4:3}" fill="${i<3?'#ff6426':'#f3f0e8'}" stroke="${state.mode==='audit'&&isGold?'#315bff':'none'}" stroke-width="${state.mode==='audit'&&isGold?2:0}"/><text x="${xin+8}" y="${(y1+3).toFixed(1)}" fill="#8f8c85" font-size="8" font-family="monospace">${i+1} ${esc((threadFor(h.unit_id)?.title||h.title||'source').slice(0,34))}</text>`)});
    // Source-root backbone: stable nominal y address; no metric interpretation.
    roots.forEach(([id,t])=>{const y=fieldY(id,105,595);svg.push(`<line x1="${xin-24}" y1="${y.toFixed(1)}" x2="${xin}" y2="${y.toFixed(1)}" stroke="#454545"/><text x="${xin-28}" y="${(y+3).toFixed(1)}" text-anchor="end" fill="#56544f" font-size="7" font-family="monospace">ROOT</text>`)});
    if(state.mode==='audit') (q.gold_turn_ids||[]).forEach(id=>{const y=fieldY(threadIdFromTurn(id),105,595);svg.push(`<circle cx="${xin-14}" cy="${y.toFixed(1)}" r="5" fill="none" stroke="#315bff" stroke-width="1.5"/>`)});
    // The center remains task identity, not a knowledge node.
    svg.push(`<path d="M ${xf-74},${cy} C ${xf-45},${cy} ${xf-45},${cy} ${xf-35},${cy}" fill="none" stroke="#f3f0e8" stroke-width="2"/>`);
    svg.push(`<circle cx="${xf}" cy="${cy}" r="58" fill="#f3f0e8"/><circle cx="${xf}" cy="${cy}" r="48" fill="none" stroke="#050505"/><text x="${xf}" y="${cy-9}" text-anchor="middle" fill="#050505" font-size="11" font-weight="900" font-family="monospace">${esc(q.id)}</text><text x="${xf}" y="${cy+9}" text-anchor="middle" fill="#050505" font-size="8" font-family="monospace">${esc(((data.benchmark_primary_lens||{})[q.class]||'Q0')+' / '+classLabel(q.class).toUpperCase())}</text>`);
    // Forward vector is an operational transform, deliberately separate from evidence strands.
    svg.push(`<path d="M ${xf+66},${cy} C 675,${cy} 785,${cy} ${xout},${cy}" fill="none" stroke="#f3f0e8" stroke-width="2" marker-end="url(#arrow)"/><text x="${xout}" y="${cy-16}" text-anchor="end" fill="#f3f0e8" font-size="9" font-family="monospace">NEXT: ${esc(forwardStatement(q).slice(0,64))}</text>`);
    // Open-loop/contradiction discontinuity is redundant with an explicit label, not inferred from gap alone.
    if(['open_loop','contradiction'].includes(q.class)) svg.push(`<line x1="${xf+180}" y1="${cy-13}" x2="${xf+180}" y2="${cy+13}" stroke="#ff6426" stroke-width="3"/><text x="${xf+188}" y="${cy+4}" fill="#ff6426" font-size="8" font-family="monospace">${q.class==='open_loop'?'OPEN':'CONFLICT'}</text>`);
    svg.push(`<text x="55" y="665" fill="#65625d" font-size="9" font-family="monospace">x = ordered process stage · y = stable nominal address · strands = RETRIEVED_BY · topology = TEST · diffusion = UNASSIGNED</text>`);
    svg.push('</svg>');
    $('#centerbody').innerHTML=`<div class="discWrap"><div class="discStage">${svg.join('')}</div><div class="discLegend"><span class="legendItem"><i class="swatch orange"></i>top derived retrieval strands</span><span class="legendItem"><i class="swatch dash"></i>lower-rank derived retrieval</span><span class="legendItem"><i class="swatch blue"></i>audit-only gold source root</span><span class="legendItem">path continuity/branching is experimental; no diffusion semantics</span></div></div>`;
  }
  function renderLedger(){
    const entries=Object.entries(data.by_class);
    $('#centerbody').innerHTML=`<div class="ledger"><table class="matrix"><thead><tr><th>Task class</th><th>n</th><th>hit@10</th><th>root@10</th><th>exact@10</th><th>full@10</th><th>MRR</th><th>latency</th></tr></thead><tbody>${entries.map(([k,v])=>{const weak=(v['coverage@10']??1)<.5;return `<tr data-classrow="${esc(k)}"><td class="${weak?'weak':''}">${esc(classLabel(k))}</td><td>${v.n}</td><td>${pct(v['hit@10'])}</td><td>${pct(v['root_coverage@10'])}</td><td class="${weak?'weak':''}">${pct(v['coverage@10'])}</td><td>${pct(v['full@10'])}</td><td>${v.mrr==null?'—':v.mrr.toFixed(3)}</td><td>${v.mean_latency_ms==null?'—':v.mean_latency_ms.toFixed(2)+'ms'}</td></tr>`}).join('')}</tbody></table>
      <div class="block" style="margin-top:12px"><div class="blockHead"><b>REPRESENTATION FRONTIER / CURRENT CONTROLS</b><span>smaller is leftward; utility must survive</span></div><table class="matrix"><thead><tr><th>representation</th><th>char/raw</th><th>hit@10</th><th>root@10</th><th>exact@10</th><th>answer tokens</th></tr></thead><tbody>${data.summary.map(x=>`<tr><td>${esc(x.file.replace('results.','').replace('.json',''))}</td><td>${pct(+x.char_ratio)}</td><td>${pct(+x.hit10)}</td><td>${pct(+x.root_coverage10)}</td><td>${pct(+x.exact_coverage10)}</td><td>${pct(+x.answer_token_coverage10)}</td></tr>`).join('')}</tbody></table></div></div>`;
    $$('[data-classrow]').forEach(tr=>tr.onclick=()=>{state.filter=tr.dataset.classrow;state.view='focus';const q=filteredQuestions()[0];if(q)state.selected=q.id;render()});
  }
  function syncControls(){
    $$('.viewbtn').forEach(b=>b.classList.toggle('active',b.dataset.view===state.view));
    $$('.modebtn').forEach(b=>b.classList.toggle('active',b.dataset.mode===state.mode));
  }
  function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),1100)}
  function cycleView(delta=1){state.view=views[(views.indexOf(state.view)+delta+views.length)%views.length];render()}
  function moveQuestion(delta){const qs=filteredQuestions(); if(!qs.length)return; let i=qs.findIndex(q=>q.id===state.selected);i=(Math.max(0,i)+delta+qs.length)%qs.length;state.selected=qs[i].id;notify();render()}
  async function copyPacket(){try{await navigator.clipboard.writeText(packet(selectedQ()));toast('agent packet copied')}catch{toast('clipboard unavailable')}}
  function queueCurrent(){const id=selectedQ().id;if(!state.queue.includes(id))state.queue.push(id);else state.queue=state.queue.filter(x=>x!==id);try{localStorage.setItem('omega.interphase.queue',JSON.stringify(state.queue))}catch{toast('queue is session only')}render();toast(state.queue.includes(id)?'queued for R3':'removed from queue')}
  async function importFiles(files){
    for(const file of files){const text=await file.text();try{if(text.length>5000000)throw Error('Input exceeds 5 MB');
      if(file.name.endsWith('.jsonl')){const rows=text.split(/\r?\n/).filter(Boolean).map(JSON.parse);if(rows[0]?.query){admit({...data,questions:rows},{rowsMayDiffer:true});data.questions=rows.map(({source,...q})=>q);state.selected=rows[0]?.id||state.selected;notify();toast('questions loaded')}else toast('JSONL recognized; no view adapter yet')}
      else if(file.name.endsWith('.json')){const obj=JSON.parse(text);if(obj.questions)admit(obj);if(obj.questions&&Array.isArray(obj.rows)){admit(obj);data={...structuredClone(obj),...specification};data.questions=data.questions.map(({source,...q})=>q);state.selected=data.questions[0]?.id;notify();toast('snapshot loaded')}else if(obj.rows&&obj.by_class){const candidate={...data,rows:obj.rows,by_class:obj.by_class,raw_chars:obj.raw_chars??data.raw_chars};admit(candidate,{rowsMayDiffer:true});data=candidate;toast('benchmark result loaded')}else if(obj.sources){const candidate={...data,sources:obj.sources};admit(candidate,{rowsMayDiffer:true});data=candidate;toast('source units loaded')}else if(obj.conversations){const candidate={...data,threads:obj.conversations,raw_chars:obj.total_chars??data.raw_chars};admit(candidate,{rowsMayDiffer:true});data=candidate;toast('manifest loaded')}else toast('JSON recognized; no view adapter yet')}
      else if(file.name.endsWith('.csv')){throw Error('CSV has no benchmark contract; use JSON or JSONL')}
    }catch(e){toast('import rejected: '+e.message)}} onData(structuredClone(data));render();
  }
  $('#search').addEventListener('input',e=>{state.search=e.target.value;renderQuestions()});
  $$('.viewbtn').forEach(b=>b.onclick=()=>{state.view=b.dataset.view;render()});
  $$('.modebtn').forEach(b=>b.onclick=()=>{state.mode=b.dataset.mode;render()});
  $('#forwardBtn').onclick=()=>{const q=weakest();state.selected=q.id;state.view='focus';state.filter='all';notify();render();toast('weakest case centered')};
  $('#queueBtn').onclick=queueCurrent; $('#packetBtn').onclick=copyPacket; $('#turnBtn').onclick=()=>cycleView();
  $('#depthBtn').onclick=()=>{state.depth=Math.min(depths.length-1,state.depth+1);render()};
  $('#importBtn').onclick=()=>$('#fileInput').click(); $('#fileInput').onchange=e=>importFiles([...e.target.files]);
  root.addEventListener('keydown',e=>{
    if(e.target.closest('input,textarea,select,button'))return;
    const k=e.key.toLowerCase(); if(k==='j')moveQuestion(1); else if(k==='k')moveQuestion(-1); else if(k==='v')cycleView(); else if(k==='f')$('#forwardBtn').click(); else if(k==='a'){state.mode=state.mode==='audit'?'operate':'audit';render()} else if(k==='c')copyPacket(); else if(e.key==='['){state.depth=Math.max(0,state.depth-1);render()} else if(e.key===']'){state.depth=Math.min(depths.length-1,state.depth+1);render()} else if(e.key==='/'){e.preventDefault();$('#search').focus()}
  },{signal:events.signal});
  const chooseRef=e=>{const node=e.target.closest('[data-ref]');if(!node||e.type==='keydown'&&e.key!=='Enter')return;sourceRef=node.dataset.ref;state.depth=4;state.view='focus';render()};
  root.addEventListener('click',chooseRef,{signal:events.signal});root.addEventListener('keydown',chooseRef,{signal:events.signal});
  render();

notify();
return ()=>{events.abort();root.removeEventListener('click',chooseRef);root.removeEventListener('keydown',chooseRef);root.classList.remove('research')};
}
