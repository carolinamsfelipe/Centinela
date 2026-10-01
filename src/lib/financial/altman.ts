import type { AltmanResult, Estado, FinancialMetrics } from "@/types";

export const ALTMAN_THRESHOLDS = {
  distress: 1.1,
  safe: 2.6,
};

export function diagnosticarAltman(zScore: number | null): Estado {
  if (zScore === null) return "sin_datos";
  if (zScore < ALTMAN_THRESHOLDS.distress) return "alerta";
  if (zScore < ALTMAN_THRESHOLDS.safe) return "atencion";
  return "normal";
}

export function calcularAltman(m: FinancialMetrics, marketCap: number | null): AltmanResult {
  const { activosTotales, pasivosTotales, gananciasRetenidas, ebit } = m;
  const capitalTrabajo =
    m.activosCorrientes !== null && m.pasivosCorrientes !== null
      ? m.activosCorrientes - m.pasivosCorrientes
      : null;

  if (
    activosTotales === null ||
    pasivosTotales === null ||
    activosTotales === 0 ||
    pasivosTotales === 0 ||
    capitalTrabajo === null ||
    gananciasRetenidas === null ||
    ebit === null
  ) {
    return { zScore: null, x1: null, x2: null, x3: null, x4: null, estado: "sin_datos" };
  }

  const x1 = capitalTrabajo / activosTotales;
  const x2 = gananciasRetenidas / activosTotales;
  const x3 = ebit / activosTotales;

  if (marketCap === null) {
    return { zScore: null, x1, x2, x3, x4: null, estado: "sin_datos" };
  }

  const x4 = marketCap / pasivosTotales;
  const zScore = 6.56 * x1 + 3.26 * x2 + 6.72 * x3 + 1.05 * x4;

  return { zScore, x1, x2, x3, x4, estado: diagnosticarAltman(zScore) };
}
