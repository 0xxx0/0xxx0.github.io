import fs from "node:fs";
import {
  buildHeldField,contextRoutes,lineageFor,projectionProfile,
  representationMismatch,residualMismatch,normalizeProjection
} from "./core.mjs";

const manifest=JSON.parse(fs.readFileSync(new URL("../../showcase-manifest.json",import.meta.url),"utf8"));
const current=JSON.parse(fs.readFileSync(new URL("../../control/CURRENT.json",import.meta.url),"utf8"));
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
  invariant:"runtime source is manifest/CURRENT held object; synthetic route fixture removed"
},null,2));
