const VERT=`#version 300 es
in vec2 p;out vec2 vUv;
void main(){vUv=p*.5+.5;gl_Position=vec4(p,0.,1.);}
`;
const FRAG=`#version 300 es
precision highp float;
in vec2 vUv;out vec4 outColor;
uniform vec2 uRes;
uniform float uTime,uEnergy,uFlux,uCentroid,uBeat,uScope,uProgress;
vec3 pal(float x){
  vec3 a=vec3(.045,.055,.075), b=vec3(.90,.93,.96);
  vec3 blue=vec3(.08,.29,.72), gold=vec3(.95,.52,.10);
  float q=.5+.5*cos(6.28318*(x+vec3(.0,.18,.33)));
  return mix(mix(a,b,q),mix(blue,gold,q),.42+.35*uCentroid);
}
void main(){
  vec2 z=(vUv*2.-1.)*vec2(uRes.x/uRes.y,1.);
  float pulse=1.+uBeat*(.08+.16*uFlux);
  float zoom=exp2(uScope*.72+uEnergy*1.55+sin(uProgress*6.28318)*.08)*pulse;
  z/=zoom;
  float rot=.15*sin(uTime*.09)+uProgress*.28;
  z=mat2(cos(rot),-sin(rot),sin(rot),cos(rot))*z;
  vec2 c=vec2(-.735+.16*(uCentroid-.5),.18+.19*(uFlux-.5));
  float it=0.,m2=0.;
  for(int i=0;i<78;i++){
    z=vec2(z.x*z.x-z.y*z.y,2.*z.x*z.y)+c;
    m2=dot(z,z);if(m2>16.){it=float(i);break;}
  }
  float rings=.5+.5*cos(34.*log(1.+length(z))+uTime*(.6+uEnergy));
  float escaped=step(.5,it);
  float edge=mix(.07+.11*rings,it/78.,escaped);
  vec3 col=pal(edge*1.7+rings*.20+uProgress*.4);
  col*=.34+1.04*pow(max(edge,.035),.36);
  col+=uFlux*.18*vec3(1.,.44,.08)+uBeat*.08*vec3(.35,.65,1.);
  float vign=smoothstep(1.32,.22,length(vUv-.5));
  outColor=vec4(col*vign,1.);
}`;
const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function shader(gl,type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s}
export class ListenRenderer{
  constructor(glCanvas,overlay){
    this.canvas=glCanvas;this.overlay=overlay;this.ctx=overlay.getContext('2d');
    const gl=glCanvas.getContext('webgl2',{antialias:false,alpha:false});
    this.gl=null;this.ok=false;this.beatPulse=0;this.lastBeat=-1;this.mode='2D';
    if(gl){
      try{
        const pr=gl.createProgram();gl.attachShader(pr,shader(gl,gl.VERTEX_SHADER,VERT));gl.attachShader(pr,shader(gl,gl.FRAGMENT_SHADER,FRAG));gl.linkProgram(pr);
        if(!gl.getProgramParameter(pr,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(pr));
        this.pr=pr;this.gl=gl;this.ok=true;this.mode='WEBGL';gl.useProgram(pr);
        const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
        const loc=gl.getAttribLocation(pr,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
        this.u={};for(const n of ['uRes','uTime','uEnergy','uFlux','uCentroid','uBeat','uScope','uProgress'])this.u[n]=gl.getUniformLocation(pr,n);
      }catch(error){
        console.warn('LISTEN WebGL disabled; keeping 2D score',error);this.gl=null;this.ok=false;this.mode='2D';
      }
    }
    addEventListener('resize',()=>this.resize());this.resize();
  }
  resize(){
    const d=Math.min(2,devicePixelRatio||1),w=innerWidth,h=innerHeight;
    for(const c of [this.canvas,this.overlay]){c.width=Math.floor(w*d);c.height=Math.floor(h*d);c.style.width=w+'px';c.style.height=h+'px'}
    this.d=d;this.w=w;this.h=h;if(this.gl)this.gl.viewport(0,0,this.canvas.width,this.canvas.height);
    this.ctx.setTransform(d,0,0,d,0,0);
  }
  markBeat(i){if(i!==this.lastBeat){this.lastBeat=i;this.beatPulse=1}}
  draw(map,feature,time,scope,playing){
    const progress=map?.duration?clamp(time/map.duration,0,1):0,f=feature||{e:.1,c:.4,f:.05,l:.3,m:.4,h:.3};
    this.beatPulse*=.88;
    if(this.gl){
      const gl=this.gl,u=this.u;gl.useProgram(this.pr);
      gl.uniform2f(u.uRes,this.canvas.width,this.canvas.height);gl.uniform1f(u.uTime,time);gl.uniform1f(u.uEnergy,f.e||0);gl.uniform1f(u.uFlux,f.f||0);gl.uniform1f(u.uCentroid,f.c||0);gl.uniform1f(u.uBeat,this.beatPulse);gl.uniform1f(u.uScope,scope);gl.uniform1f(u.uProgress,progress);gl.drawArrays(gl.TRIANGLES,0,3);
    }else{
      const x=this.ctx; x.fillStyle='#05070b';x.fillRect(0,0,this.w,this.h);
    }
    this.overlayMap(map,time,scope,playing,f);
  }
  overlayMap(map,time,scope,playing,feature){
    const x=this.ctx,w=this.w,h=this.h,cx=w*.5,cy=h*.53,r=Math.min(w,h)*.34;
    const f=feature||{e:.1,c:.4,f:.05,l:.3,m:.4,h:.3},energy=clamp(f.e||0,0,1.25),flux=clamp(f.f||0,0,1.5);
    x.clearRect(0,0,w,h);x.save();x.translate(cx,cy);

    const liveR=r+energy*16+this.beatPulse*9;
    x.fillStyle='rgba(4,8,14,.18)';x.beginPath();x.arc(0,0,liveR+28,0,TAU);x.fill();
    x.strokeStyle='rgba(255,255,255,.22)';x.lineWidth=1.25;x.beginPath();x.arc(0,0,r,0,TAU);x.stroke();
    x.strokeStyle=`rgba(255,179,71,${.26+.34*energy})`;x.lineWidth=1.2+2.2*energy;x.beginPath();x.arc(0,0,liveR,0,TAU);x.stroke();
    x.strokeStyle=`rgba(109,189,255,${.16+.30*flux})`;x.lineWidth=1+1.6*flux;x.beginPath();x.arc(0,0,Math.max(10,r-18-flux*7),0,TAU);x.stroke();

    if(map?.frames?.length){
      const frames=map.frames,step=Math.max(1,Math.ceil(frames.length/720));
      x.beginPath();
      let begun=false;
      for(let i=0;i<frames.length;i+=step){
        const q=frames[i],a=-Math.PI/2+TAU*(q.t/map.duration),rr=r+8+(q.e||0)*26+(q.f||0)*14;
        const px=Math.cos(a)*rr,py=Math.sin(a)*rr;
        if(!begun){x.moveTo(px,py);begun=true}else x.lineTo(px,py);
      }
      x.closePath();x.fillStyle='rgba(109,189,255,.055)';x.fill();
      x.strokeStyle='rgba(225,240,250,.62)';x.lineWidth=1.35;x.stroke();

      for(let i=0;i<frames.length;i+=step){
        const q=frames[i],a=-Math.PI/2+TAU*(q.t/map.duration),inner=r-5,outer=r+7+(q.e||0)*23+(q.f||0)*16;
        x.strokeStyle=`rgba(255,255,255,${.10+.50*Math.min(1,q.e||0)})`;x.lineWidth=.8+2.8*Math.min(1,q.f||0);
        x.beginPath();x.moveTo(Math.cos(a)*inner,Math.sin(a)*inner);x.lineTo(Math.cos(a)*outer,Math.sin(a)*outer);x.stroke();
      }

      x.strokeStyle='rgba(255,190,90,.78)';x.lineWidth=1.7;
      for(const bt of map.beats||[]){const a=-Math.PI/2+TAU*(bt/map.duration);x.beginPath();x.moveTo(Math.cos(a)*(r-12),Math.sin(a)*(r-12));x.lineTo(Math.cos(a)*(r+13),Math.sin(a)*(r+13));x.stroke()}
      x.strokeStyle='rgba(110,190,255,.95)';x.lineWidth=2.4;
      for(const sec of map.sections||[]){if(sec.t<=0||sec.t>=map.duration)continue;const a=-Math.PI/2+TAU*(sec.t/map.duration);x.beginPath();x.moveTo(Math.cos(a)*(r-24),Math.sin(a)*(r-24));x.lineTo(Math.cos(a)*(r+24),Math.sin(a)*(r+24));x.stroke()}
      const a=-Math.PI/2+TAU*(time/map.duration);
      x.strokeStyle='white';x.lineWidth=3;x.beginPath();x.moveTo(Math.cos(a)*(r-32),Math.sin(a)*(r-32));x.lineTo(Math.cos(a)*(r+34),Math.sin(a)*(r+34));x.stroke();
      x.fillStyle='white';x.beginPath();x.arc(Math.cos(a)*(r+34),Math.sin(a)*(r+34),3.2,0,TAU);x.fill();
    }

    x.fillStyle='rgba(255,255,255,.90)';x.textAlign='center';x.font='800 10px ui-monospace,monospace';
    x.fillText(map?.stage==='PREVIEW'?'PREVIEW':(playing?'PLAYING':'READY'),0,4);
    x.fillStyle='rgba(255,255,255,.48)';x.font='700 7px ui-monospace,monospace';
    x.fillText(`${this.mode} · E ${Math.round(energy*100)} · Δ ${Math.round(flux*100)}`,0,18);
    x.restore();
  }
}
