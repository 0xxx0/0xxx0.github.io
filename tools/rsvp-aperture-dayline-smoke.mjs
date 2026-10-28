import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {browserBin} from './browser-bin.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=process.cwd();
const server=http.createServer((req,res)=>{
 const u=new URL(req.url,'http://localhost'),name=decodeURIComponent(u.pathname);
 const file=path.join(root,name,name.endsWith('/')?'index.html':'');
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){
  res.writeHead(404);res.end('not found');return;
 }
 res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript',
  '.mjs':'text/javascript','.json':'application/json','.txt':'text/plain','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');
 fs.createReadStream(file).pipe(res);
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:browserBin(),args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/rsvp/');
 await page.locator('#path').fill('/fold-bloom/lens/sample-text.txt');
 await page.locator('#open').click();
 await page.waitForFunction(()=>window.RSVPSourceInstrument?.sourceLength()>100&&document.getElementById('drawer').hidden);
 const first=await page.evaluate(()=>RSVPReader.snapshot());
 const intro=await page.locator('#stage > .word').textContent();
 const scales=await page.evaluate(()=>document.getElementById('wristAperture').A.scales.map(x=>x.id));
 assert.ok(scales.includes('PARA')&&scales.includes('WORD'),'actual source scales are available');
 assert.equal(await page.locator('#apertureTicks .scope-tick').count(),scales.length,
  'one tick for each native FieldAperture level');
 const target=scales.indexOf('PARA');
 const click=await page.evaluate(i=>{
  const svg=document.querySelector('.orbit'),r=svg.getBoundingClientRect();
  const n=document.querySelectorAll('#apertureTicks .scope-tick').length;
  const angle=-Math.PI/2+Math.PI*2*(i+.5)/n;
  return {x:r.left+(60+24*Math.cos(angle))*r.width/120,
   y:r.top+(60+24*Math.sin(angle))*r.height/120};
 },target);
 await page.mouse.click(click.x,click.y);
 const broad=await page.evaluate(()=>RSVPReader.snapshot());
 assert.equal(broad.scale,'PARA','inner ring manipulates actual native paragraph aperture');
 assert.equal(broad.char_index,first.char_index,'scale retains same UTF-16 source locus');
 assert.equal(await page.locator('#stage > .word').textContent(),intro,'foveal center stays the same word');
 assert.equal(await page.locator('.scope-tick.active').count(),1,'native scope is visibly reflected by one tick');
 assert.match(await page.locator('#signalLabel').textContent(),/PARAGRAPH/);
 assert.ok(broad.span.end-broad.span.start>=first.span.end-first.span.start,'aperture broadens the same passage');
 // Drag the outer source annulus: unlike playback, this is direct address manipulation.
 const coords=await page.evaluate(()=>{
  const r=document.querySelector('.orbit').getBoundingClientRect();
  const at=f=>{const a=-Math.PI/2+2*Math.PI*f;
   return {x:r.left+(60+50*Math.cos(a))*r.width/120,
    y:r.top+(60+50*Math.sin(a))*r.height/120}};
  return {from:at(.18),to:at(.73)};
 });
 await page.mouse.move(coords.from.x,coords.from.y);
 await page.mouse.down();
 await page.mouse.move(coords.to.x,coords.to.y,{steps:8});
 await page.mouse.up();
 const dragged=await page.evaluate(()=>RSVPReader.snapshot());
 assert.ok(Math.abs(dragged.source_progress-broad.source_progress)>.25,'outer ring drag truly scrubs absolute source');
 assert.equal(dragged.scale,'PARA','outer address manipulation does not change aperture');
 assert.equal(dragged.playing,false,'direct manipulation does not silently start RSVP game');
 // Native scale/position survive exact same-source reload.
 await page.reload();await page.waitForFunction(()=>window.RSVPSourceInstrument?.sourceLength()>100);
 const resumed=await page.evaluate(()=>RSVPReader.snapshot());
 assert.equal(resumed.scale,'PARA','native aperture is recorded and restored');
 assert.equal(resumed.char_index,dragged.char_index,'read point resumes at exact character');
 // A human writes an APPLIED observation before proposing action.
 const wordIndex=scales.indexOf('WORD');
 assert.equal(await page.evaluate(i=>RSVPReader.setScale(i),wordIndex),true);
 const targetChar=await page.evaluate(()=>RSVPReader.source().raw.indexOf(' ')+2);
 await page.evaluate(c=>RSVPReader.seekChar(c),targetChar);
 const departing=await page.evaluate(()=>RSVPReader.snapshot());
 await page.locator('#noteHere').click();
 await page.locator('#editKind').selectOption('APPLIED');
 await page.locator('#editText').fill('Review this passage and choose the next concrete experiment');
 assert.equal(await page.locator('#editDayline').isVisible(),true,'only APPLIED proposals reveal the carry action');
 const marksBefore=await page.evaluate(()=>FieldSourceTrail.read(RSVPReader.key()).marks.length);
 await page.locator('#editDayline').click();
 await page.waitForURL('**/atlas-dayline/?live=1',{timeout:15000});
 await page.waitForFunction(()=>window.AtlasDayline&&document.querySelector('#flHandoff button'));
 const pending=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('atlas.dayline.handoff.v01')||'null'));
 assert.equal(pending.kind,'TASK');
 assert.equal(pending.authority,'NONE');
 assert.match(pending.payload.task.sourceRef,/^\/docs\/\?src=/);
 assert.equal(pending.source.revision,(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('rsvp.handoff.v1')).hash)));
 const beforeTasks=await page.evaluate(()=>AtlasDayline.snapshot().tasks.length);
 assert.equal((await page.locator('#flHandoff').textContent()).includes('ADD TO DAY'),true);
 if(process.env.SCREENSHOT_DIR){
  fs.mkdirSync(process.env.SCREENSHOT_DIR,{recursive:true});
  await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,'rsvp-dayline-pending-390.png')});
 }
 assert.equal(await page.evaluate(()=>AtlasDayline.snapshot().tasks.length),beforeTasks,
  'Dayline only previews; no silent task import');
 await page.locator('#flHandoff button').filter({hasText:'ADD TO DAY'}).click();
 assert.equal(await page.evaluate(()=>AtlasDayline.snapshot().tasks.length),beforeTasks+1,
  'only explicit ADD creates an imported native task');
 const written=await page.evaluate(()=>AtlasDayline.snapshot().tasks.at(-1));
 assert.match(written.provenance,/READFIELD \/ APPLIED/);
 assert.ok(written.fieldRef.includes('ap_char='),'Dayline task references exact original passage');
 assert.equal(await page.locator('#flHandoff a').filter({hasText:'RETURN TO SOURCE'}).count(),1,
  'RETURN remains reachable after accepting a task');
 await page.locator('#flHandoff a').filter({hasText:'RETURN TO SOURCE'}).click();
 await page.waitForURL('**/rsvp/?handoff=1');
 await page.waitForFunction(()=>RSVPSourceInstrument?.sourceLength()>100);
 const back=await page.evaluate(()=>RSVPReader.snapshot());
 assert.equal(back.char_index,departing.char_index,'RETURN restores exact native reading location');
 assert.equal((await page.evaluate(()=>FieldSourceTrail.read(RSVPReader.key()).marks.length)),marksBefore+1,
  'APPLIED annotation stays source-owned, not moved to Dayline');
 assert.deepEqual(errors,[],'no browser exceptions');
 if(process.env.SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,'rsvp-aperture-return-390.png')});
 console.log('RSVP APERTURE/DAYLINE BROWSER PASS · inner native scope · outer drag · same-source resume · explicit Dayline ADD · exact RETURN · source-owned annotation');
 await page.close();
}finally{await browser.close();await new Promise(r=>server.close(r))}
