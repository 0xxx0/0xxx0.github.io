export const EVENT_TAPE_SCHEMA='fold-bloom-event-tape/v0.1';

const n=x=>Number.isFinite(Number(x))?Number(x):0;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

function nearestFrame(map,time){
  const frames=Array.isArray(map?.frames)?map.frames:[];
  if(!frames.length)return null;
  const fps=n(map.frameRate)||(n(map.sampleRate)&&n(map.hop)?n(map.sampleRate)/n(map.hop):0);
  if(!fps)return frames[0]||null;
  return frames[clamp(Math.round(time*fps),0,frames.length-1)]||null;
}
function event(id,kind,t,extra={}){
  return {id,kind,t:+n(t).toFixed(6),...extra};
}
function orderedUnique(events){
  const seen=new Set();
  return events
    .filter(x=>Number.isFinite(x.t)&&x.t>=0)
    .sort((a,b)=>a.t-b.t||a.kind.localeCompare(b.kind)||a.id.localeCompare(b.id))
    .filter(x=>{const k=`${x.kind}:${x.t.toFixed(5)}:${x.op||''}`;if(seen.has(k))return false;seen.add(k);return true});
}

export function compileEventTape(map,{operations=[],sourceId=null}={}){
  if(!map||!Number.isFinite(Number(map.duration))||Number(map.duration)<=0)throw new Error('VALID_AUDIO_MAP_REQUIRED');
  const beats=(Array.isArray(map.beats)?map.beats:[]).map((t,i)=>{
    const f=nearestFrame(map,n(t));
    return event(`beat:${i}`,'BEAT',t,{energy:+clamp(n(f?.energy??f?.e),0,1).toFixed(4),flux:+clamp(n(f?.flux??f?.f),0,1).toFixed(4)});
  });
  const phrases=(Array.isArray(map.phrases)?map.phrases:[]).slice(0,-1).map((x,i)=>event(`phrase:${i}`,'PHRASE',n(x?.t),{confidence:+clamp(n(x?.confidence??x?.score??.5),0,1).toFixed(4)}));
  const sections=(Array.isArray(map.sections)?map.sections:[]).slice(0,-1).map((x,i)=>event(`section:${i}`,'SECTION',n(x?.t),{confidence:+clamp(n(x?.confidence??x?.score??.5),0,1).toFixed(4)}));
  const ops=(Array.isArray(operations)?operations:[]).map((x,i)=>event(`op:${i}`,'OPERATION',n(x?.t??x?.time),{
    op:String(x?.op||x?.operation||'MARK').toUpperCase(),
    strength:+clamp(n(x?.strength??1),0,1).toFixed(4),
    authored:true
  }));
  const events=orderedUnique([...beats,...phrases,...sections,...ops]);
  return {
    schema:EVENT_TAPE_SCHEMA,
    sourceId:sourceId||map.sourceId||null,
    duration:+n(map.duration).toFixed(6),
    bpm:n(map.bpm)||null,
    eventCount:events.length,
    events,
    authority:{
      measured:['BEAT','PHRASE','SECTION'],
      authored:['OPERATION'],
      law:'measured timing and authored operations remain distinct'
    }
  };
}

export function toBeatSaberV4Draft(tape,{laneSeed=0}={}){
  if(!tape||tape.schema!==EVENT_TAPE_SCHEMA)throw new Error('EVENT_TAPE_REQUIRED');
  const bpm=n(tape.bpm);
  if(!(bpm>0))throw new Error('BPM_REQUIRED_FOR_BEAT_EXPORT');
  const notes=[];
  const data=[];
  let noteIndex=0;
  for(const e of tape.events){
    if(e.kind!=='BEAT'&&e.kind!=='OPERATION')continue;
    const beat=+(e.t*bpm/60).toFixed(5);
    const seed=(noteIndex+Math.abs(Math.trunc(laneSeed)))>>>0;
    const x=seed%4;
    const y=(Math.floor(seed/2)+(e.kind==='OPERATION'?1:0))%3;
    const c=e.kind==='OPERATION'?1:(seed%2);
    const dir=e.kind==='OPERATION'
      ? ({FOLD:2,BLOOM:3,SPLIT:4,RETURN:0}[e.op]??8)
      : (seed%8);
    const i=data.length;
    data.push({x,y,c,d:dir,a:0});
    notes.push({b:beat,r:0,i});
    noteIndex++;
  }
  return {
    version:'4.0.0',
    colorNotes:notes,
    colorNotesData:data,
    bombNotes:[],
    bombNotesData:[],
    obstacles:[],
    obstaclesData:[],
    arcs:[],
    arcsData:[],
    chains:[],
    chainsData:[],
    spawnRotations:[],
    spawnRotationsData:[],
    _foldBloom:{
      schema:'fold-bloom-beatsaber-draft/v0.1',
      sourceEventTape:EVENT_TAPE_SCHEMA,
      warning:'Draft interactable chart only. Review/edit in a Beat Saber mapping tool before use or distribution.'
    }
  };
}
