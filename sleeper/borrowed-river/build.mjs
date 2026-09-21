import fs from 'node:fs';
const here=new URL('./',import.meta.url);const read=n=>fs.readFileSync(new URL(n,here),'utf8');

const html=read('shell.html').replace('/*STYLE*/',read('style.css')).replace('/*DATA*/','const LANDSCAPE='+JSON.stringify('./landscape.jpg')+';').replace('/*CODE*/',read('engine.mjs').replace(/^export /gm,'')+'\n'+read('view.js'));
fs.writeFileSync(new URL('index.html',here),html);
console.log('Built Borrowed River: '+Buffer.byteLength(html)+' bytes');
