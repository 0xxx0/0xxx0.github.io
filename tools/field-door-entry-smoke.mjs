#!/usr/bin/env node
// Actual root FIELD → held source → declared receipt → exact RETURN → FIELD.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {browserBin} from './browser-bin.mjs';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const server=http.createServer((req,res)=>{
 const name=decodeURIComponent(new URL(req.url,'http://local').pathname);
 const file=path.resolve(root,'.'+name,(name.endsWith('/')?'index.html':''));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end('not found');return}
 const ext=path.extname(file),type={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.md':'text/plain'}[ext]||'text/plain';
 res.setHeader('Content-Type',type+'; charset=utf-8');
 fs.createReadStream(file).pipe(res);
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:browserBin(),args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const width of [320,390]){
  const context=await browser.newContext({viewport:{width,height:844},hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/?focus=%2Ffold-bloom%2F');
  await page.waitForFunction(()=>window.FieldBarLanding?.view?.()==='browse'&&window.FieldIndexReadModel?.snapshot?.().routes.length>0,null,{timeout:30000});
  const expected=await page.evaluate(()=>{const s=window.FieldIndexReadModel.snapshot();return{all:s.routes.length,heads:s.heads.length}});
  assert.equal(await page.locator('#feedRail .feedChip').count(),expected.heads,'resting glyphs must be CURRENT subset');
  const scope=page.locator('#feedRail .feedScopeToggle');
  assert.equal(await scope.isVisible(),true,'ALL scope must be reachable in one-screen glyph rail');
  await scope.click();
  assert.equal(await page.locator('#feedRail .feedChip').count(),expected.all,'ALL must expose every manifest route with no privileged omissions');
  assert.equal(await scope.getAttribute('data-scope'),'HEADS');
  await scope.click();
  assert.equal(await page.locator('#feedRail .feedChip').count(),expected.heads,'return to one-screen CURRENT subset');
  await page.evaluate(()=>window.__fieldAct.focus('/fold-bloom/'));
  const button=page.locator('#apDoor');
  assert.equal(await button.isVisible(),true,'DOOR must be visible in one-screen root at '+width);
  assert.equal(await button.getAttribute('href'),'/interphase/?route=%2Ffold-bloom%2F&return=%2F%3Ffocus%3D%252Ffold-bloom%252F');
  await button.click();
  await page.waitForFunction(()=>window.InterphaseInstrument?.snapshot?.()?.nativeRoute==='/fold-bloom/',null,{timeout:30000});
  let s=await page.evaluate(()=>window.InterphaseInstrument.snapshot());
  assert.equal(s.source.address,'/showcase-manifest.json');
  assert.equal(await page.locator('[data-ip=back]').isVisible(),true,'RETURN must be visible on held manifest route');
  const receipts=page.locator('.ip-relation').filter({hasText:'RECEIPT ↗'});
  assert.ok(await receipts.count()>0,'declared receipt must become a source entrance, not an invented route');
  await receipts.first().click();
  await page.waitForFunction(()=>window.InterphaseInstrument?.snapshot?.()?.source?.address.startsWith('/returns/'),null,{timeout:30000});
  await page.locator('[data-ip=back]').click();
  await page.waitForFunction(()=>window.InterphaseInstrument?.snapshot?.()?.nativeRoute==='/fold-bloom/',null,{timeout:30000});
  assert.equal(await page.locator('[data-ip=back]').isVisible(),true);
  await page.locator('[data-ip=back]').click();
  await page.waitForURL(u=>u.pathname==='/'&&u.searchParams.get('focus')==='/fold-bloom/',{timeout:30000});
  assert.deepEqual(errors,[],'no JS exceptions at '+width);
  console.log('PASS FIELD DOOR '+width+' · held route → exact typed receipt → source RETURN → original FIELD address');
  await context.close();
 }
}finally{await browser.close();await new Promise(ok=>server.close(ok))}
