const E=require('../lib/source-echo.js');const I=require('../prison-age/echo-index.json');const assert=(x,m)=>{if(!x)throw Error(m)};
const v=E.validateIndex(I);assert(v.ok,'index '+v.errors.join('|'));
const a=E.best(I,{sourceId:'open-air',text:'He opened the door.'});assert(a&&a.entry.source_id!=='open-air','cross-source door echo');
const b=E.best(I,{sourceId:'last-stall',text:'PooBaby looked at Camera Eight.'});assert(b&&b.entry.source_id!=='last-stall','camera echo');
const c=E.rank(I,{sourceId:'open-air',text:'quasar plutonium xylophone'});assert(c.length===0,'silence on no evidence');
assert(a.entry.address.startsWith('source-echo://'),'exact echo address');
console.log('SOURCE ECHO PASS ·',a.entry.source_id,a.shared.join(','),'·',b.entry.source_id,b.shared.join(','));
