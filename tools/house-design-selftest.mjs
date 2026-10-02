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
ok('exports core', !!C && C.SCHEMA === 'house-design-trial/v0.1');
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
const r = C.makeReturn(t);
ok('return preserves exact address', r.address === 'living_dining');
ok('return preserves intervention + decision', r.intervention === 'move trolley 300 mm' && r.decision === 'ADOPT');
ok('return denies authority escalation', r.claims.some(x=>/not structural\/safety approval/i.test(x)) && r.claims.some(x=>/No Home Assistant\/HOUSEBUS actuation authority/i.test(x)));
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
