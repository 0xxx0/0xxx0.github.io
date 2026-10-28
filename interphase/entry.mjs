async function enterInterphase(){
 const release=new URL(import.meta.url).search;
 const q=new URLSearchParams(location.search),template=document.getElementById('legacyWorkbench');
 if(q.get('legacy')==='1'){
  document.body.replaceChildren(template.content.cloneNode(true));
  for(const name of ['workbench','research','compositor','substrate']){const l=document.createElement('link');l.rel='stylesheet';l.href='./'+name+'.css';document.head.append(l)}
  for(const src of ['/lib/document-structure.js','/lib/read-trail.js?v=review-2','/field-aperture.js?v=0.8.7'])await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.head.append(s)});
  await import('./app.mjs?v=0.10.0');await import('./substrate.mjs');await import('./compositor.mjs');return;
 }
 template.remove();
 const {mountContinuum}=await import('./continuum.mjs'+release),api=await mountContinuum(document.getElementById('interphaseContinuum'));
 window.InterphaseInstrument=api;
 if(q.has('src'))return api.openPath(q.get('src'));
 if(q.has('handoff')){
  const p=JSON.parse(sessionStorage.getItem('rsvp.handoff.v1')||'null');
  if(p&&typeof p.raw==='string'){
   const {hashText}=await import('../lib/id.js'),hash=await hashText(p.raw);if(p.hash&&p.hash!==hash)throw Error('Source revision mismatch.');
   const old=JSON.parse(sessionStorage.getItem('interphase.continuum.v1')||'null'),saved=old?.source?.hash===hash?old:null,focus=p.focus||{};
   const attention={...(saved?.attention||{view:'plain',query:'',wpm:260}),char:focus.char_index??focus.charIndex??saved?.attention?.char??0,wpm:focus.wpm??saved?.attention?.wpm??260};
   if(saved)return api.importPacket({schema:'interphase.continuation/v1',authority:'LOCAL_SOURCE_ONLY',source:saved.source,attention,links:saved.links||[],doors:saved.doors||[],doorFrames:saved.doorFrames||[],marks:saved.marks||[],frames:saved.frames||[],returnTo:p.returnAddress});
   return api.load(p.raw,p.label,p.sourceAddress||'',{hash,attention,returnTo:p.returnAddress});
  }
 }
 if(q.has('route'))return api.loadRoute(q.get('route'));return api.resume();
}
enterInterphase().catch(e=>{const t=document.querySelector('[data-ip=status]')||document.getElementById('interphaseContinuum');if(t)t.textContent='Source held: '+e.message;console.error(e)});
