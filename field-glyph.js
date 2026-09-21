(()=>{'use strict';
const stateColor=s=>({ACTIVE:'#98d49b',STABLE:'#98d49b',PROOF_REQUIRED:'#ed7447',RECOVER:'#ed7447',CANDIDATE:'#d5ad68',PARKED:'#d5ad68',DONOR:'#72bce7',FROZEN_DONOR:'#72bce7',REFERENCE:'#87949a',UTILITY:'#68757b'}[s]||'#87949a');
function outer(kind){
 if(kind==='system'||kind==='hub')return '<path d="M12 2 22 12 12 22 2 12Z"/>';
 if(kind==='workbench')return '<path d="M3 3h18v18H3z"/><path d="M8 3v18M16 3v18" opacity=".45"/>';
 if(kind==='experiment')return '<path d="M3 3h18v18H3z"/><path d="M3 21 21 3" opacity=".55"/>';
 if(kind==='alias')return '<path d="M4 4h9v3H7v10h10v-6h3v9H4z"/>';
 if(kind==='recovery')return '<path d="M5 3h14v4H9v10h10v4H5z"/>';
 return '<path d="M3 3h18v18H3z"/>';
}
function mark(op=''){
 op=String(op).toUpperCase();
 if(/VERIFY|PROVE|TEST/.test(op))return '<path d="m7 7 10 10M17 7 7 17"/>';
 if(/REPRESENT|PROJECT/.test(op))return '<path d="M6 18 18 6M8 6h10v10"/>';
 if(/PLAY/.test(op))return '<path d="m8 6 9 6-9 6Z"/>';
 if(/RECOVER|RETURN/.test(op))return '<path d="M18 8H9v-3l-5 5 5 5v-3h7v5"/>';
 if(/PLAN|ROUTE/.test(op))return '<path d="M5 17 10 7l4 10 5-8"/>';
 if(/ADDRESS|ORIENT|INDEX/.test(op))return '<path d="M12 5v14M5 12h14"/><path d="M9 9h6v6H9z"/>';
 if(/CAPTURE|INGEST/.test(op))return '<path d="M6 5h12v14H6zM9 9h6M9 12h6M9 15h4"/>';
 return '<path d="M9 9h6v6H9z"/>';
}
function svg(r,opt={}){
 const size=opt.size||28,color=stateColor(r?.state),now=opt.now,head=opt.head;
 return '<svg class="fieldGlyph" viewBox="0 0 24 24" width="'+size+'" height="'+size+'" aria-hidden="true" style="color:'+color+'"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter">'+outer(r?.kind)+mark(r?.operation)+(now?'<path d="M2 2h5" stroke="#ed7447" stroke-width="2.5"/>':'')+(head?'<path d="M17 22h5" stroke="#d5ad68" stroke-width="2.5"/>':'')+'</g></svg>';
}
window.FieldGlyph={svg,stateColor};
})();