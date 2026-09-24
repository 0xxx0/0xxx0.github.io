export const BEAT_SABER_PACK_SCHEMA='fold-bloom-beatsaber-pack/v0.1';

const enc=new TextEncoder();
const u8=x=>x instanceof Uint8Array?x:x instanceof ArrayBuffer?new Uint8Array(x):enc.encode(String(x??''));
const json=x=>enc.encode(JSON.stringify(x,null,2)+'\n');
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const finite=(x,f=0)=>Number.isFinite(Number(x))?Number(x):f;

function extOf(meta={}){
  const name=String(meta.name||'').toLowerCase();
  const m=name.match(/\.([a-z0-9]+)$/);
  if(m)return m[1];
  const type=String(meta.type||'').toLowerCase();
  if(type.includes('ogg'))return'ogg';
  if(type.includes('wav'))return'wav';
  if(type.includes('mpeg')||type.includes('mp3'))return'mp3';
  if(type.includes('mp4')||type.includes('m4a'))return'm4a';
  if(type.includes('aac'))return'aac';
  if(type.includes('flac'))return'flac';
  return'bin';
}
function cleanTitle(meta={}){
  const raw=String(meta.title||meta.name||'FOLD BLOOM SOURCE').replace(/\.[^.]+$/,'').trim();
  return raw.slice(0,96)||'FOLD BLOOM SOURCE';
}
function cleanAuthor(meta={}){
  return String(meta.artist||meta.author||'').trim().slice(0,96);
}
function cleanBase(meta={}){
  return cleanTitle(meta).replace(/[^a-z0-9_-]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,48)||'fold-bloom-source';
}

export function classifyBeatSaberAudio(meta={}){
  const sourceExt=extOf(meta);
  const ready=sourceExt==='ogg'||sourceExt==='egg';
  return {
    sourceExt,
    status:ready?'AUDIO_READY_FOR_PLAYTEST':'NEEDS_OGG_CONVERSION',
    playtestReady:ready,
    bundledAudioFilename:ready?('song.'+sourceExt):('SOURCE.'+sourceExt),
    requiredAudioFilename:ready?('song.'+sourceExt):'song.ogg',
    reason:ready
      ?'Source audio is already in the normal Beat Saber custom-level OGG/EGG path.'
      :'Source bytes are preserved in the bundle, but convert them to OGG as song.ogg before in-game/editor playtest.'
  };
}

export function beatSaberAudioData(map={},meta={}){
  const bpm=finite(map.bpm);
  const duration=Math.max(0,finite(map.duration,finite(meta.duration)));
  const sampleRate=Math.max(1,Math.round(finite(meta.sourceSampleRate,44100)));
  const samples=Math.max(1,Math.round(duration*sampleRate));
  const beats=+(duration*Math.max(1,bpm)/60).toFixed(6);
  return {
    version:'4.0.0',
    songChecksum:'',
    songSampleCount:samples,
    songFrequency:sampleRate,
    bpmData:[{si:0,ei:samples,sb:0,eb:beats}],
    lufsData:[{si:0,ei:samples,l:0}]
  };
}

export function beatSaberInfo(map={},meta={},audioStatus=classifyBeatSaberAudio(meta)){
  const bpm=Math.max(1,finite(map.bpm,120));
  const duration=Math.max(0,finite(map.duration,finite(meta.duration)));
  return {
    version:'4.0.0',
    song:{
      title:cleanTitle(meta),
      subTitle:'FOLD//BLOOM mapper draft',
      author:cleanAuthor(meta)
    },
    audio:{
      songFilename:audioStatus.requiredAudioFilename,
      songDuration:+duration.toFixed(6),
      audioDataFilename:'AudioData.dat',
      bpm:+bpm.toFixed(6),
      lufs:0,
      previewStartTime:0,
      previewDuration:+Math.min(12,duration||12).toFixed(3)
    },
    songPreviewFilename:audioStatus.requiredAudioFilename,
    environmentNames:['DefaultEnvironment'],
    colorSchemes:[],
    difficultyBeatmaps:[{
      characteristic:'Standard',
      difficulty:'ExpertPlus',
      beatmapAuthors:{mappers:['FOLD//BLOOM · DRAFT'],lighters:[]},
      environmentNameIdx:0,
      beatmapColorSchemeIdx:-1,
      noteJumpMovementSpeed:18,
      noteJumpStartBeatOffset:.5,
      beatmapDataFilename:'ExpertPlusStandard.dat',
      lightshowDataFilename:'Lightshow.dat'
    }]
  };
}

export function cleanBeatSaberChart(chart){
  if(!chart||!String(chart.version||'').startsWith('4.'))throw new Error('BEAT_SABER_V4_CHART_REQUIRED');
  const out=typeof structuredClone==='function'?structuredClone(chart):JSON.parse(JSON.stringify(chart));
  delete out._foldBloom;
  if(!Array.isArray(out.colorNotes))out.colorNotes=[];
  if(!Array.isArray(out.bombNotes))out.bombNotes=[];
  if(!Array.isArray(out.obstacles))out.obstacles=[];
  return out;
}

export function buildBeatSaberFiles({chart,map,fileMeta={},sourceBytes,generatedAt=null}={}){
  if(!sourceBytes)throw new Error('SOURCE_AUDIO_BYTES_REQUIRED');
  const audio=classifyBeatSaberAudio(fileMeta),source=u8(sourceBytes);
  if(!source.length)throw new Error('SOURCE_AUDIO_BYTES_REQUIRED');
  const cleanChart=cleanBeatSaberChart(chart);
  const sourceId=fileMeta.hash?('sha256:'+fileMeta.hash):(fileMeta.sourceId||fileMeta.sourceAddress||null);
  const manifest={
    schema:BEAT_SABER_PACK_SCHEMA,
    status:audio.status,
    generated:generatedAt||null,
    source:{
      id:sourceId,
      name:fileMeta.name||null,
      type:fileMeta.type||null,
      bytes:source.length
    },
    beatmap:{
      version:'4.0.0',
      difficulty:'ExpertPlus',
      characteristic:'Standard',
      eventCount:Array.isArray(cleanChart.colorNotes)?cleanChart.colorNotes.length:0
    },
    audio,
    authority:{
      source:'original local/decoded source bytes supplied by the user/runtime',
      map:'measured/derived FOLD//BLOOM AUDIO MAP',
      chart:'generated mapper draft; human review remains required'
    },
    warning:audio.playtestReady
      ?'Mapper draft only. Review note flow, parity, safety and difficulty before distribution.'
      :'Not playtest-ready yet: convert bundled SOURCE audio to OGG as song.ogg, then review in a Beat Saber mapping tool.'
  };
  const readme=[
    'FOLD//BLOOM — BEAT SABER V4 MAPPER PACK',
    '',
    'STATUS: '+audio.status,
    'SOURCE: '+String(fileMeta.name||'source'),
    'BPM: '+String(map?.bpm||'unknown'),
    '',
    audio.reason,
    '',
    'FILES',
    '- Info.dat — v4 level metadata',
    '- AudioData.dat — constant-BPM audio timing metadata',
    '- ExpertPlusStandard.dat — generated interactable chart',
    '- Lightshow.dat — minimal empty v4 lightshow',
    '- FOLD_BLOOM_MANIFEST.json — provenance / authority / conversion status',
    '- '+audio.bundledAudioFilename+' — exact current source bytes',
    '',
    'BOUNDARY',
    'This is a generated mapper starting point, not a quality/ranked map.',
    'Measured timing is evidence; note placement remains a generated draft.',
    'Review/edit before sharing or distribution.'
  ].join('\n')+'\n';
  return {
    manifest,
    files:[
      {name:'Info.dat',data:json(beatSaberInfo(map,fileMeta,audio))},
      {name:'AudioData.dat',data:json(beatSaberAudioData(map,fileMeta))},
      {name:'ExpertPlusStandard.dat',data:json(cleanChart)},
      {name:'Lightshow.dat',data:json({version:'4.0.0'})},
      {name:'FOLD_BLOOM_MANIFEST.json',data:json(manifest)},
      {name:'README.txt',data:enc.encode(readme)},
      {name:audio.bundledAudioFilename,data:source}
    ]
  };
}

const CRC_TABLE=(()=>{
  const t=new Uint32Array(256);
  for(let n=0;n<256;n++){
    let c=n;
    for(let k=0;k<8;k++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);
    t[n]=c>>>0;
  }
  return t;
})();
export function crc32(data){
  let c=0xffffffff;
  for(const b of u8(data))c=CRC_TABLE[(c^b)&255]^(c>>>8);
  return (c^0xffffffff)>>>0;
}
function le16(v){const b=new Uint8Array(2),d=new DataView(b.buffer);d.setUint16(0,v,true);return b}
function le32(v){const b=new Uint8Array(4),d=new DataView(b.buffer);d.setUint32(0,v>>>0,true);return b}
function concat(parts){
  const xs=parts.map(u8),len=xs.reduce((n,x)=>n+x.length,0),out=new Uint8Array(len);
  let p=0;for(const x of xs){out.set(x,p);p+=x.length}return out;
}
export function zipStore(files=[]){
  const locals=[],central=[];let offset=0;
  for(const file of files){
    const name=enc.encode(String(file.name)),data=u8(file.data),crc=crc32(data),flags=0x0800;
    const local=concat([
      le32(0x04034b50),le16(20),le16(flags),le16(0),le16(0),le16(0),
      le32(crc),le32(data.length),le32(data.length),le16(name.length),le16(0),name,data
    ]);
    locals.push(local);
    central.push(concat([
      le32(0x02014b50),le16(20),le16(20),le16(flags),le16(0),le16(0),le16(0),
      le32(crc),le32(data.length),le32(data.length),le16(name.length),le16(0),le16(0),
      le16(0),le16(0),le32(0),le32(offset),name
    ]));
    offset+=local.length;
  }
  const body=concat(locals),dir=concat(central);
  const end=concat([
    le32(0x06054b50),le16(0),le16(0),le16(files.length),le16(files.length),
    le32(dir.length),le32(body.length),le16(0)
  ]);
  return concat([body,dir,end]);
}

export function buildBeatSaberPack(args={}){
  const built=buildBeatSaberFiles(args),bytes=zipStore(built.files);
  const base=cleanBase(args.fileMeta||{});
  return {
    schema:BEAT_SABER_PACK_SCHEMA,
    status:built.manifest.status,
    playtestReady:built.manifest.audio.playtestReady,
    filename:base+'-beat-saber-v4.zip',
    bytes,
    manifest:built.manifest,
    files:built.files.map(x=>x.name)
  };
}
