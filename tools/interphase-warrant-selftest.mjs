import assert from 'node:assert/strict';
import {relation,validRelation,relationDoors} from '../interphase/navigation.mjs';
import {linkOK} from '../lib/interphase-door.mjs';
const a='First claim.',b='Second claim.',raw=a+'\n'+b,hash='sha256:'+'a'.repeat(64);
const from={start:0,end:a.length,scope:'SENT'},to={start:a.length+1,end:raw.length,scope:'SENT'};
const model={raw,levels:[{id:'SENT',units:[from,to]}]};
const good=relation(model,hash,from,to,'contrasts','Different premises, same phenomenon.');
assert.equal(good.authority,'INTERPRETATION_ONLY');
assert.equal(good.warrant,'Different premises, same phenomenon.');
assert.ok(validRelation(model,hash,good));
assert.equal(relationDoors(model,hash,[good],from.start)[0].warrant,good.warrant);
assert.ok(validRelation(model,hash,relation(model,hash,from,to,'supports')),'legacy links must remain valid');
const other=relation(model,hash,from,to,'supports','Alternative authored reading');
assert.ok(validRelation(model,hash,other),'opposed readings stay distinct; no automatic synthesis');
for(const [mutation,label] of [[{warrant:' '.repeat(321)},'oversized'],[{warrant:' fabricated'},'noncanonical'],[{warrant:8},'nonstring'],[{from:{...good.from,quote:'false'}},'unbound quote']]){
 assert.equal(validRelation(model,hash,{...good,...mutation}),false,label);
}
assert.throws(()=>relation(model,hash,from,to,'contrasts','X'.repeat(321)),/320/);
const first={...good.from,address:'/first.md',hash},second={...good.to,address:'/second.md',hash:'sha256:'+'b'.repeat(64)};
const link={type:'contrasts',from:first,to:second,authority:'INTERPRETATION_ONLY',warrant:'Interpretations conflict; neither decides custody.'};
assert.ok(linkOK(link,'https://example.org'),'source warrants are allowed without changing authority');
assert.ok(linkOK({...link,warrant:undefined},'https://example.org'),'old DOOR packets import');
assert.equal(linkOK({...link,warrant:3},'https://example.org'),false);
assert.equal(linkOK({...link,warrant:'X'.repeat(321)},'https://example.org'),false);
assert.ok(linkOK({...link,to:{...second,quote:'fabricated'}},'https://example.org'),'structural check cannot certify remote bytes; separate revision check must do that');
console.log('INTERPHASE WARRANT SELFTEST PASS · bounded authored reasons, independent readings, legacy compatibility, unchanged authority');
