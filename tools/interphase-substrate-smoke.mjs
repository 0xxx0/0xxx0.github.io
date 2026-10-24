import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync} from 'node:fs';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,args:JSON.parse(process.env.SMOKE_ARGS||'[]'),executablePath:process.env.SMOKE_BROWSER||undefined});
const base=process.env.BASE_URL||'http://127.0.0.1:8765';
const errors=[];
try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/interphase/?legacy=1&route=/#substrate');
  await page.waitForSelector('body[data-interphase-mode="SUBSTRATE"] .substrate-stage');
  assert.equal(await page.locator('#railId').textContent(),'route:/');
  assert.equal(await page.locator('.substrate-shell').getAttribute('data-mapping'),'FIELD_FOLD_MAP');
  assert.equal(await page.locator('.operation-sectors .sector').count(),6);
  assert.ok(await page.locator('[data-substrate-group]').count()>0);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'390px horizontal overflow');
  const residue=page.locator('.substrate-residue a');
  assert.ok(await residue.count()>=1,'unmapped routes must remain visible rather than blank the field');
  assert.ok((await residue.allTextContents()).some(t=>/POO BABY/.test(t)),'PUBLISH / RETRIEVE residue must remain addressable');
  const href=await residue.first().getAttribute('href');
  assert.ok(href.startsWith('/interphase/?legacy=1&route='),'recenter must retain the legacy projection host');
  assert.ok(href.endsWith('#substrate'));
  await residue.first().click();
  await page.waitForSelector('body[data-interphase-mode="SUBSTRATE"] .substrate-stage');
  assert.notEqual(await page.locator('#railId').textContent(),'route:/','recenter must actually move the held route');
  assert.equal(new URL(page.url()).searchParams.get('legacy'),'1');
  assert.equal(new URL(page.url()).hash,'#substrate');

  const denied=await browser.newContext({viewport:{width:390,height:844}});
  await denied.addInitScript(()=>Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new DOMException('Storage blocked','SecurityError')}}));
  const blocked=await denied.newPage();blocked.on('pageerror',e=>errors.push('denied: '+e.message));
  await blocked.goto(base+'/interphase/?legacy=1&route=/#substrate');
  await blocked.waitForSelector('body[data-interphase-mode="SUBSTRATE"] .substrate-stage');
  await blocked.locator('#substrateDepth').click();
  assert.ok(['1','2','3'].includes(await blocked.locator('.substrate-shell').getAttribute('data-hops')),'depth remains usable without storage');
  const dir=process.env.SCREENSHOT_DIR;
  if(dir){mkdirSync(dir,{recursive:true});await blocked.screenshot({path:dir+'/glyphfield-storage-denied-390.png',fullPage:true});await page.screenshot({path:dir+'/glyphfield-recenter-390.png',fullPage:true})}
  assert.deepEqual(errors,[]);
  console.log('GLYPHFIELD PASS: 6-class fold with explicit OTHER residue, addressed link, exact legacy re-entry, 390px, denied storage');
  await denied.close();
}finally{await browser.close();}
