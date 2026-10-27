import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildPreviewMap} from '../fold-bloom/listen/preview-map.js';
import {parseSunoId} from '../fold-bloom/listen/source-adapters.js';
import {demoWavBytes} from '../fold-bloom/listen/demo-tone.js';
const read=path=>readFileSync(path,'utf8');
const docs=read('docs/index.html'),listen=read('fold-bloom/listen/app.js'),
      markup=read('fold-bloom/listen/index.html'),
      worker=read('fold-bloom/listen/analysis-worker.js'),
      lens=read('fold-bloom/lens/studio-v12.js');
assert.match(docs,/id="demoRead"/);
assert.match(docs,/id="demoRead"[^]*?TRY RSVP/);
assert.match(docs,/A\.scaleIndex\?\.\('WORD'\)/);
assert.match(docs,/aperture\.scaleIndex\?\.\('WORD'\)/);
assert.match(docs,/<script src="\.\.\/lib\/readfield-controls\.js(?:\?v=[^"]+)?"><\/script>/);
assert.match(markup,/id="demoListen"/);
assert.match(listen,/demoWavBytes\(\)/);
assert.match(listen,/if\(requestId!==loadToken\)return/);
assert.match(listen,/e\.data\?\.requestId!==loadToken/);
assert.match(worker,/const requestId=e\.data\.requestId/);
assert.match(worker,/type:'result',requestId,map/);
assert.match(lens,/if\(!consumeLensHandoff\(\)\)\{setLab\(false\)/);
const wav=demoWavBytes();assert.ok(wav.length>100000);assert.equal(new TextDecoder().decode(wav.slice(0,4)),'RIFF');assert.equal(new TextDecoder().decode(wav.slice(8,12)),'WAVE');
const sample=new Float32Array(12000*3);
for(let i=0;i<sample.length;i++)sample[i]=Math.sin(i*Math.PI*2*440/12000)*.2;
const map=buildPreviewMap(sample,12000,3);
assert.equal(map.stage,'PREVIEW');
assert.ok(map.frames.length>=16);
assert.equal(map.duration,3);
assert.equal(parseSunoId('https://example.com/song/00000000-0000-0000-0000-000000000001'),null);
console.log('FOLD//BLOOM FIRST-USE CONTRACT PASS: reader/demo/worker/lens/fixture and preview');
