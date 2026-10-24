import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const root=process.cwd();
const server=http.createServer((req,res)=>{
 const name=decodeURIComponent(new URL(req.url,'http://local').pathname),file=path.join(root,name,name.endsWith('/')?'index.html':'');
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);res.end();return}
 res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.json':'application/json','.css':'text/css'})[path.extname(file)]||'text/plain');
 fs.createReadStream(file).pipe(res);
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,args:JSON.parse(process.env.SMOKE_ARGS||'[]'),executablePath:process.env.SMOKE_BROWSER||undefined});
try{
 for(const width of [320,390,1280]){
  const context=await browser.newContext({viewport:{width,height:width===320?700:900},reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/interphase/?route=%2F#glyphfield');
  try{await page.waitForFunction(()=>window.InterphaseSemanticField?.snapshot().active&&document.querySelector('.ip-field-stage .ip-field-node'),{timeout:12000})}
  catch(error){
   const diagnostic=await page.evaluate(()=>({url:location.href,source:window.InterphaseInstrument?.snapshot()?.source?.label,route:window.InterphaseInstrument?.snapshot()?.nativeRoute,semantic:window.InterphaseSemanticField?.snapshot(),fieldText:document.querySelector('#ip-semantic-field')?.innerText?.slice(0,600),pageText:document.body.innerText.slice(0,700)}));
   console.error('SEMANTIC_BOOT_DIAGNOSTIC',JSON.stringify({diagnostic,errors}));
   throw error;
  }
  const snap=()=>page.evaluate(()=>InterphaseInstrument.snapshot()),s=await snap();
  assert.equal(s.nativeRoute,'/','held native route remains source of FIELD focus');
  assert.equal(await page.locator('.ip-continuum').getAttribute('data-semantic-field'),'1');
  assert.equal(await page.locator('.ip-space').isVisible(),false,'no duplicate native source pane');
  assert.equal(await page.locator('.ip-field-rings circle').count(),2,'depth-two horizon');
  assert.equal(await page.locator('.ip-field-legend span').count(),6,'explicit six-action compass');
  assert.equal(await page.locator('.ip-field-edge').count(),0,'no all-edges hairball until selection');
  assert.ok(await page.locator('.ip-field-node').count()>0);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no mobile horizontal overflow');
  const coordinates=await page.locator('.ip-field-node').evaluateAll(nodes=>nodes.map(n=>({cell:n.dataset.semCell,x:parseFloat(n.style.left),y:parseFloat(n.style.top)})));
  const lawful=await page.evaluate(async cs=>{
   const k=await import('/interphase/substrate-kernel.mjs');
   return cs.every(c=>{const [d,op]=c.cell.split('|'),p=k.semanticPoint(op,+d,{kernel:k.ACTION_KERNEL,maxHops:2});
    return p&&Math.abs(c.x-p.x*100)<.0011&&Math.abs(c.y-p.y*100)<.0011});
  },coordinates);
  assert.equal(lawful,true,'node coordinates exactly decode from action class and declared parent hops');
  await page.locator('.ip-field-node').first().click();
  assert.ok(await page.locator('[data-sem-open]').count(),'tap yields concrete source HOLD action');
  assert.ok(await page.locator('.ip-field-edge').count()>0,'only selected declared edges appear');
  const before=await snap();
  const target=await page.locator('.ip-field-inspect b').textContent();
  await page.locator('[data-sem-open]').click();
  await page.waitForFunction(()=>InterphaseInstrument.snapshot()?.nativeRoute!=='/');
  assert.notEqual((await snap()).nativeRoute,'/');
  assert.ok((await page.locator('.ip-field-center').count())===1,'same field recenters');
  await page.locator('[data-sem-return]').click();
  await page.waitForFunction(()=>InterphaseInstrument.snapshot()?.nativeRoute==='/');
  const after=await snap();
  assert.equal(after.source.hash,before.source.hash,'same byte source after RETURN');
  assert.equal(after.attention.char,before.attention.char,'exact source cursor after RETURN');
  await page.locator('[data-ip="view-plain"]').click();
  assert.equal(await page.locator('.ip-continuum').getAttribute('data-semantic-field'),'0');
  assert.equal(await page.locator('.ip-space').isVisible(),true,'native READ recovers intact');
  await page.evaluate(()=>InterphaseInstrument.load('An untethered local text','local'));
  await page.locator('[data-ip-semantic]').click();
  await page.waitForFunction(()=>document.querySelector('.ip-field-held'));
  assert.match(await page.locator('.ip-field-held').textContent(),/no declared FIELD route/,'unmapped source refuses invented geography');
  if(process.env.SCREENSHOT_DIR){
   fs.mkdirSync(process.env.SCREENSHOT_DIR,{recursive:true});
   await page.goto(base+'/interphase/?route=%2F#glyphfield');
   await page.waitForSelector('.ip-field-node');
   await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,'semantic-field-'+width+'.png'),fullPage:true});
  }
  assert.deepEqual(errors,[],'no page errors');
  console.log('CONTINUUM GLYPHFIELD PASS '+width+'px · source continuity, warranted coordinates, selected-only edges, native HOLD and exact RETURN, plain fallback');
  await context.close();
 }
}finally{await browser.close();await new Promise(r=>server.close(r))}
