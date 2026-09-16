// Forward Field Proof — canonical scorer v1
// Pure derivation only: observations in, metrics out. No UI state is mutated.

const median = values => {
  const xs = values.filter(Number.isFinite).sort((a,b)=>a-b);
  if(!xs.length) return null;
  const m=Math.floor(xs.length/2);
  return xs.length%2 ? xs[m] : (xs[m-1]+xs[m])/2;
};

const orderedEvents = (data, episodeId) => data.events
  .filter(e=>e.episode_id===episodeId)
  .sort((a,b)=>(a.t_ms-b.t_ms)||((a.seq||0)-(b.seq||0)));

const episodeInterruptions = (data, episodeId) => data.interruptions
  .filter(i=>i.episode_id===episodeId)
  .sort((a,b)=>(a.started||a.started_ms)-(b.started||b.started_ms));

function interruptionDurationBefore(interruptions, startAbs, endAbs){
  let total=0;
  for(const i of interruptions){
    const s=i.started ?? i.started_ms;
    const e=i.ended ?? i.ended_ms;
    if(!Number.isFinite(s)||!Number.isFinite(e)) continue;
    const lo=Math.max(startAbs,s), hi=Math.min(endAbs,e);
    if(hi>lo) total+=hi-lo;
  }
  return total;
}

export function scoreReorientation(data, episode){
  const events=orderedEvents(data,episode.id||episode.episode_id);
  const interruptions=episodeInterruptions(data,episode.id||episode.episode_id);
  const view=events.find(e=>e.event==='view_ready');
  const acts=events.filter(e=>e.event==='act');
  if(!view) return {clean_success:false,latency_ms:null,wrong_first:false,eventual_success:false,eventual_latency_ms:null,censored:true,wrong_actions_before_correct:0};
  const first=acts[0]||null;
  const primary=episode.snapshot.primary ?? episode.snapshot.primary_task_id;
  if(!first) return {clean_success:false,latency_ms:null,wrong_first:false,eventual_success:false,eventual_latency_ms:null,censored:true,wrong_actions_before_correct:0};
  const viewAbs=view.at_ms ?? ((episode.started??episode.started_ms)+view.t_ms);
  const firstAbs=first.at_ms ?? ((episode.started??episode.started_ms)+first.t_ms);
  const paused=interruptionDurationBefore(interruptions,viewAbs,firstAbs);
  const firstLatency=Math.max(0,firstAbs-viewAbs-paused);
  const correct=first.task_id===primary;
  const eventual=acts.find(e=>e.task_id===primary)||null;
  let eventualLatency=null, wrongBefore=acts.length;
  if(eventual){
    const eventualAbs=eventual.at_ms ?? ((episode.started??episode.started_ms)+eventual.t_ms);
    eventualLatency=Math.max(0,eventualAbs-viewAbs-interruptionDurationBefore(interruptions,viewAbs,eventualAbs));
    wrongBefore=acts.indexOf(eventual);
  }
  return {clean_success:correct,latency_ms:correct?firstLatency:null,wrong_first:!correct,eventual_success:Boolean(eventual),eventual_latency_ms:eventualLatency,censored:false,wrong_actions_before_correct:wrongBefore};
}

export function scoreRecoveries(data, episode){
  const episodeId=episode.id||episode.episode_id;
  const events=orderedEvents(data,episodeId);
  const ints=episodeInterruptions(data,episodeId).filter(i=>Number.isFinite(i.ended??i.ended_ms));
  const episodeEnd=episode.ended ?? episode.ended_ms ?? Infinity;
  return ints.map((intr,index)=>{
    const end=intr.ended ?? intr.ended_ms;
    const nextStart=(ints[index+1]?.started ?? ints[index+1]?.started_ms) ?? episodeEnd;
    const target=intr.task ?? intr.interrupted_task_id;
    const acts=events.filter(e=>e.event==='act' && (e.at_ms??0)>=end && (e.at_ms??0)<nextStart);
    const first=acts[0]||null;
    const eventual=acts.find(e=>e.task_id===target)||null;
    if(!first){
      return {interruption_id:intr.id||intr.interruption_id,clean_success:false,latency_ms:null,wrong_first:false,eventual_latency_ms:null,censored_by:nextStart<episodeEnd?'next_interruption':'episode_end'};
    }
    const clean=first.task_id===target;
    return {interruption_id:intr.id||intr.interruption_id,clean_success:clean,latency_ms:clean?(first.at_ms-end):null,wrong_first:!clean,eventual_latency_ms:eventual?(eventual.at_ms-end):null,censored_by:null};
  });
}

export function scoreConstraints(data, episode){
  const events=orderedEvents(data,episode.id||episode.episode_id);
  const snap=episode.snapshot;
  const tasks=snap.tasks||{};
  const anchors=snap.anchors||snap.hard_constraints||[];
  const acts=events.filter(e=>e.event==='act' && e.value?.phase!=='resume_ack');
  let scorable=0,misses=0; const reasons={};
  for(const a of acts){
    const t=tasks[a.task_id]; const at=Number(a.value?.at_min);
    if(!t||!Number.isFinite(at)) continue;
    const duration=t.duration ?? t.duration_min;
    const earliest=t.earliest ?? t.earliest_min;
    const latest=t.latest ?? t.latest_min;
    if(![duration,earliest,latest].every(Number.isFinite)) continue;
    scorable++;
    const end=at+duration, local=[];
    if(at<earliest||end>latest) local.push('outside_task_window');
    const overlap=anchors.some(c=>{
      const cs=c.start ?? c.start_min, ce=c.end ?? c.end_min;
      return Number.isFinite(cs)&&Number.isFinite(ce)&&at<ce&&end>cs;
    });
    if(overlap) local.push('hard_commitment_overlap');
    if(local.length){
      misses++;
      for(const r of local) reasons[r]=(reasons[r]||0)+1;
    }
  }
  return {acts_scorable:scorable,acts_with_miss:misses,miss_rate:scorable?misses/scorable:null,reasons};
}

export function scoreOpportunities(data, episode){
  const events=orderedEvents(data,episode.id||episode.episode_id);
  const eligible=new Set(episode.snapshot.eligible||episode.snapshot.eligible_opportunity_ids||[]);
  const noticed=[...new Set(events.filter(e=>e.event==='opportunity_notice').map(e=>e.task_id).filter(Boolean))];
  const good=noticed.filter(id=>eligible.has(id));
  const falsePos=noticed.filter(id=>!eligible.has(id));
  return {available:eligible.size,noticed:good.length,recall:eligible.size?good.length/eligible.size:null,false_positive_count:falsePos.length,zero_opportunity_correct:eligible.size===0?falsePos.length===0:null};
}

export function scoreEpisode(data, episodeId){
  const episode=data.episodes.find(e=>(e.id||e.episode_id)===episodeId);
  if(!episode) return null;
  return {episode_id:episodeId,condition:episode.condition||episode.assigned_projection,reorientation:scoreReorientation(data,episode),recoveries:scoreRecoveries(data,episode),constraints:scoreConstraints(data,episode),opportunities:scoreOpportunities(data,episode)};
}

export function summarizeCondition(data, condition){
  const episodes=data.episodes.filter(e=>(e.ended||e.ended_at||e.ended_ms)&&(e.condition||e.assigned_projection)===condition);
  const scores=episodes.map(e=>scoreEpisode(data,e.id||e.episode_id)).filter(Boolean);
  if(!scores.length) return null;
  const rClean=scores.filter(s=>s.reorientation.clean_success);
  const recoveries=scores.flatMap(s=>s.recoveries), recClean=recoveries.filter(r=>r.clean_success);
  const acts=scores.reduce((n,s)=>n+s.constraints.acts_scorable,0), misses=scores.reduce((n,s)=>n+s.constraints.acts_with_miss,0);
  const avail=scores.reduce((n,s)=>n+s.opportunities.available,0), noticed=scores.reduce((n,s)=>n+s.opportunities.noticed,0);
  const zero=scores.filter(s=>s.opportunities.available===0), zeroCorrect=zero.filter(s=>s.opportunities.zero_opportunity_correct).length;
  const falseTotal=scores.reduce((n,s)=>n+s.opportunities.false_positive_count,0);
  return {
    condition,trials_total:scores.length,
    reorientation:{clean_success_rate:rClean.length/scores.length,wrong_first_rate:scores.filter(s=>s.reorientation.wrong_first).length/scores.length,censor_rate:scores.filter(s=>s.reorientation.censored).length/scores.length,median_clean_latency_ms:median(rClean.map(s=>s.reorientation.latency_ms)),eventual_success_rate:scores.filter(s=>s.reorientation.eventual_success).length/scores.length},
    recovery:{interruptions_total:recoveries.length,clean_success_rate:recoveries.length?recClean.length/recoveries.length:null,wrong_first_rate:recoveries.length?recoveries.filter(r=>r.wrong_first).length/recoveries.length:null,censor_rate:recoveries.length?recoveries.filter(r=>r.censored_by).length/recoveries.length:null,median_clean_latency_ms:median(recClean.map(r=>r.latency_ms)),eventual_success_rate:recoveries.length?recoveries.filter(r=>r.clean_success||Number.isFinite(r.eventual_latency_ms)).length/recoveries.length:null},
    constraints:{acts_scorable:acts,acts_with_miss:misses,miss_rate:acts?misses/acts:null,trials_with_any_miss:scores.filter(s=>s.constraints.acts_with_miss>0).length},
    opportunities:{eligible_total:avail,noticed_total:noticed,micro_recall:avail?noticed/avail:null,trial_recall_median:median(scores.map(s=>s.opportunities.recall)),zero_opportunity_trials:zero.length,zero_opportunity_accuracy:zero.length?zeroCorrect/zero.length:null,false_positive_total:falseTotal,false_positive_per_trial:falseTotal/scores.length}
  };
}

export function participantSummary(data){
  return {PLAIN:summarizeCondition(data,'PLAIN'),FIELD:summarizeCondition(data,'FIELD')};
}

export function pairedDelta(data){
  const p=summarizeCondition(data,'PLAIN'), f=summarizeCondition(data,'FIELD');
  if(!p||!f) return null;
  const d=(a,b)=>a==null||b==null?null:a-b;
  return {
    reorientation_clean_success:d(f.reorientation.clean_success_rate,p.reorientation.clean_success_rate),
    reorientation_latency_ms:d(f.reorientation.median_clean_latency_ms,p.reorientation.median_clean_latency_ms),
    recovery_clean_success:d(f.recovery.clean_success_rate,p.recovery.clean_success_rate),
    recovery_latency_ms:d(f.recovery.median_clean_latency_ms,p.recovery.median_clean_latency_ms),
    constraint_miss_rate:d(f.constraints.miss_rate,p.constraints.miss_rate),
    opportunity_micro_recall:d(f.opportunities.micro_recall,p.opportunities.micro_recall),
    zero_opportunity_accuracy:d(f.opportunities.zero_opportunity_accuracy,p.opportunities.zero_opportunity_accuracy)
  };
}
