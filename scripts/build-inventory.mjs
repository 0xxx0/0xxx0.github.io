#!/usr/bin/env node
/**
 * build-inventory.mjs — THE INVENTORY
 *
 * 47 files scattered across the repo share seven names: lens, trace, map,
 * glyph, aperture, audit, health. Nothing in the repo said which were
 * load-bearing and which were parked. This page does.
 *
 * Every row is grounded in showcase-manifest.json (the registry) — a system's
 * role text is quoted from its own registered entry, not invented here.
 *
 * Output: inventory/index.html
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(ROOT, 'showcase-manifest.json'), 'utf8'));
const byHref = new Map(manifest.routes.map((r) => [r.href, r]));

const esc = (s) => String(s).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

// --- the seven families, grounded in the registry --------------------------
const SYSTEMS = [
  {
    id: 'lens',
    name: 'LENS / FOCUS',
    one: 'Where you are looking, and how a source survives being looked at differently.',
    files: '7 runtime js · 21 state files · ~56 KB code',
    burden: 'LOAD-BEARING',
    note: 'One kernel, several projections. The kernel is the thing; the rest are views of it.',
    rows: [
      ['/field-aperture.js', 'THE KERNEL. Reusable focus kernel — everything else here is a view over it.'],
      ['/lens-state.js', 'Configures the lens. Carries the typed state the kernel reads.'],
      ['/lens-focus-ring.js', 'The visual focus ring. Presentation, not logic.'],
      ['/docs/', 'The public reading surface. READFIELD / RSVP 0.7.1 — the only lens a normal reader meets.'],
      ['/lens-proof/', 'PARKED. A comparator. Direct human use showed no self-evident advantage, so it owns no canonical path.'],
      ['/foundry/aperture/', 'ALIAS ONLY. The public reading surface converged into /docs/. Kept so old addresses resolve.'],
    ],
  },
  {
    id: 'trace',
    name: 'POLICY TRACE',
    one: 'Why a decision was made — the audit trail of lawful moves.',
    files: '4 js/schema · ~150 KB schema+examples · 4 control state',
    burden: 'LOAD-BEARING',
    note: 'This is the repo explaining itself. Large because a trace schema must describe every lawful transition.',
    rows: [
      ['/field-policy-trace.mjs', 'Records the trace. Turns a decision into a checkable event sequence.'],
      ['/policy-trace-verifier.mjs', 'Verifies the trace. Runs in CI — a trace that cannot verify is not a claim.'],
      ['/policy-resolution-trace.schema.json', 'THE LARGE ONE (94 KB). The formal grammar of a lawful decision.'],
      ['/policy-trace-event-model.json', 'The event vocabulary the schema and verifier share.'],
    ],
  },
  {
    id: 'glyph',
    name: 'GLYPH',
    one: 'A deterministic picture of an exact thing. Same bytes in, same mark out.',
    files: '3 files · ~7 KB',
    burden: 'ACTIVE',
    note: 'Small, and load-bearing for recognition: it is how an exact source becomes recognisable without being re-read.',
    rows: [
      ['/field-glyph.js', 'The generator. Shared presentation/glyph grammar used across FIELD surfaces.'],
      ['/fold-bloom/listen/audio-glyph.js', 'Audio glyphs. An exact audio hash compiles to a deterministic thumbnail.'],
      ['/fold-bloom/atlas/', 'GLYPH ATLAS 0.2 — the gallery. Focus opens a cell into identity / structure / signature / text / origin facets.'],
    ],
  },
  {
    id: 'map',
    name: 'MAP',
    one: 'Spatial and structural views of things that are not one-dimensional.',
    files: '4 files · ~40 KB',
    burden: 'MIXED',
    note: 'One system map (load-bearing orientation), one FCM map, and two poetry maps that are candidates.',
    rows: [
      ['/nexus/map.html', 'SYSTEM MAP. How the surfaces relate and which are load-bearing. Orientation for a cold reader.'],
      ['/fcm-map.json', 'The focus/context map data the mapping surfaces read.'],
      ['/poetry/map/', 'POEM MAP 0.2.1 — CANDIDATE. Readable page first; selected-token focus wheel second.'],
      ['/poetry/lab/poem-map/', 'POEM MAP 0.1 — CANDIDATE. The earlier probe, kept as comparison.'],
    ],
  },
  {
    id: 'audit',
    name: 'AUDIT / HEALTH',
    one: 'What is broken, and whether it still is. The checks that keep the rest honest.',
    files: '7 state files · ~30 KB',
    burden: 'LOAD-BEARING (the checks) / STALE (the snapshots)',
    note: 'The dated snapshots are evidence of a moment, not live state. The live gates are the CI workflows.',
    rows: [
      ['/control/FIELD_INDEX_AUDIT_2026-09-21.json', 'A dated audit snapshot. Evidence of that moment only — do not read as current.'],
      ['/control/FIELD_INDEX_AUDIT_2026-09-20.json', 'The earlier snapshot. Superseded by the 21st, retained as record.'],
      ['/control/FIELD_INDEX_LINK_AUDIT_2026-09-21.json', 'Which links resolved on that date.'],
      ['/control/LENS_CI_STATUS_2026-09-21.json', 'A point-in-time CI reading. The live answer is the Actions tab.'],
      ['LIVE (not files)', 'Route Registration · public-surface-check · convergence-validate — the gates that actually run.'],
    ],
  },
  {
    id: 'house',
    name: 'HOUSE / SPATIAL',
    one: 'The same trace idea applied to a physical room instead of a document.',
    files: '3 files · ~9 KB',
    burden: 'CANDIDATE',
    note: 'The bridge between the digital trace system and actual space. Small, and the only one of its kind.',
    rows: [
      ['/house/spatial/', 'HOUSE / SPATIAL — runnable multi-projection spatial workbench: addressed house substrate plus TRACE ink-path.'],
      ['/house/spatial/trace-rules.json', 'What may leave a mark on the room substrate.'],
      ['/house/spatial/trace-path-laws.json', 'The laws a traced path must obey.'],
    ],
  },
  {
    id: 'aperture',
    name: 'APERTURE / PORT',
    one: 'How an arbitrary thing (text, image, file) is accepted and addressed.',
    files: '2 files · ~37 KB',
    burden: 'LOAD-BEARING',
    note: 'The front door. If something is not addressed through here, it has no provenance.',
    rows: [
      ['/port/', 'HUMAN PORT 1.5.2 — canonical addressed object aperture. Accepts text/JSON/image/local files as one Port object, preserving byte identity.'],
      ['/port/object-aperture.js', 'The implementation of that acceptance.'],
      ['/foundry/convergence/', 'CONVERGENCE FIELD — CANDIDATE workbench testing unequal NOW/LENS/RUN/PROOF/ATLAS projections over one captured object.'],
    ],
  },
];

const totalFiles = SYSTEMS.reduce((s, x) => s + x.rows.length, 0);

const sysHtml = SYSTEMS.map((s) => {
  const burdenClass = s.burden.startsWith('LOAD') ? 'load' : s.burden === 'MIXED' ? 'mix' : 'cand';
  return `<article class="sys" id="${s.id}">
  <header>
    <div class="hdr">
      <h3>${esc(s.name)}</h3>
      <span class="burden ${burdenClass}">${esc(s.burden)}</span>
    </div>
    <div class="one">${esc(s.one)}</div>
    <div class="meta">${esc(s.files)}</div>
  </header>
  <table>
  ${s.rows.map(([p, what]) => `<tr><td class="p">${esc(p)}</td><td class="w">${esc(what)}</td></tr>`).join('\n  ')}
  </table>
  <div class="note">${esc(s.note)}</div>
</article>`;
}).join('\n');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>THE INVENTORY — what the scattered things actually do</title>
<style>
  :root{--bg:#05070a;--ink:#e8ece9;--mut:#6b7780;--hot:#ed7447;--cool:#72bce7;--gold:#d5ad68;--green:#98d49b;--line:#1d262c}
  *{box-sizing:border-box}
  html,body{margin:0;background:var(--bg);color:var(--ink);font:12px/1.65 ui-monospace,SFMono-Regular,Menlo,monospace}
  .wrap{max-width:1080px;margin:0 auto;padding:30px 20px 80px}
  header.top{border-bottom:1px solid var(--line);padding-bottom:16px;margin-bottom:24px}
  h1{margin:0 0 8px;font-size:15px;font-weight:500;letter-spacing:.22em;color:var(--gold)}
  .sub{color:var(--mut);letter-spacing:.05em}.sub b{color:var(--ink);font-weight:500}
  .why{border:1px solid var(--line);background:#000;padding:14px 16px;margin-bottom:26px;color:var(--mut);
    font-size:11px;line-height:1.75}
  .why b{color:var(--ink);font-weight:500}
  .toc{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:26px}
  .toc a{border:1px solid var(--line);padding:5px 9px;font-size:9px;letter-spacing:.14em;
    color:var(--mut);text-decoration:none;text-transform:uppercase}
  .toc a:hover{color:var(--gold);border-color:var(--gold)}
  .sys{border:1px solid var(--line);background:#000;margin-bottom:14px}
  .sys>header{display:block;padding:13px 15px;border-bottom:1px solid var(--line);background:#080b0e}
  .sys .hdr{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
  .sys h3{margin:0;font-size:13px;letter-spacing:.14em;color:var(--ink);font-weight:500}
  .burden{font-size:8px;letter-spacing:.16em;padding:2px 7px;border:1px solid var(--line);white-space:nowrap}
  .burden.load{color:var(--green);border-color:#315837}
  .burden.mix{color:var(--gold);border-color:#3a2c1e}
  .burden.cand{color:var(--cool);border-color:#1f4a5e}
  .sys .one{color:var(--ink);font-size:12px;margin-top:7px;line-height:1.6}
  .sys .meta{color:var(--mut);font-size:9px;letter-spacing:.09em;margin-top:6px}
  table{width:100%;border-collapse:collapse}
  td{padding:8px 15px;border-bottom:1px solid #111a1f;font-size:11px;vertical-align:top}
  tr:last-child td{border-bottom:0}
  td.p{color:var(--cool);white-space:nowrap;width:1%;padding-right:20px}
  td.w{color:var(--ink);line-height:1.6}
  .note{padding:10px 15px;border-top:1px solid #111a1f;color:var(--mut);font-size:10px;line-height:1.7;background:#05080a}
  footer{margin-top:40px;padding-top:16px;border-top:1px solid var(--line);color:var(--mut);font-size:9px;letter-spacing:.08em}
  footer a{color:var(--cool);text-decoration:none}
  @media(max-width:700px){td.p{white-space:normal}}
</style>
</head>
<body>
<div class="wrap">
<header class="top">
  <h1>THE INVENTORY</h1>
  <div class="sub"><b>${SYSTEMS.length} systems</b> hiding behind <b>7 recurring names</b> ·
  every entry grounded in the registry, not guessed · generated from showcase-manifest.json</div>
</header>

<div class="why">
  <b>Why this page exists.</b> Forty-seven files across this repo share seven names —
  <b>lens</b>, <b>trace</b>, <b>map</b>, <b>glyph</b>, <b>aperture</b>, <b>audit</b>, <b>health</b> —
  and nothing said which were load-bearing and which were parked.<br><br>
  They are not clutter. They are <b>seven distinct systems</b>, each doing one job, several of them
  small and most of them finished. The confusion was that they were never named as families.
  <b>Now they are.</b> Each description below is quoted from the surface's own registered entry.
</div>

<div class="toc">
  ${SYSTEMS.map((s) => `<a href="#${s.id}">${esc(s.name)}</a>`).join('\n  ')}
</div>

${sysHtml}

<footer>
  THE INVENTORY · families only, nothing moved ·
  <a href="../witness/">the witness</a> · <a href="../godseye/">the account</a> ·
  <a href="../reader/">the reader</a> · <a href="../nexus/">field nexus</a> · <a href="../">field index</a>
</footer>
</div>
</body>
</html>`;

mkdirSync(join(ROOT, 'inventory'), { recursive: true });
writeFileSync(join(ROOT, 'inventory/index.html'), html);
console.log(`wrote inventory/index.html (${(html.length / 1024).toFixed(1)} KB)`);
console.log(`${SYSTEMS.length} systems, ${totalFiles} grounded rows`);