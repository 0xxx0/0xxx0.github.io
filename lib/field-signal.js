(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.FieldSignal=api})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';const TOKENS=Object.freeze(['CLEAR','CHANGED','REALITY','EXTERNAL','MIXED']);function normalize(token){const t=String(token||'CLEAR').toUpperCase();if(t==='GITHUB')return'EXTERNAL';return TOKENS.includes(t)?t:'CLEAR'}function combine(flags={}){const a=[];if(flags.changed)a.push('CHANGED');if(flags.reality)a.push('REALITY');if(flags.external)a.push('EXTERNAL');return a.length>1?'MIXED':a[0]||'CLEAR'}function apply(el,token){const t=normalize(token);if(el)el.dataset.fieldSignal=t;return t}return Object.freeze({TOKENS,normalize,combine,apply})});

/* Root-only presentation bootstrap. FIELD URLBAR is a projection over the existing
   root acting hand; loading it here adds no signal semantics or authority. */
(()=>{'use strict';
if(typeof window==='undefined'||typeof document==='undefined'||location.pathname!=='/')return;
function load(){
 if(document.querySelector('script[data-field-urlbar]'))return;
 const s=document.createElement('script');s.src='./field-urlbar.js';s.dataset.fieldUrlbar='v0.1';document.head.appendChild(s);
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',load,{once:true}):queueMicrotask(load);
})();
