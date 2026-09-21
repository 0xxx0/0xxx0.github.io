import { clamp, seedFromSource, seededRandom } from "../../lib/seed.ts";
import { makeLabTransfer } from "../pack.ts";

export type KiteMeasure = {
  index: number;
  word: string;
  wind: number;
  phase: number;
  durationMs: number;
  bandCenter: number;
  bandWidth: number;
  gust: number;
};

export type KiteMark = {
  word: string;
  stability: number;
  state: "carried" | "weathered";
  residueAfter: number;
};

export type KiteCourse = {
  source: string;
  measures: KiteMeasure[];
};

export type KiteState = {
  measure: number;
  elapsedMs: number;
  tension: number;
  altitude: number;
  x: number;
  velocity: number;
  stableMs: number;
  residue: number;
  streak: number;
  bestStreak: number;
  marks: KiteMark[];
  complete: boolean;
};

function kiteWords(source: string) {
  const normalized = source.trim().replace(/\s+/g, " ") || "SOME REPLIES TAKE WIND";
  if (!/\s/u.test(normalized) && Array.from(normalized).length <= 16) return Array.from(normalized).slice(0, 8);
  return normalized.split(" ").filter(Boolean).slice(0, 8);
}

export function makeKiteCourse(source: string): KiteCourse {
  const normalized = source.trim() || "SOME REPLIES TAKE WIND";
  const random = seededRandom(seedFromSource(normalized) ^ 0x79dedea3);
  return {
    source: normalized,
    measures: kiteWords(normalized).map((word, index) => ({
      index,
      word,
      wind: 0.24 + random() * 0.72,
      phase: random() * Math.PI * 2,
      durationMs: 3900 + Math.round(random() * 900),
      bandCenter: 0.43 + random() * 0.14,
      bandWidth: 0.29 + random() * 0.13,
      gust: 0.07 + random() * 0.12,
    })),
  };
}

export function initialKiteState(): KiteState {
  return { measure: 0, elapsedMs: 0, tension: 0.5, altitude: 0.44, x: 0.5, velocity: 0, stableMs: 0, residue: 0, streak: 0, bestStreak: 0, marks: [], complete: false };
}

function windAt(course: KiteCourse, state: KiteState, aheadMs = 0) {
  const measure = course.measures[Math.min(state.measure, Math.max(0, course.measures.length - 1))];
  if (!measure) return 0.5;
  const t = (state.elapsedMs + aheadMs) / 1000;
  return clamp(measure.wind + Math.sin(t * 1.37 + measure.phase) * 0.18 + Math.sin(t * 3.1 + measure.phase * 0.4) * 0.07, 0.05, 1);
}

export function currentWind(course: KiteCourse, state: KiteState) {
  return windAt(course, state);
}

export type KiteBand = { min: number; max: number; center: number; width: number };

export function kiteBand(course: KiteCourse, state: KiteState, aheadMs = 0): KiteBand {
  const measure = course.measures[Math.min(state.measure, Math.max(0, course.measures.length - 1))];
  if (!measure) return { min: 0.34, max: 0.72, center: 0.53, width: 0.38 };
  const t = (state.elapsedMs + aheadMs) / 1_000;
  const wind = windAt(course, state, aheadMs);
  const width = clamp(measure.bandWidth - state.residue * 0.11 + Math.min(3, state.streak) * 0.012, 0.2, 0.46);
  const movingCenter = measure.bandCenter
    + (wind - 0.5) * 0.13
    + Math.sin(t * 0.72 + measure.phase) * measure.gust;
  const center = clamp(movingCenter, width / 2 + 0.05, 0.95 - width / 2);
  return { min: center - width / 2, max: center + width / 2, center, width };
}

export function kiteForecast(course: KiteCourse, state: KiteState, aheadMs = 900) {
  const current = course.measures[state.measure];
  if (current && state.elapsedMs + aheadMs >= current.durationMs && course.measures[state.measure + 1]) {
    const projected = { ...state, measure: state.measure + 1, elapsedMs: state.elapsedMs + aheadMs - current.durationMs };
    return { wind: windAt(course, projected), band: kiteBand(course, projected) };
  }
  return { wind: windAt(course, state, aheadMs), band: kiteBand(course, state, aheadMs) };
}

export function stepKite(course: KiteCourse, state: KiteState, reeling: boolean, deltaMs: number): KiteState {
  if (state.complete || !course.measures.length) return state;
  const stepMs = clamp(deltaMs, 0, 48);
  const delta = stepMs / 1000;
  const measure = course.measures[state.measure];
  const wind = currentWind(course, state);
  const desiredTension = clamp(0.12 + wind * 0.52 + (reeling ? 0.38 : -0.05), 0.03, 1.05);
  const tension = clamp(state.tension + (desiredTension - state.tension) * delta * 3.1, 0, 1);
  const band = kiteBand(course, state);
  const stable = tension >= band.min && tension <= band.max;
  const lift = stable ? 0.38 + wind * 0.42 : tension < band.min ? 0.12 + tension * 0.45 : 0.18;
  const altitude = clamp(state.altitude + (lift - state.altitude) * delta * 1.55, 0.08, 0.91);
  const velocity = clamp((state.velocity + (wind - 0.5) * delta * 0.28) * Math.pow(0.985, delta * 60), -0.17, 0.17);
  let x = state.x + velocity * delta;
  if (x < 0.18 || x > 0.82) x = clamp(x, 0.18, 0.82);
  const elapsedMs = state.elapsedMs + stepMs;
  const stableMs = Math.min(measure.durationMs, state.stableMs + (stable ? stepMs : 0));

  if (elapsedMs < measure.durationMs) return { ...state, tension, altitude, x, velocity, elapsedMs, stableMs };

  const ratio = stableMs / measure.durationMs;
  const carried = ratio >= 0.58;
  const residue = carried ? Math.max(0, state.residue - 0.12) : Math.min(1, state.residue + 0.18);
  const streak = carried ? state.streak + 1 : 0;
  const bestStreak = Math.max(state.bestStreak, streak);
  const mark: KiteMark = { word: measure.word, stability: ratio, state: carried ? "carried" : "weathered", residueAfter: residue };
  const nextMeasure = state.measure + 1;
  if (nextMeasure >= course.measures.length) {
    return { ...state, tension, altitude, x, velocity, elapsedMs: measure.durationMs, stableMs, residue, streak, bestStreak, marks: [...state.marks, mark], measure: nextMeasure, complete: true };
  }
  return { ...state, tension, altitude, x, velocity, elapsedMs: 0, stableMs: 0, residue, streak, bestStreak, marks: [...state.marks, mark], measure: nextMeasure };
}

export function kiteReturn(course: KiteCourse, state: KiteState) {
  const carried = state.marks.filter((mark) => mark.state === "carried");
  const weathered = state.marks.filter((mark) => mark.state === "weathered");
  const meanStability = state.marks.length ? state.marks.reduce((sum, mark) => sum + mark.stability, 0) / state.marks.length : 0;
  const message = carried.map((mark) => mark.word).join(" ") || "NO WORD CLEARED THE WEATHER";
  const signature = state.marks.map((mark) => mark.state === "carried" ? "◇" : "·").join("");
  return {
    message,
    waiting: weathered.map((mark) => mark.word).join(" "),
    carried: carried.length,
    weathered: weathered.length,
    signature,
    measures: state.marks,
    meanStability,
    residue: state.residue,
    bestStreak: state.bestStreak,
    source: course.source,
    transfer: makeLabTransfer(
      "kite",
      course.source,
      "weather-line",
      message,
      "Weather may defer a word, but the ledger never erases it.",
      { signature, meanStability, residue: state.residue, bestStreak: state.bestStreak, measures: state.marks },
    ),
  };
}
