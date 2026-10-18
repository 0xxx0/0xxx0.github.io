// Exercise the real runner's failure boundary with temporary mutations only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
const source=fs.readFileSync(new URL('./browser-smoke.mjs',import.meta.url),'utf8');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'condition-controls-'));
function run(name,code,selected){
 for(const module of ['browser-report.mjs','browser-bin.mjs'])code=code.replace(`'./${module}'`,JSON.stringify(pathToFileURL(fileURLToPath(new URL(module,import.meta.url))).href));
 const file=path.join(dir,name+'.mjs');fs.writeFileSync(file,code);
 const r=spawnSync(process.execPath,[file],{encoding:'utf8',timeout:30000,env:{...process.env,SMOKE_ONLY:selected,SMOKE_PORT:'0',SMOKE_SLOW:'1'}});
 assert.equal(r.status,1,name+': '+r.stdout+r.stderr);
 assert.match(r.stdout,/pass=0/);assert.doesNotMatch(r.stdout,/SMOKE TIMEOUT/);
 return r.stdout+r.stderr;
}
try{
 const native=source.replace('<main id="viewportFixture">','<pre id="probeResult">FAIL injected native result</pre><main id="viewportFixture">');
 assert.notEqual(native,source);
 run('native-fail',native,'SMOKE HARNESS exact narrow viewport');
 const exception=source.replace(' const textAtId=(${textAtId.toString()}),visibleText=(${visibleText.toString()});','');
 assert.notEqual(exception,source);
 assert.match(run('predicate-error',exception,'FIELD'),/SMOKE CHECK ERROR.*textAtId/);
 console.log('BROWSER CONDITION PASS: native FAIL and predicate exception reject even when the Node-side DOM predicate could pass; no timeout substitute');
}finally{fs.rmSync(dir,{recursive:true,force:true})}
