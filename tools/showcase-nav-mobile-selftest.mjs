#!/usr/bin/env node
import fs from 'node:fs';
const s=fs.readFileSync('showcase-nav.js','utf8'),fail=[],need=(x,m)=>{if(!x)fail.push(m)};
need(s.includes('.tab.read,.tab.lens{display:none}'),'mobile secondary floating tabs must be hidden');
need(s.includes('.mobileTools{display:grid}'),'mobile panel tools must be visible');
need(s.includes('class="mobileTools navOnly"'),'mobile READ/LENS panel row missing');
need(s.includes('data-a="read"')&&s.includes('data-a="lens"'),'mobile secondary actions missing');
need(s.includes("sh.querySelector('[data-a=\"read\"]').onclick=readContext")&&s.includes("sh.querySelector('[data-a=\"lens\"]').onclick=openLens"),'mobile secondary actions not wired');
need(s.includes('<button class="tab nav"')&&s.includes('<button class="tab read"')&&s.includes('<button class="tab lens"'),'desktop route actions must remain available');
if(fail.length){console.error('SHOWCASE NAV MOBILE FAIL · '+fail.join(' · '));process.exit(1)}
console.log('SHOWCASE NAV MOBILE PASS · one persistent mobile route control; READ/LENS preserved inside panel');
