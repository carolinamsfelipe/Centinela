import type { Company, Mercado, Sector } from "@/types";
import { analizarEmpresa } from "./analysis";

export interface BenchmarkGrupo {
  roe: number | null;
  roa: number | null;
  margenNeto: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  score: number | null;
  altman: number | null;
  cantidadEmpresas: number;
}

/** Mediana: robusta frente a una empresa muy grande o muy chica en un grupo corto. */
function mediana(valores: Array<number | null>): number | null {
  const validos = valores.filter((v): v is number => v !== null && Number.isFinite(v)).sort((a, b) => a - b);
  if (validos.length === 0) return null;
  const mid = Math.floor(validos.length / 2);
  return validos.length % 2 === 0 ? (validos[mid - 1] + validos[mid]) / 2 : validos[mid];
}

export function calcularBenchmark(empresas: Company[]): BenchmarkGrupo {
  const analisis = empresas.map((e) => analizarEmpresa(e));
  return {
    roe: mediana(empresas.map((e) => e.metrics.roe)),
    roa: mediana(empresas.map((e) => e.metrics.roa)),
    margenNeto: mediana(empresas.map((e) => e.metrics.margenNeto)),
    debtToEquity: mediana(empresas.map((e) => e.metrics.debtToEquity)),
    currentRatio: mediana(empresas.map((e) => e.metrics.currentRatio)),
    score: mediana(analisis.map((a) => a.score.total)),
    altman: mediana(analisis.map((a) => a.altman.zScore)),
    cantidadEmpresas: empresas.length,
  };
}

export function calcularBenchmarkSector(empresas: Company[], sector: Sector): BenchmarkGrupo {
  return calcularBenchmark(empresas.filter((e) => e.sector === sector));
}

export interface BenchmarkMercado {
  mercado: Mercado;
  grupo: BenchmarkGrupo;
}

/**
 * Mediana del sector de `empresa` en cada mercado que tenga al menos una
 * empresa de ese sector (excluyendo a la propia empresa), ordenado con el
 * mercado de la empresa primero. Es la base de la comparacion "tu empresa
 * vs. el mismo sector en otros mercados".
 */
export function benchmarkPorMercado(empresa: Company, universo: Company[]): BenchmarkMercado[] {
  const mismoSector = universo.filter((e) => e.sector === empresa.sector && e.ticker !== empresa.ticker);
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
