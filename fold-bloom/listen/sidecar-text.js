const AUDIO_EXT=new Set(['mp3','wav','ogg','oga','m4a','aac','flac','webm','mp4']);
const TEXT_EXT=new Set(['lrc','vtt','srt','txt','md','markdown']);
const PLAYLIST_EXT=new Set(['m3u','m3u8','pls']);

export function extOf(name=''){const m=String(name).toLowerCase().match(/\.([a-z0-9]+)$/);return m?m[1]:''}
export function stemOf(name=''){return String(name).replace(/\.[^.]+$/,'').toLowerCase()}
export function classifyLocalName(name='',type=''){
  const ext=extOf(name),mime=String(type||'').toLowerCase();
  if(mime.startsWith('audio/')||AUDIO_EXT.has(ext))return 'AUDIO';
  if(TEXT_EXT.has(ext))return 'TEXT';
  if(PLAYLIST_EXT.has(ext))return 'PLAYLIST';
  return 'OTHER';
}
function tsSeconds(raw=''){
  const s=String(raw).trim().replace(',', '.');
  const parts=s.split(':').map(Number);
  if(parts.some(x=>!Number.isFinite(x)))return null;
  if(parts.length===3)return parts[0]*3600+parts[1]*60+parts[2];
  if(parts.length===2)return parts[0]*60+parts[1];
  return null;
}
export function parseTextSidecar(text='',name='text.txt'){
  const ext=extOf(name),raw=String(text||'');
  const cues=[];
  if(ext==='lrc'){
    for(const line of raw.split(/\r?\n/)){
      const tags=[...line.matchAll(/\[(\d{1,3}):(\d{2}(?:\.\d{1,3})?)\]/g)];
      const body=line.replace(/^(?:\[[^\]]+\])+\s*/,'').trim();
      for(const m of tags){const t=Number(m[1])*60+Number(m[2]);if(Number.isFinite(t)&&body)cues.push({start:t,end:null,text:body})}
    }
  }else if(ext==='vtt'||ext==='srt'){
    const lines=raw.replace(/^WEBVTT[^\n]*\n?/i,'').split(/\r?\n/);
    for(let i=0;i<lines.length;i++){
      const m=lines[i].match(/(\d{1,2}:)?\d{1,2}:\d{2}[.,]\d{3}\s+-->\s+(\d{1,2}:)?\d{1,2}:\d{2}[.,]\d{3}/);
      if(!m)continue;
      const [a,b]=lines[i].split('-->').map(x=>tsSeconds(x.trim().split(/\s+/)[0]));
      if(a===null||b===null)continue;
      const body=[];for(i=i+1;i<lines.length&&lines[i].trim();i++)body.push(lines[i].trim());
      const t=body.join(' ').trim();if(t)cues.push({start:a,end:b,text:t});
    }
  }
  const plain=cues.length?cues.map(x=>x.text).join('\n'):raw.trim();
  return {
    name:String(name),kind:ext==='lrc'?'LYRICS':(ext==='vtt'||ext==='srt'?'TRANSCRIPT':'TEXT'),
    alignment:cues.length?`TIMED_${ext.toUpperCase()}`:'UNALIGNED_SIDECAR',
    text:plain,cues:cues.slice(0,2000),cueCount:cues.length,chars:plain.length
  };
}
export function parsePlaylistText(text='',name='playlist.m3u'){
  const ext=extOf(name),raw=String(text||''),entries=[];
  if(ext==='m3u'||ext==='m3u8'){
    let pendingTitle='';
    for(const line0 of raw.split(/\r?\n/)){
      const line=line0.trim();if(!line)continue;
      if(line.startsWith('#EXTINF:')){pendingTitle=line.split(',').slice(1).join(',').trim();continue}
      if(line.startsWith('#'))continue;
      entries.push({address:line,title:pendingTitle||''});pendingTitle='';
    }
  }else if(ext==='pls'){
    const map={};
    for(const line of raw.split(/\r?\n/)){
      const m=line.match(/^(File|Title)(\d+)=(.*)$/i);if(!m)continue;
      const n=Number(m[2]);map[n]=map[n]||{};map[n][m[1].toLowerCase()]=m[3].trim();
    }
    for(const n of Object.keys(map).map(Number).sort((a,b)=>a-b)){if(map[n].file)entries.push({address:map[n].file,title:map[n].title||''})}
  }
  return {kind:'PLAYLIST',name:String(name),entries:entries.slice(0,500)};
}
export function groupLocalInputs(files=[]){
  const xs=[...files],audio=xs.filter(f=>classifyLocalName(f.name,f.type)==='AUDIO'),texts=xs.filter(f=>classifyLocalName(f.name,f.type)==='TEXT'),playlists=xs.filter(f=>classifyLocalName(f.name,f.type)==='PLAYLIST');
  const groups=audio.map(a=>({audio:a,sidecars:texts.filter(t=>stemOf(t.name)===stemOf(a.name))}));
  if(audio.length===1&&texts.length&&!groups[0].sidecars.length)groups[0].sidecars=[...texts];
  return {groups,playlists,unmatchedText:texts.filter(t=>!groups.some(g=>g.sidecars.includes(t)))};
}
