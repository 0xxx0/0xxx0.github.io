import {audioGlyphRepresentation} from '../fold-bloom/listen/audio-glyph.js';
import {buildTrackHandoff} from './readfield-track-sync.js';

(()=>{'use strict';
if(!globalThis.Interphase||!globalThis.FoldBloomListen)return;
const I=globalThis.Interphase,API=globalThis.FoldBloomListen;
const sourceId=()=>API.state?.()?.fileMeta?.hash||API.state?.()?.glyph?.sourceHash||'listen:empty';
const adapter={
  id:'fold-bloom-listen',
  idOf:r=>typeof r==='string'?r:sourceId(),
  resolve:r=>{const id=typeof r==='string'?r:sourceId();if(id!==sourceId())throw new Error('LISTEN_REF_UNRESOLVED');return id},
  describe:()=>{
    const s=API.state?.()||{},p=s.map?{time:s.time,duration:s.map.duration,bpm:s.map.bpm,scope:s.scope,stage:s.stage}:null,id=sourceId();
    return {
      id,kind:'audio-source',label:s.fileMeta?.name||'LISTEN',
      address:{sourceHash:s.fileMeta?.hash||null,time:s.time||0,scope:s.scope||null},
      channels:['identity','address','content','time','authority','evidence'],
      capabilities:['read'],
      operations:[{id:'SEEK',authority:'VIEW',reversible:true},{id:'APERTURE',authority:'VIEW',reversible:true}],
      authority:'VIEW',clock:{type:'PLAYBACK',current:s.time||0,duration:s.map?.duration||0},
      value:{source:s.fileMeta||null,transport:p,pins:s.pins||[],glyph:s.glyph||null,rideProfile:s.rideProfile||null}
    };
  },
  glyph:ref=>{const g=API.glyph?.()||API.state?.()?.glyph;return audioGlyphRepresentation(g,ref)},
  read:()=>API.state?.()||{},
  capture:()=>{const s=API.state?.()||{};return{sourceId:sourceId(),time:s.time||0,scope:s.scope||null}},
  restore:s=>{if(s?.sourceId!==sourceId())return;if(s?.scope)API.aperture?.(s.scope);if(Number.isFinite(Number(s?.time)))API.seek?.(Number(s.time))},
  invoke:(_r,op,args)=>{
    if(op==='SEEK')return{ok:true,evidence:API.seek?.(args.time)};
    if(op==='APERTURE')return{ok:true,evidence:API.aperture?.(args.scope)};
    return{ok:false,reason:'SUPPORT=0:'+op};
  }
};
const host=I.createHost(adapter,{id:'FOLD_BLOOM_LISTEN',projection:'PAGE'});

function readfieldHref(){
  const s=API.state?.()||{},meta=s.fileMeta||{},ret=location.pathname+location.search,lyrics=String(meta.lyrics||'').trim();
  const q=new URLSearchParams({pulse:'4',return:ret});
  if(lyrics){
    const legacy={source:lyrics,label:`LYRICS · ${meta.name||'TRACK'}`,returnAddress:ret,sourceKind:meta.sourceKind||null,sourceHash:meta.hash||null};
    try{sessionStorage.setItem('readfield.handoff.v1',JSON.stringify(legacy))}catch(_){}
    const track=buildTrackHandoff({
      source:lyrics,label:`TRACK · ${meta.name||'AUDIO'}`,returnAddress:ret,sourceKind:meta.sourceKind||null,sourceHash:meta.hash||null,
      timedText:meta.timedText||null,time:s.time||0,bpm:s.map?.bpm||0,scope:s.scope||'PHRASE',stage:s.stage||s.map?.stage||''
    });
    if(track.timedText?.cues?.length){
      try{sessionStorage.setItem('readfield.track.handoff.v01',JSON.stringify(track))}catch(_){}
      q.set('track','1');
    }
    q.set('handoff','1');
  }
  return '/docs/?'+q.toString();
}
function openReadfield(){
  const href=readfieldHref(),w=window.open(href,'_blank');if(!w)location.assign(href);
}

function installStyle(){
  if(document.getElementById('listenWorkStyle'))return;
  const style=document.createElement('style');style.id='listenWorkStyle';style.textContent=`
  .listenWorkDeck{position:fixed;z-index:8;left:50%;top:max(48px,calc(env(safe-area-inset-top) + 42px));transform:translateX(-50%);width:min(760px,calc(100vw - 24px));display:none;background:rgba(5,8,12,.88);border:1px solid rgba(255,255,255,.16);backdrop-filter:blur(9px);pointer-events:auto}
  .listenWorkDeck.ready{display:grid}.listenWorkRail{display:flex;overflow:auto;scrollbar-width:none}.listenWorkRail::-webkit-scrollbar{display:none}.listenWorkRail button{flex:1 0 auto;min-width:76px;border:0;border-right:1px solid rgba(255,255,255,.13);border-radius:0;background:#081018;color:#dce7ee;padding:8px 10px;font:800 8px ui-monospace,monospace;letter-spacing:.11em}.listenWorkRail button:active{background:#eef5f8;color:#061018}.listenWorkNow{padding:6px 9px;border-top:1px solid rgba(255,255,255,.12);color:#7f909d;font:7px/1.35 ui-monospace,monospace;letter-spacing:.07em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .listenWhy{margin-top:10px;border-top:1px solid rgba(255,255,255,.12);padding-top:8px}.listenWhy summary{cursor:pointer;font:800 8px ui-monospace,monospace;letter-spacing:.12em;color:#9aabb7}.listenWhyGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1px;background:rgba(255,255,255,.12);margin-top:8px}.listenWhyGrid div{background:#071019;padding:9px}.listenWhyGrid b{display:block;font:900 9px ui-monospace,monospace;letter-spacing:.08em;margin-bottom:4px}.listenWhyGrid span{display:block;color:#8798a5;font:9px/1.45 system-ui,-apple-system,sans-serif}
  @media(max-width:760px){.listenWorkDeck{left:8px;right:8px;transform:none;width:auto;top:max(46px,calc(env(safe-area-inset-top) + 40px))}.listenWorkRail button{min-width:70px;padding:8px}.listenWhyGrid{grid-template-columns:1fr}.listenWorkNow{font-size:6.5px}}
  `;document.head.appendChild(style);
}
function trigger(id){const el=document.querySelector(id);if(el&&!el.disabled)el.click()}
function installWorkDeck(){
  if(document.querySelector('[data-listen-work]'))return;
  installStyle();
  const deck=document.createElement('div');deck.className='listenWorkDeck';deck.dataset.listenWork='1';deck.innerHTML='<div class="listenWorkRail" role="toolbar" aria-label="Track work"><button data-work="ride">RIDE</button><button data-work="read">READ</button><button data-work="compose">COMPOSE</button><button data-work="saber">SABER</button><button data-work="more">MORE</button></div><div class="listenWorkNow">LOAD A TRACK · choose the job after source identity is known</div>';
  const anchor=document.querySelector('.centerHud')||document.querySelector('.transportBar');anchor?.before(deck);
  deck.querySelector('[data-work="ride"]')?.addEventListener('click',()=>trigger('#useRide'));
  deck.querySelector('[data-work="read"]')?.addEventListener('click',openReadfield);
  deck.querySelector('[data-work="compose"]')?.addEventListener('click',()=>trigger('#useCompose'));
  deck.querySelector('[data-work="saber"]')?.addEventListener('click',()=>trigger('#useSaber'));
  deck.querySelector('[data-work="more"]')?.addEventListener('click',()=>trigger('#useBtn'));
}
function installUseCases(){
  const sheet=document.querySelector('#useSheet');if(!sheet||sheet.querySelector('[data-listen-why]'))return;
  const details=document.createElement('details');details.className='listenWhy';details.dataset.listenWhy='1';details.innerHTML='<summary>WHY / USE CASES · SAME TRACK, DIFFERENT JOBS</summary><div class="listenWhyGrid"><div><b>LISTEN → RIDE</b><span>Analyze one exact local/Suno-bound source, then let LIVE turn its future energy/sections into terrain. Your BLOOM/FOLD/SPLIT/RETURN moves remain authored in LIVE.</span></div><div><b>LISTEN → READFIELD</b><span>Lyrics/transcript become the text source. BPM can lend RSVP pace; timed LRC/VTT/SRT can follow the real track cue-by-cue without giving audio authority over edits or meaning.</span></div><div><b>LISTEN → TWO DIAL</b><span>Borrow clock, energy and section context while TWO DIAL keeps MATTER × HARMONY authorship. Useful for composing against a reference groove without copying its notes.</span></div><div><b>LISTEN → SABER</b><span>Compile measured beat/section evidence into EVENT TAPE, then either export a Beat Saber mapper/test pack or enter the in-repo two-phone LEFT/RIGHT motion proof.</span></div><div><b>MARK → MESSAGE MAP</b><span>BOOKMARK / FLAG / ARC turns listening into an addressed path: drops, lyric turns, ideas, edit notes, scene cuts or cues survive as source-bound evidence.</span></div><div><b>SKIM → FOCUS → RETURN</b><span>Use TRACK/SECTION for orientation, PHRASE/BEAT for precision, then hand off to READ/RIDE/COMPOSE and return to the same source identity instead of starting over.</span></div></div>';
  const law=document.querySelector('.useLaw');law?.before(details)||sheet.appendChild(details);
}
let lastWorkSig='';
function syncWork(){
  const s=API.state?.()||{},deck=document.querySelector('.listenWorkDeck'),now=deck?.querySelector('.listenWorkNow');if(!deck||!now)return;
  const ready=!!s.map;deck.classList.toggle('ready',ready);if(!ready)return;
  const meta=s.fileMeta||{},timed=Array.isArray(meta.timedText?.cues)&&meta.timedText.cues.length>0;
  const sig=[meta.hash||meta.name,s.scope,s.map?.bpm||0,timed?'TIMED':'FREE'].join('|');if(sig===lastWorkSig)return;lastWorkSig=sig;
  const bpm=Math.round(Number(s.map?.bpm)||0),scope=s.scope||'PHRASE';
  now.textContent=`${scope} · ${bpm?bpm+' BPM · ':''}${timed?'TIMED TEXT → READ can TRACK':'READ = tempo-paced RSVP; add LRC/VTT/SRT for cue sync'} · source ${String(meta.hash||'local').slice(0,10)}`;
  const readCard=document.querySelector('#useRead span');if(readCard&&timed)readCard.textContent='Timed text detected: READFIELD can follow the playing cue, then break out into FAST / REVIEW / VOICE / LOCI at the same source.';
}
function sync(){const id=sourceId();host.select(id);host.focus(id,{aperture:API.state?.()?.scope||'PHRASE'});host.project('PAGE',{host:'LISTEN'});syncWork();}

function install(){
  installWorkDeck();installUseCases();
  const native=document.querySelector('#useRead');if(native)native.onclick=openReadfield;
  sync();
}
window.addEventListener('fold-bloom-listen:state',sync);
queueMicrotask(install);
globalThis.FoldBloomListenInterphase=host;
})();