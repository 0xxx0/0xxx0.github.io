import { seedFromSource, shuffleBySeed } from "../../lib/seed.ts";
import { makeLabTransfer, type TraceEvent } from "../pack.ts";

export type JueOperatorId = "wei" | "shi" | "lai" | "time" | "mo" | "yi" | "show" | "void";

export type JueLaw = {
  id: JueOperatorId;
  glyph: string;
  name: string;
  verb: string;
  effect: string;
};

export const JUE_LAWS: readonly JueLaw[] = [
  { id: "wei", glyph: "未", name: "NOT YET", verb: "DEFER", effect: "Send one token below the visible line; it must return later." },
  { id: "shi", glyph: "始", name: "BEGIN", verb: "ORIGIN", effect: "Move one token to the beginning." },
  { id: "lai", glyph: "来", name: "ARRIVE", verb: "DRAW NEAR", effect: "Pull the far token beside the chosen token." },
  { id: "time", glyph: "时", name: "TIME", verb: "CADENCE", effect: "Add a measured pause after one token." },
  { id: "mo", glyph: "末", name: "END / TIP", verb: "BOUNDARY", effect: "Move one token to the far edge." },
  { id: "yi", glyph: "已", name: "ALREADY / STOP", verb: "HOLD", effect: "Fix one token so later laws cannot move it." },
  { id: "show", glyph: "示", name: "SHOW", verb: "EVIDENCE", effect: "Make one token explicit in the return." },
  { id: "void", glyph: "空", name: "OPEN / EMPTY", verb: "SPACE", effect: "Open a visible gap while preserving what left it." },
] as const;

export type JueToken = {
  id: string;
  text: string;
  locked: boolean;
  shown: boolean;
  pauses: number;
  voided: boolean;
};

export type JueState = {
  source: string;
  tokens: JueToken[];
  deferred: JueToken[];
  used: JueOperatorId[];
  trace: TraceEvent[];
};

export type JueConstraintId = "origin" | "evidence" | "edge" | "fixed" | "gap" | "cadence" | "retrieved";

export type JueConstraint = {
  id: JueConstraintId;
  title: string;
  instruction: string;
  targetId?: string;
};

export type JueConstraintStatus = JueConstraint & { satisfied: boolean };

function segmentSource(source: string) {
  const normalized = source.trim().replace(/\s+/g, " ") || "未始来时末已示空";
  if (!/\s/u.test(normalized)) {
    const characters = Array.from(normalized);
    if (characters.length <= 12) return characters;
    const width = Math.ceil(characters.length / 10);
    return Array.from({ length: Math.ceil(characters.length / width) }, (_, index) => characters.slice(index * width, (index + 1) * width).join(""));
  }
  return normalized.split(" ").filter(Boolean).slice(0, 10);
}

export function makeJueState(source: string): JueState {
  const normalized = source.trim() || "未始来时末已示空";
  return {
    source: normalized,
    tokens: segmentSource(normalized).map((text, index) => ({ id: `t${index}`, text, locked: false, shown: false, pauses: 0, voided: false })),
    deferred: [],
    used: [],
    trace: [],
  };
}

function insertAfter(tokens: JueToken[], targetId: string, token: JueToken) {
  const index = Math.max(0, tokens.findIndex((item) => item.id === targetId));
  const next = [...tokens];
  next.splice(index + 1, 0, token);
  return next;
}

export function applyJueLaw(state: JueState, operator: JueOperatorId, targetId: string): JueState {
  if (state.used.includes(operator) || state.used.length >= 6) return state;
  const target = state.tokens.find((token) => token.id === targetId);
  if (!target || target.locked || target.voided) return state;

  let tokens = state.tokens.map((token) => ({ ...token }));
  let deferred = state.deferred.map((token) => ({ ...token }));
  const index = tokens.findIndex((token) => token.id === targetId);

  if (operator === "wei") {
    deferred.push(tokens[index]);
    tokens.splice(index, 1);
  } else if (operator === "shi") {
    const [moved] = tokens.splice(index, 1);
    tokens.unshift(moved);
  } else if (operator === "lai") {
    if (deferred.length) {
      const [returning, ...rest] = deferred;
      deferred = rest;
      tokens = insertAfter(tokens, targetId, returning);
    } else if (tokens.length > 1) {
      const farIndex = index < tokens.length / 2 ? tokens.length - 1 : 0;
      const [far] = tokens.splice(farIndex, 1);
      tokens = insertAfter(tokens, targetId, far);
    }
  } else if (operator === "time") {
    tokens[index].pauses = Math.min(2, tokens[index].pauses + 1);
  } else if (operator === "mo") {
    const [moved] = tokens.splice(index, 1);
    tokens.push(moved);
  } else if (operator === "yi") {
    tokens[index].locked = true;
  } else if (operator === "show") {
    tokens[index].shown = true;
  } else if (operator === "void") {
    tokens[index].voided = true;
  }

  return {
    ...state,
    tokens,
    deferred,
    used: [...state.used, operator],
    trace: [...state.trace, { tick: state.used.length, action: operator, target: targetId }],
  };
}

export function jueCommission(source: string): JueConstraint[] {
  const initial = makeJueState(source);
  const seed = seedFromSource(source);
  const targets = shuffleBySeed(initial.tokens, seed ^ 0x517cc1b7);
  const origin = targets[0] ?? initial.tokens[0];
  const evidence = targets.find((token) => token.id !== origin?.id) ?? origin;
  const third = targets.find((token) => token.id !== origin?.id && token.id !== evidence?.id) ?? targets.at(-1) ?? origin;
  const optional: JueConstraint[] = [
    { id: "edge", title: "BOUNDARY", instruction: `Let ${third?.text ?? "one token"} define the far edge.`, targetId: third?.id },
    { id: "fixed", title: "COMMITMENT", instruction: `Fix ${third?.text ?? "one token"}; what is fixed can no longer be revised.`, targetId: third?.id },
    { id: "gap", title: "PRESERVED ABSENCE", instruction: `Open ${third?.text ?? "one token"} as a gap without losing its source.`, targetId: third?.id },
    { id: "cadence", title: "MEASURE", instruction: `Place a measured pause after ${third?.text ?? "one token"}.`, targetId: third?.id },
    ...(initial.tokens.length > 1 ? [{ id: "retrieved", title: "RETURN FROM NOT YET", instruction: "Defer material, then draw it back. Nothing may remain below the line." } as JueConstraint] : []),
  ];
  return [
    { id: "origin", title: "ORIGIN", instruction: `${origin?.text ?? "One token"} must begin the returned line.`, targetId: origin?.id },
    { id: "evidence", title: "EVIDENCE", instruction: `Make ${evidence?.text ?? "one token"} explicit without removing it.`, targetId: evidence?.id },
    optional[seed % optional.length],
  ];
}

export function evaluateJueCommission(state: JueState, commission = jueCommission(state.source)): JueConstraintStatus[] {
  const allTokens = [...state.tokens, ...state.deferred];
  return commission.map((constraint) => {
    const target = allTokens.find((token) => token.id === constraint.targetId);
    let satisfied = false;
    if (constraint.id === "origin") satisfied = state.tokens[0]?.id === constraint.targetId;
    else if (constraint.id === "evidence") satisfied = Boolean(target?.shown && state.tokens.some((token) => token.id === constraint.targetId));
    else if (constraint.id === "edge") satisfied = state.tokens.at(-1)?.id === constraint.targetId;
    else if (constraint.id === "fixed") satisfied = Boolean(target?.locked);
    else if (constraint.id === "gap") satisfied = Boolean(target?.voided);
    else if (constraint.id === "cadence") satisfied = Boolean(target && target.pauses > 0);
    else if (constraint.id === "retrieved") satisfied = state.used.includes("wei") && state.used.includes("lai") && state.deferred.length === 0;
    return { ...constraint, satisfied };
  });
}

export function replayJue(source: string, trace: readonly TraceEvent[]) {
  return trace.reduce((state, event) => {
    const operator = JUE_LAWS.find((law) => law.id === event.action)?.id;
    return operator && event.target ? applyJueLaw(state, operator, event.target) : state;
  }, makeJueState(source));
}

export function undoJue(state: JueState) {
  return replayJue(state.source, state.trace.slice(0, -1));
}

export function jueReturn(state: JueState) {
  const visible = [...state.tokens, ...state.deferred];
  const line = visible.map((token) => {
    const word = token.voided ? "□" : token.shown ? token.text.toUpperCase() : token.text;
    return `${word}${" ·".repeat(token.pauses)}`;
  }).join(" ").replace(/\s+/g, " ").trim();
  const commission = evaluateJueCommission(state);
  const requiredHits = commission.filter((constraint) => constraint.satisfied).length;
  const sourceLedger = visible.map((token, index) => ({
    id: token.id,
    source: token.text,
    returnIndex: index,
    state: token.voided ? "held-in-gap" : token.locked ? "fixed" : token.shown ? "shown" : "carried",
  }));
  return {
    line,
    omittedLaws: JUE_LAWS.filter((law) => !state.used.includes(law.id)).map((law) => law.glyph),
    commission,
    requiredHits,
    sourceLedger,
    summary: `${state.used.length}/6 moves · ${requiredHits}/3 conditions held · ${state.deferred.length} still not yet`,
    transfer: makeLabTransfer(
      "jue",
      state.source,
      "ordered-line",
      line,
      "Every source token remains addressable even when deferred or held as a gap.",
      { used: state.used, commission: commission.map(({ id, targetId, satisfied }) => ({ id, targetId, satisfied })), sourceLedger },
    ),
  };
}
