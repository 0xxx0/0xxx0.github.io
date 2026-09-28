import {makeReadRidePacket,READ_RIDE_STORAGE} from '/fold-bloom/read-course.js';
const $=id=>document.getElementById(id),PACK='/prison-age/sources.json';
let pack=null,story=null,source='';
const q=new URLSearchParams(location.search);
const cleanPreview=raw=>{
  const lines=String(raw||'').replace(/\r/g,'').split('\n').map(x=>x.trim()).filter(Boolean);
  const prose=lines.filter(x=>!/^\d+(?:\/\d+)?$/.test(x)&&!/^UNIVERSE\b/.test(x)&&!/^TOKEN\s*\/\//.test(x)&&!/^MARGIN\s*\/\//.test(x)&&!/^[-·]{8,}$/.test(x)&&!/^#/.test(x)&&!/^(Source|Editorial status):/i.test(x)&&!/^\*\*/.test(x)&&!/^\[ … SOURCE PASSAGE OMITTED … \]$/.test(x));
  return prose.slice(0,3).join('\n\n');
};
const currentUrl=()=>'/prison-age/?story='+encodeURIComponent(story.id);
const entryChar=()=>{const a=String(story?.entry_anchor||'');const i=a?source.indexOf(a):-1;return i>=0?i:0};
function updateUrl(){history.replaceState(null,'',currentUrl())}
function renderList(){
  $('storyList').innerHTML=Object.values(pack.stories).map(x=>'<button class="storyBtn '+(x.id===story?.id?'on':'')+'" data-story="'+x.id+'"><b>'+x.number+' · '+x.title+'</b><span>'+x.engine+' · '+x.source_class.replaceAll('_',' ')+'</span></button>').join('');
  $('storyList').querySelectorAll('[data-story]').forEach(b=>b.onclick=()=>loadStory(b.dataset.story));
}
async function loadStory(id){
  story=pack.stories[id]||pack.stories[pack.default];source='';
  $('number').textContent=story.number;$('title').textContent=story.title;
  $('season').textContent=story.season.toUpperCase();$('engine').textContent='ENGINE · '+story.engine;$('class').textContent=story.source_class.replaceAll('_',' ');
  $('rawBtn').href=story.path;$('address').textContent=story.path;$('preview').className='preview loading';$('preview').textContent='Loading exact source…';
  updateUrl();renderList();
  try{const r=await fetch(story.path,{cache:'no-store'});if(!r.ok)throw Error('SOURCE '+r.status);source=await r.text();$('preview').textContent=cleanPreview(source);$('preview').className='preview';$('status').textContent='EXACT SOURCE READY · '+source.length+' chars · '+story.path}
  catch(e){$('preview').textContent='Source unavailable: '+String(e.message||e);$('status').textContent='SOURCE LOAD FAILED'}
}
function readSource(){
  if(!story)return;
  const u=new URL('/docs/',location.origin);u.searchParams.set('src',story.path);u.searchParams.set('return',currentUrl());u.searchParams.set('ap_scale','SENTENCE');u.searchParams.set('ap_char',String(entryChar()));location.href=u.pathname+u.search;
}
async function rideSource(){
  if(!story||!source.trim())return;
  const fp=story.source_fingerprint;
  const packet=makeReadRidePacket({
    source,label:'PRISON AGE · '+story.title,
    sourceIdentity:{address:story.path,hash:fp?fp.algo+':'+fp.value:undefined,kind:'PRISON_AGE_SOURCE',format:'MD',authority:'PRISON_AGE'},
    focus:{char_index:entryChar(),source_progress:source.length?entryChar()/source.length:0,grain:'SENTENCE'},
    from:currentUrl(),returnAddress:currentUrl()
  });
  sessionStorage.setItem(READ_RIDE_STORAGE,JSON.stringify(packet));
  $('status').textContent='HANDOFF READY · SAME SOURCE → LIVE / SENTENCE / STEP · OWNER PRISON_AGE';
  location.href='/fold-bloom/live/?source=readfield&course=STEP';
}
$('readBtn').onclick=readSource;$('rideBtn').onclick=rideSource;
window.PrisonAgeSourceAPI=Object.freeze({snapshot:()=>({story:story?{...story}:null,sourceLength:source.length,returnAddress:story?currentUrl():null}),load:loadStory,ride:rideSource,read:readSource});
fetch(PACK,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('PACK '+r.status);return r.json()}).then(x=>{pack=x;return loadStory(q.get('story')||pack.default)}).catch(e=>{$('preview').textContent='Source pack unavailable: '+String(e.message||e);$('status').textContent='SOURCE PACK FAILED'});
