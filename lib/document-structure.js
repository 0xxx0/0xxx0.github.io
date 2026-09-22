(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.FieldDocumentStructure=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const DOCUMENT_STRUCTURE_SCHEMA='field-document-structure/v0.1';
  const blank=s=>/^[ \t]*$/.test(String(s??''));
  const fmt=v=>{v=String(v||'AUTO').toUpperCase();return v==='MARKDOWN'?'MD':(v==='MD'||v==='TXT'?v:'AUTO')};

  function scanLines(text=''){
    const raw=String(text??''),out=[];let at=0;
    while(at<raw.length){
      const start=at;
      while(at<raw.length&&raw[at]!=='\n'&&raw[at]!=='\r')at++;
      const contentEnd=at;
      if(raw[at]==='\r'&&raw[at+1]==='\n')at+=2;
      else if(raw[at]==='\r'||raw[at]==='\n')at++;
      out.push({start,contentEnd,end:at,text:raw.slice(start,contentEnd)});
    }
    return out;
  }
  function structuralText(line,index){
    const s=String(line?.text||'');
    return index===0&&s.charCodeAt(0)===0xFEFF?s.slice(1):s;
  }
  function openFence(line){
    const m=String(line||'').match(/^ {0,3}((?:`{3,})|(?:~{3,}))(.*)$/);
    if(!m)return null;
    return {char:m[1][0],length:m[1].length};
  }
  function closesFence(line,fence){
    const m=String(line||'').match(/^ {0,3}([`~]+)[ \t]*$/);
    if(!m)return false;
    const run=m[1];
    return run[0]===fence.char&&run.length>=fence.length&&[...run].every(ch=>ch===fence.char);
  }
  function headingOf(line){
    const m=String(line||'').match(/^ {0,3}(#{1,6})(?:[ \t]+(.*)|[ \t]*$)$/);
    if(!m)return null;
    let label=String(m[2]||'').replace(/[ \t]+#+[ \t]*$/,'').trim();
    if(!label)label='UNTITLED SECTION';
    return {depth:m[1].length,label};
  }
  function scanHeadings(raw,lines,format){
    if(format==='TXT')return [];
    const out=[];let fence=null;
    for(let i=0;i<lines.length;i++){
      const line=lines[i],s=structuralText(line,i);
      if(fence){if(closesFence(s,fence))fence=null;continue}
      const op=openFence(s);if(op){fence=op;continue}
      const h=headingOf(s);if(h)out.push({...h,start:line.start,contentStart:line.end,lineIndex:i});
    }
    return out;
  }
  function scanParagraphs(raw,lines,headingStarts){
    const out=[];let pStart=null,pEnd=null,fence=null,codeStart=null;
    const flush=()=>{if(pStart!=null&&pEnd!=null&&pEnd>pStart){out.push({start:pStart,end:pEnd});pStart=pEnd=null}};
    for(let i=0;i<lines.length;i++){
      const line=lines[i],s=structuralText(line,i);
      if(fence){
        if(closesFence(s,fence)){out.push({start:codeStart,end:line.contentEnd});fence=null;codeStart=null}
        continue;
      }
      const op=openFence(s);
      if(op){
        flush();fence=op;codeStart=line.start;
        continue;
      }
      if(headingStarts.has(line.start)){flush();continue}
      if(blank(s)){flush();continue}
      if(pStart==null)pStart=line.start;
      pEnd=line.contentEnd;
    }
    if(fence&&codeStart!=null)out.push({start:codeStart,end:raw.length});
    flush();
    return out;
  }
  function realSections(raw,headings){
    const stack=[],out=[];
    for(let i=0;i<headings.length;i++){
      const h=headings[i];
      while(stack.length&&stack.at(-1).depth>=h.depth)stack.pop();
      const parent=stack.length?stack.at(-1).address:null;
      const address='section://'+i,end=headings[i+1]?.start??raw.length;
      const x={address,index:i,label:h.label,depth:h.depth,parent,start:h.start,contentStart:h.contentStart,end};
      out.push(x);stack.push(x);
    }
    return out;
  }
  function fallbackSections(paragraphs){
    if(!paragraphs.length)return [];
    if(paragraphs.length<4){
      return [{address:'section://0',index:0,label:'DOCUMENT',depth:0,parent:null,start:paragraphs[0].start,contentStart:paragraphs[0].start,end:paragraphs.at(-1).end}];
    }
    const out=[];
    for(let i=0;i<paragraphs.length;i+=4){
      const xs=paragraphs.slice(i,i+4),index=out.length;
      out.push({address:'section://'+index,index,label:'§ '+(index+1),depth:1,parent:null,start:xs[0].start,contentStart:xs[0].start,end:xs.at(-1).end});
    }
    return out;
  }
  function parseDocumentStructure(text,{format='AUTO'}={}){
    const raw=String(text??''),mode=fmt(format),lines=scanLines(raw);
    const headings=scanHeadings(raw,lines,mode),headingStarts=new Set(headings.map(x=>x.start));
    const paragraphs=scanParagraphs(raw,lines,headingStarts).map((p,index)=>({address:'para://'+index,index,start:p.start,end:p.end,section:null}));
    const sections=(mode!=='TXT'&&headings.length)?realSections(raw,headings):fallbackSections(paragraphs);
    for(const p of paragraphs){
      for(let i=sections.length-1;i>=0;i--){const s=sections[i];if(p.start>=s.start&&p.start<s.end){p.section=s.address;break}}
    }
    return {
      schema:DOCUMENT_STRUCTURE_SCHEMA,
      format:mode==='AUTO'?(headings.length?'MD':'TXT'):mode,
      chars:raw.length,
      sections,
      paragraphs,
      counts:{
        sections:sections.length,
        paragraphs:paragraphs.length,
        maxHeadingDepth:headings.length?Math.max(...headings.map(x=>x.depth)):0
      }
    };
  }
  return {DOCUMENT_STRUCTURE_SCHEMA,parseDocumentStructure,scanLines};
});
