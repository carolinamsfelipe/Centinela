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

/**
 * Days Sales Outstanding (DSO): días promedio que tarda la empresa en cobrar a sus clientes.
 * DSO = (Cuentas por Cobrar / Ventas) * 365
 */
export function calcularDso(cuentasPorCobrar: number | null, revenue: number | null): number | null {
  if (cuentasPorCobrar === null || revenue === null || revenue <= 0) return null;
  return (cuentasPorCobrar / revenue) * 365;
}

/**
 * Days Inventory Outstanding (DIO): días promedio que el inventario permanece inmovilizado.
 * DIO = (Inventarios / Costo de Ventas) * 365
 */
export function calcularDio(inventarios: number | null, costoVentas: number | null): number | null {
  if (inventarios === null || costoVentas === null || costoVentas <= 0) return null;
  return (inventarios / costoVentas) * 365;
}

/**
 * Days Payables Outstanding (DPO): días promedio que la empresa tarda en pagar a sus proveedores.
 * DPO = (Cuentas por Pagar / Costo de Ventas) * 365
 */
export function calcularDpo(cuentasPorPagar: number | null, costoVentas: number | null): number | null {
  if (cuentasPorPagar === null || costoVentas === null || costoVentas <= 0) return null;
  return (cuentasPorPagar / costoVentas) * 365;
}

/**
 * Ciclo de Conversión de Efectivo (CCC): tiempo que transcurre desde que se paga la materia prima
 * hasta que se cobra la venta. CCC = DSO + DIO - DPO.
 * Si la empresa no tiene inventarios (servicios), se calcula la brecha operativa: DSO - DPO.
 */
export function calcularCcc(
  dso: number | null,
  dio: number | null,
  dpo: number | null
): number | null {
  if (dso === null || dpo === null) return null;
  if (dio !== null) return dso + dio - dpo;
  return dso - dpo;
}

/**
 * Interest Coverage Ratio (ICR): capacidad de la generación operativa para pagar intereses.
 * ICR = EBITDA / Gastos por Intereses Financieros
 */
export function calcularIcr(
  ebitda: number | null,
  gastosIntereses: number | null
): number | null {
  if (ebitda === null || gastosIntereses === null) return null;
  if (gastosIntereses <= 0) return null; // Sin intereses financieros reportados
  return ebitda / gastosIntereses;
}

/**
 * Efectivo neto liberado en caja al reducir los días de cobro (DSO).
 * Delta Caja = ((DSO Actual - DSO Objetivo) * Ventas) / 365
 */
export function calcularImpactoCajaDso(
  dsoActual: number,
  dsoObjetivo: number,
  revenue: number
): number {
  if (revenue <= 0) return 0;
  return ((dsoActual - dsoObjetivo) * revenue) / 365;
}

/**
 * Efectivo neto retenido en caja al extender los días de pago a proveedores (DPO).
 * Delta Caja = ((DPO Objetivo - DPO Actual) * Costo de Ventas) / 365
 */
export function calcularImpactoCajaDpo(
  dpoActual: number,
  dpoObjetivo: number,
  costoVentas: number
): number {
  if (costoVentas <= 0) return 0;
  return ((dpoObjetivo - dpoActual) * costoVentas) / 365;
}

/**
 * Incremento de pasivo financiero en moneda local por salto cambiario sobre la deuda en USD.
 * Delta Pasivo = Deuda Total * % Deuda USD * % Devaluación
 */
export function calcularImpactoDevaluacionDeuda(
  deudaTotal: number,
  deudaUsdPct: number,
  devaluacionPct: number
): number {
  if (deudaTotal <= 0 || deudaUsdPct <= 0 || devaluacionPct <= 0) return 0;
  return deudaTotal * deudaUsdPct * devaluacionPct;
}

