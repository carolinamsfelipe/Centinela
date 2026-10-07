/**
 * Centinela v2 · modelo de presentación.
 * No recalcula fórmulas propias: reutiliza src/lib/financial y src/services. Solo
 * ensambla lo que las pantallas necesitan. Nunca inventa cifras: lo que no se puede
 * derivar queda como `null` y la UI lo muestra con el estado "Sin dato".
 */
import { analizarEmpresa } from "@/lib/financial/analysis";
import { inferirMetricasCaja } from "@/lib/financial/benchmarks";
import type { MetricasCajaInferidas } from "@/lib/financial/benchmarks";
import {
  diagnosticarCcc,
  diagnosticarIcr,
} from "@/lib/financial/diagnostics";
import { metricsDesdePeriodo } from "@/lib/financial/metrics";
import { calcularImpactoDevaluacionDeuda } from "@/lib/financial/ratios";
import { CRITERIOS, construirSemaforo } from "@/lib/financial/semaforo";
import type { ItemSemaforo } from "@/lib/financial/semaforo";
import { fmtNum, fmtX } from "@/lib/format";
import type { PeriodoBalance } from "@/services/userCompanies";
import type { Company, Estado, FinancialMetrics } from "@/types";

export type ModuloId = "panel" | "ccc" | "deuda" | "sim" | "bench";

export const MODULOS: Array<{ id: ModuloId; label: string; ruta: string; titulo: string }> = [
  { id: "panel", label: "Panel general", ruta: "/v2", titulo: "Panel general y alerta temprana" },
  { id: "ccc", label: "Capital de trabajo", ruta: "/v2/capital-trabajo", titulo: "Capital de trabajo · ciclo de caja" },
  { id: "deuda", label: "Deuda y solvencia", ruta: "/v2/deuda", titulo: "Deuda y solvencia · cobertura de intereses" },
  { id: "sim", label: "Simulador FX y caja", ruta: "/v2/simulador", titulo: "Simulador de sensibilidad cambiaria y caja" },
  { id: "bench", label: "Benchmark", ruta: "/v2/benchmark", titulo: "Benchmark frente a pares" },
];

/** Efectivo conocido del caso demo (el mismo que el repo usa en su EV/EBITDA: 51 M). */
const EFECTIVO_DEMO_PEDRO = 51_000_000;

/** Supuestos documentados cuando falta el dato (se aclaran en pantalla). */
export const TASA_USD_SUPUESTA = 0.09;
export const DIAS_CAJA_MINIMA = 15;

export interface KpiV2 {
  id: "ccc" | "icr" | "fx" | "runway";
  label: string;
  valor: string;
  unidad: string;
  estado: Estado;
  serie: number[];
  delta: { texto: string; empeora: boolean } | null;
  referencia: string;
  criterio: string;
  modulo: ModuloId;
  estimado: boolean;
}

export interface AlertaV2 {
  id: string;
  estado: "alerta" | "atencion";
  titulo: string;
  detalle: string;
  modulo: ModuloId;
  moduloLabel: string;
}

export interface BaseCaja {
  cajaInicial: number;
  ventas: number;
  costoVentas: number;
  ebitda: number;
  otrosEgresos: number;
  deudaArs: number;
  deudaUsd: number;
  tasaUsd: number;
  tasaArsBase: number; // % anual
  dso: number;
  dio: number;
  dpo: number;
  cajaMinima: number;
  /** true si falta el saldo de caja informado y se parte de 0 (se muestra flujo acumulado). */
  sinSaldoInicial: boolean;
  interesesEstimados: boolean;
}

export interface ModeloV2 {
  company: Company;
  periodos: PeriodoBalance[] | null;
  periodoActual: string;
  m: FinancialMetrics;
  caja: MetricasCajaInferidas;
  efectivo: number | null;
  score: number | null;
  altmanZ: number | null;
  estadoGeneral: Estado;
  semaforo: ItemSemaforo[];
  kpis: KpiV2[];
  alertas: AlertaV2[];
  conteo: { alerta: number; atencion: number; normal: number };
  resumen: string;
  base: BaseCaja | null;
  usdPct: number | null;
  /** Costo operativo anual (ventas − EBITDA), base del runway. */
  egresosAnuales: number | null;
  runwayDias: number | null;
}

export const ETIQUETA_PERIODO = (p: string): string => {
  const y = /^(\d{4})/.exec(p);
  return y ? `FY${y[1].slice(2)}` : p;
};

export function efectivoDe(company: Company, periodo: PeriodoBalance | null): number | null {
  if (periodo && typeof periodo.efectivo === "number" && Number.isFinite(periodo.efectivo)) return periodo.efectivo;
  if (company.ticker === "DEMO-PEDRO") return EFECTIVO_DEMO_PEDRO;
  return null;
}

export function metricasDePeriodo(p: PeriodoBalance): FinancialMetrics {
  return metricsDesdePeriodo({ ...p, marketCap: p.valorMercado != null ? p.valorMercado : p.patrimonioNeto });
}

export function calcularRunway(m: FinancialMetrics, efectivo: number | null): { dias: number | null; egresos: number | null } {
  if (m.revenue === null || m.ebitda === null) return { dias: null, egresos: null };
  const egresos = m.revenue - m.ebitda;
  if (efectivo === null || egresos <= 0) return { dias: null, egresos: egresos > 0 ? egresos : null };
  return { dias: efectivo / (egresos / 365), egresos };
}

export function estadoFx(usdPct: number | null): Estado {
  if (usdPct === null) return "sin_datos";
  if (usdPct >= 0.5) return "alerta";
  if (usdPct >= 0.25) return "atencion";
  return "normal";
}

export function estadoRunway(dias: number | null): Estado {
  if (dias === null) return "sin_datos";
  if (dias < 60) return "alerta";
  if (dias < 120) return "atencion";
  return "normal";
}

const CRITERIO_FX = "verde < 25% de deuda en USD · amarillo 25–50% · rojo ≥ 50%";
const CRITERIO_RUNWAY = "verde ≥ 120 días de egresos · amarillo 60–120 d · rojo < 60 d";
const CRITERIO_CCC = "verde ≤ 60 d · amarillo 60–90 d · rojo > 90 d";
const CRITERIO_ICR = "verde > 2,0x · amarillo 1,0–2,0x · rojo < 1,0x";

const MODULO_DE_SEMAFORO: Record<ItemSemaforo["id"], ModuloId> = {
  liquidez: "ccc",
  capitalTrabajo: "ccc",
  endeudamiento: "deuda",
  deudaPatrimonio: "deuda",
  roe: "bench",
  roa: "bench",
  margenNeto: "bench",
};

const LABEL_MODULO = (id: ModuloId) => MODULOS.find((x) => x.id === id)?.label ?? "Módulo";

function deltaDe(
  actual: number | null,
  previo: number | null,
  suba: "empeora" | "mejora",
  fmt: (v: number) => string
): KpiV2["delta"] {
  if (actual === null || previo === null) return null;
  const d = actual - previo;
  const empeora = suba === "empeora" ? d > 0 : d < 0;
  return { texto: `${d > 0 ? "+" : ""}${fmt(d)}`, empeora };
}

export function construirBaseCaja(
  m: FinancialMetrics,
  efectivo: number | null,
  caja: MetricasCajaInferidas,
  mercado: Company["mercado"]
): BaseCaja | null {
  if (m.revenue === null || m.ebitda === null) return null;
  const deuda = m.deudaTotal ?? 0;
  const usdPct = m.deudaUsdPct ?? 0;
  const deudaUsd = deuda * usdPct;
  const deudaArs = deuda - deudaUsd;
  const tasaMercado = mercado === "Argentina" ? 0.35 : mercado === "Brasil" ? 0.12 : 0.055;
  const interesesEstimados = !(m.gastosIntereses != null && m.gastosIntereses > 0);
  const intereses = interesesEstimados ? deuda * tasaMercado : (m.gastosIntereses as number);
  const interesesArs = Math.max(0, intereses - deudaUsd * TASA_USD_SUPUESTA);
  const tasaArsBase = deudaArs > 0 ? Math.round((interesesArs / deudaArs) * 100) : Math.round(tasaMercado * 100);
  const egresos = Math.max(0, m.revenue - m.ebitda);
  // Capex/impuestos/otros: lo que cierra EBITDA − intereses − otros = FCF (si hay FCF informado).
  const otrosEgresos = m.freeCashFlow !== null ? Math.max(0, m.ebitda - intereses - m.freeCashFlow) : 0;
  const costoVentas = m.costoVentas ?? Math.max(0, m.revenue - m.ebitda);
  return {
    cajaInicial: efectivo ?? 0,
    ventas: m.revenue,
    costoVentas,
    ebitda: m.ebitda,
    otrosEgresos,
    deudaArs,
    deudaUsd,
    tasaUsd: TASA_USD_SUPUESTA,
    tasaArsBase,
    dso: Math.round(caja.dso),
    dio: caja.dio,
    dpo: Math.round(caja.dpo),
    cajaMinima: (egresos / 365) * DIAS_CAJA_MINIMA,
    sinSaldoInicial: efectivo === null,
    interesesEstimados,
  };
}

export function construirModelo(company: Company, periodos: PeriodoBalance[] | null, periodoSel: string | null): ModeloV2 {
  const propio = periodos && periodos.length > 0 ? periodos : null;
  const ultimo = propio ? propio[propio.length - 1] : null;
  const elegido = propio ? (propio.find((p) => p.periodo === periodoSel) ?? ultimo) : null;
  const m = elegido ? metricasDePeriodo(elegido) : company.metrics;
  const efectivo = efectivoDe(company, elegido);
  const caja = inferirMetricasCaja(m, company.sector, company.mercado);

  const analisis = analizarEmpresa(company);
  const corporativo = analisis.aplicaModeloCorporativo;
  const semaforo = construirSemaforo(m).filter((s) => corporativo || !s.soloCorporativo);

  const usdPct = m.deudaUsdPct ?? null;
  const { dias: runwayDias, egresos } = calcularRunway(m, efectivo);

  // Serie anual (solo si hay balances por ejercicio: empresas propias)
  const serieMetricas = propio ? propio.map(metricasDePeriodo) : [];
  const serieCaja = propio ? serieMetricas.map((mm) => inferirMetricasCaja(mm, company.sector, company.mercado)) : [];
  const serieRunway = propio ? serieMetricas.map((mm, i) => calcularRunway(mm, efectivoDe(company, propio[i])).dias) : [];
  const idx = propio ? propio.findIndex((p) => p.periodo === elegido?.periodo) : -1;
  const previo = <T,>(arr: T[]): T | null => (idx > 0 ? arr[idx - 1] : null);
  const soloNum = (a: Array<number | null>) => a.filter((v): v is number => v !== null);

  const dCcc = diagnosticarCcc(caja.ccc);
  const dIcr = diagnosticarIcr(caja.icr);
  const kpis: KpiV2[] = [
    {
      id: "ccc",
      label: "Ciclo de caja (CCC)",
      valor: fmtNum(caja.ccc, 0),
      unidad: "días",
      estado: dCcc.estado,
      serie: serieCaja.length >= 3 ? serieCaja.map((c) => c.ccc) : [],
      delta: deltaDe(caja.ccc, previo(serieCaja)?.ccc ?? null, "empeora", (v) => `${fmtNum(v, 0)} d`),
      referencia: `med. sector ${fmtNum(medianaSector(company), 0)} d`,
      criterio: CRITERIO_CCC,
      modulo: "ccc",
      estimado: caja.esCccEstimado,
    },
    {
      id: "icr",
      label: "Cobertura de intereses (ICR)",
      valor: fmtNum(caja.icr, 1),
      unidad: "x",
      estado: dIcr.estado,
      serie: serieCaja.length >= 3 ? serieCaja.map((c) => c.icr) : [],
      delta: deltaDe(caja.icr, previo(serieCaja)?.icr ?? null, "mejora", (v) => `${fmtNum(v, 1)}x`),
      referencia: "quiebre 1,0x",
      criterio: CRITERIO_ICR,
      modulo: "deuda",
      estimado: caja.esIcrEstimado,
    },
    {
      id: "fx",
      label: "Exposición cambiaria",
      valor: usdPct === null ? "Sin dato" : fmtNum(usdPct * 100, 0),
      unidad: usdPct === null ? "" : "% deuda USD",
      estado: estadoFx(usdPct),
      serie: serieMetricas.length >= 3 ? soloNum(serieMetricas.map((mm) => (mm.deudaUsdPct != null ? mm.deudaUsdPct * 100 : null))) : [],
      delta: deltaDe(
        usdPct === null ? null : usdPct * 100,
        previo(serieMetricas)?.deudaUsdPct != null ? (previo(serieMetricas)!.deudaUsdPct as number) * 100 : null,
        "empeora",
        (v) => `${fmtNum(v, 0)} pp`
      ),
      referencia: m.deudaTotal !== null && usdPct !== null ? `+10% FX: ${fmtNum(calcularImpactoDevaluacionDeuda(m.deudaTotal, usdPct, 0.1) / 1e6, 1)} M` : "cargá % deuda USD",
      criterio: CRITERIO_FX,
      modulo: "sim",
      estimado: false,
    },
    {
      id: "runway",
      label: "Runway de caja",
      valor: runwayDias === null ? "Sin dato" : fmtNum(runwayDias, 0),
      unidad: runwayDias === null ? "" : "días de egresos",
      estado: estadoRunway(runwayDias),
      serie: serieRunway.length >= 3 ? soloNum(serieRunway) : [],
      delta: deltaDe(runwayDias, previo(serieRunway) ?? null, "mejora", (v) => `${fmtNum(v, 0)} d`),
      referencia: efectivo !== null ? `caja ${fmtNum(efectivo / 1e6, 1)} M` : "cargá efectivo",
      criterio: CRITERIO_RUNWAY,
      modulo: "sim",
      estimado: false,
    },
  ];

  const alertas: AlertaV2[] = [];
  semaforo.forEach((s) => {
    if (s.estado === "alerta" || s.estado === "atencion") {
      const mod = MODULO_DE_SEMAFORO[s.id];
      alertas.push({ id: `s-${s.id}`, estado: s.estado, titulo: `${s.nombre}: ${s.valorTexto}`, detalle: s.mensaje, modulo: mod, moduloLabel: LABEL_MODULO(mod) });
    }
  });
  kpis.forEach((k) => {
    if (k.estado === "alerta" || k.estado === "atencion") {
      const detalle =
        k.id === "ccc" ? dCcc.mensaje : k.id === "icr" ? dIcr.mensaje : k.id === "fx" ? `${k.valor}${k.unidad ? " " + k.unidad : ""}. ${k.criterio}.` : `${k.valor} ${k.unidad}. ${k.criterio}.`;
      alertas.push({ id: `k-${k.id}`, estado: k.estado, titulo: `${k.label}: ${k.valor}${k.unidad && k.unidad !== "x" ? " " + k.unidad : k.unidad}`, detalle, modulo: k.modulo, moduloLabel: LABEL_MODULO(k.modulo) });
    }
  });

  const todos: Estado[] = [...semaforo.map((s) => s.estado), ...kpis.map((k) => k.estado)];
  const conteo = {
    alerta: todos.filter((e) => e === "alerta").length,
    atencion: todos.filter((e) => e === "atencion").length,
    normal: todos.filter((e) => e === "normal").length,
  };
  const score = analisis.score.total;
  const estadoGeneral: Estado = score !== null ? analisis.score.estado : analisis.altman.estado;
  const criticas = alertas.filter((a) => a.estado === "alerta");
  const resumen =
    criticas.length > 0
      ? `${criticas.length} señal${criticas.length > 1 ? "es críticas" : " crítica"}: ${criticas.slice(0, 2).map((a) => a.titulo).join(" · ")}. Revisá los módulos causales antes de que la caja se tense.`
      : alertas.length > 0
        ? `Sin señales críticas; ${alertas.length} indicador${alertas.length > 1 ? "es" : ""} en precaución para seguir de cerca.`
        : "Sin señales de estrés de caja con los datos cargados.";

  return {
    company,
    periodos: propio,
    periodoActual: elegido?.periodo ?? m.periodo,
    m,
    caja,
    efectivo,
    score,
    altmanZ: analisis.altman.zScore,
    estadoGeneral,
    semaforo,
    kpis,
    alertas,
    conteo,
    resumen,
    base: construirBaseCaja(m, efectivo, caja, company.mercado),
    usdPct,
    egresosAnuales: egresos,
    runwayDias,
  };
}

import { MEDIANAS_SECTORIALES_DEFAULT } from "@/lib/financial/benchmarks";

export function medianaSector(company: Company): number {
  return MEDIANAS_SECTORIALES_DEFAULT[company.sector]?.ccc ?? 55;
}

export { CRITERIOS, fmtX };
