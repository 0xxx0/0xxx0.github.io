import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {browserBin} from './browser-bin.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=process.cwd();
const server=http.createServer((req,res)=>{
  const name=decodeURIComponent(new URL(req.url,'http://local').pathname);
  const file=path.join(root,name,name.endsWith('/')?'index.html':'');
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){
    res.writeHead(404).end();return;
  }
  const mime={'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp'};
  res.setHeader('Content-Type',mime[path.extname(file)]||'text/plain');
  fs.createReadStream(file).pipe(res);
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:browserBin(),args:['--no-sandbox','--disable-dev-shm-usage']});
const samples=[];
try{
  for(const [width,height,fieldIndex] of [[320,700,0],[390,844,6],[1280,900,9]]){
    const ctx=await browser.newContext({viewport:{width,height},hasTouch:width<760,acceptDownloads:true});
    const page=await ctx.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
    await page.goto(origin+'/sleeper/archive/');
    await page.waitForFunction(()=>document.querySelectorAll('#fields .review-link').length===10);
    assert.equal(await page.locator('#fields .review-link').count(),10,'exactly ten field entrances');
    assert.equal(await page.locator('#lineage .review-link').count(),0,'donor images cannot make source claims');
    assert.equal(await page.locator('#export .review-link').count(),0,'export art cannot make source claims');
    const figure=page.locator('#fields figure').nth(fieldIndex);
    const title=(await figure.locator('figcaption b').innerText()).replace(/^\d+\s+/,'');
    const link=figure.locator('.review-link');
    const href=await link.getAttribute('href'),u=new URL(href,origin);
    assert.equal(u.pathname,'/docs/');
    assert.equal(u.searchParams.get('src'),'/recovery/media/sleeper-atlas/catalog.json');
    assert.equal(u.searchParams.get('return'),'/sleeper/archive/#fields');
    assert.ok(Number.isInteger(Number(u.searchParams.get('ap_char'))),'exact source offset');
    if(width===320)assert.ok(Number(await figure.locator('.t').evaluate(e=>getComputedStyle(e).opacity))>.7,'touch caption visible');
    await link.click();
    await page.waitForFunction(()=>globalThis.ReadfieldSource?.snapshot().revision?.startsWith('sha256:'));
    const before=await page.evaluate(()=>ReadfieldSource.snapshot());
    const at=Number(u.searchParams.get('ap_char'));
    assert.equal(before.raw.slice(at,at+8),'"title":','source offset indexes the original JSON, not a synthetic caption');
    assert.ok(before.raw.slice(at,at+120).includes(title),'source address names clicked field');
    assert.ok(Math.abs((before.focus?.char_index??at)-at)<120,'initial aperture should hold this field');
    await page.locator('#rf-purpose').fill('Where could this field change a real decision?');
    await page.locator('#rf-purpose').press('Tab');
    await page.locator('[data-action="annotate"]').click();
    await page.locator('#rf-note').fill('Field '+title+': ask for an observed consequence, not another picture.');
    await page.locator('#rf-kind').selectOption('QUESTION');
    await page.locator('[data-save]').click();
    await page.waitForFunction(()=>ReadfieldReview.state().marks.length===1);
    assert.equal(await page.evaluate(()=>ReadfieldSource.snapshot().revision),before.revision,'annotation cannot rewrite source revision');
    await page.locator('[data-action="review"]').click();
    assert.match(await page.locator('.rf-fold').innerText(),/observed consequence/);
    await page.reload();
    await page.waitForFunction(()=>ReadfieldReview.state().marks.length===1);
    assert.equal(await page.evaluate(()=>ReadfieldSource.snapshot().revision),before.revision,'review survives reload on same exact revision');
    assert.equal(await page.locator('#returnLink').getAttribute('href'),'/sleeper/archive/#fields');
    await page.locator('#returnLink').click();
    await page.waitForURL('**/sleeper/archive/#fields');
    assert.equal(await page.locator('#fields .review-link').count(),10,'return preserved the ten-field gallery');
    assert.equal(errors.length,0,'browser errors: '+errors.join(' | '));
    samples.push({width,field:title,revision:before.revision,marks:1,returned:true});
    await ctx.close();
  }
  console.log('SLEEPER GALLERY ↔ READFIELD BROWSER PASS '+JSON.stringify(samples));
}finally{await browser.close();await new Promise(ok=>server.close(ok))}
