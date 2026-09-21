import { clamp, seedFromSource, seededRandom, shuffleBySeed } from "../../lib/seed.ts";
import { makeLabTransfer, type TraceEvent } from "../pack.ts";

export const GENERIC_INSTRUMENT_IDS = ["switchyard", "proof", "window", "bounty", "commons", "grammar", "countertrace", "scroll", "scale"] as const;
export type GenericInstrumentId = (typeof GENERIC_INSTRUMENT_IDS)[number];

export function isGenericInstrumentId(value: unknown): value is GenericInstrumentId {
  return typeof value === "string" && (GENERIC_INSTRUMENT_IDS as readonly string[]).includes(value);
}

export function sourceUnits(source: string, count: number) {
  const normalized = source.trim().replace(/\s+/g, " ") || "one signal returns with evidence";
  const units = /\s/u.test(normalized) ? normalized.split(" ").filter(Boolean) : Array.from(normalized);
  const fallback = ["origin", "signal", "boundary", "measure", "trace", "return", "transfer", "proof"];
  return Array.from({ length: count }, (_, index) => units[index % units.length] ?? fallback[index % fallback.length]);
}

// 01 / SWITCHYARD -----------------------------------------------------------

export const SWITCHYARD_OFFICES = ["ARCHIVE", "COUNCIL", "WILDFIRE"] as const;
export type SwitchyardChallenge = {
  packets: Array<{ id: string; label: string; accepted: [number, number] }>;
  capacities: [number, number, number];
  recovery: [number, number, number];
};
export type SwitchyardState = { loads: [number, number, number]; integrated: number; residue: number; turn: number; routes: number[] };

export function makeSwitchyardChallenge(source: string): SwitchyardChallenge {
  const seed = seedFromSource(source);
  const random = seededRandom(seed ^ 0x21a97d41);
  const recovery = shuffleBySeed([2, 3, 4] as const, seed ^ 0x98b1) as [number, number, number];
  return {
    capacities: [3, 3, 3],
    recovery,
    packets: sourceUnits(source, 8).map((label, index) => {
      const first = Math.floor(random() * 3);
      const second = (first + 1 + Math.floor(random() * 2)) % 3;
      return { id: `p${index}`, label, accepted: [first, second] };
    }),
  };
}

export function replaySwitchyard(challenge: SwitchyardChallenge, trace: readonly TraceEvent[]): SwitchyardState {
  const state: SwitchyardState = { loads: [0, 0, 0], integrated: 0, residue: 0, turn: 0, routes: [] };
  for (const event of trace) {
    if (event.action !== "route" || typeof event.value !== "number" || state.turn >= challenge.packets.length) continue;
    const office = clamp(Math.floor(event.value), 0, 2);
    for (let index = 0; index < 3; index += 1) {
      if (state.turn > 0 && state.turn % challenge.recovery[index] === 0) state.loads[index] = Math.max(0, state.loads[index] - 1);
    }
    const packet = challenge.packets[state.turn];
    if (packet.accepted.includes(office) && state.loads[office] < challenge.capacities[office]) {
      state.integrated += 1;
      state.loads[office] += 1;
    } else state.residue += 1;
    state.routes.push(office);
    state.turn += 1;
  }
  return state;
}

export function switchyardReturn(source: string, challenge: SwitchyardChallenge, state: SwitchyardState) {
  const route = state.routes.map((office) => SWITCHYARD_OFFICES[office][0]).join("");
  return {
    summary: `${state.integrated}/${challenge.packets.length} integrated · ${state.residue} residue`,
    value: route,
    transfer: makeLabTransfer("switchyard", source, "route-ledger", route || "UNROUTED", "Every destination remains recoverable in order; residue is preserved rather than erased.", { routes: state.routes, loads: state.loads, integrated: state.integrated, residue: state.residue, recovery: challenge.recovery }),
  };
}

// 02 / PROOF LOOM -----------------------------------------------------------

export const PROOF_OPERATIONS = [
  { id: "plus3", label: "+ 3" },
  { id: "double", label: "× 2" },
  { id: "minus1", label: "− 1" },
  { id: "reverse", label: "REVERSE" },
] as const;
export type ProofOperation = (typeof PROOF_OPERATIONS)[number]["id"];
export type ProofChallenge = { start: number; target: number; witness: ProofOperation[] };

export function applyProofOperation(value: number, operation: ProofOperation) {
  if (operation === "plus3") return clamp(value + 3, 0, 999);
  if (operation === "double") return clamp(value * 2, 0, 999);
  if (operation === "minus1") return clamp(value - 1, 0, 999);
  return Number(String(Math.floor(Math.abs(value))).split("").reverse().join(""));
}

export function makeProofChallenge(source: string): ProofChallenge {
  const random = seededRandom(seedFromSource(source) ^ 0x4f2b71c3);
  const start = 3 + Math.floor(random() * 16);
  let witness: ProofOperation[] = [];
  let target = start;
  for (let attempt = 0; attempt < 16 && (target === start || target > 600); attempt += 1) {
    witness = Array.from({ length: 4 }, () => PROOF_OPERATIONS[Math.floor(random() * PROOF_OPERATIONS.length)].id);
    target = witness.reduce(applyProofOperation, start);
  }
  if (target === start) {
    witness = ["double", "plus3", "minus1", "reverse"];
    target = witness.reduce(applyProofOperation, start);
  }
  return { start, target, witness };
}

export function replayProof(challenge: ProofChallenge, trace: readonly TraceEvent[]) {
  const operations = trace.flatMap((event) => {
    const operation = PROOF_OPERATIONS.find((candidate) => candidate.id === event.action)?.id;
    return operation ? [operation] : [];
  }).slice(0, 4);
  return { operations, value: operations.reduce(applyProofOperation, challenge.start) };
}

export function proofReturn(source: string, challenge: ProofChallenge, state: ReturnType<typeof replayProof>) {
  const chain = `${challenge.start} ${state.operations.map((operation) => PROOF_OPERATIONS.find((item) => item.id === operation)?.label).join(" → ")} = ${state.value}`;
  return {
    summary: state.value === challenge.target ? `proved ${challenge.target} in ${state.operations.length} operations` : `${Math.abs(challenge.target - state.value)} from target`,
    value: chain,
    transfer: makeLabTransfer("proof", source, "operator-chain", chain, "The result travels with its ordered, executable witness.", { start: challenge.start, target: challenge.target, operations: state.operations, value: state.value }),
  };
}

// 03 / FOLDING WINDOW -------------------------------------------------------

function bitCount(value: number) {
  let count = 0;
  for (let cursor = value; cursor; cursor >>>= 1) count += cursor & 1;
  return count;
}

export function rotateMask(mask: number, turns = 1) {
  let rotated = mask & 0x1ff;
  for (let turn = 0; turn < ((turns % 4) + 4) % 4; turn += 1) {
    let next = 0;
    for (let row = 0; row < 3; row += 1) for (let column = 0; column < 3; column += 1) {
      const bit = row * 3 + column;
      if (rotated & (1 << bit)) next |= 1 << (column * 3 + (2 - row));
    }
    rotated = next;
  }
  return rotated;
}

export type WindowChallenge = { layers: number[]; target: number; witness: number[] };
export function windowComposite(layers: readonly number[], rotations: readonly number[]) {
  return layers.reduce((composite, layer, index) => composite ^ rotateMask(layer, rotations[index] ?? 0), 0);
}

export function makeWindowChallenge(source: string): WindowChallenge {
  const random = seededRandom(seedFromSource(source) ^ 0x74a3d2e1);
  const layers = Array.from({ length: 4 }, () => {
    let mask = 0;
    while (bitCount(mask) < 3) mask |= 1 << Math.floor(random() * 9);
    return mask;
  });
  let witness = Array.from({ length: 4 }, () => Math.floor(random() * 4));
  let target = windowComposite(layers, witness);
  const initial = windowComposite(layers, [0, 0, 0, 0]);
  for (let index = 0; target === initial && index < 4; index += 1) {
    witness = witness.map((turns, layer) => layer === index ? (turns + 1) % 4 : turns);
    target = windowComposite(layers, witness);
  }
  return { layers, target, witness };
}

export function replayWindow(challenge: WindowChallenge, trace: readonly TraceEvent[]) {
  const rotations = [0, 0, 0, 0];
  for (const event of trace) {
    if (event.action !== "rotate" || typeof event.target !== "string") continue;
    const index = Number(event.target.replace("layer-", ""));
    if (Number.isInteger(index) && index >= 0 && index < 4) rotations[index] = (rotations[index] + 1) % 4;
  }
  return { rotations, composite: windowComposite(challenge.layers, rotations), moves: trace.filter((event) => event.action === "rotate").length };
}

export function windowReturn(source: string, challenge: WindowChallenge, state: ReturnType<typeof replayWindow>) {
  const mask = state.composite.toString(2).padStart(9, "0");
  return {
    summary: `${state.moves} rotations · exact composite ${state.composite === challenge.target ? "held" : "open"}`,
    value: mask,
    transfer: makeLabTransfer("window", source, "composite-mask", mask, "The returned image records the exact exclusive overlap of all four layers.", { rotations: state.rotations, layers: challenge.layers, target: challenge.target, composite: state.composite }),
  };
}

// 05 / BOUNTY PROOF ---------------------------------------------------------

export type BountyChallenge = { values: number[]; labels: string[]; target: number; witness: number[] };
export function makeBountyChallenge(source: string): BountyChallenge {
  const seed = seedFromSource(source);
  const values = shuffleBySeed(Array.from({ length: 16 }, (_, index) => index + 2), seed ^ 0x155c7).slice(0, 8);
  const witness = shuffleBySeed(Array.from({ length: 8 }, (_, index) => index), seed ^ 0x6f109).slice(0, 3 + (seed % 2));
  return { values, labels: sourceUnits(source, 8), target: witness.reduce((sum, index) => sum + values[index], 0), witness };
}

export function replayBounty(challenge: BountyChallenge, trace: readonly TraceEvent[]) {
  const selected: number[] = [];
  for (const event of trace) {
    if (event.action !== "toggle" || typeof event.target !== "string") continue;
    const index = Number(event.target.replace("item-", ""));
    if (!Number.isInteger(index) || index < 0 || index >= challenge.values.length) continue;
    const found = selected.indexOf(index);
    if (found >= 0) selected.splice(found, 1);
    else if (selected.length < 4) selected.push(index);
  }
  return { selected, sum: selected.reduce((sum, index) => sum + challenge.values[index], 0) };
}

export function bountyReturn(source: string, challenge: BountyChallenge, state: ReturnType<typeof replayBounty>) {
  const certificate = state.selected.map((index) => `${challenge.labels[index]}:${challenge.values[index]}`).join(" + ");
  return {
    summary: `${state.sum}/${challenge.target} · ${state.selected.length}/4 fragments`,
    value: certificate,
    transfer: makeLabTransfer("bounty", source, "selection-proof", certificate || "NO CERTIFICATE", "The answer retains the source fragments and weights that certify the total.", { selected: state.selected, values: challenge.values, target: challenge.target, sum: state.sum }),
  };
}

// 06 / COMMONS --------------------------------------------------------------

export const COMMONS_WITNESSES = [
  { name: "ARCHIVE", reliability: 0.82 },
  { name: "COUNCIL", reliability: 0.7 },
  { name: "EDGE", reliability: 0.62 },
] as const;
export type CommonsChallenge = { claims: Array<{ id: string; label: string; truth: boolean; votes: [boolean, boolean, boolean] }> };

export function makeCommonsChallenge(source: string): CommonsChallenge {
  const random = seededRandom(seedFromSource(source) ^ 0x3a3d199b);
  const claims = sourceUnits(source, 7).map((label, index) => {
    const truth = random() > 0.48;
    const votes = COMMONS_WITNESSES.map((witness) => random() < witness.reliability ? truth : !truth) as [boolean, boolean, boolean];
    return { id: `claim-${index}`, label, truth, votes };
  });
  if (claims.every((claim) => claim.truth === claims[0].truth)) claims[claims.length - 1].truth = !claims[0].truth;
  return { claims };
}

export function replayCommons(challenge: CommonsChallenge, trace: readonly TraceEvent[]) {
  const probes: string[] = [];
  const decisions: Record<string, boolean> = {};
  for (const event of trace) {
    if (!event.target || !challenge.claims.some((claim) => claim.id === event.target)) continue;
    if (event.action === "probe" && probes.length < 2 && !probes.includes(event.target)) probes.push(event.target);
    if (event.action === "decide" && typeof event.value === "boolean") decisions[event.target] = event.value;
  }
  const score = challenge.claims.reduce((total, claim) => total + (decisions[claim.id] === claim.truth ? 1 : 0), 0);
  return { probes, decisions, score };
}

export function commonsReturn(source: string, challenge: CommonsChallenge, state: ReturnType<typeof replayCommons>) {
  const ledger = challenge.claims.map((claim) => `${state.decisions[claim.id] ? "+" : "?"}${claim.label}`).join(" · ");
  return {
    summary: `${state.score}/${challenge.claims.length} calibrated · ${state.probes.length}/2 exact probes used`,
    value: ledger,
    transfer: makeLabTransfer("commons", source, "calibration-ledger", ledger, "This synthetic rehearsal preserves decisions, exact checks, and hidden-answer scoring separately.", { probes: state.probes, decisions: state.decisions, truth: challenge.claims.map((claim) => claim.truth), score: state.score }),
  };
}

// 08 / TRANSFER GRAMMAR -----------------------------------------------------

export const GRAMMAR_GLYPHS = ["○", "△", "□", "◇"] as const;
export const GRAMMAR_DIRECTIONS = [
  { glyph: "↑", x: 0, y: -1 }, { glyph: "→", x: 1, y: 0 }, { glyph: "↓", x: 0, y: 1 }, { glyph: "←", x: -1, y: 0 },
] as const;
export type GrammarChallenge = { mapping: number[]; demos: Array<{ glyphs: number[]; vector: [number, number] }>; target: number[] };

function grammarVector(mapping: readonly number[], glyphs: readonly number[]): [number, number] {
  return glyphs.reduce<[number, number]>((vector, glyph) => {
    const direction = GRAMMAR_DIRECTIONS[mapping[glyph]];
    return [vector[0] + direction.x, vector[1] + direction.y];
  }, [0, 0]);
}

export function makeGrammarChallenge(source: string): GrammarChallenge {
  const seed = seedFromSource(source);
  const mapping = shuffleBySeed([0, 1, 2, 3], seed ^ 0x82b65);
  const demoGlyphs = [[0, 1], [1, 2], [2, 3], [0, 2, 3]];
  const random = seededRandom(seed ^ 0x19abcc);
  const target = Array.from({ length: 5 }, () => Math.floor(random() * 4));
  return { mapping, demos: demoGlyphs.map((glyphs) => ({ glyphs, vector: grammarVector(mapping, glyphs) })), target };
}

export function grammarScore(challenge: GrammarChallenge, choices: readonly number[]) {
  return challenge.target.reduce((score, glyph, index) => score + (choices[index] === challenge.mapping[glyph] ? 1 : 0), 0);
}

export function replayGrammar(challenge: GrammarChallenge, trace: readonly TraceEvent[]) {
  const choices = Array(challenge.target.length).fill(-1) as number[];
  let checks = 0;
  let lastScore = 0;
  for (const event of trace) {
    if (event.action === "choose" && event.target?.startsWith("slot-") && typeof event.value === "number") {
      const index = Number(event.target.replace("slot-", ""));
      if (Number.isInteger(index) && index >= 0 && index < choices.length) choices[index] = clamp(Math.floor(event.value), 0, 3);
    }
    if (event.action === "check") {
      checks += 1;
      lastScore = typeof event.value === "number" ? event.value : grammarScore(challenge, choices);
    }
  }
  return { choices, checks, lastScore };
}

export function grammarReturn(source: string, challenge: GrammarChallenge, state: ReturnType<typeof replayGrammar>) {
  const decoded = state.choices.map((choice) => choice >= 0 ? GRAMMAR_DIRECTIONS[choice].glyph : "·").join("");
  return {
    summary: `${grammarScore(challenge, state.choices)}/${challenge.target.length} transferred · ${state.checks} checks`,
    value: decoded,
    transfer: makeLabTransfer("grammar", source, "decoded-grammar", decoded, "The returned line preserves the inferred movement assigned to every target glyph.", { target: challenge.target, choices: state.choices, checks: state.checks, score: grammarScore(challenge, state.choices) }),
  };
}

// 09 / COUNTERTRACE ---------------------------------------------------------

export type CountertraceChallenge = { base: number[]; effects: number[][]; target: number[]; witness: number[] };
export function counterProjection(challenge: CountertraceChallenge, selected: readonly number[]) {
  const bits = [...challenge.base];
  [...selected].sort((left, right) => left - right).forEach((eventIndex) => challenge.effects[eventIndex]?.forEach((bitIndex) => { bits[bitIndex] = bits[bitIndex] ? 0 : 1; }));
  return bits;
}

export function makeCountertraceChallenge(source: string): CountertraceChallenge {
  const seed = seedFromSource(source);
  const random = seededRandom(seed ^ 0xc12aa51);
  const base = Array.from({ length: 6 }, () => random() > 0.5 ? 1 : 0);
  const effects = Array.from({ length: 6 }, (_, index) => {
    const future = index < 5 ? index + 1 + Math.floor(random() * (5 - index)) : index;
    return future === index ? [index] : [index, future];
  });
  let witness = shuffleBySeed([0, 1, 2, 3, 4, 5], seed ^ 0x4182).slice(0, 2 + (seed % 2));
  let target = counterProjection({ base, effects, witness, target: [] }, witness);
  if (target.every((bit, index) => bit === base[index])) {
    witness = [5];
    target = counterProjection({ base, effects, witness, target: [] }, witness);
  }
  return { base, effects, witness, target };
}

export function replayCountertrace(challenge: CountertraceChallenge, trace: readonly TraceEvent[]) {
  const selected: number[] = [];
  for (const event of trace) {
    if (event.action !== "intervene" || !event.target?.startsWith("event-")) continue;
    const index = Number(event.target.replace("event-", ""));
    if (!Number.isInteger(index) || index < 0 || index >= challenge.effects.length) continue;
    const found = selected.indexOf(index);
    if (found >= 0) selected.splice(found, 1);
    else if (selected.length < 4) selected.push(index);
  }
  return { selected, projection: counterProjection(challenge, selected) };
}

export function countertraceReturn(source: string, challenge: CountertraceChallenge, state: ReturnType<typeof replayCountertrace>) {
  const line = state.projection.join("");
  return {
    summary: `${state.selected.length}/4 interventions · final state ${line}`,
    value: line,
    transfer: makeLabTransfer("countertrace", source, "causal-trace", line, "The final state travels with the earlier interventions and every downstream bit they recomputed.", { base: challenge.base, effects: challenge.effects, target: challenge.target, selected: state.selected, projection: state.projection }),
  };
}

// 10 / SCROLL PATH ----------------------------------------------------------

export type ScrollCell = { cost: number; mark: boolean };
export type ScrollChallenge = { columns: ScrollCell[][]; startRow: number; breath: number; witness: number[] };

export function makeScrollChallenge(source: string): ScrollChallenge {
  const random = seededRandom(seedFromSource(source) ^ 0x725cd11);
  const columns = Array.from({ length: 8 }, () => Array.from({ length: 3 }, () => ({ cost: 2 + Math.floor(random() * 5), mark: random() > 0.84 })));
  const witness: number[] = [];
  let row = 1;
  for (let column = 0; column < columns.length; column += 1) {
    row = clamp(row + Math.floor(random() * 3) - 1, 0, 2);
    witness.push(row);
    columns[column][row] = { cost: 1 + Math.floor(random() * 2), mark: [1, 3, 5].includes(column) };
  }
  return { columns, startRow: 1, breath: 22, witness };
}

export function replayScroll(challenge: ScrollChallenge, trace: readonly TraceEvent[]) {
  const path: number[] = [];
  let row = challenge.startRow;
  let breath = challenge.breath;
  let marks = 0;
  for (const event of trace) {
    if (event.action !== "move" || typeof event.value !== "number" || path.length >= challenge.columns.length) continue;
    const nextRow = clamp(Math.floor(event.value), 0, 2);
    if (Math.abs(nextRow - row) > 1) continue;
    const cell = challenge.columns[path.length][nextRow];
    row = nextRow;
    path.push(row);
    breath -= cell.cost;
    if (cell.mark) marks += 1;
  }
  return { path, row, breath, marks, complete: path.length === challenge.columns.length, successful: path.length === challenge.columns.length && breath >= 0 && marks >= 2 };
}

export function scrollReturn(source: string, challenge: ScrollChallenge, state: ReturnType<typeof replayScroll>) {
  const line = state.path.map((row) => ["⌒", "─", "⌣"][row]).join("");
  return {
    summary: `${state.marks} marks · ${state.breath} breath remains · ${state.path.length}/${challenge.columns.length} passages`,
    value: line,
    transfer: makeLabTransfer("scroll", source, "path-line", line, "The continuous path preserves elevation, cost, and gathered marks in traversal order.", { path: state.path, breath: state.breath, marks: state.marks, costs: state.path.map((row, index) => challenge.columns[index][row].cost) }),
  };
}

// 11 / SCALE WALK -----------------------------------------------------------

export type ImageCellMetric = { brightness: number; edges: number };
export type ScaleRule = "brightest" | "darkest" | "most-detail" | "quietest";
export type ScaleChallenge = { rounds: Array<{ rule: ScaleRule; candidates: number[]; correct: number }>; metrics: ImageCellMetric[] };
export const DEFAULT_IMAGE_METRICS: ImageCellMetric[] = [
  { brightness: 0.74, edges: 0.18 }, { brightness: 0.62, edges: 0.42 }, { brightness: 0.48, edges: 0.36 },
  { brightness: 0.68, edges: 0.26 }, { brightness: 0.39, edges: 0.7 }, { brightness: 0.56, edges: 0.52 },
  { brightness: 0.82, edges: 0.12 }, { brightness: 0.45, edges: 0.6 }, { brightness: 0.31, edges: 0.32 },
];

function bestCell(rule: ScaleRule, candidates: readonly number[], metrics: readonly ImageCellMetric[]) {
  return [...candidates].sort((left, right) => {
    const leftValue = rule === "brightest" || rule === "darkest" ? metrics[left].brightness : metrics[left].edges;
    const rightValue = rule === "brightest" || rule === "darkest" ? metrics[right].brightness : metrics[right].edges;
    const direction = rule === "brightest" || rule === "most-detail" ? -1 : 1;
    return direction * (leftValue - rightValue) || left - right;
  })[0];
}

export function makeScaleChallenge(source: string, metrics: readonly ImageCellMetric[]): ScaleChallenge {
  const seed = seedFromSource(source);
  const rules: ScaleRule[] = ["brightest", "most-detail", "quietest", "darkest", "most-detail"];
  const rounds = rules.map((rule, index) => {
    const candidates = shuffleBySeed(Array.from({ length: Math.min(9, metrics.length) }, (_, cell) => cell), seed ^ Math.imul(index + 1, 0x9e3779b1)).slice(0, 3);
    return { rule, candidates, correct: bestCell(rule, candidates, metrics) };
  });
  return { rounds, metrics: metrics.map((metric) => ({ ...metric })) };
}

export function replayScale(challenge: ScaleChallenge, trace: readonly TraceEvent[]) {
  const choices = trace.flatMap((event) => event.action === "enter" && typeof event.value === "number" ? [Math.floor(event.value)] : []).slice(0, challenge.rounds.length);
  const score = choices.reduce((total, choice, index) => {
    const round = challenge.rounds[index];
    if (!round.candidates.includes(choice)) return total;
    const metric = round.rule === "brightest" || round.rule === "darkest" ? "brightness" : "edges";
    return total + (Math.abs(challenge.metrics[choice][metric] - challenge.metrics[round.correct][metric]) < 1e-9 ? 1 : 0);
  }, 0);
  return { choices, score };
}

export function scaleReturn(source: string, challenge: ScaleChallenge, state: ReturnType<typeof replayScale>) {
  const route = state.choices.map((cell) => `${(cell % 3) + 1}:${Math.floor(cell / 3) + 1}`).join(" → ");
  return {
    summary: `${state.score}/${challenge.rounds.length} compositional readings held`,
    value: route,
    transfer: makeLabTransfer("scale", source, "image-route", route || "NO IMAGE ROUTE", "The route preserves pixel-derived choices; the image is never assigned a hidden narrative.", { choices: state.choices, rules: challenge.rounds.map((round) => round.rule), score: state.score, metrics: challenge.metrics }),
  };
}
