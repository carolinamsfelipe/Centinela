import type { FinancialMetrics, HistoricalPoint } from "@/types";
import { calcularAltman } from "./altman";
import { calcularCentinelaScore } from "./scores";
import {
  calcularDeudaSobrePatrimonio,
  calcularLiquidez,
  calcularMargenNeto,
  calcularRoa,
  calcularRoe,
  safeDiv,
} from "./ratios";

/**
 * Datos crudos de un ejercicio, venga de Yahoo Finance o de un balance
 * cargado por el usuario. Todos los importes en la misma moneda.
 */
export interface PeriodoDatos {
  periodo: string;
  activosCorrientes?: number | null;
  activosTotales?: number | null;
  pasivosCorrientes?: number | null;
  pasivosTotales?: number | null;
  patrimonioNeto?: number | null;
  gananciasRetenidas?: number | null;
  deudaTotal?: number | null;
  ebit?: number | null;
  ebitda?: number | null;
  revenue?: number | null;
  netIncome?: number | null;
  efectivo?: number | null;
  inventario?: number | null;
  freeCashFlow?: number | null;
  precio?: number | null;
  variacionDiaria?: number | null;
  marketCap?: number | null;
  pe?: number | null;
  eps?: number | null;
  pb?: number | null;
  evEbitda?: number | null;
  quickRatio?: number | null;
}

/**
 * Se recalculan SIEMPRE con las mismas funciones que usa el resto de la app
 * (nunca se leen "crudos" de una API): una sola fuente de verdad para las
 * formulas, sea cual sea el origen del dato.
 */
export function metricsDesdePeriodo(p: PeriodoDatos): FinancialMetrics {
  const n = (v: number | null | undefined): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

  const base: FinancialMetrics = {
    periodo: p.periodo,
    precio: n(p.precio),
    variacionDiaria: n(p.variacionDiaria),
    marketCap: n(p.marketCap),
    revenue: n(p.revenue),
    ebitda: n(p.ebitda),
    ebitMargin: null,
    netIncome: n(p.netIncome),
    roe: null,
    roa: null,
    margenNeto: null,
    debtToEquity: null,
    currentRatio: null,
    quickRatio: n(p.quickRatio),
    freeCashFlow: n(p.freeCashFlow),
    eps: n(p.eps),
    pe: n(p.pe),
    pb: n(p.pb),
    evEbitda: n(p.evEbitda),
    activosCorrientes: n(p.activosCorrientes),
    activosTotales: n(p.activosTotales),
    pasivosCorrientes: n(p.pasivosCorrientes),
    pasivosTotales: n(p.pasivosTotales),
    patrimonioNeto: n(p.patrimonioNeto),
    gananciasRetenidas: n(p.gananciasRetenidas),
    deudaTotal: n(p.deudaTotal),
    ebit: n(p.ebit),
  };

  base.roe = calcularRoe(base);
  base.roa = calcularRoa(base);
  base.margenNeto = calcularMargenNeto(base);
  base.debtToEquity = calcularDeudaSobrePatrimonio(base);
  base.currentRatio = calcularLiquidez(base);
  base.ebitMargin = safeDiv(base.ebit, base.revenue);

  const inventario = n(p.inventario);
  if (base.quickRatio === null && inventario !== null && base.activosCorrientes !== null) {
    base.quickRatio = safeDiv(base.activosCorrientes - inventario, base.pasivosCorrientes);
  }
  if (base.pb === null) base.pb = safeDiv(base.marketCap, base.patrimonioNeto);

  return base;
}

/**
 * Serie historica. Altman y Score historicos solo se calculan cuando hay una
 * capitalizacion de mercado propia de cada periodo (`marketCapPorPeriodo`),
 * por ejemplo el valor libro en una empresa que no cotiza. Para empresas que
 * cotizan, Yahoo no entrega el market cap de cada cierre pasado, y usar el de
 * hoy distorsionaria la serie: queda en null.
 */
export function historicoDesdePeriodos(
  periodos: PeriodoDatos[],
  marketCapPorPeriodo?: (p: PeriodoDatos, m: FinancialMetrics) => number | null
): HistoricalPoint[] {
  return periodos.map((p) => {
    const m = metricsDesdePeriodo(p);
    const mc = marketCapPorPeriodo ? marketCapPorPeriodo(p, m) : null;
    return {
      periodo: p.periodo,
      revenue: m.revenue,
      ebitda: m.ebitda,
      netIncome: m.netIncome,
      roe: m.roe,
      roa: m.roa,
      debtToEquity: m.debtToEquity,
      freeCashFlow: m.freeCashFlow,
      altmanZ: mc !== null ? calcularAltman(m, mc).zScore : null,
      centinelaScore: mc !== null ? calcularCentinelaScore(m, mc).total : null,
    };
  });
}
