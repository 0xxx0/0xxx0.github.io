import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
async function continuumBrowserProof(){
 const stale=['/field-work.mjs?v=0.10.6','/field-work.mjs?v=0.10.5','/interphase/entry.mjs?v=0.10.0','/interphase/continuum.mjs?v=0.10.0','/interphase/navigation.mjs','/field-work.css?v=0.10.0','/interphase/continuum.css?v=0.10.0'];let prime=false;
 const root=process.cwd(),server=http.createServer((req,res)=>{
  if(prime&&stale.includes(req.url)){
   res.setHeader('Cache-Control','public,max-age=86400');res.setHeader('Content-Type',req.url.includes('.css')?'text/css':'application/javascript');
   res.end(req.url.includes('.css')?'/* prior-continuum */ html{--prior-continuum:1}':'/* prior-continuum */ throw Error("Cached prior continuum loaded");');return;
  }
  const name=decodeURIComponent(new URL(req.url,'http://local').pathname),file=path.join(root,name,name.endsWith('/')?'index.html':'');
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);res.end();return}
  res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.json':'application/json','.css':'text/css'})[path.extname(file)]||'text/plain');fs.createReadStream(file).pipe(res);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,args:JSON.parse(process.env.SMOKE_ARGS||'[]'),executablePath:process.env.SMOKE_BROWSER||undefined});
 const raw='# Water and gates\n\nWater flows downhill. A gate changes its route.\n\nThe gate is closed. Water collects upstream.\n\nAn observation can question an explanation. A path records attention, not proof of understanding.';
 try{
  // Real HTTP cache: route interception would disable it. Prime the addresses
  // used by the previous release, prove those responses remain warm, then load
  // both native entrances. Changed adapter/core/style must share one new key.
  const cached=await browser.newContext(),cachedPage=await cached.newPage(),cacheErrors=[],cacheRequests=[];
  cachedPage.on('pageerror',e=>cacheErrors.push(e.message));cachedPage.on('request',r=>cacheRequests.push(new URL(r.url()).pathname+new URL(r.url()).search));
  await cachedPage.goto(base+'/interphase/SPEC.md');prime=true;
  await cachedPage.evaluate(async urls=>Promise.all(urls.map(u=>fetch(u).then(r=>r.text()))),stale);prime=false;
  const warm=await cachedPage.evaluate(async urls=>Promise.all(urls.map(u=>fetch(u).then(r=>r.text()))),stale);
  assert.ok(warm.every(s=>s.includes('prior-continuum')),'the stale responses must really remain in HTTP cache');
  const firstFresh=cacheRequests.length;
  await cachedPage.goto(base+'/?work=1');await cachedPage.waitForFunction(()=>window.InterphaseInstrument?.snapshot()?.source.raw);
  assert.equal(await cachedPage.locator('[data-ip=view-dial]').count(),1);
  for(const file of ['/field-work.mjs','/field-work.css','/interphase/continuum.mjs','/interphase/navigation.mjs','/interphase/continuum.css']){
   assert.ok(cacheRequests.slice(firstFresh).includes(file+'?v=0.10.6-dial2'),'release key missing: '+file);
  }
  await cachedPage.goto(base+'/interphase/?src=/interphase/SPEC.md');await cachedPage.waitForFunction(()=>window.InterphaseInstrument?.snapshot()?.source.address==='/interphase/SPEC.md');
  assert.ok(cacheRequests.includes('/interphase/entry.mjs?v=0.10.6-dial2'));assert.deepEqual(cacheErrors,[]);
  await cached.close();console.log('CONTINUUM CACHE PASS · stale HTTP responses stay cached · root and standalone load coupled released adapter/core/style');
  for(const width of [390,320,1280]){
   const context=await browser.newContext({viewport:{width,height:width===320?568:900},hasTouch:width<700,reducedMotion:'reduce'}),page=await context.newPage(),errors=[],requests=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(new URL(r.url()).pathname));
   const ip=id=>page.locator('[data-ip="'+id+'"]'),snap=()=>page.evaluate(()=>InterphaseInstrument.snapshot());
   const wait=()=>page.waitForFunction(()=>window.InterphaseInstrument?.snapshot()?.source?.raw);
   const source=async()=>{if(!await ip('drawer').isVisible())await page.locator('#fiParent').click()};
   const close=async()=>{if(await ip('drawer').isVisible())await ip('close').click()};
   const load=async(text,name='water.md')=>{await source();await ip('file').setInputFiles({name,mimeType:'text/plain',buffer:Buffer.from(text)});await page.waitForFunction(t=>InterphaseInstrument.snapshot()?.source.raw===t,text)};
   const bar=async text=>{await page.locator('#fiAddress').click();await page.locator('#fieldUrlInput').fill(text);await page.locator('#fieldUrlInput').press('Enter');await page.waitForFunction(()=>!document.getElementById('fieldUrlBar').dataset.editing)};
   // First prove the ordinary job: identify a named tool, open its owner, return.
   // Reader round trips below must not silently replace this entry again.
   await page.goto(base+'/');await page.waitForSelector('#feedRail .feedChip');
   assert.equal(await page.locator('html[data-instrument="1"]').count(),0);
   assert.equal(await page.locator('#interphaseWorkspace').count(),0);
   assert.equal(requests.includes('/interphase/continuum.mjs'),false,'ordinary entry must not load the experimental reader');
   assert.equal(await page.locator('#workedOn').isVisible(),false,'word-heavy detail starts folded');
   const foldedText=(await page.locator('body').innerText()).length;
   await page.locator('#fieldWords').click();assert.equal(await page.locator('#workedOn').isVisible(),true);
   assert.ok((await page.locator('body').innerText()).length>foldedText*2,'one reveal unfolds the existing detail');
   await page.locator('#fieldWords').click();assert.equal(await page.locator('#workedOn').isVisible(),false);
   const choices=await page.locator('#feedRail .feedChip').evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect(),label=n.querySelector('.feedName');return {title:label?.textContent,height:r.height,named:!!label&&getComputedStyle(label).display!=='none'&&label.getBoundingClientRect().height>0,clipped:r.left<0||r.right>innerWidth+1}}));
   assert.ok(choices.length>=10&&choices.every(x=>x.title&&x.named&&x.height>=80),'addressed glyph targets retain canonical labels and touch size');
   await page.locator('#feedRail .feedChip').last().scrollIntoViewIfNeeded();
   const lastReachable=await page.locator('#feedRail .feedChip').last().evaluate(n=>{const r=n.getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1});
   assert.ok(lastReachable,'final CURRENT head reachable by horizontal scroll at '+width);
   await page.waitForFunction(()=>window.FieldOmnibar);
   await page.locator('#feedRail [data-href="/house/"]').click();
   assert.equal(requests.some(p=>p==='/field-awake-visor.js'),false,'first visit must not load or open the AWAKE introduction');
   assert.equal(await page.locator('#fieldAwakeVisor').count(),0);
   await page.waitForFunction(()=>document.getElementById('apTitle').textContent==='HOUSE / FIELD');
   await page.locator('#fieldWords').click();assert.equal(await page.locator('#apTitle').textContent(),'HOUSE / FIELD');
   await page.locator('#fieldWords').click();
   await page.locator('#apOpen').click();await page.waitForURL(base+'/house/');
   await page.goBack();await page.waitForSelector('#feedRail .feedChip');
   assert.equal(await page.locator('html[data-instrument="1"]').count(),0);
   assert.equal(await page.locator('#apTitle').textContent(),'HOUSE / FIELD');
   // Native history/layout restoration can emit late scrolls on collapsed strips.
   await page.waitForTimeout(1100);
   await page.locator('#axialRows .axisViewport').evaluateAll(ns=>ns.forEach(n=>n.dispatchEvent(new Event('scroll'))));
   await page.waitForTimeout(250);
   assert.equal(await page.locator('#apTitle').textContent(),'HOUSE / FIELD','layout/history scroll must never select a different object');
   if(process.env.SCREENSHOT_DIR){fs.mkdirSync(process.env.SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,`field-entry-${width}.png`)})}
   await page.goto(base+'/?work=1');await wait();await page.waitForFunction(()=>document.querySelector('.fieldUrlFrame').getBoundingClientRect().height<=50);
   let s=await snap();assert.equal(s.source.address,'/showcase-manifest.json');assert.equal(s.attention.scope,'COLLECTION:$.routes');assert.ok(JSON.parse(s.source.raw).routes.length>=200);
   assert.equal(await page.locator('#interphaseWorkspace iframe').count(),0);assert.equal(await page.locator('.ip-continuum field-aperture').count(),1);
   assert.equal(await page.locator('.ip-continuum field-aperture').evaluate(x=>x.shadowRoot.children.length),0);
   assert.equal(requests.some(p=>/^\/interphase\/(?:app|research|substrate|compositor|work)\.mjs$/.test(p)),false);
   await page.goto(base+'/?work=1&focus=/docs/');await wait();assert.equal((await snap()).nativeRoute,'/docs/','explicit caller focus wins over saved source');
   await page.evaluate(()=>InterphaseInstrument.loadRoute('/docs/'));assert.equal((await snap()).source.hash,s.source.hash);await page.waitForFunction(()=>FieldInstrument.heldAddress()==='/docs/');
   const observations=requests.filter(p=>p==='/showcase-manifest.json').length;await page.evaluate(()=>InterphaseInstrument.importPacket(InterphaseInstrument.packet()));assert.ok(requests.filter(p=>p==='/showcase-manifest.json').length>observations,'RETURN resolves native ports from a fresh host source');
   await page.evaluate(()=>Promise.all([InterphaseInstrument.load('older source','old'),InterphaseInstrument.load('latest source wins','new')]));assert.equal((await snap()).source.raw,'latest source wins');
   await load(raw);const hash=(await snap()).source.hash,c=raw.indexOf('gate changes')+3;
   const firstPosition=(await snap()).attention.char,firstScope=(await snap()).attention.scope;
   assert.ok(firstPosition>=Number(await ip('local-slider').getAttribute('aria-valuemin'))&&firstPosition<=Number(await ip('local-slider').getAttribute('aria-valuemax')),'fresh source opens inside its actual held range');
   await ip('narrow').click();assert.notEqual((await snap()).attention.scope,firstScope,'the first + must narrow the source');assert.equal((await snap()).attention.char,firstPosition);
   await page.evaluate(()=>{InterphaseInstrument.setScope('PARA');InterphaseInstrument.seek(0)});
   assert.match(await ip('local-slider').getAttribute('aria-valuetext'),/outside this range/,'a caret in the heading is not a position inside the nearest paragraph');
   await page.evaluate(c=>{InterphaseInstrument.seek(c);InterphaseInstrument.setScope('SENT')},c);
   await page.reload();await wait();assert.equal((await snap()).source.raw,raw,'reload retains a newly opened source');assert.equal((await snap()).attention.char,c);assert.equal((await snap()).attention.scope,'SENT');
   await ip('held').evaluate(x=>x.dataset.identity='same');await ip('view-walk').click();
   assert.equal((await snap()).attention.view,'walk');assert.equal((await snap()).attention.char,c);assert.equal(await ip('held').getAttribute('data-identity'),'same');
   if(process.env.SCREENSHOT_DIR){fs.mkdirSync(process.env.SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,`walk-${width}.png`)})}
   await bar(':plain');assert.equal((await snap()).attention.view,'plain');await bar(':walk');assert.equal((await snap()).attention.view,'walk');
   // One source + cursor across three actual tabs. The two radial bands
   // are measured against DIFFERENT coordinate systems, not a decorative turn.
   await ip('view-dial').click();assert.equal((await snap()).attention.view,'dial');assert.equal((await snap()).attention.char,c);
   const dialBox=await ip('ring').boundingBox();assert.ok(dialBox?.width>100,'dial visible at phone width');
   await page.mouse.click(dialBox.x+dialBox.width*(159/180),dialBox.y+dialBox.height*.5);
   const outerChar=(await snap()).attention.char;
   assert.ok(Math.abs(outerChar-Math.round((raw.length-1)/6))<=2,'outer arc selects absolute source fraction');
   await page.mouse.click(dialBox.x+dialBox.width*(135/180),dialBox.y+dialBox.height*.5);
   const innerChar=(await snap()).attention.char;
   assert.notEqual(innerChar,outerChar,'inner ring selects native range-local fraction');
   assert.equal((await snap()).source.hash,hash);
   assert.ok(dialBox.width*36/180>=44-0.01,'DIAL bands have 44px radial separation on a phone');
   const current=await page.evaluate(()=>InterphaseInstrument.packet());
   const local=ip('local-slider'),absolute=ip('absolute-slider'),lo=Number(await local.getAttribute('aria-valuemin')),hi=Number(await local.getAttribute('aria-valuemax'));
   await local.focus();await local.press('End');assert.equal((await snap()).attention.char,hi,'local End stays in the held native range');
   await local.press('ArrowRight');assert.equal((await snap()).attention.char,hi,'local keyboard control clamps at the range end');
   await local.press('Home');assert.equal((await snap()).attention.char,lo);
   const departureChar=(await snap()).attention.char;
   await absolute.focus();await absolute.press('End');assert.equal((await snap()).attention.char,raw.length-1,'whole source End reaches the last character');
   await page.locator('#fiReturn').click();assert.equal((await snap()).attention.char,departureChar,'dial RETURN restores exact departure');
   // Actual pointer input at the last endpoint, then in the empty seam. A
   // finite source must not wrap to its beginning when touching that seam.
   const p={x:dialBox.x+dialBox.width*(90-69/Math.sqrt(2))/180,y:dialBox.y+dialBox.height*(90-69/Math.sqrt(2))/180};
   if(width<700)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);
   assert.equal((await snap()).attention.char,raw.length-1);
   const last=await snap();
   const seam={x:dialBox.x+dialBox.width/2,y:dialBox.y+dialBox.height*21/180};
   if(width<700)await page.touchscreen.tap(seam.x,seam.y);else await page.mouse.click(seam.x,seam.y);
   assert.deepEqual((await snap()).attention,last.attention);assert.deepEqual((await snap()).frames,last.frames,'empty seam cannot create a RETURN frame');
   assert.equal(await absolute.getAttribute('aria-valuenow'),String(raw.length-1));
   assert.equal(await ip('body').textContent(),'A path records attention, not proof of understanding.','DIAL previews the held native range; READ retains surrounding context');
   const bodyFits=await ip('body').evaluate(n=>{const body=n.getBoundingClientRect(),held=n.closest('.ip-held').getBoundingClientRect();return body.top>=held.top&&body.bottom<=held.bottom+1});
   assert.equal(bodyFits,true,'the selected sentence must actually be readable inside the aperture');
   const dialTransport=await ip('play').boundingBox();assert.ok(dialTransport.y+dialTransport.height<=page.viewportSize().height,'DIAL transport stays reachable');
   if(process.env.SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,`dial-${width}.png`)});
   await page.evaluate(p=>InterphaseInstrument.importPacket(p),current);
   await ip('view-plain').click();assert.equal((await snap()).attention.char,innerChar,'view changes must not move held source');
   await bar(':dial');assert.equal((await snap()).attention.view,'dial');
   const savedDial=await page.evaluate(()=>InterphaseInstrument.packet());
   await page.evaluate(p=>InterphaseInstrument.importPacket(p),savedDial);
   assert.equal((await snap()).attention.view,'dial','dial view survives strict RETURN');
   assert.equal((await snap()).attention.char,innerChar,'dial source position survives RETURN');
   await load('{"title":"Gate","role":"holds","proof":false}','gate-fields.json');await page.evaluate(()=>InterphaseInstrument.setScope('ROOT'));
   assert.equal(await ip('residue').isVisible(),true);assert.match(await ip('residue').textContent(),/1 other fields/,'DIAL must retain hidden-field counts');
   assert.equal(await ip('title').isVisible(),true);assert.equal(await ip('title').textContent(),'Gate','a JSON object title is identity, not repeated prose context');
   await page.evaluate(p=>InterphaseInstrument.importPacket(p),savedDial);
   await ip('view-walk').click();

   const before=(await snap()).attention.char;await bar(':unsupported');assert.equal((await snap()).attention.char,before);assert.match(await ip('status').textContent(),/not supported/);
   await page.evaluate(()=>InterphaseInstrument.setScope('PARA'));
   await bar('water gate');assert.equal((await snap()).attention.query,'water gate');await source();await ip('clear').click();assert.equal((await snap()).attention.query,'');
   await page.evaluate(c=>InterphaseInstrument.seek(c),raw.indexOf('Water flows'));
   const departure=(await snap()).attention.char;
   const details=ip('link-start').locator('xpath=ancestor::details');
   await source();await details.locator('summary').click();await ip('link-start').click();
   await ip('next').click();const destination=(await snap()).attention.char;
   await source();await ip('relation').selectOption('questions');await ip('link-end').click();assert.equal((await snap()).links.length,1);
   await page.locator('.ip-relation').click();assert.equal((await snap()).attention.char,raw.indexOf('Water flows'));
   await page.locator('#fiReturn').click();assert.equal((await snap()).attention.char,destination);
   await source();await ip('edit').click();const oldRange=await ip('replacement').inputValue();await ip('replacement').fill(oldRange.replace('closed','open'));
   await ip('commit').click();await page.waitForFunction(t=>InterphaseInstrument.snapshot().source.raw===t,raw.replace('closed','open'));
   await source();await ip('undo').click();await page.waitForFunction(t=>InterphaseInstrument.snapshot().source.raw===t,raw);assert.equal((await snap()).links.length,1);assert.equal((await snap()).source.hash,hash);
   await source();await ip('redo').click();await page.waitForFunction(t=>InterphaseInstrument.snapshot().source.raw===t,raw.replace('closed','open'));await source();await ip('undo').click();await page.waitForFunction(t=>InterphaseInstrument.snapshot().source.raw===t,raw);await close();
   const ring=await ip('ring').boundingBox();await page.mouse.click(ring.x+ring.width*.87,ring.y+ring.height*.5);assert.equal((await snap()).source.hash,hash);
   await page.evaluate(()=>{const a=document.querySelector('.ip-continuum field-aperture');a.setWpm(1200);a.selectChar(a.A.scales.find(s=>s.id==='WORD').units.at(-2).start)});
   await ip('play').click();await page.waitForFunction(()=>!InterphaseInstrument.snapshot().playing);const end=(await snap()).attention.char;await ip('play').click();assert.equal((await snap()).attention.char,end);assert.equal((await snap()).playing,false);
   const packet=await page.evaluate(()=>InterphaseInstrument.packet());
   await source();const downloaded=page.waitForEvent('download');await ip('export').click();const saved=JSON.parse(fs.readFileSync(await (await downloaded).path(),'utf8'));assert.equal(saved.source.raw,raw);assert.equal(saved.source.hash,hash);assert.deepEqual(saved.attention,packet.attention);await close();await page.evaluate(()=>InterphaseInstrument.seek(0));
   const rejection=await page.evaluate(async p=>{try{await InterphaseInstrument.importPacket({...p,source:{...p.source,raw:p.source.raw+'bad'}});return false}catch(e){return e.message}},packet);assert.match(rejection,/mismatch/);assert.equal((await snap()).attention.char,0);
   await source();await ip('import').setInputFiles({name:'return.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(packet))});await page.waitForFunction(c=>InterphaseInstrument.snapshot().attention.char===c,end);assert.equal((await snap()).attention.char,end);
   const rejectedQuote=await page.evaluate(async p=>{p.links[0].from.quote='invented';try{await InterphaseInstrument.importPacket(p);return false}catch(e){return e.message}},packet);assert.match(rejectedQuote,/quotes/);
   await source();await ip('file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"a":1,"a":2}')});await page.waitForFunction(()=>document.querySelector('[data-ip=status]').textContent.includes('ambiguous'));assert.equal((await snap()).source.hash,hash);await close();
   const nativeBefore=await page.evaluate(()=>FieldInstrument.snapshot().frame);await ip('space').focus();await page.keyboard.press('ArrowLeft');assert.deepEqual(await page.evaluate(()=>FieldInstrument.snapshot().frame),nativeBefore);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
   await page.evaluate(()=>InterphaseInstrument.perspective('plain'));
   const transport=await ip('play').boundingBox();assert.ok(transport.y>=0&&transport.y+transport.height<=page.viewportSize().height,'READ transport remains in viewport');
   if(process.env.SCREENSHOT_DIR){await page.evaluate(()=>InterphaseInstrument.perspective('plain'));await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,`plain-${width}.png`)})}
   await load('{"gate":{"state":"closed","count":2},"other":true}','gate.json');await page.evaluate(()=>InterphaseInstrument.setScope('ROOT'));
   await source();await ip('edit').click();await ip('replacement').fill('{');await ip('commit').click();await page.waitForFunction(()=>!!document.querySelector('[data-ip=status]').dataset.error);assert.equal((await snap()).source.raw,'{"gate":{"state":"closed","count":2},"other":true}');await ip('cancel').click();await close();
   await load(raw);await page.evaluate(p=>InterphaseInstrument.importPacket(p),packet);await page.evaluate(()=>InterphaseInstrument.seek(42));await source();await ip('reader').click();
   await page.waitForFunction(()=>document.getElementById('docAperture')?.A?.raw);
   assert.equal(await page.locator('#docAperture').evaluate(x=>x.A.raw),raw);assert.equal(await page.locator('#docAperture').evaluate(x=>x.snapshot().char_index),42);
   await page.locator('#walkLink').click();await wait();assert.equal((await snap()).attention.char,42);assert.equal((await snap()).source.raw,raw);assert.equal((await snap()).links.length,1);
   await ip('source').click();await ip('wrist').click();await page.waitForFunction(()=>document.getElementById('wristAperture')?.A?.raw);
   assert.equal(await page.locator('#wristAperture').evaluate(x=>x.A.raw),raw);assert.equal(await page.locator('#wristAperture').evaluate(x=>x.snapshot().char_index),42);
   await page.locator('#show').click();await page.locator('#interphase').click();await wait();assert.equal((await snap()).attention.char,42);assert.equal((await snap()).source.hash,hash);assert.equal((await snap()).links.length,1);
   const jsonSource='{"gate":{"state":"closed","count":2},"other":true}';
   await page.evaluate(t=>InterphaseInstrument.load(t,'gate.json'),jsonSource);await page.evaluate(()=>InterphaseInstrument.seek(20));
   await ip('source').click();await ip('wrist').click();await page.waitForFunction(()=>document.getElementById('wristAperture')?.A?.raw);
   assert.equal(await page.locator('#wristAperture').evaluate(x=>x.snapshot().char_index),20);
   await page.evaluate(()=>sessionStorage.removeItem('interphase.continuum.v1'));await page.locator('#show').click();await page.locator('#interphase').click();await wait();
   assert.equal((await snap()).source.raw,jsonSource);assert.equal((await snap()).attention.char,20);assert.equal((await snap()).attention.scope,'ROOT');
   assert.deepEqual(errors,[]);console.log('CONTINUUM BROWSER PASS '+width+'px · one native clock · source race · READ/WALK/DIAL same source · commands · quoted link/RETURN · edit/undo/redo · ring · finite end · rejected forged RETURN · exact reader/wrist handoff');
   await context.close();
  }
 }finally{await browser.close();await new Promise(r=>server.close(r))}
}
await continuumBrowserProof();
