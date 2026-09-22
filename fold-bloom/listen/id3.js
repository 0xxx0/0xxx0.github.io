const synchsafe4=(a,b,c,d)=>((a&0x7f)<<21)|((b&0x7f)<<14)|((c&0x7f)<<7)|(d&0x7f);
const be32=(a,b,c,d)=>(((a<<24)>>>0)|(b<<16)|(c<<8)|d)>>>0;
const clean=s=>String(s||'').replace(/\0+$/g,'').trim();

function latin1(bytes){return Array.from(bytes,b=>String.fromCharCode(b)).join('')}
function utf16(bytes,be=false){
  let off=0,little=!be;
  if(bytes.length>=2){
    if(bytes[0]===0xff&&bytes[1]===0xfe){little=true;off=2}
    else if(bytes[0]===0xfe&&bytes[1]===0xff){little=false;off=2}
  }
  let out='';
  for(let i=off;i+1<bytes.length;i+=2){
    const code=little?(bytes[i]|bytes[i+1]<<8):(bytes[i]<<8|bytes[i+1]);
    if(code)out+=String.fromCharCode(code);
  }
  return out;
}
function decodeText(bytes,enc=3){
  if(!bytes?.length)return '';
  try{
    if(enc===0)return clean(latin1(bytes));
    if(enc===1)return clean(utf16(bytes,false));
    if(enc===2)return clean(utf16(bytes,true));
    return clean(new TextDecoder('utf-8',{fatal:false}).decode(bytes));
  }catch(_){return clean(latin1(bytes))}
}
function terminatorLen(enc){return enc===1||enc===2?2:1}
function findTerm(bytes,start,enc){
  const n=terminatorLen(enc);
  if(n===1){for(let i=start;i<bytes.length;i++)if(bytes[i]===0)return i}
  else{for(let i=start;i+1<bytes.length;i+=2)if(bytes[i]===0&&bytes[i+1]===0)return i}
  return bytes.length;
}
function parseTextFrame(body){
  if(!body?.length)return '';
  return decodeText(body.slice(1),body[0]);
}
function parseUslt(body){
  if(!body?.length)return null;
  const enc=body[0],lang=latin1(body.slice(1,4)),descStart=4,descEnd=findTerm(body,descStart,enc),n=terminatorLen(enc);
  const description=decodeText(body.slice(descStart,descEnd),enc);
  const text=decodeText(body.slice(Math.min(body.length,descEnd+n)),enc);
  if(!text)return null;
  return {language:clean(lang)||null,description:description||null,text,alignment:'UNALIGNED_EMBEDDED_ID3'};
}
function deunsync(bytes){
  const out=[];
  for(let i=0;i<bytes.length;i++){
    out.push(bytes[i]);
    if(bytes[i]===0xff&&bytes[i+1]===0x00)i++;
  }
  return new Uint8Array(out);
}
export function parseId3(input){
  const bytes=input instanceof Uint8Array?input:new Uint8Array(input||0);
  if(bytes.length<10||latin1(bytes.slice(0,3))!=='ID3')return {present:false};
  const major=bytes[3],flags=bytes[5],tagSize=synchsafe4(bytes[6],bytes[7],bytes[8],bytes[9]);
  if(major!==3&&major!==4)return {present:true,version:`2.${major}`,supported:false};
  let body=bytes.slice(10,Math.min(bytes.length,10+tagSize));
  if(flags&0x80)body=deunsync(body);
  let pos=0;
  if(flags&0x40&&body.length>=4){
    const ext=major===4?synchsafe4(body[0],body[1],body[2],body[3]):be32(body[0],body[1],body[2],body[3]);
    pos=Math.min(body.length,major===3?4+ext:ext);
  }
  const frames={};
  while(pos+10<=body.length){
    const id=latin1(body.slice(pos,pos+4));
    if(!/^[A-Z0-9]{4}$/.test(id))break;
    const size=major===4?synchsafe4(body[pos+4],body[pos+5],body[pos+6],body[pos+7]):be32(body[pos+4],body[pos+5],body[pos+6],body[pos+7]);
    if(!size||pos+10+size>body.length)break;
    const data=body.slice(pos+10,pos+10+size);
    if(id==='USLT'){const u=parseUslt(data);if(u)frames.USLT=u}
    else if(/^T[A-Z0-9]{3}$/.test(id)&&id!=='TXXX'){const v=parseTextFrame(data);if(v)frames[id]=v}
    pos+=10+size;
  }
  const bpm=Number.parseFloat(frames.TBPM);
  const lyrics=frames.USLT?.text||'';
  return {
    present:true,supported:true,version:`2.${major}`,
    title:frames.TIT2||'',artist:frames.TPE1||'',album:frames.TALB||'',genre:frames.TCON||'',
    bpm:Number.isFinite(bpm)?bpm:null,key:frames.TKEY||'',lyrics,
    lyricsLanguage:frames.USLT?.language||null,lyricsDescription:frames.USLT?.description||null,
    lyricsAlignment:lyrics?frames.USLT.alignment:null
  };
}
export function id3DisplayName(meta={},fallback='AUDIO'){
  const title=clean(meta.title),artist=clean(meta.artist);
  return title?(artist?`${artist} — ${title}`:title):fallback;
}
