const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number(v)||0));
const hash=(x,y,s=0)=>{let n=(x*374761393+y*668265263+s*69069)>>>0;n=(n^(n>>13))*1274126177>>>0;return ((n^(n>>16))>>>0)/4294967295};

export const INK_SCHEMA='fold-bloom-ink-field/v0.2';

export class InkField{
  constructor({width=192,height=128,seed=17}={}){
    this.width=Math.max(24,width|0);this.height=Math.max(24,height|0);this.length=this.width*this.height;this.seed=seed|0;
    this.pigment=new Float32Array(this.length);
    this.water=new Float32Array(this.length);
    this.stain=new Float32Array(this.length);
    this.nextPigment=new Float32Array(this.length);
    this.nextWater=new Float32Array(this.length);
    this.paper=new Float32Array(this.length);
    this.fiberX=new Float32Array(this.length);
    this.fiberY=new Float32Array(this.length);
    for(let y=0;y<this.height;y++)for(let x=0;x<this.width;x++){
      const i=x+y*this.width,a=hash(x,y,this.seed),b=hash(y,x,this.seed^0x51f15e);
      this.paper[i]=.78+a*.42;
      const ang=(b-.5)*Math.PI*.65;
      this.fiberX[i]=Math.cos(ang);this.fiberY[i]=Math.sin(ang);
    }
  }
  clear(){this.pigment.fill(0);this.water.fill(0);this.stain.fill(0);return this}
  dry(factor=.08){const f=clamp(factor,0,1);for(let i=0;i<this.length;i++)this.water[i]*=f;return this}
  deposit(nx,ny,{speed=0,pressure=.5,tiltX=0,tiltY=0,size=.09,water=.62,load=.72,mode='SUMI'}={}){
    const gx=clamp(nx)*this.width,gy=clamp(ny)*this.height,p=clamp(pressure,.05,1),spd=clamp(speed/42,0,1);
    const base=Math.max(1,Math.min(this.width,this.height)*clamp(size,.012,.22));
    const tilt=Math.hypot(Number(tiltX)||0,Number(tiltY)||0),angle=Math.atan2(Number(tiltY)||0,Number(tiltX)||1);
    const eccentric=1+clamp(tilt/70,0,.85)*1.7;
    const rx=base*(.58+p*.62)*(1-spd*.38)*eccentric,ry=base*(.52+p*.55)*(1-spd*.48)/Math.sqrt(eccentric);
    const c=Math.cos(angle),s=Math.sin(angle),x0=Math.max(0,Math.floor(gx-rx-2)),x1=Math.min(this.width-1,Math.ceil(gx+rx+2)),y0=Math.max(0,Math.floor(gy-rx-2)),y1=Math.min(this.height-1,Math.ceil(gy+rx+2));
    const dry=String(mode).toUpperCase()==='DRY',wash=String(mode).toUpperCase()==='WASH';
    const pigmentLoad=clamp(load)*(dry?1.15:wash?.28:1)*(0.42+p*.78)*(1-spd*.34);
    const waterLoad=clamp(water)*(dry?.18:wash?1.25:1)*(0.52+p*.55)*(1-spd*.16);
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
      const dx=x+.5-gx,dy=y+.5-gy,u=(dx*c+dy*s)/Math.max(.001,rx),v=(-dx*s+dy*c)/Math.max(.001,ry),d=Math.hypot(u,v);if(d>1)continue;
      const i=x+y*this.width,edge=Math.pow(1-d,1.55),fiber=this.paper[i],bristle=hash(x,y,this.seed^0xabc123);
      const broken=dry?clamp((bristle-.28)*1.55):1;
      const q=edge*broken*(.88+.18*(fiber-.9));
      this.pigment[i]=clamp(this.pigment[i]+q*pigmentLoad);
      this.water[i]=clamp(this.water[i]+edge*waterLoad);
      if(dry&&bristle<.38)this.water[i]*=.7;
    }
    return this;
  }
  step({bleed=1,absorb=.5,evaporation=.006,dt=1}={}){
    const W=this.width,H=this.height,p=this.pigment,w=this.water,np=this.nextPigment,nw=this.nextWater;
    const b=clamp(bleed,0,2),a=clamp(absorb,0,1.5),ev=Math.max(0,Number(evaporation)||0)*Math.max(.15,Number(dt)||1);
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      const i=x+y*W,l=x?i-1:i,r=x<W-1?i+1:i,u=y?i-W:i,d=y<H-1?i+W:i;
      const fx=this.fiberX[i],fy=this.fiberY[i];
      const wx=(w[r]-w[l])*.5,wy=(w[d]-w[u])*.5,wa=(w[l]+w[r]+w[u]+w[d])*.25;
      const pa=(p[l]+p[r]+p[u]+p[d])*.25,wet=Math.max(w[i],wa);
      const capillary=(wx*fx+wy*fy)*.018*b;
      const paper=this.paper[i],waterDiff=.09*b*(.75+paper*.25),pigDiff=.013*b*wet*(.6+paper*.42);
      nw[i]=clamp(w[i]+(wa-w[i])*waterDiff+capillary-ev*(.55+a*.65));
      const carried=(pa-p[i])*pigDiff;
      const settling=p[i]*clamp((1-nw[i])*.0018*a,0,.004);
      np[i]=clamp(p[i]+carried-settling);
      this.stain[i]=clamp(this.stain[i]+settling*(1.7+paper*.25));
    }
    this.pigment=np;this.nextPigment=p;this.water=nw;this.nextWater=w;
    return this;
  }
  rgba({paper=[241,237,224],ink=[15,19,22],warmth=.08}={}){
    const out=new Uint8ClampedArray(this.length*4),pr=paper[0],pg=paper[1],pb=paper[2],ir=ink[0],ig=ink[1],ib=ink[2],warm=clamp(warmth,0,.5);
    for(let i=0;i<this.length;i++){
      const g=(this.paper[i]-.78)/.42,grain=(g-.5)*10,wet=this.water[i],mass=clamp(this.pigment[i]*.88+this.stain[i]*1.18);
      const feather=clamp(mass*(.82+wet*.22));const k=i*4;
      out[k]=clamp((pr+grain+wet*5)*(1-feather)+ir*feather+warm*6,0,255);
      out[k+1]=clamp((pg+grain*.72+wet*4)*(1-feather)+ig*feather,0,255);
      out[k+2]=clamp((pb+grain*.48+wet*2)*(1-feather)+ib*feather-warm*5,0,255);
      out[k+3]=255;
    }
    return out;
  }
  metrics(){
    let pigment=0,water=0,stain=0,wetCells=0;
    for(let i=0;i<this.length;i++){pigment+=this.pigment[i];water+=this.water[i];stain+=this.stain[i];if(this.water[i]>.08)wetCells++}
    return {schema:INK_SCHEMA,pigment:+pigment.toFixed(3),water:+water.toFixed(3),stain:+stain.toFixed(3),wetCells};
  }
}
