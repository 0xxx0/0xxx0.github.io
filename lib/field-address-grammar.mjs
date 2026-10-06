/* FIELD ADDRESS GRAMMAR v0.1
 * Pure parser + route ranker for the root FIELD address line.
 * It creates no state, authority, queue, history or executor surface.
 */
export const SIGILS=Object.freeze({
  '位':'ADDRESS','讀':'READ','验':'PROVE','驗':'PROVE','行':'TURN','回':'RETURN',
  '復':'RECOVER','复':'RECOVER','映':'PROJECT','戲':'PLAY','戏':'PLAY','收':'CAPTURE','化':'TRANSFORM'
});

export const COMMANDS=Object.freeze({
  hold:'HOLD',work:'READ',read:'READ',prove:'PROVE',verify:'PROVE',turn:'TURN',move:'TURN',
  return:'RETURN',back:'RETURN',recover:'RECOVER',map:'PROJECT',project:'PROJECT',
  desk:'DESK',current:'CURRENT',returns:'RETURNS',play:'PLAY',root:'ROOT',help:'HELP'
});

const text=v=>String(v??'').replace(/\s+/g,' ').trim();
const fold=v=>text(v).toLocaleLowerCase();

export function normalizeFieldRoute(raw,base='https://field.invalid/'){
  const value=text(raw);if(!value)return null;
  try{
    const u=new URL(value,base);
    if(u.origin!==new URL(base).origin&&/^[a-z][a-z0-9+.-]*:/i.test(value))return null;
    let p=u.pathname||'/';
    p='/'+p.replace(/^\/+/, '');
    if(!/\.[a-z0-9]{1,8}$/i.test(p)&&!p.endsWith('/'))p+='/';
    return p+u.search+u.hash;
  }catch{return null}
}

export function parseFieldAddress(raw){
  const source=text(raw);
  if(!source)return Object.freeze({kind:'EMPTY',verb:'ADDRESS',query:'',source});

  const glyph=[...source][0];
  if(SIGILS[glyph])return Object.freeze({kind:'GLYPH',verb:SIGILS[glyph],glyph,query:text(source.slice(glyph.length)),source});

  if(source.startsWith(':')){
    const body=text(source.slice(1)),space=body.search(/\s/),name=(space<0?body:body.slice(0,space)).toLowerCase(),query=space<0?'':text(body.slice(space+1));
    return Object.freeze({kind:'COMMAND',verb:COMMANDS[name]||'UNKNOWN',command:name,query,source});
  }
  if(source.startsWith('?'))return Object.freeze({kind:'SEARCH',verb:'SEARCH',query:text(source.slice(1)),source});
  if(source.startsWith('>'))return Object.freeze({kind:'TURN',verb:'TURN',query:text(source.slice(1)),source});
  if(source==='<'||/^return\b/i.test(source))return Object.freeze({kind:'RETURN',verb:'RETURN',query:text(source.replace(/^<?\s*return\s*/i,'')),source});

  const route=normalizeFieldRoute(source);
  if(route&&(/^\.?\//.test(source)||/^https?:\/\//i.test(source)))return Object.freeze({kind:'ROUTE',verb:'ADDRESS',route,query:route,source});
  return Object.freeze({kind:'SEARCH',verb:'SEARCH',query:source,source});
}

function tokens(v){return fold(v).split(/[^\p{L}\p{N}]+/u).filter(Boolean)}
function subsequenceScore(hay,needle){
  if(!needle)return 0;let at=0,gaps=0,first=-1;
  for(let i=0;i<hay.length&&at<needle.length;i++)if(hay[i]===needle[at]){if(first<0)first=i;if(at&&i>0)gaps++;at++}
  return at===needle.length?Math.max(1,90-first-gaps):0;
}
export function scoreFieldRoute(route,query){
  const q=fold(query);if(!q)return 1;
  const href=fold(route?.href),title=fold(route?.title),operation=fold(route?.operation),kind=fold(route?.kind),state=fold(route?.state),role=fold(route?.role);
  if(q===href)return 2000;if(q===title)return 1800;
  let score=0;
  if(href.startsWith(q))score=Math.max(score,1500-q.length/100);
  if(title.startsWith(q))score=Math.max(score,1350-q.length/100);
  if(href.includes(q))score=Math.max(score,1050-q.length/100);
  if(title.includes(q))score=Math.max(score,950-q.length/100);
  const qs=tokens(q),routeTokens=tokens([href,title,operation,kind,state].join(' '));
  if(qs.length&&qs.every(t=>routeTokens.some(r=>r.startsWith(t))))score=Math.max(score,760+qs.length*15);
  if(operation===q||kind===q||state===q)score=Math.max(score,700);
  if(operation.includes(q)||kind.includes(q)||state.includes(q))score=Math.max(score,560);
  if(role.includes(q))score=Math.max(score,300);
  score=Math.max(score,subsequenceScore(title,q),subsequenceScore(href,q));
  return score;
}

export function rankFieldRoutes(routes,query,limit=7){
  const max=Math.max(1,Math.min(20,Number(limit)||7));
  return (Array.isArray(routes)?routes:[])
    .map((route,index)=>({route,index,score:scoreFieldRoute(route,query)}))
    .filter(x=>x.score>0)
    .sort((a,b)=>b.score-a.score||a.index-b.index)
    .slice(0,max)
    .map(x=>x.route);
}

export function addressMode(parsed){
  const verb=parsed?.verb||'ADDRESS';
  return Object.freeze({
    ADDRESS:['位','ADDRESS'],SEARCH:['?','FIND'],HOLD:['位','HOLD'],READ:['讀','WORK'],PROVE:['驗','PROVE'],
    TURN:['行','TURN'],RETURN:['回','RETURN'],RECOVER:['復','RECOVER'],PROJECT:['映','PROJECT'],PLAY:['戲','PLAY'],
    CAPTURE:['收','CAPTURE'],TRANSFORM:['化','TRANSFORM'],DESK:['工','DESK'],CURRENT:['Φ','CURRENT'],RETURNS:['回','RETURNS'],
    ROOT:['田','ROOT'],HELP:['·','HELP'],UNKNOWN:['?','UNKNOWN']
  }[verb]||['?','FIND']);
}
