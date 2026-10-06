#!/usr/bin/env node
import fs from 'node:fs';
import {compileCrewTurn,crewTurnMarkdown} from '../lib/field-crew-turn.mjs';

const args=process.argv.slice(2);
if(args.includes('--help')||!args.length){
  process.stdout.write([
    'FIELD CREW TURN · field-crew-turn/v0.1',
    '',
    'usage:',
    '  node tools/crew-turn.mjs <packet.json>',
    '  node tools/crew-turn.mjs <packet.json> --json',
    '',
    'canonical shape: control/SUBMISSION_CONTRACT.json#minimum_execution_projection',
    'law: one addressed object · one delta · one move · witnessed result · exact RETURN · next_authority NONE',
    ''
  ].join('\n'));
  process.exit(args.length?0:2);
}
const file=args.find(x=>!x.startsWith('--'));
if(!file){console.error('FIELD crew turn requires one packet JSON path');process.exit(2)}
try{
  const packet=JSON.parse(fs.readFileSync(file,'utf8'));
  const out=compileCrewTurn(packet);
  process.stdout.write(args.includes('--json')?JSON.stringify(out,null,2)+'\n':crewTurnMarkdown(out));
}catch(e){
  console.error(String(e?.message||e));
  process.exit(2);
}
