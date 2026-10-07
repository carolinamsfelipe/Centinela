import type { AltmanResult, CentinelaScore, FinancialMetrics } from "@/types";
import { calcularAltman } from "./altman";
import {
  calcularCcc,
  calcularImpactoCajaDpo,
  calcularImpactoCajaDso,
  calcularImpactoDevaluacionDeuda,
} from "./ratios";
import { calcularCentinelaScore } from "./scores";

/**
 * Simulador de escenarios hipotéticos y palancas de decisión — Centinela PyME.
 *
 * IMPORTANTE: esto NO es un modelo financiero contable ni una predicción. Es una
 * proyección de sensibilidad operativa y financiera de un solo período, construida a
 * partir de los supuestos ingresados por el usuario (crecimiento, margen, deuda, tasa,
 * días de cobro DSO, días de pago DPO y estrés cambiario de deuda en USD).
 *
 * Su función principal en el diagnóstico temprano es responder:
 * "¿Dónde puede romperse la caja y qué decisión concreta puede evitarlo?"
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
  /** Días de cobro a clientes (DSO) objetivo, ej. 60 días. */
  dsoObjetivo?: number | null;
  /** Días de pago a proveedores (DPO) objetivo, ej. 50 días. */
  dpoObjetivo?: number | null;
  /** Proporción de la deuda total denominada en moneda extranjera (USD), ej. 0.3 = 30%. */
  deudaUsdPct?: number;
  /** Salto cambiario / devaluación proyectada de la moneda local respecto al USD, ej. 0.2 = +20%. */
  devaluacionUsdPct?: number;
}

export interface MetricasProyectadas {
  revenue: number | null;
  netIncome: number | null;
  margenNeto: number | null;
  debtToEquity: number | null;
  deudaTotal: number | null;
  gastoFinanciero: number | null;
  // Métricas de capital de trabajo y caja
  dso: number | null;
  dio: number | null;
  dpo: number | null;
  ccc: number | null;
  icr: number | null;
  impactoCajaDso: number | null;
  impactoCajaDpo: number | null;
  impactoCajaTotal: number | null;
  impactoDevaluacionDeuda: number | null;
  patrimonioNetoAjustado: number | null;
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

export const MULTIPLICADORES_ESCENARIO = {
  optimista: {
    crecimiento: 1.3, // +30% sobre el crecimiento asumido
    margen: 1.2, // +20% sobre el margen asumido
    deuda: 0.7, // variación de deuda se atenúa 30%
    tasa: 0.85, // tasa de interés 15% más baja
    dsoDelta: -10, // cobra 10 días antes
    dpoDelta: +5, // negocia 5 días más con proveedores
    devaluacionMult: 0.5,
  },
  adverso: {
    crecimiento: 0.6, // el crecimiento cae al 60%
    margen: 0.7, // margen cae al 70%
    deuda: 1.4, // deuda crece 40% más
    tasa: 1.3, // tasa 30% más alta
    dsoDelta: +15, // clientes demoran 15 días más en pagar
    dpoDelta: -5, // proveedores exigen cobrar antes
    devaluacionMult: 1.5,
  },
} as const;

function ajustarSupuestos(
  base: SupuestosSimulacion,
  mult: {
    crecimiento: number;
    margen: number;
    deuda: number;
    tasa: number;
    dsoDelta?: number;
    dpoDelta?: number;
    devaluacionMult?: number;
  }
): SupuestosSimulacion {
  const dsoObjetivo =
    base.dsoObjetivo !== undefined && base.dsoObjetivo !== null
      ? Math.max(15, base.dsoObjetivo + (mult.dsoDelta ?? 0))
      : undefined;

  const dpoObjetivo =
    base.dpoObjetivo !== undefined && base.dpoObjetivo !== null
      ? Math.max(10, base.dpoObjetivo + (mult.dpoDelta ?? 0))
      : undefined;

  const devaluacionUsdPct =
    base.devaluacionUsdPct !== undefined
      ? Math.min(1.0, base.devaluacionUsdPct * (mult.devaluacionMult ?? 1))
      : undefined;

  return {
    crecimientoRevenue: base.crecimientoRevenue * mult.crecimiento,
    margenNeto: base.margenNeto * mult.margen,
    variacionDeuda: base.variacionDeuda * mult.deuda,
    tasaInteres: Math.max(0, base.tasaInteres * mult.tasa),
    dsoObjetivo,
    dpoObjetivo,
    deudaUsdPct: base.deudaUsdPct,
    devaluacionUsdPct,
  };
}

/**
 * Proyecta las métricas financieras de un período hacia adelante, integrando
 * ingresos, resultado, deuda con estrés cambiario (ARS/USD), capital de trabajo
 * (DSO/DPO) y liquidez liberada en tesorería.
 */
export function proyectarMetricas(
  actual: FinancialMetrics,
  supuestos: SupuestosSimulacion
): MetricasProyectadas {
  const revenueBase = actual.revenue;
  const revenue = revenueBase !== null ? revenueBase * (1 + supuestos.crecimientoRevenue) : null;
  const netIncome = revenue !== null ? revenue * supuestos.margenNeto : null;

  // 1. Deuda base y estrés cambiario de deuda denominada en USD
  const deudaBase = actual.deudaTotal;
  const deudaProyectadaSinFx = deudaBase !== null ? deudaBase * (1 + supuestos.variacionDeuda) : null;

  const deudaUsdPct = supuestos.deudaUsdPct ?? actual.deudaUsdPct ?? 0;
  const devaluacionUsdPct = supuestos.devaluacionUsdPct ?? 0;

  const impactoDevaluacionDeuda =
    deudaProyectadaSinFx !== null && deudaUsdPct > 0 && devaluacionUsdPct > 0
      ? calcularImpactoDevaluacionDeuda(deudaProyectadaSinFx, deudaUsdPct, devaluacionUsdPct)
      : 0;

  const deudaTotal = deudaProyectadaSinFx !== null ? deudaProyectadaSinFx + impactoDevaluacionDeuda : null;
  const gastoFinanciero = deudaTotal !== null ? deudaTotal * supuestos.tasaInteres : null;

  // 2. Impacto de la devaluación sobre el patrimonio neto (absorbe la pérdida cambiaria de pasivos)
  const patrimonioBase = actual.patrimonioNeto;
  const patrimonioNetoAjustado =
    patrimonioBase !== null ? patrimonioBase - impactoDevaluacionDeuda : null;

  const debtToEquity =
    deudaTotal !== null && patrimonioNetoAjustado !== null && patrimonioNetoAjustado > 0
      ? deudaTotal / patrimonioNetoAjustado
      : (patrimonioNetoAjustado !== null && patrimonioNetoAjustado <= 0 ? -1 : null);

  // 3. Capital de trabajo, ciclo de conversión de efectivo y caja liberada
  const dsoActual =
    actual.dso ??
    (actual.cuentasPorCobrar && actual.revenue && actual.revenue > 0
      ? (actual.cuentasPorCobrar / actual.revenue) * 365
      : null);
  const dsoProyectado =
    supuestos.dsoObjetivo !== undefined && supuestos.dsoObjetivo !== null
      ? supuestos.dsoObjetivo
      : dsoActual;

  // Costo de ventas ≠ ventas − resultado neto: el neto descuenta además gastos
  // operativos, intereses e impuestos. Se proyecta con el margen bruto observado;
  // sin costo informado se usa ventas − EBITDA como cota superior, y si tampoco
  // hay EBITDA queda null (no se inventa).
  const ratioCosto =
    actual.costoVentas != null && actual.revenue
      ? actual.costoVentas / actual.revenue
      : actual.ebitda != null && actual.revenue
      ? 1 - actual.ebitda / actual.revenue
      : null;
  const costoVentasActual = ratioCosto !== null && actual.revenue ? actual.revenue * ratioCosto : null;
  const costoVentasProyectado =
    ratioCosto !== null && revenue !== null ? revenue * ratioCosto : costoVentasActual;

  const dpoActual =
    actual.dpo ??
    (actual.cuentasPorPagar && costoVentasActual && costoVentasActual > 0
      ? (actual.cuentasPorPagar / costoVentasActual) * 365
      : null);
  const dpoProyectado =
    supuestos.dpoObjetivo !== undefined && supuestos.dpoObjetivo !== null
      ? supuestos.dpoObjetivo
      : dpoActual;

  const dioActual =
    actual.dio ??
    (actual.inventarios && costoVentasActual && costoVentasActual > 0
      ? (actual.inventarios / costoVentasActual) * 365
      : null);
  const dioProyectado = dioActual;

  const cccProyectado = calcularCcc(dsoProyectado, dioProyectado, dpoProyectado);

  // 4. Dinero efectivamente liberado (+) o atrapado (-) en la caja operativa
  const impactoCajaDso =
    dsoActual !== null && dsoProyectado !== null && revenue !== null && revenue > 0
      ? calcularImpactoCajaDso(dsoActual, dsoProyectado, revenue)
      : null;

  const impactoCajaDpo =
    dpoActual !== null && dpoProyectado !== null && costoVentasProyectado !== null && costoVentasProyectado > 0
      ? calcularImpactoCajaDpo(dpoActual, dpoProyectado, costoVentasProyectado)
      : null;

  const impactoCajaTotal =
    impactoCajaDso !== null || impactoCajaDpo !== null
      ? (impactoCajaDso ?? 0) + (impactoCajaDpo ?? 0)
      : null;

  // 5. Cobertura de intereses (ICR) proyectada
  const ebitdaProyectado =
    actual.ebitda !== null && actual.revenue !== null && actual.revenue > 0 && revenue !== null
      ? (actual.ebitda / actual.revenue) * revenue
      : null; // sin EBITDA no hay ICR proyectado: se muestra N/D

  const icr =
    ebitdaProyectado !== null && gastoFinanciero !== null && gastoFinanciero > 0
      ? ebitdaProyectado / gastoFinanciero
      : null;

  return {
    revenue,
    netIncome,
    margenNeto: revenue !== null ? supuestos.margenNeto : null,
    debtToEquity,
    deudaTotal,
    gastoFinanciero,
    dso: dsoProyectado,
    dio: dioProyectado,
    dpo: dpoProyectado,
    ccc: cccProyectado,
    icr,
    impactoCajaDso,
    impactoCajaDpo,
    impactoCajaTotal,
    impactoDevaluacionDeuda,
    patrimonioNetoAjustado,
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
    patrimonioNeto: proyeccion.patrimonioNetoAjustado ?? actual.patrimonioNeto,
    dso: proyeccion.dso,
    dio: proyeccion.dio,
    dpo: proyeccion.dpo,
    ccc: proyeccion.ccc,
    icr: proyeccion.icr,
    roe:
      proyeccion.netIncome !== null && (proyeccion.patrimonioNetoAjustado ?? actual.patrimonioNeto) !== null && (proyeccion.patrimonioNetoAjustado ?? actual.patrimonioNeto) !== 0
        ? proyeccion.netIncome / (proyeccion.patrimonioNetoAjustado ?? actual.patrimonioNeto)!
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
