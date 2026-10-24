import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {browserBin} from './browser-bin.mjs';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
let warmLegacy=false;
const warmed=new Set(),coupled=['field-instrument.mjs','field-instrument-core.mjs','field-instrument.css'];
const root=process.cwd(),server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://local'),name=decodeURIComponent(url.pathname),file=path.join(root,name,name.endsWith('/')?'index.html':'');
  if(name==='/__field_cache_probe__'){
    res.setHeader('Content-Type','text/html');
    res.end('<link rel="stylesheet" href="/field-instrument.css"><script type="module">import "/field-instrument.mjs";import "/field-instrument-core.mjs";document.body.dataset.primed="1";</script><body></body>');return;
  }
  if(warmLegacy&&!url.search&&coupled.includes(name.slice(1))){
    warmed.add(name.slice(1));res.setHeader('Cache-Control','public, max-age=3600');
    res.setHeader('Content-Type',name.endsWith('.css')?'text/css':'application/javascript');
    res.end(name.endsWith('.css')?'html{--obsolete-field:cached}':'export const obsolete=true;');return;
  }
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return}
  const type={'.html':'text/html','.mjs':'application/javascript','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'}[path.extname(file)]||'application/octet-stream';
  res.setHeader('Content-Type',type);fs.createReadStream(file).pipe(res);
});
const manifest=JSON.parse(fs.readFileSync('showcase-manifest.json','utf8'));
const expected=manifest.routes.filter(r=>r.href!=='/').length,version=manifest.routes.find(r=>r.href==='/').version;
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:browserBin(),args:['--no-sandbox','--disable-dev-shm-usage']});
// Native FIELD projection fixture; default WORK composition is proved by interphase-plus-smoke.
const results=[];
try{
  // Use a real HTTP cache: page.route would disable it. Old adapter/core/style
  // bytes must not combine with the newly fetched CURRENT/manifest data.
  const cached=await browser.newContext(),cachePage=await cached.newPage();warmLegacy=true;
  await cachePage.goto(base+'/__field_cache_probe__');
  await cachePage.waitForFunction(()=>document.body.dataset.primed==='1');
  assert.equal(warmed.size,3);warmLegacy=false;
  await cachePage.goto(base+'/?work=0');await cachePage.waitForSelector('html[data-instrument="1"]');
  await cachePage.waitForFunction(()=>[...document.styleSheets].some(s=>s.href?.includes('field-instrument.css')));
  const releaseURLs=await cachePage.evaluate(()=>[...document.scripts].map(s=>s.src).concat([...document.styleSheets].map(s=>s.href)),null);
  for(const file of ['field-instrument.mjs','field-instrument.css'])assert.ok(releaseURLs.some(u=>u&&new URL(u).pathname==='/'+file&&new URL(u).searchParams.get('v')===version),'release address missing: '+file);
  assert.ok(await cachePage.evaluate(v=>performance.getEntriesByType('resource').some(e=>new URL(e.name).pathname==='/field-instrument-core.mjs'&&new URL(e.name).searchParams.get('v')===v),version),'core must inherit the same release address');
  assert.equal(await cachePage.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--obsolete-field')),'');
  assert.equal(await cachePage.locator('[data-map-id]').count(),expected);
  // Non-reduced motion is an actual aperture traversal, not a TURN menu pose.
  const cacheStart=await cachePage.evaluate(()=>FieldInstrument.snapshot().frame);
  await cachePage.locator('#fiReading [data-action="heads"]').click();
  const house=cachePage.getByRole('button',{name:'Enter HOUSE / FIELD · /house/ · 1 objects',exact:true});
  const smallBox=await house.boundingBox();await house.click();
  assert.equal((await cachePage.evaluate(()=>FieldInstrument.snapshot())).view.inside,1);
  assert.equal(await cachePage.locator('.fiTransit').evaluate(n=>n.inert&&n.getAttribute('aria-hidden')==='true'),true);
  await cachePage.waitForFunction(()=>!document.querySelector('.fiTransit'));
  const bigBox=await cachePage.locator('#fiPlane .fiMark').boundingBox();
  assert.ok(bigBox.width>smallBox.width*2,'entering a tool must visibly enlarge its aperture');
  await cachePage.locator('#fiParent').click();await cachePage.waitForFunction(()=>!document.querySelector('.fiTransit'));
  assert.equal((await cachePage.evaluate(()=>FieldInstrument.snapshot())).view.inside,11);
  await house.click();await cachePage.locator('#fiReturn').click();
  assert.deepEqual((await cachePage.evaluate(()=>FieldInstrument.snapshot())).frame,cacheStart,'RETURN must cancel an in-flight camera');
  assert.equal(await cachePage.locator('.fiTransit').count(),0);
  await cached.close();
  for(const [width,height] of [[320,568],[320,640],[390,844],[430,932],[1280,800]]){
    const context=await browser.newContext({viewport:{width,height},hasTouch:width<760,reducedMotion:'reduce',acceptDownloads:true});
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
    await page.goto(base+'/?work=0');
    await page.waitForSelector('html[data-instrument="1"]');
    const nativeBefore=await page.evaluate(()=>JSON.stringify(FieldIndexReadModel.snapshot().routes));
    const initial=await page.evaluate(()=>FieldInstrument.snapshot());
    assert.equal(initial.frame.intent,'SEARCH','ordinary entry must expose the whole addressed field');
    assert.equal(initial.view.inside,expected);
    assert.equal(await page.locator('[data-map-id]').count(),expected,'every destination retains an overview tick');
    const overviewIds=await page.locator('[data-map-id]').evaluateAll(ns=>ns.map(n=>n.dataset.mapId));
    assert.equal(initial.view.total,expected);assert.equal(initial.view.inside+initial.view.outside,expected);
    assert.equal(initial.view.counts.reduce((n,x)=>n+x,0),initial.view.inside);
    assert.equal(await page.locator('#fiAddress:visible').count(),1);
    assert.equal(await page.locator('#fieldUrlInput:visible').count(),0);
    assert.equal(await page.locator('#fieldUrlPanel:visible').count(),0);
    const barFit=await page.locator('#fiAddress').evaluate(n=>({width:n.clientWidth,name:n.querySelector('.fiBarName').clientWidth,meta:n.querySelector('.fiBarMeta').clientWidth,need:n.querySelector('.fiBarMeta').scrollWidth,grid:getComputedStyle(n.parentElement).gridTemplateColumns}));
    assert.ok(barFit.width>=160&&barFit.meta>=barFit.need,'bar count clipping '+width+' '+JSON.stringify(barFit));
    if(process.env.SCREENSHOT_DIR){fs.mkdirSync(process.env.SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,`field-overview-${width}.png`)});}
    const geometry=await page.evaluate(()=>{
      const rects=[...document.querySelectorAll('.fiMark')].map(n=>n.getBoundingClientRect());
      return {viewport:innerWidth,scroll:document.documentElement.scrollWidth,
        bad:rects.filter(r=>r.width<44||r.height<44||r.left<0||r.right>innerWidth||r.top<0||r.bottom>innerHeight).length,
        overlaps:rects.some((a,i)=>rects.some((b,j)=>j>i&&a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top))};
    });
    assert.equal(geometry.scroll<=width,true,'horizontal clipping '+width);assert.equal(geometry.bad,0,'unreachable marks '+width);assert.equal(geometry.overlaps,false);
    if(width<760){
      const cdp=await context.newCDPSession(page),boxes=await page.locator('.fiMark').evaluateAll(ns=>ns.slice(0,2).map(n=>{const r=n.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}}));
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[boxes[0]]});
      await page.waitForTimeout(500); // tests the native long-press arbitration threshold
      assert.equal(await page.evaluate(()=>FoveaLens.radial.ready()),false,'hidden old radial owns instrument long-press');
      await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[boxes[1]]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      assert.deepEqual((await page.evaluate(()=>FieldInstrument.snapshot())).frame,initial.frame,'sweep must only read');
      await cdp.detach();
    }
    const cmd=async s=>{if(await page.locator('#fiAddress:visible').count())await page.locator('#fiAddress').click();await page.locator('#fieldUrlInput').fill(s);await page.locator('#fieldUrlInput').press('Enter')};
    // Real pointer entry: the reading controls must survive leaving a focused mark.
    await page.locator('#fiReading [data-action="help"]').click();
    assert.equal(await page.locator('#fiReading small').evaluate(n=>n.scrollHeight<=n.clientHeight),true,'mark key clips on phone');
    await page.locator('#fiReading [data-close]').click();
    await page.locator('#fiReading [data-action="heads"]').click();
    await page.getByRole('button',{name:'Enter HOUSE / FIELD · /house/ · 1 objects',exact:true}).click();
    const readingBefore=await page.locator('#fiReading [data-near]').elementHandle();
    await page.mouse.move(1,1);
    assert.equal(await readingBefore.evaluate(n=>n.isConnected),true,'pointer exit must not replace a held reading control');
    await page.locator('[data-near]').click();
    await page.waitForFunction(()=>FieldInstrument.snapshot().frame.mode==='RELATIONS');
    const pointerWalk=await page.evaluate(()=>FieldInstrument.snapshot().frame);
    await page.locator('[data-origin]').click();await page.waitForURL(base+'/house/');
    await page.goBack();await page.waitForSelector('html[data-instrument="1"]');
    assert.deepEqual((await page.evaluate(()=>FieldInstrument.snapshot())).frame,pointerWalk,'ordinary pointer use must restore its exact walk');
    assert.deepEqual(await page.locator('[data-map-id]').evaluateAll(ns=>ns.map(n=>n.dataset.mapId)),overviewIds,'drilling must not move the overview addresses');
    await page.locator('#fiReturn').click();
    assert.deepEqual((await page.evaluate(()=>FieldInstrument.snapshot())).frame,initial.frame);
    await cmd(':delta');assert.match(await page.locator('#fiReading').textContent(),/no SEEN baseline/i);
    await cmd(':field');
    const allFrame=(await page.evaluate(()=>FieldInstrument.snapshot())).frame;
    await page.locator('.fiMark').first().click();
    assert.ok((await page.evaluate(()=>FieldInstrument.snapshot())).frame.path.length>0);
    await page.locator('#fiParent').click();assert.deepEqual((await page.evaluate(()=>FieldInstrument.snapshot())).frame,allFrame);
    await cmd('/house/');await cmd(':rewind');
    await page.waitForFunction(()=>__fieldAct.focusHref()===null&&FieldInstrument.snapshot().frame.focus===null);
    await cmd('/house/');await page.locator('#fiReturn').click();
    await page.waitForFunction(()=>__fieldAct.focusHref()===null&&FieldInstrument.snapshot().frame.focus===null);
    assert.deepEqual((await page.evaluate(()=>FieldInstrument.snapshot())).frame,initial.frame,'RETURN to unheld must clear native and projected focus');
    for(let turn=0;turn<4;turn++){
      const bad=await page.locator('.fiMark').evaluateAll(ns=>ns.some(n=>{const r=n.getBoundingClientRect();return r.width<44||r.height<44||r.left<0||r.right>innerWidth||r.top<0||r.bottom>innerHeight}));
      assert.equal(bad,false,'turn made a target unreachable '+width+' '+turn);await cmd(':turn');
    }
    await page.keyboard.press('Control+k');assert.equal(await page.locator('#fieldUrlInput:visible').count(),1);
    await page.locator('#fieldUrlInput').fill('source:git');await page.locator('#fieldUrlInput').press('ArrowLeft');
    assert.equal(await page.locator('#fieldUrlInput').evaluate(n=>n.selectionStart),9,'address editing must retain native caret movement');
    await page.locator('#fieldUrlInput').press('Escape');
    await cmd('@');
    const headsExpected=await page.evaluate(()=>FieldIndexReadModel.snapshot().heads.filter(h=>h!=='/'&&FieldIndexReadModel.snapshot().routes.some(r=>r.href===h)).length);
    assert.equal((await page.evaluate(()=>FieldInstrument.snapshot())).view.inside,headsExpected,'native CURRENT heads must compose into the same field');
    await cmd(':field');
    // Walking uses typed manifest edges and the SAME native held object.
    await cmd('/forward-field-proof/triangle/');await page.locator('[data-near]').click();
    if(process.env.SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,`field-nearby-${width}.png`)});
    assert.equal((await page.evaluate(()=>FieldInstrument.snapshot())).frame.mode,'RELATIONS');
    assert.match(await page.locator('#fiAddress').getAttribute('aria-label'),/declared neighbours/);
    const walkFrame=await page.evaluate(()=>FieldInstrument.snapshot().frame);
    await cmd(':anchor');
    const parent=page.locator('[data-relation="parent"]');assert.equal(await parent.count(),1);
    const sourceBeforeWalk=await page.evaluate(()=>JSON.stringify(FieldIndexReadModel.snapshot().routes));
    await parent.click();await page.waitForFunction(()=>__fieldAct.focusHref()==='/forward-field-proof/'&&FieldInstrument.snapshot().frame.focus==='/forward-field-proof/');
    assert.equal(await page.evaluate(()=>JSON.stringify(FieldIndexReadModel.snapshot().routes)),sourceBeforeWalk);
    await page.locator('#fiReturn').click();assert.deepEqual((await page.evaluate(()=>FieldInstrument.snapshot())).frame,walkFrame);
    assert.equal(await page.evaluate(()=>__fieldAct.focusHref()),'/forward-field-proof/triangle/');
    await page.locator('[data-origin]').click();await page.waitForURL(base+'/forward-field-proof/triangle/');
    await page.goBack();await page.waitForSelector('html[data-instrument="1"]');
    assert.deepEqual((await page.evaluate(()=>FieldInstrument.snapshot())).frame,walkFrame,'native use of the held origin must return to the same walk');
    // Every relation layout and camera turn remains reachable on a small phone.
    for(let turn=0;turn<4;turn++){
      assert.equal(await page.locator('.fiMark,.fiOrigin').evaluateAll(ns=>{const rs=ns.map(n=>n.getBoundingClientRect());return rs.some(r=>r.width<44||r.height<44||r.left<0||r.right>innerWidth||r.top<0||r.bottom>innerHeight)||rs.some((a,i)=>rs.some((b,j)=>j>i&&a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top))}),false);
      await cmd(':turn');
    }
    await cmd(':field');
    // A native-held address plus local geometry is retained through turn/reload/RETURN.
    await cmd('/house/');await page.waitForFunction(()=>FieldInstrument.snapshot().frame.focus==='/house/');
    const exact=await page.evaluate(()=>FieldInstrument.snapshot().frame);
    if(process.env.SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,`field-tool-${width}.png`)});
    const readingFit=await page.locator('#fiReading').evaluate(n=>{
      const rs=[...n.children].map(x=>x.getBoundingClientRect());
      return {overlap:rs.some((r,i)=>i>0&&r.top<rs[i-1].bottom-1),textOverflow:n.querySelector('p').scrollHeight>n.querySelector('p').clientHeight+1};
    });
    assert.equal(readingFit.overlap,false,'reading overlaps '+width);assert.equal(readingFit.textOverflow,false,'reading text clips '+width);
    await cmd(':anchor');await cmd(':turn');
    assert.equal((await page.evaluate(()=>FieldInstrument.snapshot())).frame.turn,1);
    await page.reload();await page.waitForSelector('html[data-instrument="1"]');
    assert.equal((await page.evaluate(()=>FieldInstrument.snapshot())).frame.turn,1);
    assert.equal(await page.evaluate(()=>__fieldAct.focusHref()),'/house/');
    await page.locator('#fiReturn').click();assert.deepEqual((await page.evaluate(()=>FieldInstrument.snapshot())).frame,exact);
    // SEEN and its inverse must use the old root owner, without domain mutation.
    const seenBefore=await page.evaluate(()=>JSON.stringify(FieldIndexReadModel.snapshot().seen));
    await cmd(':seen');await page.waitForFunction(()=>Object.keys(FieldIndexReadModel.snapshot().seen.items).length>0);
    await page.waitForFunction(()=>document.querySelector('#fiBarMeta').textContent.includes('∆0+?'));
    assert.match(await page.locator('#fiAddress').getAttribute('aria-label'),/changes unmeasured/,'partial SEEN must retain uncertainty, not invent neighbouring arrivals');
    await cmd(':rewind-seen');
    assert.equal(await page.evaluate(()=>JSON.stringify(FieldIndexReadModel.snapshot().seen)),seenBefore);
    await cmd(':field');await cmd('source:git kind:workbench');
    const filtered=await page.evaluate(()=>FieldInstrument.snapshot());assert.ok(filtered.view.inside>0&&filtered.view.inside<expected);
    assert.equal(filtered.view.inside+filtered.view.outside,expected);
    const downloadPromise=page.waitForEvent('download');await cmd(':receipt');
    const receipt=JSON.parse(fs.readFileSync(await(await downloadPromise).path(),'utf8'));
    assert.equal(receipt.witness.total,expected);assert.equal(receipt.witness.inside,receipt.witness.foldSum);
    assert.equal(receipt.authority,'EVIDENCE_ONLY');
    // Modifiers/native BACK keep their meaning; explicit open receives held address.
    await cmd('/house/');
    if(process.env.SCREENSHOT_DIR){fs.mkdirSync(process.env.SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,`field-instrument-${width}.png`)});}
    const beforeOpen=await page.evaluate(()=>FieldInstrument.snapshot().frame);
    await page.locator('#fiReading [data-open]').click();await page.waitForURL(base+'/house/');
    await page.goBack();await page.waitForSelector('html[data-instrument="1"]');
    assert.deepEqual((await page.evaluate(()=>FieldInstrument.snapshot())).frame,beforeOpen);
    assert.equal(await page.evaluate(()=>JSON.stringify(FieldIndexReadModel.snapshot().routes)),nativeBefore,'source route mutated');
    await cmd('/house/ :work');assert.equal(await page.locator('html[data-instrument="1"]').count(),0,'native WORK must reveal its own visible host, not run behind the field');
    assert.equal(await page.evaluate(()=>FieldZUI.state()),'WORK');
    await cmd(':instrument');await page.waitForSelector('html[data-instrument="1"]');
    await page.goto(base+'/?focus=/sleeper/');await page.waitForSelector('html[data-instrument="1"]');
    assert.equal((await page.evaluate(()=>FieldInstrument.snapshot())).frame.focus,'/sleeper/','an incoming exact source address must outrank a stale saved focus');
    assert.equal(await page.evaluate(()=>__fieldAct.focusHref()),'/sleeper/');
    await cmd(':plain');await page.reload();
    assert.equal(await page.locator('html[data-instrument="1"]').count(),0,'explicit plain mode must survive reload');
    await page.waitForSelector('#fieldUrlInput');
    // The operator's actual plain view is a first-class command surface, not
    // merely an escape hatch for the new instrument.
    const plain=page.locator('#fieldUrlInput');
    const issue=async phrase=>{await plain.fill(phrase);await plain.press('Enter')};
    await issue(':work /house/');
    await page.waitForFunction(()=>FieldZUI.state()==='WORK');
    assert.equal(await page.evaluate(()=>__fieldAct.focusHref()),'/house/','leading address command must hold the exact source');
    assert.equal(await page.locator('#workDepth').evaluate(n=>n.open),true,'WORK must actually open its native host');
    await page.evaluate(()=>{window.__omniProof=[];window.addEventListener('field-omnibar',e=>window.__omniProof.push(e.detail))});
    await issue(':prove /missing-native-route/');
    assert.equal(await page.evaluate(()=>FieldZUI.state()),'WORK','invalid explicit route must fail closed');
    assert.equal(await page.evaluate(()=>window.__omniProof.length),0,'invalid addressed command must not emit success');
    await issue(':prove /house/');
    await page.waitForFunction(()=>FieldZUI.state()==='PROVE');
    assert.equal(await page.locator('#refineFold').evaluate(n=>n.open),true,'PROVE must reveal native evidence');
    // Spy on the existing owner boundary, without copying a packet/clipboard.
    await page.evaluate(()=>{const node=document.getElementById('apCopy');window.__handoffProbe={node,parent:node.parentNode,next:node.nextSibling,click:node.onclick};window.__handoffCalls=0;node.onclick=()=>window.__handoffCalls++});
    await issue(':handoff');assert.equal(await page.evaluate(()=>window.__handoffCalls),1,'HANDOFF must invoke the native packet action once');
    const handoffEvents=await page.evaluate(()=>window.__omniProof.length);
    await page.evaluate(()=>__handoffProbe.node.remove());await issue(':handoff');
    assert.equal(await page.evaluate(()=>window.__omniProof.length),handoffEvents,'missing native HANDOFF must not emit success');
    await page.evaluate(()=>{const p=__handoffProbe;p.node.onclick=p.click;p.parent.insertBefore(p.node,p.next);delete window.__handoffProbe});
    await issue(':axis');
    assert.equal(await page.locator('#axialLatest').isVisible(),true,'AXIS must expose real axis rows');
    await issue(':help');
    assert.equal(await page.locator('#fieldUrlPanel:not([hidden])').count(),1,'plain HELP must open command registry');
    if(width<760)assert.equal(await page.locator('#fieldOmnibarKeys [data-command="help"]').isVisible(),true,'one discoverable mobile help affordance');
    await issue(':turn');
    await page.waitForSelector('html[data-instrument="1"]');
    const angle=await page.evaluate(()=>FieldInstrument.snapshot().frame.turn);
    assert.equal(Number.isInteger(angle),true,'TURN must resolve to a retained camera state');
    await cmd(':plain');await page.waitForSelector('html:not([data-instrument="1"])');
    await cmd(':instrument');await page.waitForSelector('html[data-instrument="1"]');
    await page.goto(base+'/?focus=/');await page.waitForSelector('html[data-instrument="1"]');
    assert.equal((await page.evaluate(()=>FieldInstrument.snapshot())).frame.focus,null,'explicit root address must clear saved native and projected focus');
    assert.equal(await page.evaluate(()=>__fieldAct.focusHref()),null);
    await page.goto(base+'/?fi=source%3Agit%20kind%3Aworkbench');await page.waitForSelector('html[data-instrument="1"]');
    assert.equal((await page.evaluate(()=>FieldInstrument.snapshot())).frame.query,'source:git kind:workbench','shared native bar expressions must outrank a stale saved scope');
    assert.equal((await page.evaluate(()=>FieldInstrument.snapshot())).view.inside,await page.evaluate(()=>FieldIndexReadModel.snapshot().routes.filter(r=>r.kind==='workbench').length));
    if(width===320&&height===568){
      // Every declared exit gets the exact native URL; prose-only ports get no invented action.
      for(const route of ['/laconic/','/prison-age/']){
        const actions=await page.evaluate(h=>FieldIndexReadModel.actions(h),route);assert.equal(actions.length,3);
        for(const a of actions){
          await cmd(route);const before=await page.evaluate(()=>FieldInstrument.snapshot().frame);
          await page.locator('[data-open]').click();
          assert.equal(await page.locator('#fiMenuPanel [data-op]').count(),3);
          await page.getByRole('button',{name:a.label+' declared native exit',exact:true}).click();
          await page.waitForURL(new URL(a.target,base).href);
          await page.goBack();await page.waitForSelector('html[data-instrument="1"]');
          assert.deepEqual((await page.evaluate(()=>FieldInstrument.snapshot())).frame,before);
        }
      }
      assert.equal(await page.evaluate(()=>FieldIndexReadModel.openAction('/laconic/','NO_SUCH_MOVE')),false);
      assert.equal(await page.evaluate(()=>JSON.stringify(FieldIndexReadModel.snapshot().routes)),nativeBefore);
    }
    assert.deepEqual(errors,[],'browser errors '+width);
    results.push(width+'×'+height);await context.close();
  }
  console.log('FIELD INSTRUMENT BROWSER PASS · '+results.join('/')+'px · stale HTTP cache rejected · enter/UP/camera cancellation · touch-sized disjoint marks · native SEEN/inverse · native open/BACK · exact reload/RETURN · count conservation · one fixed bar · source unchanged');
}finally{await browser.close();await new Promise(r=>server.close(r))}
