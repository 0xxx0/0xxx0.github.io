// Read-only harmonic evidence from the native LISTEN deep map.
// A whole-song chroma profile is NOT chord recognition, transcription, or authored harmony.
export const PITCH_CLASSES=Object.freeze(['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B']);
export function harmonicEvidence(map){
  const key=map?.key,raw=key?.chroma;
  if(map?.stage!=='DEEP'||!Array.isArray(raw)||raw.length!==12)
    return {kind:'UNMEASURED',label:'PITCH NOT MEASURED',top:[],key:null,confidence:0};
  const values=raw.map(v=>Math.max(0,Number.isFinite(Number(v))?Number(v):0));
  const sum=values.reduce((a,b)=>a+b,0);
  if(sum<=1e-9)return {kind:'UNMEASURED',label:'NO TONAL EVIDENCE',top:[],key:null,confidence:0};
  const top=values.map((value,i)=>({pitch:PITCH_CLASSES[i],pc:i,weight:+(value/sum).toFixed(4)}))
    .sort((a,b)=>b.weight-a.weight||a.pc-b.pc).slice(0,3);
  const confidence=Math.max(0,Math.min(1,Number(key.confidence)||0));
  const estimatedKey=typeof key.label==='string'&&key.label!=='—'?key.label:null;
  const kind=estimatedKey?'ESTIMATED':'CHROMA_ONLY';
  return {kind,key:estimatedKey,confidence,top,
    label:(estimatedKey?'KEY ESTIMATE '+estimatedKey+' · ':'CHROMA · ')+top.map(x=>x.pitch).join(' / '),
    law:'Whole-source chroma strength is approximate pitch-class evidence; no chord or melody is inferred.'};
}
