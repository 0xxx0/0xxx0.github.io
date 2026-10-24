/* SLEEPER / SOURCE CARRIER — evidence only, never Gate or narrative authority. */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.SleeperSourceCarrier=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const KEY='sleeper:source-carrier/v1',SCHEMA='sleeper.source-carrier/v1',LIMIT=120;
  function hash(s){let h=2166136261;for(const ch of String(s).normalize('NFC')){h^=ch.codePointAt(0);h=Math.imul(h,16777619)}return (h>>>0).toString(16).padStart(8,'0')}
  function lawfulPath(path){
    return typeof path==='string'&&path.length>0&&path.length<=900&&path[0]==='/'&&path[1]!=='/'&&!/[\\\x00-\x1f<>"]/u.test(path);
  }
  function make({kind,source,title,sourceHash,address,from,start,end}){
    if(!['AXIS','PRISON_AGE'].includes(kind))throw Error('CARRIER_KIND');
    if(typeof source!=='string'||!source.length||source.length>1000000)throw Error('CARRIER_SOURCE');
    if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<=start||end>source.length)throw Error('CARRIER_BOUNDS');
    if(!lawfulPath(from)||typeof address!=='string'||!address.length||address.length>900)throw Error('CARRIER_ADDRESS');
    let a=start,b=Math.min(end,start+LIMIT);
    while(a<b&&/\s/u.test(source[a]))a++;
    while(b>a&&/\s/u.test(source[b-1]))b--;
    const excerpt=source.slice(a,b);
    if(!excerpt||excerpt.length>LIMIT)throw Error('CARRIER_EMPTY');
    return Object.freeze({
      schema:SCHEMA,authority:'EVIDENCE_ONLY',kind,title:String(title||'SOURCE').slice(0,160),
      source:{hash:String(sourceHash||hash(source)).slice(0,160),address,length:source.length},
      witness:{start:a,end:b,originalEnd:end,excerptHash:hash(excerpt),truncated:b<end},
      excerpt,from,rule:'SOURCE SPAN ONLY. This excerpt seeds a native city; it is not a verified interpretation or Gate proof.'
    });
  }
  function valid(p){
    return !!p&&p.schema===SCHEMA&&p.authority==='EVIDENCE_ONLY'&&['AXIS','PRISON_AGE'].includes(p.kind)
      &&lawfulPath(p.from)&&typeof p.excerpt==='string'&&p.excerpt.length>0&&p.excerpt.length<=LIMIT
      &&typeof p.title==='string'&&p.title.length<=160
      &&p.source&&typeof p.source.hash==='string'&&p.source.hash.length>0
      &&typeof p.source.address==='string'&&p.source.address.length>0
      &&Number.isInteger(p.source.length)&&p.source.length>0
      &&p.witness&&Number.isInteger(p.witness.start)&&Number.isInteger(p.witness.end)
      &&Number.isInteger(p.witness.originalEnd)&&p.witness.start>=0
      &&p.witness.end>p.witness.start&&p.witness.end<=p.witness.originalEnd
      &&p.witness.originalEnd<=p.source.length
      &&p.witness.end-p.witness.start===p.excerpt.length
      &&p.witness.excerptHash===hash(p.excerpt)
      &&p.witness.truncated===(p.witness.end<p.witness.originalEnd);
  }
  function store(storage,p){if(!valid(p))throw Error('CARRIER_INVALID');storage.setItem(KEY,JSON.stringify(p));return p}
  function consume(storage){
    let raw;try{raw=storage.getItem(KEY);storage.removeItem(KEY);if(!raw)return null;const p=JSON.parse(raw);return valid(p)?p:null}catch{return null}
  }
  function rejoin(p,artifact,nativeRouteTrace){
    if(!valid(p)||artifact?.schema!=='sleeper.one-return'||artifact?.version!==2||artifact.proofs?.length!==8||!nativeRouteTrace||nativeRouteTrace.authority!=='EVIDENCE_ONLY')throw Error('CARRIER_RETURN_UNPROVEN');
    return{schema:'sleeper.source-return/v1',authority:'EVIDENCE_ONLY',sourceCarrier:p,artifact,nativeRouteTrace,
      boundary:'Source correspondence is a local, user-selected excerpt. Only the native city owns Gate proofs. Neither source interpretation nor Prison Age canon is certified by this packet.'};
  }
  return Object.freeze({KEY,SCHEMA,LIMIT,hash,make,valid,store,consume,rejoin});
});
