#!/usr/bin/env node
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),L=require('../lib/shopping-looter.js');
const args=process.argv.slice(2),src=args.find(x=>!x.startsWith('--'));
if(!src){console.error('usage: node scripts/shopping-looter-packet.mjs shopping-field-state.json [--at ISO] [--out file]');process.exit(2)}
const val=k=>{const i=args.indexOf(k);return i>=0?args[i+1]:null};
const at=val('--at')||new Date().toISOString(),out=val('--out');
const state=JSON.parse(fs.readFileSync(src,'utf8'));
if(state.schema!=='field-shopping-state/v0.1'||!Array.isArray(state.items))throw Error('field-shopping-state/v0.1 required');
const packet=L.makePacket(state.items,at);
const raw=JSON.stringify(packet,null,2)+'\n';
if(out)fs.writeFileSync(out,raw);else process.stdout.write(raw);
