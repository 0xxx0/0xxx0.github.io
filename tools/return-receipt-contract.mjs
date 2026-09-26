export function pendingCIClaims(receipt) {
  const out=[];
  const walk=(value,path='$')=>{
    if(typeof value==='string'){
      const normalized=value.toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
      if(/\bpending (?:pr )?ci\b|\bci (?:is )?pending\b/.test(normalized))out.push({path,text:value});
      return;
    }
    if(Array.isArray(value)){value.forEach((v,i)=>walk(v,`${path}[${i}]`));return}
    if(value&&typeof value==='object'){for(const [k,v] of Object.entries(value))walk(v,`${path}.${k}`)}
  };
  walk(receipt);
  return out;
}

export function hasPendingCIClaim(receipt) {
  return pendingCIClaims(receipt).length>0;
}
