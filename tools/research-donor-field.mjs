import {fileURLToPath} from 'node:url';
import {assessDonor} from './research-donor-gate.mjs';
import {reducePacket} from '../lib/field-egress-reducer.mjs';

const PROMOTION = new Set(['TRANSFER','PROMOTE']);
const BASIC = new Set(['SOURCE_ID','ROLE','CLAIM']);

const pick = (p,...keys) => {
  for (const k of keys) if (p?.[k] != null) return p[k];
  return null;
};

const firstOf = (blockers, ordered) => ordered.find(x=>blockers.includes(x)) || null;

const FRAME_BLOCKERS = [
  'BASELINE','FALSIFIER',
  'FIXED','MUTATED','DEV_METRIC','HELD_OUT','REWARD_HACK_CHECK',
  'EXACT_SOURCE_IDENTITY','EXACT_ADDRESS_IDENTITY','LOSS_DECLARATION','RAW_BASELINE'
];

function laneFor(packet, assessment) {
  const blockers = assessment.blockers || [];
  if (blockers.some(x=>BASIC.has(x))) return 'UNRESOLVED';
  if (assessment.allowed && PROMOTION.has(assessment.requested_disposition)) return 'READY';
  if (!PROMOTION.has(assessment.requested_disposition)) return 'PARK';
  if (blockers.includes('PRIMARY_REF')) return 'RECOVER_PRIMARY';
  if (blockers.some(x=>FRAME_BLOCKERS.includes(x))) return 'FRAME_TEST';
  if (blockers.includes('REPLICA_PASS')) return 'REPLICATE';
  if (blockers.includes('HOST_RELATION_TEST') || blockers.includes('HOST_RELATION_TEST_PASS')) return 'TRANSFER_TEST';
  if (blockers.includes('TRANSFER_TEST_PASS') || blockers.includes('INDEPENDENT_HELD_OUT_ACCEPTANCE') || blockers.includes('EVIDENCE')) return 'TRANSFER_TEST';
  return 'PARK';
}

function nextActionFor(packet, assessment, lane) {
  const blockers = assessment.blockers || [];
  const source = assessment.source_id || 'donor';
  const host = pick(packet,'CURRENT_HOST','current_host','HOST','host') || 'the named current host';

  if (lane === 'READY') {
    return `Prepare a host-scoped transfer packet for ${host}; native host acceptance and authority still decide any effect.`;
  }
  if (lane === 'PARK') return null;

  const blocker = firstOf(blockers, [
    'SOURCE_ID','ROLE','CLAIM','PRIMARY_REF','BASELINE','FALSIFIER',
    'FIXED','MUTATED','DEV_METRIC','HELD_OUT','REWARD_HACK_CHECK',
    'EXACT_SOURCE_IDENTITY','EXACT_ADDRESS_IDENTITY','LOSS_DECLARATION','RAW_BASELINE',
    'REPLICA_PASS','HOST_RELATION_TEST','HOST_RELATION_TEST_PASS',
    'TRANSFER_TEST_PASS','INDEPENDENT_HELD_OUT_ACCEPTANCE','EVIDENCE'
  ]);

  switch (blocker) {
    case 'SOURCE_ID': return 'Bind the candidate to one exact external source identifier before continuing.';
    case 'ROLE': return `Classify ${source} as MECHANISM, SCOUT, or SYNTHESIS without raising its evidence authority.`;
    case 'CLAIM': return `State one falsifiable claim from ${source}; do not continue from topic-level interest.`;
    case 'PRIMARY_REF': return `Recover the closest primary paper, code, benchmark, or specification supporting the claim from ${source}.`;
    case 'BASELINE': return `Bind an explicit baseline for the claim before testing transfer into ${host}.`;
    case 'FALSIFIER': return 'State the observable result that would weaken the donor claim before building the replica.';
    case 'FIXED': return 'Declare the model, tools, data/environment, and versions that remain fixed during optimization.';
    case 'MUTATED': return 'Declare exactly which harness, prompt, reducer, or tool policy may change.';
    case 'DEV_METRIC': return 'Name the development metric used to search or tune; keep it separate from acceptance.';
    case 'HELD_OUT': return 'Define held-out acceptance tasks that are not used during tuning.';
    case 'REWARD_HACK_CHECK': return 'Define how metric gaming or self-scoring will be detected independently.';
    case 'EXACT_SOURCE_IDENTITY': return 'Bind exact source identity outside the lossy representation.';
    case 'EXACT_ADDRESS_IDENTITY': return 'Bind exact address identity outside the lossy representation.';
    case 'LOSS_DECLARATION': return 'Declare which information the proposed representation intentionally discards.';
    case 'RAW_BASELINE': return 'Define a raw/carrier baseline for comparison with the proposed representation.';
    case 'REPLICA_PASS': return `Run one bounded replica of the named observable from ${source} against the bound baseline.`;
    case 'HOST_RELATION_TEST':
    case 'HOST_RELATION_TEST_PASS': return `Test whether the representation preserves the exact relation ${host} needs; fail closed if it does not.`;
    case 'TRANSFER_TEST_PASS': return `Run one bounded transfer test inside ${host} without granting the donor effect authority.`;
    case 'INDEPENDENT_HELD_OUT_ACCEPTANCE': return 'Validate the transfer on independent held-out acceptance rather than the development critic/metric.';
    case 'EVIDENCE': return 'Attach exact evidence refs for the replica/transfer result before requesting promotion.';
    default: return 'Resolve the remaining evidence debt or keep the donor parked.';
  }
}

function actionPacketFor(record) {
  if (!record.next_action) {
    return {
      packet_id:`research-donor:${record.source_id || 'unresolved'}`,
      SOURCE_REFS: record.source_id ? [record.source_id] : [],
      STOP:{explicit:true,reason:'donor_has_no_executable_next_action'},
      AUTHORITY:{can_select_now:false,scope:'RESEARCH_PREP_ONLY',host_effect:false}
    };
  }
  return {
    packet_id:`research-donor:${record.source_id || 'unresolved'}`,
    SOURCE_REFS: record.source_id ? [record.source_id] : [],
    OBJECT: record.claim || null,
    CURRENT_HOST: record.current_host || null,
    NEXT:{exists:true,executable:true,action:record.next_action},
    AUTHORITY:{can_select_now:false,scope:'RESEARCH_PREP_ONLY',host_effect:false},
    RETURN:{path:record.return_path || null,format:'STATE / DELTA / EVIDENCE / RESIDUE / WAITING / ONE_NEXT'}
  };
}

export function compileDonorField(packets=[], options={}) {
  if (!Array.isArray(packets)) throw new Error('DONOR_FIELD_ARRAY_REQUIRED');

  const donors = packets.map(packet => {
    const assessment = assessDonor(packet);
    const lane = laneFor(packet, assessment);
    return {
      source_id:assessment.source_id,
      role:assessment.role,
      claim:pick(packet,'CLAIM','claim') || null,
      current_host:pick(packet,'CURRENT_HOST','current_host','HOST','host') || null,
      return_path:pick(packet,'RETURN_PATH','return_path') || null,
      requested_disposition:assessment.requested_disposition,
      max_disposition:assessment.max_disposition,
      lane,
      blockers:assessment.blockers,
      next_action:nextActionFor(packet, assessment, lane),
      authority:assessment.authority
    };
  });

  const counts = donors.reduce((out,d)=>{
    out[d.lane]=(out[d.lane]||0)+1;
    return out;
  },{});

  const selectedId = options.selected_source_id ?? options.selected ?? null;
  let selected = null;
  if (selectedId != null) {
    const record = donors.find(d=>d.source_id === selectedId);
    if (!record) throw new Error('DONOR_FIELD_SELECTION_NOT_FOUND');
    const packet = actionPacketFor(record);
    selected = {
      ...record,
      action_packet:packet,
      egress:reducePacket(packet,{})
    };
  }

  return {
    schema:'field/research-donor-field/v0.1',
    authority:'STATELESS_PROJECTION / NO ATTENTION OR HOST EFFECT AUTHORITY',
    counts,
    donors,
    selected,
    selection_required:selectedId == null && donors.some(d=>d.next_action)
  };
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const fs = await import('node:fs');
  const args = process.argv.slice(2);
  const path = args[0];
  if (!path) {
    console.error('usage: node tools/research-donor-field.mjs <batch.json> [--select <source-id>]');
    process.exit(64);
  }
  const selectAt = args.indexOf('--select');
  const selected_source_id = selectAt >= 0 ? args[selectAt+1] : null;
  if (selectAt >= 0 && !selected_source_id) {
    console.error('--select requires an exact source id');
    process.exit(64);
  }
  const parsed = JSON.parse(fs.readFileSync(path,'utf8'));
  const packets = Array.isArray(parsed) ? parsed : parsed?.donors;
  const out = compileDonorField(packets,{selected_source_id});
  process.stdout.write(JSON.stringify(out,null,2)+'\n');
}
