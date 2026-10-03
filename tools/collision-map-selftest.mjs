#!/usr/bin/env node
import fs from 'node:fs';

const config = JSON.parse(fs.readFileSync('control/coordination/COLLISION_MAP.json', 'utf8'));

function matches(file, pattern) {
  if (pattern.endsWith('/**')) return file === pattern.slice(0, -3) || file.startsWith(pattern.slice(0, -2));
  return file === pattern;
}
function domains(files, list) {
  return new Set((list || []).filter(d => files.some(f => (d.paths || []).some(p => matches(f, p)))).map(d => d.id));
}
function overlap(a, b) {
  return a.filter(x => b.includes(x));
}
function assert(ok, name, detail = '') {
  if (!ok) {
    console.error(`FAIL ${name}${detail ? ` · ${detail}` : ''}`);
    process.exitCode = 1;
  } else console.log(`PASS ${name}`);
}

const hardA = ['index.html'];
const hardB = ['lib/interphase-carrier.js'];
const softA = ['docs/SANZIJING_WORKING_OBJECT.md'];
const softB = ['lib/interphase-readfield.js'];
const exactA = ['fold-bloom/play.js'];
const exactB = ['fold-bloom/play.js', 'returns/UNIQUE.json'];
const safeReceiptA = ['returns/A.json'];
const safeReceiptB = ['returns/B.json'];
const forbidden = ['private/context.json'];

const hardDomainsA = domains(hardA, config.hard_domains);
const hardDomainsB = domains(hardB, config.hard_domains);
const softDomainsA = domains(softA, config.soft_domains);
const softDomainsB = domains(softB, config.soft_domains);

assert(config.policy?.base_drift === 'WARN', 'ordinary base drift is classified, not automatically fatal');
assert(config.policy?.base_drift_on_hard_candidate === 'FAIL', 'hard-authority candidates require current base');
assert(config.policy?.base_drift_exact_overlap === 'FAIL', 'base exact-file overlap fails');
assert(config.policy?.base_drift_hard_domain_overlap === 'FAIL', 'base hard-domain overlap fails');
assert(config.policy?.base_drift_soft_domain_overlap === 'WARN', 'base soft-domain overlap warns');
assert(config.enforcement?.repository_ruleset_required_for_hard_prevention === true, 'ruleset requirement is explicit');
assert(hardDomainsA.has('field-root-runtime') && hardDomainsB.has('field-root-runtime'), 'different files in FIELD root share hard domain');
assert([...hardDomainsA].some(x => hardDomainsB.has(x)), 'hard-domain overlap is detectable');
assert(softDomainsA.has('readfield') && softDomainsB.has('readfield'), 'READFIELD soft overlap is detectable');
assert(overlap(exactA, exactB).length === 1, 'exact-file overlap is detectable');
assert(overlap(safeReceiptA, safeReceiptB).length === 0, 'unique receipts do not collide by directory');
assert((config.forbidden_public_paths || []).some(p => matches(forbidden[0], p)), 'forbidden public path is detectable');
assert(domains(['control/CURRENT.json'], config.hard_domains).has('attention-authority'), 'CURRENT is serialized hard authority');
assert(domains(['showcase-manifest.json'], config.hard_domains).has('public-registry-authority'), 'manifest is serialized hard authority');

if (!process.exitCode) console.log('collision-map-selftest: PASS');
