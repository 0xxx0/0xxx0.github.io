import fs from 'node:fs';
import { RELATION_LEGEND } from '../../fold-bloom/live/play-core.js';

const OUT=new URL('./fan8-print.svg',import.meta.url);
const relations=RELATION_LEGEND.map(([relation,verb],distance)=>({distance,relation,verb}));
if(relations.length!==4)throw new Error('FAN8 expects the current four-class six-slot relation law');

const leaves=[
 ...Array.from({length:6},(_,i)=>({id:'S'+i,title:'SLOT '+i,sub:'CYCLIC / MOVE',code:i,kind:'SLOT'})),
 {id:'HOLD',title:'HOLD',sub:'READ · TEST · ARM',code:6,kind:'GATE'},
 {id:'LET_FLY',title:'LET FLY',sub:'RUN · WITNESS · RETURN',code:7,kind:'GATE'}
];

const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const bitRects=(code,x,y)=>Array.from({length:3},(_,i)=>{
 const on=(code>>(2-i))&1;
 return `<rect x="${x+i*5}" y="${y}" width="3.6" height="3.6" fill="${on?'#111':'none'}" stroke="#111" stroke-width=".35"/>`;
}).join('');

function leaf(g,i){
 const col=i%2,row=Math.floor(i/2),x=7+col*205,y=44+row*52;
 const line2=g.kind==='GATE'
   ?(g.id==='HOLD'?'freeze choice before consequence':'release once · then record what changed')
   :'write current lawful move / cue';
 const trait=g.id==='HOLD'
   ?`<text x="${x+105}" y="${y+41}" class="micro">GARDEN: ○ BODY  ○ PATH  ○ VOICE</text>`
   :'';
 return `<g id="leaf-${g.id}" data-fan8-leaf="${i}" data-code="${g.code}">
  <path d="M ${x+12} ${y+17} L ${x+188} ${y+3} L ${x+198} ${y+4} L ${x+198} ${y+44} L ${x+188} ${y+45} L ${x+12} ${y+31} Z" fill="#fffdf7" stroke="#111" stroke-width=".7"/>
  <line x1="${x+27}" y1="${y+14}" x2="${x+27}" y2="${y+34}" stroke="${i<3?'#e8663a':i<6?'#4f87a3':'#111'}" stroke-width="2.2"/>
  <circle cx="${x+16}" cy="${y+24}" r="2.5" fill="none" stroke="#111" stroke-width=".65"/>
  <circle cx="${x+188}" cy="${y+24}" r="1.5" fill="none" stroke="#777" stroke-width=".45"/>
  <text x="${x+33}" y="${y+19}" class="leafTitle">${esc(g.title)}</text>
  <text x="${x+33}" y="${y+26}" class="leafSub">${esc(g.sub)}</text>
  <text x="${x+33}" y="${y+37}" class="micro">${esc(line2)}</text>
  <line x1="${x+92}" y1="${y+35.5}" x2="${x+170}" y2="${y+35.5}" stroke="#777" stroke-width=".35"/>
  ${trait}
  ${bitRects(g.code,x+173,y+8)}
  <text x="${x+173}" y="${y+16}" class="bitLabel">${String(g.code).padStart(3,'0')}</text>
 </g>`;
}

const legend=relations.map(r=>`Δ${r.distance} ${r.relation}→${r.verb}`).join(' · ');

export function render(){
 return `<svg xmlns="http://www.w3.org/2000/svg" width="420mm" height="297mm" viewBox="0 0 420 297">
 <title>FAN/8 · physical projection recipe</title>
 <desc>Generated from the current FOLD/BLOOM six-slot relation law. Eight passive leaves: six cyclic slots plus HOLD and LET FLY. Print at 100 percent actual size.</desc>
 <style>
 .head{font:700 7px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.7px;fill:#111}
 .sub{font:3.2px ui-monospace,SFMono-Regular,Menlo,monospace;fill:#555}
 .leafTitle{font:700 5px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.45px;fill:#111}
 .leafSub{font:700 2.7px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.35px;fill:#555}
 .micro{font:2.45px ui-monospace,SFMono-Regular,Menlo,monospace;fill:#555}
 .bitLabel{font:2.1px ui-monospace,SFMono-Regular,Menlo,monospace;fill:#777}
 .law{font:700 2.9px ui-monospace,SFMono-Regular,Menlo,monospace;fill:#111}
 </style>
 <rect width="420" height="297" fill="#f8f5ed"/>
 <text x="8" y="10" class="head">FAN/8 · PHYSICAL PROJECTION RECIPE · v0.1</text>
 <text x="8" y="17" class="sub">SAME HELD OBJECT · SHAPE CHANGES PROJECTION, NOT AUTHORITY</text>
 <text x="8" y="25" class="law">6 CYCLIC SLOTS + HOLD + LET FLY</text>
 <text x="8" y="31" class="sub">STACK = FOCUS · FAN = REACHABLE MOVES · ANNULUS = CYCLIC RELATION · WRAP = PHASE / REPEAT</text>
 <text x="303" y="10" class="sub">PRINT 100% · ACTUAL SIZE · NO FIT-TO-PAGE</text>
 <text x="303" y="16" class="sub">LEAF ≈ 186 mm · PIVOT Ø5 mm</text>
 <line x1="310" y1="33" x2="410" y2="33" stroke="#111" stroke-width=".8"/>
 <line x1="310" y1="30" x2="310" y2="36" stroke="#111" stroke-width=".35"/>
 <line x1="410" y1="30" x2="410" y2="36" stroke="#111" stroke-width=".35"/>
 <text x="310" y="29" class="bitLabel">CALIBRATION 100 mm · PASS 99–101 mm</text>
 ${leaves.map(leaf).join('\n')}
 <g id="legend">
  <rect x="7" y="258" width="406" height="32" fill="#fffdf7" stroke="#111" stroke-width=".6"/>
  <text x="12" y="267" class="law">CURRENT GAME LAW · GENERATED FROM play-core.js</text>
  <text x="12" y="274" class="sub">${esc(legend)}</text>
  <text x="12" y="281" class="sub">FIELD / DAYLINE: write only 1–3 lawful moves; fold the rest behind. HOLD one. LET FLY once. WITNESS. RETURN.</text>
  <text x="302" y="267" class="law">PASSIVE IDs</text>
  <text x="302" y="274" class="sub">000–111 are leaf identity marks only.</text>
  <text x="302" y="281" class="sub">No sensing or synchronization claim.</text>
 </g>
</svg>\n`;
}

const generated=render();
if(process.argv.includes('--check')){
 const current=fs.readFileSync(OUT,'utf8');
 if(current!==generated){console.error('FAN8 PRINT DRIFT');process.exit(1)}
 console.log('FAN8 PRINT PASS');
}else{
 fs.writeFileSync(OUT,generated);
 console.log(new URL(OUT).pathname);
}
