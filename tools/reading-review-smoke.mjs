import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';
import {createRequire} from 'node:module';import {browserBin} from './browser-bin.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=process.cwd(),original='# Reading a work\n\nMeaning is made through attention.\n\nAn open question deserves an answer.\n\nMeaning changes what I do next.\n\nReturn to the passage to check the claim.';
let raw=original;
const server=http.createServer((req,res)=>{
 const name=decodeURIComponent(new URL(req.url,'http://local').pathname);
 if(name==='/__review.md'){res.setHeader('Content-Type','text/plain');res.end(raw);return}
 const file=path.join(root,name,name.endsWith('/')?'index.html':'');
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return}
 res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.json':'application/json'})[path.extname(file)]||'text/plain');fs.createReadStream(file).pipe(res);
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:browserBin(),args:['--no-sandbox','--disable-dev-shm-usage']});
fs.mkdirSync('/tmp/readfield-review-captures',{recursive:true});const results=[];
try{
 for(const [width,height] of [[320,640],[390,844],[1280,800]]){
  raw=original;const context=await browser.newContext({viewport:{width,height},hasTouch:width<760}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
  await page.goto(base+'/docs/?src=/__review.md&ap_scale=SENT&read_view=focus');
  await page.waitForFunction(()=>window.ReadfieldReview&&ReadfieldSource.snapshot().revision?.startsWith('sha256:'));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width,'no horizontal overflow');
  assert.equal(await page.locator('#jsonProjection').isVisible(),false,'JSON controls hidden for prose');
  for(const a of ['annotate','review','play','more']){const r=await page.locator('[data-action="'+a+'"]').boundingBox();assert.ok(r.y>=0&&r.y+r.height<=height&&r.x>=0&&r.x+r.width<=width,'reachable '+a+' '+width)}
  assert.equal(await page.locator('#sourceDrawer').getAttribute('open'),null,'source controls collapsed after load');
  await page.locator('#rf-purpose').fill('What changes my practice?');await page.locator('#rf-purpose').press('Tab');
  await page.locator('.rf-intent summary').click();await page.locator('#rf-terms').fill('Meaning;question');await page.locator('#rf-terms').press('Tab');
  assert.equal(await page.evaluate(()=>ReadfieldReview.state().matches.length),3);
  await page.locator('.rf-intent summary').click();
  // A native sentence anchor and later a user-selected multi-node span.
  await page.evaluate(()=>ReadfieldSource.seek(ReadfieldSource.snapshot().raw.indexOf('Meaning')));
  const before=await page.evaluate(()=>ReadfieldSource.snapshot().focus);
  await page.locator('[data-action="annotate"]').click();await page.locator('#rf-note').fill('Attention becomes useful when it changes a choice.');await page.locator('#rf-kind').selectOption('APPLIED');await page.locator('[data-save]').click();
  await page.waitForFunction(()=>ReadfieldReview.state().marks.length===1);
  assert.equal(await page.evaluate(()=>ReadfieldReview.state().applied),1);
  assert.equal(await page.evaluate(()=>ReadfieldSource.snapshot().raw),original,'annotation never edits the source');
  assert.equal(await page.evaluate(()=>ReadfieldSource.snapshot().focus.char_index),before.char_index,'annotation preserves cursor');
  await page.locator('[data-action="review"]').click();assert.match(await page.locator('.rf-fold').innerText(),/Attention becomes useful/);
  await page.locator('.rf-conclusion textarea').fill('Use attention to choose one next move.');await page.locator('.rf-conclusion textarea').press('Tab');
  await page.screenshot({path:'/tmp/readfield-review-captures/fold-'+width+'.png',fullPage:true});
  const download=page.waitForEvent('download');await page.locator('[data-export="json"]').click();const file=await(await download).path();const packet=JSON.parse(fs.readFileSync(file,'utf8'));assert.equal(packet.marks[0].quote,original.slice(packet.marks[0].charIndex,packet.marks[0].endIndex));
  // Wrong-source import fails without mutation.
  const forged=structuredClone(packet);forged.source.revision='sha256:'+'0'.repeat(64);
  await page.locator('#rf-import').setInputFiles({name:'forged.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(forged))});
  await page.waitForFunction(()=>ReadfieldReview.state().notice.includes('revision differs'));assert.equal(await page.evaluate(()=>ReadfieldReview.state().marks.length),1);
  await page.locator('[data-edit]').click();await page.locator('[data-delete]').click();await page.waitForFunction(()=>ReadfieldReview.state().marks.length===0);
  await page.locator('[data-undo]').click();await page.waitForFunction(()=>ReadfieldReview.state().marks.length===1);
  await page.locator('[data-fold="context"]').click();
  // Selection crosses the current-focus <mark>, so offsets must use source bytes rather than DOM markup.
  await page.evaluate(()=>{const v=document.getElementById('reading'),s=getSelection(),range=document.createRange(),walker=document.createTreeWalker(v,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);range.setStart(nodes[0],0);range.setEnd(nodes.at(-1),Math.min(8,nodes.at(-1).textContent.length));s.removeAllRanges();s.addRange(range);document.dispatchEvent(new Event('selectionchange'))});
  await page.locator('[data-action="annotate"]').click();await page.locator('#rf-note').fill('Why does this follow?');await page.locator('#rf-kind').selectOption('QUESTION');await page.locator('[data-save]').click();
  await page.waitForFunction(()=>ReadfieldReview.state().marks.length===2);
  assert.equal(await page.evaluate(()=>ReadfieldReview.state().open),1);
  const coverage=await page.evaluate(()=>ReadfieldReview.state().coverage);assert.ok(coverage>0&&coverage<=1);
  await page.reload();await page.waitForFunction(()=>window.ReadfieldReview?.state().marks.length===2);
  assert.equal(await page.locator('#rf-purpose').inputValue(),'What changes my practice?');assert.equal(await page.evaluate(()=>ReadfieldSource.snapshot().trail.review.conclusion),'Use attention to choose one next move.');
  await page.screenshot({path:'/tmp/readfield-review-captures/context-'+width+'.png',fullPage:true});
  // Seek + playback does not author interpretation.
  const count=await page.evaluate(()=>ReadfieldReview.state().marks.length);await page.locator('[data-action="play"]').click();await page.waitForFunction(()=>document.getElementById('docAperture').snapshot().playing);await page.locator('[data-action="play"]').click();assert.equal(await page.evaluate(()=>ReadfieldReview.state().marks.length),count);
  raw=original+'\n\nRevision changed.';await page.reload();await page.waitForFunction(()=>ReadfieldSource.snapshot().revision&&ReadfieldReview.state().unbound===2);
  assert.equal(await page.evaluate(()=>ReadfieldReview.state().coverage),0,'changed source never inherits annotated coverage');
  assert.deepEqual(errors,[],'browser errors '+width);results.push({width,height,status:'PASS'});await context.close();
 }
 console.log('READING REVIEW BROWSER PASS '+JSON.stringify(results));
}finally{await browser.close();await new Promise(r=>server.close(r))}
