import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {browserBin} from './browser-bin.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=process.cwd(),server=http.createServer((req,res)=>{
 const name=decodeURIComponent(new URL(req.url,'http://local').pathname),file=path.join(root,name,name.endsWith('/')?'index.html':'');
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return}
 res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'})[path.extname(file)]||'text/plain');fs.createReadStream(file).pipe(res);
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:browserBin(),args:['--no-sandbox','--disable-dev-shm-usage']});
const results=[];
try{
 for(const [width,height] of [[390,844],[320,640],[1280,900]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:width<760,acceptDownloads:true,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
  await page.goto(base+'/');await page.waitForFunction(()=>window.FieldWork?.snapshot()?.ready,{timeout:30000});
  const frame=page.frames().find(f=>new URL(f.url()).pathname==='/interphase/');assert.ok(frame,'root must contain the existing INTERPHASE host');
  await frame.waitForFunction(()=>window.InterphaseWorkbench?.snapshot().work);
  const initial=await frame.evaluate(()=>InterphaseWorkbench.snapshot());assert.equal(initial.mode,'WORK');assert.equal(initial.source.kind,'DATA_SOURCE');assert.ok(initial.work.result.value.length>3,'real CURRENT heads must be usable at entry');
  if(process.env.SCREENSHOT_DIR){fs.mkdirSync(process.env.SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,'interphase-landing-'+width+'.png')})}
  const raw=initial.source.payload.raw,source=initial.source.id,frameBefore=await page.evaluate(()=>FieldInstrument.snapshot().frame);
  assert.equal(await frame.locator('#focusTitle').textContent(),'CURRENT.json');
  await frame.locator('[data-panel="step"]').click();await frame.locator('#iwOp').selectOption('take');await frame.locator('#iwArg').fill('2');await frame.locator('#iwStepForm button[type="submit"]').count().then(async n=>{if(n)await frame.locator('#iwStepForm button[type="submit"]').click();else await frame.locator('#iwStepForm>button').click()});
  assert.equal(await frame.evaluate(()=>InterphaseWorkbench.work().snapshot().result.value.length),2);
  await frame.locator('[data-prefix="0"]').click();assert.ok(await frame.locator('tbody tr').count()>2,'prefix inspection must show its real intermediate output');
  await frame.locator('#iwFinal').click();assert.equal(await frame.locator('tbody tr').count(),2);
  await frame.locator('#iwUndo').click();assert.ok(await frame.locator('tbody tr').count()>2);
  await frame.evaluate(()=>InterphaseWorkbench.work().setSteps([...InterphaseWorkbench.work().snapshot().steps,{op:'take',count:2}]));
  await frame.locator('.iw-view>summary').click();await frame.locator('[data-view="ROOM"]').click();
  assert.equal(await frame.locator('.iw-face').count(),6);const cube=await frame.locator('.iw-net').getAttribute('data-geometry');
  if(process.env.SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,'interphase-room-'+width+'.png')});
  await frame.locator('#iwUnfold').click();assert.notEqual(await frame.locator('.iw-net').getAttribute('data-geometry'),cube);assert.equal(await frame.evaluate(()=>InterphaseWorkbench.work().snapshot().source),source);
  await frame.locator('.iw-room-controls [data-view="TABLE"]').click();
  await frame.locator('.iw-view>summary').click();await frame.locator('[data-view="READ"]').click();
  await frame.evaluate(()=>{const a=document.getElementById('iwReader');a.setPos(3)});const read=await frame.evaluate(()=>document.getElementById('iwReader').snapshot());
  await frame.locator('.iw-view>summary').click();await frame.locator('[data-view="TABLE"]').click();await frame.locator('.iw-view>summary').click();await frame.locator('[data-view="READ"]').click();
  assert.equal(await frame.evaluate(()=>document.getElementById('iwReader').snapshot().char_index),read.char_index,'READ projection must retain its cursor');
  assert.equal(await frame.evaluate(()=>InterphaseWorkbench.source().payload.raw),raw,'composition/view changes cannot rewrite source');
  assert.deepEqual(await page.evaluate(()=>FieldInstrument.snapshot().frame),frameBefore,'work views do not change FIELD navigation');
  await frame.locator('.iw-view>summary').click();const downloadPromise=page.waitForEvent('download');await frame.locator('#iwExport').click();const downloaded=await downloadPromise;
  const file=await downloaded.path(),packet=JSON.parse(fs.readFileSync(file,'utf8'));assert.equal(packet.input,raw);assert.equal(packet.steps.at(-1).op,'take');assert.equal(packet.projection.updatePolicy,'NONE');
  await frame.locator('[data-panel="source"]').click();
  const bad={...packet,source:{...packet.source,hash:'sha256:'+'0'.repeat(64)}};
  await frame.locator('#iwImport').setInputFiles({name:'bad-return.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});
  await frame.waitForFunction(()=>document.querySelector('.iw-error')?.textContent.includes('identity mismatch'));
  assert.equal(await frame.evaluate(()=>InterphaseWorkbench.source().id),source,'tampered import must keep held source');
  await frame.locator('#iwImport').setInputFiles(file);await frame.waitForFunction(()=>!document.querySelector('.iw-error').textContent);
  assert.equal(await frame.evaluate(()=>InterphaseWorkbench.source().id),source,'verified return restores exact source identity');
  assert.equal(await frame.evaluate(()=>document.getElementById('iwReader').snapshot().char_index),read.char_index,'RETURN restores the derived reader cursor');
  await frame.locator('[data-panel="source"]').click();await frame.locator('#iwFile').setInputFiles({name:'duplicate.json',mimeType:'application/json',buffer:Buffer.from('{"a":1,"a":2}')});await frame.waitForFunction(()=>document.querySelector('.iw-error').textContent.includes('ambiguous'));assert.equal(await frame.evaluate(()=>InterphaseWorkbench.source().id),source);
  // Native FIELD focus and the workbench refer to the same route through the
  // existing explicit address correspondence, not by equating their id formats.
  await page.evaluate(()=>FieldInstrument.hold('/house/'));
  await frame.waitForFunction(()=>InterphaseWorkbench.source().id==='route:/house/');
  await frame.evaluate(()=>InterphaseWorkbench.chooseRoute('/docs/'));
  await page.waitForFunction(()=>FieldInstrument.heldAddress()==='/docs/');
  assert.equal(await frame.evaluate(()=>InterphaseWorkbench.source().id),'route:/docs/');
  const pin=await page.evaluate(()=>FieldInstrument.snapshot().frame);await page.locator('#fiView').click();assert.equal(await page.evaluate(()=>FieldWork.active()),false);await page.locator('#fiView').click();assert.equal(await page.evaluate(()=>FieldInstrument.snapshot().map),'plan');await page.locator('#fiView').click();assert.equal(await page.evaluate(()=>FieldWork.active()),true);assert.deepEqual(await page.evaluate(()=>FieldInstrument.snapshot().frame),pin,'view cycle preserves native frame');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
  const sourceBytes=JSON.stringify(initial.source.payload.data);assert.ok(sourceBytes.length>1000);
  if(process.env.SCREENSHOT_DIR){fs.mkdirSync(process.env.SCREENSHOT_DIR,{recursive:true});await frame.evaluate(()=>InterphaseWorkbench.chooseRoute('/house/'));await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,'interphase-root-'+width+'.png')})}
  assert.deepEqual(errors,[],'browser errors '+width);results.push({width,height,source_composition_views_return_focus:'PASS'});await context.close();
 }
 console.log('INTERPHASE+ BROWSER PASS '+JSON.stringify(results));
}finally{await browser.close();await new Promise(r=>server.close(r))}
