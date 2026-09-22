import {parseId3,id3DisplayName} from './id3.js';
import {parseMp4Meta,mp4DisplayName} from './mp4-meta.js';
import {extOf} from './sidecar-text.js';

export function parseLocalAudioMeta(input,name=''){
  const ext=extOf(name),id3=parseId3(input);
  if(id3.present&&id3.supported)return {...id3,metadataSource:'ID3V2',container:'MP3'};
  if(ext==='m4a'||ext==='mp4'||ext==='aac'){
    const mp4=parseMp4Meta(input);
    if(mp4.present)return {...mp4,metadataSource:'MP4_ILST'};
  }
  return {present:!!id3.present,supported:false,title:'',artist:'',album:'',genre:'',bpm:null,key:'',lyrics:'',lyricsLanguage:null,lyricsAlignment:null,metadataSource:null,container:ext?ext.toUpperCase():''};
}
export function localDisplayName(meta={},fallback='AUDIO'){
  return meta?.metadataSource==='MP4_ILST'?mp4DisplayName(meta,fallback):id3DisplayName(meta,fallback);
}
