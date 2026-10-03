const KEY='field.interphase.visor.seen.v03';
const QUERY=new URLSearchParams(location.search);
const DONOR='/recovery/semantic-painting-v0.8/';
const WAKE=[['WAKE','SOURCE'],['CUT','FRAME'],['HOLD','FOCUS'],['TURN','OPERATE'],['TRACE','WITNESS'],['AGAIN','RETURN']];
let root=null,trigger=null,lastFrame='';
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const seen=()=>{try{return localStorage.getItem(KEY)==='1'}catch(_){return false}};
const remember=()=>{try{localStorage.setItem(KEY,'1')}catch(_){}};
function carrier(){try{return window.FieldIndexCarrier?.current?.()||null}catch(_){return null}}
function nativeControl(id){const x=document.getElementById(id),dock=document.getElementById('runDock');return x&&dock&&!dock.hidden?x:null}
function delegate(id){const x=nativeControl(id);if(!x)return false;x.click();setTimeout(()=>{if(root&&!root.hidden)render()},80);return true}
function css(){
 const s=document.createElement('style');s.id='fieldAwakeVisorStyle';s.textContent=`
#fieldAwakeVisor{position:relative;isolation:isolate;margin:8px 0 0;border:1px solid #3a464b;background:#070a0b;overflow:hidden;box-shadow:0 18px 64px rgba(0,0,0,.3)}
#fieldAwakeVisor[hidden]{display:none}
#fieldAwakeVisor::before{content:"";position:absolute;inset:0;z-index:-2;opacity:.74;background:
 radial-gradient(ellipse at 13% 28%,rgba(213,173,104,.18),transparent 24%),
 radial-gradient(ellipse at 83% 24%,rgba(114,188,231,.11),transparent 24%),
 radial-gradient(ellipse at 70% 79%,rgba(237,116,71,.10),transparent 28%),
 linear-gradient(167deg,transparent 0 35%,rgba(151,167,162,.08) 35% 37%,transparent 37% 58%,rgba(213,173,104,.06) 58% 60%,transparent 60%),
 linear-gradient(118deg,#111315 0%,#090d0f 38%,#101719 69%,#0a0c0d 100%)}
#fieldAwakeVisor::after{content:"";position:absolute;inset:0;z-index:-1;opacity:.26;pointer-events:none;mix-blend-mode:screen;background:repeating-linear-gradient(102deg,rgba(237,240,237,.025) 0 1px,transparent 1px 5px),repeating-linear-gradient(7deg,transparent 0 31px,rgba(213,173,104,.03) 31px 32px)}
.awakeVisorTop{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:7px 9px;border-bottom:1px solid #273237;background:rgba(7,10,11,.76);backdrop-filter:blur(8px)}
.awakeVisorTop span{font-size:7px;letter-spacing:.15em;color:#9ba8ad}.awakeVisorTop b{color:#d5ad68}.awakeVisorTop em{font-style:normal;color:#72bce7}.awakeVisorTop button{min-height:30px;padding:4px 8px;border:0;color:#7d898f;background:transparent;font-size:14px}
.awakeVisorHero{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(220px,.75fr);gap:16px;padding:14px 14px 12px;align-items:end;min-height:158px}
.awakeVisorEy{font-size:7px;letter-spacing:.19em;color:#d5ad68}.awakeVisorHero h2{max-width:760px;margin:5px 0 6px;font:850 clamp(26px,4.2vw,48px)/.92 system-ui,sans-serif;letter-spacing:-.06em}.awakeVisorHero p{max-width:68ch;margin:0;color:#9aa6aa;font:9px/1.5 system-ui,sans-serif}
.awakeObject{align-self:stretch;border-left:1px solid #334147;padding:4px 0 4px 13px;display:flex;flex-direction:column;justify-content:flex-end;min-width:0}.awakeObject span{font-size:6px;letter-spacing:.14em;color:#72bce7}.awakeObject strong{margin-top:5px;font:750 16px/1.05 system-ui,sans-serif;letter-spacing:-.03em;overflow-wrap:anywhere}.awakeObject code{margin-top:5px;color:#89969b;font-size:7px;overflow-wrap:anywhere}.awakeObject small{margin-top:5px;color:#d5ad68;font-size:6px;letter-spacing:.08em}
.awakeRail{display:grid;grid-template-columns:repeat(6,1fr);border-top:1px solid #273237;border-bottom:1px solid #273237;background:rgba(6,9,10,.78)}.awakeStep{position:relative;min-width:0;padding:7px 8px;border-right:1px solid #273237}.awakeStep:last-child{border-right:0}.awakeStep b{display:block;font-size:8px;letter-spacing:.12em}.awakeStep small{display:block;margin-top:2px;color:#d5ad68;font-size:6px;letter-spacing:.09em}.awakeStep::after{content:"";position:absolute;left:8px;bottom:0;width:23%;height:2px;background:#46555b}.awakeStep:nth-child(1)::after,.awakeStep:nth-child(4)::after{background:#ed7447}.awakeStep:nth-child(3)::after,.awakeStep:nth-child(6)::after{background:#72bce7}
.awakeOps{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,.8fr);gap:1px;background:#263137}.awakePanel{min-width:0;background:rgba(7,10,11,.95);padding:10px 11px}.awakePanel label{display:block;color:#7d898f;font-size:6px;letter-spacing:.14em;margin-bottom:6px}.awakeFocus{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:start}.awakeFocus strong{display:block;font:720 12px/1.25 system-ui,sans-serif}.awakeFocus small{display:block;margin-top:4px;color:#89969b;font-size:7px;line-height:1.4;overflow-wrap:anywhere}
.awakeMoves{display:flex;gap:4px;flex-wrap:wrap;margin-top:7px}.awakeMove{border:1px solid #344248;color:#9eaaae;padding:5px 7px;font-size:7px;letter-spacing:.055em}.awakeMove:first-child{border-color:#52636b;color:#d3dcdf}.awakeNone{color:#66747a;font-size:7px}
.awakeCommands{display:grid;grid-template-columns:minmax(0,1fr) 76px 76px;gap:4px}.awakeCommands button,.awakeCommands a{min-height:42px;padding:7px 8px;border:1px solid #354249;background:#090d0f;color:#c9d2d5;font:800 8px/1.15 system-ui,sans-serif;text-decoration:none;display:grid;place-items:center;text-align:center}.awakeCommands .turn{border-color:#ed7447;color:#ffd0bd}.awakeCommands .trace{border-color:#52636b}.awakeCommands .again{border-color:#72bce7;color:#bfe7ff}.awakeCommands [disabled]{opacity:.38;cursor:not-allowed}.awakeCommandRead{display:grid;gap:4px;margin-top:7px;padding-top:7px;border-top:1px solid #273237;color:#89969b;font-size:7px;line-height:1.35}.awakeCommandRead b{color:#d5ad68;font-weight:700}.awakeCommandRead span{overflow-wrap:anywhere}
.awakeVisorFoot{display:flex;justify-content:space-between;gap:14px;align-items:center;padding:8px 10px;border-top:1px solid #273237;background:rgba(7,10,11,.79)}.awakeVisorFoot span{color:#9ba6aa;font:8px/1.42 system-ui,sans-serif}.awakeVisorFoot .law{color:#d5ad68}.awakeVisorFoot button{min-height:34px;padding:6px 10px;border:1px solid #48565c;color:#b8c3c7;background:#0b0f11;font-size:7px;letter-spacing:.1em}.fieldAwakeTrigger{margin-left:auto;min-height:34px;padding:6px 9px;border-color:#4b5960;color:#d5ad68;font-size:7px;letter-spacing:.1em}
@media(max-width:760px){#fieldAwakeVisor{margin-top:6px}.awakeVisorTop{padding:7px 8px}.awakeVisorTop span{font-size:8px}.awakeVisorHero{grid-template-columns:1fr;gap:9px;min-height:0;padding:12px 10px}.awakeVisorEy{font-size:9px}.awakeVisorHero h2{font-size:31px}.awakeVisorHero p{font-size:11px;line-height:1.4}.awakeObject{border-left:0;border-top:1px solid #334147;padding:8px 0 0}.awakeObject span{font-size:8px}.awakeObject strong{font-size:16px}.awakeObject code,.awakeObject small{font-size:8px}.awakeRail{grid-template-columns:repeat(6,1fr)}.awakeStep{padding:7px 4px}.awakeStep b{font-size:8px}.awakeStep small{font-size:6px}.awakeStep::after{left:4px}.awakeOps{grid-template-columns:1fr}.awakePanel{padding:10px}.awakePanel label{font-size:8px}.awakeFocus strong{font-size:13px}.awakeFocus small,.awakeMove,.awakeNone,.awakeCommandRead{font-size:9px}.awakeMove{padding:6px 7px}.awakeCommands{grid-template-columns:minmax(0,1fr) 68px 68px}.awakeCommands button,.awakeCommands a{min-height:44px;font-size:9px}.awakeVisorFoot{align-items:flex-start}.awakeVisorFoot span{font-size:9px}.awakeVisorFoot button{min-height:38px;font-size:8px}.fieldAwakeTrigger{min-height:40px;font-size:9px}}
@media(max-width:420px){.awakeRail{grid-template-columns:repeat(3,1fr)}.awakeVisorHero h2{font-size:29px}.awakeCommands{grid-template-columns:1fr 62px 62px}}
@media(prefers-reduced-motion:reduce){#fieldAwakeVisor *{scroll-behavior:auto!important}}
`;
 document.head.appendChild(s)
}
function markup(){
 const el=document.createElement('section');el.id='fieldAwakeVisor';el.hidden=true;el.setAttribute('aria-label','FIELD AWAKE INTERPHASE visor');
 el.innerHTML=`<div class="awakeVisorTop"><span><b>YOU’RE AWAKE</b> // FIELD // <em>INTERPHASE</em></span><button type="button" data-awake-close aria-label="Close visor">×</button></div>
 <div class="awakeVisorHero"><div><div class="awakeVisorEy">ONE APP · ONE HELD OBJECT · NATIVE AUTHORITY</div><h2>Hold one thing. Act here. Watch what changes. Return.</h2><p>AWAKE is the attentional grammar. INTERPHASE preserves continuity. FIELD is the operating surface. Native hosts still own meaning and effects.</p></div><div class="awakeObject"><span>HELD NOW</span><strong data-awake-title>waiting for FIELD…</strong><code data-awake-route>—</code><small data-awake-owner>authority remains native</small></div></div>
 <div class="awakeRail">${WAKE.map(([a,b])=>`<div class="awakeStep"><b>${a}</b><small>${b}</small></div>`).join('')}</div>
 <div class="awakeOps"><section class="awakePanel"><label>OBJECT / FOCUS / NEXT ≤3</label><div class="awakeFocus"><div><strong data-awake-focus>—</strong><small data-awake-frame>same object · projection may change</small></div><small data-awake-frame-id>—</small></div><div class="awakeMoves" data-awake-moves><span class="awakeNone">waiting for lawful moves…</span></div></section><section class="awakePanel"><label>OPERATE / WITNESS / RETURN</label><div class="awakeCommands"><button class="turn" type="button" data-awake-turn disabled>TURN</button><button class="trace" type="button" data-awake-trace disabled>TRACE</button><button class="again" type="button" data-awake-return disabled>RETURN</button></div><div class="awakeCommandRead"><span data-awake-witness><b>WITNESS</b> —</span><span data-awake-forecast><b>FORECAST</b> —</span><span data-awake-return-read><b>RETURN</b> —</span></div></section></div>
 <div class="awakeVisorFoot"><span><span class="law">WAKE → CUT → HOLD → TURN → TRACE → AGAIN.</span> Same FIELD controls; no visor dispatch authority.</span><button type="button" data-awake-enter>CONTINUE FIELD</button></div>`;
 return el
}
function render(){
 if(!root)return false;const c=carrier();if(!c)return false;
 const q=s=>root.querySelector(s),moves=Array.isArray(c.next)?c.next.slice(0,3):[],turnNative=nativeControl('runDockTurn'),traceNative=nativeControl('runDockTrace'),returnNative=nativeControl('runDockReturn');
 q('[data-awake-title]').textContent=c.object?.label||c.object?.id||'FIELD object';
 q('[data-awake-route]').textContent=[c.object?.address,c.projection?.name].filter(Boolean).join(' · ');
 q('[data-awake-owner]').textContent=(c.object?.owner||c.meta?.nativeOwner||'NATIVE HOST')+' · authority remains native';
 q('[data-awake-focus]').textContent=c.focus?.label||c.focus?.id||'—';
 q('[data-awake-frame]').textContent=[c.object?.id,c.focus?.aperture,c.projection?.host].filter(Boolean).join(' · ');
 q('[data-awake-frame-id]').textContent=c.frameId||'—';
 q('[data-awake-moves]').innerHTML=moves.length?moves.map((m,i)=>`<span class="awakeMove" data-move-index="${i}">${esc(m.action||'TURN')} · ${esc(m.label||m.id)}</span>`).join(''):'<span class="awakeNone">no cross-host move required</span>';
 const turn=q('[data-awake-turn]'),trace=q('[data-awake-trace]'),ret=q('[data-awake-return]');
 turn.disabled=!turnNative;trace.disabled=!traceNative;ret.disabled=!returnNative;
 turn.textContent=turnNative?(turnNative.textContent||moves[0]?.label||'TURN').trim():'TURN';
 trace.textContent='TRACE';ret.textContent='RETURN';
 q('[data-awake-witness]').innerHTML='<b>WITNESS</b> '+esc([c.witness?.class,c.witness?.summary].filter(Boolean).join(' · ')||'UNPROVED');
 q('[data-awake-forecast]').innerHTML='<b>FORECAST</b> '+esc(document.getElementById('runDockForecast')?.textContent?.replace(/^FORECAST\s*/i,'')||moves[0]?.authority||'—');
 q('[data-awake-return-read]').innerHTML='<b>RETURN</b> '+esc(c.return?.address||'/');
 lastFrame=c.frameId||'';root.dataset.frameId=lastFrame;root.dataset.nativeTurn=turnNative?'ready':'unavailable';return true
}
function show({force=false}={}){
 if(!root)return false;if(QUERY.get('visor')==='0'&&!force)return false;
 if(!force&&QUERY.get('visor')!=='1'&&seen())return false;
 if(!render())return false;root.hidden=false;document.documentElement.dataset.fieldAwakeVisor='open';return true
}
function hide({rememberSeen=true}={}){if(!root)return;if(rememberSeen)remember();root.hidden=true;document.documentElement.dataset.fieldAwakeVisor='closed'}
function enter(){hide();document.getElementById('aperture')?.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'})}
function mount(){
 if(document.getElementById('fieldAwakeVisor'))return;
 css();root=markup();const header=document.querySelector('main>header');if(!header)return;
 header.after(root);trigger=document.createElement('button');trigger.type='button';trigger.className='fieldAwakeTrigger';trigger.textContent='WAKE / VISOR';trigger.title='Open the AWAKE / INTERPHASE projection of the current FIELD object';header.appendChild(trigger);
 root.querySelector('[data-awake-close]').onclick=()=>hide();root.querySelector('[data-awake-enter]').onclick=enter;root.querySelector('[data-awake-turn]').onclick=()=>delegate('runDockTurn');root.querySelector('[data-awake-trace]').onclick=()=>delegate('runDockTrace');root.querySelector('[data-awake-return]').onclick=()=>delegate('runDockReturn');trigger.onclick=()=>show({force:true});
 window.addEventListener('field-index:state',()=>{if(root&&!root.hidden)render()});
 document.documentElement.dataset.fieldAwakeVisor='mounted';
 const autoSuppressed=QUERY.get('visor')==='0'||(QUERY.get('visor')!=='1'&&seen());
 if(autoSuppressed){document.documentElement.dataset.fieldAwakeVisor='ready';return}
 let tries=0;const boot=()=>{if(show({force:QUERY.get('visor')==='1'}))return;if(++tries<80)setTimeout(boot,75);else document.documentElement.dataset.fieldAwakeVisor='ready'};boot()
}
window.FieldAwakeVisor=Object.freeze({show:()=>show({force:true}),hide:()=>hide({rememberSeen:false}),render,state:()=>({open:!!root&&!root.hidden,frameId:lastFrame,donor:DONOR,authority:'DELEGATES_HOST_NATIVE_ONLY'})});
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',mount,{once:true}):mount();
