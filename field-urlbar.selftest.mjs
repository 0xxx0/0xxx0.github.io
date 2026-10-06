#!/usr/bin/env node
import fs from 'node:fs';
import {
  VERSION,parseCommand,commandFromSearch,resolveSelector,withCommand,describeRoute,handoffPacket
} from './field-urlbar-core.mjs';

const fail=[];
const ok=(v,m)=>{if(!v)fail.push(m)};
const routes=[
  {href:'/',title:'FIELD INDEX',kind:'root',operation:'OPERATE',state:'ACTIVE'},
  {href:'/desk/',title:'FIELD DESK',kind:'workbench',operation:'OPERATE',state:'ACTIVE'},
  {href:'/house/',title:'HOUSE / FIELD',kind:'system',operation:'OPERATE',state:'ACTIVE'},
  {href:'/fold-bloom/live/',title:'FOLD//BLOOM LIVE',kind:'instrument',operation:'RIDE',state:'ACTIVE'}
];
const heads=[
  {route:'/desk/',lineage:'desk',head:'FIELD DESK',state:'ACTIVE'},
  {route:'/house/',lineage:'house-os',head:'HOUSE',state:'ACTIVE'}
];

ok(VERSION==='field-urlbar/v0.1','version');
ok(parseCommand('desk').selector==='desk'&&parseCommand('desk').action==='hold','bare selector → HOLD');
ok(parseCommand('desk:trace').action==='trace','explicit TRACE');
ok(parseCommand('desk open').action==='turn','OPEN alias → TURN');
ok(parseCommand('house:hermes').action==='handoff','HERMES alias → authority-none HANDOFF');
ok(parseCommand('/fold-bloom/live/:turn').selector==='/fold-bloom/live/','exact path selector');
ok(commandFromSearch('?f=desk%3Atrace').action==='trace','ASCII URL key');
ok(commandFromSearch('?%CF%86=house').selector==='house','phi URL key');

const desk=resolveSelector('desk',routes,heads,null);
ok(desk.state==='resolved'&&desk.route.href==='/desk/','slug resolution');
const house=resolveSelector('house-os',routes,heads,null);
ok(house.state==='resolved'&&house.route.href==='/house/','CURRENT lineage resolution');
const exact=resolveSelector('/fold-bloom/live/',routes,heads,null);
ok(exact.state==='resolved'&&exact.route.href==='/fold-bloom/live/','exact href resolution');
ok(resolveSelector('definitely-missing',routes,heads,null).state==='unresolved','unknown selector fails closed');
ok(resolveSelector('.',routes,heads,'/house/').route.href==='/house/','dot preserves current object');

const q=withCommand('?ax_state=ACTIVE&focus=%2Fdesk%2F',routes[1],'trace','f');
ok(q.includes('ax_state=ACTIVE'),'preserve unrelated FIELD query');
ok(q.includes('focus=%2Fdesk%2F'),'do not seize canonical focus param');
ok(q.includes('f=desk%3Atrace'),'URL command serialized');

const d=describeRoute(routes[2],heads[1]);
ok(d.id==='/house/'&&d.channels.includes('identity')&&d.channels.includes('authority'),'glyph descriptor preserves address + authority channel');
const packet=handoffPacket(routes[1],{
  actions:[{id:'operate',label:'OPERATE',action:'TURN',authority:'OFFER',target:'/desk/',dispatch:'HOST_NATIVE_ONLY',reversibility:'HOST_DEFINED'}],
  return:{address:'/desk/'}
});
ok(packet.authority==='NONE / ADDRESS + OFFER ONLY','handoff cannot acquire authority');
ok(packet.actions.length===1&&packet.actions[0].dispatch==='HOST_NATIVE_ONLY','handoff keeps host-native dispatch');
ok(packet.return_to==='/desk/','handoff return continuity');

const html=fs.readFileSync(new URL('./phi/index.html',import.meta.url),'utf8');
ok(html.includes('id="field"')&&html.includes('src="/"'),'phi projection embeds canonical FIELD root');
ok(!/<input\b/i.test(html),'URL bar is input surface; no duplicate text command box');
ok(html.includes('AUTHORITY NONE'),'visible authority boundary');
ok(html.includes('FieldIndexCarrier')&&html.includes('handoffPacket'),'handoff derives from existing FIELD carrier');
ok(html.includes("w.__fieldAct.focus(r.href)")&&html.includes("w.__fieldAct.open(r.href)"),'HOLD/TURN delegate to existing FIELD acting hand');
ok(!html.includes('API_SERVER_KEY')&&!html.includes('HERMES_API_KEY'),'browser surface carries no executor credentials');

if(fail.length){
  console.error('FIELD URLBAR SELFTEST FAIL · '+fail.join(' · '));
  process.exit(1);
}
console.log('FIELD URLBAR SELFTEST PASS · URL address → existing FIELD object/action → authority NONE → RETURN');
