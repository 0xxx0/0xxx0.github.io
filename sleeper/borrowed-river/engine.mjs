// Borrowed River — authored geography, reversible ink, deterministic voyages.
export const WIDTH = 3400, HEIGHT = 1000, INK = 790;
export const PORTS = [
  {id:'home',x:160,y:780,title:'The empty shore',word:'begin',line:'You have a boat. The river has yet to be drawn.'},
  {id:'reed',x:680,y:660,title:'Reed lantern',word:'listen',line:'The reeds lean toward a sound you cannot see.'},
  {id:'bell',x:1210,y:565,title:'The bell without a tower',word:'hold',line:'A bell keeps ringing after the hand has gone.'},
  {id:'willow',x:1200,y:880,title:'Willow landing',word:'release',line:'The branch bends. What it lets go becomes a boat.'},
  {id:'moon',x:1760,y:725,title:'The borrowed moon',word:'carry',line:'The moon in your bowl weighs nothing. Carry it anyway.'},
  {id:'rain',x:2260,y:560,title:'Rain pavilion',word:'remember',line:'Rain writes on the water. Nothing is lost by changing.'},
  {id:'stone',x:2270,y:875,title:'The patient stone',word:'wait',line:'Some passages open when you stop asking the stone to move.'},
  {id:'shrine',x:2830,y:720,title:'A light on the far shore',word:'return',line:'The light was never missing. It was waiting for a way home.'}
];
export const ROCKS = [
  {x:445,y:721,rx:69,ry:56,seed:3},
  {x:946,y:624,rx:68,ry:84,seed:5},
  {x:931,y:867,rx:91,ry:37,seed:7},
  {x:1495,y:605,rx:79,ry:70,seed:11},
  {x:1485,y:824,rx:82,ry:69,seed:13},
  {x:2002,y:694,rx:62,ry:96,seed:17},
  {x:2540,y:583,rx:82,ry:57,seed:19},
  {x:2540,y:823,rx:74,ry:85,seed:23}
];
export const dist = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
export const port = id => PORTS.find(p=>p.id===id);
export function length(points){return points.slice(1).reduce((n,p,i)=>n+dist(points[i],p),0);}
export function pointAt(points,d){for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],l=dist(a,b);if(d<=l){const t=l?d/l:0;return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,angle:Math.atan2(b.y-a.y,b.x-a.x)};}d-=l;}const p=points.at(-1);return {...p,angle:0};}
export function rockAt(p){return ROCKS.find(r=>((p.x-r.x)/(r.rx+13))**2+((p.y-r.y)/(r.ry+13))**2<1);}
export function inspect(points,from){
  if(!Array.isArray(points)||points.length<2||points.length>2500)return {ok:false,why:'Draw from your boat to a lantern.',kind:'short'};
  if(points.some(p=>!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)))return {ok:false,why:'That line is not readable.',kind:'invalid'};
  if(!port(from))return {ok:false,why:'Unknown departure.',kind:'invalid'};
  if(points.some(p=>p.x<70||p.x>3250||p.y<510||p.y>945))return {ok:false,why:'Keep the river inside the water.',kind:'shore'};
  if(dist(points[0],port(from))>4)return {ok:false,why:'Start at your boat.',kind:'start'};
  const cost=length(points);
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],n=Math.ceil(dist(a,b)/5);
    for(let j=0;j<=n;j++){const p={x:a.x+(b.x-a.x)*j/Math.max(1,n),y:a.y+(b.y-a.y)*j/Math.max(1,n)};
      if(p.y<510||p.y>945||p.x<70||p.x>3250)return {ok:false,why:'Keep the river in the pale water below the mountains.',kind:'shore',at:p,cost};
      if(rockAt(p))return {ok:false,why:'Ink can become water, but stone remains stone. Bend around it.',kind:'rock',at:p,cost};
    }
  }
  if(cost>INK)return {ok:false,why:'The brush is empty. Try a nearer lantern or a shorter bend.',kind:'ink',cost};
  const target=PORTS.find(p=>p.id!==from&&dist(points.at(-1),p)<48);
  if(!target)return {ok:false,why:'Finish your river at a lantern. Every landing renews the brush.',kind:'end',cost};
  const snapped=[...points.slice(0,-1),{x:target.x,y:target.y}];
  // Recheck the final snapped segment so docking cannot tunnel through stone.
  const a=snapped.at(-2),b=snapped.at(-1),n=Math.ceil(dist(a,b)/5);
  for(let j=0;j<=n;j++)if(rockAt({x:a.x+(b.x-a.x)*j/Math.max(1,n),y:a.y+(b.y-a.y)*j/Math.max(1,n)}))return {ok:false,why:'Give the landing a little more room around the stone.',kind:'rock',cost};
  const exact=length(snapped);
  if(exact>INK)return {ok:false,why:'The brush runs dry just before the landing. Shorten the bend.',kind:'ink',cost:exact};
  return {ok:true,to:target.id,cost:exact,points:snapped};
}
export function fresh(){return {schema:'sleeper.borrowed-river',version:1,at:'home',visited:['home'],legs:[],returning:false,complete:false};}
export function sail(state,points){
  if(state.complete||state.returning)return {ok:false,why:'This river is ready to bring you home.'};
  const proof=inspect(points,state.at);if(!proof.ok)return proof;
  const leg={from:state.at,to:proof.to,points:proof.points,cost:proof.cost};
  return {...proof,state:{...state,at:proof.to,visited:[...new Set([...state.visited,proof.to])],legs:[...state.legs,leg],returning:proof.to==='shrine'}};
}
export function homeward(state){if(!state.returning||!state.legs.length)return [];return state.legs.slice().reverse().flatMap(l=>l.points.slice().reverse());}
export function finish(state){if(!state.returning)return state;return {...state,at:'home',complete:true};}
export function validate(raw){
  if(raw?.schema==='sleeper.borrowed-river.return'&&raw.version===1)raw=raw.voyage;
  if(!raw||raw.schema!=='sleeper.borrowed-river'||raw.version!==1||!Array.isArray(raw.legs)||raw.legs.length>80)throw Error('Not a Borrowed River voyage.');
  let s=fresh();for(const l of raw.legs){if(!l||l.from!==s.at)throw Error('The river has a broken connection.');const r=sail(s,l.points);if(!r.ok||r.to!==l.to)throw Error('The river contains an impossible crossing.');s=r.state;}
  if(raw.complete&&!s.returning)throw Error('This voyage has not reached the far shore.');
  return raw.complete?finish(s):s;
}
export function witness(state){return {schema:'sleeper.borrowed-river.return',version:1,source:{title:'Borrowed River',kind:'original-authored-painting-game',historical:false},complete:state.complete,words:state.visited.filter(id=>id!=='home').map(id=>port(id).word),distance:Math.round(state.legs.reduce((n,l)=>n+l.cost,0)),crossings:state.legs.length,branch:state.visited.includes('bell')?'hold':state.visited.includes('willow')?'release':'unvisited',voyage:state};}
