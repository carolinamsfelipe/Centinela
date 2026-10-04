/**
 * Tipos de cambio en vivo (unidades de cada moneda por 1 USD) desde
 * /api/fx -> Yahoo Finance. Se usa para expresar en USD las cifras de
 * empresas que no cotizan (balances cargados por el usuario). Si no se puede
 * consultar, no hay conversion: las cifras quedan en su moneda de origen.
 */
const CACHE_TTL_MS = 10 * 60 * 1000;
let cache: { rates: Record<string, number>; obtenido: number } | null = null;

export async function getFxRates(): Promise<Record<string, number>> {
  if (cache && Date.now() - cache.obtenido < CACHE_TTL_MS) return cache.rates;
  try {
    const resp = await fetch("/api/fx");
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    const rates: Record<string, number> = data?.rates ?? {};
    cache = { rates, obtenido: Date.now() };
    return rates;
  } catch {
    return cache?.rates ?? { USD: 1 };
  }
}

export async function getTipoCambioUsd(moneda: string): Promise<number | null> {
  if (moneda === "USD") return 1;
  const rates = await getFxRates();
  const v = rates[moneda];
  return typeof v === "number" && v > 0 ? v : null;
}
