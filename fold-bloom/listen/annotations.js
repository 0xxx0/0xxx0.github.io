import {makeStreamPin,normalizePins} from './stream-lens.js';

export const ANNOTATION_SCHEMA='fold-bloom-annotations/v0.2';

export function sourceKeyFromAnnotationPacket(packet={}){
  return packet?.source?.key||packet?.sourceKey||packet?.addressedMessage?.source?.key||packet?.source?.hash&&('sha256:'+packet.source.hash)||null;
}

function cellsToMarks(cells=[],sourceKey){
  return (Array.isArray(cells)?cells:[]).map(c=>makeStreamPin({
    sourceKey,
    id:c?.id||null,
    kind:c?.kind||'BOOKMARK',
    address:c?.address,
    endAddress:c?.endAddress,
    label:c?.label||'',
    note:c?.note||'',
    scope:c?.scope||null,
    features:c?.features||null,
    createdAt:c?.createdAt||null
  }));
}

export function marksFromAnnotationPacket(packet={},sourceKey=null){
  const key=sourceKey||sourceKeyFromAnnotationPacket(packet);
  if(!key)return [];
  const raw=
    Array.isArray(packet?.marks)?packet.marks:
    Array.isArray(packet?.annotations?.marks)?packet.annotations.marks:
    Array.isArray(packet?.annotations?.pins)?packet.annotations.pins:
    Array.isArray(packet?.addressedMessage?.path?.cells)?cellsToMarks(packet.addressedMessage.path.cells,key):
    Array.isArray(packet?.path?.cells)?cellsToMarks(packet.path.cells,key):
    [];
  return normalizePins(raw.map(p=>({...p,sourceKey:key})),key);
}

export function mergeAnnotationMarks(current=[],incoming=[],sourceKey){
  const key=String(sourceKey||'');
  if(!key)return normalizePins(current);
  const byId=new Map();
  for(const p of normalizePins(current,key))byId.set(p.id,p);
  for(const p of normalizePins(incoming,key))byId.set(p.id,p);
  return normalizePins([...byId.values()],key);
}

export function annotationPacket({source={},marks=[],map=null,view=null,createdAt=null}={}){
  const sourceKey=source?.key||null;
  const normalized=normalizePins(marks,sourceKey||null);
  return {
    kind:'FOLD_BLOOM_ANNOTATIONS',
    schema:ANNOTATION_SCHEMA,
    created:createdAt||new Date().toISOString(),
    source:{
      key:sourceKey,
      name:source?.name||'SOURCE',
      hash:source?.hash||null,
      kind:source?.kind||null,
      origin:source?.origin||null,
      collection:source?.collection||null
    },
    mapWitness:map?{
      duration:Number(map.duration)||0,
      bpm:Number(map.bpm)||0,
      stage:map.stage||null,
      beatCount:Array.isArray(map.beats)?map.beats.length:0,
      phraseCount:Math.max(0,(map.phrases?.length||1)-1),
      sectionCount:Math.max(0,(map.sections?.length||1)-1)
    }:null,
    view:view?{
      time:Number(view.time)||0,
      scope:view.scope||null,
      start:Number(view.start)||0,
      end:Number(view.end)||0
    }:null,
    marks:normalized,
    warning:'Marks are human-authored address evidence beside the AUDIO MAP; they do not alter source analysis.'
  };
}
