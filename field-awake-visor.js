const KEY='field.interphase.visor.seen.v02';
const QUERY=new URLSearchParams(location.search);
const DONOR='/recovery/semantic-painting-v0.8/';
const WAKE=[['WAKE','SOURCE'],['CUT','FRAME'],['HOLD','FOCUS'],['TURN','OPERATE'],['TRACE','WITNESS'],['AGAIN','RETURN']];
let root=null,trigger=null,lastFrame='';
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const seen=()=>{try{return localStorage.getItem(KEY)==='1'}catch(_){return false}};
const remember=()=>{try{localStorage.setItem(KEY,'1')}catch(_){}};
function carrier(){try{return window.FieldIndexCarrier?.current?.()||null}catch(_){return null}}
function css(){
 const s=document.createElement('style');s.id='fieldAwakeVisorStyle';s.textContent=`
#fieldAwakeVisor{position:relative;isolation:isolate;margin:9px 0 0;border:1px solid #3b464b;background:#080b0d;overflow:hidden;box-shadow:0 22px 80px rgba(0,0,0,.28)}
#fieldAwakeVisor[hidden]{display:none}
#fieldAwakeVisor::before{content:"";position:absolute;inset:0;z-index:-2;background:
 radial-gradient(ellipse at 16% 22%,rgba(213,173,104,.17),transparent 28%),
 radial-gradient(ellipse at 78% 18%,rgba(114,188,231,.12),transparent 27%),
 radial-gradient(ellipse at 72% 76%,rgba(237,116,71,.11),transparent 30%),
 linear-gradient(118deg,#111315 0%,#090d0f 38%,#101719 69%,#0a0c0d 100%)}
#fieldAwakeVisor::after{content:"";position:absolute;inset:0;z-index:-1;opacity:.32;pointer-events:none;background:
 repeating-linear-gradient(102deg,rgba(237,240,237,.025) 0 1px,transparent 1px 5px),
 repeating-linear-gradient(7deg,transparent 0 31px,rgba(213,173,104,.035) 31px 32px)}
.awakeVisorTop{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:7px 9px;border-bottom:1px solid #273237;background:rgba(7,10,11,.72);backdrop-filter:blur(8px)}
.awakeVisorTop span{font-size:7px;letter-spacing:.16em;color:#9ba8ad}.awakeVisorTop b{color:#d5ad68}.awakeVisorTop button{min-height:30px;padding:4px 8px;border:0;color:#7d898f;background:transparent;font-size:14px}
.awakeVisorHero{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(240px,.8fr);gap:18px;padding:20px 18px 18px;align-items:end;min-height:215px}
.awakeVisorEy{font-size:7px;letter-spacing:.2em;color:#d5ad68}.awakeVisorHero h2{max-width:760px;margin:7px 0 8px;font:850 clamp(28px,5vw,58px)/.91 system-ui,sans-serif;letter-spacing:-.065em}.awakeVisorHero p{max-width:72ch;margin:0;color:#9aa6aa;font:10px/1.55 system-ui,sans-serif}
.awakeObject{align-self:stretch;border-left:1px solid #334147;padding:4px 0 4px 14px;display:flex;flex-direction:column;justify-content:flex-end;min-width:0}.awakeObject span{font-size:6px;letter-spacing:.14em;color:#72bce7}.awakeObject strong{margin-top:6px;font:750 18px/1.05 system-ui,sans-serif;letter-spacing:-.035em;overflow-wrap:anywhere}.awakeObject code{margin-top:6px;color:#89969b;font-size:7px;overflow-wrap:anywhere}.awakeObject small{margin-top:6px;color:#d5ad68;font-size:6px;letter-spacing:.08em}
.awakeRail{display:grid;grid-template-columns:repeat(6,1fr);border-top:1px solid #273237;border-bottom:1px solid #273237;background:rgba(6,9,10,.72)}
.awakeStep{position:relative;min-width:0;padding:8px 9px;border-right:1px solid #273237}.awakeStep:last-child{border-right:0}.awakeStep b{display:block;font-size:8px;letter-spacing:.13em}.awakeStep small{display:block;margin-top:2px;color:#d5ad68;font-size:6px;letter-spacing:.1em}.awakeStep::after{content:"";position:absolute;left:9px;bottom:0;width:24%;height:2px;background:#46555b}.awakeStep:nth-child(1)::after,.awakeStep:nth-child(4)::after{background:#ed7447}.awakeStep:nth-child(3)::after,.awakeStep:nth-child(6)::after{background:#72bce7}
.awakeLive{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr) minmax(0,1fr);gap:1px;background:#263137}.awakeLive>section{min-width:0;background:rgba(7,10,11,.94);padding:11px 12px}.awakeLive label{display:block;color:#7d898f;font-size:6px;letter-spacing:.14em;margin-bottom:6px}.awakeLive strong{display:block;font:720 12px/1.25 system-ui,sans-serif}.awakeLive small{display:block;margin-top:5px;color:#89969b;font-size:7px;line-height:1.42;overflow-wrap:anywhere}
.awakeMoves{display:flex;gap:4px;flex-wrap:wrap}.awakeMove{border:1px solid #344248;color:#c5d0d4;padding:6px 8px;font-size:7px;letter-spacing:.06em}.awakeMove:first-child{border-color:#ed7447;color:#ffd0bd}.awakeNone{color:#66747a;font-size:7px}
.awakeVisorFoot{display:flex;justify-content:space-between;gap:14px;align-items:center;padding:9px 10px;border-top:1px solid #273237;background:rgba(7,10,11,.76)}.awakeVisorFoot span{color:#9ba6aa;font:8px/1.45 system-ui,sans-serif}.awakeVisorFoot .law{color:#d5ad68}.awakeVisorFoot button{min-height:42px;padding:8px 14px;border-color:#d5ad68;color:#eadfca;background:#0b0f11;font-size:8px;letter-spacing:.12em}
.fieldAwakeTrigger{margin-left:auto;min-height:34px;padding:6px 9px;border-color:#4b5960;color:#d5ad68;font-size:7px;letter-spacing:.1em}
@media(max-width:760px){#fieldAwakeVisor{margin-top:7px}.awakeVisorTop{padding:7px 8px}.awakeVisorTop span{font-size:9px}.awakeVisorHero{grid-template-columns:1fr;gap:12px;min-height:0;padding:16px 12px}.awakeVisorEy{font-size:10px}.awakeVisorHero h2{font-size:34px}.awakeVisorHero p{font-size:12px;line-height:1.45}.awakeObject{border-left:0;border-top:1px solid #334147;padding:10px 0 0}.awakeObject span{font-size:9px}.awakeObject strong{font-size:18px}.awakeObject code,.awakeObject small{font-size:9px}.awakeRail{grid-template-columns:repeat(3,1fr)}.awakeStep{padding:9px}.awakeStep b{font-size:10px}.awakeStep small{font-size:8px}.awakeLive{grid-template-columns:1fr}.awakeLive>section{padding:11px}.awakeLive label{font-size:9px}.awakeLive strong{font-size:14px}.awakeLive small,.awakeMove,.awakeNone{font-size:10px}.awakeMove{padding:7px 9px}.awakeVisorFoot{align-items:flex-start;flex-direction:column}.awakeVisorFoot span{font-size:10px}.awakeVisorFoot button{width:100%;min-height:46px;font-size:10px}.fieldAwakeTrigger{min-height:40px;font-size:9px}}
@media(prefers-reduced-motion:reduce){#fieldAwakeVisor *{scroll-behavior:auto!important}}
`;
 document.head.appendChild(s)
}
function markup(){
 const el=document.createElement('section');el.id='fieldAwakeVisor';el.hidden=true;el.setAttribute('aria-label','FIELD AWAKE INTERPHASE visor');
 el.innerHTML=`<div class="awakeVisorTop"><span><b>YOU’RE AWAKE</b> // FORWARD FIELD // INTERPHASE</span><button type="button" data-awake-close aria-label="Close visor">×</button></div>
 <div class="awakeVisorHero"><div><div class="awakeVisorEy">ONE APP · ONE HELD OBJECT</div><h2>Hold one thing. Turn once. Watch what changes. Return.</h2><p>FIELD is the operating surface. INTERPHASE keeps the object continuous across unequal readings. Native hosts keep meaning and effect authority.</p></div><div class="awakeObject"><span>HELD NOW</span><strong data-awake-title>waiting for FIELD…</strong><code data-awake-route>—</code><small data-awake-owner>authority remains native</small></div></div>
 <div class="awakeRail">${WAKE.map(([a,b])=>`<div class="awakeStep"><b>${a}</b><small>${b}</small></div>`).join('')}</div>
 <div class="awakeLive"><section><label>OBJECT / FOCUS</label><strong data-awake-focus>—</strong><small data-awake-frame>same object · projection may change</small></section><section><label>NEXT ≤3</label><div class="awakeMoves" data-awake-moves><span class="awakeNone">waiting for lawful moves…</span></div></section><section><label>WITNESS / RETURN</label><strong data-awake-witness>—</strong><small data-awake-return>RETURN remains explicit.</small></section></div>
 <div class="awakeVisorFoot"><span><span class="law">WAKE → CUT → HOLD → TURN → TRACE → AGAIN.</span> AWAKE is attentional grammar, not a second app.</span><button type="button" data-awake-enter>ENTER FIELD</button></div>`;
 return el
}
function render(){
 if(!root)return false;const c=carrier();if(!c)return false;
 const q=s=>root.querySelector(s),moves=Array.isArray(c.next)?c.next.slice(0,3):[];
 q('[data-awake-title]').textContent=c.object?.label||c.object?.id||'FIELD object';
 q('[data-awake-route]').textContent=[c.object?.address,c.projection?.name,c.frameId].filter(Boolean).join(' · ');
 q('[data-awake-owner]').textContent=(c.object?.owner||c.meta?.nativeOwner||'NATIVE HOST')+' · authority remains native';
 q('[data-awake-focus]').textContent=c.focus?.label||c.focus?.id||'—';
 q('[data-awake-frame]').textContent=[c.object?.id,c.focus?.aperture,c.projection?.host].filter(Boolean).join(' · ');
 q('[data-awake-moves]').innerHTML=moves.length?moves.map(m=>`<span class="awakeMove">${esc(m.label||m.id)}</span>`).join(''):'<span class="awakeNone">no cross-host move required</span>';
 q('[data-awake-witness]').textContent=[c.witness?.class,c.witness?.summary].filter(Boolean).join(' · ')||'UNPROVED';
 q('[data-awake-return]').textContent='RETURN → '+(c.return?.address||'/');
 lastFrame=c.frameId||'';root.dataset.frameId=lastFrame;return true
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
 header.after(root);trigger=document.createElement('button');trigger.type='button';trigger.className='fieldAwakeTrigger';trigger.textContent='WAKE / VISOR';trigger.title='Reopen the AWAKE / INTERPHASE first-contact projection';header.appendChild(trigger);
 root.querySelector('[data-awake-close]').onclick=()=>hide();root.querySelector('[data-awake-enter]').onclick=enter;trigger.onclick=()=>show({force:true});
 window.addEventListener('field-index:state',()=>{if(root&&!root.hidden)render()});
 document.documentElement.dataset.fieldAwakeVisor='mounted';
 const autoSuppressed=QUERY.get('visor')==='0'||(QUERY.get('visor')!=='1'&&seen());
 if(autoSuppressed){document.documentElement.dataset.fieldAwakeVisor='ready';return}
 let tries=0;const boot=()=>{if(show({force:QUERY.get('visor')==='1'}))return;if(++tries<80)setTimeout(boot,75);else document.documentElement.dataset.fieldAwakeVisor='ready'};boot()
}
window.FieldAwakeVisor=Object.freeze({show:()=>show({force:true}),hide:()=>hide({rememberSeen:false}),render,state:()=>({open:!!root&&!root.hidden,frameId:lastFrame,donor:DONOR})});
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',mount,{once:true}):mount();
