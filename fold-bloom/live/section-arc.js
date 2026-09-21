const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

export function createSectionArc(){
  return {
    sectionIndex:-1,
    hits:0,
    verbs:[],
    sealed:false,
    sealCount:0,
    transitions:0,
    lastSection:null,
    lastSeal:null
  };
}

export function cloneSectionArc(arc){
  return {...arc,verbs:[...(arc?.verbs||[])],lastSection:arc?.lastSection?{...arc.lastSection,verbs:[...(arc.lastSection.verbs||[])]}:null,lastSeal:arc?.lastSeal?{...arc.lastSeal}:null};
}

export function sectionPhase(transport){
  if(!transport||!Number.isFinite(Number(transport.sectionIndex)))return 'FREE';
  const p=clamp(Number(transport.sectionProgress)||0,0,1);
  if(p>=.72)return 'RETURN';
  if(p>=.38)return 'WEAVE';
  return 'OPEN';
}

export function sectionArcReady(arc){
  return !!(arc&&arc.hits>=2&&new Set(arc.verbs||[]).size>=2);
}

export function syncSectionArc(arc,transport){
  const n=cloneSectionArc(arc||createSectionArc());
  const next=Number.isFinite(Number(transport?.sectionIndex))?Math.max(0,Math.trunc(Number(transport.sectionIndex))):-1;
  if(next<0)return {arc:n,event:null};
  if(n.sectionIndex===-1){n.sectionIndex=next;return {arc:n,event:{kind:'SECTION_ENTER',sectionIndex:next}}}
  if(next===n.sectionIndex)return {arc:n,event:null};
  const previous={
    sectionIndex:n.sectionIndex,
    hits:n.hits,
    verbs:[...n.verbs],
    sealed:n.sealed
  };
  n.lastSection=previous;
  n.sectionIndex=next;
  n.hits=0;n.verbs=[];n.sealed=false;n.transitions++;
  return {arc:n,event:{kind:'SECTION_CHANGE',from:previous.sectionIndex,to:next,previous}};
}

export function observeSectionRelease(arc,releaseEvent,transport){
  let {arc:n,event:transition}=syncSectionArc(arc,transport);
  if(!releaseEvent||n.sectionIndex<0)return {arc:n,event:transition,bonus:0};
  if(releaseEvent.callMet){
    n.hits++;
    if(!n.verbs.includes(releaseEvent.verb))n.verbs.push(releaseEvent.verb);
  }
  const phase=sectionPhase(transport),hasReturn=(releaseEvent.operations||[]).includes('RETURN'),ready=sectionArcReady(n);
  if(!n.sealed&&phase==='RETURN'&&ready&&hasReturn){
    const variety=new Set(n.verbs).size;
    const bonus=Math.round(60+n.hits*16+variety*24+(releaseEvent.timing==='PERFECT'?28:releaseEvent.timing==='GOOD'?12:0));
    n.sealed=true;n.sealCount++;
    n.lastSeal={sectionIndex:n.sectionIndex,hits:n.hits,variety,bonus,verb:releaseEvent.verb,timing:releaseEvent.timing||'FREE'};
    return {arc:n,event:{kind:'SECTION_SEAL',...n.lastSeal},bonus};
  }
  return {arc:n,event:transition,bonus:0};
}

export function sectionArcLabel(arc,transport){
  if(!transport||!Number.isFinite(Number(transport.sectionIndex)))return '—';
  const p=Math.round(clamp(Number(transport.sectionProgress)||0,0,1)*100),phase=sectionPhase(transport);
  if(arc?.sealed)return `S${Number(transport.sectionIndex)+1} SEALED`;
  const variety=new Set(arc?.verbs||[]).size,ready=sectionArcReady(arc);
  if(phase==='RETURN')return ready?`S${Number(transport.sectionIndex)+1} CLOSE`:`S${Number(transport.sectionIndex)+1} ${arc?.hits||0}/2 · ${variety}/2V`;
  return `S${Number(transport.sectionIndex)+1} ${p}%`;
}

export function sectionArcView(arc,transport){
  return {
    sectionIndex:Number.isFinite(Number(transport?.sectionIndex))?Number(transport.sectionIndex):-1,
    sectionCount:Number.isFinite(Number(transport?.sectionCount))?Number(transport.sectionCount):0,
    progress:clamp(Number(transport?.sectionProgress)||0,0,1),
    phase:sectionPhase(transport),
    hits:arc?.hits||0,
    variety:new Set(arc?.verbs||[]).size,
    ready:sectionArcReady(arc),
    sealed:!!arc?.sealed,
    sealCount:arc?.sealCount||0
  };
}
