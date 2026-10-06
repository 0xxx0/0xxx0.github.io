export const VERSION='field-urlbar/v0.1';

export const ACTIONS=Object.freeze([
  'hold','turn','trace','return','work','up','down','next','prev',
  'visual','structure','evolve','versions','recent','axial','handoff'
]);

const ACTION_SET=new Set(ACTIONS);
const ALIASES=Object.freeze({
  open:'turn',do:'turn',go:'turn',inspect:'trace',proof:'trace',back:'return',
  parent:'up',child:'down','>':'next','<':'prev',map:'visual',history:'versions',
  latest:'recent',home:'axial',run:'handoff',hermes:'handoff'
});

const text=v=>String(v??'').trim();
const squash=v=>text(v).toLowerCase().normalize('NFKC').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,'-');
const hrefSlug=href=>text(href).replace(/^\/+|\/+$/g,'').split('/').filter(Boolean).pop()||'root';

export function normalizeAction(raw='hold'){
  const k=text(raw).toLowerCase();
  const a=ALIASES[k]||k||'hold';
  return ACTION_SET.has(a)?a:null;
}

export function parseCommand(raw=''){
  let source=text(raw);
  try{source=decodeURIComponent(source)}catch(_){/* retain literal */}
  source=source.replace(/^\s*[φf]\s*=\s*/i,'').trim();
  if(!source)return{schema:VERSION,raw:'',selector:'.',action:'hold',explicitAction:false};

  let selector=source,action='hold',explicitAction=false;
  const colon=source.lastIndexOf(':');
  if(colon>0){
    const maybe=normalizeAction(source.slice(colon+1));
    if(maybe){selector=source.slice(0,colon);action=maybe;explicitAction=true}
  }
  if(!explicitAction){
    const m=source.match(/^(.*?)[\s]+([a-z<>]+)$/i);
    const maybe=m&&normalizeAction(m[2]);
    if(m&&maybe){selector=m[1];action=maybe;explicitAction=true}
  }
  selector=text(selector)||'.';
  return{schema:VERSION,raw:source,selector,action,explicitAction};
}

export function commandFromSearch(search=''){
  const p=new URLSearchParams(String(search||'').replace(/^\?/,''));
  const hasPhi=p.has('φ'),hasAscii=p.has('f');
  if(!hasPhi&&!hasAscii)return null;
  const key=hasPhi?'φ':'f';
  return{key,...parseCommand(p.get(key)||'')};
}

function routeKeys(route={},head=null){
  const out=new Set();
  const add=v=>{const s=text(v);if(!s)return;out.add(s.toLowerCase());const q=squash(s);if(q)out.add(q)};
  add(route.href);add(hrefSlug(route.href));add(route.title);add(route.family);add(route.kind);add(route.operation);
  if(head){add(head.route);add(head.lineage);add(head.head);add(head.state)}
  return [...out];
}

function score(selector,route,head){
  const raw=text(selector).toLowerCase(),needle=squash(selector),keys=routeKeys(route,head);
  if(keys.includes(raw)||keys.includes(needle))return 100;
  const slug=hrefSlug(route.href).toLowerCase();
  if(slug.startsWith(needle)||squash(route.title).startsWith(needle))return 80;
  if(keys.some(k=>k.startsWith(needle)))return 65;
  if(keys.some(k=>k.includes(needle)))return 45;
  const words=needle.split('-').filter(Boolean);
  if(words.length&&words.every(w=>keys.some(k=>k.includes(w))))return 30;
  return 0;
}

export function resolveSelector(selector,routes=[],heads=[],currentHref=null){
  const q=text(selector)||'.';
  if(q==='.'||q==='φ'){
    const href=currentHref||'/';
    const route=routes.find(r=>r?.href===href)||routes.find(r=>r?.href==='/')||null;
    return{state:route?'resolved':'unresolved',selector:q,route,candidates:route?[route]:[]};
  }

  const byRoute=new Map((heads||[]).filter(Boolean).map(h=>[h.route,h]));
  const ranked=(routes||[]).filter(r=>r&&r.href).map(route=>({route,score:score(q,route,byRoute.get(route.href)||null)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||String(a.route.href).localeCompare(String(b.route.href)));
  if(!ranked.length)return{state:'unresolved',selector:q,route:null,candidates:[]};
  const top=ranked[0].score,candidates=ranked.filter(x=>x.score===top).slice(0,7).map(x=>x.route);
  if(top>=100&&candidates.length===1)return{state:'resolved',selector:q,route:candidates[0],candidates};
  if(candidates.length===1&&top>=65)return{state:'resolved',selector:q,route:candidates[0],candidates};
  return{state:'ambiguous',selector:q,route:null,candidates:(ranked.slice(0,7).map(x=>x.route))};
}

export function commandValue(routeOrSelector,action='hold'){
  const selector=typeof routeOrSelector==='string'?routeOrSelector:hrefSlug(routeOrSelector?.href||'/');
  const a=normalizeAction(action)||'hold';
  return a==='hold'?selector:selector+':'+a;
}

export function withCommand(search,routeOrSelector,action='hold',key='φ'){
  const p=new URLSearchParams(String(search||'').replace(/^\?/,''));
  p.delete('φ');p.delete('f');
  p.set(key,commandValue(routeOrSelector,action));
  return'?'+p.toString();
}

export function describeRoute(route={},head=null){
  return{
    id:route.href||route.title||'/',
    kind:route.kind||'route',
    label:route.title||route.href||'FIELD',
    address:route.href||'/',
    authority:'VIEW',
    channels:['identity','address','content','authority','evidence'],
    operations:[{id:String(route.operation||'VIEW'),authority:'VIEW'}],
    value:{
      chain:[route.parent?{id:route.parent,label:route.parent}:null,{id:route.href,label:route.title||route.href}].filter(Boolean),
      sections:[]
    },
    clock:{},
    meta:{state:route.state||head?.state||'UNKNOWN',version:route.version||head?.version||null}
  };
}

export function handoffPacket(route,actionSurface=null){
  const actions=Array.isArray(actionSurface?.actions)?actionSurface.actions:[];
  return{
    schema:'field-urlbar-handoff/v0.1',
    authority:'NONE / ADDRESS + OFFER ONLY',
    object_ref:route?.href||null,
    object_title:route?.title||null,
    source:'FIELD URL BAR',
    actions:actions.slice(0,3).map(a=>({id:a.id,label:a.label,action:a.action,authority:a.authority,target:a.target,dispatch:a.dispatch,reversibility:a.reversibility})),
    return_to:actionSurface?.return?.address||route?.href||'/',
    law:'Receiver owns acceptance, tool policy, approval, mutation, undo and RETURN.'
  };
}
