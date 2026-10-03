#!/usr/bin/env node
/**
 * WITNESS / PRIVATE ARCHIVE RETURN GATE
 *
 * Existing host: /witness/. No route, store, queue, planner, or deletion authority.
 * Purpose: let a private extractor prove enough about an archive/account export to
 *          project a small public-safe RETURN without publishing the raw archive.
 *
 * Law:
 *   PRIVATE BYTES -> private extraction/index -> this validation boundary
 *   -> PUBLIC EVIDENCE ONLY -> /witness/
 *
 * A valid READY_FOR_HUMAN_RELEASE receipt does NOT authorize deletion, closure,
 * revocation, cancellation, or any other external/account mutation.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SCHEMA = '0xxx0/witness-private-archive-return/v0.1';
export const SOURCE_CLASSES = new Set([
  'account_export', 'repo_archive', 'mail_export', 'device_archive', 'other'
]);
export const CLOSURE_STATES = new Set([
  'NOT_REQUESTED', 'HOLD', 'READY_FOR_HUMAN_RELEASE'
]);

const SHA256 = /^[a-f0-9]{64}$/i;
const ISOish = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})$/;
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const LOCAL_PATH = /(?:^|[\s"'`(])(?:~\/|\/Users\/|\/home\/|[A-Za-z]:\\Users\\)/;
const SIGNED_QUERY = /(?:[?&](?:sig|signature|token|access_token|api[_-]?key|key|code|secret)=)/i;
const PRIVATE_KEY_NAMES = /(?:^|_)(?:email|account_id|user_id|username|path|filepath|filename|url|endpoint|token|secret|credential|password|phone|ip_address)(?:$|_)/i;

function isObject(x) {
  return !!x && typeof x === 'object' && !Array.isArray(x);
}

function add(errors, condition, message) {
  if (!condition) errors.push(message);
}

function walk(value, at, errors) {
  if (typeof value === 'string') {
    if (EMAIL.test(value)) errors.push(`${at}: email-shaped value is private residue`);
    if (LOCAL_PATH.test(value)) errors.push(`${at}: machine-local path is private residue`);
    if (SIGNED_QUERY.test(value)) errors.push(`${at}: signed/tokenized URL material is private residue`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => walk(v, `${at}[${i}]`, errors));
    return;
  }
  if (!isObject(value)) return;
  for (const [k, v] of Object.entries(value)) {
    if (PRIVATE_KEY_NAMES.test(k)) errors.push(`${at}.${k}: private-identifier key is forbidden on the public RETURN`);
    walk(v, `${at}.${k}`, errors);
  }
}

function nonNegativeInteger(x) {
  return Number.isInteger(x) && x >= 0;
}

export function validatePrivateArchiveReturn(receipt) {
  const errors = [];
  add(errors, isObject(receipt), 'receipt must be an object');
  if (!isObject(receipt)) return { ok: false, errors, authority: 'NONE' };

  const allowedTop = new Set([
    'schema', 'generated_at', 'source', 'extraction', 'redundancy',
    'public_projection', 'closure'
  ]);
  for (const k of Object.keys(receipt)) {
    if (!allowedTop.has(k)) errors.push(`top-level key not in contract: ${k}`);
  }

  add(errors, receipt.schema === SCHEMA, `schema must equal ${SCHEMA}`);
  add(errors, typeof receipt.generated_at === 'string' && ISOish.test(receipt.generated_at),
      'generated_at must be an offset-aware ISO timestamp');

  const source = receipt.source;
  add(errors, isObject(source), 'source must be an object');
  if (isObject(source)) {
    const allowed = new Set(['class', 'captured_at', 'sha256', 'bytes']);
    for (const k of Object.keys(source)) if (!allowed.has(k)) errors.push(`source.${k}: key not allowed`);
    add(errors, SOURCE_CLASSES.has(source.class), 'source.class is not an allowed coarse source class');
    add(errors, typeof source.captured_at === 'string' && ISOish.test(source.captured_at),
        'source.captured_at must be an offset-aware ISO timestamp');
    add(errors, typeof source.sha256 === 'string' && SHA256.test(source.sha256),
        'source.sha256 must be a 64-hex SHA-256');
    add(errors, nonNegativeInteger(source.bytes), 'source.bytes must be a non-negative integer');
  }

  const extraction = receipt.extraction;
  add(errors, isObject(extraction), 'extraction must be an object');
  if (isObject(extraction)) {
    const allowed = new Set([
      'tool', 'tool_version', 'records', 'parse_failures', 'deduplicated_records',
      'verified_samples', 'manifest_complete'
    ]);
    for (const k of Object.keys(extraction)) if (!allowed.has(k)) errors.push(`extraction.${k}: key not allowed`);
    add(errors, typeof extraction.tool === 'string' && extraction.tool.length > 0 && extraction.tool.length <= 80,
        'extraction.tool must be a short non-empty label');
    add(errors, typeof extraction.tool_version === 'string' && extraction.tool_version.length > 0 && extraction.tool_version.length <= 80,
        'extraction.tool_version must be a short non-empty label');
    for (const k of ['records', 'parse_failures', 'deduplicated_records', 'verified_samples']) {
      add(errors, nonNegativeInteger(extraction[k]), `extraction.${k} must be a non-negative integer`);
    }
    add(errors, typeof extraction.manifest_complete === 'boolean', 'extraction.manifest_complete must be boolean');
    if (nonNegativeInteger(extraction.records) && nonNegativeInteger(extraction.deduplicated_records)) {
      add(errors, extraction.deduplicated_records <= extraction.records,
          'extraction.deduplicated_records cannot exceed records');
    }
  }

  const redundancy = receipt.redundancy;
  add(errors, isObject(redundancy), 'redundancy must be an object');
  if (isObject(redundancy)) {
    const allowed = new Set(['independent_copies', 'checksum_verified_copies']);
    for (const k of Object.keys(redundancy)) if (!allowed.has(k)) errors.push(`redundancy.${k}: key not allowed`);
    add(errors, nonNegativeInteger(redundancy.independent_copies), 'redundancy.independent_copies must be a non-negative integer');
    add(errors, nonNegativeInteger(redundancy.checksum_verified_copies), 'redundancy.checksum_verified_copies must be a non-negative integer');
    if (nonNegativeInteger(redundancy.independent_copies) && nonNegativeInteger(redundancy.checksum_verified_copies)) {
      add(errors, redundancy.checksum_verified_copies <= redundancy.independent_copies,
          'checksum_verified_copies cannot exceed independent_copies');
    }
  }

  const projection = receipt.public_projection;
  add(errors, isObject(projection), 'public_projection must be an object');
  if (isObject(projection)) {
    const allowed = new Set(['dataset_id', 'span', 'counts', 'discrepancies', 'notes']);
    for (const k of Object.keys(projection)) if (!allowed.has(k)) errors.push(`public_projection.${k}: key not allowed`);
    add(errors, typeof projection.dataset_id === 'string' && /^[a-z0-9][a-z0-9._-]{0,63}$/i.test(projection.dataset_id),
        'public_projection.dataset_id must be a short non-identifying slug');
    add(errors, isObject(projection.span), 'public_projection.span must be an object');
    if (isObject(projection.span)) {
      const allowedSpan = new Set(['start', 'end']);
      for (const k of Object.keys(projection.span)) if (!allowedSpan.has(k)) errors.push(`public_projection.span.${k}: key not allowed`);
      add(errors, typeof projection.span.start === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(projection.span.start),
          'public_projection.span.start must be YYYY-MM-DD');
      add(errors, typeof projection.span.end === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(projection.span.end),
          'public_projection.span.end must be YYYY-MM-DD');
    }
    add(errors, isObject(projection.counts), 'public_projection.counts must be an object');
    if (isObject(projection.counts)) {
      for (const [k, v] of Object.entries(projection.counts)) {
        add(errors, /^[a-z][a-z0-9_]{0,47}$/i.test(k), `public_projection.counts.${k}: invalid key`);
        add(errors, nonNegativeInteger(v), `public_projection.counts.${k}: count must be a non-negative integer`);
      }
    }
    add(errors, Array.isArray(projection.discrepancies), 'public_projection.discrepancies must be an array');
    add(errors, Array.isArray(projection.notes), 'public_projection.notes must be an array');
  }

  const closure = receipt.closure;
  add(errors, isObject(closure), 'closure must be an object');
  if (isObject(closure)) {
    const allowed = new Set([
      'state', 'human_release_required', 'destructive_action_performed',
      'dependencies_reviewed', 'recovery_material_reviewed', 'reasons'
    ]);
    for (const k of Object.keys(closure)) if (!allowed.has(k)) errors.push(`closure.${k}: key not allowed`);
    add(errors, CLOSURE_STATES.has(closure.state), 'closure.state is invalid');
    add(errors, closure.human_release_required === true, 'closure.human_release_required must remain true');
    add(errors, closure.destructive_action_performed === false,
        'public RETURN must be created before any destructive account action');
    add(errors, typeof closure.dependencies_reviewed === 'boolean', 'closure.dependencies_reviewed must be boolean');
    add(errors, typeof closure.recovery_material_reviewed === 'boolean', 'closure.recovery_material_reviewed must be boolean');
    add(errors, Array.isArray(closure.reasons), 'closure.reasons must be an array');

    if (closure.state === 'READY_FOR_HUMAN_RELEASE') {
      add(errors, extraction?.manifest_complete === true, 'READY requires extraction.manifest_complete=true');
      add(errors, (extraction?.verified_samples ?? 0) > 0, 'READY requires at least one verified sample');
      add(errors, (redundancy?.independent_copies ?? 0) >= 2, 'READY requires at least two independent archive copies');
      add(errors, (redundancy?.checksum_verified_copies ?? 0) >= 2, 'READY requires two checksum-verified copies');
      add(errors, closure.dependencies_reviewed === true, 'READY requires dependencies_reviewed=true');
      add(errors, closure.recovery_material_reviewed === true, 'READY requires recovery_material_reviewed=true');
    }
  }

  walk(receipt, '$', errors);
  return {
    ok: errors.length === 0,
    errors,
    authority: 'EVIDENCE_ONLY',
    destructive_authority: 'NONE',
    next: errors.length ? 'REPAIR_PRIVATE_RETURN' : (closure?.state === 'READY_FOR_HUMAN_RELEASE' ? 'HUMAN_RELEASE_REQUIRED' : 'HOLD')
  };
}

function fixture() {
  return {
    schema: SCHEMA,
    generated_at: '2026-10-03T08:00:00+08:00',
    source: {
      class: 'account_export',
      captured_at: '2026-10-03T07:40:00+08:00',
      sha256: 'a'.repeat(64),
      bytes: 123456
    },
    extraction: {
      tool: 'private-archive-extractor',
      tool_version: '0.1.0',
      records: 100,
      parse_failures: 0,
      deduplicated_records: 97,
      verified_samples: 3,
      manifest_complete: true
    },
    redundancy: {
      independent_copies: 2,
      checksum_verified_copies: 2
    },
    public_projection: {
      dataset_id: 'chat-export-20261003',
      span: { start: '2023-06-01', end: '2026-10-03' },
      counts: { conversations: 90, messages: 900 },
      discrepancies: ['three duplicate records collapsed'],
      notes: ['raw bytes remain private']
    },
    closure: {
      state: 'READY_FOR_HUMAN_RELEASE',
      human_release_required: true,
      destructive_action_performed: false,
      dependencies_reviewed: true,
      recovery_material_reviewed: true,
      reasons: ['export preserved and verified']
    }
  };
}

function selftest() {
  const good = fixture();
  const a = validatePrivateArchiveReturn(good);
  if (!a.ok || a.next !== 'HUMAN_RELEASE_REQUIRED' || a.destructive_authority !== 'NONE') {
    throw new Error(`good fixture failed: ${JSON.stringify(a)}`);
  }

  const leaks = structuredClone(good);
  leaks.public_projection.notes.push('source was ~/private/export.zip');
  const b = validatePrivateArchiveReturn(leaks);
  if (b.ok || !b.errors.some(x => x.includes('machine-local path'))) {
    throw new Error('local-path leak was not rejected');
  }

  const premature = structuredClone(good);
  premature.redundancy.checksum_verified_copies = 1;
  const c = validatePrivateArchiveReturn(premature);
  if (c.ok || !c.errors.some(x => x.includes('two checksum-verified copies'))) {
    throw new Error('premature closure readiness was not rejected');
  }

  const account = structuredClone(good);
  account.public_projection.account_id = 'private';
  const d = validatePrivateArchiveReturn(account);
  if (d.ok || !d.errors.some(x => x.includes('private-identifier key'))) {
    throw new Error('private identifier key was not rejected');
  }

  console.log('WITNESS ARCHIVE RETURN GATE SELFTEST: PASS');
}

function usage() {
  console.error('usage: node witness/archive-return-gate.mjs --selftest | <receipt.json>');
}

const me = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(me)) {
  const arg = process.argv[2];
  if (arg === '--selftest') {
    selftest();
  } else if (arg) {
    let data;
    try {
      data = JSON.parse(fs.readFileSync(arg, 'utf8'));
    } catch (err) {
      console.error(`WITNESS ARCHIVE RETURN GATE: ERROR ${err.message}`);
      process.exit(2);
    }
    const result = validatePrivateArchiveReturn(data);
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
  } else {
    usage();
    process.exit(2);
  }
}
