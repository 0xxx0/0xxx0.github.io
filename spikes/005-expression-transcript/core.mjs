const VERSION='field-expression/v0.1';

const clone=x=>typeof structuredClone==='function'?structuredClone(x):JSON.parse(JSON.stringify(x));
const uniq=xs=>[...new Set((xs||[]).filter(Boolean))];
const canonical=x=>Array.isArray(x)?x.map(canonical):(x&&typeof x==='object'?Object.keys(x).sort().reduce((o,k)=>(o[k]=canonical(x[k]),o),{}):x);
const stable=x=>JSON.stringify(canonical(x));
const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return(h>>>0).toString(16).padStart(8,'0')};

export function createHost({id='HOST',authority='VIEW',source=null,nodes=[],revision=0,operations={}}={}){
  const byId=new Map(nodes.map(n=>[String(n.id),clone(n)]));
  const host={
    id,authority,source,revision:Number(revision)||0,
    ids:()=>[...byId.keys()],
    read:id=>clone(byId.get(String(id))||null),
    describe:id=>{
      const n=byId.get(String(id));if(!n)return null;
      return {
        id:String(n.id),
        channels:uniq(n.channels||Object.keys(n.value||{})),
        operations:uniq(n.operations||Object.keys(operations||{})),
        authority:n.authority||authority
      };
    },
    snapshot:()=>({id:host.id,authority:host.authority,source:clone(host.source),revision:host.revision}),
    _get:id=>byId.get(String(id)),
    _set:(id,node)=>byId.set(String(id),clone(node)),
    _operations:operations
  };
  return host;
}

export function makePhi(host,meta={}){
  if(!host)throw new Error('HOST_REQUIRED');
  return Object.freeze({
    schema:VERSION+'/phi',
    host:String(host.id||'HOST'),
    revision:Number(host.revision)||0,
    authority:host.authority||'VIEW',
    source:clone(host.source||null),
    channels:uniq(meta.channels||['identity','address','content','authority','evidence']),
    created_at:meta.created_at||new Date().toISOString()
  });
}

function readChannel(node,ch){
  if(ch==='identity')return node.id;
  if(ch==='address')return node.address??node.href??null;
  if(ch==='authority')return node.authority??null;
  if(ch==='evidence')return node.evidence??node.receipt??null;
  if(ch==='content')return node.content??node.value??null;
  if(ch==='depth')return node.depth??node.parent??null;
  if(ch==='time')return node.time??node.updated_at??null;
  if(ch==='raster')return node.raster??null;
  return node[ch];
}

export function transcribe(host,phi,{focus=null,selection=[],channels=['identity','address','content','authority','evidence'],context={}}={}){
  if(!host||!phi)throw new Error('HOST_AND_PHI_REQUIRED');
  if(String(phi.host)!==String(host.id))throw new Error('PHI_HOST_MISMATCH');
  if(Number(phi.revision)!==Number(host.revision))throw new Error('PHI_STALE');
  const ids=uniq([focus,...selection]).filter(id=>host.read(id));
  const requested=uniq(channels);
  const records=[],residue=[];
  for(const id of ids){
    const node=host.read(id),desc=host.describe(id)||{},available=new Set(desc.channels||[]);
    const expressed={};
    for(const ch of requested){
      const v=readChannel(node,ch);
      if(available.has(ch)&&v!==undefined)expressed[ch]=clone(v);
      else residue.push({id:String(id),channel:ch,reason:'UNEXPRESSED'});
    }
    records.push({
      id:String(id),
      expressed,
      support:{operations:clone(desc.operations||[]),authority:desc.authority||phi.authority}
    });
  }
  const body={
    schema:VERSION+'/transcript',
    phi:{host:phi.host,revision:phi.revision,authority:phi.authority,source:clone(phi.source)},
    locus:{focus:focus==null?null:String(focus),selection:ids.map(String)},
    requested_channels:requested,
    context:clone(context),
    records,
    residue
  };
  return Object.freeze({...body,id:'tx-'+hash(stable(body))});
}

export function splice(transcript,channels=[]){
  if(!transcript)throw new Error('TRANSCRIPT_REQUIRED');
  const keep=new Set(uniq(channels)),records=[],residue=clone(transcript.residue||[]);
  for(const r of transcript.records||[]){
    const expressed={};
    for(const [ch,v] of Object.entries(r.expressed||{})){
      if(keep.has(ch))expressed[ch]=clone(v);
      else residue.push({id:r.id,channel:ch,reason:'SPLICED_OUT'});
    }
    records.push({...clone(r),expressed});
  }
  const body={...clone(transcript),schema:VERSION+'/transcript-splice',requested_channels:[...keep],records,residue,parent:transcript.id};
  delete body.id;
  return Object.freeze({...body,id:'tx-'+hash(stable(body))});
}

export function translate(transcript,{name='PAGE',channels=[]}={}){
  if(!transcript)throw new Error('TRANSCRIPT_REQUIRED');
  const supported=new Set(uniq(channels)),records=[],residue=clone(transcript.residue||[]);
  for(const r of transcript.records||[]){
    const view={};
    for(const [ch,v] of Object.entries(r.expressed||{})){
      if(supported.has(ch))view[ch]=clone(v);
      else residue.push({id:r.id,channel:ch,reason:'PROJECTION_SUPPORT_0',projection:name});
    }
    records.push({id:r.id,view});
  }
  return Object.freeze({
    schema:VERSION+'/translation',
    transcript:transcript.id,
    phi:clone(transcript.phi),
    projection:name,
    records,
    residue
  });
}

export function commit(host,transcript,{target,operation,args={}}={}){
  if(!host||!transcript)throw new Error('HOST_AND_TRANSCRIPT_REQUIRED');
  if(String(transcript.phi?.host)!==String(host.id))return{ok:false,reason:'PHI_HOST_MISMATCH'};
  if(Number(transcript.phi?.revision)!==Number(host.revision))return{ok:false,reason:'STALE_TRANSCRIPT'};
  const rec=(transcript.records||[]).find(r=>String(r.id)===String(target));
  if(!rec)return{ok:false,reason:'TARGET_NOT_TRANSCRIBED'};
  const allowed=new Set(rec.support?.operations||[]);
  if(!allowed.has(operation))return{ok:false,reason:'SUPPORT=0:'+operation};
  const fn=host._operations?.[operation];
  if(typeof fn!=='function')return{ok:false,reason:'HOST_OPERATION_MISSING'};
  const before=host.read(target),out=fn(clone(before),clone(args),host);
  if(out?.ok===false)return out;
  const after=out?.node??out;
  if(!after)return{ok:false,reason:'HOST_OPERATION_EMPTY'};
  host._set(target,after);host.revision++;
  return{
    ok:true,
    receipt:{
      schema:VERSION+'/commit',
      host:host.id,
      transcript:transcript.id,
      target:String(target),
      operation,
      before,
      after:host.read(target),
      revision:host.revision,
      evidence:out?.evidence||null
    }
  };
}

export class ExpressionTape{
  constructor(){this.frames=[];this.cursor=-1}
  checkpoint(transcript,label='CHECKPOINT'){
    const frame={schema:VERSION+'/tape-frame',label,transcript:clone(transcript)};
    this.frames=this.frames.slice(0,this.cursor+1);
    this.frames.push(frame);this.cursor=this.frames.length-1;
    return clone(frame);
  }
  rewind(steps=1){
    if(!this.frames.length)return null;
    this.cursor=Math.max(0,this.cursor-Math.max(1,Number(steps)||1));
    return clone(this.frames[this.cursor]);
  }
  forward(steps=1){
    if(!this.frames.length)return null;
    this.cursor=Math.min(this.frames.length-1,this.cursor+Math.max(1,Number(steps)||1));
    return clone(this.frames[this.cursor]);
  }
  branch(label='BRANCH'){
    if(this.cursor<0)return null;
    return {schema:VERSION+'/counterfactual',label,from:this.cursor,transcript:clone(this.frames[this.cursor].transcript)};
  }
  snapshot(){return{schema:VERSION+'/tape',cursor:this.cursor,count:this.frames.length,labels:this.frames.map(x=>x.label)}}
}
