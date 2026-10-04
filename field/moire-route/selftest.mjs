import fs from "node:fs";
import {
  buildHeldField,contextRoutes,lineageFor,projectionProfile,
  representationMismatch,residualMismatch,normalizeProjection
} from "./core.mjs";
import {
  availableRepresentations,projectionPairMismatch,pairResidual,chooseCounterProjection
} from "./pair.mjs";
import {paintingGeometry,representationTrial} from "./painting-plain.mjs";

const manifest=JSON.parse(fs.readFileSync(new URL("../../showcase-manifest.json",import.meta.url),"utf8"));
const current=JSON.parse(fs.readFileSync(new URL("../../control/CURRENT.json",import.meta.url),"utf8"));
const registry=JSON.parse(fs.readFileSync(new URL("./EXPERIMENTS.json",import.meta.url),"utf8"));
const routes=manifest.routes||[];
const map=new Map(routes.map(r=>[r.href,r]));

function assert(ok,msg){if(!ok)throw new Error(msg)}
function depth(href){
  let d=0,r=map.get(href),seen=new Set();
  while(r&&r.href!=="/"&&!seen.has(r.href)){seen.add(r.href);d++;r=map.get(r.parent||"/")}
  return d;
}

const candidate=[...routes]
  .filter(r=>r.href!=="/"&&depth(r.href)>=2)
  .sort((a,b)=>depth(b.href)-depth(a.href)||String(a.href).localeCompare(String(b.href)))[0];
assert(candidate,"repo must contain one non-root route with depth >= 2");

const held=buildHeldField(manifest,current,candidate.href,"AXIAL_LATEST");
assert(held.ok,"real manifest route should build");
assert(held.route===map.get(candidate.href),"held object must be exact manifest object");
assert(held.lineage.length>=3,"held route should retain real parent lineage");
assert(held.context.every(r=>map.has(r.href)),"context may contain only manifest routes");
assert(!held.context.some(r=>/^\d+,\d+$/.test(r.href)),"synthetic grid ids must not survive");

const glyph=representationMismatch(manifest,current,candidate.href,"GLYPH");
const visual=representationMismatch(manifest,current,candidate.href,"VISUAL");
const axial=representationMismatch(manifest,current,candidate.href,"AXIAL_LATEST");
assert(glyph&&visual&&axial,"projection reports must build");
assert(glyph.irreducible>0,"GLYPH must expose real channel-loss residue for a nontrivial route");
assert(visual.transformable===0,"VISUAL tree projection must share the canonical tree coordinate frame");
assert(residualMismatch(axial,1)<=residualMismatch(axial,0)+1e-12,"alignment may not increase transformable residue");
assert(residualMismatch(axial,1)>=0.68*axial.irreducible-1e-12,"alignment may not erase hidden-channel residue");
assert(normalizeProjection("bogus")==="AXIAL_LATEST","unknown projections must fail to the root FIELD projection");
assert(projectionProfile("GLYPH").preserve.includes("href"),"glyph identity/address preservation contract must be represented");

const available=availableRepresentations(manifest,candidate.href);
assert(available.includes("AXIAL_LATEST")&&available.includes("VISUAL"),"held route must expose the root FIELD pair");
const pair=projectionPairMismatch(manifest,current,candidate.href,"AXIAL_LATEST","VISUAL");
assert(pair&&pair.href===candidate.href,"pairwise mismatch must remain attached to the exact held route");
assert(pair.left==="AXIAL_LATEST"&&pair.right==="VISUAL","pair identity must remain explicit");
assert(pair.total>=0&&pair.total<=1&&pair.channel>=0&&pair.coordinate>=0,"pair mismatch must remain bounded");
assert(pair.coordinates.nodes.every(r=>map.has(r.href)),"pair context may contain only real manifest routes");
assert(pairResidual(pair,1)<=pairResidual(pair,0)+1e-12,"pair alignment may not increase visible interference");
assert(pairResidual(pair,1)>=0.68*pair.channel-1e-12,"pair alignment may not erase channel disagreement");
const choice=chooseCounterProjection(manifest,current,candidate.href,"AXIAL_LATEST",{threshold:0});
assert(choice.material&&choice.alternative&&choice.alternative!=="AXIAL_LATEST","zero-threshold choice must expose one real counterprojection");
assert(choice.pair?.href===candidate.href,"counterprojection choice must retain held object identity");
assert(choice.candidates.every(x=>x.id!==choice.current),"current projection may not compare with itself");

const trial=representationTrial(manifest,current,candidate.href);
assert(trial.ok,"PLAIN ↔ PAINTING must preserve the held semantic envelope exactly");
assert(Object.values(trial.invariants).every(Boolean),"identity/actions/witness/RETURN must remain equal across representations");
assert(trial.plain.semantic.authority==="VIEW_ONLY"&&trial.painting.semantic.authority==="VIEW_ONLY","representation trial may not gain effect authority");
const shifted=JSON.parse(JSON.stringify(trial.painting.semantic));
shifted.object.state=shifted.object.state+"__SELFTEST_SHIFT";
assert(paintingGeometry(shifted).state_phase!==trial.painting.geometry.state_phase,"painting geometry must respond to held state rather than remaining decorative");
assert(registry.authority==="R&D_PROJECTION_ONLY","experiment registry may not become queue/priority authority");
assert(registry.experiments.some(x=>x.id==="E01_PAINTING_LAW_VS_PLAIN"&&x.status==="ACTIVE_BOUNDED_TEST"),"active painting-vs-PLAIN experiment must remain declared");
assert(registry.circulation?.authority==="MNEMONIC_ONLY","five-phase circulation must remain a mnemonic, not ontology/authority");

const noHeld=buildHeldField(manifest,current,null,"AXIAL_LATEST");
assert(!noHeld.ok&&noHeld.reason==="NO_HELD_FIELD_OBJECT","runtime must fail closed without a held object");

console.log(JSON.stringify({
  PASS:true,
  held:candidate.href,
  lineage:lineageFor(manifest,candidate.href).map(r=>r.href),
  context_count:contextRoutes(manifest,candidate.href).length,
  mismatch:{
    axial:{total:axial.total,irreducible:axial.irreducible,transformable:axial.transformable,residual_aligned:residualMismatch(axial,1)},
    visual:{total:visual.total,irreducible:visual.irreducible,transformable:visual.transformable},
    glyph:{total:glyph.total,irreducible:glyph.irreducible,transformable:glyph.transformable}
  },
  live_pair:{
    current:choice.current,counter:choice.alternative,
    total:choice.pair.total,channel:choice.pair.channel,coordinate:choice.pair.coordinate,
    available
  },
  painting_plain:{machine_pass:trial.ok,invariants:trial.invariants,authority:trial.authority,human_return:"PENDING_LOCAL_USE"},
  invariant:"runtime source is manifest/CURRENT held object; synthetic route fixture removed; live interference reports real projection disagreement; coordinate alignment cannot erase channel disagreement; painting may change atmosphere/geometry but never semantic identity or authority"
},null,2));
