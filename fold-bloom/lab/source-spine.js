// One bounded continuity witness. Native hosts retain their source, clock and release authority.
const hex=s=>typeof s==='string'&&/^[a-f0-9]{64}$/i.test(s)?s.toLowerCase():null;
const finite=(n,fallback=0)=>Number.isFinite(Number(n))?Number(n):fallback;
export function holdSource({hash,time=0,duration=0,scope='TRACK',pins=[],releasesBefore=0}={}){
  const sourceHash=hex(hash);
  if(!sourceHash)return {ok:false,reason:'SOURCE_HASH_REQUIRED'};
  const length=Math.max(0,finite(duration));
  return {ok:true,schema:'fold-bloom-source-spine/v0.1',authority:'WITNESS_ONLY',
    sourceHash,sourceAddress:Math.max(0,Math.min(length,finite(time))),
    duration:length,scope:String(scope||'TRACK').slice(0,20),
    pinIds:(Array.isArray(pins)?pins:[]).slice(0,64).map(p=>String(p?.id||'')).filter(Boolean),
    releasesBefore:Math.max(0,Math.trunc(finite(releasesBefore))),phase:'HELD'};
}
export function returnToSource(held,{rideHash=null,releasesAfter=0,currentSourceHash=null}={}){
  if(!held?.ok||held.schema!=='fold-bloom-source-spine/v0.1')return {ok:false,reason:'HELD_SOURCE_REQUIRED'};
  const actual=hex(rideHash),current=hex(currentSourceHash),same=actual===held.sourceHash&&current===held.sourceHash;
  const after=Math.max(0,Math.trunc(finite(releasesAfter)));
  const before=held.releasesBefore;
  return {ok:same,schema:'fold-bloom-source-spine-return/v0.1',authority:'WITNESS_ONLY',
    status:same?'MATCHED':'SOURCE_MISMATCH',sourceHash:held.sourceHash,rideHash:actual,
    time:held.sourceAddress,duration:held.duration,scope:held.scope,pinIds:[...held.pinIds],
    releasesBefore:before,releasesAfter:after,releases:Math.max(0,after-before),
    note:same?'Source identity and address checked; native RIDE release count witnessed, not replayed or merged.':'No exact return proof: one source identity differs.'};
}
