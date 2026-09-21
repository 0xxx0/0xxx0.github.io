import { clamp } from "../../lib/seed.ts";
import type { RsvpRhythmGuide } from "./engine";

function percentile(values: readonly number[], fraction: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * fraction)))];
}

function median(values: readonly number[]) {
  return percentile(values, 0.5);
}

/**
 * Lightweight, deterministic onset analysis for local browser audio. It emits
 * a rhythm guide only; it does not identify lyrics, stems, or semantic timing.
 */
export function analyseRhythm(samples: Float32Array, sampleRate: number, limitMs = 90_000): RsvpRhythmGuide {
  const safeRate = Math.max(1, sampleRate);
  const usableSamples = Math.min(samples.length, Math.floor(safeRate * limitMs / 1_000));
  const hop = Math.max(32, Math.floor(safeRate * 0.025));
  const energy: number[] = [];

  for (let start = 0; start < usableSamples; start += hop) {
    const end = Math.min(usableSamples, start + hop);
    let sum = 0;
    for (let index = start; index < end; index += 1) sum += samples[index] * samples[index];
    energy.push(Math.sqrt(sum / Math.max(1, end - start)));
  }

  const high = percentile(energy, 0.95) || 1;
  const normalized = energy.map((value) => clamp(value / high, 0, 1));
  const novelty = normalized.map((value, index) => {
    const from = Math.max(0, index - 5);
    const history = normalized.slice(from, index);
    const baseline = history.length ? history.reduce((sum, item) => sum + item, 0) / history.length : 0;
    return Math.max(0, value - baseline);
  });
  const threshold = Math.max(0.035, percentile(novelty, 0.82) * 0.72);
  const rawPeaks: { frame: number; strength: number }[] = [];
  const minimumFrames = Math.max(4, Math.floor(0.18 * safeRate / hop));

  for (let index = 1; index < novelty.length - 1; index += 1) {
    if (novelty[index] < threshold || novelty[index] < novelty[index - 1] || novelty[index] < novelty[index + 1]) continue;
    const previous = rawPeaks.at(-1);
    if (previous && index - previous.frame < minimumFrames) {
      if (novelty[index] > previous.strength) rawPeaks[rawPeaks.length - 1] = { frame: index, strength: novelty[index] };
    } else rawPeaks.push({ frame: index, strength: novelty[index] });
  }

  const intervals = rawPeaks.slice(1).map((peak, index) => (peak.frame - rawPeaks[index].frame) * hop / safeRate * 1_000)
    .filter((value) => value >= 230 && value <= 1_200)
    .map((value) => {
      let folded = value;
      while (folded < 375) folded *= 2;
      while (folded > 750) folded /= 2;
      return folded;
    });
  const intervalMs = intervals.length ? median(intervals) : 500;
  const bpm = Math.round(60_000 / intervalMs);
  const durationMs = usableSamples / safeRate * 1_000;
  const strongest = [...rawPeaks].sort((left, right) => right.strength - left.strength)[0];
  const phaseMs = strongest ? strongest.frame * hop / safeRate * 1_000 : 0;
  const firstPulse = phaseMs - Math.ceil(phaseMs / intervalMs) * intervalMs;
  const pulses: RsvpRhythmGuide["pulses"] = [];

  for (let atMs = firstPulse; atMs <= durationMs; atMs += intervalMs / 4) {
    if (atMs < 0) continue;
    const frame = Math.min(normalized.length - 1, Math.max(0, Math.round(atMs / 1_000 * safeRate / hop)));
    pulses.push({ atMs: Math.round(atMs), energy: clamp(normalized[frame] ?? 0.25, 0.08, 1) });
  }

  const variance = intervals.length
    ? intervals.reduce((sum, value) => sum + Math.abs(value - intervalMs), 0) / intervals.length / intervalMs
    : 1;
  const density = durationMs ? rawPeaks.length / (durationMs / 1_000) : 0;
  const confidence = clamp((1 - variance) * clamp(density / 1.4, 0, 1), 0.05, 0.98);

  return { durationMs, pulses, bpm, confidence };
}


/** Restore measured timing only, never sound or lyric alignment. */
export function readRhythmGuide(value: unknown): RsvpRhythmGuide | undefined {
  if (!value || typeof value !== "object") return undefined;
  const guide = value as RsvpRhythmGuide;
  if (![guide.durationMs, guide.bpm, guide.confidence].every(Number.isFinite) ||
      guide.durationMs <= 0 || guide.durationMs > 90_000 || guide.bpm <= 0 || guide.bpm > 400 ||
      guide.confidence < 0 || guide.confidence > 1 || !Array.isArray(guide.pulses) || guide.pulses.length > 1200) return undefined;
  if (!guide.pulses.every((pulse, index) => pulse && Number.isFinite(pulse.atMs) &&
      pulse.atMs >= 0 && pulse.atMs <= guide.durationMs && Number.isFinite(pulse.energy) &&
      pulse.energy >= 0 && pulse.energy <= 1 && (!index || pulse.atMs >= guide.pulses[index - 1].atMs))) return undefined;
  return { durationMs: guide.durationMs, bpm: guide.bpm, confidence: guide.confidence,
    pulses: guide.pulses.map(({ atMs, energy }) => ({ atMs, energy })) };
}
