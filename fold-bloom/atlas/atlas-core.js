export const ATLAS_SCHEMA='fold-bloom-glyph-atlas/v0.1';
export const MAX_ATLAS_ENTRIES=12;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function normalizeEntry(x={}){
  const g=x.glyph||{};
  return {
    id:String(x.id||g.sourceHash||'').slice(0,128),
    name:String(x.name||'UNTITLED').slice(0,96),
    artist:String(x.artist||'').slice(0,96),
    duration:+(Number(x.duration)||0).toFixed(3),
    sourceHash:String(x.sourceHash||g.sourceHash||''),
    sourceKind:String(x.sourceKind||'GLYPH_PACKET'),
    format:String(x.format||'').slice(0,64),
    album:String(x.album||'').slice(0,96),
    origin:x.origin&&typeof x.origin==='object'?{
      kind:String(x.origin.kind||'').slice(0,48),
      address:String(x.origin.address||'').slice(0,512),
      id:x.origin.id==null?null:String(x.origin.id).slice(0,128),
      resolution:x.origin.resolution==null?null:String(x.origin.resolution).slice(0,96)
    }:null,
    collection:x.collection&&typeof x.collection==='object'?{
      kind:String(x.collection.kind||'PLAYLIST').slice(0,48),
      name:String(x.collection.name||'').slice(0,96),
      address:String(x.collection.address||'').slice(0,512),
      id:x.collection.id==null?null:String(x.collection.id).slice(0,128),
      count:Number.isFinite(Number(x.collection.count))?Math.max(0,Math.trunc(Number(x.collection.count))):null
    }:null,
    textWitness:x.textWitness&&typeof x.textWitness==='object'?{
      kind:String(x.textWitness.kind||'TEXT').slice(0,32),
      alignment:String(x.textWitness.alignment||'UNALIGNED').slice(0,64),
      chars:Math.max(0,Math.trunc(Number(x.textWitness.chars)||0)),
      cues:Math.max(0,Math.trunc(Number(x.textWitness.cues)||0))
    }:null,
    glyph:{
      schema:'fold-bloom-audio-glyph/v0.1',
      sourceHash:String(g.sourceHash||x.sourceHash||''),
      seed:Number(g.seed)||0,rotation:Number(g.rotation)||0,bpm:Number(g.bpm)||0,key:g.key||null,
      sectionCount:Math.max(1,Number(g.sectionCount)||1),
      means:{energy:Number(g.means?.energy)||0,flux:Number(g.means?.flux)||0,brightness:Number(g.means?.brightness)||0},
      radial:Array.from(g.radial||[]).slice(0,24).map(v=>+clamp(Number(v)||0,0,1).toFixed(4)),
      chroma:Array.from(g.chroma||[]).slice(0,12).map(v=>+clamp(Number(v)||0,0,1).toFixed(4))
    }
  };
}
export function normalizePath(path=[],entries=[]){
  const ids=new Set(entries.map(x=>x.id)),out=[];
  for(const id of path){const s=String(id);if(ids.has(s)&&!out.includes(s))out.push(s)}
  return out;
}
export function appendPath(path=[],id,entries=[]){
  const p=normalizePath(path,entries),s=String(id||'');
  return p.includes(s)?p.filter(x=>x!==s):[...p,s].slice(-MAX_ATLAS_ENTRIES);
}
export function atlasPacket({entries=[],path=[],title='GLYPH ATLAS',note=''}={}){
  const es=entries.slice(0,MAX_ATLAS_ENTRIES).map(normalizeEntry);
  return {schema:ATLAS_SCHEMA,title:String(title).slice(0,96),note:String(note).slice(0,500),entries:es,path:normalizePath(path,es)};
}
function b64uEncode(s){
  const bytes=new TextEncoder().encode(s);let bin='';for(const b of bytes)bin+=String.fromCharCode(b);
  return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function b64uDecode(s){
  s=String(s||'').replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';
  const bin=atob(s),bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));return new TextDecoder().decode(bytes);
}
export function encodeAtlas(packet){return b64uEncode(JSON.stringify(atlasPacket(packet)))}
export function decodeAtlas(s){const x=JSON.parse(b64uDecode(s));if(x?.schema!==ATLAS_SCHEMA)throw Error('ATLAS SCHEMA');return atlasPacket(x)}
export function syntheticAtlas(){
  const defs=[
    ['FIRST LIGHT',92,'D minor',2,.31,.10,.35],
    ['GLASS RAIN',118,'A minor',4,.54,.26,.72],
    ['SLOW KITE',74,'E minor',3,.24,.08,.42],
    ['BOUND',126,'F♯ minor',5,.68,.41,.62],
    ['RETURN HOME',86,'C major',2,.39,.14,.48],
    ['NIGHT ENGINE',132,'G minor',6,.76,.52,.57]
  ];
  const entries=defs.map((d,j)=>{
    const [name,bpm,key,sectionCount,e,f,c]=d,hash=('demo'+j.toString(16)).padEnd(64,String(j+1));
    const radial=Array.from({length:24},(_,i)=>clamp(.34+e*.23+Math.sin(i*.71+j)*.10+Math.cos(i*.29+j*.6)*.055,.22,.88));
    const chroma=Array.from({length:12},(_,i)=>clamp(.12+Math.max(0,Math.cos((i-j*2)*Math.PI/6))*.72+c*.08,0,1));
    return normalizeEntry({id:hash,name,sourceHash:hash,sourceKind:'SYNTHETIC_DEMO',glyph:{sourceHash:hash,seed:101+j*91,rotation:(j*.77)%6.28,bpm,key,sectionCount,means:{energy:e,flux:f,brightness:c},radial,chroma}});
  });
  return atlasPacket({title:'DEMO CONSTELLATION',note:'Synthetic evidence only · no source audio.',entries,path:[entries[0].id,entries[2].id,entries[4].id]});
}
