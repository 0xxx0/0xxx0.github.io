export const TAU=Math.PI*2;
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const wrap=(v,n=1)=>((v%n)+n)%n;
export function circularDelta(a,b,n=1){
  let d=(a-b)%n;
  if(d>n/2)d-=n;
  if(d<-n/2)d+=n;
  return d;
}
export function pointAngle01(x,y,cx,cy,phase=-Math.PI/2){
  const a=Math.atan2(y-cy,x-cx)-phase;
  return wrap(a/TAU,1);
}
export function pointSlot(x,y,cx,cy,count,phase=-Math.PI/2){
  const raw=pointAngle01(x,y,cx,cy,phase)*count;
  return {raw,slot:wrap(Math.round(raw),count)};
}

/* Geometry only. These helpers do not own source, mode, lens or game semantics. */
export function polarPoint(index,count,{cx=0,cy=0,radius=1,phase=-Math.PI/2}={}){
  const n=Math.max(1,Number(count)||1),i=wrap(Number(index)||0,n),a=phase+i/n*TAU;
  return {index:i,count:n,angle:a,x:cx+Math.cos(a)*radius,y:cy+Math.sin(a)*radius,radius};
}
export function polarSlots(count,options={}){
  const n=Math.max(1,Math.floor(Number(count)||1));
  return Array.from({length:n},(_,i)=>polarPoint(i,n,options));
}
export function annulusContains(x,y,{cx=0,cy=0,inner=0,outer=1}={}){
  const d=Math.hypot(Number(x)-cx,Number(y)-cy);
  return d>=Math.min(inner,outer)&&d<=Math.max(inner,outer);
}
export function polarBandPoint(index,count,{cx=0,cy=0,inner=0,outer=1,t=.5,phase=-Math.PI/2}={}){
  return polarPoint(index,count,{cx,cy,radius:inner+(outer-inner)*clamp(Number(t)||0,0,1),phase});
}
export function polarCssPosition(index,count,{radiusPct=45,phase=-Math.PI/2}={}){
  const p=polarPoint(index,count,{cx:50,cy:50,radius:Number(radiusPct)||0,phase});
  return {left:`${+p.x.toFixed(4)}%`,top:`${+p.y.toFixed(4)}%`,angle:p.angle};
}

export class PolarDetent {
  constructor({count=12,snap=16,drag=0.045}={}){
    this.count=count;this.snapRate=snap;this.drag=drag;this.value=0;this.velocity=0;
    this.target=0;this.snapping=false;
  }
  set(v){this.value=v;this.velocity=0;this.snapping=false;return this.value}
  impulse(delta,dt=.016){
    this.value+=delta;this.velocity=clamp(delta/Math.max(.008,dt),-5,5);this.snapping=false;return this.value
  }
  detent(dir=0){
    const step=1/this.count;
    this.target=Math.round(this.value/step)*step+Math.sign(dir)*step;
    this.snapping=true;return this.target
  }
  step(dir=1){return this.detent(dir)}
  snap(){return this.detent(0)}
  goto(index){
    const base=wrap(index,this.count)/this.count;
    const k=Math.round(this.value-base);
    this.target=base+k;this.snapping=true;return this.target;
  }
  update(dt){
    if(this.snapping){
      const d=this.target-this.value;
      if(Math.abs(d)<.0003){this.value=this.target;this.velocity=0;this.snapping=false}
      else this.value+=d*Math.min(1,dt*this.snapRate);
    }else{
      this.value+=this.velocity*dt;
      this.velocity*=Math.pow(this.drag,dt);
    }
    return this.value;
  }
  tick(dt){return this.update(dt)}
  index(){return wrap(Math.round(this.value*this.count),this.count)}
}
