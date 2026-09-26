const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number(v)||0));
const hash=(x,y,s=0)=>{let n=(x*374761393+y*668265263+s*69069)>>>0;n=(n^(n>>13))*1274126177>>>0;return ((n^(n>>16))>>>0)/4294967295};

export const INK_SCHEMA='fold-bloom-ink-field/v0.4';

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

  deposit(nx,ny,{speed=0,pressure=.5,tiltX=0,tiltY=0,angle=null,size=.09,water=.62,load=.72,mode='SUMI',flow=1,strokeSeed=0}={}){
    const gx=clamp(nx)*this.width,gy=clamp(ny)*this.height,p=clamp(pressure,.05,1),spd=clamp(speed/42,0,1);
    const base=Math.max(1,Math.min(this.width,this.height)*clamp(size,.012,.22));
    const tilt=Math.hypot(Number(tiltX)||0,Number(tiltY)||0);
    const dir=Number.isFinite(Number(angle))?Number(angle):(tilt>1?Math.atan2(Number(tiltY)||0,Number(tiltX)||1):0);
    const tiltStretch=1+clamp(tilt/70,0,.85)*1.25;
    const motionStretch=1+spd*.32;
    const rx=base*(.62+p*.56)*(1-spd*.20)*tiltStretch*motionStretch;
    const ry=base*(.54+p*.48)*(1-spd*.28)/Math.sqrt(tiltStretch);
    const c=Math.cos(dir),s=Math.sin(dir),reach=Math.max(rx,ry);
    const x0=Math.max(0,Math.floor(gx-reach-2)),x1=Math.min(this.width-1,Math.ceil(gx+reach+2)),y0=Math.max(0,Math.floor(gy-reach-2)),y1=Math.min(this.height-1,Math.ceil(gy+reach+2));
    const dry=String(mode).toUpperCase()==='DRY',wash=String(mode).toUpperCase()==='WASH',f=clamp(flow,.04,1);
    const pigmentLoad=clamp(load)*(dry?1.12:wash?.27:1)*(0.42+p*.78)*(1-spd*.25)*f;
    const waterLoad=clamp(water)*(dry?.16:wash?1.22:1)*(0.50+p*.52)*(1-spd*.12)*f;
    const phase=(hash((strokeSeed|0)&1023,(strokeSeed|0)>>10,this.seed^0x6d2b79)-.5)*2.4;
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
      const dx=x+.5-gx,dy=y+.5-gy,u=(dx*c+dy*s)/Math.max(.001,rx),v=(-dx*s+dy*c)/Math.max(.001,ry),d=Math.hypot(u,v);if(d>1)continue;
      const i=x+y*this.width,paper=this.paper[i],grain=hash(x,y,this.seed^0xabc123);
      const rim=clamp((1-d)/.24,0,1);
      const bristle=.74+.26*Math.cos((v*8.5+phase)*Math.PI);
      const tooth=.82+.22*(paper-.78)/.42;
      const contact=dry?clamp((bristle-.48)*2.15,0,1)*clamp((grain-.16)*1.28,0,1):(.91+.09*bristle);
      const core=(.82+.18*rim),q=core*contact*tooth;
      this.pigment[i]=clamp(this.pigment[i]+q*pigmentLoad);
      this.water[i]=clamp(this.water[i]+(.72+.28*rim)*waterLoad*(dry?(.72+.28*contact):1));
      if(dry&&grain<.30)this.water[i]*=.72;
    }
    return this;
  }

  strokeSegment(x0,y0,x1,y1,opts={}){
    const ax=clamp(x0)*this.width,ay=clamp(y0)*this.height,bx=clamp(x1)*this.width,by=clamp(y1)*this.height;
    const dx=bx-ax,dy=by-ay,dist=Math.hypot(dx,dy);
    if(dist<.001){this.deposit(bx/this.width,by/this.height,opts);return this}

    // Dragging is a swept brush contact, not a cloud of independent dabs.
    // Rasterize only the newly swept strip (open at its start), so pointer
    // event density does not materially change ink mass or create spray dots.
    const tx=dx/dist,ty=dy/dist,nx=-ty,ny=tx;
    const p=clamp(opts.pressure??.5,.05,1),spd=clamp((Number(opts.speed)||0)/42,0,1);
    const base=Math.max(1,Math.min(this.width,this.height)*clamp(opts.size??.09,.012,.22));
    const tiltX=Number(opts.tiltX)||0,tiltY=Number(opts.tiltY)||0,tilt=Math.hypot(tiltX,tiltY);
    const crossTilt=tilt>0?Math.abs((tiltX*nx+tiltY*ny)/70):0;
    const halfWidth=base*(.54+p*.50)*(1-spd*.25)*(1+clamp(crossTilt,0,.8)*.62);
    const reach=halfWidth+1.5;
    const xMin=Math.max(0,Math.floor(Math.min(ax,bx)-reach)),xMax=Math.min(this.width-1,Math.ceil(Math.max(ax,bx)+reach));
    const yMin=Math.max(0,Math.floor(Math.min(ay,by)-reach)),yMax=Math.min(this.height-1,Math.ceil(Math.max(ay,by)+reach));
    const dry=String(opts.mode||'SUMI').toUpperCase()==='DRY',wash=String(opts.mode||'SUMI').toUpperCase()==='WASH';
    const flow=clamp(opts.flow??1,.04,1),load=clamp(opts.load??.72),water=clamp(opts.water??.62);
    const pigmentLoad=load*(dry?1.10:wash?.28:1)*(0.43+p*.76)*(1-spd*.22)*flow;
    const waterLoad=water*(dry?.15:wash?1.20:1)*(0.52+p*.48)*(1-spd*.10)*flow;
    const seed=Number.isFinite(Number(opts.strokeSeed))?Number(opts.strokeSeed):0;
    const phase=(hash(seed&1023,seed>>10,this.seed^0x6d2b79)-.5)*Math.PI*1.8;

    for(let y=yMin;y<=yMax;y++)for(let x=xMin;x<=xMax;x++){
      const rx=x+.5-ax,ry=y+.5-ay,along=rx*tx+ry*ty;
      if(along<=0||along>dist)continue;
      const cross=rx*nx+ry*ny,u=Math.abs(cross)/Math.max(.001,halfWidth);
      if(u>=1)continue;
      const i=x+y*this.width,paper=this.paper[i],grain=hash(x,y,this.seed^0xabc123);
      // Soft compressed brush footprint; coherent bristle lanes run along the
      // stroke instead of re-randomizing at every pointer sample.
      const body=Math.pow(Math.max(0,1-u*u),.42);
      const lane=.78+.22*Math.cos((cross/Math.max(1,halfWidth)*7.5)*Math.PI+phase+along/Math.max(1,base)*.08);
      const tooth=.80+.24*(paper-.78)/.42;
      const contact=dry?clamp((lane-.46)*2.05,0,1)*clamp((grain-.13)*1.23,0,1):(.92+.08*lane);
      const q=body*contact*tooth;
      this.pigment[i]=clamp(this.pigment[i]+q*pigmentLoad);
      this.water[i]=clamp(this.water[i]+body*waterLoad*(dry?(.68+.32*contact):1));
      if(dry&&grain<.28)this.water[i]*=.70;
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
