const fs = require('fs');
const vm = require('vm');
const { performance } = require('perf_hooks');
const assert = (x,m)=>{ if(!x) throw new Error(m); };
const V = require('../lib/sleeper-return-v2.js');

const must = [
  'sleeper/index.html',
  'sleeper/native-core.js',
  'sleeper/native-engine.js',
  'sleeper/native-views.js',
  'sleeper/native-ui.js',
  'sleeper/native.css',
  'recovery/sleeper/site-source-2026-09-18/app/one-return/world-law.ts',
  'recovery/sleeper/site-source-2026-09-18/app/one-return/protocol.ts',
  'returns/SLEEPER_HUMAN_RETURN_0C4VA6Q_2026-09-27.json'
];
for(const p of must) assert(fs.existsSync(p), 'missing native-port dependency: '+p);

const html = fs.readFileSync('sleeper/index.html','utf8');
for(const src of ['./native-core.js','./native-engine.js','./native-views.js','./native-ui.js']) assert(html.includes(`src="${src}"`), 'host does not import '+src);
assert(!/location\.(replace|href)\s*=?.*metaname/i.test(html), 'canonical /sleeper/ still redirects to historical host');
for(const view of ['city','plan','disc','trace']) assert(html.includes(`data-view="${view}"`), 'missing projection control: '+view);

const core = fs.readFileSync('sleeper/native-core.js','utf8');
const engine = fs.readFileSync('sleeper/native-engine.js','utf8');
const views = fs.readFileSync('sleeper/native-views.js','utf8');
const ui = fs.readFileSync('sleeper/native-ui.js','utf8').replace(/\ninit\(\);\s*$/,'\n');
const frozenLaw = fs.readFileSync('recovery/sleeper/site-source-2026-09-18/app/one-return/world-law.ts','utf8');
const frozenProtocol = fs.readFileSync('recovery/sleeper/site-source-2026-09-18/app/one-return/protocol.ts','utf8');
new vm.Script(views, { filename:'native-views.js' });

for(const marker of ['compileWorldLaw','makeReturnArtifact','PROVENANCE','RESILIENCE','URCHIN','SLOTHCAKE','KITE']) assert(frozenLaw.includes(marker), 'frozen law marker missing: '+marker);
for(const marker of ['evaluateToolGate','truthProofProgress','advanceMeasureProof','resilienceContact']) assert(frozenProtocol.includes(marker), 'frozen protocol marker missing: '+marker);

assert(engine.includes("projection=projection==='city'?'disc':'city'"), 'recovered SPIRAL CITY<->DISC transition drifted');
for(const marker of ['PROJECTION ONLY / NO GATE PROOF','TRACE NEVER SATISFIES GATES','EVIDENCE-ONLY PROJECTION']) assert(views.includes(marker), 'projection authority marker missing: '+marker);
assert(!/\bopenGate\s*\(/.test(views), 'inspection projection may not open Gates');
assert(!/\buseTool\s*\(/.test(views), 'inspection projection may not invoke proof-bearing tools');

const ctx = vm.createContext({ console, performance, setTimeout:()=>0, clearTimeout:()=>{}, localStorage:{getItem:()=>null,setItem:()=>{}}, Math, JSON, Intl });
vm.runInContext(core + '\n;globalThis.__nativeCore={compile,buildCity,CELLS,FIGURES,GATES,PRIMARY};', ctx, { filename:'native-core.js' });
vm.runInContext(engine, ctx, { filename:'native-engine.js' });
vm.runInContext(ui + '\n;globalThis.__nativeUI={makeArtifact,newGame};', ctx, { filename:'native-ui.js' });

const S = ctx.__nativeCore;
assert(S.CELLS.length===6, 'native port must expose six Verse Cells');
assert(S.FIGURES.length===3, 'native port must expose three Figures');
assert(Object.keys(S.GATES).length===8, 'native port must expose eight Gates');

const receipt = JSON.parse(fs.readFileSync('returns/SLEEPER_HUMAN_RETURN_0C4VA6Q_2026-09-27.json','utf8'));
const a = receipt.artifact;
const baseline = V.validate(a);
assert(baseline.ok, 'reference Return Artifact must validate: '+baseline.errors.join(' | '));
const law = S.compile(a.source,a.cell.id,a.figure);
assert(law.key===a.worldKey, `native world key drift: ${law.key} != ${a.worldKey}`);
const transferProof = a.proofs.find(p=>p.gate==='TRANSFER');
assert(transferProof && law.transferTool===transferProof.method, 'native TRANSFER tool drift');
for(let i=0;i<law.gateOrder.length;i++){
  const gate = law.gateOrder[i];
  const proof = a.proofs.find(p=>p.gate===gate);
  assert(proof, 'reference proof missing gate '+gate);
  assert(String(proof.token)===String(law.cellTokens[i]), `native token drift at ${gate}`);
}

const c1 = S.buildCity(a.source,a.cell.id,a.figure), c2 = S.buildCity(a.source,a.cell.id,a.figure);
assert(JSON.stringify(c1.grid)===JSON.stringify(c2.grid), 'same input must build identical city grid');
assert(JSON.stringify(c1.gates.map(g=>[g.name,g.x,g.y,g.token,g.method]))===JSON.stringify(c2.gates.map(g=>[g.name,g.x,g.y,g.token,g.method])), 'same input must place identical Gates');
assert(c1.gates.length===8, 'native city must place eight Gates');
for(const g of c1.gates) assert(c1.grid[Math.floor(g.y)]?.[Math.floor(g.x)]===0, 'Gate placed outside traversable cell: '+g.name);

vm.runInContext(`
game=newGame(${JSON.stringify(a.source)},${JSON.stringify(a.cell.id)},${JSON.stringify(a.figure)});
game.proofs=${JSON.stringify(a.proofs)};
game.operatorCounts=${JSON.stringify(a.operatorCounts)};
game.signature=${JSON.stringify(String(a.pathSignature||'').split(''))};
game.steps=${Number(a.measures.steps)};
game.startedAt=performance.now()-${Math.max(Number(a.measures.elapsedMs)||0, 1000)};
globalThis.__nativeArtifact=makeArtifact();
`, ctx);
const portArtifact = JSON.parse(JSON.stringify(ctx.__nativeArtifact));
const portCheck = V.validate(portArtifact);
assert(portCheck.ok, 'native Return Artifact v2 must validate: '+portCheck.errors.join(' | '));
assert(portArtifact.worldKey===a.worldKey, 'native Return Artifact world key drift');
assert(portArtifact.returnedSource===a.returnedSource, 'native returnedSource derivation drift');
assert(portArtifact.cell.witness===a.cell.witness, 'native witness derivation drift');

console.log('SLEEPER NATIVE PORT SELFTEST PASS · WORLD',law.key,'·',c1.gates.length,'GATES · 4 VIEWS / AUTHORITY SPLIT · RETURN V2 VALID');
