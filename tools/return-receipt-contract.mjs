export function hasPendingCIClaim(receipt) {
  const text = typeof receipt === 'string' ? receipt : JSON.stringify(receipt ?? '');
  const normalized = text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  return /\bpending (?:pr )?ci\b|\bci (?:is )?pending\b/.test(normalized);
}
