const textDecoder=new TextDecoder('utf-8',{fatal:false});
const latin1Decoder=typeof TextDecoder!=='undefined'?new TextDecoder('latin1',{fatal:false}):null;
const CONTAINERS=new Set(['moov','udta','ilst','trak','mdia','minf','stbl']);

function be32(b,o){return ((b[o]<<24)>>>0)|(b[o+1]<<16)|(b[o+2]<<8)|b[o+3]}
function typeAt(b,o){
  return String.fromCharCode(b[o],b[o+1],b[o+2],b[o+3]);
}
function decodeText(bytes){
  try{return textDecoder.decode(bytes).replace(/\0+$/g,'').trim()}catch(_){
    if(latin1Decoder)try{return latin1Decoder.decode(bytes).replace(/\0+$/g,'').trim()}catch(__){}
    return Array.from(bytes,x=>String.fromCharCode(x)).join('').replace(/\0+$/g,'').trim();
  }
}
function atoms(bytes,start=0,end=bytes.length,depth=0,out=[]){
  let p=start;
  while(p+8<=end){
    let size=be32(bytes,p),type=typeAt(bytes,p+4),header=8;
    if(size===1&&p+16<=end){
      const hi=be32(bytes,p+8),lo=be32(bytes,p+12);
      if(hi!==0)break;
      size=lo;header=16;
    }else if(size===0)size=end-p;
    if(size<header||p+size>end)break;
    out.push({type,start:p,size,header,depth});
    let childStart=p+header;
    if(type==='meta')childStart+=4;
    if(CONTAINERS.has(type)||type==='meta')atoms(bytes,childStart,p+size,depth+1,out);
    p+=size;
  }
  return out;
}
function childData(bytes,item){
  const start=item.start+item.header,end=item.start+item.size;
  let p=start;
  while(p+8<=end){
    const size=be32(bytes,p),type=typeAt(bytes,p+4);
    if(size<8||p+size>end)break;
    if(type==='data'){
      const payloadStart=Math.min(p+16,p+size);
      return bytes.slice(payloadStart,p+size);
    }
    p+=size;
  }
  return null;
}
function numeric(payload){
  if(!payload?.length)return null;
  if(payload.length>=4)return be32(payload,payload.length-4);
  if(payload.length>=2)return (payload[payload.length-2]<<8)|payload[payload.length-1];
  return payload[0];
}
export function parseMp4Meta(input){
  const bytes=input instanceof Uint8Array?input:new Uint8Array(input||0);
  if(bytes.length<12)return {present:false,supported:false};
  const top=atoms(bytes);
  const ftyp=top.find(a=>a.type==='ftyp');
  if(!ftyp)return {present:false,supported:false};
  const ilst=top.find(a=>a.type==='ilst');
  const result={present:true,supported:true,container:'MP4',title:'',artist:'',album:'',genre:'',lyrics:'',bpm:null,key:'',lyricsAlignment:null,coverArt:false};
  if(!ilst)return result;
  const items=atoms(bytes,ilst.start+ilst.header,ilst.start+ilst.size,ilst.depth+1,[]);
  for(const item of items){
    const data=childData(bytes,item);if(!data)continue;
    const t=item.type;
    if(t==='©nam')result.title=decodeText(data)||result.title;
    else if(t==='©ART'||t==='aART')result.artist=decodeText(data)||result.artist;
    else if(t==='©alb')result.album=decodeText(data)||result.album;
    else if(t==='©gen')result.genre=decodeText(data)||result.genre;
    else if(t==='©lyr'){result.lyrics=decodeText(data)||result.lyrics;if(result.lyrics)result.lyricsAlignment='UNALIGNED_EMBEDDED_MP4'}
    else if(t==='tmpo'){const n=numeric(data);if(Number.isFinite(n)&&n>0&&n<1000)result.bpm=n}
    else if(t==='©key')result.key=decodeText(data)||result.key;
    else if(t==='covr')result.coverArt=!!data.length;
  }
  return result;
}
export function mp4DisplayName(meta={},fallback='AUDIO'){
  const title=String(meta.title||'').trim(),artist=String(meta.artist||'').trim();
  return title?(artist?`${artist} — ${title}`:title):fallback;
}
