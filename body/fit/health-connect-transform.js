(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.HealthConnectBodyFit=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const EXPORT_SCHEMA='0xxx0/health-connect-export/v0.1';
  const BUNDLE_SCHEMA='0xxx0/body-sensor-bundle/v0.1';
  const OBS_SCHEMA='0xxx0/body-sensor-observation/v0.1';

  function finite(n){n=Number(n);return Number.isFinite(n)?n:null}
  function iso(x){if(!x)return null;const d=new Date(x);return Number.isFinite(d.getTime())?d.toISOString():null}
  function meta(r){return r&&typeof r.metadata==='object'&&r.metadata?r.metadata:{}}
  function sourceClass(r){
    const d=meta(r).device||{},t=String(d.type||'').toUpperCase();
    if(t.includes('WATCH'))return'WEARABLE';
    if(t.includes('PHONE'))return'PHONE';
    return'IMPORT';
  }
  function packageName(r){return String(meta(r).data_origin_package||meta(r).dataOriginPackageName||'unknown')}
  function sourceId(r){return 'hc:'+packageName(r)+':'+String(r.type||'UnknownRecord')}
  function provenance(r,derivedness,extra){
    const m=meta(r),d=m.device||{};
    return Object.assign({
      adapter:'0xxx0/body-fit-health-connect-transform/v0.1',
      source_schema:EXPORT_SCHEMA,
      source_record_type:r.type||null,
      source_record_id:r.id||null,
      data_origin_package:packageName(r),
      recording_method:m.recording_method??m.recordingMethod??null,
      device:{manufacturer:d.manufacturer||null,model:d.model||null,type:d.type||null},
      last_modified_time:iso(m.last_modified_time||m.lastModifiedTime),
      derivedness
    },extra||{});
  }
  function obs(r,property,value,unit,time,derivedness,refSuffix,extraProv){
    return {
      schema:OBS_SCHEMA,
      source_id:sourceId(r),
      source_class:sourceClass(r),
      observed_property:property,
      result:{value,unit:unit??null},
      phenomenon_time:iso(time)||iso(r.start_time)||iso(r.end_time)||new Date(0).toISOString(),
      recorded_at:iso(meta(r).last_modified_time||meta(r).lastModifiedTime),
      acquisition_method:'Health Connect '+String(r.type||'record'),
      availability:'LAST_KNOWN',
      source_ref:'hc:'+(r.id||'unidentified')+(refSuffix||''),
      fitting_id:null,
      feature_of_interest:{kind:'WHOLE_BODY',body_address:null,house_area:null},
      provenance:provenance(r,derivedness,extraProv)
    };
  }
  function transformRecord(r){
    const out=[];
    if(!r||typeof r!=='object')return out;
    const type=String(r.type||'');
    if(type==='SleepSessionRecord'){
      const st=iso(r.start_time),en=iso(r.end_time);
      if(st&&en){
        const min=Math.max(0,(new Date(en)-new Date(st))/60000);
        out.push(obs(r,'sleep.duration',Math.round(min*10)/10,'min',en,'D3','',{source_interval:{start:st,end:en},stage_count:Array.isArray(r.stages)?r.stages.length:0}));
        out.push(obs(r,'sleep.session',String(r.title||'sleep'),null,st,'D1',':session',{source_interval:{start:st,end:en},stages:Array.isArray(r.stages)?r.stages:[]}));
      }
    }else if(type==='HeartRateRecord'){
      for(const s of Array.isArray(r.samples)?r.samples:[]){
        const bpm=finite(s.bpm??s.beats_per_minute);
        const time=iso(s.time);
        if(bpm!=null&&time)out.push(obs(r,'heart_rate',bpm,'bpm',time,'D0','#'+time));
      }
    }else if(type==='RestingHeartRateRecord'){
      const bpm=finite(r.bpm??r.beats_per_minute);
      if(bpm!=null)out.push(obs(r,'heart_rate.resting',bpm,'bpm',r.time||r.start_time||r.end_time,'D1'));
    }else if(type==='HeartRateVariabilityRmssdRecord'){
      const ms=finite(r.rmssd_ms??r.heart_rate_variability_millis);
      if(ms!=null)out.push(obs(r,'hrv.rmssd',ms,'ms',r.time||r.start_time||r.end_time,'D1'));
    }else if(type==='ExerciseSessionRecord'){
      const st=iso(r.start_time),en=iso(r.end_time);
      if(st&&en){
        out.push(obs(r,'exercise.session',String(r.exercise_type||r.title||'exercise'),null,st,'D1','',{source_interval:{start:st,end:en}}));
        out.push(obs(r,'exercise.duration',Math.round(Math.max(0,(new Date(en)-new Date(st))/6000))/10,'min',en,'D3',':duration',{source_interval:{start:st,end:en}}));
      }
    }
    return out;
  }
  function transformExport(packet){
    if(!packet||packet.schema!==EXPORT_SCHEMA)throw new Error('Expected '+EXPORT_SCHEMA);
    const rows=Array.isArray(packet.records)?packet.records:[];
    const observations=[],ignored={};
    for(const r of rows){
      const xs=transformRecord(r);
      if(xs.length)observations.push(...xs);
      else ignored[String(r?.type||'UNKNOWN')]=(ignored[String(r?.type||'UNKNOWN')]||0)+1;
    }
    return {
      schema:BUNDLE_SCHEMA,
      generated_at:new Date().toISOString(),
      source:{schema:EXPORT_SCHEMA,exported_at:packet.exported_at||null,window:packet.window||null,record_count:rows.length,ignored},
      observations
    };
  }
  return Object.freeze({EXPORT_SCHEMA,BUNDLE_SCHEMA,OBS_SCHEMA,transformRecord,transformExport});
});
