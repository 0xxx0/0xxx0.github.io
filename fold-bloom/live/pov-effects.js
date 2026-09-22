const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const fract=x=>x-Math.floor(x);

export const POV_SCHEMA='fold-bloom-pov/v0.1';

export function sourceSkyEvent(world){
  if(!world?.points?.length)return null;
  const section=world.points.find(p=>p.sectionEdge&&Number(p.ahead)>.15&&Number(p.ahead)<6);
  if(section)return {kind:'SECTION',ahead:Number(section.ahead)||0,strength:clamp(.45+(Number(section.impact)||0)*.45,0,1),side:Math.sign(Number(section.bend)||0)};
  const surge=world.surge;
  if(surge&&Number(surge.ahead)<5.2)return {kind:'SURGE',ahead:Number(surge.ahead)||0,strength:clamp((Number(surge.impact)||0)*.72+(Number(surge.rise)||0)*.6,0,1),side:Math.sign(Number(world.currentBend)||0)};
  const phrase=world.points.find(p=>p.phraseEdge&&Number(p.ahead)>.12&&Number(p.ahead)<2.8);
  if(phrase)return {kind:'PHRASE',ahead:Number(phrase.ahead)||0,strength:clamp(.26+(Number(phrase.impact)||0)*.34,0,.72),side:Math.sign(Number(phrase.bend)||0)};
  return null;
}

export function releaseSkyDescriptor(event={}){
  const ops=Array.isArray(event.operations)&&event.operations.length?event.operations:[event.verb];
  const verb=ops[0]||'BLOOM',power=clamp(Number(event.power)||1,.5,3.2),chain=clamp(Number(event.chain)||1,1,9),slot=Number(event.slot)||0;
  const kind=verb==='FOLD'?'CREASE':verb==='SPLIT'?'TWIN':verb==='RETURN'?'CONVERGE':'BLOOM';
  return {kind,verb,power,chain,slot,side:((slot%12)/11)*2-1};
}

export function opticWitness(world,timeMs=0,count=18){
  const speed=clamp(Number(world?.currentSpeed)||1,.45,2.5),grade=clamp(Number(world?.currentGrade)||0,-1.6,1.6),bend=clamp(Number(world?.currentBend)||0,-1,1),t=Number(timeMs)||0;
  const stars=[];
  for(let i=0;i<count;i++){
    const sx=fract(Math.sin((i+1)*12.9898)*43758.5453),sy=fract(Math.sin((i+3)*78.233)*12515.873),phase=fract(sy+t*.000035*speed);
    const depth=.08+phase*.92,spread=.12+Math.pow(depth,1.7)*1.28;
    stars.push({x:(sx-.5)*spread+bend*.08*depth,y:(sy-.5)*spread+grade*.025*depth,depth,speed});
  }
  return {schema:POV_SCHEMA,speed,grade,bend,stars};
}

export function povSummary(world){
  const e=sourceSkyEvent(world);
  return {schema:POV_SCHEMA,speed:Number(world?.currentSpeed)||1,grade:Number(world?.currentGrade)||0,bend:Number(world?.currentBend)||0,event:e};
}
