import type { AltmanResult, CentinelaScore, FinancialMetrics } from "@/types";
import { calcularAltman } from "./altman";
import { calcularCentinelaScore } from "./scores";

/**
 * Simulador de escenarios hipotéticos — Fase 5.
 *
 * IMPORTANTE: esto NO es un modelo financiero ni una predicción. Es una
 * proyección lineal simple de un solo período, construida exclusivamente a
 * partir de los supuestos que ingresa el usuario (crecimiento, margen,
 * variación de deuda, tasa de interés). Sirve para explorar "¿qué pasaría
 * si...?", no para anticipar el futuro de la empresa. Todas las pantallas que
 * consumen estas funciones deben rotular los resultados como "Escenario
 * hipotético" y nunca como predicción o pronóstico.
 */

export type NombreEscenario = "base" | "optimista" | "adverso";

export interface SupuestosSimulacion {
  /** Variación porcentual de ingresos esperada, ej. 0.1 = +10%. */
  crecimientoRevenue: number;
  /** Margen neto objetivo para el período proyectado, ej. 0.08 = 8%. */
  margenNeto: number;
  /** Variación porcentual de la deuda total, ej. -0.1 = -10%. */
  variacionDeuda: number;
  /** Tasa de interés anual aplicada sobre la deuda proyectada, ej. 0.4 = 40%. */
  tasaInteres: number;
}

export interface MetricasProyectadas {
  revenue: number | null;
  netIncome: number | null;
  margenNeto: number | null;
  debtToEquity: number | null;
  deudaTotal: number | null;
  gastoFinanciero: number | null;
}

export interface EscenarioSimulado {
  nombre: NombreEscenario;
  etiqueta: string;
  /** Supuestos efectivamente aplicados en este escenario (ya ajustados por el multiplicador). */
  supuestos: SupuestosSimulacion;
  metricas: MetricasProyectadas;
  altman: AltmanResult;
  score: CentinelaScore;
}

export interface ResultadoSimulacion {
  base: EscenarioSimulado;
  optimista: EscenarioSimulado;
  adverso: EscenarioSimulado;
}

/**
 * Multiplicadores que definen cómo se ajustan los supuestos ingresados por el
 * usuario para construir los escenarios "optimista" y "adverso" a partir del
 * escenario "base". Son coeficientes arbitrarios y documentados, elegidos
 * para representar una desviación razonable (±30/40%) respecto del supuesto
 * base, no una estimación estadística ni un intervalo de confianza real.
 */
export const MULTIPLICADORES_ESCENARIO = {
  optimista: {
    crecimiento: 1.3, // +30% sobre el crecimiento asumido
    margen: 1.2, // +20% sobre el margen asumido
    deuda: 0.7, // la variación de deuda se atenúa un 30% (menos deuda que en el caso base)
    tasa: 0.85, // tasa de interés 15% más baja
  },
  adverso: {
    crecimiento: 0.6, // el crecimiento se reduce a 60% del supuesto base
    margen: 0.7, // el margen se reduce a 70% del supuesto base
    deuda: 1.4, // la deuda crece un 40% más que en el caso base
    tasa: 1.3, // tasa de interés 30% más alta
  },
} as const;

function ajustarSupuestos(
  base: SupuestosSimulacion,
  mult: { crecimiento: number; margen: number; deuda: number; tasa: number }
): SupuestosSimulacion {
  return {
    crecimientoRevenue: base.crecimientoRevenue * mult.crecimiento,
    margenNeto: base.margenNeto * mult.margen,
    variacionDeuda: base.variacionDeuda * mult.deuda,
    tasaInteres: Math.max(0, base.tasaInteres * mult.tasa),
  };
}

/**
 * Proyecta las métricas financieras de un único período hacia adelante,
 * usando únicamente los supuestos recibidos y las métricas actuales de la
 * empresa. Fórmulas (lineales, intencionalmente simples):
 *
 *   revenueProyectado = revenueActual * (1 + crecimientoRevenue)
 *   netIncomeProyectado = revenueProyectado * margenNeto
 *   deudaProyectada = deudaActual * (1 + variacionDeuda)
 *   gastoFinanciero = deudaProyectada * tasaInteres  (informativo, no se
 *     resta del netIncome porque el margenNeto ingresado ya se asume neto)
 *   debtToEquity = deudaProyectada / patrimonioNeto (patrimonio se asume
 *     constante dentro del período simulado)
 */
export function proyectarMetricas(
  actual: FinancialMetrics,
  supuestos: SupuestosSimulacion
): MetricasProyectadas {
  const revenueBase = actual.revenue;
  const revenue = revenueBase !== null ? revenueBase * (1 + supuestos.crecimientoRevenue) : null;

  const netIncome = revenue !== null ? revenue * supuestos.margenNeto : null;

  const deudaBase = actual.deudaTotal;
  const deudaTotal = deudaBase !== null ? deudaBase * (1 + supuestos.variacionDeuda) : null;

  const gastoFinanciero = deudaTotal !== null ? deudaTotal * supuestos.tasaInteres : null;

  const debtToEquity =
    deudaTotal !== null && actual.patrimonioNeto !== null && actual.patrimonioNeto !== 0
      ? deudaTotal / actual.patrimonioNeto
      : null;

  return {
    revenue,
    netIncome,
    margenNeto: revenue !== null ? supuestos.margenNeto : null,
    debtToEquity,
    deudaTotal,
    gastoFinanciero,
  };
}

/**
 * Construye las métricas financieras proyectadas (con la misma forma que
 * FinancialMetrics) necesarias para poder reutilizar calcularAltman y
 * calcularCentinelaScore sobre el escenario simulado. El resto de los
 * campos de balance (activos, pasivos, EBIT, etc.) se mantienen iguales a
 * los actuales: este simulador solo proyecta revenue, resultado neto y
 * deuda; no simula un balance completo.
 */
function construirMetricasProyectadas(
  actual: FinancialMetrics,
  proyeccion: MetricasProyectadas
): FinancialMetrics {
  // Supuesto simplificador: el patrimonio neto se mantiene constante, y todo
  // el cambio de deuda (deltaDeuda) se refleja por partida doble como mayor
  // pasivo (pasivosTotales) y, del lado del activo, como mayor caja/activo
  // corriente disponible (activosCorrientes y activosTotales) — es decir,
  // se asume que la deuda nueva (o cancelada) queda líquida, no invertida en
  // activos fijos ni usada para otra cosa. Es una simplificación deliberada
  // para poder mantener el balance consistente con un solo supuesto de
  // "variación de deuda", no una contabilidad real.
  const deudaBase = actual.deudaTotal;
  const deltaDeuda =
    deudaBase !== null && proyeccion.deudaTotal !== null ? proyeccion.deudaTotal - deudaBase : 0;

  const pasivosTotales = actual.pasivosTotales !== null ? actual.pasivosTotales + deltaDeuda : null;
  const activosTotales = actual.activosTotales !== null ? actual.activosTotales + deltaDeuda : null;
  const activosCorrientes =
    actual.activosCorrientes !== null ? actual.activosCorrientes + deltaDeuda : null;

  const gananciasRetenidas =
    actual.gananciasRetenidas !== null && proyeccion.netIncome !== null
      ? actual.gananciasRetenidas + proyeccion.netIncome
      : actual.gananciasRetenidas;

  return {
    ...actual,
    revenue: proyeccion.revenue,
    netIncome: proyeccion.netIncome,
    margenNeto: proyeccion.margenNeto,
    debtToEquity: proyeccion.debtToEquity,
    deudaTotal: proyeccion.deudaTotal,
    pasivosTotales,
    activosTotales,
    activosCorrientes,
    gananciasRetenidas,
    roe:
      proyeccion.netIncome !== null && actual.patrimonioNeto !== null && actual.patrimonioNeto !== 0
        ? proyeccion.netIncome / actual.patrimonioNeto
        : null,
    roa:
      proyeccion.netIncome !== null && activosTotales !== null && activosTotales !== 0
        ? proyeccion.netIncome / activosTotales
        : null,
  };
}

function simularEscenario(
  nombre: NombreEscenario,
  etiqueta: string,
  actual: FinancialMetrics,
  supuestos: SupuestosSimulacion,
  marketCap: number | null
): EscenarioSimulado {
  const proyeccion = proyectarMetricas(actual, supuestos);
  const metricasProyectadas = construirMetricasProyectadas(actual, proyeccion);
  const altman = calcularAltman(metricasProyectadas, marketCap);
  const score = calcularCentinelaScore(metricasProyectadas, marketCap);

  return {
    nombre,
    etiqueta,
    supuestos,
    metricas: proyeccion,
    altman,
    score,
  };
}

/**
 * Corre los tres escenarios (base, optimista, adverso) a partir de los
 * supuestos base ingresados por el usuario y las métricas actuales de la
 * empresa. Es la única función que debería llamar la UI del Simulador.
 */
export function simularEscenarios(
  actual: FinancialMetrics,
  supuestosBase: SupuestosSimulacion,
  marketCap: number | null
): ResultadoSimulacion {
  const supuestosOptimistas = ajustarSupuestos(supuestosBase, MULTIPLICADORES_ESCENARIO.optimista);
  const supuestosAdversos = ajustarSupuestos(supuestosBase, MULTIPLICADORES_ESCENARIO.adverso);

  return {
    base: simularEscenario("base", "Base", actual, supuestosBase, marketCap),
    optimista: simularEscenario("optimista", "Optimista", actual, supuestosOptimistas, marketCap),
    adverso: simularEscenario("adverso", "Adverso", actual, supuestosAdversos, marketCap),
  };
}
