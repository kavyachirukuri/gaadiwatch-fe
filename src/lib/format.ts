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

/** Distance for display: one decimal under 10 km, whole numbers above (e.g. 2.6, 14). */
export function km(n: number): string {
  return n < 10 ? (Math.round(n * 10) / 10).toString() : Math.round(n).toString();
}
