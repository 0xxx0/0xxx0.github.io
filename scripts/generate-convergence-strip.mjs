#!/usr/bin/env node
/**
 * generate-convergence-strip.mjs — RETIRED SNAPSHOT COMPATIBILITY ENTRYPOINT
 *
 * FIELD convergence is composed on read at /#convRead from live canonical
 * sources. Static convergence-strip/plain snapshots were retired because a
 * timestamped committed projection immediately drifts and generated telemetry
 * commits can otherwise look like progress.
 *
 * This file now preserves only the material-history classifier + proof used by
 * CI and any legacy callers. It writes nothing.
 *
 * Usage:
 *   node scripts/generate-convergence-strip.mjs
 *   node scripts/generate-convergence-strip.mjs --selftest
 */

const TELEMETRY_SUBJECT_PATTERNS=Object.freeze([
  /^comms: refresh machine-room page\b/i,
  /^nexus: board refresh\b/i
]);

export const isGeneratedTelemetrySubject=(subject)=>
  TELEMETRY_SUBJECT_PATTERNS.some((re)=>re.test(String(subject??'').trim()));

export function runSelftest(){
  const cases=[
    ['comms heartbeat','comms: refresh machine-room page (2026-09-30T01:35Z)',true],
    ['nexus heartbeat','nexus: board refresh (2026-09-30T01:35Z)',true],
    ['real comms change','comms: enforce provenance classes',false],
    ['real nexus change','nexus: contract convergence alias',false],
    ['merge','Merge pull request #603 from 0xxx0/fix/readfield-loci-smoke-race-20260929',false],
    ['field delta','FIELD: restore packet aliases and inert RETURN on current master',false]
  ];
  for(const [name,subject,want] of cases){
    const got=isGeneratedTelemetrySubject(subject);
    if(got!==want)throw new Error(`CONVERGENCE_HISTORY_SELFTEST ${name}: got ${got}, want ${want}`);
  }
  console.log('CONVERGENCE material-history filter PASS · telemetry excluded, semantic commits retained');
}

runSelftest();
if(!process.argv.includes('--selftest')){
  console.log('STATIC CONVERGENCE SNAPSHOT RETIRED · live read: /#convRead · writes: none');
}
