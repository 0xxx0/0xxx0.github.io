(()=>{'use strict';
function clone(x){return JSON.parse(JSON.stringify(x))}
function serialize(region){return region.map(m=>'('+serialize(m.children||[])+')').join('')}
function regionAt(root,path){let region=root;for(const idx of path){const m=region[idx];if(!m)return null;region=m.children||[]}return region}
function find(region,base=[],depth=0,out=[]){
  region.forEach((m,i)=>find(m.children||[],base.concat(i),depth+1,out));
  for(let i=0;i<region.length-1;i++)if((region[i].children||[]).length===0&&(region[i+1].children||[]).length===0)out.push({kind:'CALL',path:base.slice(),index:i,depth});
  region.forEach((m,i)=>{const ch=m.children||[];if(ch.length===1&&(ch[0].children||[]).length===0)out.push({kind:'CROSS',path:base.slice(),index:i,depth})});
  return out;
}
function redexes(root){
  return find(root).sort((a,b)=>b.depth-a.depth||(a.kind===b.kind?0:(a.kind==='CALL'?-1:1))||a.index-b.index);
}
function apply(root,r){
  const region=regionAt(root,r.path);if(!region)return null;
  const before=serialize(root);
  if(r.kind==='CALL'){
    if(!region[r.index]||!region[r.index+1]||(region[r.index].children||[]).length||(region[r.index+1].children||[]).length)return null;
    region.splice(r.index+1,1);
  }else if(r.kind==='CROSS'){
    const m=region[r.index],ch=m?.children||[];if(ch.length!==1||(ch[0].children||[]).length!==0)return null;
    region.splice(r.index,1);
  }else return null;
  return{rule:r.kind,before,after:serialize(root)};
}
function step(root){const r=redexes(root)[0];return r?apply(root,r):null}
function normalize(source,max=256){
  const root=clone(source),trace=[];let guard=0;
  while(guard++<max){const x=step(root);if(!x)break;trace.push(x)}
  return{root,trace,serial:serialize(root),value:valueOf(root),terminated:guard<=max};
}
function valueOf(root){if(root.length===0)return'UNMARKED';if(root.length===1&&(root[0].children||[]).length===0)return'MARKED';return'UNRESOLVED'}
function mark(children=[]){return{children}}
globalThis.TriangleFormCore={clone,serialize,redexes,apply,step,normalize,valueOf,mark};
})();