(()=>{'use strict';
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const S={conv:null,current:null,manifest:null,q:'',disp:''};
async function j(u){const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw new Error(u+' '+r.status);return r.json()}
function routeLink(r,label){return r?'<a class="wlink" href="'+esc(r)+'">'+esc(label||r)+' ↗</a>':''}
function draw(){
 if(!S.conv)return;
 const active=(S.current?.active_fronts||[]).filter(x=>String(x.state||'').includes('ACTIVE'));
 const heads=S.current?.current_heads||[];
 $('#wLive').innerHTML='<span>LIVE CONTROL '+(S.current?'CONNECTED':'UNAVAILABLE')+'</span><span>'+active.length+' ACTIVE FRONTS</span><span>'+heads.length+' CURRENT HEADS</span>';
 $('#wDayline').innerHTML='<div class="wtitle">ATLAS DAYLINE · STABLE DONOR</div><div class="wbody">'+S.conv.atlas_dayline.keep.map(x=>'• '+esc(x)).join('<br>')+'</div><div class="wlinks">'+routeLink(S.conv.atlas_dayline.route,'OPEN DAYLINE')+'</div>';
 $('#wVectors').innerHTML=S.conv.vectors.map(v=>'<article class="vcard"><div class="vid">'+esc(v.id)+'</div><div class="vname">'+esc(v.label)+'</div><div class="vflow"><b>OLD</b> '+esc(v.from.join(' · '))+'<br><b>NOW</b> '+esc(v.to.join(' · '))+'</div><div class="vret">'+esc(v.retained)+'</div>'+routeLink(v.route,'OPEN CURRENT')+'</article>').join('');
 archive();
}
function archive(){
 if(!S.conv)return;
 const q=S.q.toLowerCase(),d=S.disp;
 const rows=S.conv.crosswalk.filter(x=>(!q||JSON.stringify(x).toLowerCase().includes(q))&&(!d||x.disposition===d));
 const counts={};S.conv.crosswalk.forEach(x=>counts[x.disposition]=(counts[x.disposition]||0)+1);
 $('#wArchiveStats').innerHTML='<span>'+rows.length+' / '+S.conv.crosswalk.length+' RECORDS</span>'+Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([k,v])=>'<span>'+esc(k)+' '+v+'</span>').join('');
 $('#wArchive').innerHTML=rows.map(x=>'<div class="wrow"><div class="wid">'+esc(x.app_id)+'</div><div><div class="wname">'+esc(x.name)+'</div><div class="wnow">'+esc(x.now)+'</div></div><div class="wdisp">'+esc(x.disposition)+'</div><div>'+routeLink(x.route,'OPEN')+'</div></div>').join('')||'<div class="wempty">No lineage records under this filter.</div>';
}
async function init(){
 try{
   [S.conv,S.current,S.manifest]=await Promise.all([j('./convergence.json'),j('/control/CURRENT.json').catch(()=>null),j('/showcase-manifest.json').catch(()=>null)]);
   draw();
 }catch(e){$('#wLive').textContent='WRANGLER LOAD FAILED · '+e.message}
 $('#wq')?.addEventListener('input',e=>{S.q=e.target.value;archive()});
 $('#wdisp')?.addEventListener('change',e=>{S.disp=e.target.value;archive()});
}
init();
})();
