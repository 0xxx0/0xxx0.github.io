import { N, TYPE_NAMES, gateCellIndex, isAligned, forecastAtSlot, forecastRelease, forecastMatchesCall, callLabel, clamp } from './engine.js';
import {projectTrackfield} from './trackfield.js';

const TAU=Math.PI*2;
const COLORS=['#ff9852','#6dbdff','#72e4b6'];

export class Renderer {
  constructor(canvas) {
    this.cv=canvas; this.g=canvas.getContext('2d'); this.w=0;this.h=0;this.cx=0;this.cy=0;this.r=0;
    this.displayRotation=0;this.dragOffset=0;this.pulses=[];this.beat=0;this.beatAt=0;this.beatEnergy=0;this.lastEvent=null;this.sectionArc=null;this.trackfield=null;
    this.resize();
    addEventListener('resize',()=>this.resize(),{passive:true});
  }
  resize(){const d=Math.min(2,devicePixelRatio||1),r=this.cv.getBoundingClientRect();this.cv.width=Math.max(1,Math.floor(r.width*d));this.cv.height=Math.max(1,Math.floor(r.height*d));this.g.setTransform(d,0,0,d,0,0);this.w=r.width;this.h=r.height;this.cx=this.w/2;this.cy=this.h*.52;this.r=Math.min(this.w*.34,this.h*.33,280)}
  pulse(event){this.lastEvent=event;this.pulses.push({t:performance.now(),event});this.pulses=this.pulses.slice(-12)}
  beatPulse(step,energy=.35){this.beat=step%16;this.beatAt=performance.now();this.beatEnergy=clamp(Number(energy)||0,0,1)}
  setDrag(offset){this.dragOffset=offset}
  setSectionArc(view){this.sectionArc=view||null}
  setTrackfield(world){this.trackfield=world||null}
  slotAngle(i,state){return -Math.PI/2 + (i+state.rotation)*TAU/N + this.dragOffset}
  draw(state,now=performance.now()){
    const road=!!this.trackfield?.points?.length;
    this.cx=this.w/2;this.cy=this.h*(road?.64:.52);this.r=Math.min(this.w*(road?.27:.34),this.h*(road?.225:.33),road?220:280);
    const g=this.g;g.clearRect(0,0,this.w,this.h);this._background(state,now);if(road)this._trackfield(state,now);this._section(state,now);this._creases(state,now);this._ring(state,now);this._gate(state,now);this._causal(state,now);this._pulses(state,now);this._center(state,now)
  }
  _background(state,t){const g=this.g;const grd=g.createRadialGradient(this.cx,this.cy,5,this.cx,this.cy,Math.max(this.w,this.h)*.7);grd.addColorStop(0,'#0b1018');grd.addColorStop(1,'#05070b');g.fillStyle=grd;g.fillRect(0,0,this.w,this.h);g.save();g.translate(this.cx,this.cy);for(let i=0;i<4;i++){g.strokeStyle=`rgba(255,255,255,${.016+i*.006})`;g.lineWidth=.7;g.beginPath();g.arc(0,0,this.r*(.38+i*.18)+Math.sin(t*.0003+i)*2,0,TAU);g.stroke()}
    const beatLife=clamp(1-(t-this.beatAt)/260,0,1);if(beatLife>0){g.strokeStyle=`rgba(255,255,255,${(.12+.35*this.beatEnergy)*beatLife})`;g.lineWidth=1+2*beatLife;g.beginPath();g.arc(0,0,this.r+10+14*(1-beatLife),0,TAU);g.stroke()}g.restore()}
  _trackfield(state,t){
    const proj=projectTrackfield(this.trackfield,this.w,this.h);if(!proj?.slices?.length)return;
    const g=this.g,s=proj.slices,shake=clamp((proj.current?.flux||0)-.72,0,.5);
    g.save();g.translate(Math.sin(t*.028)*shake*3,Math.cos(t*.021)*shake*1.5);
    const horizon=s[s.length-1];
    const haze=g.createRadialGradient(horizon.centerX,horizon.baseY,2,horizon.centerX,horizon.baseY,Math.max(this.w,this.h)*.42);
    haze.addColorStop(0,`rgba(109,189,255,${.08+.10*clamp(proj.current?.brightness||0,0,1)})`);
    haze.addColorStop(1,'rgba(5,7,11,0)');
    g.fillStyle=haze;g.fillRect(0,0,this.w,this.h);

    for(let i=s.length-2;i>=0;i--){
      const a=s[i],b=s[i+1],hot=clamp(a.impact,0,1.25),flux=clamp(a.flux,0,1.25);
      const al=Math.round(16+hot*24+flux*10).toString(16).padStart(2,'0');
      g.fillStyle=(a.sectionIndex%2===0?'#6dbdff':'#ff9852')+al;
      g.beginPath();g.moveTo(a.centerX-a.half,a.baseY);g.lineTo(a.centerX+a.half,a.baseY);g.lineTo(b.centerX+b.half,b.baseY);g.lineTo(b.centerX-b.half,b.baseY);g.closePath();g.fill();
    }

    g.lineWidth=1;
    for(const frac of [-1,-1/3,1/3,1]){
      g.beginPath();
      for(let i=0;i<s.length;i++){
        const p=s[i],x=p.centerX+p.half*frac,y=p.baseY;
        i?g.lineTo(x,y):g.moveTo(x,y);
      }
      g.strokeStyle=Math.abs(frac)===1?'rgba(255,255,255,.38)':'rgba(255,255,255,.18)';
      g.stroke();
    }

    for(let i=1;i<s.length;i++){
      const p=s[i];
      if(p.beatEdge){
        g.strokeStyle=`rgba(255,255,255,${.10+.18*clamp(p.impact,0,1)})`;g.lineWidth=1;
        g.beginPath();g.moveTo(p.centerX-p.half,p.baseY);g.lineTo(p.centerX+p.half,p.baseY);g.stroke();
      }
      if(p.sectionEdge){
        const top=p.baseY-Math.max(14,p.half*.46);
        g.strokeStyle='rgba(255,255,255,.62)';g.lineWidth=1.6;
        g.beginPath();g.moveTo(p.centerX-p.half,p.baseY);g.lineTo(p.centerX-p.half,top);g.lineTo(p.centerX+p.half,top);g.lineTo(p.centerX+p.half,p.baseY);g.stroke();
      }
      if(p.impact>.96&&s[i-1].impact<=.96){
        const top=p.baseY-Math.max(10,p.half*.34);
        g.strokeStyle='rgba(255,255,255,.34)';g.lineWidth=1;
        for(let k=0;k<3;k++){
          const m=1+k*.15;
          g.beginPath();g.moveTo(p.centerX-p.half*m,p.baseY);g.quadraticCurveTo(p.centerX,top-k*9,p.centerX+p.half*m,p.baseY);g.stroke();
        }
      }
    }
    if(proj.surge&&proj.surge.ahead<8){
      const ix=Math.min(s.length-1,Math.max(0,proj.surge.index)),p=s[ix];
      g.textAlign='center';g.font='800 7px ui-monospace,monospace';g.fillStyle='rgba(255,255,255,.48)';
      g.fillText(`SURGE ${proj.surge.ahead.toFixed(1)}s`,p.centerX,p.baseY-18);
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
