import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const json=p=>JSON.parse(read(p));
const fail=[],ok=(v,m)=>{if(!v)fail.push(m)};
const routes=json('port/routes.json'),schema=json('port/object.schema.json');
const port=read('port/index.html'),store=read('port/object-store.js'),ap=read('port/object-aperture.js');
const fi1=read('field-intake/app-1a.js'),fi5=read('field-intake/app-5.js');
const ids=routes.routes.map(x=>x.id);
ok(new Set(ids).size===ids.length,'route ids must be unique');
ok(JSON.stringify(schema.properties.media_class.enum)===JSON.stringify(['TEXT','JSON','IMAGE','FILE']),'media classes must be TEXT/JSON/IMAGE/FILE');
const intake=routes.routes.find(x=>x.id==='intake');
ok(!!intake,'FIELD INTAKE route missing');
for(const m of ['TEXT','JSON','IMAGE','FILE'])ok(intake?.accepts?.[m]==='DIRECT','FIELD INTAKE must directly accept '+m+' object envelope');
for(const r of routes.routes)for(const m of ['TEXT','JSON','IMAGE','FILE'])ok(['DIRECT','ADAPTER','NONE'].includes(r.accepts?.[m]),r.id+' invalid FIT for '+m);
ok(port.includes('FIT ')&&port.includes('CUES ')&&port.includes('HISTORY '),'Port must render FIT/CUES/HISTORY separately');
ok(port.includes('0xxx0/port-object-to-field-intake/v0.1')&&fi1.includes('0xxx0/port-object-to-field-intake/v0.1'),'Port→FIELD INTAKE handoff schema mismatch');
ok(fi5.includes('human-port-object-return/v0.1')&&port.includes('human.port.object.return.v01'),'FIELD INTAKE→Port RETURN mismatch');
ok(fi5.includes('result.receipt.receiptId'),'RETURN must use exact FIELD INTAKE receiptId');
ok(store.includes("crypto.subtle.digest('SHA-256'"),'local object store must SHA-256 exact bytes');
ok(store.includes("indexedDB.open"),'local file carrier must use IndexedDB');
ok(port.includes('PURGE BYTES')&&port.includes('PortObjectStore.remove'),'explicit byte PURGE missing');
ok(ap.includes("image://region/")&&ap.includes("pointerdown")&&ap.includes("pointerup"),'image region addressing missing');
ok(port.includes('id="inspectBtn"')&&port.includes('field-aperture.js'),'shared Field Aperture compatibility action missing');
ok(!/fetch\([^\n]*(method\s*:\s*['"](?:POST|PUT|PATCH|DELETE))/i.test(port),'Port must not perform network mutation');
ok(!/XMLHttpRequest|sendBeacon/.test(port),'Port must not contain direct upload transport');
try{new Function(store);new Function(ap);new Function(fi1);new Function(fi5);}catch(e){fail.push('JavaScript syntax: '+e.message)}
if(fail.length){console.error('HUMAN PORT OBJECT SELFTEST FAIL\n- '+fail.join('\n- '));process.exit(1)}
console.log('HUMAN PORT OBJECT SELFTEST PASS');
console.log('routes:',routes.routes.length,'media:',schema.properties.media_class.enum.join('/'));
