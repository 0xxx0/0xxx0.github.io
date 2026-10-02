#!/usr/bin/env node
import fs from 'node:fs';

const CONFIG_PATH = process.env.FIELD_COLLISION_MAP || 'control/coordination/COLLISION_MAP.json';
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

function matches(file, pattern) {
  if (pattern.endsWith('/**')) return file === pattern.slice(0, -3) || file.startsWith(pattern.slice(0, -2));
  return file === pattern;
}

function matchingDomains(files, domains = []) {
  const out = new Map();
  for (const domain of domains) {
    const hit = files.filter(file => (domain.paths || []).some(pattern => matches(file, pattern)));
    if (hit.length) out.set(domain.id, hit);
  }
  return out;
}

function parseClaim(body = '') {
  const match = body.match(/<!--\s*FIELD-TRANSACTION\s*([\s\S]*?)-->/i);
  if (!match) return null;
  const claim = {};
  for (const raw of match[1].split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^([a-z0-9_-]+)\s*:\s*(.*?)\s*$/i);
    if (m) claim[m[1].toLowerCase()] = m[2];
  }
  return claim;
}

function annotate(kind, text) {
  console.log(`::${kind}::${text.replace(/\r?\n/g, '%0A')}`);
}

async function api(url) {
  const res = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'field-collision-preflight'
    }
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

async function listFiles(apiBase, owner, repo, number) {
  const files = [];
  for (let page = 1; page <= 10; page += 1) {
    const batch = await api(`${apiBase}/repos/${owner}/${repo}/pulls/${number}/files?per_page=100&page=${page}`);
    files.push(...batch.map(x => x.filename));
    if (batch.length < 100) break;
  }
  return files;
}

async function listOpenPrs(apiBase, owner, repo) {
  const prs = [];
  for (let page = 1; page <= 10; page += 1) {
    const batch = await api(`${apiBase}/repos/${owner}/${repo}/pulls?state=open&per_page=100&page=${page}`);
    prs.push(...batch);
    if (batch.length < 100) break;
  }
  return prs;
}

const eventPath = process.env.GITHUB_EVENT_PATH;
if (!eventPath || !fs.existsSync(eventPath)) {
  console.log('collision-preflight: no GitHub pull_request event; nothing to compare.');
  process.exit(0);
}

const event = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
const pr = event.pull_request;
if (!pr) {
  console.log('collision-preflight: event is not a pull_request; nothing to compare.');
  process.exit(0);
}

if (event.repository?.private) {
  throw new Error('collision-preflight is credential-free by design and supports only this public repository.');
}

const [owner, repo] = (process.env.GITHUB_REPOSITORY || event.repository?.full_name || '').split('/');
if (!owner || !repo) throw new Error('Cannot resolve repository identity.');
const apiBase = process.env.GITHUB_API_URL || 'https://api.github.com';
const selfNumber = pr.number;
const selfFiles = await listFiles(apiBase, owner, repo, selfNumber);
const claim = parseClaim(pr.body || '');
const hardSelf = matchingDomains(selfFiles, config.hard_domains);
const softSelf = matchingDomains(selfFiles, config.soft_domains);

const errors = [];
const warnings = [];

// Resolve the target branch NOW, not merely the base SHA captured when the PR opened.
// This catches candidates that were green and then drifted behind master before merge.
const comparison = await api(`${apiBase}/repos/${owner}/${repo}/compare/${encodeURIComponent(pr.base.ref)}...${pr.head.sha}`);
const baseBehind = Number(comparison.behind_by || 0);
if (baseBehind > 0 && config.policy?.base_behind === 'FAIL') {
  errors.push(`base drift: PR head is ${baseBehind} commit(s) behind current ${pr.base.ref}`);
}

for (const file of selfFiles) {
  if ((config.forbidden_public_paths || []).some(pattern => matches(file, pattern))) {
    errors.push(`forbidden public path: ${file}`);
  }
}

if (!claim) {
  const message = 'missing FIELD-TRANSACTION claim block in PR body';
  if (hardSelf.size && config.policy?.missing_claim_on_hard_domain === 'FAIL') errors.push(message);
  else warnings.push(message);
} else {
  for (const key of config.claim_block?.keys || []) {
    if (!claim[key]) warnings.push(`claim missing key: ${key}`);
  }
  const allowed = new Set(config.claim_block?.classes || []);
  if (claim.class && !allowed.has(claim.class.toUpperCase())) warnings.push(`unknown contribution class: ${claim.class}`);
  const matched = new Set([...hardSelf.keys(), ...softSelf.keys()]);
  if (claim.surface && matched.size && !matched.has(claim.surface)) {
    warnings.push(`declared surface '${claim.surface}' does not match detected domains: ${[...matched].join(', ')}`);
  }
}

const openPrs = (await listOpenPrs(apiBase, owner, repo)).filter(other => other.number !== selfNumber);
for (const other of openPrs) {
  const otherFiles = await listFiles(apiBase, owner, repo, other.number);
  const exact = selfFiles.filter(file => otherFiles.includes(file));
  if (exact.length) errors.push(`PR #${other.number} exact-file overlap: ${exact.join(', ')}`);

  const hardOther = matchingDomains(otherFiles, config.hard_domains);
  for (const [domain, files] of hardSelf) {
    if (hardOther.has(domain)) {
      errors.push(`PR #${other.number} hard-domain overlap '${domain}': ours [${files.join(', ')}] vs theirs [${hardOther.get(domain).join(', ')}]`);
    }
  }

  const softOther = matchingDomains(otherFiles, config.soft_domains);
  for (const [domain, files] of softSelf) {
    if (softOther.has(domain)) {
      warnings.push(`PR #${other.number} shares soft domain '${domain}': ours [${files.join(', ')}] vs theirs [${softOther.get(domain).join(', ')}]`);
    }
  }

  const otherClaim = parseClaim(other.body || '');
  if (claim?.surface && otherClaim?.surface && claim.surface === otherClaim.surface) {
    warnings.push(`PR #${other.number} declares the same transaction surface '${claim.surface}'`);
  }
}

console.log(`collision-preflight: PR #${selfNumber}`);
console.log(`base: ${pr.base.ref} · behind_by=${baseBehind} · compare_status=${comparison.status}`);
console.log(`changed files: ${selfFiles.length}`);
console.log(`hard domains: ${[...hardSelf.keys()].join(', ') || 'none'}`);
console.log(`soft domains: ${[...softSelf.keys()].join(', ') || 'none'}`);
console.log(`other open PRs inspected: ${openPrs.length}`);

for (const warning of [...new Set(warnings)]) annotate('warning', warning);
for (const error of [...new Set(errors)]) annotate('error', error);

if (errors.length) {
  console.error(`collision-preflight: FAIL (${errors.length} collision/boundary error(s))`);
  process.exit(1);
}

console.log(`collision-preflight: PASS${warnings.length ? ` with ${warnings.length} warning(s)` : ''}`);
