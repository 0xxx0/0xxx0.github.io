import {fileURLToPath} from 'node:url';

const ROLES = new Set(['MECHANISM','SCOUT','SYNTHESIS']);
const PROMOTION = new Set(['TRANSFER','PROMOTE']);

const upper = v => String(v ?? '').trim().toUpperCase().replace(/[\s-]+/g,'_');
const nonempty = v => {
  if (v == null) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v).length > 0;
  return String(v).trim().length > 0;
};
const pick = (p,...keys) => {
  for (const k of keys) if (p?.[k] != null) return p[k];
  return null;
};
const pass = v => {
  if (v === true) return true;
  if (!v || typeof v !== 'object') return false;
  return v.pass === true || upper(v.status) === 'PASS' || upper(v.conclusion) === 'PASS';
};

export function assessDonor(packet={}) {
  if (!packet || typeof packet !== 'object' || Array.isArray(packet)) throw new Error('DONOR_PACKET_OBJECT_REQUIRED');

  const sourceId = pick(packet,'SOURCE_ID','source_id','source','url');
  const role = upper(pick(packet,'ROLE','role'));
  const claim = pick(packet,'CLAIM','claim');
  const requested = upper(pick(packet,'DISPOSITION','disposition','requested_disposition') || 'PARK');
  const kind = upper(pick(packet,'CLAIM_KIND','claim_kind','kind'));
  const promotionRequested = PROMOTION.has(requested);
  const blockers = [];

  if (!nonempty(sourceId)) blockers.push('SOURCE_ID');
  if (!ROLES.has(role)) blockers.push('ROLE');
  if (!nonempty(claim)) blockers.push('CLAIM');

  if (promotionRequested) {
    if (!nonempty(pick(packet,'PRIMARY_REF','primary_ref'))) blockers.push('PRIMARY_REF');
    if (!nonempty(pick(packet,'BASELINE','baseline'))) blockers.push('BASELINE');
    if (!nonempty(pick(packet,'FALSIFIER','falsifier'))) blockers.push('FALSIFIER');

    const replica = pick(packet,'REPLICA','replica');
    if (!pass(replica)) blockers.push('REPLICA_PASS');

    const transfer = pick(packet,'TRANSFER_TEST','transfer_test');
    if (!pass(transfer)) blockers.push('TRANSFER_TEST_PASS');

    const evidence = pick(packet,'EVIDENCE','evidence');
    if (!nonempty(evidence)) blockers.push('EVIDENCE');

    if (kind === 'OPTIMIZATION' || packet.optimization === true) {
      for (const field of ['FIXED','MUTATED','DEV_METRIC','HELD_OUT','REWARD_HACK_CHECK']) {
        if (!nonempty(pick(packet,field,field.toLowerCase()))) blockers.push(field);
      }
      if (!(transfer && typeof transfer === 'object' && transfer.independent === true)) blockers.push('INDEPENDENT_HELD_OUT_ACCEPTANCE');
    }

    if (kind === 'REPRESENTATION' || packet.representation === true) {
      for (const field of ['EXACT_SOURCE_IDENTITY','EXACT_ADDRESS_IDENTITY','LOSS_DECLARATION','RAW_BASELINE','HOST_RELATION_TEST']) {
        if (!nonempty(pick(packet,field,field.toLowerCase()))) blockers.push(field);
      }
      const relation = pick(packet,'HOST_RELATION_TEST','host_relation_test');
      if (!pass(relation)) blockers.push('HOST_RELATION_TEST_PASS');
    }
  }

  const uniqueBlockers = [...new Set(blockers)];
  const basicBlocked = uniqueBlockers.some(x=>['SOURCE_ID','ROLE','CLAIM'].includes(x));
  const allowed = promotionRequested ? uniqueBlockers.length === 0 : !basicBlocked;
  const maxDisposition = basicBlocked ? 'UNRESOLVED' : (promotionRequested && !allowed ? 'PARK' : requested);

  return {
    schema:'field/research-donor-gate/v0.1',
    source_id:sourceId || null,
    role:ROLES.has(role) ? role : null,
    requested_disposition:requested,
    allowed,
    max_disposition:maxDisposition,
    blockers:uniqueBlockers,
    authority:'EVIDENCE_GATE_ONLY / NO HOST EFFECT AUTHORITY',
    next: allowed && promotionRequested
      ? 'Eligible for host review; host authority still decides transfer.'
      : (promotionRequested ? 'Recover/replicate missing evidence or keep PARK/DONOR ONLY.' : 'Retain without promotion.')
  };
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const fs = await import('node:fs');
  const path = process.argv[2];
  if (!path) {
    console.error('usage: node tools/research-donor-gate.mjs <packet.json>');
    process.exit(64);
  }
  const packet = JSON.parse(fs.readFileSync(path,'utf8'));
  const out = assessDonor(packet);
  process.stdout.write(JSON.stringify(out,null,2)+'\n');
  if (!out.allowed && PROMOTION.has(out.requested_disposition)) process.exitCode = 2;
}
