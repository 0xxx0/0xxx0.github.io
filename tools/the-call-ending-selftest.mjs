import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const context = { window: {} };
/* REPAIR 2026-10-07: the 2026-10-06 set was retired to archive/temp/2026-11-05 (f16417cf).
   Resolve live -> archived so this gate validates the same files in either state. */
const route = ["../20261006-the-call-mcvoid/", "../archive/temp/2026-11-05/20261006-the-call-mcvoid/"]
  .map((p) => new URL(p, import.meta.url))
  .find((u) => fs.existsSync(u));
for (const file of ["deck-crew.js", "ending.js"]) {
  vm.runInNewContext(fs.readFileSync(new URL(file, route), "utf8"), context, { filename: file });
}

const ending = context.window.CALL_ENDING;
const { MODES } = ending;
const cards = context.window.CREW_DECK;
context.window.GAME_FACE = "crew";
const examples = [
  ["striker", "Potential, not applied"],
  ["namer", "oil-town"],
];
for (const [mode, example] of examples) {
  const stated = MODES[mode].costs.toLowerCase().includes(example.toLowerCase());
  const supported = cards
    .filter((card) => card.mode === mode)
    .some((card) => JSON.stringify(card).toLowerCase().includes(example.toLowerCase()));
  assert.equal(stated, supported, `${mode} ending example must match evidence from a same-mode CREW card`);

  const results = cards.map((card) => card.mode === mode ? false : true);
  const rendered = ending.buildEnding(results, cards);
  assert.ok(rendered.includes(`<h2 class="emode">${MODES[mode].name}</h2>`));
  assert.ok(rendered.includes(MODES[mode].costs));
  assert.ok(!rendered.toLowerCase().includes(example.toLowerCase()), `${mode} ending must not render its unsupported example`);
}

console.log("THE CALL ending evidence + rendered copy PASS");
