import type { Mercado } from "@/types";

/**
 * Tasas de interés anuales de referencia por mercado para deuda en moneda local.
 * Única fuente de verdad utilizada tanto por benchmarks como por el simulador.
 */
export const TASAS_REFERENCIA_POR_MERCADO: Record<Mercado, number> = {
  Argentina: 0.35,      // 35.0%
  Brasil: 0.115,        // 11.5%
  Chile: 0.055,         // 5.5%
  Mexico: 0.095,        // 9.5%
  "Estados Unidos": 0.045, // 4.5%
  Europa: 0.035,        // 3.5%
  Asia: 0.030,          // 3.0%
};

/**
 * Devuelve la tasa de referencia para el mercado indicado (en tanto por uno, ej: 0.35 para 35%).
 */
export function tasaReferencia(mercado?: string | null): number {
  if (!mercado) return 0.05;
  const m = mercado.trim();
  if (m in TASAS_REFERENCIA_POR_MERCADO) {
    return TASAS_REFERENCIA_POR_MERCADO[m as Mercado];
  }
  const mLower = m.toLowerCase();
  if (mLower.includes("argentina")) return TASAS_REFERENCIA_POR_MERCADO.Argentina;
  if (mLower.includes("brasil") || mLower.includes("brazil")) return TASAS_REFERENCIA_POR_MERCADO.Brasil;
  if (mLower.includes("chile")) return TASAS_REFERENCIA_POR_MERCADO.Chile;
  if (mLower.includes("mexico") || mLower.includes("méxico")) return TASAS_REFERENCIA_POR_MERCADO.Mexico;
  if (mLower.includes("unidos") || mLower.includes("usa") || mLower.includes("us")) return TASAS_REFERENCIA_POR_MERCADO["Estados Unidos"];
  if (mLower.includes("europa") || mLower.includes("europe")) return TASAS_REFERENCIA_POR_MERCADO.Europa;
  if (mLower.includes("asia")) return TASAS_REFERENCIA_POR_MERCADO.Asia;
  return 0.05;
}

/**
 * Calcula la tasa de interés efectiva real a partir de los gastos financieros y la deuda total.
 * Si no hay datos suficientes o deuda <= 0, retorna null.
 */
export function tasaEfectiva(gastosIntereses?: number | null, deudaTotal?: number | null): number | null {
  if (gastosIntereses == null || deudaTotal == null || deudaTotal <= 0 || gastosIntereses <= 0) {
    return null;
  }
  return gastosIntereses / deudaTotal;
}
