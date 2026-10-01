import type { FinancialMetrics } from "@/types";

export function safeDiv(a: number | null, b: number | null): number | null {
  if (a === null || b === null || b === 0) return null;
  return a / b;
}

export function calcularLiquidez(m: FinancialMetrics): number | null {
  return safeDiv(m.activosCorrientes, m.pasivosCorrientes);
}

export function calcularEndeudamiento(m: FinancialMetrics): number | null {
  return safeDiv(m.pasivosTotales, m.activosTotales);
}

export function calcularCapitalTrabajoSobreActivos(m: FinancialMetrics): number | null {
  if (m.activosCorrientes === null || m.pasivosCorrientes === null) return null;
  const capitalTrabajo = m.activosCorrientes - m.pasivosCorrientes;
  return safeDiv(capitalTrabajo, m.activosTotales);
}

export function calcularDeudaSobrePatrimonio(m: FinancialMetrics): number | null {
  return safeDiv(m.deudaTotal, m.patrimonioNeto);
}

export function calcularRoe(m: FinancialMetrics): number | null {
  return safeDiv(m.netIncome, m.patrimonioNeto);
}

export function calcularRoa(m: FinancialMetrics): number | null {
  return safeDiv(m.netIncome, m.activosTotales);
}

export function calcularMargenNeto(m: FinancialMetrics): number | null {
  return safeDiv(m.netIncome, m.revenue);
}
