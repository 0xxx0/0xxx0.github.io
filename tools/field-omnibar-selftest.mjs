#!/usr/bin/env node
import fs from 'node:fs';

const omni=fs.readFileSync('field-omnibar.js','utf8');
const presentation=fs.readFileSync('field-presentation.js','utf8');
const fail=[];
const need=(ok,msg)=>{if(!ok)fail.push(msg)};

need(presentation.includes("import('./field-omnibar.js')"),'presentation host does not mount omnibar');
need(omni.includes("location.pathname!=='/'"),'omnibar is not root-scoped');
need(omni.includes("window.__fieldRouteMap?.all?.()"),'omnibar does not reuse canonical FIELD route map');
need(omni.includes("window.__fieldAct"),'omnibar bypasses existing FIELD acting hand');
need(omni.includes("window.FieldZUI"),'omnibar does not reuse semantic HOLD / WORK / PROVE depth');
need(omni.includes("window.FieldLensHost"),'omnibar does not reuse existing projection host');
need(omni.includes("document.getElementById('apCopy')?.click()"),'HANDOFF does not reuse existing FIELD action packet');
need(omni.includes("node tools/field-hermes-run.mjs --source"),'Hermes prepare bridge missing');
need(!omni.includes('--execute'),'public omnibar must never mint Hermes execution authority');
need(!/HERMES_API_KEY|API_SERVER_KEY|Authorization\s*:|Bearer\s/.test(omni),'public omnibar references executor credentials');
need(!/localStorage|sessionStorage|indexedDB|history\.|pushState|replaceState/.test(omni),'omnibar created persistent/history state');
need(!/\bfetch\s*\(/.test(omni),'omnibar created its own network/data plane');
need(!/\beval\s*\(|new Function\b/.test(omni),'omnibar created arbitrary code execution');
need(omni.includes("authority:'NONE'"),'omnibar trace event does not declare authority NONE');
need(omni.includes(".slice(0,7)"),'omnibar result aperture is not bounded');
need(omni.includes("e.key==='/'")&&omni.includes("e.key.toLowerCase()==='k'"),'keyboard aperture missing');
/* M1 · ONE registry: field-urlbar.js owns the command table (union of both
   pre-fold tables, one glyph per id); the omnibar must BIND it, not copy it. */
const reg=fs.readFileSync('field-urlbar.js','utf8');
for(const glyph of ['⌂','◎','▽','◆','↗','↩','⎘','▶'])need(reg.includes("glyph:'"+glyph+"'"),'operator glyph missing '+glyph);
for(const command of ['hold','work','prove','open','return','handoff','run','trace','read','map','recent'])need(reg.includes("id:'"+command+"'"),'operator missing '+command);
need(omni.includes('FieldURLBarCore'),'omnibar does not bind the shared registry');
need(!/const COMMANDS\s*=\s*Object\.freeze\(\[/.test(omni),'second command registry found in field-omnibar.js');
/* M4 · route commands carried as registry data (plain navigation / copy) */
for(const nav of ["/desk/","/returns/","/reader/","/digests/#pp"])need(reg.includes("nav:'"+nav+"'"),'route command missing '+nav);
for(const url of ["http://127.0.0.1:8777/hub","http://127.0.0.1:8777/calls"])need(reg.includes("copy:'"+url+"'"),'reader URL copy missing '+url);
need(reg.includes("id:'help'"),' :help registry command missing');
/* M3 · one keydown owner: the omnibar listener is a passthrough while the
   URLbar line exists — field-urlbar.js owns document / ⌘K : */
need(omni.includes("if(document.getElementById('fieldUrlBar'))return;"),'omnibar keydown is not a passthrough');
need(omni.includes("parsed.command==='help'"),'omnibar own-mount help branch missing');
need(omni.includes("@media(max-width:760px)"),'mobile compression rule missing');
need(omni.includes('prefers-reduced-motion:reduce'),'reduced-motion path missing');

if(fail.length){console.error('FIELD OMNIBAR FAIL · '+fail.join(' · '));process.exit(1)}
console.log('FIELD OMNIBAR PASS · one address line · glyph operators · existing FIELD handoff/Hermes seam · authority NONE');
