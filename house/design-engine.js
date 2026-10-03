(function (root) {
  'use strict';

  const SCHEMA = 'house-design-trial/v0.1';
  const RETURN_SCHEMA = 'house-design-return/v0.1';
  const EFFECT_SCHEMA = 'house-design-effect/v0.1';
  const WITNESS_SCHEMA = 'house-design-witness/v0.1';
  const STORE_KEY = 'house.design.trials.v01';
  const DECISIONS = ['ADOPT', 'REVISE', 'REVERT', 'HOLD'];
  const REQUIRED = ['before', 'intent', 'change', 'verify', 'after', 'decision'];
  const CLAIM_TYPES = ['PHYSICAL_STATE_OBSERVED', 'TRIAL_CRITERION_EVALUATED', 'DIMENSIONAL_FIT_EVIDENCE_ATTACHED'];

  const now = () => new Date().toISOString();
  const clean = (v) => String(v == null ? '' : v).trim();
  const id = () => 'design-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);

  function newTrial(ctx) {
    ctx = ctx || {};
    return {
      schema: SCHEMA,
      id: id(),
      created_at: now(),
      updated_at: now(),
      address: clean(ctx.address),
      address_label: clean(ctx.label),
      projection: clean(ctx.projection || 'PLAN'),
      source_route: '/house/',
      before: '',
      intent: '',
      change: '',
      constraints: '',
      verify: '',
      after: '',
      decision: 'HOLD',
      fit_receipt: null,
      residue: '',
      authority: 'LOCAL_DESIGN_TRIAL_ONLY'
    };
  }

  function normalizeTrial(t, ctx) {
    const base = newTrial(ctx || {});
    const out = Object.assign(base, t || {});
    out.schema = SCHEMA;
    out.address = clean(out.address || (ctx && ctx.address));
    out.address_label = clean(out.address_label || (ctx && ctx.label));
    out.projection = clean(out.projection || (ctx && ctx.projection) || 'PLAN');
    out.before = clean(out.before);
    out.intent = clean(out.intent);
    out.change = clean(out.change);
    out.constraints = clean(out.constraints);
    out.verify = clean(out.verify);
    out.after = clean(out.after);
    out.residue = clean(out.residue);
    out.decision = DECISIONS.includes(out.decision) ? out.decision : 'HOLD';
    out.updated_at = clean(out.updated_at) || now();
    return out;
  }

  function validate(t) {
    const trial = normalizeTrial(t || {});
    const missing = REQUIRED.filter((k) => !clean(trial[k]));
    const ready = missing.length === 0;
    return {
      ready,
      missing,
      state: ready ? 'RETURN_READY' : (trial.before || trial.intent || trial.change ? 'IN_PROGRESS' : 'EMPTY')
    };
  }

  function attachFit(trial, receipt) {
    const t = normalizeTrial(trial || {});
    if (!receipt || receipt.schema !== 'house-shopping-fit-return/v0.1') return t;
    t.fit_receipt = {
      schema: receipt.schema,
      status: clean(receipt.status),
      address: clean(receipt.address || receipt.house_address || receipt.area),
      object_id: clean(receipt.object_id || (receipt.source && receipt.source.object_id)),
      candidate_mm: receipt.candidate_mm || receipt.candidate || null,
      available_mm: receipt.available_mm || receipt.available || null,
      rotated90: !!receipt.rotated90,
      evidence_only: true
    };
    t.updated_at = now();
    return t;
  }

  function effectRef(trial) {
    const t = normalizeTrial(trial || {});
    return 'house-design:' + clean(t.id) + ':' + clean(t.address);
  }

  function makeEffect(trial) {
    const t = normalizeTrial(trial || {});
    return {
      schema: EFFECT_SCHEMA,
      effect_ref: effectRef(t),
      trial_id: t.id,
      source_route: t.source_route || '/house/',
      address: t.address,
      address_label: t.address_label,
      projection: t.projection,
      before: t.before,
      intent: t.intent,
      intervention: t.change,
      constraints: t.constraints || null,
      authority: 'LOCAL_DESIGN_TRIAL_ONLY',
      retry_semantics: 'NEW_TRIAL_REQUIRED',
      law: 'Repeating or compensating this physical intervention is a new addressed trial; this effect grants no Home Assistant/HOUSEBUS actuation or retry authority.'
    };
  }

  function makeWitnesses(trial) {
    const t = normalizeTrial(trial || {});
    const ref = effectRef(t);
    const witnesses = [
      {
        schema: WITNESS_SCHEMA,
        witness_id: ref + ':after',
        effect_ref: ref,
        trial_id: t.id,
        address: t.address,
        claim_type: 'PHYSICAL_STATE_OBSERVED',
        issuer: 'LOCAL_HUMAN',
        recorded_at: t.updated_at,
        time_semantics: 'TRIAL_EDIT_TIME_NOT_INDEPENDENT_SENSOR_TIME',
        evidence: t.after,
        evidence_only: true,
        supports: ['The stated after-observation was recorded for this exact addressed trial.'],
        does_not_support: ['The intervention caused every observed change.', 'The intervention is structurally safe, code-compliant, or independently measured.']
      },
      {
        schema: WITNESS_SCHEMA,
        witness_id: ref + ':criterion',
        effect_ref: ref,
        trial_id: t.id,
        address: t.address,
        claim_type: 'TRIAL_CRITERION_EVALUATED',
        issuer: 'LOCAL_HUMAN',
        recorded_at: t.updated_at,
        time_semantics: 'TRIAL_EDIT_TIME_NOT_INDEPENDENT_SENSOR_TIME',
        criterion: t.verify,
        decision: t.decision,
        evidence: t.after,
        evidence_only: true,
        supports: ['The stated verification criterion was evaluated for this trial and paired with the recorded decision.'],
        does_not_support: ['ADOPT is structural/safety approval.', 'REVERT is an undo of an external physical effect.']
      }
    ];
    if (t.fit_receipt) {
      witnesses.push({
        schema: WITNESS_SCHEMA,
        witness_id: ref + ':fit',
        effect_ref: ref,
        trial_id: t.id,
        address: t.address,
        claim_type: 'DIMENSIONAL_FIT_EVIDENCE_ATTACHED',
        issuer: 'HOUSE_SHOPPING_FIT_RETURN',
        recorded_at: t.updated_at,
        evidence: t.fit_receipt,
        evidence_only: true,
        supports: ['A dimensional fit receipt was attached to this exact trial.'],
        does_not_support: ['Physical clearance was independently measured after the intervention.', 'Fit evidence grants actuation or adoption authority.']
      });
    }
    return witnesses;
  }

  function validateWitnessBinding(effect, witness) {
    const errors = [];
    if (!effect || effect.schema !== EFFECT_SCHEMA) errors.push('effect schema');
    if (!witness || witness.schema !== WITNESS_SCHEMA) errors.push('witness schema');
    if (!errors.length) {
      if (clean(witness.effect_ref) !== clean(effect.effect_ref)) errors.push('effect_ref');
      if (clean(witness.trial_id) !== clean(effect.trial_id)) errors.push('trial_id');
      if (clean(witness.address) !== clean(effect.address)) errors.push('address');
      if (!CLAIM_TYPES.includes(clean(witness.claim_type))) errors.push('claim_type');
      if (witness.evidence_only !== true) errors.push('evidence_only');
    }
    return { ok: errors.length === 0, errors };
  }

  function makeReturn(trial) {
    const t = normalizeTrial(trial || {});
    const check = validate(t);
    if (!check.ready) {
      const err = new Error('design trial incomplete: ' + check.missing.join(', '));
      err.code = 'INCOMPLETE_TRIAL';
      err.missing = check.missing;
      throw err;
    }
    const effect = makeEffect(t);
    const witnesses = makeWitnesses(t);
    const bad = witnesses.filter((w) => !validateWitnessBinding(effect, w).ok);
    if (bad.length) {
      const err = new Error('design witness binding failed');
      err.code = 'INVALID_WITNESS_BINDING';
      throw err;
    }
    return {
      schema: RETURN_SCHEMA,
      generated_at: now(),
      trial_id: t.id,
      address: t.address,
      address_label: t.address_label,
      projection: t.projection,
      before: t.before,
      intent: t.intent,
      intervention: t.change,
      constraints: t.constraints || null,
      verification: t.verify,
      after: t.after,
      decision: t.decision,
      fit_receipt: t.fit_receipt || null,
      residue: t.residue || null,
      evidence_class: 'LOCAL_HUMAN_OBSERVATION',
      effect,
      witnesses,
      claims: [
        'This receipt records an addressed design trial and its observed result.',
        'Witnesses are claim-scoped evidence attached to this exact trial; they do not create effect authority.',
        'ADOPT is a local human decision, not structural/safety approval.',
        'REVERT means a separate corrective trial is required; it is not an undo token for physical reality.',
        'No Home Assistant/HOUSEBUS actuation authority is granted.',
        'Canonical HOUSE geometry changes only after independent measurement/evidence update.'
      ],
      return_to: '/house/'
    };
  }

  const Core = { SCHEMA, RETURN_SCHEMA, EFFECT_SCHEMA, WITNESS_SCHEMA, STORE_KEY, DECISIONS, REQUIRED, CLAIM_TYPES, newTrial, normalizeTrial, validate, attachFit, effectRef, makeEffect, makeWitnesses, validateWitnessBinding, makeReturn };
  root.HouseDesignCore = Core;
  if (typeof module !== 'undefined' && module.exports) module.exports = Core;

  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const FLOW = [
    {key:'before',label:'BEFORE',hint:'OBSERVE',placeholder:'what is actually true now'},
    {key:'intent',label:'INTENT',hint:'PREFER',placeholder:'what should become easier?'},
    {key:'change',label:'CHANGE',hint:'TURN',placeholder:'smallest useful intervention'},
    {key:'verify',label:'VERIFY',hint:'TEST',placeholder:'what observation discriminates better / worse?'},
    {key:'after',label:'AFTER',hint:'OBSERVE',placeholder:'what changed in the world?'},
    {key:'decision',label:'DECIDE',hint:'RETURN',placeholder:''},
    {key:'return',label:'RETURN',hint:'EXPORT',placeholder:''}
  ];
  let context = root.HOUSE_CONTEXT || { address: '', label: '', projection: 'PLAN' };
  let trials = [];
  let activeId = null;
  let panel = null;
  let focusStep = null;

  function load() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
      trials = Array.isArray(parsed) ? parsed.map((t) => normalizeTrial(t)) : [];
    } catch (_) { trials = []; }
  }

  function persist() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(trials.slice(-40))); } catch (_) {}
  }

  function current() {
    return trials.find((t) => t.id === activeId) || null;
  }

  function latestForAddress(address) {
    return trials.filter((t) => t.address === address).sort((a,b) => String(b.updated_at).localeCompare(String(a.updated_at)))[0] || null;
  }

  function ensureActive(forceNew) {
    if (!context.address) return null;
    let t = !forceNew && latestForAddress(context.address);
    if (!t) {
      t = newTrial(context);
      trials.push(t);
      persist();
    }
    activeId = t.id;
    return t;
  }

  function inferredStep(t) {
    if (!t.before) return 'before';
    if (!t.intent) return 'intent';
    if (!t.change) return 'change';
    if (!t.verify) return 'verify';
    if (!t.after) return 'after';
    const check = validate(t);
    return check.ready ? 'return' : 'decision';
  }

  function style() {
    if (document.getElementById('houseDesignStyle')) return;
    const s = document.createElement('style');
    s.id = 'houseDesignStyle';
    s.textContent = `
    #designTrialPanel{overflow:hidden}
    .designTrial{display:grid;gap:8px}
    .designHead{display:flex;justify-content:space-between;gap:8px;align-items:start}
    .designState{font-size:8px;letter-spacing:.12em;color:var(--cool)}
    .designMeta{font-size:7px;color:var(--mut);margin-top:2px}
    .designFlow{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:2px;position:relative}
    .designFlow button{position:relative;min-width:0;padding:5px 1px;min-height:42px;border-color:#263137;background:#090e11;color:#718087;font-size:6px;letter-spacing:.06em;overflow:hidden}
    .designFlow button span{display:block;font-size:5px;color:#59666c;margin-top:2px}
    .designFlow button.done{color:#c8dde5;border-color:#47616c}.designFlow button.active{color:#f4f7f6;border-color:var(--vio,#b392d6);box-shadow:inset 0 -2px 0 rgba(179,146,214,.5)}
    .designFlow button.blocked{opacity:.45}
    .designEditor{border:1px solid var(--line);background:#091014;padding:8px;display:grid;gap:7px}
    .designEditor label{display:grid;gap:3px;color:var(--mut);font-size:8px;letter-spacing:.08em}
    .designEditor textarea,.designEditor select{width:100%;min-height:38px;resize:vertical;font:10px/1.4 system-ui,sans-serif;color:var(--ink);background:#0b0f12;border:1px solid var(--line);padding:7px}
    .designEditor textarea{min-height:58px}
    .designEditor .primary{border-color:var(--vio,#b392d6);color:#eadfff}
    .designActions{display:flex;gap:5px;flex-wrap:wrap}.designActions button{font-size:8px;min-height:30px}
    .fitAttached{border-left:2px solid var(--cool);padding-left:7px;color:#a8b0b4;font-size:9px}
    .designProof{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center}
    .designProof strong{font-size:9px}.designProof small{color:var(--mut);font-size:7px}
    @media(max-width:850px){.designFlow button{min-height:38px;font-size:5px}.designFlow button span{display:none}}
    `;
    document.head.appendChild(s);
  }

  function setField(k, v) {
    const t = current(); if (!t) return;
    t[k] = k === 'decision' ? (DECISIONS.includes(v) ? v : 'HOLD') : clean(v);
    t.updated_at = now();
    persist();
    render();
  }

  function download(name, obj) {
    const a = document.createElement('a');
    const blob = new Blob([JSON.stringify(obj, null, 2) + '\n'], { type: 'application/json' });
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }

  function statusFor(t,key){
    if(key==='return') return validate(t).ready ? 'done' : 'blocked';
    if(key==='decision') return t.after ? 'done' : 'blocked';
    return clean(t[key]) ? 'done' : '';
  }

  function editorMarkup(t,key,check){
    if(key==='return'){
      return '<div class="designEditor"><div class="designProof"><div><strong>'+esc(check.ready?'RETURN READY':'RETURN BLOCKED')+'</strong><br><small>'+esc(check.ready?'bounded physical delta can leave the local trial':'missing '+check.missing.join(' · '))+'</small></div><button class="primary" data-design-return '+(check.ready?'':'disabled')+'>EXPORT RETURN</button></div><div class="note">RETURN preserves the address, before/change/after, verification, decision and residue, then binds claim-scoped evidence to the exact trial. It never certifies structural, utility, fire, load or code fitness.</div></div>';
    }
    if(key==='decision'){
      return '<div class="designEditor"><label>DECISION<select data-design-field="decision">'+DECISIONS.map(d=>'<option '+(d===t.decision?'selected':'')+'>'+d+'</option>').join('')+'</select></label><label>RESIDUE · what remains unknown<textarea data-design-field="residue" placeholder="simulation gap / missing measure / side effect">'+esc(t.residue)+'</textarea></label><div class="designActions"><button data-step-next="return">REVIEW RETURN →</button></div></div>';
    }
    const def=FLOW.find(x=>x.key===key);
    const extra=key==='change'
      ? '<label>CONSTRAINTS · preserve<textarea data-design-field="constraints" placeholder="clearance, access, light, power, budget, safety">'+esc(t.constraints)+'</textarea></label>'+(t.fit_receipt?'<div class="fitAttached">FIT RECEIPT · '+esc(t.fit_receipt.status||'ATTACHED')+' · dimensional evidence only</div>':'')+'<div class="designActions"><button data-design-fit>ATTACH CURRENT FIT</button><button data-step-next="verify">VERIFY →</button></div>'
      : '<div class="designActions"><button data-step-next="'+esc(FLOW[FLOW.findIndex(x=>x.key===key)+1]?.key||'return')+'">NEXT →</button></div>';
    return '<div class="designEditor"><label>'+esc(def.label)+' · '+esc(def.hint)+'<textarea data-design-field="'+esc(key)+'" placeholder="'+esc(def.placeholder)+'">'+esc(t[key])+'</textarea></label>'+extra+'</div>';
  }

  function emitState(t,check){
    const detail={schema:'house-design-ui-state/v0.1',trial_id:t.id,address:t.address,state:check.state,missing:check.missing.slice(),decision:t.decision,focus_step:focusStep||inferredStep(t),updated_at:t.updated_at};
    root.HOUSE_DESIGN_STATE=detail;
    window.dispatchEvent(new CustomEvent('house:design-state',{detail}));
  }

  function bind(t) {
    panel.querySelectorAll('[data-design-field]').forEach((el) => {
      el.addEventListener('change', () => setField(el.dataset.designField, el.value));
    });
    panel.querySelectorAll('[data-design-step]').forEach((el)=>el.onclick=()=>{focusStep=el.dataset.designStep;render()});
    panel.querySelectorAll('[data-step-next]').forEach((el)=>el.onclick=()=>{focusStep=el.dataset.stepNext;render()});
    const n=panel.querySelector('[data-design-new]');if(n)n.onclick=()=>{ensureActive(true);focusStep='before';render()};
    const fit=panel.querySelector('[data-design-fit]');if(fit)fit.onclick=()=>{
      const cur=current(); if(!cur) return;
      let receipt=null;
      try { receipt=JSON.parse(sessionStorage.getItem('house.shopping.fit.return.v01')||'null'); } catch (_) {}
      const next=attachFit(cur,receipt);
      const i=trials.findIndex(x=>x.id===cur.id);if(i>=0)trials[i]=next;
      persist();focusStep='change';render();
    };
    const ret=panel.querySelector('[data-design-return]');if(ret)ret.onclick=()=>{
      const cur=current();if(!cur)return;
      try{const receipt=makeReturn(cur);download(receipt.trial_id+'.house-design-return.json',receipt)}
      catch(e){const msg=panel.querySelector('[data-design-msg]');if(msg)msg.textContent='RETURN BLOCKED · '+(e.missing||[]).join(' · ')}
    };
  }

  function render() {
    if (!panel) return;
    const t = ensureActive(false);
    if (!t) {
      panel.innerHTML = '<div class="k">DESIGN TRIAL · LOCAL</div><div class="note">Select a HOUSE address to begin.</div>';
      return;
    }
    t.address = context.address;
    t.address_label = context.label;
    t.projection = context.projection || t.projection;
    const check = validate(t);
    if(!focusStep)focusStep=inferredStep(t);
    const flow=FLOW.map(x=>{
      const status=statusFor(t,x.key);
      return '<button data-design-step="'+x.key+'" class="'+status+(focusStep===x.key?' active':'')+'">'+x.label+'<span>'+x.hint+'</span></button>';
    }).join('');
    panel.innerHTML='<div class="k">DESIGN TRIAL · ONE LOCUS / ONE DELTA</div><div class="designTrial">'+
      '<div class="designHead"><div><div class="designState">'+esc(check.state)+' · '+esc(t.address_label||t.address)+'</div><div class="designMeta">'+esc(t.address)+' · '+esc(t.projection)+' · '+esc(t.id)+'</div></div><button data-design-new>NEW</button></div>'+
      '<div class="designFlow">'+flow+'</div>'+
      editorMarkup(t,focusStep,check)+
      '<div class="note" data-design-msg>'+esc(check.ready?'complete · export when the observed consequence is worth keeping':'current gate · '+focusStep)+'</div>'+
      '</div>';
    bind(t);emitState(t,check);
  }

  function boot() {
    const side = document.querySelector('.side');
    if (!side) return;
    style(); load();
    panel = document.createElement('section');
    panel.id = 'designTrialPanel';
    side.insertBefore(panel, side.firstChild);
    context = root.HOUSE_CONTEXT || context;
    render();
    window.addEventListener('house:selection', (e) => {
      context = Object.assign({}, context, e.detail || {});
      const existing = latestForAddress(context.address);
      activeId = existing ? existing.id : null;
      focusStep=null;
      render();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})(typeof globalThis !== 'undefined' ? globalThis : this);
