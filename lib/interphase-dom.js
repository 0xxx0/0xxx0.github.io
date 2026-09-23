(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.InterphaseDOM=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const cssEsc=s=>globalThis.CSS?.escape?CSS.escape(String(s)):String(s).replace(/[^a-zA-Z0-9_-]/g,'\\$&');
  const text=x=>String(x??'').replace(/\s+/g,' ').trim();
  const clip=(s,n=240)=>text(s).slice(0,n);
  const uniq=xs=>[...new Set(xs.filter(Boolean))];

  function create(doc=globalThis.document,opt={}){
    if(!doc)throw new Error('DOM_DOCUMENT_REQUIRED');
    const origin=opt.origin||doc.location?.origin||'local',path=doc.location?.pathname||'/';
    const ids=new WeakMap(),refs=new Map();

    function selector(el){
      if(!el||el.nodeType!==1)return 'unknown';
      if(el.id)return '#'+cssEsc(el.id);
      const dt=el.getAttribute('data-testid');if(dt)return '[data-testid="'+String(dt).replace(/"/g,'\\"')+'"]';
      const name=el.getAttribute('name');if(name&&['INPUT','SELECT','TEXTAREA','BUTTON','FORM'].includes(el.tagName))return el.tagName.toLowerCase()+'[name="'+String(name).replace(/"/g,'\\"')+'"]';
      const seg=[];let n=el,guard=0;
      while(n&&n.nodeType===1&&n!==doc.documentElement&&guard++<8){
        let s=n.tagName.toLowerCase();
        const p=n.parentElement;
        if(p){const same=[...p.children].filter(x=>x.tagName===n.tagName);if(same.length>1)s+=':nth-of-type('+(same.indexOf(n)+1)+')'}
        seg.unshift(s);n=p;
      }
      return seg.join('>')||el.tagName.toLowerCase();
    }
    function idOf(el){
      if(typeof el==='string')return el;
      if(ids.has(el))return ids.get(el);
      const id='dom:'+origin+path+'::'+selector(el);ids.set(el,id);refs.set(id,el);return id;
    }
    function resolve(ref){
      if(ref&&ref.nodeType===1)return ref;
      const id=String(ref||'');if(refs.has(id)&&refs.get(id)?.isConnected)return refs.get(id);
      const marker=id.indexOf('::');if(marker>=0){try{const el=doc.querySelector(id.slice(marker+2));if(el){ids.set(el,id);refs.set(id,el);return el}}catch(_){}}
      throw new Error('DOM_REF_UNRESOLVED:'+id);
    }
    function kind(el){
      const t=el.tagName;
      if(t==='IMG'||t==='CANVAS'||t==='SVG')return 'image';
      if(t==='AUDIO'||t==='VIDEO')return 'timed';
      if(t==='INPUT'||t==='TEXTAREA'||t==='SELECT'||el.isContentEditable)return 'input';
      if(t==='BUTTON'||t==='A')return 'action';
      if(['UL','OL','TABLE','SECTION','ARTICLE','NAV','MAIN','ASIDE','FORM'].includes(t)||el.children.length>2)return 'nested';
      return 'content';
    }
    function channels(el){
      const k=kind(el),out=['identity','address'];
      if(k!=='image')out.push('content');
      if(k==='image')out.push('raster');
      if(k==='timed')out.push('time','content');
      if(k==='nested')out.push('depth','content');
      if(k==='input'||k==='action')out.push('authority');
      return uniq(out);
    }
    function editable(el){
      if(el.isContentEditable)return true;
      if(el.tagName==='TEXTAREA'||el.tagName==='SELECT')return !el.disabled;
      if(el.tagName==='INPUT')return !el.disabled&&!['button','submit','reset','file','hidden','image'].includes(String(el.type||'text').toLowerCase());
      return false;
    }
    function read(el){
      const k=kind(el),r={id:idOf(el),kind:k,tag:el.tagName.toLowerCase(),text:clip(el.innerText||el.textContent||'',1000)};
      if('value'in el&&k==='input')r.value=el.value;
      if('checked'in el)r.checked=!!el.checked;
      if(el.tagName==='SELECT')r.selectedIndex=el.selectedIndex;
      if(el.tagName==='A')r.href=el.href;
      if(el.tagName==='IMG')r.src=el.currentSrc||el.src;
      if(el.tagName==='AUDIO'||el.tagName==='VIDEO'){r.currentTime=Number(el.currentTime)||0;r.duration=Number.isFinite(el.duration)?el.duration:null;r.paused=!!el.paused}
      return r;
    }
    function describe(el){
      const k=kind(el),id=idOf(el),r=read(el),caps=['read'];if(editable(el))caps.push('edit');
      const operations=[];
      if(k==='action')operations.push({id:'ACT',authority:'EFFECT',reversible:false});
      if(el.tagName==='FORM')operations.push({id:'SUBMIT',authority:'EFFECT',reversible:false});
      if(k==='timed')operations.push({id:'SEEK',authority:'EDIT',reversible:true});
      return {
        id,kind:k,label:clip(el.getAttribute('aria-label')||el.getAttribute('alt')||r.text||el.getAttribute('title')||el.tagName,90),
        address:{selector:selector(el),url:doc.location?.href||null},
        channels:channels(el),capabilities:caps,operations,
        authority:k==='action'?'EFFECT':editable(el)?'EDIT':'VIEW',
        parent:el.parentElement?idOf(el.parentElement):null,
        children:[...el.children].slice(0,24).map(idOf),
        clock:k==='timed'?{type:'MEDIA',current:r.currentTime,duration:r.duration}:null,
        value:r
      };
    }
    function write(el,patch={}){
      if(!editable(el))return{ok:false,reason:'READ_ONLY'};
      const before=read(el);
      if(el.isContentEditable&&patch.text!=null)el.textContent=String(patch.text);
      else if(el.tagName==='INPUT'&&['checkbox','radio'].includes(String(el.type).toLowerCase())&&patch.checked!=null)el.checked=!!patch.checked;
      else if('value'in el&&patch.value!=null)el.value=String(patch.value);
      else return{ok:false,reason:'UNSUPPORTED_PATCH'};
      for(const type of ['input','change'])el.dispatchEvent(new Event(type,{bubbles:true,composed:true}));
      return{ok:true,evidence:{source:'direct DOM write',before,after:read(el)}};
    }
    function invoke(el,operation,args={},ctx={}){
      if(operation==='SEEK'&&(el.tagName==='AUDIO'||el.tagName==='VIDEO')){
        const t=Math.max(0,Number(args.time)||0);el.currentTime=t;return{ok:true,evidence:{source:'media currentTime',time:t}};
      }
      if(operation==='ACT'||operation==='SUBMIT')return{ok:false,reason:ctx.commit?'GENERIC_DOM_EFFECT_DISABLED':'EXPLICIT_COMMIT_REQUIRED'};
      return{ok:false,reason:'SUPPORT=0:'+operation};
    }
    function atPoint(x,y,exclude){
      const els=doc.elementsFromPoint(x,y).filter(el=>el.nodeType===1&&!exclude?.(el));
      return els[0]||null;
    }
    return Object.freeze({id:'dom',idOf,resolve,describe,read,write,invoke,selector,atPoint,root:()=>doc.body});
  }
  return Object.freeze({create});
});