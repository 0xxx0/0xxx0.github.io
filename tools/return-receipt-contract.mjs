const PENDING_CI = /\\bpending\\s+(?:pr\\s+)?ci\\b|\\bci\\s+(?:is\\s+)?pending\\b/i;

export function hasPendingCIClaim(receipt) {
  const text = typeof receipt === 'string' ? receipt : JSON.stringify(receipt ?? '');
  return PENDING_CI.test(text);
}
