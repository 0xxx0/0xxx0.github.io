#!/usr/bin/env node
/* merge-algebra-audit.mjs — what the CORRESPONDENCE REGISTRY claims vs what's tested
 *
 * Reads the authoritative registry (control/INTERPHASE_CORRESPONDENCE_REGISTRY.json),
 * enumerates each mapping's claimed merge type, commutation claims, and test status.
 * Exits 1 if any mapping that claims commutation has no test.
 * Exits 1 if any merge type is unknown.
 *
 * KNOWN MERGE TYPES (from CORRESPONDENCE-ALGEBRA-2026-10-02.md §2):
 *   union, lww-last-writer-wins, lww-with-single-writer, crdt-set,
 *   commutative-replicated, ordered/lww, conflict-free, operator-crdt
 *
 * This is the FIRST enforceable gate over the algebra — everything
 * before it was prose. See ALSO: tools/correspondence-algebra-selftest.mjs
 */

import {readFileSync, existsSync} from 'fs';
import {resolve, dirname} from 'path';
import {fileURLToPath} from 'url';

const DIR = dirname(fileURLToPath(import.meta.url));
const REGISTRY = resolve(DIR, '../control/INTERPHASE_CORRESPONDENCE_REGISTRY.json');
const KNOWN_MERGE_TYPES = new Set([
  'union',
  'lww-last-writer-wins',
  'lww-with-single-writer',
  'crdt-set',
  'commutative-replicated',
  'ordered/lww',
  'conflict-free',
  'operator-crdt',
  'none-requires-coordination',  // merge must coordinate; no algebra is claimed
  'append-only-gset',            // grow-only set (GSet CRDT): idempotent union
]);

function main() {
  if (!existsSync(REGISTRY)) {
    console.error(`FAIL — registry not found at ${REGISTRY}`);
    process.exit(1);
  }
  const raw = JSON.parse(readFileSync(REGISTRY, 'utf8'));
  const {mappings} = raw;
  if (!Array.isArray(mappings)) {
    console.error(`FAIL — no mappings array in registry`);
    process.exit(1);
  }

  console.log(`# MERGE-ALGEBRA AUDIT — ${raw.updated}`);
  console.log(`Mappings: ${mappings.length}`);
  console.log(`Schema:   ${raw.schema}`);
  console.log(`Status:   ${raw.status}`);
  console.log();
  console.log('## MAPPING TABLE (PASS/FAIL per entry)');
  console.log();

  let failures = 0;
  let tested = 0;
  let untestedClaims = 0;

  for (const m of mappings) {
    const id = m.host_id || '(unnamed)';
    const merge = m.merge || '(not stated)';
    const claimed = Array.isArray(m.commutes_claimed) ? m.commutes_claimed : [];
    const commutesTested = m.commutes_tested === true;
    const mergeValid = KNOWN_MERGE_TYPES.has(merge);
    const claimsWithoutTest = claimed.length > 0 && !commutesTested;
    const unknownMerge = !KNOWN_MERGE_TYPES.has(merge);
    const flags = [];
    if (unknownMerge) flags.push(`UNKNOWN_MERGE: "${merge}"`);
    if (claimsWithoutTest) flags.push(`untested-claim: ${claimed.join(', ')}`);
    if (commutesTested) tested++;
    if (claimsWithoutTest) untestedClaims++;

    const status = flags.length ? 'FAIL' : 'PASS';
    if (flags.length) failures++;
    console.log(`${status} │ ${id} │ merge=${merge} │ claims: ${claimed.length ? claimed.join(',') : 'none'} │ tested=${commutesTested}`);
    for (const f of flags) console.log(`     ${f}`);
  }

  console.log();
  console.log('## SUMMARY');
  console.log(`Total mappings:    ${mappings.length}`);
  console.log(`Pass:              ${mappings.length - failures}`);
  console.log(`Fail:              ${failures}`);
  console.log(`With test:         ${tested}`);
  console.log(`Claims untested:   ${untestedClaims}`);

  if (failures) {
    console.log(`\nFAIL — ${failures} mapping(s) have issues. Fix before promoting.`);
    process.exit(1);
  }
  console.log('\nPASS — all registrations coherent, tests exist for all claims.');
  process.exit(0);
}

main();