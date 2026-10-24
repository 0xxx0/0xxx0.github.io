/* Source → City → Return. Presentation-only adapter; eight native Gate laws stay sole authority. */
'use strict';
(()=>{
  const C=globalThis.SleeperSourceCarrier;
  if(!C||!new URLSearchParams(location.search).has('carry'))return;
  let packet=C.consume(sessionStorage);
  if(!packet)return;
  const source=document.getElementById('source');
  const preview=document.getElementById('worldPreview');
  const note=document.createElement('div');
  note.className='tiny';
  note.style.cssText='margin:10px 0;padding:10px 12px;border-left:2px solid #a78b54;color:#d8c8a8;overflow-wrap:anywhere';
  const description=document.createElement('span');
  description.textContent=packet.kind+' / EXACT SOURCE '+packet.witness.start+'–'+packet.witness.end+(packet.witness.truncated?' / TRUNCATED CUT':'')+' · NOT PROOF';
  const back=document.createElement('a');
  back.href=packet.from;back.textContent=' ↶ SOURCE';back.style.marginLeft='10px';
  note.append(description,back);preview.insertAdjacentElement('afterend',note);
  source.value=packet.excerpt;
  source.dispatchEvent(new Event('input',{bubbles:true}));
  function sameSource(s){return String(s||'').trim().replace(/\s+/g,' ')===packet?.excerpt.trim().replace(/\s+/g,' ')}
  const oldStart=start;
  start=function(s,...rest){
    if(packet&&!sameSource(s)){
      packet=null;note.remove();document.getElementById('carrierOriginLink')?.remove();
    }
    return oldStart(s,...rest);
  };
  const side=document.querySelector('.side-links');
  if(side){
    const anchor=document.createElement('a');anchor.id='carrierOriginLink';
    anchor.href=packet.from;anchor.textContent='↶ ORIGINAL '+packet.kind+' SOURCE';
    side.prepend(anchor);
  }
  const priorShowReturn=showReturn;
  showReturn=function(artifact,trace){
    priorShowReturn(artifact,trace);
    if(!packet)return;
    const actions=document.querySelector('#modalCard .modal-actions');
    if(!actions)return;
    const rejoin=document.createElement('button');
    rejoin.textContent='DOWNLOAD LINKED RETURN';
    rejoin.onclick=()=>{
      try{
        const joined=C.rejoin(packet,artifact,trace),json=JSON.stringify(joined,null,2);
        const url=URL.createObjectURL(new Blob([json],{type:'application/json'}));
        const a=document.createElement('a');a.href=url;a.download=artifact.worldKey+'-source-return.json';a.click();
        setTimeout(()=>URL.revokeObjectURL(url),1500);
      }catch(e){rejoin.textContent='REJOIN UNAVAILABLE · '+e.message}
    };
    const back=document.createElement('a');
    back.href=packet.from;back.textContent='↶ RETURN TO ORIGINAL SOURCE';
    back.style.cssText='display:inline-flex;align-items:center;padding:9px;border:1px solid #504530;color:#efcf8a;text-decoration:none;font-size:11px';
    actions.append(rejoin,back);
  };
})();
