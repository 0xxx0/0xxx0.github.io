/* HOUSE / BASE CAMP — local projection over the canonical HOUSE locus.
 *
 * HOUSE remains spatial/address authority. ENV-0 remains coupling grammar.
 * BODY/FIT remains body/load authority. Dayline remains run/time authority.
 * HOUSEBUS remains private runtime/actuation authority.
 *
 * This file owns only browser-local planning state: exact user-authored kit
 * references, selected frictions, and bounded set-out/return witnesses.
 */
(function(){
  'use strict';
  const KEY='houseBaseCampLocalV01';
  const HANDOFF='atlas.dayline.handoff.v01';
  const FRICTIONS=['carry','weather','power','install','mobility','duration','room-task'];
  const ITEM_STATES=['READY','SERVICE','UNKNOWN'];
  const ENV0=['BODY','GARMENT','HARNESS','SUIT','FURNITURE','ROOM','HOUSE'];
  let B={items:[],selected:[],frictions:[],purpose:'',runs:[]};
  try{B={...B,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch(_){ }
  B.items=Array.isArray(B.items)?B.items:[];
  B.selected=Array.isArray(B.selected)?B.selected:[];
  B.frictions=Array.isArray(B.frictions)?B.frictions:[];
  B.runs=Array.isArray(B.runs)?B.runs:[];

  const h=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const saveBase=()=>localStorage.setItem(KEY,JSON.stringify(B));
  const room=()=>{try{return R()}catch(_){return null}};
  const locus=()=>room()?.id||selected||'house';
  const label=()=>room()?.label||locus();
  const item=id=>B.items.find(x=>x.id===id)||null;
  const selectedItems=()=>B.selected.map(item).filter(Boolean);
  const stateCount=s=>B.items.filter(x=>x.state===s).length;
  const careOpen=()=>Array.isArray(S?.care)?S.care.filter(x=>x.state!=='DONE').length:0;

  function ensureStyle(){
    if(document.getElementById('houseBaseCampStyle'))return;
    const style=document.createElement('style');style.id='houseBaseCampStyle';
    style.textContent=`
    .baseCamp{padding:12px;display:grid;gap:10px;min-height:555px;background:#091014}
    .baseHero{border:1px solid var(--line);background:linear-gradient(135deg,#0b1115 0%,#10171b 58%,#0b0f12 100%);display:grid;grid-template-columns:minmax(0,1.25fr) minmax(260px,.75fr);gap:1px}
    .baseScene,.baseBrief{padding:14px;min-height:220px}.baseScene{border-right:1px solid var(--line);position:relative;overflow:hidden}.baseScene svg{display:block;width:100%;height:170px}.baseScene .roomShape{fill:rgba(119,198,233,.07);stroke:#77c6e9;stroke-width:3}.baseScene .anchorDot{fill:#081015;stroke:#d8ad67;stroke-width:2}.baseScene .anchorLabel{fill:#d8ad67;font-size:10px}.baseScene .roomName{fill:#eef1ee;font:800 28px system-ui,sans-serif;letter-spacing:-.04em}.baseScene .roomSub{fill:#849198;font-size:10px}.baseBrief{display:grid;align-content:start;gap:9px}.baseTitle{font:850 clamp(26px,5vw,48px)/.9 system-ui,sans-serif;letter-spacing:-.05em}.baseLoop{display:grid;grid-template-columns:repeat(5,1fr);gap:1px;background:var(--line);border:1px solid var(--line)}.baseLoop span{background:#0c1114;padding:8px 5px;text-align:center;font-size:8px;letter-spacing:.12em}.baseLoop span.hot{color:#dff7ff;background:#10202a}.baseGrid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(280px,.9fr);gap:10px}.basePanel{border:1px solid var(--line);background:#0c1013;padding:10px}.basePanel h3{margin:0 0 8px;font:800 15px/1 system-ui,sans-serif}.baseStats{display:flex;gap:5px;flex-wrap:wrap}.baseStat{border:1px solid var(--line);padding:5px 7px;color:var(--mut);font-size:8px}.baseStat b{color:var(--ink)}.baseStationRow,.baseFriction,.baseButtons{display:flex;gap:5px;flex-wrap:wrap}.baseStationRow a,.baseButtons button,.baseFriction button{border:1px solid var(--line);padding:7px 9px;background:#0a0f12;color:var(--cool);min-height:34px;display:inline-flex;align-items:center;text-decoration:none}.baseFriction button{color:var(--mut)}.baseFriction button.on{border-color:var(--cool);color:#dff7ff;background:#0d171d}.baseItem{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:7px;align-items:start;border-top:1px solid var(--line);padding:7px 0}.baseItem:first-child{border-top:0}.baseItem input[type=checkbox]{margin-top:4px}.baseItem strong{display:block}.baseItem small{display:block;color:var(--mut);margin-top:2px}.baseItemState{font-size:8px;letter-spacing:.12em;border:1px solid var(--line);padding:4px 5px;cursor:pointer}.baseItemState[data-state=READY]{color:var(--ok)}.baseItemState[data-state=SERVICE]{color:var(--warn)}.baseItemState[data-state=UNKNOWN]{color:var(--mut)}.baseAdd{display:grid;grid-template-columns:minmax(0,1fr) minmax(100px,.55fr) auto;gap:5px;margin-top:8px}.baseAdd input,.basePurpose,.baseReturn{width:100%}.env0{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin:7px 0}.env0 span{border:1px solid var(--line);padding:7px 3px;text-align:center;font-size:7px;color:var(--mut)}.env0 span.hot{border-color:#6e4f8f;color:#d8c9ee;background:#15101a}.baseRun{border-top:1px solid var(--line);padding-top:7px;margin-top:7px}.baseRun strong{display:block}.baseRun small{color:var(--mut)}.baseTruth{font-size:8px;color:var(--mut);border-left:2px solid var(--hot);padding-left:8px}.baseEmpty{color:var(--mut);padding:8px 0}.baseFooter{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;color:var(--mut);font-size:8px}.baseFooter a{color:var(--cool)}
    @media(max-width:850px){.baseHero,.baseGrid{grid-template-columns:1fr}.baseScene{border-right:0;border-bottom:1px solid var(--line);min-height:190px}.baseScene svg{height:145px}.baseLoop{grid-template-columns:repeat(5,minmax(64px,1fr));overflow:auto}.baseAdd{grid-template-columns:1fr 1fr}.baseAdd button{grid-column:1/-1}.env0{grid-template-columns:repeat(4,1fr)}.baseCamp{padding:8px}.baseHero,.basePanel{border-left:0;border-right:0}}
    `;
    document.head.appendChild(style);
  }

  function normPoints(points){
    if(!Array.isArray(points)||!points.length)return [];
    const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
    const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),w=Math.max(1,maxX-minX),hh=Math.max(1,maxY-minY);
    return points.map(p=>[30+(p[0]-minX)/w*440,35+(p[1]-minY)/hh*105]);
  }
  function sceneSvg(r){
    if(!r)return '<div class="baseEmpty">HOUSE model loading…</div>';
    const pts=normPoints(r.points||[]),pstr=pts.map(p=>p.join(',')).join(' ');
    const b=(()=>{const xs=(r.points||[]).map(p=>p[0]),ys=(r.points||[]).map(p=>p[1]);return xs.length?{x0:Math.min(...xs),x1:Math.max(...xs),y0:Math.min(...ys),y1:Math.max(...ys)}:null})();
    const anchors=(M?.anchors||[]).filter(a=>a.room===r.id).map((a,i)=>{
      let x=55+i*75,y=115;
      if(b){x=30+(a.x-b.x0)/Math.max(1,b.x1-b.x0)*440;y=35+(a.y-b.y0)/Math.max(1,b.y1-b.y0)*105}
      return '<circle class="anchorDot" cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="5"></circle><text class="anchorLabel" x="'+(x+8).toFixed(1)+'" y="'+(y+4).toFixed(1)+'">'+h(a.id)+'</text>';
    }).join('');
    return '<svg viewBox="0 0 500 170" aria-label="selected HOUSE locus"><polygon class="roomShape" points="'+pstr+'"></polygon>'+anchors+'<text class="roomName" x="26" y="155">'+h(r.label)+'</text><text class="roomSub" x="26" y="169">'+h(r.id)+' · '+h((S.roomModes&&S.roomModes[r.id])||r.mode||'UNKNOWN')+'</text></svg>';
  }

  function roleFor(x){
    if(x.state==='SERVICE')return 'RETURN BIN';
    if(x.home_address===locus()&&x.state==='READY')return 'READY RACK';
    if(x.home_address===locus()&&x.state==='UNKNOWN')return 'STASH / UNKNOWN';
    if(x.home_address===locus())return 'STASH';
    return 'MOBILE';
  }
  function itemHtml(x){
    const checked=B.selected.includes(x.id)?' checked':'';
    return '<div class="baseItem"><input type="checkbox" data-base-select="'+h(x.id)+'"'+checked+'><div><strong>'+h(x.label)+'</strong><small>'+h(roleFor(x))+' · HOME '+h(x.home_address||'UNKNOWN')+(x.tags?' · '+h(x.tags):'')+'</small></div><button class="baseItemState" data-base-state="'+h(x.id)+'" data-state="'+h(x.state||'UNKNOWN')+'">'+h(x.state||'UNKNOWN')+'</button></div>';
  }
  function latestRun(){return B.runs.find(x=>x.state==='OUT')||B.runs[0]||null}

  function renderBase(){
    ensureStyle();
    const r=room();
    const current=locus();
    B.selected=B.selected.filter(id=>!!item(id));
    const run=latestRun();
    const itemRows=B.items.map(itemHtml).join('')||'<div class="baseEmpty">No local kit references yet. Add only an item you actually want to address; this is not canonical physical inventory.</div>';
    const fr=FRICTIONS.map(x=>'<button data-base-friction="'+x+'" class="'+(B.frictions.includes(x)?'on':'')+'">'+x.toUpperCase()+'</button>').join('');
    const env=ENV0.map(x=>'<span class="'+(x==='HARNESS'||x==='ROOM'?'hot':'')+'">'+x+'</span>').join('');
    const anchors=(M?.anchors||[]).filter(a=>a.room===current).length;
    const service=stateCount('SERVICE');
    canvas.innerHTML='<div class="baseCamp">'+
      '<section class="baseHero"><div class="baseScene">'+sceneSvg(r)+'</div><div class="baseBrief"><div class="k">BASE CAMP · HOUSE / ENV-0</div><div class="baseTitle">'+h(label())+'</div><div class="note">A persistent locus for prep, return and maintenance. Spatial address stays HOUSE truth; kit/loadout stays local planning; HOUSEBUS keeps runtime actuation.</div><div class="baseStats"><span class="baseStat">HERE <b>'+h(current)+'</b></span><span class="baseStat">ANCHORS <b>'+anchors+'</b></span><span class="baseStat">READY <b>'+stateCount('READY')+'</b></span><span class="baseStat">SERVICE <b>'+service+'</b></span><span class="baseStat">CARE OPEN <b>'+careOpen()+'</b></span></div><div class="baseStationRow"><a href="/body/fit/">LOADOUT / BODY FIT ↗</a><a href="/shopping/">ACQUIRE / SHOP ↗</a><a href="/foundry/">MAKE / FOUNDRY ↗</a><a href="/house/expert.html">STATE / EXPERT ↗</a></div></div></section>'+
      '<div class="baseLoop"><span class="hot">HOME</span><span>PREP</span><span>SET OUT</span><span>RETURN</span><span>SERVICE → READY</span></div>'+
      '<div class="baseGrid"><section class="basePanel"><div class="k">LOCAL KIT · CATALOG ≠ INVENTORY ≠ LOADOUT ≠ LOCATION</div><h3>Prepare against friction</h3><label class="note">PURPOSE / RUN<input id="basePurpose" class="basePurpose" value="'+h(B.purpose)+'" placeholder="install shelf / cat-care round / maker run / errand"></label><div class="k" style="margin-top:9px">FRICTION</div><div class="baseFriction">'+fr+'</div><div class="k" style="margin-top:10px">EXACT LOCAL REFERENCES</div><div id="baseItems">'+itemRows+'</div><div class="baseAdd"><input id="baseItemLabel" placeholder="observed item / tool / container"><input id="baseItemTags" placeholder="tags e.g. power,carry"><button id="baseAddItem">ADD HERE</button></div><div class="baseButtons" style="margin-top:9px"><button id="baseSetOut">SET OUT → DAYLINE</button><button id="baseOpenFit">PREP IN BODY/FIT</button><button id="baseOpenCare">SERVICE / CARE</button></div><div class="baseTruth" style="margin-top:9px">SET OUT carries purpose + selected item refs + friction + exact HOUSE address. It does not prove possession, readiness, presence, or device state.</div></section>'+
      '<section class="basePanel"><div class="k">ENV-0 · COUPLING ENVELOPE</div><h3>Load routes through the environment</h3><div class="env0">'+env+'</div><div class="note">ENV-0 answers how a tool/load couples through BODY / HARNESS / FURNITURE / ROOM. It does not own inventory or grant device authority.</div><div class="baseStationRow" style="margin-top:8px"><a href="/recovery/env0/">ENV-0 ATLAS ↗</a><a href="/house/#PLAN">PLAN ↗</a><a href="/house/#TRACE">TRACE ↗</a></div><div class="k" style="margin-top:12px">LATEST RUN / RETURN</div>'+runHtml(run)+'<div class="baseFooter" style="margin-top:12px"><span>LOOP · PLACE → STASH → PREP → FIT → SET OUT → RETURN → SERVICE → READY</span><span>LOCAL ONLY · SOURCE-OWNED TRUTH</span></div></section></div></div>';
    wireBase();
  }

  function runHtml(run){
    if(!run)return '<div class="baseEmpty">No set-out witness yet.</div>';
    const kit=(run.items||[]).map(x=>x.label).join(' · ')||'no item refs';
    if(run.state==='OUT')return '<div class="baseRun"><strong>OUT · '+h(run.purpose||'unnamed run')+'</strong><small>'+h(run.address)+' · '+h(kit)+' · '+h((run.frictions||[]).join(' / ')||'no friction tags')+'</small><label class="note" style="display:block;margin-top:8px">WHAT RETURNED DIFFERENT?<input id="baseReturnNote" class="baseReturn" placeholder="observed difference / no change / unknown"></label><div class="baseButtons" style="margin-top:6px"><button data-base-return="READY">RETURN · READY</button><button data-base-return="SERVICE">RETURN · SERVICE</button><button data-base-return="UNKNOWN">RETURN · UNKNOWN</button></div></div>';
    return '<div class="baseRun"><strong>RETURNED · '+h(run.purpose||'unnamed run')+' · '+h(run.return_state||'UNKNOWN')+'</strong><small>'+h(run.address)+' · '+h(run.return_note||'no discrepancy recorded')+' · '+h((run.returned_at||'').slice(0,16).replace('T',' '))+'</small></div>';
  }

  function wireBase(){
    const q=id=>document.getElementById(id);
    q('basePurpose').oninput=e=>{B.purpose=e.target.value;saveBase()};
    document.querySelectorAll('[data-base-friction]').forEach(b=>b.onclick=()=>{const f=b.dataset.baseFriction;B.frictions=B.frictions.includes(f)?B.frictions.filter(x=>x!==f):[...B.frictions,f];saveBase();renderBase()});
    document.querySelectorAll('[data-base-select]').forEach(c=>c.onchange=()=>{const id=c.dataset.baseSelect;B.selected=c.checked?[...new Set([...B.selected,id])]:B.selected.filter(x=>x!==id);saveBase();renderBase()});
    document.querySelectorAll('[data-base-state]').forEach(b=>b.onclick=()=>{const x=item(b.dataset.baseState);if(!x)return;const i=ITEM_STATES.indexOf(x.state);x.state=ITEM_STATES[(i+1+ITEM_STATES.length)%ITEM_STATES.length];saveBase();renderBase()});
    q('baseAddItem').onclick=()=>{const name=q('baseItemLabel').value.trim();if(!name){push('BASE CAMP · item label required');return}const id='kit-'+Date.now().toString(36);B.items.push({id,label:name,home_address:locus(),state:'UNKNOWN',tags:q('baseItemTags').value.trim(),source:'USER_LOCAL'});saveBase();push('BASE CAMP · local reference added · '+name);renderBase()};
    q('baseSetOut').onclick=setOut;
    q('baseOpenFit').onclick=()=>location.assign('/body/fit/');
    q('baseOpenCare').onclick=()=>{view='CARE';history.replaceState(null,'','#CARE');render()};
    document.querySelectorAll('[data-base-return]').forEach(b=>b.onclick=()=>returnRun(b.dataset.baseReturn));
  }

  function setOut(){
    const chosen=selectedItems();
    const purpose=(B.purpose||'').trim();
    if(!purpose){push('BASE CAMP · purpose required before SET OUT');return}
    if(!chosen.length){push('BASE CAMP · select at least one exact local reference');return}
    const run={schema:'house-base-run/v0.1',id:'run-'+Date.now().toString(36),state:'OUT',set_out_at:new Date().toISOString(),address:locus(),label:label(),purpose,frictions:[...B.frictions],items:chosen.map(x=>({id:x.id,label:x.label,home_address:x.home_address,state_at_set_out:x.state,source:x.source||'USER_LOCAL'}))};
    B.runs=[run,...B.runs].slice(0,12);saveBase();
    const packet={schema:'atlas-dayline-handoff/v0.1',id:'house-base-'+Date.now(),created_at:new Date().toISOString(),kind:'ACTION',source:{route:'/house/#BASE',object_id:run.id,address:run.address,label:run.label,projection:'BASE',truth:'browser-local planning witness; exact item refs are user-authored and do not prove physical possession/readiness/presence'},payload:{contexts:['home','house:'+run.address,'basecamp'],replacePrefix:'house:',sourceRef:'/house/#BASE',provenance:'HOUSE BASE CAMP explicit SET OUT',notes:'PURPOSE '+purpose+' · FRICTION '+(run.frictions.join('/')||'none')+' · KIT '+run.items.map(x=>x.label).join(' / ')},return_to:'/house/#BASE'};
    sessionStorage.setItem(HANDOFF,JSON.stringify(packet));
    sessionStorage.setItem('house.base.run.v01',JSON.stringify(run));
    push('BASE CAMP · SET OUT · '+purpose);
    location.assign('/dayline/?handoff=house-base');
  }

  function returnRun(returnState='UNKNOWN'){
    const run=B.runs.find(x=>x.state==='OUT');if(!run)return;
    const state=['READY','SERVICE','UNKNOWN'].includes(returnState)?returnState:'UNKNOWN';
    const el=document.getElementById('baseReturnNote'),note=(el?.value||'').trim();
    if(!note){push('BASE CAMP · RETURN needs observed difference / no-change / unknown');return}
    run.state='RETURNED';run.returned_at=new Date().toISOString();run.return_note=note;run.return_state=state;
    if(state!=='READY'&&Array.isArray(S?.care)){
      const id='care-'+Date.now().toString(36),watch=state==='UNKNOWN';
      S.care.push({schema:'house-care-episode/v0.1',id,created_at:new Date().toISOString(),updated_at:new Date().toISOString(),address:run.address,label:run.label,kind:'MAINTENANCE',observed:note,action:watch?'Resolve returned-kit uncertainty':'Inspect / service returned BASE CAMP kit',return_condition:'READY or explicit residue',state:watch?'WATCH':'OPEN',receipt:'',source_run:run.id});
      save();
    }
    saveBase();push('BASE CAMP · RETURN · '+state+(state==='READY'?'':' · residue → CARE'));renderBase();
  }

  function selftest(){
    const errors=[];
    if(!FRICTIONS.includes('power')||!FRICTIONS.includes('mobility'))errors.push('friction grammar');
    if(JSON.stringify(ENV0)!==JSON.stringify(['BODY','GARMENT','HARNESS','SUIT','FURNITURE','ROOM','HOUSE']))errors.push('ENV0 ladder');
    if(!ITEM_STATES.includes('UNKNOWN'))errors.push('unknown truth state');
    const fake={id:'i',label:'tool',home_address:'room',state:'READY',source:'USER_LOCAL'};
    if(!fake.id||fake.source!=='USER_LOCAL')errors.push('local identity');
    return {ok:!errors.length,errors,law:'HOUSE=BASE CAMP · ENV-0=HARNESS · LOADOUT=TEMPORARY REFERENCES · RETURN=DISCREPANCY'};
  }

  ensureStyle();
  try{
    if(Array.isArray(V)&&!V.includes('BASE'))V.unshift('BASE');
    const nativeRender=render;
    render=function(){
      nav();
      if(view==='BASE'){
        viewTitle.textContent='BASE CAMP';
        document.getElementById('houseAperture')?.setAttribute('hidden','');
        renderBase();inspect();return;
      }
      return nativeRender();
    };
    if(!location.hash||location.hash==='#')view='BASE';
    window.addEventListener('house:selection',()=>{if(view==='BASE')renderBase()});
    if(typeof render==='function')render();
  }catch(e){console.error('HOUSE BASE CAMP init',e)}

  window.HOUSE_BASE_CAMP=Object.freeze({selftest,state:()=>JSON.parse(JSON.stringify(B)),frictions:[...FRICTIONS],env0:[...ENV0]});
})();
