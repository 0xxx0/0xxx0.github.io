import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({headless:true,args:JSON.parse(process.env.SMOKE_ARGS||'[]'),executablePath:process.env.SMOKE_BROWSER||undefined});
const base=process.env.BASE_URL||'http://127.0.0.1:8765';
try{
 for(const mobile of [false,true]){
  const page=await browser.newPage({viewport:{width:mobile?390:1440,height:mobile?844:1000},isMobile:mobile,hasTouch:mobile});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto(base+'/');
  await page.waitForFunction(()=>window.FoveaLens&&window.__fieldRouteMap?.all?.().size>0);
  const before=await page.evaluate(()=>({ids:[...window.__fieldRouteMap.all().keys()],focus:window.__fieldAct.focusHref()}));
  await page.evaluate(()=>{window.__fieldAct.focus('/sleeper/');window.FoveaLens.toggle(true)});
  await page.waitForFunction(()=>document.querySelector('.feedChip[data-fovea-band="PERIPHERY"]'));
  const d=await page.evaluate(()=>({
   bands:[...document.querySelectorAll('.feedChip[data-href]')].map(n=>({href:n.dataset.href,band:n.dataset.foveaBand,opacity:getComputedStyle(n).opacity})),
   ids:[...window.__fieldRouteMap.all().keys()],focus:window.__fieldAct.focusHref(),
   mode:window.FoveaLens.input().mode,signal:document.querySelector('#foveaOut')?.dataset.fieldSignal,
   label:document.querySelector('#foveaOut')?.textContent,
   expectedSignal:document.querySelector('.feedChip[data-href="/sleeper/"]')?.dataset.fieldSignal||'CLEAR'
  }));
  assert.deepEqual(d.ids,before.ids);assert.equal(d.focus,'/sleeper/');
  assert.ok(d.bands.some(n=>n.band==='PERIPHERY'&&Number(n.opacity)<1));
  assert.equal(d.mode,mobile?'pin':'snap');
  const periphery=page.locator('.feedChip[data-fovea-band="PERIPHERY"]').first();
  await periphery.focus();assert.equal(await periphery.evaluate(n=>getComputedStyle(n).opacity),'1');
  // No color-only decoder: addressed operation, textual signal and retained
  // count accompany the exact source-owned signal, including mobile PIN.
  assert.match(d.label,/retained/);assert.ok(['CLEAR','CHANGED','REALITY','EXTERNAL','MIXED'].includes(d.signal));
  assert.match(d.label,/\/sleeper\//);assert.equal(d.signal,d.expectedSignal);
  assert.equal(await page.locator('#foveaLens').evaluate(n=>getComputedStyle(n).mixBlendMode),'normal','text readout must not blend through its background');
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('#foveaLens')).opacity==='1');
  if(process.env.INTERPHASE_SCREENSHOTS)await page.screenshot({path:process.env.INTERPHASE_SCREENSHOTS+(mobile?'/mobile-fovea.png':'/fovea.png')});
  await page.evaluate(()=>window.FoveaLens.toggle(false));
  assert.equal(await page.locator('[data-fovea-band]').count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('foveaContext')),false);
  assert.equal(await page.evaluate(()=>window.__fieldAct.focusHref()),'/sleeper/');
  await page.close();
 }
 console.log('FOVEA BROWSER PASS: desktop SNAP, mobile PIN, semantic opacity, keyboard reveal, addressed signal, full identity conservation, reversible off');
}finally{await browser.close()}
