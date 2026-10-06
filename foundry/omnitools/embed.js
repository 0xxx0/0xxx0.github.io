(() => {
  if(new URLSearchParams(location.search).get('embedded')!=='1')return;
  const tool=document.body.dataset.tool;document.body.classList.add('omniEmbedded');
  document.querySelectorAll('textarea:not([readonly])').forEach(t=>{t.readOnly=true;t.setAttribute('aria-label',t.id==='in'?'Exact held source':t.id+' held source');});
  const target=document.getElementById({scan:'out',read:'grid',align:'read'}[tool]);if(!target)return;
  const pager=document.createElement('div');pager.className='omniPager';pager.setAttribute('aria-label','Result pages');const prev=document.createElement('button'),next=document.createElement('button'),label=document.createElement('span');prev.textContent='←';next.textContent='→';prev.setAttribute('aria-label','Previous result');next.setAttribute('aria-label','Next result');pager.append(prev,label,next);document.querySelector('main').append(pager);let page=0;
  function render(){const items=[...target.children].filter(e=>e.matches(tool==='read'?'.cell':'.row'));page=Math.min(page,Math.max(0,items.length-1));items.forEach((e,i)=>e.hidden=i!==page);prev.disabled=page===0;next.disabled=page>=items.length-1;label.textContent=items.length?((tool==='read'?items[page].querySelector('h2')?.textContent||'REPORT':'RESULT')+' · '+(page+1)+' / '+items.length):'NO RESULT';}
  prev.onclick=()=>{page--;render();};next.onclick=()=>{page++;render();};new MutationObserver(()=>{page=0;render();}).observe(target,{childList:true});render();
})();
