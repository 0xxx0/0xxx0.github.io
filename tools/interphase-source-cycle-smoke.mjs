import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const root=process.cwd(),server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://local').pathname),file=path.join(root,pathname,pathname.endsWith('/')?'index.html':'');
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);res.end();return}
 res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.json':'application/json','.css':'text/css'})[path.extname(file)]||'text/plain');fs.createReadStream(file).pipe(res);
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:process.env.SMOKE_BROWSER||undefined,args:JSON.parse(process.env.SMOKE_ARGS||'[]')});
try{
 for(const width of [320,390,1280]){
  const context=await browser.newContext({viewport:{width,height:width===320?568:900},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const ip=id=>page.locator('[data-ip="'+id+'"]'),snap=()=>page.evaluate(()=>InterphaseInstrument.snapshot());
  const waitSource=()=>page.waitForFunction(()=>window.InterphaseInstrument?.snapshot()?.source.raw);
  const drawer=async()=>{if(!await ip('drawer').isVisible())await page.evaluate(()=>InterphaseInstrument.toggleSource())};
  await page.goto(base+'/interphase/?src=/fold-bloom/listen/README.md#current');await waitSource();
  const raw=(await snap()).source.raw,first=raw.indexOf('horizontal / ring'),last=raw.indexOf('The portable donor');
  assert(first>0&&last>first);
  await page.evaluate(c=>{InterphaseInstrument.setScope('SENT');InterphaseInstrument.seek(c);InterphaseInstrument.perspective('dial')},first);
  await ip('witness-open').click();await ip('note-kind').selectOption('QUESTION');
  await ip('note-text').fill('Which parts of this address/aperture claim actually survive in the other hosts?');await ip('note-save').click();
  assert.equal(await page.evaluate(()=>InterphaseInstrument.packet().annotations.length),1,'interpretation is attached from the held range');
  await drawer();await ip('link-start').locator('..').locator('..').evaluate(el=>el.open=true);
  await ip('link-start').click();await page.evaluate(c=>InterphaseInstrument.seek(c),last);
  await drawer();await ip('relation').selectOption('questions');await ip('link-end').click();
  await drawer();await ip('wpm').fill('340');await ip('wpm').dispatchEvent('change');
  const before=await snap();assert.equal(before.links.length,1);assert.equal(before.attention.wpm,340);
  await ip('lens').click();await page.waitForFunction(()=>window.ScaleLensSpatialAPI?.snapshot()&&document.getElementById('heldRanges'));
  assert.equal(await page.locator('#lensTools').getAttribute('open'),null,'depth starts folded');
  assert.equal(await page.locator('#canonical').isVisible(),false,'addresses do not precede the source');
  await page.locator('#showcase-route-adapter').waitFor({state:'attached'});
  assert(await page.locator('#showcase-route-adapter').evaluate(el=>!!el.closest('#lensTools')),'shared route controls belong to the same tools reveal');
  assert.equal(await page.locator('#showcase-route-adapter').isVisible(),false,'one persistent route-control surface');
  assert.equal(await page.locator('#sourcePreview').isVisible(),true);
  assert.deepEqual(await page.locator('#scopes button').allTextContents(),['WORD','SENTENCE','PARAGRAPH','DOCUMENT']);
  await page.locator('#scopes button').filter({hasText:'PARAGRAPH'}).click();
  const contextRange=await page.evaluate(()=>{const s=ScaleLensSpatialAPI.snapshot(),id=s.chain.find(x=>x.kind==='RECORD').id;return ScaleLensSpatialAPI.lookup(id).provenance});
  assert.equal(await page.locator('#sourcePreview').textContent(),raw.slice(contextRange.offsetStart,contextRange.offsetEnd),'widening exposes the real native paragraph');
  await page.locator('#labToggle').click();await page.locator('#query').waitFor({state:'visible'});
  await page.locator('#lensTools > summary').click();await page.locator('#query').waitFor({state:'hidden'});
  assert(await page.locator('#lensWork').evaluate(el=>el.scrollWidth<=innerWidth+1),'source and comparisons fit the viewport');
  assert((await page.locator('#heldRanges blockquote').count())>=2,'distant source quotes must coexist while focus moves');
  const held=await page.locator('#heldRanges blockquote').allTextContents();
  for(const q of held)assert(raw.includes(q));
  const ids=[];
  for(const index of [0,(await page.locator('#heldRanges button').count())-1]){
   await page.locator('#heldRanges button').nth(index).click();ids.push(await page.evaluate(()=>ScaleLensSpatialAPI.snapshot().selectedId));
  }
  await page.evaluate(ids=>{
   const a=ScaleLensSpatialAPI,h=ScaleLensInterphase,s=a.snapshot();
   h.selectMany(ids);h.focusMany(ids);h.project('RING');
   if(h.read(ids[0]).id!==ids[0])throw Error('non-current addressed read returned another object');
   let rejected=false;try{h.read('missing')}catch(_){rejected=true}if(!rejected)throw Error('unknown node appeared valid');
   a.focus(s.chain[1].id);a.aperture(2);a.project('TEXT');a.restore(s);
   const actual=a.snapshot();if(actual.selectedId!==s.selectedId||actual.domain!==s.domain||actual.scope!==s.scope)throw Error('native restore is not atomic');
   if(h.snapshot().state.selection.length!==2||h.snapshot().state.focus.length!==2||h.snapshot().state.projection!=='RING')throw Error('native motion overwrote held set/projection');
  },ids);
  assert.deepEqual(await page.locator('#heldRanges blockquote').allTextContents(),held);
  await page.locator('#scopes button').filter({hasText:'SENTENCE'}).click();
  if(process.env.SCREENSHOT_DIR){fs.mkdirSync(process.env.SCREENSHOT_DIR,{recursive:true});await page.locator('#lensWork').screenshot({path:path.join(process.env.SCREENSHOT_DIR,`source-cycle-lens-${width}.png`)});await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,`source-cycle-lens-full-${width}.png`)});}
  await page.locator('#dockReturn').click();await waitSource();await page.waitForFunction(()=>!new URLSearchParams(location.search).has('resume'));
  const back=await snap();assert.equal(back.source.raw,before.source.raw);assert.deepEqual(back.attention,before.attention);assert.deepEqual(back.links,before.links);assert.deepEqual(back.frames,before.frames);assert.equal(back.playing,false);assert.equal(await page.evaluate(()=>InterphaseInstrument.packet().annotations.length),1);
  await drawer();await ip('threadwalk').click();
  await page.waitForFunction(()=>window.SleeperReadingBridge?.snapshot()?.model&&document.querySelector('#readingPlay')?.shadowRoot?.getElementById('exit')?.textContent.includes('APERTURE'));
  const read=page.locator('#readingPlay');
  assert(await read.evaluate(el=>el.scrollWidth<=innerWidth+1),'imported reading must fit the phone viewport');
  assert((await read.locator('#exit').boundingBox()).x+(await read.locator('#exit').boundingBox()).width<=width+1,'APERTURE return must remain inside the viewport');
  // Make a real connection through native controls, retain it unfinished, then resume.
  if(!await read.locator('#here').isDisabled())await read.locator('#here').click();
  await read.locator('.sentence').first().click();await read.locator('#actions button').filter({hasText:/MARK PASSAGE|MARKED/}).click();
  if(width<761)await read.locator('#threadToggle').click();
  await read.locator('#echoList .echo').first().click();await read.locator('.sentence').first().click();
  if(width<761&&!await read.locator('#reason').isVisible())await read.locator('#threadToggle').click();
  await read.locator('#reason').fill('The general stream claim needs evidence from the particular host before it can travel.');
  const pendingReason=await read.locator('#reason').inputValue();
  await read.locator('#exit').click();await waitSource();await drawer();await ip('threadwalk').click();
  await page.waitForFunction(()=>document.querySelector('#readingPlay')?.shadowRoot?.getElementById('reason')?.value);
  if(width<761&&!await read.locator('#reason').isVisible())await read.locator('#threadToggle').click();
  assert.equal(await read.locator('#reason').inputValue(),pendingReason,'uncommitted interpretation survives an excursion');
  await read.locator('#compare button.gold').click();
  const draft=await page.evaluate(()=>SleeperReadingBridge.checkpoint());assert.equal(draft.draft.links.length,1);
  assert.equal(await page.evaluate(()=>Threadwalk.canReturn(SleeperReadingBridge.snapshot().session)),false,'inspection/link alone cannot award strict RETURN');
  await read.locator('#exit').click();await waitSource();await page.waitForFunction(()=>!new URLSearchParams(location.search).has('resume'));
  assert.deepEqual((await snap()).attention,before.attention);
  await page.evaluate(()=>{const p=JSON.parse(sessionStorage.getItem('rsvp.handoff.v1'));delete p.threadwalkDraft;sessionStorage.setItem('rsvp.handoff.v1',JSON.stringify(p))});
  await drawer();await ip('threadwalk').click();
  await page.waitForFunction(()=>window.SleeperReadingBridge?.snapshot()?.session?.links.length===1&&document.querySelector('#readingPlay')?.shadowRoot?.getElementById('exit')?.textContent.includes('APERTURE'));
  assert(await read.evaluate(el=>el.scrollWidth<=innerWidth+1),'resumed long source token must fit the viewport');
  const resumed=await page.evaluate(()=>SleeperReadingBridge.checkpoint());assert.deepEqual(resumed,draft,'unfinished exact witnesses, selected range and connection survive');
  assert.equal(await page.evaluate(()=>Threadwalk.canReturn(SleeperReadingBridge.snapshot().session)),false);
  if(process.env.SCREENSHOT_DIR)await read.screenshot({path:path.join(process.env.SCREENSHOT_DIR,`source-cycle-threadwalk-${width}.png`)});
  await read.locator('#readingTools > summary').click();
  const downloadPromise=page.waitForEvent('download');await read.locator('#saveWork').click();const download=await downloadPromise;
  const workFile=JSON.parse(fs.readFileSync(await download.path(),'utf8'));assert.equal(workFile.source.text,raw);assert.equal(workFile.checkpoint.draft.links.length,1);assert.equal(workFile.schema,'sleeper.threadwalk-work/v1');
  await read.locator('#readingTools > summary').click();await read.locator('#mySource').click();
  await read.locator('#newFile').setInputFiles({name:'saved-threadwalk-work.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(workFile))});
  await page.waitForFunction(()=>document.querySelector('#readingPlay')?.shadowRoot?.getElementById('exit')&&SleeperReadingBridge.snapshot().session.links.length===1);
  assert.equal(await page.evaluate(()=>Threadwalk.canReturn(SleeperReadingBridge.snapshot().session)),false,'work import does not award completed RETURN');
  const second=await context.newPage();await second.goto(base+'/sleeper/axis-score.html?read=1&src=/fold-bloom/listen/README.md');
  await second.waitForFunction(()=>window.SleeperReadingBridge?.snapshot()?.session?.links.length===1);
  assert.deepEqual(await second.evaluate(()=>SleeperReadingBridge.snapshot().session.links),draft.draft.links,'a fresh tab restores native work without the carrier');await second.close();
  await read.locator('#exit').click();await waitSource();assert.deepEqual((await snap()).links,before.links);
  assert.deepEqual(errors,[]);await context.close();console.log(`SOURCE CYCLE ${width} PASS · actual LISTEN work · distant quotes · addressed reads · nested scope restore · Threadwalk draft · exact paused return`);
 }
 // Corrupt revision must hold the child before replacing it with a demo source.
 const context=await browser.newContext(),page=await context.newPage();
 await page.goto(base+'/interphase/?src=/fold-bloom/listen/README.md');await page.waitForFunction(()=>window.InterphaseInstrument?.snapshot()?.source.raw);
 await page.evaluate(()=>InterphaseInstrument.toggleSource());
 await page.addInitScript(()=>{if(location.pathname==='/fold-bloom/lens/'){const h=JSON.parse(sessionStorage.getItem('lens:handoff:v2'));h.text+='tamper';sessionStorage.setItem('lens:handoff:v2',JSON.stringify(h))}});
 await page.locator('[data-ip=lens]').click();await page.waitForFunction(()=>document.getElementById('dockTitle')?.textContent==='SOURCE HELD');
 assert.equal(await page.evaluate(()=>ScaleLensSpatialAPI.snapshot()),null);await context.close();
 const dataContext=await browser.newContext(),dataPage=await dataContext.newPage();await dataPage.goto(base+'/fold-bloom/lens/');
 await dataPage.waitForFunction(()=>window.ScaleLensSpatialAPI?.snapshot());
 assert.equal(JSON.parse(await dataPage.locator('#sourcePreview').textContent()).id,'evt-001','default JSON source shows the selected native record');await dataContext.close();
 console.log('SOURCE CYCLE TAMPER PASS · mismatched source held before parsing; no sample substituted');
}finally{await browser.close();server.close()}
