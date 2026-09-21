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
  float edge=it/78.;
  float rings=.5+.5*cos(34.*log(1.+length(z))+uTime*(.6+uEnergy));
  vec3 col=pal(edge*1.7+rings*.16+uProgress*.4);
  col*=.22+.92*pow(edge,.42);
  col+=uFlux*.12*vec3(1.,.44,.08);
  float vign=smoothstep(1.32,.22,length(vUv-.5));
  outColor=vec4(col*vign,1.);
}`;
const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function shader(gl,type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s}
export class ListenRenderer{
  constructor(glCanvas,overlay){
    this.canvas=glCanvas;this.overlay=overlay;this.ctx=overlay.getContext('2d');
    const gl=glCanvas.getContext('webgl2',{antialias:false,alpha:false});
    this.gl=gl;this.ok=!!gl;this.beatPulse=0;this.lastBeat=-1;
    if(gl){
      const pr=gl.createProgram();gl.attachShader(pr,shader(gl,gl.VERTEX_SHADER,VERT));gl.attachShader(pr,shader(gl,gl.FRAGMENT_SHADER,FRAG));gl.linkProgram(pr);
      if(!gl.getProgramParameter(pr,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(pr));
      this.pr=pr;gl.useProgram(pr);
      const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
      const loc=gl.getAttribLocation(pr,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
      this.u={};for(const n of ['uRes','uTime','uEnergy','uFlux','uCentroid','uBeat','uScope','uProgress'])this.u[n]=gl.getUniformLocation(pr,n);
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
    this.overlayMap(map,time,scope,playing);
  }
  overlayMap(map,time,scope,playing){
    const x=this.ctx,w=this.w,h=this.h,cx=w*.5,cy=h*.53,r=Math.min(w,h)*.34;
    x.clearRect(0,0,w,h);x.save();x.translate(cx,cy);
    x.strokeStyle='rgba(255,255,255,.10)';x.lineWidth=1;x.beginPath();x.arc(0,0,r,0,TAU);x.stroke();
    if(map?.frames?.length){
      const step=Math.max(1,Math.ceil(map.frames.length/720));
      for(let i=0;i<map.frames.length;i+=step){
        const f=map.frames[i],a=-Math.PI/2+TAU*(f.t/map.duration),rr=r+(f.f||0)*18;
        x.strokeStyle=`rgba(255,255,255,${.04+.22*Math.min(1,f.e||0)})`;x.lineWidth=.6+2*Math.min(1,f.f||0);
        x.beginPath();x.moveTo(Math.cos(a)*(r-4),Math.sin(a)*(r-4));x.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);x.stroke();
      }
      x.strokeStyle='rgba(255,190,90,.42)';x.lineWidth=1;
      for(const bt of map.beats||[]){const a=-Math.PI/2+TAU*(bt/map.duration);x.beginPath();x.moveTo(Math.cos(a)*(r-8),Math.sin(a)*(r-8));x.lineTo(Math.cos(a)*(r+7),Math.sin(a)*(r+7));x.stroke()}
      x.strokeStyle='rgba(110,190,255,.7)';x.lineWidth=2;
      for(const sec of map.sections||[]){if(sec.t<=0||sec.t>=map.duration)continue;const a=-Math.PI/2+TAU*(sec.t/map.duration);x.beginPath();x.moveTo(Math.cos(a)*(r-18),Math.sin(a)*(r-18));x.lineTo(Math.cos(a)*(r+18),Math.sin(a)*(r+18));x.stroke()}
      const a=-Math.PI/2+TAU*(time/map.duration);x.strokeStyle='white';x.lineWidth=2.2;x.beginPath();x.moveTo(Math.cos(a)*(r-28),Math.sin(a)*(r-28));x.lineTo(Math.cos(a)*(r+28),Math.sin(a)*(r+28));x.stroke();
    }
    x.fillStyle='rgba(255,255,255,.76)';x.textAlign='center';x.font='800 9px ui-monospace,monospace';x.fillText(playing?'PLAYING':'PAUSED',0,4);
    x.restore();
  }
}
