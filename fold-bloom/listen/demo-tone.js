export function demoWavBytes(){
  const n=16000*6,b=new Uint8Array(44+n*2),d=new DataView(b.buffer);
  for(const [i,s] of [[0,'RIFF'],[8,'WAVE'],[12,'fmt '],[36,'data']])for(let j=0;j<s.length;j++)d.setUint8(i+j,s.charCodeAt(j));
  d.setUint32(4,36+n*2,true);d.setUint32(16,16,true);d.setUint16(20,1,true);d.setUint16(22,1,true);d.setUint32(24,16000,true);d.setUint32(28,32000,true);d.setUint16(32,2,true);d.setUint16(34,16,true);d.setUint32(40,n*2,true);
  for(let i=0;i<n;i++){const t=i/16000,f=[220,330,440][Math.min(2,Math.floor(t/2))],v=Math.sin(2*Math.PI*f*t)*.3;d.setInt16(44+2*i,Math.round(32767*v),true)}
  return b;
}
