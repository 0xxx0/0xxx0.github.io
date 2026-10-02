(()=>{'use strict';
/* FieldGlyph — the mark on every addressed route.
 *
 * v2, 2026-10-02. The operator looked at the field and said he would "rather have other
 * symbols icons in field index". The original mark was a 24x24 outline square with a faint
 * path inside: at the 20-27px it is actually drawn, all fourteen route kinds read as the
 * same box and the operation was a scribble you had to decode. The vocabulary was already
 * right -- it could not be SEEN.
 *
 * First attempt put a bold CJK operation key at the centre. Reviewed against a rendered
 * contact sheet it failed at the size it actually ships: dense glyphs (驗, 映) mush at 20px,
 * five kind silhouettes were still square variants, and kind 'route' fell through to a tofu
 * box. So this revision is SIZE-AWARE, which is the progressive-enhancement rule the house
 * already follows:
 *
 *   size <  26  ->  one bold geometric operation mark. Simple strokes, no text.
 *   size >= 26  ->  the CJK operation key becomes the subject, the mark recedes behind it.
 *
 * Composition:
 *   1. the OPERATION mark / key -- "what does this do" is the question a mark answers first.
 *   2. the KIND as its own silhouette. Fourteen kinds, fourteen shapes.
 *   3. STATE as a slim solid bar on the bottom edge. State used to be encoded only as stroke
 *      colour, which needed colour vision AND a legend; it is now also a position.
 *   4. attention ticks (now / head / issue) unchanged -- top-left / bottom-right / top-right.
 *
 * Stroke work stays hard-edged (square caps, mitre joins) to match the surface. No new
 * colour enters the palette: stateColor() is unchanged. The public API -- svg, parts,
 * mnemonic, stateColor, kindKey, opKey -- is unchanged, so lib/interphase-field.js and
 * tools/interphase-glyph-conformance.test.mjs need no edits.
 */
const stateColor=s=>({ACTIVE:'#98d49b',STABLE:'#98d49b',CORE_ACTIVE:'#98d49b',ACTIVE_NOW:'#ed7447',ACTIVE_MAINTENANCE:'#72bce7',PROOF_REQUIRED:'#ed7447',RECOVER:'#ed7447',CANDIDATE:'#d5ad68',PARKED:'#d5ad68',DONOR:'#72bce7',FROZEN_DONOR:'#72bce7',REFERENCE:'#87949a',UTILITY:'#68757b'}[s]||(/ACTIVE/.test(String(s))?'#98d49b':'#87949a'));
/* 'route' is the default kind in parts(); it used to fall through to a tofu box (□). */
const kindKey=k=>({root:'田',system:'器',hub:'中',workbench:'工',experiment:'試',artifact:'物',rendezvous:'合',alias:'門',recovery:'復',documentation:'文',control:'令',evidence:'證',validator:'驗',route:'路'}[k]||'路');
const opKey=op=>{op=String(op||'').toUpperCase();if(/VERIFY|PROVE|TEST/.test(op))return'驗';if(/REPRESENT|PROJECT/.test(op))return'映';if(/PLAY/.test(op))return'戲';if(/RECOVER/.test(op))return'復';if(/RETURN/.test(op))return'回';if(/PLAN|ROUTE|MOVE/.test(op))return'行';if(/ADDRESS|ORIENT|INDEX/.test(op))return'位';if(/CAPTURE|INGEST/.test(op))return'收';if(/TRANSFORM|COMPOSE/.test(op))return'化';if(/READ|INTERPRET/.test(op))return'讀';return'·'};

/* One silhouette per kind. Eight of the fourteen used to be square variants. The square
 * family is now split by interior -- workbench a rail, artifact a nested square,
 * documentation a folded page, evidence a ruled slip, validator a check -- and 'route' is
 * not boxed at all: it is a path with an arrowhead, because a route IS a movement. */
function frame(kind){
 switch(String(kind||'')){
  case 'root':         return '<path d="M12 2 21 7v10l-9 5-9-5V7z"/>';                        // hexagon
  case 'system':       return '<path d="M12 2 22 12 12 22 2 12Z"/>';                          // diamond
  case 'hub':          return '<circle cx="12" cy="12" r="9.2"/>';                            // circle
  case 'workbench':    return '<path d="M3 5h18v14H3z"/><path d="M3 9h18" opacity=".55"/>';   // bench + rail
  case 'experiment':   return '<path d="M12 3 21 20H3z"/>';                                   // triangle
  case 'artifact':     return '<path d="M4 4h16v16H4z"/><path d="M9 9h6v6H9z" opacity=".6"/>';// nested square
  case 'rendezvous':   return '<circle cx="9" cy="12" r="6"/><circle cx="15" cy="12" r="6"/>';// two rings
  case 'alias':        return '<path d="M3 4h7v16H3z"/><path d="M12 12h9M17 8l4 4-4 4"/>';    // door + pointer
  case 'recovery':     return '<path d="M4 3h16v18H4z"/><path d="M15 8H8v-3l-4 4 4 4v-3h7"/>';
  case 'documentation':return '<path d="M5 3h9l5 5v13H5z"/><path d="M14 3v5h5"/>';            // folded page
  case 'control':      return '<path d="M8 3h8l5 5v8l-5 5H8l-5-5V8z"/>';                      // octagon
  case 'evidence':     return '<path d="M4 3h16v18H4z"/><path d="M8 11h8M8 15h5"/>';          // ruled slip
  case 'validator':    return '<path d="M4 3h16v18H4z"/><path d="m8 12 3 3 5-6"/>';           // container + check
  case 'route':        return '<path d="M3 18 9 7l4 8 4-5"/><path d="M14 10h6M17 7l3 3-3 3"/>'; // path + head
  default:             return '<path d="M4 4h16v16H4z"/>';
 }
}
/* Operation marks, redrawn for 20px: heavy strokes, few terminals, no thin diagonals at
 * small sizes. These carry legibility at rail size; the CJK key takes over when there is
 * room for it.
 *
 * First pass reviewed against a rendered contact sheet: REPRESENT/RECOVER were near-identical
 * left-arrows, PLAN/READ both read as horizontal line bundles, and RETURN/PLAY both carried a
 * right-pointing element. Each mark is now built on a different SHAPE PRIMITIVE so the set is
 * separable at 20px without reading the label:
 *
 *   VERIFY      X            cross
 *   PLAY        solid wedge  the ONLY filled mark in the set -- instantly separable
 *   RETURN      U-turn       reversal, open stroke, head at the right
 *   RECOVER     closed loop  cyclic, full ring -- distinct from RETURN's open hook
 *   REPRESENT   box + ray    a source emitting out of its own frame
 *   PLAN        zigzag path  a traced route with a head
 *   READ        spine + rows a page, with a left rule (PLAN has no spine)
 *   ADDRESS     crosshair
 *   CAPTURE     tray + drop
 *   TRANSFORM   two opposed arrows
 */
function operation(op=''){
 op=String(op).toUpperCase();
 if(/VERIFY|PROVE|TEST/.test(op))return '<path d="m6 6 12 12M18 6 6 18"/>';
 if(/REPRESENT|PROJECT/.test(op))return '<path d="M4 4h9v9H4z"/><path d="M11 11 20 5"/><path d="M15 4h6v6"/>';
 if(/PLAY/.test(op))return '<path d="m7 4 13 8-13 8Z" fill="currentColor" stroke="none"/>';
 if(/RECOVER/.test(op))return '<path d="M20 12a8 8 0 1 1-4-6.9"/><path d="M20 3v6h-6"/>';
 if(/RETURN/.test(op))return '<path d="M6 5v7a5 5 0 0 0 5 5h8"/><path d="m16 13 4 4-4 4"/>';
 if(/PLAN|ROUTE|MOVE/.test(op))return '<path d="M3 18 9 7l4 8 4-5"/><path d="M14 10h6M17 7l3 3-3 3"/>';
 if(/ADDRESS|ORIENT|INDEX/.test(op))return '<path d="M12 3v18M3 12h18"/><path d="M9 9h6v6H9z"/>';
 if(/CAPTURE|INGEST/.test(op))return '<path d="M4 5h16v14H4z"/><path d="M12 8v6M9 11l3 3 3-3"/>';
 if(/TRANSFORM|COMPOSE/.test(op))return '<path d="M4 8h14M15 5l3 3-3 3"/><path d="M20 16H6M9 13l-3 3 3 3"/>';
 if(/READ|INTERPRET/.test(op))return '<path d="M5 4v16"/><path d="M10 8h10M10 12h7M10 16h10"/>';
 return '<path d="M8 8h8v8H8z"/>';
}
function attentionMarks(opt={}){
 return (opt.now?'<path d="M2 2h6" stroke="#ed7447" stroke-width="2.6"/>':'')+
        (opt.head?'<path d="M16 22h6" stroke="#d5ad68" stroke-width="2.6"/>':'')+
        (opt.issue?'<path d="M22 2v6" stroke="#cc8792" stroke-width="2.6"/>':'');
}
function parts(r,opt={}){return{kind:r?.kind||'route',kind_key:kindKey(r?.kind),operation:r?.operation||'',operation_key:opKey(r?.operation),state:r?.state||'',color:stateColor(r?.state),now:!!opt.now,head:!!opt.head,issue:!!opt.issue}}
function svg(r,opt={}){
 const p=parts(r,opt),size=opt.size||28,label=[p.kind_key,p.operation_key,p.state,opt.now?'NOW':'',opt.head?'HEAD':''].filter(Boolean).join(' · ');
 // Progressive enhancement on size: below 26 units a CJK glyph mushes, so the mark runs
 // alone at full weight. At or above 26 the key becomes the subject and the mark recedes.
 const roomy=size>=26;
 const subject=roomy?'<text x="12" y="12.5" text-anchor="middle" dominant-baseline="central" fill="currentColor" font-size="13" font-weight="700" font-family="&apos;Hiragino Sans&apos;,&apos;PingFang SC&apos;,&apos;Noto Sans CJK SC&apos;,&apos;Yu Gothic&apos;,&apos;Meiryo&apos;,sans-serif">'+p.operation_key+'</text>':'';
 return '<svg class="fieldGlyph" viewBox="0 0 24 24" width="'+size+'" height="'+size+'" aria-label="'+label+'" role="img" style="color:'+p.color+'">'
   +'<rect x="0" y="0" width="24" height="24" fill="#0b1012" opacity=".6"/>'
   +'<g fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="square" stroke-linejoin="miter" opacity=".55">'+frame(p.kind)+'</g>'
   +'<g fill="none" stroke="currentColor" stroke-width="'+(roomy?'1':'2')+'" stroke-linecap="square" stroke-linejoin="miter" opacity="'+(roomy?'.2':'1')+'">'+operation(p.operation)+'</g>'
   +subject
   +'<rect x="0" y="21.9" width="24" height="2.1" fill="'+p.color+'" opacity=".9"/>'
   +attentionMarks(opt)
   +'</svg>';
}
function mnemonic(r){const p=parts(r);return p.kind_key+p.operation_key}
window.FieldGlyph={svg,parts,mnemonic,stateColor,kindKey,opKey};
})();
