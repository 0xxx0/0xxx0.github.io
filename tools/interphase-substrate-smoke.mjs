import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const browser=await chromium.launch({headless:true,args:JSON.parse(process.env.SMOKE_ARGS||'[]'),executablePath:process.env.SMOKE_BROWSER||undefined});
const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
const base=process.env.BASE_URL||'http://127.0.0.1:8765';
try{
  await page.goto(base+'/interphase/?route=/#substrate');
  await page.waitForSelector('body[data-interphase-mode="SUBSTRATE"] .substrate-stage');
  assert.equal(await page.locator('#railId').textContent(),'route:/');
  assert.equal(await page.locator('.operation-sectors text').count(),6,'explicit FIELD action-class sectors');
  assert.equal(await page.locator('.substrate-shell').getAttribute('data-mapping'),'FIELD_FOLD_MAP');
  assert.ok(await page.locator('[data-substrate-group]').count()>0,'semantic neighbors');
  assert.ok(await page.locator('.declared-edge line').count()>0,'declared parent edges visible');
  assert.equal(await page.locator('#surfaceDesc').textContent(),'semantic substrate · warranted coordinates only');
  assert.equal(await page.locator('.substrate-residue').count(),0,'current fold covers visible route operations');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'GLYPHFIELD mobile overflow');

  const first=page.locator('[data-substrate-group]').first();
  await first.click();
  assert.equal(await page.locator('.substrate-readout .btn').textContent(),'HOLD / RECENTER');
  assert.match(await page.locator('.substrate-readout small').textContent(),/→ (?:SEE|WAYFIND|OPERATE|MAKE|PLAY|RECOVER) · \d+ hop/,'raw operation must remain visible beside its explicit class');
  const target=await page.locator('.substrate-readout .btn').getAttribute('href');
  assert.match(target,/\/interphase\/\?route=.*#substrate$/);

  const before=await page.locator('.substrate-shell').getAttribute('data-hops');
  await page.locator('#substrateDepth').click();
  await page.waitForFunction(before=>document.querySelector('.substrate-shell')?.dataset.hops!==before,before);
  assert.ok(['1','2','3'].includes(await page.locator('.substrate-shell').getAttribute('data-hops')));

  // Every visible coordinate is a reviewable action-class cell + integer parent-hop ring.
  // Exact collisions aggregate; there is no force-layout jitter.
  const nodes=await page.locator('[data-substrate-group]').evaluateAll(xs=>xs.map(x=>({key:x.dataset.substrateGroup,d:Number(x.dataset.distance),left:x.style.left,top:x.style.top})));
  assert.ok(nodes.every(x=>/^\d+\|(?:SEE|WAYFIND|OPERATE|MAKE|PLAY|RECOVER)$/.test(x.key)&&Number.isInteger(x.d)&&x.d>0&&x.left&&x.top));

  if(process.env.INTERPHASE_SCREENSHOTS){
    await page.screenshot({path:process.env.INTERPHASE_SCREENSHOTS+'/substrate-mobile.png',fullPage:true});
    await page.setViewportSize({width:1200,height:900});await page.screenshot({path:process.env.INTERPHASE_SCREENSHOTS+'/substrate.png',fullPage:true});
  }
  assert.deepEqual(errors,[]);
  console.log('INTERPHASE GLYPHFIELD PASS: exact fold re-entry, 6 explicit action sectors, parent-hop radius, declared edges, full visible operation coverage, staged recenter, depth control, mobile');
}finally{await browser.close();}
