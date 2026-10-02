#!/usr/bin/env node
// Control for the release-version gate: prove scripts/check-release-versions.mjs
// actually FAILS on drift and PASSES clean. House law: a gate you have never seen
// go RED is decoration. This builds a throw-away fixture tree (its own manifest,
// release receipt and allowlist), runs the real gate against it, and asserts:
//   1. a disagreeing version          -> RED
//   2. an omitted version             -> RED
//   3. a null state                   -> RED
//   4. an exact allowlisted triple    -> GREEN (the allowlist is not a mute button:
//                                        case 1 already differs from the pinned triple)
//   5. the repaired fixture           -> GREEN
// Exits 1 if the gate stops failing. Deps: node >= 18, no packages.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const GATE_SRC = fs.readFileSync(path.join(ROOT, 'scripts', 'check-release-versions.mjs'), 'utf8');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rv-gate-control-'));
const S = path.join(tmp, 'scripts');
fs.mkdirSync(S, { recursive: true });
fs.writeFileSync(path.join(S, 'check-release-versions.mjs'), GATE_SRC);
fs.mkdirSync(path.join(tmp, 'alpha'), { recursive: true });
fs.writeFileSync(path.join(tmp, 'alpha', 'release.json'),
  JSON.stringify({ version: '1.0', state: 'STABLE' }, null, 2) + '\n');

const route = (extra) => Object.assign({
  href: '/alpha/', title: 'A', kind: 'artifact', parent: '/', state: 'STABLE',
  index: { updated_at: '2026-01-01T00:00:00+08:00' },
}, extra);
const writeManifest = (routes) => fs.writeFileSync(
  path.join(tmp, 'showcase-manifest.json'),
  JSON.stringify({ schema: 'showcase-manifest/v1', routes }, null, 2) + '\n');
const writeAllow = (entries) => fs.writeFileSync(
  path.join(S, 'release-version-allow.json'),
  JSON.stringify({ schema: '0xxx0/release-version-allow/v0.1', entries }, null, 2) + '\n');
const run = () => spawnSync(process.execPath, [path.join(S, 'check-release-versions.mjs')], { encoding: 'utf8' });

const cases = [];
writeAllow([]);
writeManifest([route({ version: '2.0' })]);            cases.push(['disagreeing version', run().status, true]);
writeManifest([route({})]);                            cases.push(['omitted version', run().status, true]);
writeManifest([route({ version: '1.0', state: null })]);cases.push(['null state', run().status, true]);
writeAllow([{ route: '/alpha/', manifest_version: '2.0', release_version: '1.0', reason: 'fixture' }]);
writeManifest([route({ version: '2.0' })]);            cases.push(['exact allowlisted triple', run().status, false]);
writeManifest([route({ version: '1.0' })]);            cases.push(['green after repair', run().status, false]);

let ok = true;
for (const [name, status, wantRed] of cases) {
  const pass = wantRed ? status !== 0 : status === 0;
  ok = ok && pass;
  console.log(`${pass ? 'ok  ' : 'FAIL'}  ${name}: exit=${status} (want ${wantRed ? 'RED' : 'GREEN'})`);
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(ok
  ? 'release-version gate control: PASS — RED on drift, GREEN clean'
  : 'release-version gate control: FAIL — the gate did not fail where it must');
process.exit(ok ? 0 : 1);
