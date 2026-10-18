import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { encode64, decode64, parseShare, sealSnapshot, openSnapshot, ITERATIONS } from '../care/share-crypto.mjs';
const id='0123456789abcdef0123456789abcdef';
const phrase=encode64(randomBytes(24));
const payload={schema:'0xxx0/care-share/v0.1',case:{schema:'0xxx0/care-case/v0.3',id:'fixture',subject:{label:'Private synthetic sample 患者'},events:[]},full_record:'Synthetic sensitive material'};
const sealed=await sealSnapshot(payload,id,phrase);
assert.deepEqual(await openSnapshot(sealed,id,phrase),payload);
assert.deepEqual(parseShare('#brief='+id),{id});
assert.equal(JSON.stringify(sealed).includes(payload.full_record),false);
assert.equal(JSON.stringify(sealed).includes(phrase),false);
await assert.rejects(openSnapshot(sealed,id,encode64(randomBytes(24))));
await assert.rejects(openSnapshot(sealed,'abcdef0123456789abcdef0123456789',phrase));
const changed=decode64(sealed.ciphertext);changed[0]^=1;
await assert.rejects(openSnapshot({...sealed,ciphertext:encode64(changed)},id,phrase));
await assert.rejects(openSnapshot({...sealed,iv:encode64(new Uint8Array(12))},id,phrase));
await assert.rejects(openSnapshot({...sealed,schema:'other'},id,phrase));
await assert.rejects(openSnapshot({...sealed,iterations:ITERATIONS-1},id,phrase));
await assert.rejects(openSnapshot({...sealed,salt:encode64(new Uint8Array(1))},id,phrase));
await assert.rejects(openSnapshot(sealed,id,''));
// Cover the additive gzip variant with synthetic data; never need a real-family password.
const fixtureSalt=randomBytes(16),fixtureIv=randomBytes(12);
const deriveBase=await crypto.subtle.importKey('raw',new TextEncoder().encode(phrase),'PBKDF2',false,['deriveKey']);
const fixtureKey=await crypto.subtle.deriveKey(
 {name:'PBKDF2',hash:'SHA-256',salt:fixtureSalt,iterations:ITERATIONS},
 deriveBase,{name:'AES-GCM',length:256},false,['encrypt']
);
const {gzipSync}=await import('node:zlib');
const fixtureAad=new TextEncoder().encode('0xxx0/care-sealed/v0.2|'+id+'|PBKDF2-SHA256|'+ITERATIONS+'|AES-256-GCM');
const fixtureCipher=await crypto.subtle.encrypt(
 {name:'AES-GCM',iv:fixtureIv,additionalData:fixtureAad},fixtureKey,
 gzipSync(Buffer.from(JSON.stringify(payload)))
);
const compressed={...sealed,salt:encode64(fixtureSalt),iv:encode64(fixtureIv),ciphertext:encode64(new Uint8Array(fixtureCipher)),compression:'gzip'};
assert.deepEqual(await openSnapshot(compressed,id,phrase),payload);
await assert.rejects(openSnapshot({...compressed,compression:'unexpected'},id,phrase));
assert.throws(()=>parseShare('#brief=../../secrets'));
assert.throws(()=>parseShare('#brief='+id+'.'+phrase));
assert.throws(()=>parseShare('?brief='+id));
assert.throws(()=>parseShare('#brief='+id+'&extra=1'));
const root=fileURLToPath(new URL('../',import.meta.url));
const view=readFileSync(root+'care/brief-view.mjs','utf8');
assert.doesNotMatch(view,/\.innerHTML|\beval\s*\(|localStorage|sessionStorage|sendBeacon/);
assert.match(view,/credentials: 'omit'/);
assert.match(view,/referrerPolicy: 'no-referrer'/);
assert.match(view,/parsed.protocol!=='https:'/);
assert.match(view,/input.type = 'password'/);
assert.match(view,/openSnapshot\(envelope, id, input.value\)/);
assert.match(view,/input.value = ''/);
const index=readFileSync(root+'care/index.html','utf8');
assert.match(index,/if\(document.documentElement.dataset.careShare==='1'\)return;/);
assert.match(index,/<meta name="referrer" content="no-referrer">/);
assert.ok(index.indexOf("dataset.careShare='1'")<index.indexOf("const KEY='0xxx0.care"));
for(const filename of readdirSync(root+'care/sealed')){
 assert.match(filename,/^[a-f0-9]{32}\.json$/);
 const envelope=JSON.parse(readFileSync(root+'care/sealed/'+filename,'utf8'));
 const expected=['ciphertext','id','iterations','iv','kdf','salt','schema'];
 if(envelope.compression!==undefined){
   assert.equal(envelope.compression,'gzip','Only authenticated gzip envelopes are supported');
   expected.push('compression');
 }
 assert.deepEqual(Object.keys(envelope).sort(),expected.sort());
 assert.equal(envelope.iterations,ITERATIONS);
 assert.equal(envelope.id,filename.slice(0,-5));
}
console.log('CARE password share: round-trip, wrong-password/tamper rejection, fixed KDF, secret-free URL and private-state isolation PASS');
