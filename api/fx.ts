import { fetchFxPorUsd } from "./_yahoo.js";

/**
 * GET /api/fx
 * Tipos de cambio en vivo (unidades de cada moneda por 1 USD) desde Yahoo
 * Finance. Se usa para convertir a USD las cifras de empresas cargadas por
 * el usuario y para mostrar magnitudes comparables entre mercados. Las
 * monedas sin cotizacion disponible simplemente no aparecen en la respuesta.
 */
const MONEDAS = ["ARS", "BRL", "CLP", "MXN", "COP", "UYU", "PEN", "EUR", "GBP", "CHF", "DKK", "JPY", "CNY", "TWD", "KRW", "INR", "CAD"];

export default async function handler(_req: any, res: any) {
  const valores = await Promise.all(MONEDAS.map((m) => fetchFxPorUsd(m)));
  const rates: Record<string, number> = { USD: 1 };
  MONEDAS.forEach((m, i) => {
    const v = valores[i];
    if (v !== null) rates[m] = v;
  });
  res.setHeader("Cache-Control", "public, s-maxage=900, stale-while-revalidate=1800");
  res.status(200).json({ actualizado: new Date().toISOString(), rates });
}
