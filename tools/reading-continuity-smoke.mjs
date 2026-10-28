import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {browserBin} from './browser-bin.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=process.cwd(),raw='{\r\n  "a.b" : {"q]":"first value"}, "a":{"b":"second value"}, "汉字":[null,false,1.2300e+2,"读这里 😀"]\r\n}';
const server=http.createServer((req,res)=>{
 const name=decodeURIComponent(new URL(req.url,'http://local').pathname);
 if(name==='/__reading_fixture.json'){res.setHeader('Content-Type','application/json');res.end(raw);return}
 const file=path.join(root,name,name.endsWith('/')?'index.html':'');
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return}
 res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'})[path.extname(file)]||'text/plain');fs.createReadStream(file).pipe(res);
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:browserBin(),args:['--no-sandbox','--disable-dev-shm-usage']});
const results=[];
try{
 for(const [width,height] of [[320,640],[390,844],[1280,800]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:width<760}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
  await page.goto(base+'/docs/?src=/__reading_fixture.json');
  await page.waitForFunction(()=>window.ReadfieldControls&&document.getElementById('docAperture').A?.raw.includes('second value'));
  assert.equal(await page.locator('#text').textContent(),raw);
  const select=at=>page.evaluate(at=>{const a=document.getElementById('docAperture');a.setScale(a.scaleIndex('WORD'));a.selectChar(at);return a.snapshot()},at);
  const before=await select(raw.indexOf('second value')+2);
  await page.locator('#jsonProjection').click();
  assert.equal(await page.evaluate(()=>document.getElementById('docAperture').snapshot().address),'$.a.b');
  await page.locator('#jsonProjection').click();
  assert.equal(await page.evaluate(()=>document.getElementById('docAperture').snapshot().char_index),before.char_index,'unchanged STRUCT round trip');
  await page.locator('#jsonProjection').click();
  await page.evaluate(()=>document.getElementById('docAperture').seekPath('$["a.b"]["q]"]'));
  await page.locator('#jsonProjection').click();
  assert.match(await page.evaluate(()=>document.getElementById('docAperture').snapshot().focus),/first/,'tree selection must carry into reading');
  const start=await select(raw.indexOf('second value')+2);
  await page.locator('.rf-source-tools summary').click();await page.locator('#wristLink').click();await page.waitForURL('**/rsvp/?handoff=1');
  await page.waitForFunction(()=>document.getElementById('drawer').hidden&&document.getElementById('wristAperture').A);
  const wrist=await page.evaluate(()=>document.getElementById('wristAperture').snapshot());
  assert.equal(wrist.char_index,start.char_index);assert.equal(wrist.focus,start.focus);assert.equal(wrist.wpm,start.wpm);
  assert.equal(await page.evaluate(()=>document.getElementById('wristAperture').A.raw),raw);
  assert.equal(await page.locator('#label').textContent(),'$.a.b');
  await page.locator('main #next').click();const moved=await page.evaluate(()=>document.getElementById('wristAperture').snapshot());
  await page.reload();await page.waitForFunction(()=>document.getElementById('drawer').hidden&&document.getElementById('wristAperture').A);
  assert.equal(await page.evaluate(()=>document.getElementById('wristAperture').snapshot().char_index),moved.char_index,'shared trail survives reload');
  await page.locator('main #show').click();await page.locator('#readfield').click();await page.waitForURL('**/docs/**');
  await page.waitForFunction(()=>document.documentElement.dataset.readfieldHandoff==='focus-restored');
  const returned=await page.evaluate(()=>document.getElementById('docAperture').snapshot());
  assert.equal(returned.char_index,moved.char_index);assert.equal(await page.locator('#text').textContent(),raw);
  assert.equal(await page.evaluate(()=>new URL(location.href).searchParams.get('src')),'/__reading_fixture.json','source address survives return');
  assert.deepEqual(errors,[],'browser errors '+width);results.push({width,height,roundtrip:'PASS'});await context.close();
 }
 // Keep the existing native READ/RIDE return contract under the same real
 // browser driver; the historical dump-DOM runner can time out at teardown.
 {
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
  const passage='Alpha opens the gate.\n\nBravo carries the source.\n\nCharlie records the address.\n\nDelta returns home.';
  await page.goto(base+'/docs/');await page.waitForFunction(()=>window.ReadfieldControls);
  await page.evaluate(text=>{document.getElementById('pasteText').value=text;document.getElementById('readPaste').click();const a=document.getElementById('docAperture');a.setScale(a.scaleIndex('PARA'));a.setPos(0)},passage);
  await page.locator('[data-action="more"]').click();await page.locator('[data-action="ride"]').click();
  await page.waitForFunction(()=>location.pathname==='/fold-bloom/live/'&&window.FoldBloomLive?.read?.current?.());
  const final=await page.evaluate(()=>{FoldBloomLive.course.step(1);const s=FoldBloomLive.read.current();return{start:s.witness.start,end:s.witness.end}});
  await page.evaluate(()=>document.getElementById('readfieldReturn').click());
  await page.waitForFunction(()=>location.pathname==='/docs/'&&document.documentElement.dataset.readfieldRideReturn==='accepted');
  assert.deepEqual(await page.evaluate(()=>(({start,end})=>({start,end}))(document.getElementById('docAperture').snapshot().span)),final);
  assert.equal(await page.locator('#text').textContent(),passage);results.push({native_read_ride_return:'PASS'});await context.close();
 }
 // The wrist projection must remain usable at an actual small viewport. Local
 // file, playback, keyboard/crown, malformed JSON and tampered handoffs are real
 // browser paths; they do not claim physical-watch usability.
 const context=await browser.newContext({viewport:{width:180,height:180},hasTouch:true}),page=await context.newPage();
 await page.goto(base+'/rsvp/');await page.locator('#file').setInputFiles({name:'local.json',mimeType:'application/json',buffer:Buffer.from(raw)});
 await page.waitForFunction(()=>document.getElementById('drawer').hidden);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),180);
 for(const id of ['prev','play','next','show']){
  const r=await page.locator('main #'+id).boundingBox();assert.ok(r.x>=0&&r.y>=0&&r.x+r.width<=180.5&&r.y+r.height<=180.5,'unreachable wrist control '+id);
 }
 await page.locator('main #play').click();await page.waitForFunction(()=>document.getElementById('wristAperture').snapshot().index>0);
 await page.locator('main #play').click();assert.equal(await page.evaluate(()=>document.getElementById('wristAperture').snapshot().playing),false);
 await page.locator('main #show').click();await page.locator('#file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{broken}')});
 await page.waitForFunction(()=>document.getElementById('error').textContent.includes('Invalid'));
 assert.equal(await page.evaluate(()=>document.getElementById('wristAperture').A.raw),raw,'failed load keeps current source');
 await page.evaluate(raw=>{sessionStorage.setItem('rsvp.handoff.v1',JSON.stringify({raw,label:'tampered.json',hash:'sha256:'+'0'.repeat(64)}))},raw);
 await page.goto(base+'/rsvp/?handoff=1');await page.waitForFunction(()=>document.getElementById('error').textContent.includes('identity mismatch'));
 assert.equal(await page.evaluate(()=>document.getElementById('wristAperture').A),null,'tampered source never loaded');
 results.push({width:180,height:180,layout_playback_identity:'PASS'});await context.close();
 console.log('READING CONTINUITY PASS '+JSON.stringify(results));
}finally{await browser.close();await new Promise(r=>server.close(r))}
