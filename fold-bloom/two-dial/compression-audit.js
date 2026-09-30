(()=>{'use strict';
const params=new URLSearchParams(location.search);
const mode=String(params.get('compression')||'').toUpperCase();
if(!['TWO','PLAIN'].includes(mode))return;

const $=s=>document.querySelector(s);
const projection=mode==='TWO'?'TWO_DIAL':'PLAIN_PAIR_6X6_RELEASE_COMMIT';
const targets=[
 {L:0,R:0,kind:'SAME',verb:'BLOOM'},
 {L:1,R:2,kind:'NEAR',verb:'FOLD'},
 {L:0,R:2,kind:'FAR',verb:'RETURN'},
 {L:0,R:3,kind:'OPPOSITE',verb:'SPLIT'},
 {L:0,R:0,kind:'SAME',verb:'BLOOM',revisit:true}
];
let taskIndex=0,inputs=0,commits=0,started=performance.now(),plainL=L,plainR=R;
const ratings={clarity:3,reach:3,revisit:3};
const plainPointers=new Map(),plainTouched=[false,false],suppressChange=[false,false];

document.body.dataset.compressionAudit=mode;
try{if(demo&&demo.on)stopDemo(true)}catch(_){}
const intro=$('#intro');if(intro)intro.style.display='none';
run=true;
try{window.FoldBloom&&window.FoldBloom.setPulseLink(false)}catch(_){}

const style=document.createElement('style');
style.textContent=
'#compressionAudit{position:fixed;z-index:60;left:10px;bottom:10px;width:min(440px,calc(100vw - 20px));max-height:min(80vh,740px);overflow:auto;background:#071014f2;border:1px solid #33454e;color:#dce8ec;padding:10px;font:11px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;box-shadow:0 18px 60px #0009}'+
'#compressionAudit h2{margin:0 0 4px;font:800 16px/1.05 system-ui,sans-serif}#compressionAudit .mut{color:#81929a}#compressionAudit .hot{color:#ffd56b}'+
'#compressionAudit .row{display:flex;gap:5px;flex-wrap:wrap;align-items:center;margin-top:8px}#compressionAudit button,#compressionAudit input,#compressionAudit textarea{font:inherit;color:inherit;background:#090d0f;border:1px solid #33454e;border-radius:0;padding:6px 7px}'+
'#compressionAudit button.on{border-color:#ffd56b;color:#ffd56b}#compressionAudit .task{margin-top:8px;padding:7px;border:1px solid #27343a;background:#090d0f}'+
'#compressionAudit .plain{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}#compressionAudit label{display:grid;gap:4px;color:#81929a}#compressionAudit input[type=range]{width:100%}'+
'#compressionAudit .rating{display:flex;gap:2px}#compressionAudit .rating button{width:29px;height:29px;padding:0}#compressionAudit textarea{width:100%;min-height:54px;margin-top:7px}'+
'body[data-compression-audit="PLAIN"] #game,body[data-compression-audit="PLAIN"] .hud,body[data-compression-audit="PLAIN"] .lawstrip,body[data-compression-audit="PLAIN"] .duetLabels,body[data-compression-audit="PLAIN"] .actions,body[data-compression-audit="PLAIN"] .drawer,body[data-compression-audit="PLAIN"] .overlay{display:none!important}'+
'body[data-compression-audit="PLAIN"]{background:#061018}@media(max-width:640px){#compressionAudit{left:6px;bottom:6px;width:calc(100vw - 12px);max-height:72vh}}';
document.head.appendChild(style);
const root=document.createElement('section');root.id='compressionAudit';root.setAttribute('aria-label','Two Dial compression audit');document.body.appendChild(root);

function relInfo(l,r){const verb=relationFromPair(l,r),d=Math.min((r-l+6)%6,(l-r+6)%6);return{kind:d===0?'SAME':d===1?'NEAR':d===3?'OPPOSITE':'FAR',verb}}
function target(){return targets[Math.min(taskIndex,targets.length-1)]}
function switchURL(next){const u=new URL(location.href);u.searchParams.set('compression',next);u.hash='';location.assign(u.toString())}
function applyPlainCommit(){
 L=plainL;R=plainR;rawL=plainL;rawR=plainR;updatePreview();hud();
 if(typeof armCommitUndo==='function')armCommitUndo();
 commit();
 plainTouched[0]=plainTouched[1]=false;
}
function plainStart(e,side){
 if(!plainPointers.size&&typeof beginCommitUndoCandidate==='function')beginCommitUndoCandidate();
 plainPointers.set(e.pointerId,side);plainTouched[side]=true;inputs++;
}
function plainEnd(e,side){
 if(!plainPointers.has(e.pointerId))return;
 plainPointers.delete(e.pointerId);suppressChange[side]=true;
 const shouldCommit=prefs.mode!=='DUET'||plainTouched[0]&&plainTouched[1]||!plainPointers.size;
 if(shouldCommit)applyPlainCommit();
}
function plainCancel(e){
 if(!plainPointers.has(e.pointerId))return;
 plainPointers.delete(e.pointerId);
 if(!plainPointers.size&&typeof discardCommitUndoCandidate==='function')discardCommitUndoCandidate();
 plainL=L;plainR=R;plainTouched[0]=plainTouched[1]=false;syncPlain();
}
function keyboardCommit(side,value){
 if(suppressChange[side]){suppressChange[side]=false;return}
 if(plainPointers.size)return;
 if(typeof beginCommitUndoCandidate==='function')beginCommitUndoCandidate();
 if(side===0)plainL=value;else plainR=value;
 inputs++;applyPlainCommit();
}
function syncPlain(){
 const a=$('#plainL'),b=$('#plainR'),r=$('#plainRelation');
 if(a)a.value=String(plainL);if(b)b.value=String(plainR);
 if(r){const x=relInfo(plainL,plainR);r.textContent=x.kind+' → '+x.verb}
}
function rating(name,label){
 let s='<div class="row"><span class="mut" style="min-width:112px">'+label+'</span><div class="rating" data-rating="'+name+'">';
 for(let i=1;i<=5;i++)s+='<button type="button" class="'+(ratings[name]===i?'on':'')+'" data-v="'+i+'">'+i+'</button>';
 return s+'</div></div>';
}
function render(){
 const t=target(),done=taskIndex>=targets.length;
 let plain='';
 if(mode==='PLAIN')plain='<div class="plain"><label>MATTER / L <b id="plainLV">'+plainL+'</b><input id="plainL" type="range" min="0" max="5" step="1" value="'+plainL+'"></label><label>HARMONY / R <b id="plainRV">'+plainR+'</b><input id="plainR" type="range" min="0" max="5" step="1" value="'+plainR+'"></label></div><div class="row"><span class="mut">RELATION</span><b id="plainRelation"></b><span class="mut">release/change commits · no extra COMMIT control</span></div>';
 root.innerHTML=
 '<div class="mut">FIELD / COAXIALITY / H_COMPRESSION</div><h2>'+projection+'</h2>'+
 '<div class="mut">Same 36 states · same host mapping · same release/change commit schedule · same consequence path · no auto-promotion.</div>'+
 '<div class="row"><button data-mode="TWO" class="'+(mode==='TWO'?'on':'')+'">TWO DIAL</button><button data-mode="PLAIN" class="'+(mode==='PLAIN'?'on':'')+'">PLAIN 6×6</button><button id="auditExit">EXIT TEST</button></div>'+
 '<div class="task">'+(done?'<b class="hot">TASK SET COMPLETE</b>':'<b>TASK '+(taskIndex+1)+'/'+targets.length+'</b> · reach <b>L'+t.L+' × R'+t.R+'</b> · '+t.kind+' → '+t.verb+(t.revisit?' · REVISIT':''))+'<div class="mut">Task advances only when that exact pair is committed.</div></div>'+
 plain+(mode==='TWO'?'<div class="row"><span class="mut">Use existing MATTER × HARMONY dials. Pointer release is the semantic commit boundary.</span></div>':'')+
 '<div class="row"><span class="mut">INPUTS</span><b id="auditInputs">'+inputs+'</b><span class="mut">COMMITS</span><b>'+commits+'</b><span class="mut">DONE</span><b>'+Math.min(taskIndex,targets.length)+'/'+targets.length+'</b></div>'+
 rating('clarity','CLARITY / 1–5')+rating('reach','REACH INTENT / 1–5')+rating('revisit','REVISIT / 1–5')+
 '<textarea id="auditNote" placeholder="Optional observation: confusion, extra explanation, missed states, or why one representation felt simpler."></textarea>'+
 '<div class="row"><button id="copyAudit">COPY H RETURN JSON</button><span class="mut">EVIDENCE_ONLY · no score becomes PASS automatically</span></div>';
 root.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>switchURL(b.dataset.mode));
 $('#auditExit').onclick=()=>{const u=new URL(location.href);u.searchParams.delete('compression');u.hash='';location.assign(u.toString())};
 root.querySelectorAll('[data-rating]').forEach(group=>group.querySelectorAll('button').forEach(btn=>btn.onclick=()=>{ratings[group.dataset.rating]=Number(btn.dataset.v)||3;render()}));
 if(mode==='PLAIN'){
   const bind=(id,side)=>{
    const el=$(id);
    el.onpointerdown=e=>plainStart(e,side);
    el.oninput=e=>{const v=Number(e.target.value)||0;if(side===0)plainL=v;else plainR=v;const vv=$(side===0?'#plainLV':'#plainRV');if(vv)vv.textContent=String(v);syncPlain()};
    el.onpointerup=e=>plainEnd(e,side);
    el.onpointercancel=plainCancel;
    el.onchange=e=>keyboardCommit(side,Number(e.target.value)||0);
   };
   bind('#plainL',0);bind('#plainR',1);syncPlain();
 }
 $('#copyAudit').onclick=async()=>{
   const snap=window.FoldBloom&&window.FoldBloom.state?window.FoldBloom.state():{};
   const packet={
    schema:'fold-bloom-compression-return/v0.1',mechanism:'fold-bloom-two-dial-relation',projection,
    authority:'EVIDENCE_ONLY / NO AUTO_PROMOTION',
    controlled:{pair_states:36,relation_map:'SAME→BLOOM · NEAR→FOLD · FAR→RETURN · OPPOSITE→SPLIT',commit_schedule:'MATCH_HOST_RELEASE_CHANGE_BOUNDARY',consequence_path:'Two Dial commit()',settings:{world:snap.prefs&&snap.prefs.world||null,voice:snap.prefs&&snap.prefs.voice||null,groove:snap.prefs&&snap.prefs.groove||null,scope:snap.prefs&&snap.prefs.scope||null,mode:snap.prefs&&snap.prefs.mode||null},borrowed_clock:false},
    task_sequence:targets,result:{completed:Math.min(taskIndex,targets.length),total:targets.length,inputs,commits,elapsed_ms:Math.round(performance.now()-started)},
    subjective:{clarity:ratings.clarity,reach:ratings.reach,revisit:ratings.revisit,scale:'1..5',status:'USER_OBSERVATION_NOT_CORRECTNESS_PROOF'},
    note:($('#auditNote')&&$('#auditNote').value||'').trim(),final_pair:{L,R,relation:relationFromPair(L,R)},returned_at:new Date().toISOString()
   };
   const txt=JSON.stringify(packet,null,2);
   try{await navigator.clipboard.writeText(txt);$('#copyAudit').textContent='COPIED'}catch(_){prompt('COPY H RETURN JSON',txt)}
 };
}
const unsubscribe=window.FoldBloom&&window.FoldBloom.subscribeEvents?window.FoldBloom.subscribeEvents(e=>{if(!e||e.type!=='commit')return;commits++;const t=target();if(taskIndex<targets.length&&Number(e.L)===t.L&&Number(e.R)===t.R)taskIndex++;render()}):()=>{};
if(mode==='TWO')cv.addEventListener('pointerdown',()=>{inputs++;const el=$('#auditInputs');if(el)el.textContent=String(inputs)},{passive:true});
addEventListener('pagehide',()=>{try{unsubscribe()}catch(_){}},{once:true});
render();
})();\n