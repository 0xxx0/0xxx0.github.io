export const SCORE_SCHEMA='fold-bloom-replay-score/v0.2';
export const OP_TYPES=['COMPRESS','DROP','BLOOM','FOLD','SPLIT','MESSAGE','RETURN'];
export const LAYERS=['SOURCE','MAP','IMMERSION'];
export const SCENES=['DEEP','TRANCE','WOOD','VOID'];
export const PRESETS=Object.freeze({
  CLEAR:{solidity:1,immersion:.82,dropGain:.82,anticipation:.88,motionGain:.82},
  DRIVE:{solidity:1,immersion:1.12,dropGain:1.28,anticipation:1.12,motionGain:1.18},
  TRANCE:{solidity:.94,immersion:1.22,dropGain:1.08,anticipation:1.48,motionGain:.82},
  SOFT:{solidity:1,immersion:.64,dropGain:.62,anticipation:.72,motionGain:.56}
});

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number(v)||0));
const round=(v,n=5)=>Number(Number(v).toFixed(n));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
const clean=(s,n=240)=>String(s??'').replace(/\s+/g,' ').trim().slice(0,n);
const arr=x=>Array.isArray(x)?x:[];
const clipDuration=s=>Math.max(1000,(s.source.interval_ms?.[1]||s.source.duration_ms)-(s.source.interval_ms?.[0]||0));

export function normalizeProfile(x={}){
  return {
    solidity:clamp(Number(x.solidity??1),.72,1),
    immersion:clamp(Number(x.immersion??1),.55,1.45),
    dropGain:clamp(Number(x.dropGain??1),.55,1.85),
    anticipation:clamp(Number(x.anticipation??1),.55,1.8),
    motionGain:clamp(Number(x.motionGain??1),.45,1.65),
    textOffset:Math.max(-8,Math.min(8,Number(x.textOffset)||0))
  };
}
export function wordsOf(message=''){return clean(message,180).split(/\s+/).filter(Boolean).slice(0,48)}
function defaultCue(i,n){
  const count=Math.max(1,n),start=.12,end=.86;
  return {i,at:round(count===1?.5:start+(end-start)*(i/(count-1)),5),hold:.09,emphasis:1};
}
function normalizeWordCues(message,raw=[]){
  const words=wordsOf(message),by=new Map(arr(raw).map(x=>[Number(x?.i),x]));
  return words.map((_,i)=>{
    const d=defaultCue(i,words.length),x=by.get(i)||{};
    return {i,at:round(clamp(x.at??d.at),5),hold:round(Math.max(.025,Math.min(.28,Number(x.hold)||d.hold)),5),emphasis:round(Math.max(.5,Math.min(2.4,Number(x.emphasis)||1)),4)};
  });
}
function normalizeEvidence(x={}){
  const normP=v=>round(clamp(v),5);
  const points=(xs,max=48)=>arr(xs).map(Number).filter(Number.isFinite).map(normP).filter((v,i,a)=>i===0||v!==a[i-1]).slice(0,max);
  const marks=arr(x.marks).slice(0,12).map((m,i)=>({
    id:clean(m?.id||'mark:'+i,80),kind:clean(m?.kind||'BOOKMARK',20).toUpperCase(),p:normP(m?.p??0),
    label:clean(m?.label,80),note:clean(m?.note,180),address:clean(m?.address,80),endAddress:clean(m?.endAddress,80)
  }));
  return {
    bpm:Number.isFinite(Number(x.bpm))?round(Number(x.bpm),3):null,
    stage:clean(x.stage||'UNKNOWN',20),
    beats:points(x.beats,64),phrases:points(x.phrases,24),sections:points(x.sections,16),marks
  };
}
export function normalizeScore(raw={}){
  const source=raw.source||{},duration=Math.max(4000,Math.min(3600000,Math.round(Number(source.duration_ms)||12000)));
  let interval=arr(source.interval_ms).length===2?source.interval_ms.map(Number):[0,Math.min(duration,12000)];
  interval=[Math.max(0,Math.min(duration,Math.round(interval[0]||0))),Math.max(0,Math.min(duration,Math.round(interval[1]||duration)))];
  if(interval[1]-interval[0]<1000)interval[1]=Math.min(duration,interval[0]+Math.min(12000,duration-interval[0]));
  if(interval[1]<=interval[0])interval=[0,Math.min(duration,12000)];
  const message=clean(raw.message||'MEET ME HERE',180);
  const operations=arr(raw.operations).filter(op=>OP_TYPES.includes(String(op?.type||'').toUpperCase())).map((op,i)=>({
    id:clean(op?.id||'op:'+i,50),type:String(op.type).toUpperCase(),at:round(clamp(op.at),5),
    span:round(Math.max(.02,Math.min(.35,Number(op.span)||.12)),5),intensity:round(clamp(op.intensity==null?1:op.intensity),5)
  })).sort((a,b)=>a.at-b.at||a.type.localeCompare(b.type));
  const exp=raw.experience||{},layer=LAYERS.includes(String(exp.layer||'').toUpperCase())?String(exp.layer).toUpperCase():'IMMERSION';
  const scene=SCENES.includes(String(exp.scene||'').toUpperCase())?String(exp.scene).toUpperCase():'DEEP';
  return {
    schema:SCORE_SCHEMA,
    source:{
      id:clean(source.id||'synthetic:field-message:unknown',180),profile_key:clean(source.profile_key||source.id||'GLOBAL',180),
      name:clean(source.name||'SOURCE',100),kind:clean(source.kind||'SYNTHETIC',32),duration_ms:duration,interval_ms:interval,
      address:clean(source.address,240),public_address:clean(source.public_address,360)
    },
    context:{title:clean(raw.context?.title||'WHY THIS MOMENT',120),body:clean(raw.context?.body,360)},
    message,
    wordCues:normalizeWordCues(message,raw.wordCues),
    operations,
    experience:{layer,scene,profile:normalizeProfile(exp.profile||{})},
    evidence:normalizeEvidence(raw.evidence||{}),
    returnAddress:clean(raw.returnAddress||'/fold-bloom/',280)
  };
}
export function defaultScore(){
  return normalizeScore({
    source:{id:'synthetic:field-message:001',profile_key:'synthetic:field-message:001',name:'FIELD MESSAGE',kind:'SYNTHETIC',duration_ms:12000,interval_ms:[0,12000]},
    context:{title:'WHY THIS MOMENT',body:'A compact authored message performed against one addressed interval.'},
    message:'MEET ME AT THE DROP',
    operations:[
      {type:'COMPRESS',at:.18,span:.14,intensity:.74},{type:'MESSAGE',at:.31,span:.16,intensity:.82},
      {type:'DROP',at:.48,span:.09,intensity:1},{type:'BLOOM',at:.57,span:.18,intensity:.88},
      {type:'SPLIT',at:.73,span:.12,intensity:.68},{type:'RETURN',at:.91,span:.16,intensity:1}
    ],
    experience:{layer:'IMMERSION',scene:'DEEP',profile:PRESETS.DRIVE},
    evidence:{bpm:120,beats:Array.from({length:24},(_,i)=>i/24),phrases:[0,.25,.5,.75],sections:[0,.48,.78]}
  });
}
export function setMessage(score,message){
  const prev=normalizeScore(score),next={...prev,message:clean(message,180)};
  const old=prev.wordCues;
  next.wordCues=normalizeWordCues(next.message,old);
  return normalizeScore(next);
}
export function setContext(score,patch={}){const s=normalizeScore(score);return normalizeScore({...s,context:{...s.context,...patch}})}
export function setExperience(score,patch={}){const s=normalizeScore(score);return normalizeScore({...s,experience:{...s.experience,...patch,profile:{...s.experience.profile,...(patch.profile||{})}}})}
export function applyPreset(score,name){const p=PRESETS[String(name||'').toUpperCase()];return p?setExperience(score,{profile:p}):normalizeScore(score)}
export function setWordCue(score,index,patch={}){
  const s=normalizeScore(score),i=Math.max(0,Math.min(s.wordCues.length-1,Number(index)||0));
  s.wordCues=s.wordCues.map(c=>c.i===i?{...c,...patch}:c);
  return normalizeScore(s);
}
export function setOperation(score,index,patch={}){
  const s=normalizeScore(score),i=Math.max(0,Math.min(s.operations.length-1,Number(index)||0));
  s.operations=s.operations.map((o,j)=>j===i?{...o,...patch}:o);
  return normalizeScore(s);
}
export function addOperation(score,type,at=.5){
  const s=normalizeScore(score),t=OP_TYPES.includes(String(type).toUpperCase())?String(type).toUpperCase():'MESSAGE';
  s.operations.push({id:'op:'+Date.now().toString(36),type:t,at:clamp(at),span:.1,intensity:1});
  return normalizeScore(s);
}
export function removeOperation(score,index){
  const s=normalizeScore(score);s.operations=s.operations.filter((_,i)=>i!==Number(index));return normalizeScore(s);
}
function opWindow(p,op,anticipation=1){
  const span=Math.max(.02,Math.min(.35,Number(op.span)||.12))*(op.type==='DROP'?Math.max(.75,anticipation):1),d=Math.abs(p-clamp(op.at));
  return d>=span?0:smooth(1-d/span);
}
function beatPulseAt(s,p){
  const beats=s.evidence.beats;if(!beats.length&&s.evidence.bpm){
    const dur=clipDuration(s)/1000,period=60/s.evidence.bpm,count=Math.max(1,Math.floor(dur/period));
    let best=1;for(let i=0;i<=count;i++)best=Math.min(best,Math.abs(p-i/count));return clamp(1-best*Math.max(8,count*.7));
  }
  let best=1;for(const b of beats)best=Math.min(best,Math.abs(p-b));return clamp(1-best*28);
}
export function sampleScore(score,timeMs){
  const s=normalizeScore(score),dur=clipDuration(s),p=((Number(timeMs)||0)%dur+dur)%dur/dur,prof=s.experience.profile;
  const weights=Object.fromEntries(OP_TYPES.map(k=>[k,0]));
  for(const op of s.operations)weights[op.type]=Math.max(weights[op.type],opWindow(p,op,prof.anticipation)*op.intensity);
  const compress=weights.COMPRESS,drop=weights.DROP*prof.dropGain,bloom=weights.BLOOM,fold=weights.FOLD,split=weights.SPLIT,ret=weights.RETURN,msg=weights.MESSAGE;
  const layerGain=s.experience.layer==='SOURCE'?.45:s.experience.layer==='MAP'?.7:1;
  const radius=round((.78-compress*.26+drop*.13+bloom*.32-ret*.16)*prof.solidity,5);
  const horizon=round(.5-drop*.22*prof.motionGain+bloom*.07+fold*.05+ret*(.5-(.5-drop*.22*prof.motionGain+bloom*.07)),5);
  const fork=round(split*prof.motionGain*(1-ret),5),contrast=round(clamp((.32+drop*.42+bloom*.22+msg*.09+beatPulseAt(s,p)*.08-ret*.1)*prof.immersion*layerGain),5);
  const messageOpacity=round(clamp(msg*.88+drop*.16+ret*.12),5);
  return {p:round(p,5),radius,horizon,fork,contrast,messageOpacity,beat:round(beatPulseAt(s,p),5),weights:Object.fromEntries(Object.entries(weights).map(([k,v])=>[k,round(v,5)]))};
}
export function activeWord(score,timeMs){
  const s=normalizeScore(score),dur=clipDuration(s),raw=((Number(timeMs)||0)%dur+dur)%dur/dur;
  const p=((raw+(s.experience.profile.textOffset*1000/dur))%1+1)%1,words=wordsOf(s.message);
  let best=null,bestD=Infinity;
  for(const cue of s.wordCues){const d=Math.abs(p-cue.at);if(d<=cue.hold&&d<bestD){best={...cue,text:words[cue.i]||'',p};bestD=d}}
  return best;
}
export function absoluteMs(score,p){const s=normalizeScore(score);return Math.round(s.source.interval_ms[0]+clamp(p)*clipDuration(s))}
export function relativeP(score,absoluteMsValue){const s=normalizeScore(score);return clamp((Number(absoluteMsValue)-s.source.interval_ms[0])/clipDuration(s))}
export function clipDurationMs(score){return clipDuration(normalizeScore(score))}
export function serializeScore(score){return JSON.stringify(normalizeScore(score))}
function compactCue(c,d){return Math.abs(c.at-d.at)>.00001||Math.abs(c.hold-d.hold)>.00001||Math.abs(c.emphasis-d.emphasis)>.0001?[c.i,c.at,c.hold,c.emphasis]:null}
function compactScore(score){
  const s=normalizeScore(score),words=wordsOf(s.message),wc=s.wordCues.map((c,i)=>compactCue(c,defaultCue(i,words.length))).filter(Boolean);
  return {
    v:2,s:[s.source.id,s.source.profile_key,s.source.name,s.source.kind,s.source.duration_ms,...s.source.interval_ms,s.source.address,s.source.public_address],
    c:[s.context.title,s.context.body],m:s.message,w:wc,
    o:s.operations.map(o=>[o.type,o.at,o.span,o.intensity]),
    x:[s.experience.layer,s.experience.scene,s.experience.profile.solidity,s.experience.profile.immersion,s.experience.profile.dropGain,s.experience.profile.anticipation,s.experience.profile.motionGain,s.experience.profile.textOffset],
    e:[s.evidence.bpm,s.evidence.stage,s.evidence.beats.slice(0,32),s.evidence.phrases.slice(0,16),s.evidence.sections.slice(0,12),s.evidence.marks.slice(0,8).map(m=>[m.kind,m.p,m.label,m.note,m.address,m.endAddress])],
    r:s.returnAddress
  };
}
function expandCompact(c){
  const s=arr(c.s),x=arr(c.x),e=arr(c.e);
  return normalizeScore({
    source:{id:s[0],profile_key:s[1],name:s[2],kind:s[3],duration_ms:s[4],interval_ms:[s[5],s[6]],address:s[7],public_address:s[8]},
    context:{title:c.c?.[0],body:c.c?.[1]},message:c.m,wordCues:arr(c.w).map(a=>({i:a[0],at:a[1],hold:a[2],emphasis:a[3]})),
    operations:arr(c.o).map((a,i)=>({id:'op:'+i,type:a[0],at:a[1],span:a[2],intensity:a[3]})),
    experience:{layer:x[0],scene:x[1],profile:{solidity:x[2],immersion:x[3],dropGain:x[4],anticipation:x[5],motionGain:x[6],textOffset:x[7]}},
    evidence:{bpm:e[0],stage:e[1],beats:e[2],phrases:e[3],sections:e[4],marks:arr(e[5]).map((a,i)=>({id:'mark:'+i,kind:a[0],p:a[1],label:a[2],note:a[3],address:a[4],endAddress:a[5]}))},
    returnAddress:c.r
  });
}
function bytesToB64(bytes){
  if(typeof Buffer!=='undefined')return Buffer.from(bytes).toString('base64url');
  let bin='';for(const b of bytes)bin+=String.fromCharCode(b);return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function b64ToBytes(s){
  if(typeof Buffer!=='undefined')return Uint8Array.from(Buffer.from(String(s),'base64url'));
  const x=String(s).replace(/-/g,'+').replace(/_/g,'/'),bin=atob(x+'='.repeat((4-x.length%4)%4));return Uint8Array.from(bin,c=>c.charCodeAt(0));
}
async function gzip(bytes){
  if(typeof CompressionStream==='undefined')return null;
  const cs=new CompressionStream('gzip'),writer=cs.writable.getWriter();writer.write(bytes);writer.close();
  return new Uint8Array(await new Response(cs.readable).arrayBuffer());
}
async function gunzip(bytes){
  const ds=new DecompressionStream('gzip'),writer=ds.writable.getWriter();writer.write(bytes);writer.close();
  return new Uint8Array(await new Response(ds.readable).arrayBuffer());
}
export async function encodeShare(score){
  const raw=new TextEncoder().encode(JSON.stringify(compactScore(score))),z=await gzip(raw).catch(()=>null);
  return z&&z.length<raw.length?'z.'+bytesToB64(z):'r.'+bytesToB64(raw);
}
export async function decodeShare(token){
  const [mode,payload]=String(token||'').split('.',2);if(!payload)throw Error('INVALID_SHARE_TOKEN');
  let bytes=b64ToBytes(payload);if(mode==='z')bytes=await gunzip(bytes);else if(mode!=='r')throw Error('UNKNOWN_SHARE_ENCODING');
  return expandCompact(JSON.parse(new TextDecoder().decode(bytes)));
}
export async function shareUrl(score,base){
  const token=await encodeShare(score),root=String(base||'').split('#')[0];return root+'#s='+token;
}
export function packetBytes(score){return new TextEncoder().encode(serializeScore(score)).byteLength}
function fnv1a(text){let h=0x811c9dc5;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,0x01000193)}return(h>>>0).toString(16).padStart(8,'0')}
export function visualSignature(score,samples=40){
  const s=normalizeScore(score),dur=clipDuration(s),frames=[];for(let i=0;i<samples;i++){const t=dur*i/samples;frames.push([sampleScore(s,t),activeWord(s,t)])}
  return 'fnv1a32-'+fnv1a(JSON.stringify({source:s.source,message:s.message,context:s.context,experience:s.experience,frames}));
}
