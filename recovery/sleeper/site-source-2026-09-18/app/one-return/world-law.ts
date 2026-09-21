import { hashString, seedFromSource } from "../lib/seed.ts";

export type ToolName = "conch" | "keris" | "w8" | "spiral";
export type FigureId = "urchin" | "slothcake" | "kite";
export type VerseCellId = "doors" | "one-return" | "four-verbs" | "eighth-position" | "wind" | "question";
export type GateName =
  | "PROVENANCE"
  | "TRUTH"
  | "COMPRESSION"
  | "RETRIEVAL"
  | "OPERATION"
  | "MEASURE"
  | "TRANSFER"
  | "RESILIENCE";
export type GateMethod = ToolName | "stillness" | "distance" | "relocation";

export type VerseCell = {
  id: VerseCellId;
  label: string;
  text: string;
  provenance: string;
  law: string;
  loopBias: number;
  gateOrder: readonly GateName[];
};

export type FigureLaw = {
  id: FigureId;
  label: string;
  mark: string;
  line: string;
  effect: string;
  movementSpeed: number;
  conchMs: number;
  kerisCooldownMs: number;
  truthHoldMs: number;
  measureHoldMs: number;
  measureMin: number;
  measureMax: number;
};

export type GateDefinition = {
  name: GateName;
  glyph: string;
  color: string;
  method: GateMethod;
  line: string;
  instruction: string;
};

export type WorldLaw = {
  source: string;
  seed: number;
  key: string;
  loops: number;
  wallAlphabet: readonly string[];
  cell: VerseCell;
  figure: FigureLaw;
  cellTokens: readonly string[];
  gateOrder: readonly GateName[];
  transferTool: ToolName;
  facts: readonly string[];
};

export type GateProof = {
  gate: GateName;
  token: string;
  method: GateMethod;
  step: number;
  elapsedMs: number;
  note: string;
};

export type OperatorCounts = Record<ToolName, number>;
export type UtilityMode = "calm" | "home" | "oracle" | "together";

export type ReturnArtifact = {
  schema: "sleeper.one-return";
  version: 2;
  worldKey: string;
  source: string;
  returnedSource: string;
  cell: {
    id: VerseCellId;
    source: string;
    provenance: string;
    witness: string;
  };
  figure: FigureId;
  dominantOperator: ToolName;
  transferInstruction: string;
  pathSignature: string;
  operatorCounts: OperatorCounts;
  proofs: readonly GateProof[];
  measures: { steps: number; elapsedMs: number };
};

export type WorldInput = {
  source: string;
  cellId: VerseCellId;
  figureId: FigureId;
  worldKey: string;
};

export type WorldInputResult =
  | { ok: true; input: WorldInput }
  | { ok: false; error: string };

const CANONICAL_ORDER: readonly GateName[] = [
  "PROVENANCE",
  "TRUTH",
  "COMPRESSION",
  "RETRIEVAL",
  "OPERATION",
  "MEASURE",
  "TRANSFER",
  "RESILIENCE",
];

export const VERSE_CELLS: readonly VerseCell[] = [
  {
    id: "doors",
    label: "DOORS",
    text: "ALL MAPS ARE WRONG. SOME BECOME DOORS.",
    provenance: "Sleeper field line / current working canon",
    law: "A wrong model may still become a useful passage.",
    loopBias: 5,
    gateOrder: CANONICAL_ORDER,
  },
  {
    id: "one-return",
    label: "ONE RETURN",
    text: "GOOD FOR ONE RETURN.",
    provenance: "Sleeper return line / current working canon",
    law: "A useful artifact must survive one changed context.",
    loopBias: -3,
    gateOrder: ["PROVENANCE", "RETRIEVAL", "TRUTH", "OPERATION", "COMPRESSION", "TRANSFER", "MEASURE", "RESILIENCE"],
  },
  {
    id: "four-verbs",
    label: "FOUR VERBS",
    text: "LISTEN. CUT. CARRY. RETURN.",
    provenance: "Recovered Sleeper operator sequence",
    law: "Perception becomes action only when something can be carried back.",
    loopBias: 1,
    gateOrder: ["TRUTH", "PROVENANCE", "OPERATION", "RETRIEVAL", "TRANSFER", "MEASURE", "COMPRESSION", "RESILIENCE"],
  },
  {
    id: "eighth-position",
    label: "EIGHTH POSITION",
    text: "未始来时末已示空",
    provenance: "Jointly evolved working line; philological status remains open",
    law: "Read eight positions as a structure, not as borrowed authority.",
    loopBias: 8,
    gateOrder: ["PROVENANCE", "COMPRESSION", "TRUTH", "MEASURE", "OPERATION", "RETRIEVAL", "RESILIENCE", "TRANSFER"],
  },
  {
    id: "wind",
    label: "WIND",
    text: "SOME REPLIES TAKE WIND.",
    provenance: "Sleeper kite line / current working canon",
    law: "Hold enough tension to carry; release enough to remain responsive.",
    loopBias: 3,
    gateOrder: ["MEASURE", "TRUTH", "PROVENANCE", "OPERATION", "RETRIEVAL", "COMPRESSION", "RESILIENCE", "TRANSFER"],
  },
  {
    id: "question",
    label: "QUESTION",
    text: "ASK BETTER.",
    provenance: "Sleeper oracle line / current working canon",
    law: "The returned question should improve the next operation.",
    loopBias: -5,
    gateOrder: ["TRUTH", "MEASURE", "PROVENANCE", "OPERATION", "RESILIENCE", "COMPRESSION", "RETRIEVAL", "TRANSFER"],
  },
];

export const FIGURES: readonly FigureLaw[] = [
  {
    id: "urchin",
    label: "URCHIN",
    mark: "✣",
    line: "EDGE / QUICK CUT",
    effect: "Moves quickly; Keris reforms sooner.",
    movementSpeed: 2.75,
    conchMs: 4200,
    kerisCooldownMs: 1600,
    truthHoldMs: 1500,
    measureHoldMs: 2100,
    measureMin: 1.75,
    measureMax: 2.65,
  },
  {
    id: "slothcake",
    label: "SLOTHCAKE",
    mark: "◒",
    line: "PATIENCE / LONG ECHO",
    effect: "Conch lasts longer; stillness resolves sooner.",
    movementSpeed: 2.25,
    conchMs: 5600,
    kerisCooldownMs: 2500,
    truthHoldMs: 1050,
    measureHoldMs: 2300,
    measureMin: 1.6,
    measureMax: 2.55,
  },
  {
    id: "kite",
    label: "KITE",
    mark: "◇",
    line: "TENSION / WIDE MEASURE",
    effect: "Travels lightly; the distance band is wider.",
    movementSpeed: 2.55,
    conchMs: 4000,
    kerisCooldownMs: 2200,
    truthHoldMs: 1700,
    measureHoldMs: 1800,
    measureMin: 1.35,
    measureMax: 3.05,
  },
];

export const GATE_DEFINITIONS: readonly GateDefinition[] = [
  { name: "PROVENANCE", glyph: "◉", color: "#e9c16f", method: "conch", line: "THE SIGNAL NAMED WHERE IT CAME FROM.", instruction: "Stand near the Gate and sound CONCH." },
  { name: "TRUTH", glyph: "◌", color: "#d9e0d7", method: "stillness", line: "YOU LET THE FIELD MOVE WITHOUT INVENTING A MOVE.", instruction: "Stand close. Release every control and wait." },
  { name: "COMPRESSION", glyph: "◆", color: "#e18e64", method: "spiral", line: "THE SAME CITY SURVIVED ANOTHER READING.", instruction: "Stand near the Gate and switch projection with SPIRAL." },
  { name: "RETRIEVAL", glyph: "⌁", color: "#7cb7bf", method: "w8", line: "THE COORDINATE WAS RECOVERED AFTER LEAVING IT.", instruction: "Place W8 here, travel away, then invoke W8 again." },
  { name: "OPERATION", glyph: "†", color: "#e9c16f", method: "keris", line: "THE MAP BECAME A VERB.", instruction: "Make a real wall-cut with KERIS while close to the Gate." },
  { name: "MEASURE", glyph: "△", color: "#8ebfc8", method: "distance", line: "DISTANCE BECAME EVIDENCE, NOT DECORATION.", instruction: "Hold the figure inside the indicated distance band." },
  { name: "TRANSFER", glyph: "⇄", color: "#df8d57", method: "conch", line: "ONE OPERATOR WORKED IN A SECOND CONTEXT.", instruction: "Reuse the world-assigned operator near this Gate." },
  { name: "RESILIENCE", glyph: "∞", color: "#c9d7d2", method: "relocation", line: "THE TOKEN SURVIVED A FAILED COORDINATE.", instruction: "Find it once. When it moves, retrieve the same token again." },
];

export const PRIMARY_GATE_BY_TOOL: Readonly<Record<ToolName, GateName>> = {
  conch: "PROVENANCE",
  keris: "OPERATION",
  w8: "RETRIEVAL",
  spiral: "COMPRESSION",
};

function wordsForCell(cell: VerseCell) {
  if (cell.id === "eighth-position") return Array.from(cell.text).slice(0, 8);
  const text = cell.text;
  const glyphs = Array.from(text.match(/[\p{L}\p{N}]+|[^\s]/gu) ?? []);
  if (!glyphs.length) return ["RETURN"];
  return Array.from({ length: 8 }, (_, index) => glyphs[index % glyphs.length]);
}

export function compileWorldLaw(source: string, cellId: VerseCellId, figureId: FigureId): WorldLaw {
  const normalized = source.trim().replace(/\s+/g, " ") || VERSE_CELLS[0].text;
  const cell = VERSE_CELLS.find((candidate) => candidate.id === cellId) ?? VERSE_CELLS[0];
  const figure = FIGURES.find((candidate) => candidate.id === figureId) ?? FIGURES[0];
  const seed = seedFromSource(`${normalized}\u241f${cell.id}\u241f${figure.id}`);
  const tools: readonly ToolName[] = ["conch", "keris", "w8", "spiral"];
  const transferTool = tools[seed % tools.length];
  const loops = Math.max(14, Math.min(38, 24 + cell.loopBias + (seed % 7) - 3));
  const wallAlphabet = Array.from(normalized.toUpperCase()).filter((character) => /[\p{L}\p{N}]/u.test(character));
  const safeAlphabet = wallAlphabet.length ? wallAlphabet : Array.from("RETURN");
  const key = seed.toString(36).toUpperCase().padStart(7, "0");
  return {
    source: normalized,
    seed,
    key,
    loops,
    wallAlphabet: safeAlphabet,
    cell,
    figure,
    cellTokens: wordsForCell(cell),
    gateOrder: cell.gateOrder,
    transferTool,
    facts: [
      `PHRASE ${key} fixes maze topology, ${loops} extra passages, Gate coordinates, and the wall alphabet.`,
      `VERSE CELL “${cell.label}” supplies the eight tokens, their order, and the governing law.`,
      `FIGURE ${figure.label} changes movement and timing: ${figure.effect}`,
      `WORLD KEY sets the tonal center and requires ${transferTool.toUpperCase()} at TRANSFER.`,
    ],
  };
}

export function gateDefinition(name: GateName) {
  const definition = GATE_DEFINITIONS.find((gate) => gate.name === name);
  if (!definition) throw new Error(`Unknown Gate: ${name}`);
  return definition;
}

export function gateInstruction(law: WorldLaw, name: GateName) {
  if (name === "TRANSFER") return `First prove ${PRIMARY_GATE_BY_TOOL[law.transferTool]}, then reuse ${law.transferTool.toUpperCase()} here.`;
  if (name === "MEASURE") return `Hold between ${law.figure.measureMin.toFixed(1)}–${law.figure.measureMax.toFixed(1)} units for ${(law.figure.measureHoldMs / 1000).toFixed(1)} seconds.`;
  if (name === "TRUTH") return `Stand close. Release every control for ${(law.figure.truthHoldMs / 1000).toFixed(1)} seconds.`;
  return gateDefinition(name).instruction;
}

function dominantOperator(counts: OperatorCounts, seed: number): ToolName {
  const tools: readonly ToolName[] = ["conch", "keris", "w8", "spiral"];
  return [...tools].sort((left, right) => counts[right] - counts[left] || ((hashString(`${seed}:${left}`) % 97) - (hashString(`${seed}:${right}`) % 97)))[0];
}

function returnSource(source: string, operator: ToolName, pathSignature: string) {
  const words = source.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "RETURNED";
  if (words.length === 1) return `${words[0]} / RETURNED`;
  const pivot = hashString(`${pathSignature}:${operator}`) % words.length;
  if (operator === "conch") return [...words.slice(pivot), words[pivot], ...words.slice(0, pivot)].join(" ");
  if (operator === "keris") return [...words.slice(0, pivot), "—", ...words.slice(pivot)].join(" ");
  if (operator === "w8") return [...words.slice(pivot), ...words.slice(0, pivot)].join(" ");
  return [...words].reverse().join(" ");
}

export function makeReturnArtifact(
  law: WorldLaw,
  proofs: readonly GateProof[],
  operatorCounts: OperatorCounts,
  signature: readonly string[],
  steps: number,
  elapsedMs: number,
): ReturnArtifact {
  const pathSignature = signature.slice(-36).join("") || "•";
  const dominant = dominantOperator(operatorCounts, law.seed);
  const witnessedTokens = proofs.map((proof) => proof.token);
  const witness = witnessedTokens.join(" · ") || law.cellTokens.join(" · ");
  const instructions: Record<ToolName, string> = {
    conch: "Listen for a signal and name its source before answering.",
    keris: "Make the smallest cut that changes the next possible action.",
    w8: "Name the constraint that must survive the next change.",
    spiral: "Change the representation; verify that the underlying thing survives.",
  };
  return {
    schema: "sleeper.one-return",
    version: 2,
    worldKey: law.key,
    source: law.source,
    returnedSource: returnSource(law.source, dominant, pathSignature),
    cell: { id: law.cell.id, source: law.cell.text, provenance: law.cell.provenance, witness },
    figure: law.figure.id,
    dominantOperator: dominant,
    transferInstruction: instructions[dominant],
    pathSignature,
    operatorCounts: { ...operatorCounts },
    proofs: [...proofs],
    measures: { steps, elapsedMs: Math.max(0, Math.round(elapsedMs)) },
  };
}

export function makeUtilityPrompt(artifact: ReturnArtifact, mode: UtilityMode) {
  const source = `SOURCE: ${artifact.source}`;
  const operator = `PORTABLE OPERATOR: ${artifact.transferInstruction}`;
  if (mode === "calm") {
    return `${source}\nRETURN: No further task is required. Keep the witness or let the run end here.`;
  }
  if (mode === "home") {
    return `${source}\n${operator}\nHOME: Name one action small enough to complete now. Record what changed and what remained.`;
  }
  if (mode === "oracle") {
    return `${source}\n${operator}\nORACLE: What evidence would change your current reading? What is the smallest honest question to test next?`;
  }
  return `${source}\nWORLD: ${artifact.worldKey}\n${operator}\nTOGETHER: Ask another person for a different application of the same operator. Preserve both readings and their authors.`;
}

function verifiedWorldInput(
  source: unknown,
  cellId: unknown,
  figureId: unknown,
  expectedKey: unknown,
): WorldInputResult {
  if (typeof source !== "string" || !source.trim() || source.length > 120) {
    return { ok: false, error: "WITNESS REJECTED: SOURCE MUST BE 1–120 CHARACTERS." };
  }
  if (typeof cellId !== "string" || !VERSE_CELLS.some((cell) => cell.id === cellId)) {
    return { ok: false, error: "WITNESS REJECTED: VERSE CELL IS UNKNOWN." };
  }
  if (typeof figureId !== "string" || !FIGURES.some((figure) => figure.id === figureId)) {
    return { ok: false, error: "WITNESS REJECTED: FIGURE IS UNKNOWN." };
  }
  const law = compileWorldLaw(source, cellId as VerseCellId, figureId as FigureId);
  if (typeof expectedKey === "string" && expectedKey && expectedKey !== law.key) {
    return { ok: false, error: "WITNESS REJECTED: WORLD KEY DOES NOT MATCH ITS INPUTS." };
  }
  return {
    ok: true,
    input: { source: law.source, cellId: law.cell.id, figureId: law.figure.id, worldKey: law.key },
  };
}

export function parseReturnArtifactWorld(serialized: string): WorldInputResult {
  try {
    const candidate = JSON.parse(serialized) as Record<string, unknown>;
    if (candidate?.schema !== "sleeper.one-return" || candidate?.version !== 2) {
      return { ok: false, error: "WITNESS REJECTED: EXPECTED SLEEPER.ONE-RETURN V2." };
    }
    const cell = candidate.cell as Record<string, unknown> | undefined;
    return verifiedWorldInput(candidate.source, cell?.id, candidate.figure, candidate.worldKey);
  } catch {
    return { ok: false, error: "WITNESS REJECTED: JSON COULD NOT BE READ." };
  }
}

export function makeWorldQuery(law: WorldLaw) {
  return new URLSearchParams({
    source: law.source,
    cell: law.cell.id,
    figure: law.figure.id,
    world: law.key,
  }).toString();
}

export function parseWorldQuery(search: string): WorldInputResult {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return verifiedWorldInput(
    params.get("source"),
    params.get("cell"),
    params.get("figure"),
    params.get("world"),
  );
}
