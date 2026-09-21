(()=>{'use strict';
const stateColor=s=>({ACTIVE:'#98d49b',STABLE:'#98d49b',CORE_ACTIVE:'#98d49b',ACTIVE_NOW:'#ed7447',ACTIVE_MAINTENANCE:'#72bce7',PROOF_REQUIRED:'#ed7447',RECOVER:'#ed7447',CANDIDATE:'#d5ad68',PARKED:'#d5ad68',DONOR:'#72bce7',FROZEN_DONOR:'#72bce7',REFERENCE:'#87949a',UTILITY:'#68757b'}[s]||(/ACTIVE/.test(String(s))?'#98d49b':'#87949a'));
const kindKey=k=>({root:'田',system:'器',hub:'中',workbench:'工',experiment:'試',artifact:'物',rendezvous:'合',alias:'門',recovery:'復',documentation:'文',control:'令',evidence:'證',validator:'驗'}[k]||'□');
const opKey=op=>{op=String(op||'').toUpperCase();if(/VERIFY|PROVE|TEST/.test(op))return'驗';if(/REPRESENT|PROJECT/.test(op))return'映';if(/PLAY/.test(op))return'戲';if(/RECOVER/.test(op))return'復';if(/RETURN/.test(op))return'回';if(/PLAN|ROUTE|MOVE/.test(op))return'行';if(/ADDRESS|ORIENT|INDEX/.test(op))return'位';if(/CAPTURE|INGEST/.test(op))return'收';if(/TRANSFORM|COMPOSE/.test(op))return'化';if(/READ|INTERPRET/.test(op))return'讀';return'·'};
function frame(kind){
 if(kind==='system'||kind==='hub'||kind==='root')return '<path d="M12 2 22 12 12 22 2 12Z"/>';
 if(kind==='workbench')return '<path d="M3 3h18v18H3z"/><path d="M8 3v18M16 3v18" opacity=".36"/>';
 if(kind==='experiment')return '<path d="M3 3h18v18H3z"/><path d="M3 21 21 3" opacity=".5"/>';
 if(kind==='alias')return '<path d="M4 4h9v3H7v10h10v-6h3v9H4z"/>';
 if(kind==='recovery')return '<path d="M5 3h14v4H9v10h10v4H5z"/>';
 if(kind==='artifact')return '<path d="M5 5h14v14H5z"/><path d="M8 8h8v8H8z" opacity=".45"/>';
 return '<path d="M3 3h18v18H3z"/>';
}
function operation(op=''){
 op=String(op).toUpperCase();
 if(/VERIFY|PROVE|TEST/.test(op))return '<path d="m7 7 10 10M17 7 7 17"/>';
 if(/REPRESENT|PROJECT/.test(op))return '<path d="M6 18 18 6M8 6h10v10"/>';
 if(/PLAY/.test(op))return '<path d="m8 6 9 6-9 6Z"/>';
 if(/RECOVER/.test(op))return '<path d="M18 8H9v-3l-5 5 5 5v-3h7v5"/><path d="M8 18h8"/>';
 if(/RETURN/.test(op))return '<path d="M18 8H9v-3l-5 5 5 5v-3h7v5"/>';
 if(/PLAN|ROUTE|MOVE/.test(op))return '<path d="M5 17 10 7l4 10 5-8"/>';
 if(/ADDRESS|ORIENT|INDEX/.test(op))return '<path d="M12 5v14M5 12h14"/><path d="M9 9h6v6H9z"/>';
 if(/CAPTURE|INGEST/.test(op))return '<path d="M6 5h12v14H6zM9 9h6M9 12h6M9 15h4"/>';
 if(/TRANSFORM|COMPOSE/.test(op))return '<path d="M6 8h12M8 5 5 8l3 3M16 13h-8M16 10l3 3-3 3"/>';
 if(/READ|INTERPRET/.test(op))return '<path d="M6 6h12M6 10h8M6 14h12M6 18h7"/>';
 return '<path d="M9 9h6v6H9z"/>';
}
function attentionMarks(opt={}){
 return (opt.now?'<path d="M2 2h6" stroke="#ed7447" stroke-width="2.6"/>':'')+
        (opt.head?'<path d="M16 22h6" stroke="#d5ad68" stroke-width="2.6"/>':'')+
        (opt.issue?'<path d="M22 2v6" stroke="#cc8792" stroke-width="2.6"/>':'');
}
function parts(r,opt={}){return{kind:r?.kind||'route',kind_key:kindKey(r?.kind),operation:r?.operation||'',operation_key:opKey(r?.operation),state:r?.state||'',color:stateColor(r?.state),now:!!opt.now,head:!!opt.head,issue:!!opt.issue}}
function svg(r,opt={}){
 const p=parts(r,opt),size=opt.size||28,label=[p.kind_key,p.operation_key,p.state,opt.now?'NOW':'',opt.head?'HEAD':''].filter(Boolean).join(' · ');
 return '<svg class="fieldGlyph" viewBox="0 0 24 24" width="'+size+'" height="'+size+'" aria-label="'+label+'" role="img" style="color:'+p.color+'"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter">'+frame(p.kind)+operation(p.operation)+attentionMarks(opt)+'</g></svg>';
}
function mnemonic(r){const p=parts(r);return p.kind_key+p.operation_key}
window.FieldGlyph={svg,parts,mnemonic,stateColor,kindKey,opKey};
})();