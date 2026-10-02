(function (root) {
  'use strict';

  const SCHEMA = 'house-design-trial/v0.1';
  const RETURN_SCHEMA = 'house-design-return/v0.1';
  const STORE_KEY = 'house.design.trials.v01';
  const DECISIONS = ['ADOPT', 'REVISE', 'REVERT', 'HOLD'];
  const REQUIRED = ['before', 'intent', 'change', 'verify', 'after', 'decision'];

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

  function makeReturn(trial) {
    const t = normalizeTrial(trial || {});
    const check = validate(t);
    if (!check.ready) {
      const err = new Error('design trial incomplete: ' + check.missing.join(', '));
      err.code = 'INCOMPLETE_TRIAL';
      err.missing = check.missing;
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
      claims: [
        'This receipt records an addressed design trial and its observed result.',
        'ADOPT is a local human decision, not structural/safety approval.',
        'No Home Assistant/HOUSEBUS actuation authority is granted.',
        'Canonical HOUSE geometry changes only after independent measurement/evidence update.'
      ],
      return_to: '/house/'
    };
  }

  const Core = { SCHEMA, RETURN_SCHEMA, STORE_KEY, DECISIONS, REQUIRED, newTrial, normalizeTrial, validate, attachFit, makeReturn };
  root.HouseDesignCore = Core;
  if (typeof module !== 'undefined' && module.exports) module.exports = Core;

  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  let context = root.HOUSE_CONTEXT || { address: '', label: '', projection: 'PLAN' };
  let trials = [];
  let activeId = null;
  let panel = null;

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

  function style() {
    if (document.getElementById('houseDesignStyle')) return;
    const s = document.createElement('style');
    s.id = 'houseDesignStyle';
    s.textContent = '.designTrial{display:grid;gap:7px}.designTrial label{display:grid;gap:3px;color:var(--mut);font-size:8px;letter-spacing:.08em}.designTrial textarea,.designTrial select{width:100%;min-height:34px;resize:vertical;font:10px/1.4 system-ui,sans-serif;color:var(--ink);background:#0b0f12;border:1px solid var(--line);padding:7px}.designTrial textarea{min-height:54px}.designState{font-size:8px;letter-spacing:.12em;color:var(--cool)}.designMeta{font-size:8px;color:var(--mut)}.designTrial .designActions{display:flex;gap:5px;flex-wrap:wrap}.designTrial button{font-size:8px;min-height:30px}.designTrial .fitAttached{border-left:2px solid var(--cool);padding-left:7px;color:#a8b0b4;font-size:9px}';
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

  function bind() {
    panel.querySelectorAll('[data-design-field]').forEach((el) => {
      el.addEventListener('change', () => setField(el.dataset.designField, el.value));
    });
    panel.querySelector('[data-design-new]').onclick = () => { ensureActive(true); render(); };
    panel.querySelector('[data-design-fit]').onclick = () => {
      const t = current(); if (!t) return;
      let receipt = null;
      try { receipt = JSON.parse(sessionStorage.getItem('house.shopping.fit.return.v01') || 'null'); } catch (_) {}
      const next = attachFit(t, receipt);
      const i = trials.findIndex((x) => x.id === t.id);
      if (i >= 0) trials[i] = next;
      persist(); render();
    };
    panel.querySelector('[data-design-return]').onclick = () => {
      const t = current(); if (!t) return;
      try {
        const receipt = makeReturn(t);
        download(receipt.trial_id + '.house-design-return.json', receipt);
      } catch (e) {
        const msg = panel.querySelector('[data-design-msg]');
        msg.textContent = 'RETURN BLOCKED · ' + (e.missing || []).join(' · ');
      }
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
    const fit = t.fit_receipt ? '<div class="fitAttached">FIT RECEIPT · '+esc(t.fit_receipt.status||'ATTACHED')+' · evidence-only dimensional screen</div>' : '';
    panel.innerHTML = '<div class="k">DESIGN TRIAL · LOCAL / REVERSIBLE-FIRST</div>'+
      '<div class="designTrial">'+
      '<div class="designState">'+esc(check.state)+' · '+esc(t.address_label||t.address)+'</div>'+
      '<div class="designMeta">'+esc(t.address)+' · '+esc(t.projection)+' · '+esc(t.id)+'</div>'+
      '<label>BEFORE · observed condition<textarea data-design-field="before" placeholder="what is actually true now">'+esc(t.before)+'</textarea></label>'+
      '<label>INTENT · what should become easier<textarea data-design-field="intent" placeholder="one outcome, not a solution">'+esc(t.intent)+'</textarea></label>'+
      '<label>CHANGE · smallest reversible intervention<textarea data-design-field="change" placeholder="move / remove / add / route / mark / mount / build">'+esc(t.change)+'</textarea></label>'+
      '<label>CONSTRAINTS · preserve<textarea data-design-field="constraints" placeholder="clearance, cat path, power, access, light, budget, safety">'+esc(t.constraints)+'</textarea></label>'+
      '<label>VERIFY · observable test<textarea data-design-field="verify" placeholder="what evidence would discriminate better/worse?">'+esc(t.verify)+'</textarea></label>'+
      '<label>AFTER · observed result<textarea data-design-field="after" placeholder="what changed in the world?">'+esc(t.after)+'</textarea></label>'+
      '<label>DECISION<select data-design-field="decision">'+DECISIONS.map((d)=>'<option '+(d===t.decision?'selected':'')+'>'+d+'</option>').join('')+'</select></label>'+
      '<label>RESIDUE · what remains unknown<textarea data-design-field="residue" placeholder="simulation gap / missing measure / side effect">'+esc(t.residue)+'</textarea></label>'+
      fit+
      '<div class="designActions"><button data-design-new>NEW TRIAL</button><button data-design-fit>ATTACH FIT</button><button data-design-return>EXPORT RETURN</button></div>'+
      '<div class="note" data-design-msg>'+(check.ready?'RETURN READY':'missing · '+esc(check.missing.join(' · ')))+'</div>'+
      '<div class="note">Local browser state only. ADOPT records a human choice; it does not certify structure, utilities, fire safety, load, code compliance, or HA/HOUSEBUS action.</div>'+
      '</div>';
    bind();
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
      render();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})(typeof globalThis !== 'undefined' ? globalThis : this);
