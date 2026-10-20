// CPU-only fallback for ordinary PCM16 WAV; PREVIEW evidence, never inferred tempo.
// No WebAudio context, worker, provider or model needed.
export function monoPcm16Wav(bytes,{targetRate=12000,maxSeconds=1200}={}){
  const a=bytes instanceof ArrayBuffer?new Uint8Array(bytes):bytes;
  if(!(a instanceof Uint8Array)||a.byteLength<44)return null;
  const dv=new DataView(a.buffer,a.byteOffset,a.byteLength);
  const ascii=(i,n)=>Array.from(a.subarray(i,i+n),x=>String.fromCharCode(x)).join('');
  if(ascii(0,4)!=='RIFF'||ascii(8,4)!=='WAVE')return null;
  let fmt=null,data=null,at=12;
  while(at+8<=a.byteLength){
    const id=ascii(at,4),size=dv.getUint32(at+4,true),start=at+8,end=start+size;
    if(end>a.byteLength)throw Error('WAV_TRUNCATED_CHUNK');
    if(id==='fmt '&&size>=16)fmt={format:dv.getUint16(start,true),channels:dv.getUint16(start+2,true),rate:dv.getUint32(start+4,true),align:dv.getUint16(start+12,true),bits:dv.getUint16(start+14,true)};
    if(id==='data'){data={start,size};break}
    at=end+(size&1);
  }
  if(!fmt||!data||fmt.format!==1||fmt.bits!==16)return null;
  if(fmt.channels<1||fmt.channels>8||fmt.rate<8000||fmt.rate>192000||fmt.align!==fmt.channels*2)throw Error('WAV_INVALID_LAYOUT');
  const frames=Math.floor(data.size/fmt.align),duration=frames/fmt.rate;
  if(!(frames>0)||duration>maxSeconds)return null;
  const sr=Math.min(fmt.rate,Math.max(4000,Math.round(targetRate)||12000));
  const count=Math.max(1,Math.floor(duration*sr)),pcm=new Float32Array(count);
  for(let i=0;i<count;i++){
    const sourceIndex=Math.min(frames-1,Math.floor(i*fmt.rate/sr)),start=data.start+sourceIndex*fmt.align;
    let v=0;
    for(let c=0;c<fmt.channels;c++)v+=dv.getInt16(start+2*c,true)/32768;
    pcm[i]=v/fmt.channels;
  }
  return {pcm,sampleRate:sr,sourceSampleRate:fmt.rate,duration,channels:fmt.channels,authority:'PCM16_EXACT_SAMPLES_PREVIEW'};
}
