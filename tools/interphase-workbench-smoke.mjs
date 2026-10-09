import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import U from '../lib/interphase.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
assert.equal(U.history,require('../lib/interphase-history.js'));
assert.equal(U.optics,require('../lib/path.js'));
assert.equal(U.lenses,require('../lib/interphase-lenses.js'));
assert.equal(U.audio.audioGlyphDescriptor({},{hash:'x'}).sourceHash,'x');
const browser=await chromium.launch({headless:true,args:JSON.parse(process.env.SMOKE_ARGS||'[]'),executablePath:process.env.SMOKE_BROWSER||undefined});
const page=await browser.newPage({viewport:{width:390,height:844}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const menu=async()=>{if(!await page.locator('#control').evaluate(el=>el.open))await page.locator('#control>summary').click()};
const unfold=async()=>{await menu();if(!await page.locator('.control-body').evaluate(el=>el.classList.contains('compositor-unfold')))await page.locator('.comp-unfold').click()};
const turn=async mode=>{await menu();await page.locator('[data-comp-action=VIEW]').click();await page.locator(`[data-comp-action="${mode}"]`).click()};
const returnLast=async()=>{await menu();await page.locator('[data-comp-action=RETURN]').click();await page.locator('[data-comp-action=LAST]').click();assert.equal(await page.locator('.comp-confirm').isVisible(),true);await page.locator('.comp-commit').click()};
const base=process.env.BASE_URL||'http://127.0.0.1:8765';
try{
  await page.goto(base+'/interphase/?route=/');
  await page.waitForSelector('#compactForm');
  assert.equal(await page.locator('#railId').textContent(),'route:/');
  await menu();
  assert.deepEqual(await page.locator('.comp-item').evaluateAll(xs=>xs.map(x=>x.dataset.compAction)),['VIEW','FIND','RETURN']);
  assert.equal(await page.locator('.modes').isVisible(),false);
  assert.equal(await page.locator('.control-body>.control-actions').isVisible(),false);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'compositor mobile overflow');
  await page.locator('#omnibar').fill('dayline');
  await page.waitForFunction(()=>document.querySelector('#compositorWheel')?.dataset.stage==='FIND');
  assert.ok(await page.locator('[data-comp-address]').count()>0);
  await page.locator('#control>summary').click();

  await page.locator('#compactForm [name=title]').fill('Durable local FIELD');
  await page.locator('#compactForm button[type=submit]').click();
  assert.match(await page.locator('#storageStatus').textContent(),/SAVED LOCALLY/);
  const revision=await page.locator('#railRev').textContent();
  const stored=await page.evaluate(()=>localStorage.getItem('interphase.history.v01:route:/'));
  await page.reload();await page.waitForSelector('#compactForm');
  assert.equal(await page.locator('#compactForm [name=title]').inputValue(),'Durable local FIELD');
  await turn('FIELD');
  assert.equal(await page.locator('#railId').textContent(),'route:/');
  const stage=await page.locator('#stage').boundingBox();
  await page.mouse.move(stage.x+60,stage.y+60);await page.mouse.down();await page.mouse.move(stage.x+100,stage.y+80);await page.mouse.up();
  assert.equal(await page.locator('#railRev').textContent(),revision);
  assert.equal(await page.evaluate(()=>localStorage.getItem('interphase.history.v01:route:/')),stored);
  await unfold();const downloading=page.waitForEvent('download');await page.locator('#exportBtn').click();
  const download=await downloading;const packet=JSON.parse(readFileSync(await download.path(),'utf8'));
  await returnLast();
  assert.notEqual(await page.locator('#fieldForm [name=title]').inputValue(),'Durable local FIELD');
  await page.locator('#importFile').setInputFiles({name:'return.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(packet))});
  await page.waitForFunction(()=>document.querySelector('#fieldForm [name=title]')?.value==='Durable local FIELD');
  const bad=structuredClone(packet);bad.history.nodes[0].snapshot.title='tampered';
  await page.locator('#importFile').setInputFiles({name:'tampered.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});
  await page.waitForFunction(()=>document.querySelector('#storageStatus').textContent.startsWith('IMPORT REJECTED'));
  assert.equal(await page.locator('#fieldForm [name=title]').inputValue(),'Durable local FIELD');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile overflow '+JSON.stringify(await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).map(e=>({tag:e.tagName,id:e.id,class:e.className,right:e.getBoundingClientRect().right})).slice(0,15))));
  await turn('COMPACT');await page.locator('#compactForm [name=title]').fill('');await page.locator('#compactForm button[type=submit]').click();
  // JSON extension installation gates semantic edits while leaving storage unchanged on rejection.
  await unfold();await page.locator('#control .control-body details').first().locator('summary').click();
  await page.locator('#loadExample').click();await page.waitForFunction(()=>document.querySelector('#extensionStatus').textContent.startsWith('ADDED'));
  await turn('COMPACT');await page.locator('#compactForm [name=title]').fill('Admitted title');await page.locator('#compactForm button[type=submit]').click();
  const validBytes=await page.evaluate(()=>localStorage.getItem('interphase.history.v01:route:/'));
  await returnLast();assert.match(await page.locator('#storageStatus').textContent(),/EDIT REJECTED/);assert.equal(await page.evaluate(()=>localStorage.getItem('interphase.history.v01:route:/')),validBytes);
  await turn('COMPACT');const beforeReject=await page.evaluate(()=>localStorage.getItem('interphase.history.v01:route:/'));
  await page.locator('#compactForm [name=title]').fill('');await page.locator('#compactForm button[type=submit]').click();
  assert.match(await page.locator('#storageStatus').textContent(),/EDIT REJECTED/);
  assert.equal(await page.evaluate(()=>localStorage.getItem('interphase.history.v01:route:/')),beforeReject);
  // A history preview is local; returning to it appends a new receipt.
  await turn('DISC');const beforePreview=await page.locator('#railRev').textContent();
  await page.locator('[data-receipt]').first().click();assert.equal(await page.locator('#railRev').textContent(),beforePreview);
  assert.equal(await page.locator('#receiptPreview').isVisible(),true);
  // Dayline is the existing native source, read unchanged across fan/line turns.
  const d={meta:{dayStart:'09:00',dayEnd:'18:00'},state:{now:'12:00',route:[],selected:'task:a'},anchors:[],tasks:[{id:'task:a',title:'Write the real thing',notes:'one useful outcome',earliest:'10:00',latest:'14:00',status:'open'}],events:[]};
  await page.evaluate(d=>localStorage.setItem('poly-atlas-dayline-branch-i-public-v1',JSON.stringify(d)),d);
  await turn('DAYLINE');await page.locator('[data-task="task:a"]').click();assert.equal(await page.locator('#railId').textContent(),'task:a');
  const dayBytes=await page.evaluate(()=>localStorage.getItem('poly-atlas-dayline-branch-i-public-v1'));
  await turn('FAN');assert.equal(await page.locator('#railId').textContent(),'task:a');
  assert.equal(await page.evaluate(()=>localStorage.getItem('poly-atlas-dayline-branch-i-public-v1')),dayBytes);
  assert.match(await page.locator('.task-row a').getAttribute('href'),/task=task%3Aa/);
  await turn('AXIS');await page.locator('[data-axis=kind]').selectOption('workbench');
  assert.ok(await page.locator('[data-route]').count()>0);await page.locator('[data-route]').first().click();
  assert.match(await page.locator('#railId').textContent(),/^route:/);
  // Recover Ω 0.4 with a small real-shaped input. Unknown measures are never fabricated.
  await turn('RESEARCH');assert.equal(await page.locator('#forwardBtn').isDisabled(),true);
  const seed={questions:[{id:'Q1',query:'Recover <img src=x onerror=alert(1)> as literal text',class:'source_recovery',gold_turn_ids:['chat:fixture:turn:1']}],rows:[{id:'Q1',top_hits:[{unit_id:'chat:fixture:turn:1',title:'Exact source',turn_index:1}],'coverage@10':1,'root_coverage@10':1,'hit@10':true}],threads:[{conversation_id:'fixture',title:'Fixture'}],by_class:{source_recovery:{n:1,'coverage@10':1,'root_coverage@10':1}},summary:[],raw_chars:42};
  await page.locator('#fileInput').setInputFiles({name:'benchmark.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(seed))});
  await page.waitForFunction(()=>document.querySelector('#railId').textContent==='Q1');
  assert.equal(await page.locator('.research img').count(),0);
  for(const view of ['disc','field','ledger','focus']){await page.locator('[data-view='+view+']').click();assert.equal(await page.locator('#railId').textContent(),'Q1');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'research mobile overflow in '+view);}
  await page.locator('[data-depth="4"]').click();assert.match(await page.locator('.descent').textContent(),/RAW SOURCE NOT LOADED/);
  await page.locator('#fileInput').setInputFiles({name:'sources.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({sources:[{unit_id:'chat:fixture:turn:1',text:'Exact imported turn. No invented source.'}]}))});
  await page.waitForFunction(()=>document.querySelector('.descent')?.textContent.includes('Exact imported turn.'));
  await turn('COMPACT');assert.equal(await page.locator('#railId').textContent(),'Q1');
  await turn('RESEARCH');assert.match(await page.locator('.mass h2').textContent(),/literal text/);
  // Bare browser URLs and trusted ESM transport resolve to the one implementation.
  assert.equal(await page.evaluate(async()=>{const {extensions:E}=await import('/lib/interphase.mjs');const p=await E.loadModule('../interphase/extensions/vector.mjs');return E.propose(E.compose(p),'dot',[1,2],{b:[3,4]})}),11);
  if(process.env.INTERPHASE_SCREENSHOTS){
    await page.screenshot({path:process.env.INTERPHASE_SCREENSHOTS+'/mobile-research.png',fullPage:true});
    await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:process.env.INTERPHASE_SCREENSHOTS+'/research.png',fullPage:true});
    await turn('FAN');await page.screenshot({path:process.env.INTERPHASE_SCREENSHOTS+'/fan.png',fullPage:true});
    await turn('COMPACT');await menu();await page.screenshot({path:process.env.INTERPHASE_SCREENSHOTS+'/compositor.png',fullPage:true});
  }
  assert.deepEqual(errors,[]);
  console.log('INTERPHASE WORKBENCH PASS: 3-root compositor, staged views/find/return, umbrella identity, real route, reload, view locality, export, explicit RETURN, import/tamper, extension gates, shared Dayline/fan, AXIS, Omega focus/disc/field/ledger/source descent, validated corpus, mobile');
}finally{await browser.close();}