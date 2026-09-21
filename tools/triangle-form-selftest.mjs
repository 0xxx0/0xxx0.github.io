#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import vm from 'node:vm';
const src=fs.readFileSync(new URL('../forward-field-proof/triangle/triangle-form-core.js',import.meta.url),'utf8');
const ctx={};ctx.globalThis=ctx;vm.runInNewContext(src,ctx);
const F=ctx.TriangleFormCore, M=(...children)=>F.mark(children);
const cases=[
 {name:'blank stays unmarked',source:[],serial:'',value:'UNMARKED'},
 {name:'single mark stays marked',source:[M()],serial:'()',value:'MARKED'},
 {name:'CALL',source:[M(),M()],serial:'()',value:'MARKED',rules:['CALL']},
 {name:'CROSS',source:[M(M())],serial:'',value:'UNMARKED',rules:['CROSS']},
 {name:'CALL then CROSS',source:[M(M(),M())],serial:'',value:'UNMARKED',rules:['CALL','CROSS']},
 {name:'triple nesting',source:[M(M(M()))],serial:'()',value:'MARKED',rules:['CROSS']}
];
let fail=[];
for(const c of cases){
 const r=F.normalize(c.source),rules=r.trace.map(x=>x.rule);
 const ok=r.serial===c.serial&&r.value===c.value&&(!c.rules||JSON.stringify(rules)===JSON.stringify(c.rules));
 console.log(ok?'PASS':'FAIL',c.name,F.serialize(c.source),'→',r.serial||'[blank]',r.value,rules.join('→')||'—');
 if(!ok)fail.push(c.name);
 const twice=F.normalize(r.root);
 if(twice.serial!==r.serial||twice.value!==r.value)fail.push(c.name+' idempotence');
}
if(fail.length){console.error('TRIANGLE FORM SELFTEST FAIL\n- '+fail.join('\n- '));process.exit(1)}
console.log('TRIANGLE FORM SELFTEST PASS · cases:',cases.length);
