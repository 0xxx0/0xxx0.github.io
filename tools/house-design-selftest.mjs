import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
let pass = 0, fail = 0;
const ok = (name, cond, detail='') => {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (detail ? ' — ' + detail : '')); }
};

const src = fs.readFileSync(path.join(ROOT, 'house/design-engine.js'), 'utf8');
const ctx = { console, Date, Math, module:{exports:{}}, exports:{} };
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(src, ctx, { filename:'house/design-engine.js' });
const C = ctx.module.exports;

console.log('\n[HOUSE design core]');
ok('exports core', !!C && C.SCHEMA === 'house-design-trial/v0.1' && C.EFFECT_SCHEMA === 'house-design-effect/v0.1' && C.WITNESS_SCHEMA === 'house-design-witness/v0.1');
let t = C.newTrial({address:'living_dining',label:'Living / Dining',projection:'PLAN'});
ok('new trial is addressed', t.address === 'living_dining' && t.address_label === 'Living / Dining');
let v = C.validate(t);
ok('empty trial cannot return', v.ready === false && v.missing.includes('before') && v.missing.includes('after'));
Object.assign(t,{before:'route blocked',intent:'clear route',change:'move trolley 300 mm',verify:'walk route twice',after:'route clear',decision:'ADOPT'});
v = C.validate(t);
ok('bounded trial becomes return-ready', v.ready === true, JSON.stringify(v));
const fit = {schema:'house-shopping-fit-return/v0.1',status:'PASS_ENVELOPE',address:'living_dining',object_id:'cart-1',candidate:{w:400,d:600,h:900},available:{w:500,d:800,h:1000}};
t = C.attachFit(t, fit);
ok('fit receipt stays evidence-only', t.fit_receipt && t.fit_receipt.evidence_only === true && t.fit_receipt.status === 'PASS_ENVELOPE');

const effect = C.makeEffect(t);
ok('effect binds exact trial + address + intervention', effect.effect_ref === C.effectRef(t) && effect.trial_id === t.id && effect.address === 'living_dining' && effect.intervention === 'move trolley 300 mm');
ok('physical retry requires new trial', effect.retry_semantics === 'NEW_TRIAL_REQUIRED' && /new addressed trial/i.test(effect.law));
ok('effect never grants HOUSEBUS actuation authority', effect.authority === 'LOCAL_DESIGN_TRIAL_ONLY' && /no Home Assistant\/HOUSEBUS actuation/i.test(effect.law));

const witnesses = C.makeWitnesses(t);
const byType = type => witnesses.find(w => w.claim_type === type);
ok('after observation is claim-scoped evidence', !!byType('PHYSICAL_STATE_OBSERVED') && byType('PHYSICAL_STATE_OBSERVED').evidence === 'route clear' && byType('PHYSICAL_STATE_OBSERVED').evidence_only === true);
ok('verification decision is a different claim', !!byType('TRIAL_CRITERION_EVALUATED') && byType('TRIAL_CRITERION_EVALUATED').criterion === 'walk route twice' && byType('TRIAL_CRITERION_EVALUATED').decision === 'ADOPT');
ok('fit evidence stays a separate narrow claim', !!byType('DIMENSIONAL_FIT_EVIDENCE_ATTACHED') && byType('DIMENSIONAL_FIT_EVIDENCE_ATTACHED').issuer === 'HOUSE_SHOPPING_FIT_RETURN');
ok('every witness binds to the exact effect', witnesses.every(w => C.validateWitnessBinding(effect,w).ok));
const wrongTrial = {...witnesses[0],trial_id:'design-other'};
const wrongAddress = {...witnesses[0],address:'kitchen'};
const wrongEffect = {...witnesses[0],effect_ref:'house-design:other:kitchen'};
ok('mismatched witness cannot bind', !C.validateWitnessBinding(effect,wrongTrial).ok && !C.validateWitnessBinding(effect,wrongAddress).ok && !C.validateWitnessBinding(effect,wrongEffect).ok);
ok('unknown claim type cannot bind', !C.validateWitnessBinding(effect,{...witnesses[0],claim_type:'SUCCESS'}).ok);

const r = C.makeReturn(t);
ok('return preserves exact address', r.address === 'living_dining');
ok('return preserves intervention + decision', r.intervention === 'move trolley 300 mm' && r.decision === 'ADOPT');
ok('return carries bounded effect and unequal witnesses', r.effect.effect_ref === effect.effect_ref && r.witnesses.length === witnesses.length && new Set(r.witnesses.map(w=>w.claim_type)).size === r.witnesses.length);
ok('return has no universal success field', !('success' in r) && !('status' in r.effect) && r.witnesses.every(w=>!('success' in w)));
ok('return denies authority escalation', r.claims.some(x=>/not structural\/safety approval/i.test(x)) && r.claims.some(x=>/No Home Assistant\/HOUSEBUS actuation authority/i.test(x)));
ok('REVERT is explicitly a new corrective trial, not fake undo', r.claims.some(x=>/REVERT.*separate corrective trial.*not an undo/i.test(x)));
let threw = false;
try { C.makeReturn(C.newTrial({address:'kitchen'})); } catch(e) { threw = e.code === 'INCOMPLETE_TRIAL'; }
ok('incomplete RETURN fails closed', threw);

console.log('\n[HOUSE host wiring]');
const html = fs.readFileSync(path.join(ROOT, 'house/index.html'), 'utf8');
ok('canonical /house/ loads design engine', /design-engine\.js/.test(html));
ok('host emits selected-address event', /house:selection/.test(html) && /HOUSE_CONTEXT/.test(html));
ok('design engine has no network client', !/\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource/.test(src));
ok('design engine does not mention HA credentials/services', !/token|api_key|Authorization|callService|\/api\/services/i.test(src));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
