import { clamp, hashString, seedFromSource, seededRandom } from "../../lib/seed.ts";
import { makeLabTransfer, type TraceEvent } from "../pack.ts";

export type RsvpLawId = "long" | "echo" | "turn" | "vowel";

export const RSVP_LAWS: Record<RsvpLawId, { title: string; instruction: string }> = {
  long: { title: "LONG SIGNAL", instruction: "Enter the lane of words carrying seven or more letters." },
  echo: { title: "ECHO SIGNAL", instruction: "Enter the lane of words containing a repeated letter." },
  turn: { title: "TURN SIGNAL", instruction: "Enter the lane of words carrying punctuation." },
  vowel: { title: "VOWEL FIELD", instruction: "Enter the lane of words carrying three or more distinct vowels." },
};

export const RSVP_LANE_COUNT = 5;
export const RSVP_LOOKAHEAD_MS = 2_650;
const RSVP_LEAD_IN_MS = 2_150;

export type RsvpPulse = { atMs: number; energy: number };

export type RsvpRhythmGuide = {
  durationMs: number;
  pulses: RsvpPulse[];
  bpm: number;
  confidence: number;
};

export type RsvpToken = {
  id: string;
  text: string;
  target: boolean;
  energy: number;
  lane: number;
  startMs: number;
  impactMs: number;
  endMs: number;
};

export type RsvpPlan = {
  source: string;
  law: RsvpLawId;
  tokens: RsvpToken[];
  totalMs: number;
  wpm: number;
  rhythm: {
    mode: "synthetic" | "audio";
    bpm?: number;
    confidence?: number;
    durationMs?: number;
  };
};

function sourceTokens(source: string) {
  const normalized = source.trim().replace(/\s+/g, " ") || "WAKE ON CHANGE; LET THE PATTERN FAIL.";
  if (!/\s/u.test(normalized) && Array.from(normalized).length <= 36) return Array.from(normalized);
  return normalized.match(/[\p{L}\p{N}'’-]+[^\s\p{L}\p{N}]*/gu)?.slice(0, 48) ?? [normalized];
}

function letters(text: string) {
  return Array.from(text.toLocaleLowerCase()).filter((character) => /\p{L}/u.test(character));
}

export function matchesRsvpLaw(text: string, law: RsvpLawId) {
  const chars = letters(text);
  if (law === "long") return chars.length >= 7;
  if (law === "echo") return new Set(chars).size < chars.length;
  if (law === "turn") return /[^\p{L}\p{N}'’\-]$/u.test(text);
  return new Set(chars.filter((character) => "aeiouy".includes(character))).size >= 3;
}

function selectLaw(tokens: string[], seed: number) {
  const laws = Object.keys(RSVP_LAWS) as RsvpLawId[];
  const desired = clamp(Math.round(tokens.length * 0.28), 1, Math.max(1, tokens.length - 1));
  return laws
    .map((law, index) => ({
      law,
      count: tokens.filter((token) => matchesRsvpLaw(token, law)).length,
      tie: (seed >>> (index * 3)) & 7,
    }))
    .sort((left, right) => {
      const leftPenalty = left.count === 0 || left.count === tokens.length ? tokens.length : Math.abs(left.count - desired);
      const rightPenalty = right.count === 0 || right.count === tokens.length ? tokens.length : Math.abs(right.count - desired);
      return leftPenalty - rightPenalty || left.tie - right.tie;
    })[0].law;
}

function nearestUsablePulse(guide: RsvpRhythmGuide, desiredMs: number, afterMs: number) {
  const minimum = afterMs + 125;
  const candidates = guide.pulses.filter((pulse) => pulse.atMs >= minimum);
  if (!candidates.length) return undefined;
  return candidates.reduce((best, pulse) => Math.abs(pulse.atMs - desiredMs) < Math.abs(best.atMs - desiredMs) ? pulse : best);
}

function energyAt(guide: RsvpRhythmGuide | undefined, atMs: number, fallback: number) {
  if (!guide?.pulses.length) return fallback;
  const pulse = guide.pulses.reduce((best, item) => Math.abs(item.atMs - atMs) < Math.abs(best.atMs - atMs) ? item : best);
  return clamp(pulse.energy, 0, 1);
}

/**
 * Builds a spatial reading course. Audio supplies a pulse grid, never a claim
 * about where a singer uttered a word: untimed text is projected onto rhythm.
 */
export function makeRsvpPlan(source: string, wpm = 240, rhythmGuide?: RsvpRhythmGuide): RsvpPlan {
  const tokens = sourceTokens(source);
  const seed = seedFromSource(source);
  const random = seededRandom(seed ^ 0xa511e9b3);
  const law = selectLaw(tokens, seed);
  const safeWpm = clamp(wpm, 120, 480);
  const guide = rhythmGuide && rhythmGuide.durationMs >= 3_000 && rhythmGuide.pulses.length >= 4 && rhythmGuide.confidence >= 0.1 ? rhythmGuide : undefined;
  let cursor = RSVP_LEAD_IN_MS;

  const planned: RsvpToken[] = [];
  tokens.forEach((text, index) => {
    const length = Math.max(1, letters(text).length);
    const punctuationPause = /[.!?]$/u.test(text) ? 1.75 : /[,;:]$/u.test(text) ? 1.35 : 1;
    const nominalDuration = (60_000 / safeWpm) * clamp(0.72 + length * 0.055, 0.82, 1.48) * punctuationPause;
    const desiredImpact = cursor + nominalDuration;
    const pulse = guide ? nearestUsablePulse(guide, desiredImpact, cursor) : undefined;
    const maySnap = pulse && pulse.atMs <= guide!.durationMs - 90 && Math.abs(pulse.atMs - desiredImpact) <= Math.max(240, nominalDuration * 0.72);
    const impactMs = maySnap ? pulse.atMs : desiredImpact;
    const fallbackEnergy = 0.18 + random() * 0.82;
    const energy = energyAt(guide, impactMs, fallbackEnergy);
    let lane = hashString(`${seed}:${index}:${text}`) % RSVP_LANE_COUNT;
    if (index > 1 && lane === planned[index - 1]?.lane && lane === planned[index - 2]?.lane) lane = (lane + 1 + (seed % 3)) % RSVP_LANE_COUNT;
    planned.push({
      id: `r${index}`,
      text,
      target: matchesRsvpLaw(text, law),
      energy,
      lane,
      startMs: cursor,
      impactMs,
      endMs: impactMs,
    });
    cursor = impactMs;
  });

  return {
    source,
    law,
    tokens: planned,
    totalMs: cursor + 420,
    wpm: safeWpm,
    rhythm: guide
      ? { mode: "audio", bpm: guide.bpm, confidence: guide.confidence, durationMs: guide.durationMs }
      : { mode: "synthetic" },
  };
}

export function rsvpResult(plan: RsvpPlan, trace: readonly TraceEvent[]) {
  const captured = new Set(
    trace
      .filter((event) => (event.action === "capture" || event.action === "mark") && event.target)
      .map((event) => event.target),
  );
  const hits = plan.tokens.filter((token) => token.target && captured.has(token.id));
  const misses = plan.tokens.filter((token) => token.target && !captured.has(token.id));
  const additions = plan.tokens.filter((token) => !token.target && captured.has(token.id));
  const clearPasses = plan.tokens.filter((token) => !token.target && !captured.has(token.id));
  const rewinds = trace.filter((event) => event.action === "rewind").length;
  const decisions = hits.length + misses.length + additions.length + clearPasses.length;
  const accuracy = decisions ? (hits.length + clearPasses.length) / decisions : 0;
  const recall = hits.length + misses.length ? hits.length / (hits.length + misses.length) : 1;
  const signature = plan.tokens.map((token) => token.target ? captured.has(token.id) ? "●" : "○" : captured.has(token.id) ? "×" : "·").join("");
  const selected = plan.tokens.filter((token) => captured.has(token.id)).map((token) => token.text).join(" ");
  return {
    law: plan.law,
    hits: hits.length,
    misses: misses.length,
    additions: additions.length,
    clearPasses: clearPasses.length,
    rewinds,
    accuracy,
    recall,
    selected,
    signature,
    transfer: makeLabTransfer(
      "rsvp",
      plan.source,
      "signal-mask",
      selected || plan.source,
      "The returned selection is accountable to one visible lexical law and a complete pass/capture trace.",
      { law: plan.law, signature, accuracy, recall, rewinds },
    ),
  };
}
