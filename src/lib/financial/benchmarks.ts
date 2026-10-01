import type { Company, Sector } from "@/types";

export interface BenchmarkSectorial {
  roe: number | null;
  margenNeto: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  cantidadEmpresas: number;
}

function promedio(valores: Array<number | null>): number | null {
  const validos = valores.filter((v): v is number => v !== null);
  if (validos.length === 0) return null;
  return validos.reduce((a, b) => a + b, 0) / validos.length;
}

export function calcularBenchmarkSector(empresas: Company[], sector: Sector): BenchmarkSectorial {
  const delSector = empresas.filter((e) => e.sector === sector);
  return {
    roe: promedio(delSector.map((e) => e.metrics.roe)),
    margenNeto: promedio(delSector.map((e) => e.metrics.margenNeto)),
    debtToEquity: promedio(delSector.map((e) => e.metrics.debtToEquity)),
    currentRatio: promedio(delSector.map((e) => e.metrics.currentRatio)),
    cantidadEmpresas: delSector.length,
  };
}
