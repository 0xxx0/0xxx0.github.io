import { N, TYPE_NAMES, gateCellIndex, isAligned, forecastAtSlot, forecastRelease, forecastMatchesCall, callLabel, clamp } from './engine.js';
import {projectTrackfield} from './trackfield.js';
import {sourceSkyEvent,releaseSkyDescriptor,opticWitness,dropBurstDescriptor} from './pov-effects.js';

const TAU=Math.PI*2;
const COLORS=['#ff9852','#6dbdff','#72e4b6'];

export class Renderer {
  constructor(canvas) {
    this.cv=canvas; this.g=canvas.getContext('2d'); this.w=0;this.h=0;this.cx=0;this.cy=0;this.r=0;
    this.displayRotation=0;this.dragOffset=0;this.pulses=[];this.skyPulses=[];this.dropBursts=[];this.lastDropId=null;this.beat=0;this.beatAt=0;this.beatEnergy=0;this.lastEvent=null;this.sectionArc=null;this.trackfield=null;this.ride=null;this.landmarks=[];this.reducedMotion=!!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;this.motion={t:performance.now(),speed:1,grade:0,bend:0,zoom:1,pitch:0,bank:0};
    this.resize();
    addEventListener('resize',()=>this.resize(),{passive:true});
  }
  resize(){const d=Math.min(2,devicePixelRatio||1),r=this.cv.getBoundingClientRect();this.cv.width=Math.max(1,Math.floor(r.width*d));this.cv.height=Math.max(1,Math.floor(r.height*d));this.g.setTransform(d,0,0,d,0,0);this.w=r.width;this.h=r.height;this.cx=this.w/2;this.cy=this.h*.52;this.r=Math.min(this.w*.34,this.h*.33,280)}
  pulse(event){this.lastEvent=event;const now=performance.now();this.pulses.push({t:now,event});this.pulses=this.pulses.slice(-12);this.skyPulses.push({t:now,...releaseSkyDescriptor(event)});this.skyPulses=this.skyPulses.slice(-8)}
  beatPulse(step,energy=.35){this.beat=step%16;this.beatAt=performance.now();this.beatEnergy=clamp(Number(energy)||0,0,1)}
  setDrag(offset){this.dragOffset=offset}
  setSectionArc(view){this.sectionArc=view||null}
  setTrackfield(world){
    const d=world?.drop;
    if(d&&Number(d.ahead)>=0&&Number(d.ahead)<=.46&&d.id!==this.lastDropId){
      this.lastDropId=d.id;
      this.dropBursts.push({at:performance.now(),...dropBurstDescriptor(d)});
      this.dropBursts=this.dropBursts.slice(-4);
    }
    this.trackfield=world||null
  }
  setRide(view){this.ride=view||null}
  setLandmarks(pins){this.landmarks=Array.isArray(pins)?pins.slice(0,64).map(p=>({...p,address:Number(p.address)||0})):[]}
  _dropPulse(now){
    this.dropBursts=this.dropBursts.filter(b=>now-b.at<1900);
    let kick=0,rebound=0;
    for(const b of this.dropBursts){
      const q=clamp((now-b.at)/1900,0,1),s=clamp(Number(b.strength)||0,0,1);
      const plunge=Math.sin(Math.PI*clamp(q/.54,0,1))*s;
      const returnLift=q>.48?Math.sin(Math.PI*clamp((q-.48)/.52,0,1))*s*.42:0;
      kick=Math.max(kick,plunge);rebound=Math.max(rebound,returnLift);
    }
    return {kick,rebound};
  }
  _updateMotion(now){
    const m=this.motion,dt=clamp((now-m.t)/1000,0,.08);m.t=now;
    const speed=Number(this.trackfield?.currentSpeed)||1,grade=Number(this.trackfield?.currentGrade)||0,bend=Number(this.trackfield?.currentBend)||0;
    const k=1-Math.exp(-dt*5.2);
    m.speed+=(speed-m.speed)*k;m.grade+=(grade-m.grade)*k;m.bend+=(bend-m.bend)*k;
    const drop=this._dropPulse(now);
    m.zoom=clamp(1+(m.speed-1)*.078+drop.kick*.15,.92,1.24);
    m.pitch=clamp(m.grade*27-drop.kick*20+drop.rebound*9,-42,32);
    m.bank=clamp(m.bend*.032,-.03,.03);
    const shake=this.reducedMotion?0:drop.kick*4.2*(1-drop.rebound*.5);
    m.shakeX=Math.sin(now*.034)*shake;
    m.shakeY=Math.cos(now*.029)*shake*.55;
    m.dropKick=drop.kick;m.dropRebound=drop.rebound;
    return m;
  }
  slotAngle(i,state){return -Math.PI/2 + (i+state.rotation)*TAU/N + this.dragOffset}
  draw(state,now=performance.now()){
    const road=!!this.trackfield?.points?.length,m=this._updateMotion(now);
    this.cx=this.w/2;this.cy=this.h*(road?.64:.52)+m.pitch*.18;this.r=Math.min(this.w*(road?.27:.34),this.h*(road?.225:.33),road?220:280);
    const g=this.g;g.clearRect(0,0,this.w,this.h);this._background(state,now);if(road)this._pov(state,now);if(road)this._trackfield(state,now);this._section(state,now);this._creases(state,now);this._ring(state,now);this._gate(state,now);this._causal(state,now);this._pulses(state,now);this._center(state,now)
  }
  _background(state,t){const g=this.g;const grd=g.createRadialGradient(this.cx,this.cy,5,this.cx,this.cy,Math.max(this.w,this.h)*.7);grd.addColorStop(0,'#0b1018');grd.addColorStop(1,'#05070b');g.fillStyle=grd;g.fillRect(0,0,this.w,this.h);g.save();g.translate(this.cx,this.cy);for(let i=0;i<4;i++){g.strokeStyle=`rgba(255,255,255,${.016+i*.006})`;g.lineWidth=.7;g.beginPath();g.arc(0,0,this.r*(.38+i*.18)+Math.sin(t*.0003+i)*2,0,TAU);g.stroke()}
    const beatLife=clamp(1-(t-this.beatAt)/260,0,1);if(beatLife>0){g.strokeStyle=`rgba(255,255,255,${(.12+.35*this.beatEnergy)*beatLife})`;g.lineWidth=1+2*beatLife;g.beginPath();g.arc(0,0,this.r+10+14*(1-beatLife),0,TAU);g.stroke()}g.restore()}
  _pov(state,t){
    const g=this.g,w=this.w,h=this.h,m=this.motion,world=this.trackfield,optic=opticWitness(world,t,this.reducedMotion?7:20);
    const horizonX=w*.5+(m.bend||0)*w*.07,horizonY=h*(.28-.025*Math.tanh(m.grade||0));
    g.save();
    // Peripheral optic flow: deterministic source-motion witness, not a score effect.
    for(const p of optic.stars){
      const q=p.depth,x=horizonX+p.x*w*.67,y=horizonY+p.y*h*.45;
      const trail=this.reducedMotion?0:(4+18*q*clamp((optic.speed-.45)/2,0,1));
      const dx=(x-horizonX),dy=(y-horizonY),len=Math.max(1,Math.hypot(dx,dy)),a=.025+.13*q*clamp(optic.speed/2.2,0,1);
      g.strokeStyle=`rgba(255,255,255,${a})`;g.lineWidth=.45+q*.85;
      g.beginPath();g.moveTo(x,y);g.lineTo(x-dx/len*trail,y-dy/len*trail);g.stroke();
    }
    // Macro buildup closes the visual aperture before the source opens it.
    const drop=world?.drop;
    if(drop&&Number(drop.ahead)>.12&&Number(drop.ahead)<4.8){
      const near=clamp(1-Number(drop.ahead)/4.8,0,1),pressure=near*clamp(Number(drop.strength)||0,0,1);
      g.save();g.translate(horizonX,horizonY);
      for(let i=0;i<5;i++){
        const q=(i+1)/5,rx=w*(.09+.30*q)*(1-pressure*.24),ry=h*(.045+.15*q)*(1-pressure*.20);
        g.strokeStyle=`rgba(255,255,255,${.018+.06*pressure*(1-q*.4)})`;g.lineWidth=.7+pressure*.8;
        g.beginPath();g.ellipse(0,0,rx,ry,0,0,TAU);g.stroke();
      }
      const side=clamp(.04+.20*pressure,0,.25);
      g.fillStyle=`rgba(2,4,7,${side})`;
      g.fillRect(0-horizonX,0-horizonY,w*.18*pressure,h);
      g.fillRect(w-horizonX-w*.18*pressure,0-horizonY,w*.18*pressure,h);
      g.restore();
    }
    // Sparse source event in the far field. DROP > section > surge > phrase.
    const source=sourceSkyEvent(world);
    if(source){
      const near=clamp(1-source.ahead/6,0,1),strength=clamp(source.strength*(.35+.65*near),0,1),sx=horizonX+(source.side||0)*w*.18,sy=horizonY-h*.04;
      g.save();g.translate(sx,sy);g.globalAlpha=.24+.52*strength;
      if(source.kind==='DROP'){
        g.strokeStyle='rgba(255,255,255,.82)';g.lineWidth=1.2+strength*2.1;
        const r=14+strength*54;
        for(let i=0;i<6;i++){
          const a=-Math.PI*.78+i*(Math.PI*.56/5);
          g.beginPath();g.moveTo(Math.cos(a)*r*.25,Math.sin(a)*r*.25);g.lineTo(Math.cos(a)*r,Math.sin(a)*r);g.stroke();
        }
        g.strokeStyle='rgba(109,189,255,.52)';g.lineWidth=1;
        g.beginPath();g.ellipse(0,0,r*.72,r*.28,0,0,TAU);g.stroke();
      }else if(source.kind==='SECTION'){
        g.strokeStyle='rgba(244,247,245,.72)';g.lineWidth=1.2+strength*1.8;
        for(let i=-3;i<=3;i++){const a=-Math.PI/2+i*.13,r=22+strength*52;g.beginPath();g.moveTo(Math.cos(a)*8,Math.sin(a)*8);g.lineTo(Math.cos(a)*r,Math.sin(a)*r);g.stroke()}
      }else if(source.kind==='SURGE'){
        g.strokeStyle='rgba(255,184,112,.72)';g.lineWidth=1+strength*1.5;
        const r=12+strength*42;g.beginPath();g.arc(0,0,r*.56,0,TAU);g.stroke();
        for(let i=0;i<8;i++){const a=i*TAU/8+.2,gap=r*(.42+.18*Math.sin(i*2.7));g.beginPath();g.moveTo(Math.cos(a)*r*.45,Math.sin(a)*r*.45);g.lineTo(Math.cos(a)*(r+gap),Math.sin(a)*(r+gap));g.stroke()}
      }else{
        g.strokeStyle='rgba(109,189,255,.55)';g.lineWidth=1;
        g.beginPath();g.arc(0,0,10+strength*24,-Math.PI*.9,-Math.PI*.1);g.stroke();
      }
      g.restore();
    }
    // Crossing a macro DROP opens the sky as a one-shot source event.
    for(const b of this.dropBursts){
      const q=clamp((t-b.at)/1900,0,1),life=Math.sin(Math.PI*q),strength=clamp(Number(b.strength)||0,0,1);
      if(life<=0)continue;
      const cx=horizonX,cy=horizonY-h*(.01+.035*q),r=(26+Math.min(w,h)*(.12+.33*q))*strength;
      g.save();g.globalCompositeOperation='screen';
      const glow=g.createRadialGradient(cx,cy,0,cx,cy,Math.max(18,r));
      glow.addColorStop(0,`rgba(255,255,255,${.19*life*strength})`);
      glow.addColorStop(.24,`rgba(109,189,255,${.16*life*strength})`);
      glow.addColorStop(1,'rgba(5,7,11,0)');
      g.fillStyle=glow;g.fillRect(0,0,w,h);
      g.translate(cx,cy);
      const beams=this.reducedMotion?8:18;
      for(let i=0;i<beams;i++){
        const a=-Math.PI*.96+(i/(beams-1))*Math.PI*.92+(i%2)*.014;
        const inner=10+r*.10,outer=inner+r*(.68+.34*((i*7)%11)/10);
        g.strokeStyle=i%3===0?`rgba(255,184,112,${.50*life*strength})`:`rgba(255,255,255,${.31*life*strength})`;
        g.lineWidth=.7+(i%4===0?1.1:0);
        g.beginPath();g.moveTo(Math.cos(a)*inner,Math.sin(a)*inner);g.lineTo(Math.cos(a)*outer,Math.sin(a)*outer);g.stroke();
      }
      for(let i=0;i<(this.reducedMotion?3:8);i++){
        const a=-Math.PI*.82+i*.23,q2=((i*37)%11)/10,len=r*(.22+.38*q2),x=Math.cos(a)*r*.42,y=Math.sin(a)*r*.42;
        g.strokeStyle=`rgba(114,228,182,${.35*life*strength})`;g.lineWidth=1;
        g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(a)*len,y+Math.sin(a)*len);g.stroke();
      }
      g.restore();
    }

    // Authored verb effects live in the sky/periphery rather than on a score counter.
    this.skyPulses=this.skyPulses.filter(p=>t-p.t<1150);
    for(const p of this.skyPulses){
      const age=clamp((t-p.t)/1150,0,1),life=Math.sin(Math.PI*age),side=clamp(Number(p.side)||0,-1,1);
      const x=w*.5+side*w*.23,y=h*.23-(Number(p.power)||1)*4,r=18+(Number(p.power)||1)*16+age*46;
      g.save();g.translate(x,y);g.globalAlpha=(this.reducedMotion?.42:.72)*life;
      if(p.kind==='BLOOM'){
        g.strokeStyle='rgba(114,228,182,.9)';g.lineWidth=1.2;
        for(let i=0;i<6;i++){const a=i*TAU/6+age*.14;g.beginPath();g.moveTo(Math.cos(a)*r*.18,Math.sin(a)*r*.18);g.quadraticCurveTo(Math.cos(a+.22)*r*.66,Math.sin(a+.22)*r*.66,Math.cos(a)*r,Math.sin(a)*r);g.stroke()}
      }else if(p.kind==='CREASE'){
        g.strokeStyle='rgba(255,179,109,.9)';g.lineWidth=1.5;
        g.beginPath();g.moveTo(-r*.9,r*.35);g.lineTo(0,-r*.25);g.lineTo(r*.92,-r*.55);g.stroke();
      }else if(p.kind==='TWIN'){
        g.strokeStyle='rgba(200,179,255,.9)';g.lineWidth=1.3;
        for(const d of [-1,1]){g.beginPath();g.moveTo(0,r*.2);g.quadraticCurveTo(d*r*.34,-r*.24,d*r*.82,-r*.68);g.stroke()}
      }else{
        g.strokeStyle='rgba(244,247,245,.92)';g.lineWidth=1.5;
        g.beginPath();g.arc(0,0,r*(1-age*.35),0,TAU);g.stroke();
      }
      g.restore();
    }
    // A minimal lower-frame embodiment witness: bank/speed alter the apparent shoulders/visor.
    const edgeAlpha=.035+.08*clamp((m.speed-.55)/1.7,0,1);
    g.strokeStyle=`rgba(255,255,255,${edgeAlpha})`;g.lineWidth=1;
    const bank=(m.bank||0)*w*2.4,base=h*.985,inner=h*.89;
    g.beginPath();g.moveTo(0,base);g.lineTo(w*.16+bank,inner);g.lineTo(w*.27+bank*.35,h*.94);g.stroke();
    g.beginPath();g.moveTo(w,base);g.lineTo(w*.84+bank,inner);g.lineTo(w*.73+bank*.35,h*.94);g.stroke();
    g.restore();
  }
  _trackfield(state,t){
    const proj=projectTrackfield(this.trackfield,this.w,this.h,{rideLateral:this.ride?.lateral||0});if(!proj?.slices?.length)return;
    const g=this.g,s=proj.slices,m=this.motion;
    g.save();
    g.translate(m.shakeX||0,m.shakeY||0);
    g.translate(this.w*.5,this.h*.72+m.pitch);
    g.rotate(-m.bank);
    g.scale(m.zoom,m.zoom);
    g.translate(-this.w*.5,-this.h*.72);
    const horizon=s[s.length-1];
    const haze=g.createRadialGradient(horizon.centerX,horizon.baseY,2,horizon.centerX,horizon.baseY,Math.max(this.w,this.h)*.42);
    haze.addColorStop(0,`rgba(109,189,255,${.08+.10*clamp(proj.current?.brightness||0,0,1)})`);
    haze.addColorStop(1,'rgba(5,7,11,0)');
    g.fillStyle=haze;g.fillRect(0,0,this.w,this.h);

    const roadColor=(p)=>{
      if((p.deformReturn||0)>.35)return '#f4f7f5';
      if((p.deformSplit||0)>.25)return '#c8b3ff';
      if((p.deformFold||0)>.25)return '#ffb36d';
      if((p.deformBloom||0)>.25)return '#72e4b6';
      return p.sectionIndex%2===0?'#6dbdff':'#ff9852';
    };
    const fillQuad=(a,b,sign=0,opacity=1)=>{
      const split=Math.max(a.split||0,b.split||0);
      const aCenter=a.centerX+(sign?(sign*a.branchGap):0),bCenter=b.centerX+(sign?(sign*b.branchGap):0);
      const aHalf=sign?a.branchHalf:a.half,bHalf=sign?b.branchHalf:b.half;
      const hot=clamp((a.impact||0)+(a.deformBloom||0)*.16+(a.deformFold||0)*.08,0,1.35),flux=clamp(a.flux||0,0,1.25);
      const alphaBase=18+hot*28+flux*10+split*14;
      const alpha=Math.round(clamp(alphaBase*clamp(opacity,0,1),0,255)).toString(16).padStart(2,'0');
      g.fillStyle=roadColor(a)+alpha;
      g.beginPath();g.moveTo(aCenter-aHalf,a.baseY);g.lineTo(aCenter+aHalf,a.baseY);g.lineTo(bCenter+bHalf,b.baseY);g.lineTo(bCenter-bHalf,b.baseY);g.closePath();g.fill();
    };

    const rideChoice=Math.sign(Number(this.ride?.choice)||0);
    for(let i=s.length-2;i>=0;i--){
      const a=s[i],b=s[i+1],split=Math.max(a.split||0,b.split||0),mix=clamp((split-.008)/.18,0,1);
      if(mix<.995)fillQuad(a,b,0,1-mix*.94);
      if(mix>.005){
        const leftOpacity=mix*(rideChoice===1?.24:1);
        const rightOpacity=mix*(rideChoice===-1?.24:1);
        fillQuad(a,b,-1,leftOpacity);fillQuad(a,b,1,rightOpacity);
      }
    }

    const strokePath=(frac,sign=0)=>{
      g.beginPath();
      for(let i=0;i<s.length;i++){
        const p=s[i],split=p.split||0,center=p.centerX+(sign?sign*p.branchGap:0),half=sign?p.branchHalf:p.half,x=center+half*frac,y=p.baseY;
        i?g.lineTo(x,y):g.moveTo(x,y);
      }
      g.stroke();
    };
    const splitMax=clamp(Math.max(0,...s.map(p=>Number(p.split)||0)),0,1),splitMix=clamp((splitMax-.008)/.18,0,1);
    g.lineWidth=1;
    for(const frac of [-1,1]){
      g.strokeStyle=`rgba(255,255,255,${.36*(1-splitMix*.72)})`;strokePath(frac,0);
    }
    g.strokeStyle=`rgba(255,255,255,${.15*(1-splitMix*.72)})`;strokePath(-1/3,0);strokePath(1/3,0);
    if(splitMix>.005){
      for(const sign of [-1,1]){
        const chosen=rideChoice===0||rideChoice===sign,alpha=(chosen?.18+.34*splitMix:.06+.10*splitMix);
        g.strokeStyle=`rgba(215,203,255,${alpha})`;g.lineWidth=chosen&&rideChoice?1.8:1;
        strokePath(-1,sign);strokePath(1,sign);
      }
    }

    for(let i=1;i<s.length;i++){
      const p=s[i],prev=s[i-1],split=p.split||0;
      const left=split>.045?p.centerX-p.branchGap-p.branchHalf:p.centerX-p.half;
      const right=split>.045?p.centerX+p.branchGap+p.branchHalf:p.centerX+p.half;
      if(p.beatEdge){
        const down=!!p.downbeatEdge;
        g.strokeStyle=`rgba(255,255,255,${(down?.18:.08)+(down?.26:.14)*clamp(p.impact,0,1)})`;g.lineWidth=down?1.35:.8;
        g.beginPath();g.moveTo(left,p.baseY);g.lineTo(right,p.baseY);g.stroke();
      }
      if(p.phraseEdge){
        const top=p.baseY-Math.max(9,(right-left)*.10);
        g.strokeStyle='rgba(255,224,138,.44)';g.lineWidth=1.15;
        g.beginPath();g.moveTo(left,p.baseY);g.quadraticCurveTo(p.centerX,top,right,p.baseY);g.stroke();
      }
      if(p.sectionEdge){
        const top=p.baseY-Math.max(14,(right-left)*.18);
        g.strokeStyle='rgba(255,255,255,.62)';g.lineWidth=1.6;
        g.beginPath();g.moveTo(left,p.baseY);g.lineTo(left,top);g.lineTo(right,top);g.lineTo(right,p.baseY);g.stroke();
      }
      if(p.impact>.96&&prev.impact<=.96){
        const top=p.baseY-Math.max(10,(right-left)*.12);
        g.strokeStyle='rgba(255,255,255,.34)';g.lineWidth=1;
        for(let k=0;k<3;k++){const m=1+k*.12,half=(right-left)*.5*m;g.beginPath();g.moveTo(p.centerX-half,p.baseY);g.quadraticCurveTo(p.centerX,top-k*9,p.centerX+half,p.baseY);g.stroke()}
      }

      const rising=(key,threshold=.18)=>(Number(p[key])||0)>=threshold&&(Number(prev[key])||0)<threshold;
      if(rising('deformBloom')){
        g.strokeStyle='rgba(114,228,182,.56)';g.lineWidth=1;
        for(let k=-2;k<=2;k++){const x=p.centerX+(p.half*.22*k);g.beginPath();g.moveTo(x,p.baseY);g.lineTo(x+(k*3),p.baseY-Math.max(10,p.half*.24));g.stroke()}
      }
      if(rising('deformFold')){
        g.strokeStyle='rgba(255,179,109,.75)';g.lineWidth=1.8;
        g.beginPath();g.moveTo(left,p.baseY+5);g.lineTo(right,p.baseY-Math.max(9,p.half*.18));g.stroke();
      }
      if(rising('deformSplit')){
        const top=p.baseY-Math.max(14,p.half*.3);g.strokeStyle='rgba(200,179,255,.76)';g.lineWidth=1.4;
        g.beginPath();g.moveTo(p.centerX,p.baseY);g.quadraticCurveTo(p.centerX-p.half*.22,top,p.centerX-p.half*.68,p.baseY-4);g.moveTo(p.centerX,p.baseY);g.quadraticCurveTo(p.centerX+p.half*.22,top,p.centerX+p.half*.68,p.baseY-4);g.stroke();
      }
      if(rising('deformReturn')){
        g.strokeStyle='rgba(244,247,245,.78)';g.lineWidth=1.8;
        g.beginPath();g.moveTo(left,p.baseY);g.lineTo(p.centerX,p.baseY-Math.max(8,p.half*.18));g.lineTo(right,p.baseY);g.stroke();
      }

      const verbs=(p.deformActive||[]).filter(x=>x.strength>.34).map(x=>x.verb);
      const prevVerbs=new Set((prev.deformActive||[]).filter(x=>x.strength>.34).map(x=>x.verb));
      const born=[...new Set(verbs)].filter(v=>!prevVerbs.has(v));
      if(born.length){
        g.textAlign='center';g.font='800 7px ui-monospace,monospace';g.fillStyle='rgba(255,255,255,.62)';
        g.fillText(born.join('→'),p.centerX,p.baseY-12);
      }
    }

    if(this.landmarks?.length){
      const lo=Number(this.trackfield?.time)||0,hi=lo+(Number(this.trackfield?.horizon)||0);
      for(const mark of this.landmarks){
        const at=Number(mark.address)||0;if(at<lo-.25||at>hi+.25)continue;
        let best=s[0],bd=Infinity;
        for(const q of s){const d=Math.abs((Number(q.t)||0)-at);if(d<bd){bd=d;best=q}}
        const ahead=at-lo,near=clamp(1-ahead/Math.max(.001,hi-lo),0,1),stem=Math.max(13,best.half*(.20+.20*near));
        g.strokeStyle=`rgba(255,205,126,${.24+.58*near})`;g.fillStyle=`rgba(255,205,126,${.55+.40*near})`;g.lineWidth=1.2;
        g.beginPath();g.moveTo(best.centerX,best.baseY);g.lineTo(best.centerX,best.baseY-stem);g.stroke();
        g.beginPath();g.moveTo(best.centerX,best.baseY-stem-5);g.lineTo(best.centerX+5,best.baseY-stem);g.lineTo(best.centerX,best.baseY-stem+5);g.lineTo(best.centerX-5,best.baseY-stem);g.closePath();g.stroke();
        const label=String(mark.label||'PIN').slice(0,42),note=String(mark.note||'').replace(/\s+/g,' ').trim().slice(0,72);
        g.textAlign='center';g.font='900 7px ui-monospace,monospace';g.fillText(label.toUpperCase(),best.centerX,best.baseY-stem-11);
        if(ahead<2.2&&note){g.fillStyle='rgba(255,255,255,.72)';g.font='600 7px ui-monospace,monospace';g.fillText(note,best.centerX,best.baseY-stem-21)}
      }
    }

    const speedMix=clamp((m.speed-.72)/1.14,0,1);
    if(speedMix>.04){
      const phase=(t*.00022*m.speed)%1;
      g.strokeStyle=`rgba(255,255,255,${.035+.085*speedMix})`;g.lineWidth=.7+speedMix*.8;
      for(const side of [-1,1]){
        for(let k=0;k<5;k++){
          const q=(phase+k/5)%1,ix=Math.min(s.length-2,Math.max(1,Math.floor(q*(s.length-2)))),p=s[ix],n=s[ix+1];
          const x1=p.centerX+side*p.half*1.12,y1=p.baseY,x2=n.centerX+side*n.half*1.18,y2=n.baseY;
          g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();
        }
      }
    }
    if(proj.surge&&proj.surge.ahead<8){
      const ix=Math.min(s.length-1,Math.max(0,proj.surge.index)),p=s[ix];
      g.textAlign='center';g.font='800 7px ui-monospace,monospace';g.fillStyle='rgba(255,255,255,.48)';
      g.fillText(`SURGE ${proj.surge.ahead.toFixed(1)}s`,p.centerX,p.baseY-18);
    }
    if(proj.activeVerbs?.length){
      g.textAlign='left';g.font='800 7px ui-monospace,monospace';g.fillStyle='rgba(255,255,255,.42)';
      g.fillText(`ROAD · ${proj.activeVerbs.join(' + ')}`,10,this.h-70);
    }
    if(this.ride?.opportunity||rideChoice){
      const label=rideChoice<0?'← LEFT':rideChoice>0?'RIGHT →':'← TURN TO CHOOSE →';
      g.textAlign='center';g.font='900 8px ui-monospace,monospace';g.fillStyle=rideChoice?'rgba(255,255,255,.86)':'rgba(215,203,255,.72)';
      g.fillText(label,this.w*.5,this.h-92);
    }
    g.restore();
  }
  _section(state,t){
    const v=this.sectionArc;if(!v||v.sectionIndex<0||v.sectionCount<2)return;
    const g=this.g,r=this.r+27,start=-Math.PI/2,p=clamp(v.progress||0,0,1);
    g.save();g.translate(this.cx,this.cy);
    g.strokeStyle='rgba(255,255,255,.08)';g.lineWidth=2;g.beginPath();g.arc(0,0,r,0,TAU);g.stroke();
    g.strokeStyle=v.sealed?'rgba(114,228,182,.82)':v.phase==='RETURN'?(v.ready?'rgba(255,255,255,.92)':'rgba(255,255,255,.38)'):'rgba(255,255,255,.28)';
    g.lineWidth=v.sealed?4:v.ready&&v.phase==='RETURN'?3:2;
    g.beginPath();g.arc(0,0,r,start,start+TAU*p);g.stroke();
    if(v.phase==='RETURN'&&!v.sealed){
      const a=start+TAU*.72;g.strokeStyle=v.ready?'rgba(255,255,255,.9)':'rgba(255,255,255,.22)';g.lineWidth=1.5;
      g.beginPath();g.moveTo(Math.cos(a)*(r-8),Math.sin(a)*(r-8));g.lineTo(Math.cos(a)*(r+8),Math.sin(a)*(r+8));g.stroke();
    }
    g.restore();
  }
  _creases(state,t){const g=this.g;g.save();g.translate(this.cx,this.cy);for(const [a,b] of state.creases){const aa=this.slotAngle(a,state),bb=this.slotAngle(b,state),x1=Math.cos(aa)*this.r,y1=Math.sin(aa)*this.r,x2=Math.cos(bb)*this.r,y2=Math.sin(bb)*this.r;const c1=COLORS[state.cells[a].type];g.strokeStyle=c1+'55';g.lineWidth=1.2+state.cells[a].tier*.25;g.beginPath();g.moveTo(x1,y1);g.quadraticCurveTo(0,0,x2,y2);g.stroke();g.fillStyle=c1+'18';g.beginPath();g.arc(0,0,5+3*Math.sin(t*.003+a),0,TAU);g.fill()}g.restore()}
  _ring(state,t){const g=this.g;g.save();g.translate(this.cx,this.cy);g.strokeStyle='rgba(255,255,255,.12)';g.lineWidth=1;g.beginPath();g.arc(0,0,this.r,0,TAU);g.stroke();state.cells.forEach((cell,i)=>{const a=this.slotAngle(i,state),x=Math.cos(a)*this.r,y=Math.sin(a)*this.r,rad=9+cell.tier*2.2,col=COLORS[cell.type],forecast=cell.type===state.targetType?forecastAtSlot(state,i):null,hit=forecastMatchesCall(state.call,forecast);g.fillStyle=col+'28';g.strokeStyle=col+(cell.tier>=3?'dd':'88');g.lineWidth=1+cell.tier*.45;this._glyph(g,cell.type,x,y,rad);g.fill();g.stroke();if(state.anchors[cell.type]===i){g.strokeStyle=col+'bb';g.lineWidth=1;g.beginPath();g.arc(x,y,rad+7+2*Math.sin(t*.004+i),0,TAU);g.stroke()}
      if(forecast){g.strokeStyle=hit?'rgba(255,255,255,.82)':col+'55';g.lineWidth=hit?1.8:.8;g.beginPath();g.arc(x,y,rad+12+(hit?2*Math.sin(t*.006+i):0),0,TAU);g.stroke();g.fillStyle=hit?'rgba(255,255,255,.92)':'rgba(255,255,255,.42)';g.font='800 8px ui-monospace,monospace';g.textAlign='center';g.fillText(`${forecast.verb[0]}${forecast.chain>1?forecast.chain:''}`,x,y-rad-16)}
    });g.restore()}
  _glyph(g,type,x,y,r){g.beginPath();if(type===0){for(let k=0;k<3;k++){const a=-Math.PI/2+k*TAU/3,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;k?g.lineTo(px,py):g.moveTo(px,py)}g.closePath()}else if(type===1){g.arc(x,y,r,0,TAU)}else{g.rect(x-r*.78,y-r*.78,r*1.56,r*1.56)}}
  _gate(state,t){const g=this.g,x=this.cx,y=this.cy-this.r-36,col=COLORS[state.targetType],aligned=isAligned(state),f=forecastRelease(state),hit=forecastMatchesCall(state.call,f);g.save();g.strokeStyle=hit?'#fff':col+(aligned?'ff':'aa');g.lineWidth=hit?3:aligned?2.4:1.2;g.beginPath();g.arc(x,y,16+(aligned?3*Math.sin(t*.008):0),0,TAU);g.stroke();g.fillStyle=col+(aligned?'30':'14');g.fill();g.font='700 9px ui-monospace,monospace';g.textAlign='center';g.fillStyle='rgba(255,255,255,.62)';g.fillText(TYPE_NAMES[state.targetType],x,y-24);g.fillStyle=hit?'rgba(255,255,255,.95)':'rgba(255,255,255,.38)';g.font='800 7px ui-monospace,monospace';g.fillText(callLabel(state.call),x,y+29);g.restore()}
  _causal(state,t){if(!isAligned(state))return;const g=this.g,idx=gateCellIndex(state),cell=state.cells[idx],a=this.slotAngle(idx,state),x=this.cx+Math.cos(a)*this.r,y=this.cy+Math.sin(a)*this.r,col=COLORS[cell.type];g.save();g.setLineDash([3,5]);g.strokeStyle=col+'77';g.lineWidth=1.3;g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(this.cx,this.cy,this.cx,this.cy-this.r-36);g.stroke();g.setLineDash([]);g.restore()}
  _pulses(state,t){const g=this.g;this.pulses=this.pulses.filter(p=>t-p.t<900);for(const p of this.pulses){const q=clamp((t-p.t)/900,0,1),ev=p.event,col=COLORS[ev.type];g.save();g.translate(this.cx,this.cy);for(const idx of ev.path){const a=this.slotAngle(idx,state),x=Math.cos(a)*this.r,y=Math.sin(a)*this.r;g.strokeStyle=col+Math.round((1-q)*180).toString(16).padStart(2,'0');g.lineWidth=1.6;g.beginPath();g.arc(x,y,11+q*22,0,TAU);g.stroke()}g.restore()}}
  _center(state,t){const g=this.g,aligned=isAligned(state),charge=state.charge,f=forecastRelease(state),hit=forecastMatchesCall(state.call,f);g.save();g.translate(this.cx,this.cy);const pulse=.5+.5*Math.sin(t*.004+this.beat*.3);g.fillStyle=`rgba(255,255,255,${.03+.025*pulse})`;g.beginPath();g.arc(0,0,48+charge*16,0,TAU);g.fill();g.strokeStyle=hit?'rgba(255,255,255,.98)':aligned?'rgba(255,255,255,.82)':'rgba(255,255,255,.18)';g.lineWidth=hit?2.6:aligned?1.8:1;g.beginPath();g.arc(0,0,32+charge*8,0,TAU);g.stroke();g.textAlign='center';g.fillStyle='rgba(255,255,255,.92)';g.font='900 16px ui-monospace,monospace';g.fillText(aligned?(f?.verb||'RELEASE'):'TURN',0,3);g.fillStyle=hit?'rgba(255,255,255,.88)':'rgba(255,255,255,.38)';g.font='700 8px ui-monospace,monospace';g.fillText(aligned?(hit?'HIT CALL':`×${f?.chain||1} · OPEN`):`CALL ${callLabel(state.call)}`,0,18);g.fillStyle='rgba(255,255,255,.30)';g.font='700 7px ui-monospace,monospace';g.fillText(state.mode==='RATCHET'?`CHARGE ${Math.round(charge/1.75*100)}%`:`FLOW ${state.flow}`,0,31);g.restore()}
}
