#!/usr/bin/env node
import fs from 'node:fs';
const html=fs.readFileSync('index.html','utf8');
const manifest=JSON.parse(fs.readFileSync('showcase-manifest.json','utf8'));
const contract=JSON.parse(fs.readFileSync('control/FIELD_INDEX_CONTRACT.json','utf8'));
const fail=[],need=(x,m)=>{if(!x)fail.push(m)};
need(/FIELD \/ CATCH \+ ACT/.test(html),'converged catch/action surface missing');
need(html.includes('id="catchupSignals"'),'YOU/GitHub signal rail missing');
need(html.includes("CATCHUP_ITEM_KEY='field.catchup.items.v02'"),'per-route seen state missing');
need(html.includes('function markRouteCaughtUp'),'one-by-one SEEN missing');
need(html.includes("data-catch-seen"),'SEEN control missing');
need(html.includes("data-catch-gate"),'CURRENT gate HOLD missing');
need(html.includes('function copyHeldAction'),'action handoff missing');
need(html.includes('function handoffHeldToDayline'),'held Dayline action missing');
need(html.includes("schema:'atlas-dayline-handoff/v0.1'"),'Dayline handoff schema missing');
need(html.includes("sessionStorage.setItem('atlas.dayline.handoff.v01'"),'Dayline session handoff write missing');
need(html.includes('data-cap-dayline'),'DAYLINE action control missing');
need(/ADD TO DAY remains Dayline/.test(contract.ui_contract?.root_action_aperture||''),'Dayline mutation boundary missing from contract');
need(html.includes("const CAP_TRIAL=INIT.get('cap')!=='0'"),'held aperture not default-on');
need(!html.includes('ACK LOCAL'),'pseudo-action ACK LOCAL survived');
need(html.includes('data-wait-hold'),'WAITING HOLD action missing');
need(html.includes('DO →'),'WAITING native DO missing');
const root=(manifest.routes||[]).find(r=>r.href==='/');
const ver=String(root?.version||'0.0.0').split('.').map(x=>Number(x)||0);
const atLeast087=ver[0]>0||(ver[0]===0&&(ver[1]>8||(ver[1]===8&&ver[2]>=7)));
need(atLeast087,'root version predates held-action aperture');
need(/^\/returns\/FIELD_INDEX_.*2026-09-25\.json$/.test(root?.latest_return||''),'FIELD INDEX RETURN not attached');
need((root?.transfer||[]).some(x=>/held action aperture/i.test(x)),'held-action transfer evidence missing');
need(!!contract.ui_contract?.root_action_aperture,'root action aperture contract missing');
need(/<details class="catchup" id="catchupFold" data-signal="CLEAR">/.test(html),'CATCH + ACT must be folded by default');
need(html.includes("signal=kinds>1?'MIXED'"),'mixed semantic signal derivation missing');
need(html.includes('signalInterference'),'moire/interference signal skin missing');
need(html.includes('prefers-reduced-motion:reduce'),'signal motion lacks reduced-motion fallback');
need(html.includes('class="fold catchReality" id="waitingFold"'),'REALITY detail not nested under attention strip');
need(!!contract.ui_contract?.root_attention_signal,'semantic attention-strip contract missing');
need(/Pattern never changes authority or priority/.test(contract.ui_contract?.root_attention_signal||''),'signal pattern authority boundary missing');
need((contract.laws||[]).some(x=>/^SIGNALS CONVERGE AT FOCUS/.test(x)),'focus/authority convergence law missing');
need(html.includes('class="headerPlay" href="./field-play.html"'),'single immediate PLAY action missing');
need(!html.includes('<nav>'),'duplicate top-level navigation rail survived');
const depthStart=html.indexOf('<div class="reentryBody">'),depthEnd=html.indexOf('</details>',depthStart),depth=depthStart>=0&&depthEnd>depthStart?html.slice(depthStart,depthEnd):'';
for(const href of ['./control/','./recovery/','./nexus/','./witness/','#traceFold','./lens-proof/','./house/','./control/confluence/','./foundry/','./migration/','./returns/','./control/FIELD_INDEX_CONTRACT.json']){
 need(depth.includes('href="'+href+'"'),'folded depth lost '+href);
}
need(!!contract.ui_contract?.root_depth_contraction,'root depth contraction contract missing');
need((contract.laws||[]).some(x=>/^DEPTH FOLDS; ACTION STAYS SURFACED/.test(x)),'lossless depth-fold law missing');
if(fail.length){console.error('FIELD action aperture FAIL · '+fail.join(' · '));process.exit(1)}
console.log('FIELD action aperture PASS · unequal signals → one held focus → ≤3 lawful root actions');
