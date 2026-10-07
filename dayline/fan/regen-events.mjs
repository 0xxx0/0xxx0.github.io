#!/usr/bin/env node
// THE FAN — day-as-evidence regenerator.
// Rebuilds events.json from the real record (git log of this repo, machine noise removed).
// Usage: node dayline/fan/regen-events.mjs [startISO] [endISO]
// Defaults to the current day (Asia/Shanghai). Run from the repo root.
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const TZ = '+0800';
const day = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
const start = process.argv[2] ?? `${day} 00:00 ${TZ}`;
const end = process.argv[3] ?? `${day} 24:00 ${TZ}`;

// machine noise: snapshots, stamps, restamps — chronology, not work
const MACHINE = /^(desk:|nexus:|comms:|convergence:|stamp$|restamp|.*: stamp$|.*: restamp|.*restamp post-rebase|ci:|temp pages:)/i;

const raw = execSync(
  `git log --since="${start}" --until="${end}" --pretty=format:'%ct|%s' --no-merges`,
  { encoding: 'utf8' }
);

const events = raw.split('\n').filter((l) => l.includes('|')).map((line) => {
  const i = line.indexOf('|');
  const t = new Date(parseInt(line.slice(0, i), 10) * 1000 + 8 * 3600e3);
  return {
    h: t.getUTCHours(),
    m: t.getUTCMinutes(),
    t: line.slice(i + 1).trim().slice(0, 72),
  };
}).filter((e) => !MACHINE.test(e.t));

writeFileSync(new URL('./events.json', import.meta.url),
  JSON.stringify(events.slice(0, 26), null, 0));
console.log(`events.json: ${Math.min(events.length, 26)} events for ${day} (${events.length} on record, ${events.length > 26 ? 'trimmed to 26' : 'all kept'})`);
