#!/usr/bin/env node
'use strict';
// One browser resolver for every smoke test.
//
// WHY THIS EXISTS — the 28 copies it replaces asked `which google-chrome-stable`
// and nothing else. That is a presence-only guard (AGENTS.md law #3): a name can
// be absent from PATH while the browser is installed (macOS ships Chrome as an app
// bundle, never on PATH), and a name can be present while the binary cannot run.
// The result was 28 smoke tests that could not execute on the operator's own
// machine — the surfaces they guard were unverifiable exactly where they are used.
//
// This resolver checks candidate paths AND proves the binary runs (`--version`)
// before returning it, so a returned path is a working browser, not a filename.
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Linux / CI names, resolved through PATH.
const ON_PATH = ['google-chrome-stable', 'google-chrome', 'chromium-browser', 'chromium', 'chrome'];

// Absolute paths, checked directly. macOS app bundles first — Chrome is never on PATH there.
const ABSOLUTE = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  '/usr/bin/google-chrome-stable', '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser', '/usr/bin/chromium', '/snap/bin/chromium',
];

// Playwright keeps its own chromium under a per-user cache; use it when the machine
// has no system browser at all, so smokes still run rather than silently skipping.
function playwrightCache() {
  const roots = [
    path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright'), // macOS
    path.join(os.homedir(), '.cache', 'ms-playwright'),            // Linux
    path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright'),  // Windows
  ];
  const rels = [
    'chrome-mac/Chromium.app/Contents/MacOS/Chromium',
    'chrome-mac-arm64/Chromium.app/Contents/MacOS/Chromium',
    'chrome-linux/chrome',
    'chrome-linux64/chrome',
    'chrome-win/chrome.exe',
  ];
  const out = [];
  for (const root of roots) {
    let entries = [];
    try { entries = fs.readdirSync(root); } catch { continue; }
    for (const e of entries) {
      if (!/^chromium/.test(e)) continue;
      for (const rel of rels) out.push(path.join(root, e, rel));
    }
  }
  return out;
}

// A path is not a browser until it answers. This is the whole point of the module.
function runs(bin) {
  try {
    const r = spawnSync(bin, ['--version'], {encoding: 'utf8', timeout: 20000});
    return r.status === 0 && !r.error;
  } catch { return false; }
}

export function browserBin() {
  const tried = [];

  // SMOKE_BROWSER pins the binary explicitly. Which browser runs decides what a suite
  // reports — measured 2026-10-02: the same case set gave 85/87 under Brave and 86/87
  // under Google Chrome, while CI (google-chrome-stable on Linux) reports 87/87. That
  // divergence produced a false "broken on master" claim that reached the operator.
  // Pin this when comparing a local run to CI, or treat a lone local failure as
  // UNVERIFIED rather than a break.
  const want = String(process.env.SMOKE_BROWSER || '').trim();
  if (want) {
    if (!fs.existsSync(want)) throw Error('SMOKE_BROWSER does not exist: ' + want);
    if (!runs(want)) throw Error('SMOKE_BROWSER is present but will not run: ' + want);
    return want;
  }
  for (const cand of [...ON_PATH, ...ABSOLUTE, ...playwrightCache()]) {
    let bin = null;
    if (cand.startsWith('/') || cand.includes(path.sep)) {
      if (fs.existsSync(cand)) bin = cand;
    } else {
      const r = spawnSync('which', [cand], {encoding: 'utf8'});
      if (r.status === 0 && r.stdout.trim()) bin = r.stdout.trim();
    }
    if (!bin) { tried.push(`${cand} — absent`); continue; }
    if (!runs(bin)) { tried.push(`${bin} — present, will not run`); continue; }
    return bin;
  }
  throw Error('No runnable Chrome/Chromium. Tried:\n  ' + tried.join('\n  '));
}

export default browserBin;