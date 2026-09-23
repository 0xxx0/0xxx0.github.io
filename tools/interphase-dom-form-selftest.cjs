const assert=require('node:assert/strict');
const DOM=require('../lib/interphase-dom.js');

const doc={
  location:{origin:'https://example.test',pathname:'/checkout',href:'https://example.test/checkout'},
  documentElement:{},
  querySelector:()=>null,
  elementsFromPoint:()=>[]
};
const attr=()=>null;
const form={
  nodeType:1,tagName:'FORM',id:'checkout',children:[],parentElement:null,
  getAttribute:attr,innerText:'Checkout',textContent:'Checkout',isContentEditable:false
};
const adapter=DOM.create(doc);
const d=adapter.describe(form);
assert.equal(d.kind,'nested');
assert.ok(d.operations.some(x=>x.id==='SUBMIT'&&x.authority==='EFFECT'&&x.reversible===false));
assert.equal(adapter.invoke(form,'SUBMIT',{},{}).reason,'EXPLICIT_COMMIT_REQUIRED');
assert.equal(adapter.invoke(form,'SUBMIT',{}, {commit:true}).reason,'GENERIC_DOM_EFFECT_DISABLED');

const input={
  nodeType:1,tagName:'INPUT',id:'email',children:[],parentElement:form,
  getAttribute:k=>k==='type'?'email':null,innerText:'',textContent:'',isContentEditable:false,
  type:'email',value:'before@example.test',disabled:false,dispatchEvent:()=>{}
};
const id=adapter.idOf(input),di=adapter.describe(input);
assert.ok(di.capabilities.includes('edit'));
assert.equal(di.authority,'EDIT');
assert.equal(adapter.write(input,{value:'after@example.test'},{commit:true}).ok,true);
assert.equal(input.value,'after@example.test');
assert.equal(adapter.idOf(input),id);
console.log('INTERPHASE DOM FORM SELFTEST PASS');