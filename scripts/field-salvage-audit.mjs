#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditSalvage } from '../lib/field-salvage-core.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = name => { const i=args.indexOf(name); return i>=0 ? args[i+1] : null; };
const wanted = arg('--route');
const expected = arg('--assert');
const summaryOnly = args.includes('--summary');

const manifest = JSON.parse(readFileSync(join(ROOT,'showcase-manifest.json'),'utf8'));
const current = JSON.parse(readFileSync(join(ROOT,'control/CURRENT.json'),'utf8'));
const routes = (manifest.routes || []).filter(r => r?.href && r.href !== '/');
const tracked = execFileSync('git',['ls-files','-z'],{cwd:ROOT,encoding:'utf8',maxBuffer:1<<27}).split('\0').filter(Boolean);
const textExt = new Set(['.html','.js','.mjs','.cjs','.json','.md','.yml','.yaml','.css','.txt','.svg','.xml']);
const ignore = new Set(['showcase-manifest.json','control/git-history.json','control/FIELD_SALVAGE_POLICY.json']);

function refClass(path, href){
  const own = href.replace(/^\/+|\/+$/g,'');
  if (own && (path===own || path.startsWith(own+'/'))) return 'self';
  if (path==='showcase-manifest.json') return 'registry';
  if (/^(returns|control\/confluence|recovery)\//.test(path) || path==='control/MIGRATION.json') return 'archive';
  if (/^(scripts|tools|lib|\.github)\//.test(path)) return 'tooling';
  if (/^control\//.test(path)) return 'control';
  return 'runtime';
}

const references=[];
for (const path of tracked) {
  if (ignore.has(path) || !textExt.has(extname(path).toLowerCase())) continue;
  let st; try { st=statSync(join(ROOT,path)); } catch { continue; }
  if (!st.isFile() || st.size>2_000_000) continue;
  let text=''; try { text=readFileSync(join(ROOT,path),'utf8'); } catch { continue; }
  for (const r of routes) {
    const href=r.href;
    if (href.length<2 || !text.includes(href)) continue;
    references.push({href,path,class:refClass(path,href)});
  }
}

const audit=auditSalvage(manifest,current,references);
let rows=audit.rows;
if (wanted) rows=rows.filter(r=>r.href===wanted);
if (wanted && !rows.length) {
  console.error('FIELD SALVAGE: route not found: '+wanted);
  process.exit(2);
}
if (expected && rows[0]?.classification!==expected) {
  console.error('FIELD SALVAGE ASSERT FAIL: expected '+expected+' got '+(rows[0]?.classification||'NONE'));
  console.error(JSON.stringify(rows[0],null,2));
  process.exit(1);
}
if (summaryOnly) {
  for (const r of rows) console.log([r.classification,r.href,r.blockers.join(',')||'clear',r.reason].join('\t'));
} else {
  console.log(JSON.stringify({
    schema:'field-salvage-audit/v0.1',
    source:{manifest:'/showcase-manifest.json',current:'/control/CURRENT.json'},
    law:'SURVEY → ISOLATE → SALVAGE → CUT → VERIFY → RETURN; classification never authorizes deletion',
    counts:audit.counts,
    rows
  },null,2));
}
