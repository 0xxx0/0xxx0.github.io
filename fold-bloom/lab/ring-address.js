// One angular address across a 24-frame source glyph. Geometry is a projection;
// only the native LISTEN host may seek and only LIVE may commit a ride operation.
export const TAU=Math.PI*2;
export function boundedTime(time,duration){
  const d=Number(duration),t=Number(time);
  if(!Number.isFinite(d)||d<=0)return null;
  return Math.min(d,Math.max(0,Number.isFinite(t)?t:0));
}
export function ringPosition({x,y,left=0,top=0,width,height,rotation=0,duration}={}){
  if(![x,y,left,top,width,height,rotation].every(Number.isFinite)||
    width<=0||height<=0||boundedTime(0,duration)===null)return null;
  const cx=left+width/2,cy=top+height/2,dx=x-cx,dy=y-cy;
  const radius=Math.min(width,height)/2,dist=Math.hypot(dx,dy);
  if(dist<radius*.15||dist>radius*1.12)return null;
  // In the native glyph, radial sample 0 points at rotation - π/2.
  const start=rotation-Math.PI/2;
  const phase=((Math.atan2(dy,dx)-start)%TAU+TAU)%TAU;
  const fraction=phase/TAU;
  return {fraction,time:fraction*duration,sample:Math.min(23,Math.floor(fraction*24))};
}
export function ringMarker({time,duration,rotation=0}={}){
  const t=boundedTime(time,duration);
  if(t===null)return null;
  const a=rotation-Math.PI/2+TAU*t/duration;
  return {x:50+45*Math.cos(a),y:50+45*Math.sin(a)};
}
export function sameSource(a,b){
  return typeof a==='string'&&/^[a-f0-9]{64}$/i.test(a)&&a===b;
}
export function continuation({sourceHash,listenTime,liveHash,liveTime,duration}={}){
  if(!sameSource(sourceHash,liveHash))return {ok:false,reason:'SOURCE_MISMATCH'};
  const from=boundedTime(listenTime,duration),to=boundedTime(liveTime,duration);
  if(from===null||to===null)return {ok:false,reason:'TIME_UNVERIFIED'};
  return {ok:true,sourceHash,from,to,delta:to-from,
    law:'Same exact audio hash and native time address; musical meaning not inferred.'};
}
