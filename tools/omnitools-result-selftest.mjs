import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
function host(file){
 const elements=new Map();const get=id=>{if(!elements.has(id))elements.set(id,{id,value:'',checked:id==='flat',textContent:'',innerHTML:'',classList:{toggle(){}},listeners:{},addEventListener(n,f){this.listeners[n]=f;}});return elements.get(id);};
 const ctx={window:{},document:{getElementById:get,addEventListener(){}},navigator:{},Intl,setTimeout:f=>{f();return 0;},clearTimeout(){},console};vm.createContext(ctx);
 const html=fs.readFileSync('foundry/omnitools/'+file,'utf8');const script=/<script>([\s\S]*?)<\/script>/.exec(html)[1];vm.runInContext(script,ctx);
 return{get,api:ctx.window.OmnitoolsTool,input(text){get('in').value=text;get('in').listeners.input?.();}};
}
const r=host('reshaper.html');
r.input('name,qty\n"rail, curved",2');assert.deepEqual(JSON.parse(r.api.getResult().text),[{name:'rail, curved',qty:'2'}]);
r.get('toCSV').onclick();assert.equal(r.api.getResult().text,'name,qty\n"rail, curved",2');
for(const text of ['{broken','a,a\n1,2','a,b\n1,2,3','a,b\n"unclosed,2']){r.input(text);assert.equal(r.api.getResult(),null);assert.equal(r.get('out').value,'');}
r.get('toJSON').onclick();r.input('{"empty":[],"nested":{}}');assert.deepEqual(JSON.parse(r.api.getResult().text),[{empty:[],nested:{}}]);
r.input('{"a":{"b":1},"a.b":2}');assert.equal(r.api.getResult(),null);
r.input('__proto__,qty\nkept,2');assert.equal(JSON.parse(r.api.getResult().text)[0].__proto__,'kept');
r.get('in').value='different bytes';assert.equal(r.api.getResult(),null);
const scan=host('pii-lens.html'),email=['fixture','example.com'].join('@'),source='Contact '+email+'\nSecond untouched line';scan.get('in').value=source;scan.get('scan').onclick();assert.ok(JSON.parse(scan.api.getResult().text).findings.some(f=>f.detector==='email'));scan.get('redact').onclick();assert.equal(scan.api.getResult().text,'Contact [email]\nSecond untouched line');assert.equal(scan.api.getResult().inputs.in,source);scan.get('in').value='changed';assert.equal(scan.api.getResult(),null);
const read=host('text-lens.html');read.input('One two three.');assert.equal(JSON.parse(read.api.getResult().text).words,3);assert.equal(read.api.getResult().inputs.in,'One two three.');read.get('in').value='edited';assert.equal(read.api.getResult(),null);
console.log('OMNITOOLS RESULT PASS · exact CSV/JSON · malformed/ragged/collision fail closed · empty containers · prototype header · full redaction/report · stale-input rejection');
