export function clamp(value: number, low: number, high: number) {
  return Math.max(low, Math.min(high, value));
}

/**
 * FNV-1a over Unicode code points. This is intentionally small and stable:
 * a field seed is a reproducibility key, not a security primitive.
 */
export function hashString(value: string) {
  let hash = 2166136261;
  for (const character of value.normalize("NFC")) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function seededRandom(seed: number) {
  let state = seed || 0x6d2b79f5;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFromSource(source: string) {
  return hashString(source.trim().replace(/\s+/g, " ").toUpperCase());
}

export function seedLabel(source: string) {
  return seedFromSource(source).toString(36).toUpperCase().padStart(7, "0");
}

export function shuffleBySeed<T>(items: readonly T[], seed: number) {
  const random = seededRandom(seed);
  return [...items]
    .map((item) => ({ item, order: random() }))
    .sort((left, right) => left.order - right.order)
    .map(({ item }) => item);
}
