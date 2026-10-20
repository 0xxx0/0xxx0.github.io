// Bounded deterministic PCM WAV preview. Pure sampling, never a replacement for
// general media decoding, never inferred chords or synthetic source evidence.
export function decodePcmWavPreview(bytes,{targetRate=12000,maxSeconds=1200}={}){
  if(!(bytes instanceof ArrayBuffer)||bytes.byteLength<44)return null;
  const v=new DataView(bytes),tag=(p)=>String.fromCharCode(...new Uint8Array(bytes,p,4));
  if(tag(0)!=='RIFF'||tag(8)!=='WAVE')return null;
  let fmt=null,data=null;
  for(let p=12;p+8<=v.byteLength;){
    const len=v.getUint32(p+4,true),start=p+8;
    if(len>v.byteLength-start)return null;
    const name=tag(p);
    if(name==='fmt '&&len>=16){
      fmt={codec:v.getUint16(start,true),channels:v.getUint16(start+2,true),
        rate:v.getUint32(start+4,true),align:v.getUint16(start+12,true),bits:v.getUint16(start+14,true)};
    }
    if(name==='data'){data={start,len};break}
    p=start+len+(len%2);
  }
  if(!fmt||!data||fmt.codec!==1||![1,2].includes(fmt.channels)||
    fmt.bits!==16||fmt.align!==2*fmt.channels||fmt.rate<4000||fmt.rate>192000)return null;
  const frames=Math.floor(data.len/fmt.align),duration=frames/fmt.rate;
  if(!(duration>0)||duration>maxSeconds)return null;
  const rate=Math.min(fmt.rate,Math.max(1000,targetRate)),n=Math.max(1,Math.floor(duration*rate));
  const pcm=new Float32Array(n);
  const sample=index=>{
    const i=data.start+Math.min(frames-1,Math.max(0,index))*fmt.align;
    let sum=0;
    for(let c=0;c<fmt.channels;c++)sum+=v.getInt16(i+c*2,true)/32768;
    return sum/fmt.channels;
  };
  for(let i=0;i<n;i++){
    const position=i*fmt.rate/rate,j=Math.floor(position),a=position-j;
    pcm[i]=sample(j)*(1-a)+sample(Math.min(frames-1,j+1))*a;
  }
  return {pcm,sampleRate:rate,sourceSampleRate:fmt.rate,duration};
}
