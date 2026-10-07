import type { Company, FinancialMetrics, Mercado, Sector } from "@/types";
import { analizarEmpresa } from "./analysis";
import { tasaReferencia } from "./tasasReferencia";

export const MUESTRA_MINIMA_BENCHMARK = 3;

export interface BenchmarkGrupo {
  roe: number | null;
  roa: number | null;
  margenNeto: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  score: number | null;
  altman: number | null;
  dso: number | null;
  dpo: number | null;
  ccc: number | null;
  icr: number | null;
  cantidadEmpresas: number;
  muestraSuficiente: boolean;
}

/** Percentil p en [0, 100] sobre valores válidos. */
export function percentil(valores: Array<number | null>, p: number): number | null {
  const validos = valores.filter((v): v is number => v !== null && Number.isFinite(v)).sort((a, b) => a - b);
  if (validos.length === 0) return null;
  const rank = (p / 100) * (validos.length - 1);
  const low = Math.floor(rank);
  const high = Math.ceil(rank);
  if (low === high) return validos[low];
  return validos[low] + (rank - low) * (validos[high] - validos[low]);
}

/** Mediana: robusta frente a una empresa muy grande o muy chica en un grupo corto. */
function mediana(valores: Array<number | null>): number | null {
  return percentil(valores, 50);
}

export function calcularBenchmark(empresas: Company[]): BenchmarkGrupo {
  const deMercado = empresas.filter((e) => e.companyType === "market");
  const analisis = deMercado.map((e) => analizarEmpresa(e));
  return {
    roe: mediana(deMercado.map((e) => e.metrics.roe)),
    roa: mediana(deMercado.map((e) => e.metrics.roa)),
    margenNeto: mediana(deMercado.map((e) => e.metrics.margenNeto)),
    debtToEquity: mediana(deMercado.map((e) => e.metrics.debtToEquity)),
    currentRatio: mediana(deMercado.map((e) => e.metrics.currentRatio)),
    score: mediana(analisis.map((a) => a.score.total)),
    altman: mediana(analisis.map((a) => a.altman.zScore)),
    dso: mediana(deMercado.map((e) => e.metrics.dso ?? null)),
    dpo: mediana(deMercado.map((e) => e.metrics.dpo ?? null)),
    ccc: mediana(deMercado.map((e) => e.metrics.ccc ?? null)),
    icr: mediana(deMercado.map((e) => e.metrics.icr ?? null)),
    cantidadEmpresas: deMercado.length,
    muestraSuficiente: deMercado.length >= MUESTRA_MINIMA_BENCHMARK,
  };
}

export function calcularBenchmarkSector(empresas: Company[], sector: Sector): BenchmarkGrupo {
  return calcularBenchmark(empresas.filter((e) => e.companyType === "market" && e.sector === sector));
}

export interface BenchmarkMercado {
  mercado: Mercado;
  grupo: BenchmarkGrupo;
}

/**
 * Mediana del sector de `empresa` en cada mercado que tenga al menos una
 * empresa de ese sector (excluyendo a la propia empresa y considerando
 * exclusivamente empresas que cotizan en mercado), ordenado con el mercado de
 * la empresa primero.
 */
export function benchmarkPorMercado(empresa: Company, universo: Company[]): BenchmarkMercado[] {
  const mismoSector = universo.filter(
    (e) => e.companyType === "market" && e.sector === empresa.sector && e.ticker !== empresa.ticker
  );
  const mercados = Array.from(new Set(mismoSector.map((e) => e.mercado)));
  const resultado = mercados.map((mercado) => ({
    mercado,
    grupo: calcularBenchmark(mismoSector.filter((e) => e.mercado === mercado)),
  }));
  return resultado.sort((a, b) => {
    if (a.mercado === empresa.mercado) return -1;
    if (b.mercado === empresa.mercado) return 1;
    return b.grupo.cantidadEmpresas - a.grupo.cantidadEmpresas;
  });
}

export interface MetricasCajaInferidas {
  dso: number;
  esDsoEstimado: boolean;
  dio: number;
  esDioEstimado: boolean;
  dpo: number;
  esDpoEstimado: boolean;
  ccc: number;
  esCccEstimado: boolean;
  icr: number;
  esIcrEstimado: boolean;
  origenEstimacion: string;
}

export const MEDIANAS_SECTORIALES_DEFAULT: Record<Sector, { dso: number; dio: number; dpo: number; ccc: number; icr: number }> = {
  Energia: { dso: 52, dio: 35, dpo: 44, ccc: 43, icr: 3.8 },
  Materiales: { dso: 58, dio: 55, dpo: 48, ccc: 65, icr: 2.9 },
  Industria: { dso: 64, dio: 60, dpo: 45, ccc: 79, icr: 2.5 },
  Consumo: { dso: 36, dio: 52, dpo: 50, ccc: 38, icr: 3.6 },
  Salud: { dso: 62, dio: 45, dpo: 42, ccc: 65, icr: 4.5 },
  Tecnologia: { dso: 56, dio: 20, dpo: 40, ccc: 36, icr: 6.2 },
  Telecomunicaciones: { dso: 48, dio: 18, dpo: 50, ccc: 16, icr: 2.8 },
  Finanzas: { dso: 30, dio: 0, dpo: 30, ccc: 0, icr: 1.8 },
  Construccion: { dso: 75, dio: 50, dpo: 45, ccc: 80, icr: 2.1 },
  Agro: { dso: 70, dio: 65, dpo: 45, ccc: 90, icr: 2.8 },
  Inmobiliario: { dso: 45, dio: 90, dpo: 40, ccc: 95, icr: 2.1 },
};

export function inferirMetricasCaja(
  m?: Partial<FinancialMetrics> | null,
  sector?: Sector,
  mercado?: Mercado
): MetricasCajaInferidas {
  const fallbackSector = (sector && MEDIANAS_SECTORIALES_DEFAULT[sector]) ?? {
    dso: 55,
    dio: 45,
    dpo: 45,
    ccc: 55,
    icr: 3.0,
  };

  // 1. DSO (Días de Cobro)
  let dso = m?.dso ?? null;
  let esDsoEstimado = false;
  if (dso === null && m?.cuentasPorCobrar != null && m.revenue && m.revenue > 0) {
    dso = (m.cuentasPorCobrar / m.revenue) * 365;
  }
  if (dso === null || Number.isNaN(dso) || dso <= 0) {
    dso = fallbackSector.dso;
    esDsoEstimado = true;
  }

  // 2. DIO (Días de Inventario)
  let dio = m?.dio ?? null;
  let esDioEstimado = false;
  if (dio === null && m?.inventarios != null && m.costoVentas && m.costoVentas > 0) {
    dio = (m.inventarios / m.costoVentas) * 365;
  }
  if (dio === null || Number.isNaN(dio) || dio < 0) {
    dio = fallbackSector.dio;
    esDioEstimado = true;
  }

  // 3. DPO (Días de Proveedores)
  let dpo = m?.dpo ?? null;
  let esDpoEstimado = false;
  if (dpo === null && m?.cuentasPorPagar != null && m.costoVentas && m.costoVentas > 0) {
    dpo = (m.cuentasPorPagar / m.costoVentas) * 365;
  }
  if (dpo === null || Number.isNaN(dpo) || dpo <= 0) {
    dpo = fallbackSector.dpo;
    esDpoEstimado = true;
  }

  // 4. CCC (Ciclo de Conversión de Efectivo)
  let ccc = m?.ccc ?? null;
  let esCccEstimado = false;
  if (ccc !== null && !Number.isNaN(ccc)) {
    esCccEstimado = false;
  } else if (!esDsoEstimado && !esDioEstimado && !esDpoEstimado) {
    ccc = dso + dio - dpo;
    esCccEstimado = false;
  } else {
    ccc = dso + dio - dpo;
    esCccEstimado = true;
  }

  // 5. ICR (Cobertura de Intereses)
  let icr = m?.icr ?? null;
  let esIcrEstimado = false;
  if (icr !== null && !Number.isNaN(icr)) {
    esIcrEstimado = false;
  } else if (m?.gastosIntereses && m.gastosIntereses > 0 && (m.ebit ?? m.ebitda) != null) {
    icr = ((m.ebit ?? m.ebitda) as number) / m.gastosIntereses;
    esIcrEstimado = false;
  } else if (m?.deudaTotal && m.deudaTotal > 0 && (m.ebit ?? m.ebitda) != null) {
    const tasa = tasaReferencia(mercado);
    const interesesEstimados = m.deudaTotal * tasa;
    icr = Math.max(0.1, ((m.ebit ?? m.ebitda) as number) / interesesEstimados);
    esIcrEstimado = true;
  } else if (m?.deudaTotal === 0 || (m?.debtToEquity !== null && m?.debtToEquity !== undefined && m.debtToEquity < 0.05)) {
    icr = 15.0;
    esIcrEstimado = false;
  } else {
    icr = fallbackSector.icr;
    esIcrEstimado = true;
  }

  return {
    dso: Math.round(dso),
    esDsoEstimado,
    dio: Math.round(dio),
    esDioEstimado,
    dpo: Math.round(dpo),
    esDpoEstimado,
    ccc: Math.round(ccc),
    esCccEstimado,
    icr: Math.round(icr * 10) / 10,
    esIcrEstimado,
    origenEstimacion: sector ? `Mediana sectorial (${sector})` : "Benchmark sectorial de referencia",
  };
}
