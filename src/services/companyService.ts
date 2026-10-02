import { COMPANIES } from "@/data/companies";
import { calcularAltman } from "@/lib/financial/altman";
import { calcularDeudaSobrePatrimonio, calcularLiquidez, calcularMargenNeto, calcularRoa, calcularRoe } from "@/lib/financial/ratios";
import { calcularCentinelaScore } from "@/lib/financial/scores";
import { generarSenales } from "@/lib/financial/signals";
import type { Company, FinancialMetrics, HistoricalPoint } from "@/types";

/**
 * Capa de acceso a datos de empresas. Para las 5 empresas reales (fuente
 * "real") intenta traer datos en vivo de Yahoo Finance via /api/company/:ticker
 * (funcion serverless, evita CORS); si falla por cualquier motivo, cae al
 * respaldo estatico de /data/companies.ts con un aviso claro en la UI
 * (campo `envivo`). Las empresas demo nunca pegan a la red: siempre son
 * estaticas, a proposito.
 *
 * La UI nunca llama a la API ni a COMPANIES directamente, siempre pasa por
 * estas funciones -- así se puede ajustar la estrategia de cache o la
 * fuente sin tocar componentes.
 */

const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { empresa: Company; obtenido: number }>();

interface PeriodoApi {
  periodo: string;
  activosCorrientes?: number | null;
  activosTotales?: number | null;
  pasivosCorrientes?: number | null;
  pasivosTotales?: number | null;
  patrimonioNeto?: number | null;
  gananciasRetenidas?: number | null;
  deudaTotal?: number | null;
  capitalTrabajo?: number | null;
  ebit?: number | null;
  revenue?: number | null;
  netIncome?: number | null;
  efectivo?: number | null;
  ppeNeto?: number | null;
  precio?: number | null;
  variacionDiaria?: number | null;
  moneda?: string | null;
  marketCap?: number | null;
  pe?: number | null;
  eps?: number | null;
  evEbitda?: number | null;
}

function metricsDesdePeriodo(p: PeriodoApi, base: FinancialMetrics): FinancialMetrics {
  const metrics: FinancialMetrics = {
    ...base,
    periodo: p.periodo,
    precio: p.precio ?? null,
    variacionDiaria: p.variacionDiaria ?? null,
    marketCap: p.marketCap ?? null,
    revenue: p.revenue ?? null,
    ebitda: null,
    ebitMargin: null,
    netIncome: p.netIncome ?? null,
    roe: null,
    roa: null,
    margenNeto: null,
    debtToEquity: null,
    currentRatio: null,
    quickRatio: null,
    freeCashFlow: null,
    eps: p.eps ?? null,
    pe: p.pe ?? null,
    pb: null,
    evEbitda: p.evEbitda ?? null,
    activosCorrientes: p.activosCorrientes ?? null,
    activosTotales: p.activosTotales ?? null,
    pasivosCorrientes: p.pasivosCorrientes ?? null,
    pasivosTotales: p.pasivosTotales ?? null,
    patrimonioNeto: p.patrimonioNeto ?? null,
    gananciasRetenidas: p.gananciasRetenidas ?? null,
    deudaTotal: p.deudaTotal ?? null,
    ebit: p.ebit ?? null,
  };
  // Se recalculan con las mismas funciones que usa el resto de la app (nunca
  // se leen "crudas" de la API): una sola fuente de verdad para las fórmulas.
  metrics.roe = calcularRoe(metrics);
  metrics.roa = calcularRoa(metrics);
  metrics.margenNeto = calcularMargenNeto(metrics);
  metrics.debtToEquity = calcularDeudaSobrePatrimonio(metrics);
  metrics.currentRatio = calcularLiquidez(metrics);
  metrics.ebitMargin = metrics.ebit !== null && p.revenue ? metrics.ebit / p.revenue : null;
  return metrics;
}

function historicoDesdeApi(periodos: PeriodoApi[], base: FinancialMetrics): HistoricalPoint[] {
  return periodos.map((p) => {
    const m = metricsDesdePeriodo(p, base);
    return {
      periodo: p.periodo,
      revenue: m.revenue,
      ebitda: m.ebitda,
      netIncome: m.netIncome,
      roe: m.roe,
      roa: m.roa,
      debtToEquity: m.debtToEquity,
      freeCashFlow: null,
      // Altman/Score historicos necesitarian el market cap de cada periodo
      // pasado, que Yahoo no da por este camino -- se dejan en null en vez
      // de aproximar con el market cap de hoy.
      altmanZ: null,
      centinelaScore: null,
    };
  });
}

async function obtenerEnVivo(base: Company): Promise<Company | null> {
  try {
    const resp = await fetch(`/api/company/${encodeURIComponent(base.ticker)}`);
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data?.ultimo) return null;

    const metrics = metricsDesdePeriodo(data.ultimo, base.metrics);
    const historico = historicoDesdeApi(data.historico ?? [], base.metrics);

    return {
      ...base,
      metrics,
      historico: historico.length > 0 ? historico : base.historico,
      envivo: true,
      actualizado: data.actualizado ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

async function obtenerConCache(ticker: string): Promise<Company | undefined> {
  const base = COMPANIES.find((c) => c.ticker === ticker);
  if (!base) return undefined;
  if (base.fuente !== "real") return base;

  const cacheada = cache.get(ticker);
  if (cacheada && Date.now() - cacheada.obtenido < CACHE_TTL_MS) {
    return cacheada.empresa;
  }

  const enVivo = await obtenerEnVivo(base);
  const empresa = enVivo ?? { ...base, envivo: false, actualizado: null };
  cache.set(ticker, { empresa, obtenido: Date.now() });
  return empresa;
}

export async function getCompanies(): Promise<Company[]> {
  const resultados = await Promise.all(COMPANIES.map((c) => obtenerConCache(c.ticker)));
  return resultados.filter((c): c is Company => c !== undefined);
}

export async function getCompanyByTicker(ticker: string): Promise<Company | undefined> {
  return obtenerConCache(ticker);
}

export async function getCompanyAnalysis(ticker: string) {
  const company = await getCompanyByTicker(ticker);
  if (!company) return undefined;
  const altman = calcularAltman(company.metrics, company.metrics.marketCap);
  const score = calcularCentinelaScore(company.metrics, company.metrics.marketCap);
  const senales = generarSenales(company);
  return { company, altman, score, senales };
}

export async function searchCompanies(query: string): Promise<Company[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return COMPANIES.filter(
    (c) =>
      c.nombre.toLowerCase().includes(q) ||
      c.ticker.toLowerCase().includes(q) ||
      c.sector.toLowerCase().includes(q)
  );
}
