(function(root){
  'use strict';
  if(typeof document==='undefined')return;
  const F=root.InterphaseFieldObject,D=root.InterphaseChangeDag,E=root.InterphaseEffectMachine;
  if(!F||!D||!E)return;
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const short=id=>id?String(id).replace(/^chg:/,'').slice(0,8):'SOURCE';
  async function boot(){
    const fold=document.getElementById('statusFold'),body=fold&&fold.querySelector('.foldBody.nested');
    if(!body||document.getElementById('interphaseContinuityFold'))return;
    let route=null,source=null,dag=null,effect=null,error=null;
    try{
      const res=await fetch('/showcase-manifest.json',{cache:'no-store'});if(!res.ok)throw new Error('manifest '+res.status);
      const manifest=await res.json();route=F.selectManifestRoute(manifest,'/');if(!route)throw new Error('FIELD route / missing');
      source=F.fromManifestRoute(route);
      const key=D.storageKeyFor(source),raw=localStorage.getItem(key);dag=raw?JSON.parse(raw):null;
      effect=E.inspectFieldCatchup(localStorage,'/');
    }catch(err){error=String(err&&err.message||err)}
    const details=document.createElement('details');details.className='routeProjection';details.id='interphaseContinuityFold';
    const heads=Array.isArray(dag?.heads)?dag.heads:[],changes=Array.isArray(dag?.order)?dag.order:[];
    const selected=dag?.selected_head||null;
    const status=error?'UNAVAILABLE':`/ · DAG ${changes.length}Δ/${heads.length}h · ${effect?.stamp?'ORIENTED':'UNSEEN'}`;
    details.innerHTML=`<summary><b>INTERPHASE / CONTINUITY</b><span>${esc(status)}</span></summary><div class="touchList"><div class="touchItem"><b>OBJECT</b><span>${esc(source?.id||'/')}</span><small>canonical route remains showcase-manifest.json; this is a projection witness, not a second authority.</small></div><div class="touchItem"><b>DAG</b><span>${esc(selected?'h:'+short(selected):'SOURCE')}</span><small>${esc(error||`${changes.length} content-addressed local changes · ${heads.length} live head${heads.length===1?'':'s'} · base ${dag?.base_fingerprint||D.baseFingerprint(source)}`)}</small></div><div class="touchItem"><b>EFFECT</b><span>${esc(effect?.stamp?'SEEN '+effect.stamp:'UNSEEN')}</span><small>${esc(E.CATCHUP_ITEM_KEY)} · browser-local FIELD orientation; canonical RETURN does not touch it.</small></div></div><div class="feedMore"><span>RETURN = semantic DAG compensation · COMPENSATE = browser effect restoration · no CRDT merge claimed.</span><a class="tiny" href="/interphase/">OPEN INTERPHASE →</a></div>`;
    body.insertBefore(details,body.firstChild);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(typeof globalThis!=='undefined'?globalThis:this);
