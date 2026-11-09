// Indian price formatting helpers.
export const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

/** ₹52,000 · ₹6.2 lakh · ₹1.25 crore */
export function inrShort(n: number): string {
  if (n >= 1_00_00_000) return `₹${trim(n / 1_00_00_000)} crore`;
  if (n >= 1_00_000) return `₹${trim(n / 1_00_000)} lakh`;
  return inr(n);
}

function trim(v: number) {
  return Number(v.toFixed(2)).toString();
}
