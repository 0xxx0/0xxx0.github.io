#!/usr/bin/env node
import fs from 'node:fs';
const index=fs.readFileSync('index.html','utf8'),agents=fs.readFileSync('AGENTS.md','utf8'),fail=[],need=(x,m)=>{if(!x)fail.push(m)};
need(index.includes("const masterHead=repoTouches[0]||null,fieldHead=repoTouches.find(c=>!isMachine(c.subject))||masterHead"),'master/field head split missing');
need(index.includes("meta.textContent='MASTER HEAD '"),'true MASTER HEAD label missing');
need(index.includes("' · FIELD '+fieldHead.sha.slice(0,8)"),'FIELD latest label missing');
need(!index.includes("meta.textContent='HEAD '+xs[0].sha"),'filtered field commit still mislabeled as HEAD');
need(agents.includes('Branch existence ≠ active work'),'branch authority law missing');
need(agents.includes('Generated snapshot commits are real Git mutations, not semantic FIELD changes'),'generated commit truth law missing');
if(fail.length){console.error('REPO TRUTH FAIL · '+fail.join(' · '));process.exit(1)}
console.log('REPO TRUTH PASS · exact master HEAD remains distinct from semantic field latest and branch existence has no attention authority');
