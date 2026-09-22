const DOCUMENT_ADAPTER_SCHEMA='field-source-adapter/document/v0.1';
const DOCUMENT_WITNESS_SCHEMA='field-document-witness/v0.1';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const parser=()=>globalThis.FieldDocumentStructure;
const extOf=name=>{const m=String(name||'').toLowerCase().match(/\.([a-z0-9]+)$/);return m?m[1]:''};
const formatOf=name=>['md','markdown'].includes(extOf(name))?'MD':'TXT';
const countWords=text=>[...String(text||'').matchAll(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu)].length;
function hashSeed(input=''){let h=2166136261>>>0;for(const ch of String(input||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0}return h>>>0}
async function sha256(buffer){
  const subtle=globalThis.crypto?.subtle;if(!subtle)throw Error('WebCrypto unavailable');
  const h=await subtle.digest('SHA-256',buffer);
  return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export {DOCUMENT_ADAPTER_SCHEMA,DOCUMENT_WITNESS_SCHEMA};
export function isDocumentFile(file){return ['txt','md','markdown'].includes(extOf(file?.name))}
export function analyzeDocumentText(text,{format='TXT'}={}){
  const api=parser();if(!api?.parseDocumentStructure)throw Error('Document structure parser unavailable');
  return api.parseDocumentStructure(String(text??''),{format});
}
export function documentGlyphDescriptor({hash,text,structure}={}){
  const raw=String(text||''),seed=hashSeed(hash),TAU=Math.PI*2,rotation=((seed%360)/360)*TAU;
  const radial=Array.from({length:24},(_,i)=>{
    const a=Math.floor(i*raw.length/24),b=Math.floor((i+1)*raw.length/24),chunk=raw.slice(a,Math.max(a+1,b));
    const non=(chunk.match(/\S/g)||[]).length,d=chunk.length?non/chunk.length:0;
    return +clamp(.28+d*.52,.28,.86).toFixed(4);
  });
  const bins=Array.from({length:12},()=>0),paras=structure?.paragraphs||[],sections=structure?.sections||[];
  for(const p of paras){const i=raw.length?Math.min(11,Math.floor((p.start/raw.length)*12)):0;bins[i]+=1}
  for(const s of sections){const i=Math.min(11,Math.max(0,(Number(s.depth)||1)-1));bins[i]+=1.5}
  for(let i=0;i<12;i++)bins[i]+=(hashSeed(hash+':'+i)%17)/100;
  const mx=Math.max(.0001,...bins),chroma=bins.map(v=>+(v/mx).toFixed(4));
  const words=countWords(raw),chars=Math.max(1,raw.length),pc=Math.max(1,paras.length);
  return {
    schema:'fold-bloom-audio-glyph/v0.1',sourceHash:String(hash||''),seed,rotation:+rotation.toFixed(6),bpm:0,key:null,
    sectionCount:Math.max(1,sections.length||1),
    means:{
      energy:+clamp(words/Math.max(1,chars/5),0,1).toFixed(4),
      flux:+clamp(sections.length/pc,0,1).toFixed(4),
      brightness:+clamp(paras.length/Math.max(1,chars/400),0,1).toFixed(4)
    },
    radial,chroma
  };
}
export async function adaptDocumentFile(file){
  if(!isDocumentFile(file))throw Error('Unsupported document type');
  const buffer=await file.arrayBuffer(),hash=await sha256(buffer.slice(0)),text=new TextDecoder('utf-8',{fatal:false}).decode(buffer),format=formatOf(file.name);
  if(!text.trim())return {schema:DOCUMENT_ADAPTER_SCHEMA,materializable:false,reason:'EMPTY_DOCUMENT',exact:{hash,name:String(file.name||'UNTITLED'),size:Number(file.size)||buffer.byteLength,mediaType:String(file.type||''),encoding:'utf-8'}};
  const structure=analyzeDocumentText(text,{format}),words=countWords(text),glyph=documentGlyphDescriptor({hash,text,structure});
  const entry={
    id:hash,name:String(file.name||'UNTITLED').slice(0,96),artist:'',album:'',duration:0,sourceHash:hash,sourceKind:'LOCAL_DOCUMENT',format,
    textWitness:{kind:'DOCUMENT',alignment:'STRUCTURAL',chars:text.length,cues:structure.counts.sections},
    document:{schema:DOCUMENT_WITNESS_SCHEMA,sections:structure.counts.sections,paragraphs:structure.counts.paragraphs,words,headingDepth:structure.counts.maxHeadingDepth},
    glyph
  };
  return {schema:DOCUMENT_ADAPTER_SCHEMA,materializable:true,exact:{hash,name:String(file.name||'UNTITLED'),size:Number(file.size)||buffer.byteLength,mediaType:String(file.type||''),encoding:'utf-8'},structure,entry,runtime:{text}};
}
export function documentRuntimeKey(sourceHash){return 'fold-bloom.document-source.v1:'+String(sourceHash||'')}
export function storeDocumentRuntime(sourceHash,text){try{globalThis.sessionStorage?.setItem(documentRuntimeKey(sourceHash),String(text??''));return true}catch(_){return false}}
export function loadDocumentRuntime(sourceHash){try{return globalThis.sessionStorage?.getItem(documentRuntimeKey(sourceHash))??null}catch(_){return null}}
export function clearDocumentRuntime(sourceHash){try{globalThis.sessionStorage?.removeItem(documentRuntimeKey(sourceHash));return true}catch(_){return false}}
export function makeReadfieldHandoff(entry,text,{address='section://0',charIndex=null,returnAddress='/fold-bloom/atlas/'}={}){
  return {schema:'readfield.handoff/v1',source:String(text??''),label:String(entry?.name||'DOCUMENT'),sourceIdentity:{hash:String(entry?.sourceHash||''),kind:String(entry?.sourceKind||'LOCAL_DOCUMENT'),format:String(entry?.format||'TXT'),glyph:entry?.glyph?JSON.parse(JSON.stringify(entry.glyph)):null},address:address||null,charIndex:Number.isFinite(Number(charIndex))?Number(charIndex):null,returnAddress:String(returnAddress||'/fold-bloom/atlas/')};
}
