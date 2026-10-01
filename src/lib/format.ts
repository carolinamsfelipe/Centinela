export function fmtPct(v: number | null, decimals = 1): string {
  if (v === null) return "N/D";
  return `${(v * 100).toFixed(decimals)}%`;
}

export function fmtNum(v: number | null, decimals = 2): string {
  if (v === null) return "N/D";
  return v.toFixed(decimals);
}

export function fmtMoney(v: number | null): string {
  if (v === null) return "N/D";
  const abs = Math.abs(v);
  if (abs >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

export function fmtX(v: number | null, decimals = 2): string {
  if (v === null) return "N/D";
  return `${v.toFixed(decimals)}x`;
}
