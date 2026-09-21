#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const jsonPath = new URL('./app_atlas_v1.json', import.meta.url);
const htmlPath = new URL('./app_foundry_atlas_v1.html', import.meta.url);
const jsonBytes = fs.readFileSync(jsonPath);
const htmlBytes = fs.readFileSync(htmlPath);
const data = JSON.parse(jsonBytes.toString('utf8'));
const html = htmlBytes.toString('utf8');
const match = html.match(/const DATA = (.*);\nconst ideas = DATA\.ideas;/s);
if (!match) throw new Error('embedded DATA not found');
const embedded = JSON.parse(match[1]);
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const proof = {
  schema: '0xxx0/toolbelt-materialization-proof/v0.1',
  result: JSON.stringify(data) === JSON.stringify(embedded) ? 'PASS' : 'FAIL',
  ideas: data.ideas.length,
  json: { bytes: jsonBytes.length, sha256: sha(jsonBytes) },
  html: { bytes: htmlBytes.length, sha256: sha(htmlBytes) },
  embedded_data_equals_json: JSON.stringify(data) === JSON.stringify(embedded)
};
console.log(JSON.stringify(proof, null, 2));
if (proof.result !== 'PASS') process.exit(1);
