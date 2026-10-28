import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {browserBin} from './browser-bin.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=process.cwd();
const lyrics='Wave and word together.\nEach beat keeps a real address.\nThe source returns unchanged.\n';
const server=http.createServer((req,res)=>{
 const name=decodeURIComponent(new URL(req.url,'http://local').pathname),file=path.join(root,name,name.endsWith('/')?'index.html':'');
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return}
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.mp3':'audio/mpeg','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');
 fs.createReadStream(file).pipe(res);
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:browserBin(),args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
try{
 const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true}),page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push('LISTEN: '+e.message));
 await page.goto(base+'/fold-bloom/listen/');
 await page.waitForFunction(()=>window.FoldBloomListen?.boot==='ready');
 const sound=fs.readFileSync(path.join(root,'fold-bloom/listen/test-fixtures/pulse-120bpm-2s.mp3'));
 await page.locator('#file').setInputFiles([
  {name:'pulse-120bpm-2s.mp3',mimeType:'audio/mpeg',buffer:sound},
  {name:'pulse-120bpm-2s.txt',mimeType:'text/plain',buffer:Buffer.from(lyrics)}
 ]);
 await page.waitForFunction(()=>{const s=window.FoldBloomListen?.state?.();return !!s?.fileMeta?.hash&&!!s?.map?.frames?.length&&!!s?.glyph?.radial?.length},{timeout:30000});
 await page.waitForFunction(()=>!!sessionStorage.getItem('rsvp.listen.companion.v1'),null,{timeout:10000});
 const packet=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('rsvp.listen.companion.v1')));
 assert.equal(packet.schema,'rsvp.listen.source-contour/v1');
 assert.equal(packet.semantics,'MEASURED_FRAME_ENERGY_NOT_PCM_WAVEFORM');
 assert.equal(packet.energy.length,72);
 assert.equal(packet.glyph.schema,'fold-bloom-audio-glyph/v0.1');
 assert.equal(packet.glyph.sourceHash,packet.audioHash);
 const appSource=await page.evaluate(()=>FoldBloomListen.state());
 assert.equal(packet.audioHash,appSource.fileMeta.hash);
 const {hashText}=await import('../lib/id.js').catch(()=>({hashText:null}));
 // Browser crypto is authoritative, not a guessed hash.
 const expected=await page.evaluate(async text=>{
  const bytes=new TextEncoder().encode(text);const digest=await crypto.subtle.digest('SHA-256',bytes);
  return 'sha256:'+Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
 },lyrics.trim());
 assert.equal(packet.textHash,expected,'LISTEN pairs only exact lyric source bytes');
 // READFIELD currently opens a same-origin tab; the session copy must carry
 // the real measured contour, exact text identity and native glyph.
 const [reader]=await Promise.all([
  page.waitForEvent('popup',{timeout:10000}),
  page.evaluate(()=>document.getElementById('useRead').click())
 ]);
 reader.on('pageerror',e=>errors.push('READER: '+e.message));
 await reader.waitForFunction(()=>window.ReadfieldControls&&document.getElementById('docAperture')?.A?.raw.includes('Each beat'),null,{timeout:30000});
 await reader.locator('.rf-source-tools summary').click();
 await reader.locator('#wristLink').click();
 await reader.waitForURL('**/rsvp/?handoff=1');
 await reader.waitForFunction(()=>window.RSVPSourceInstrument?.paired()===true,null,{timeout:10000});
 assert.equal(await reader.locator('#fullSource').textContent(),lyrics.trim(),'full paired lyric bytes stay readable');
 assert.equal(await reader.locator('#sourceContour line.audio').count(),72,'ring shows measured LISTEN energy not a fabricated waveform');
 assert.equal(await reader.locator('#listenGlyph svg[aria-label="audio fingerprint glyph"]').count(),1,'actual LISTEN native audio glyph projected in WRIST');
 assert.match(await reader.locator('#signalLabel').textContent(),/LISTEN · MEASURED ENERGY/);
 assert.equal(await reader.evaluate(()=>document.getElementById('wristAperture').A.raw),lyrics.trim());
 const before=await reader.evaluate(()=>document.getElementById('wristAperture').snapshot().char_index);
 const ring=await reader.locator('svg.orbit').boundingBox();
 await reader.mouse.click(ring.x+ring.width*.88,ring.y+ring.height*.5);
 const after=await reader.evaluate(()=>document.getElementById('wristAperture').snapshot().char_index);
 assert.notEqual(after,before,'audio overlay remains a real text-addressable RSVP ring');
 assert.deepEqual(errors,[],'no browser errors on LISTEN → READFIELD → WRIST');
 console.log('RSVP LISTEN RING PASS · actual MP3+TXT pairing · measured energy · native glyph · full text · ring SEEK · same source');
 if(process.env.SCREENSHOT_DIR){fs.mkdirSync(process.env.SCREENSHOT_DIR,{recursive:true});await reader.screenshot({path:path.join(process.env.SCREENSHOT_DIR,'rsvp-listen-390.png')})}
 await ctx.close();
}finally{await browser.close();await new Promise(r=>server.close(r))}
