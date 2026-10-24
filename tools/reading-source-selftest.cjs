const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={window:{},HTMLElement:class{},customElements:{get:()=>false,define(){}},TextEncoder,Intl};
ctx.globalThis=ctx;vm.runInNewContext(fs.readFileSync('field-aperture.js','utf8'),ctx);
const A=ctx.window.FieldAperture;
const raw=' {\r\n "a.b" : {"q]":"same \\"word\\""}, "a":{"b":"same word"}, "汉字":[null,false,1.2300e+2,"读这里 😀"]\r\n} ';
const source=A.analyze(raw),spans=A.jsonSpans(raw);
assert.equal(source.raw,raw,'JSON must retain exact whitespace, escapes and numeric spelling');
assert.equal(source.nodes.length,new Set(source.nodes.map(n=>n.path)).size,'special keys cannot collide');
assert.ok(source.nodes.some(n=>n.path==='$["a.b"]["q]"]'));
for(const n of source.nodes){
 assert.deepEqual(JSON.parse(raw.slice(n.start,n.end)),JSON.parse(JSON.stringify(n.value)),n.path+' value span');
 assert.equal(A.jsonNodeAt(spans,n.contentStart).path,n.path,n.path+' value address');
 if(n.keyStart!=null)assert.equal(A.jsonNodeAt(spans,n.keyStart+1).path,n.path,n.path+' key address');
}
const duplicates=A.jsonSpans('{"x":{"y":1},"x":{"z":2}}');
assert.equal(A.jsonNodeAt(duplicates,duplicates.find(n=>n.path==='$.x.y').start),null,'duplicate ancestor must fail closed');
assert.equal(A.analyze('{"x":1,"x":2}').nodes[1].start,undefined,'no fabricated unique span');
assert.throws(()=>A.jsonSpans('{broken}'));
for(const text of ['null','false','1e2','"😀汉字"','{}','[]']){
 const nodes=A.jsonSpans(text);assert.equal(nodes[0].start,0);assert.equal(nodes[0].end,text.length);
}
// Deterministic nested fixtures independently compare each source slice with
// JSON.parse's corresponding value. This catches escaping/offset regressions.
for(let seed=0;seed<64;seed++){
 const value={['k.'+seed]:[{['x['+seed+']']:String.fromCodePoint(0x1f300+seed)+' \\ "\n汉字'},seed%2===0,null],normal:{n:seed/7}};
 const raw=JSON.stringify(value,null,seed%5),model=A.analyze(raw);
 for(const node of model.nodes)assert.deepEqual(JSON.parse(raw.slice(node.start,node.end)),JSON.parse(JSON.stringify(node.value)));
}
assert.equal(A.analyze(raw,'SOURCE','en','TXT').kind,'TEXT','reading remains an explicit projection');
assert.equal(A.analyze(raw).kind,'JSON','native tree remains available');
assert.equal(A.orpParts('address').mark,'d');
for(const file of ['docs/index.html','rsvp/index.html']){
 const html=fs.readFileSync(file,'utf8');for(const [,attrs,js] of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g))if(!/\bsrc=|\btype=["']module/.test(attrs)&&js.trim())new vm.Script(js,{filename:file});
}
console.log('READING SOURCE PASS · exact spans, special keys, duplicate rejection, 64 nested fixtures, explicit text/tree, page syntax');
