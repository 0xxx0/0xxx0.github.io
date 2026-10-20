import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {browserBin} from './browser-bin.mjs';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const root=process.cwd(),server=http.createServer((req,res)=>{
  const name=decodeURIComponent(new URL(req.url,'http://local').pathname),file=path.join(root,name,name.endsWith('/')?'index.html':'');
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return}
  const type={'.html':'text/html','.mjs':'application/javascript','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'}[path.extname(file)]||'application/octet-stream';
  res.setHeader('Content-Type',type);fs.createReadStream(file).pipe(res);
});
const expected=JSON.parse(fs.readFileSync('showcase-manifest.json','utf8')).routes.filter(r=>r.href!=='/').length;
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:browserBin(),args:['--no-sandbox','--disable-dev-shm-usage']});
const results=[];
try{
  for(const [width,height] of [[320,568],[320,640],[390,844],[430,932],[1280,800]]){
    const context=await browser.newContext({viewport:{width,height},hasTouch:width<760,reducedMotion:'reduce',acceptDownloads:true});
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
    await page.goto(base+'/');
    await page.waitForSelector('html[data-instrument="1"]');
    const nativeBefore=await page.evaluate(()=>JSON.stringify(FieldIndexReadModel.snapshot().routes));
    const initial=await page.evaluate(()=>FieldInstrument.snapshot());
    assert.equal(initial.frame.intent,'HEADS','ordinary entry must expose the live instrument over native CURRENT heads');
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
    await cmd(':delta');assert.match(await page.locator('#fiReading').textContent(),/No SEEN baseline/);
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
  console.log('FIELD INSTRUMENT BROWSER PASS · '+results.join('/')+'px · touch-sized disjoint marks · native SEEN/inverse · native open/BACK · exact reload/RETURN · count conservation · one fixed bar · source unchanged');
}finally{await browser.close();await new Promise(r=>server.close(r))}
