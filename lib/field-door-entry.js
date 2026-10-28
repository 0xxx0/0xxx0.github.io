/* FIELD→source DOOR. Address only: never ranks routes or claims effects. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.FieldDoorEntry=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function urlFor(href){
  const route=href==null?'/':String(href);
  if(!/^\/(?:[a-zA-Z0-9._~-]+\/)*[a-zA-Z0-9._~-]*$/.test(route)||route.split('/').some(s=>s==='.'||s==='..'))return '';
  const ret=route==='/'?'/':'/?focus='+encodeURIComponent(route);
  return '/interphase/?route='+encodeURIComponent(route)+'&return='+encodeURIComponent(ret);
 }
 return Object.freeze({urlFor});
});
