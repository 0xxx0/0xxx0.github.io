#!/usr/bin/env node
import fs from 'node:fs';

const presentation=fs.readFileSync('field-presentation.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const fail=[];
const need=(ok,msg)=>{if(!ok)fail.push(msg)};

for(const id of ['aperture','workDepth','refineFold'])need(html.includes(`id="${id}"`),`FIELD ZUI host missing #${id}`);

const start=presentation.indexOf('FIELD SEMANTIC ZUI v0.1');
const end=presentation.indexOf("/* AWAKE is a presentation projection",start);
need(start>=0&&end>start,'FIELD semantic ZUI block missing');
const z=start>=0&&end>start?presentation.slice(start,end):'';

need(z.includes("const IDS=Object.freeze({WORK:'workDepth',PROVE:'refineFold'})"),'ZUI does not reuse existing WORK/PROVE apertures');
need(z.includes("return prove?.open?'PROVE':work?.open?'WORK':'HOLD'"),'ZUI depth is not derived from native details state');
need(z.includes("work.open=target==='WORK'")&&z.includes("prove.open=target==='PROVE'"),'ZUI does not enforce one semantic depth at a time');
need(z.includes("typeof document.startViewTransition==='function'"),'View Transition progressive enhancement missing');
need(z.includes("prefers-reduced-motion: reduce"),'reduced-motion fallback missing');
need(z.includes("e.key!=='Escape'")&&z.includes("close('escape')"),'Escape does not return semantic depth to HOLD');
need(z.includes("new CustomEvent('field-zui'")&&z.includes("authority:'NONE'"),'transient crew TRACE event missing or claims authority');
need(z.includes('window.FieldZUI=Object.freeze({state,open,close,toggle,transition})'),'crew ZUI hook missing');
need(z.includes('view-transition-name:field-zui-held'),'held-object continuity witness missing');
need(!/localStorage|sessionStorage|history\.|pushState|replaceState/.test(z),'ZUI created a persistent/history state plane');
need(!/focusRoute\(|location\.assign|setDensity\(|setBand\(/.test(z),'ZUI mutates focus/navigation/presentation density');
need(!/touch-action\s*:\s*none|pointerdown|touchstart|wheel/.test(z),'ZUI steals native touch/pointer/scroll gestures');
const prevents=(z.match(/preventDefault\(\)/g)||[]).length;
need(prevents===1&&z.includes("summary.addEventListener('click'"),'ZUI may prevent only the native details-summary toggle it replaces');

if(fail.length){console.error('FIELD ZUI FAIL · '+fail.join(' · '));process.exit(1)}
console.log('FIELD ZUI PASS · one address · HOLD ⇄ WORK ⇄ PROVE · native zoom untouched · authority NONE');
