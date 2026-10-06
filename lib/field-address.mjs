const TEXT_VERBS=new Map([
  ['HOLD','HOLD'],['FOCUS','HOLD'],['ADDRESS','HOLD'],
  ['TURN','TURN'],['OPEN','TURN'],['RUN','TURN'],
  ['TRACE','TRACE'],['PROVE','TRACE'],['WITNESS','TRACE'],
  ['RETURN','RETURN'],['BACK','RETURN'],['AGAIN','RETURN']
]);

export const VERB_GLYPH=Object.freeze({HOLD:'◎',TURN:'→',TRACE:'⋯',RETURN:'↩'});
export const GLYPH_VERB=Object.freeze({'◎':'HOLD','φ':'HOLD','→':'TURN','⋯':'TRACE','…':'TRACE','↩':'RETURN','↵':'RETURN'});
const text=v=>String(v??'').replace(/\s+/g,' ').trim();
const upper=v=>text(v).toUpperCase();

function cleanRoute(v){
  let s=text(v);if(!s)return'';
  try{
    if(/^https?:\/\//i.test(s)){
      const u=new URL(s);const focus=u.searchParams.get('focus');
      s=focus||u.pathname||'/';
    }else if(/^\?/.test(s)){
      const u=new URL('https://field.invalid/'+s);s=u.searchParams.get('focus')||'';
    }
  }catch(_){/* keep literal */}
  if(/^focus=/i.test(s))s=s.slice(s.indexOf('=')+1);
  try{s=decodeURIComponent(s)}catch(_){}
  return text(s);
}

export function parseFieldAddress(raw,current='/'){
  const source=text(raw);let verb='HOLD',query='';
  if(!source)return{raw:'',verb,glyph:VERB_GLYPH.HOLD,query:text(current)||'/',explicitVerb:false};

  const first=[...source][0];
  if(GLYPH_VERB[first]){
    verb=GLYPH_VERB[first];query=text(source.slice(first.length));
    return{raw:source,verb,glyph:VERB_GLYPH[verb],query:cleanRoute(query||current),explicitVerb:true};
  }

  const prefix=source.match(/^([A-Za-z]+)\s+(.+)$/);
  if(prefix&&TEXT_VERBS.has(upper(prefix[1]))){
    verb=TEXT_VERBS.get(upper(prefix[1]));query=prefix[2];
    return{raw:source,verb,glyph:VERB_GLYPH[verb],query:cleanRoute(query||current),explicitVerb:true};
  }

  const split=source.match(/^(.*?)\s*(?:>|→)\s*([A-Za-z]+|◎|φ|⋯|…|↩|↵)\s*$/);
  if(split){
    const token=upper(split[2]),mapped=TEXT_VERBS.get(token)||GLYPH_VERB[split[2]];
    if(mapped){verb=mapped;query=split[1];return{raw:source,verb,glyph:VERB_GLYPH[verb],query:cleanRoute(query||current),explicitVerb:true}}
  }

  const solo=TEXT_VERBS.get(upper(source));
  if(solo)return{raw:source,verb:solo,glyph:VERB_GLYPH[solo],query:text(current)||'/',explicitVerb:true};

  query=cleanRoute(source);
  return{raw:source,verb:'HOLD',glyph:VERB_GLYPH.HOLD,query,explicitVerb:false};
}

function aliases(r){
  const xs=[r?.href,r?.alias_of,r?.title,r?.role,r?.operation,r?.kind];
  return xs.filter(Boolean).map(v=>text(v).toLowerCase());
}
function scoreRoute(route,query){
  const q=text(query).toLowerCase();if(!q)return 0;
  const href=text(route?.href).toLowerCase(),title=text(route?.title).toLowerCase();
  if(href===q)return 1200;
  if(text(route?.alias_of).toLowerCase()===q)return 1150;
  if(title===q)return 1080;
  if(href.replace(/\/$/,'')===q.replace(/\/$/,''))return 1040;
  if(href.startsWith(q))return 920-Math.min(120,href.length-q.length);
  if(title.startsWith(q))return 880-Math.min(120,title.length-q.length);
  const tokens=q.split(/[\s/._-]+/).filter(Boolean);
  const hay=aliases(route).join(' ');
  if(tokens.length&&tokens.every(t=>hay.includes(t)))return 720-tokens.reduce((n,t)=>n+Math.max(0,12-t.length),0);
  if(hay.includes(q))return 520-Math.min(160,hay.indexOf(q));
  return 0;
}

export function resolveFieldRoutes(routes,query,{limit=8}={}){
  const list=Array.isArray(routes)?routes:[];
  return list.map((route,index)=>({route,index,score:scoreRoute(route,query)}))
    .filter(x=>x.score>0)
    .sort((a,b)=>b.score-a.score||a.index-b.index)
    .slice(0,Math.max(1,limit))
    .map(x=>x.route);
}

export function declaredFieldMoves(route){
  const exits=Array.isArray(route?.field?.exit_paths)?route.field.exit_paths:[];
  const rows=[];
  for(const x of exits){
    if(rows.length>=3)break;
    if(!x||typeof x!=='object'||upper(x.status||'AVAILABLE')!=='AVAILABLE')continue;
    const target=text(x.target||x.href);if(!target)continue;
    const label=text(x.via||x.class||route?.operation||'TURN');if(!label)continue;
    rows.push(Object.freeze({
      id:text(x.id||x.class||x.via||('move-'+(rows.length+1))),
      label,verb:'TURN',glyph:VERB_GLYPH.TURN,target,
      authority:'OFFER',commitBoundary:'HOST_NATIVE',reversibility:'EXACT_RETURN'
    }));
  }
  return rows;
}

export function formatFieldAddress(verb,href){
  const v=TEXT_VERBS.get(upper(verb))||upper(verb)||'HOLD';
  const glyph=VERB_GLYPH[v]||VERB_GLYPH.HOLD;
  return v==='HOLD'?text(href||'/'):`${glyph} ${text(href||'/')}`;
}

export function addressLaw(){
  return Object.freeze({
    identity:'URL / ?focus= remains canonical addressed focus',
    authority:'address grammar selects existing FIELD operations; it grants NONE',
    moves:'at most three host-declared moves',
    return:'RETURN targets the same addressed object',
    storage:'no second queue, history store, or command database'
  });
}
