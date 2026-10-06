import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EMPRESA_DEMO_PEDRO, nombreSector } from "@/data/companies";
import { ALTMAN_THRESHOLDS, calcularAltman } from "@/lib/financial/altman";
import { esEntidadFinanciera } from "@/lib/financial/analysis";
import { inferirMetricasCaja } from "@/lib/financial/benchmarks";
import {
  diagnosticarCcc,
  diagnosticarDpo,
  diagnosticarDso,
  diagnosticarIcr,
} from "@/lib/financial/diagnostics";
import {
  calcularImpactoCajaDpo,
  calcularImpactoCajaDso,
  calcularImpactoDevaluacionDeuda,
} from "@/lib/financial/ratios";
import { calcularCentinelaScore } from "@/lib/financial/scores";
import type { EscenarioSimulado, SupuestosSimulacion } from "@/lib/financial/simulation";
import { simularEscenarios } from "@/lib/financial/simulation";
import { fmtMonto, fmtNum, fmtPct, fmtScore, fmtX } from "@/lib/format";
import { getCompanies } from "@/services/companyService";
import type { Company, FinancialMetrics } from "@/types";

function getTasaInteresMercado(mercado?: string): number {
  if (!mercado) return 5.0;
  const m = mercado.toLowerCase().trim();
  if (m.includes("argentina")) return 35.0;
  if (m.includes("estados unidos") || m.includes("eeuu") || m.includes("usa")) return 4.5;
  if (m.includes("europa")) return 3.5;
  if (m.includes("brasil")) return 11.5;
  if (m.includes("méxico") || m.includes("mexico")) return 10.0;
  return 5.0;
}

function getMargenHistorico(metrics?: FinancialMetrics): number {
  if (!metrics) return 10.0;
  if (metrics.margenNeto !== null && !isNaN(metrics.margenNeto)) {
    return Math.round(metrics.margenNeto * 1000) / 10;
  }
  if (metrics.revenue && metrics.netIncome !== null && metrics.revenue > 0) {
    return Math.round((metrics.netIncome / metrics.revenue) * 1000) / 10;
  }
  return 10.0;
}

function CampoNumero({
  label,
  value,
  onChange,
  ayuda,
  step = 0.5,
  sufijo = "%",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  ayuda?: string;
  step?: number;
  sufijo?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">{label}</span>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="number"
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-ink focus-ring"
        />
        <span className="text-sm text-ink-muted">{sufijo}</span>
      </div>
      {ayuda && <p className="mt-1 text-[11px] text-ink-muted">{ayuda}</p>}
    </label>
  );
}

const ESCENARIO_BADGE_CLASSES: Record<EscenarioSimulado["nombre"], string> = {
  base: "bg-neutral-soft text-neutral",
  optimista: "bg-ok-soft text-ok",
  adverso: "bg-bad-soft text-bad",
};

function ScenarioCard({
  escenario,
  supuestosBase,
  company,
}: {
  escenario: EscenarioSimulado;
  supuestosBase: SupuestosSimulacion;
  company: Company;
}) {
  const { metricas, altman, score } = escenario;
  const difiereDelBase = escenario.nombre !== "base";

  return (
    <Card className="flex flex-col justify-between border-border/80">
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-ink">{escenario.etiqueta}</h3>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${ESCENARIO_BADGE_CLASSES[escenario.nombre]}`}
            >
              Hipotético
            </span>
          </div>
          <Badge estado={score.estado} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-ink-muted">Revenue proyectado</div>
            <div className="mt-1 font-mono font-semibold text-ink">{fmtMonto(metricas.revenue, company)}</div>
          </div>
          <div>
            <div className="text-xs text-ink-muted">Resultado neto</div>
            <div className="mt-1 font-mono font-semibold text-ink">{fmtMonto(metricas.netIncome, company)}</div>
          </div>
          <div>
            <div className="text-xs text-ink-muted">Margen neto</div>
            <div className="mt-1 font-mono font-semibold text-ink">{fmtPct(metricas.margenNeto)}</div>
          </div>
          <div>
            <div className="text-xs text-ink-muted">Deuda/Patrimonio</div>
            <div className="mt-1 font-mono font-semibold text-ink">{fmtX(metricas.debtToEquity)}</div>
          </div>
        </div>

        {/* Métricas de capital de trabajo proyectadas */}
        {(metricas.dso !== null || metricas.ccc !== null || metricas.icr !== null) && (
          <div className="mt-4 rounded-lg bg-bg/60 p-2.5 border border-border/60">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              Caja & Liquidez Operativa
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="text-[10px] text-ink-muted block">DSO (Cobro)</span>
                <span className="font-mono text-xs font-bold text-ink">
                  {metricas.dso !== null ? `${Math.round(metricas.dso)} d` : "N/D"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-ink-muted block">DPO (Pago)</span>
                <span className="font-mono text-xs font-bold text-ink">
                  {metricas.dpo !== null ? `${Math.round(metricas.dpo)} d` : "N/D"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-ink-muted block">ICR Cobertura</span>
                <span className="font-mono text-xs font-bold text-ink">
                  {metricas.icr !== null ? `${fmtNum(metricas.icr)}x` : "N/D"}
                </span>
              </div>
            </div>
            {metricas.impactoCajaTotal !== null && metricas.impactoCajaTotal !== 0 && (
              <div className="mt-2 pt-2 border-t border-border/40 text-center text-xs">
                <span className="text-ink-muted">Impacto de caja neto: </span>
                <span
                  className={`font-mono font-bold ${
                    metricas.impactoCajaTotal > 0 ? "text-ok" : "text-bad"
                  }`}
                >
                  {metricas.impactoCajaTotal > 0 ? "+" : ""}
                  {fmtMonto(metricas.impactoCajaTotal, company)}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Score Centinela</span>
            <div className="flex items-center gap-2">
              {score.grado && (
                <span className="rounded border border-accent/40 bg-accent/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-accent">
                  Grado {score.grado}
                </span>
              )}
              <span className="font-mono text-lg font-bold text-ink">
                {score.total !== null ? `${fmtScore(score.total)} / 100` : "N/D"}
              </span>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Altman Z''</span>
            <span className="font-mono text-lg font-bold text-ink">{fmtNum(altman.zScore)}</span>
          </div>
          <p className="mt-1 text-[11px] text-ink-muted">
            Distress &lt; {ALTMAN_THRESHOLDS.distress} · Zona gris · Segura &gt; {ALTMAN_THRESHOLDS.safe}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-bg/60 p-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
          Supuestos aplicados
        </div>
        <dl className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
          <dt className="text-ink-muted">Crec. revenue</dt>
          <dd className="text-right font-mono text-ink">{fmtPct(escenario.supuestos.crecimientoRevenue)}</dd>
          <dt className="text-ink-muted">Margen neto</dt>
          <dd className="text-right font-mono text-ink">{fmtPct(escenario.supuestos.margenNeto)}</dd>
          <dt className="text-ink-muted">Var. deuda</dt>
          <dd className="text-right font-mono text-ink">{fmtPct(escenario.supuestos.variacionDeuda)}</dd>
          <dt className="text-ink-muted">Tasa interés</dt>
          <dd className="text-right font-mono text-ink">{fmtPct(escenario.supuestos.tasaInteres)}</dd>
          {escenario.supuestos.dsoObjetivo !== undefined && escenario.supuestos.dsoObjetivo !== null && (
            <>
              <dt className="text-ink-muted">DSO objetivo</dt>
              <dd className="text-right font-mono text-ink">{Math.round(escenario.supuestos.dsoObjetivo)} días</dd>
            </>
          )}
          {escenario.supuestos.devaluacionUsdPct !== undefined && escenario.supuestos.devaluacionUsdPct > 0 && (
            <>
              <dt className="text-ink-muted">Devaluación USD</dt>
              <dd className="text-right font-mono text-ink">+{fmtPct(escenario.supuestos.devaluacionUsdPct)}</dd>
            </>
          )}
        </dl>
        {difiereDelBase && (
          <p className="mt-2 text-[11px] text-ink-muted">
            Derivado del caso base con sensibilidad de mercado (crecimiento {fmtPct(supuestosBase.crecimientoRevenue)},
            margen {fmtPct(supuestosBase.margenNeto)}).
          </p>
        )}
      </div>
    </Card>
  );
}

export function Simulador() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [empresas, setEmpresas] = useState<Company[]>([]);
  const [ticker, setTicker] = useState<string>(() => searchParams.get("ticker") || "");

  // Palancas tradicionales
  const [crecimiento, setCrecimiento] = useState<number>(5);
  const [margen, setMargen] = useState<number>(10);
  const [variacionDeuda, setVariacionDeuda] = useState<number>(0);
  const [tasaInteres, setTasaInteres] = useState<number>(5);

  // Nuevas palancas operativas y cambiarias (Semana del Inversor)
  const [dsoObjetivo, setDsoObjetivo] = useState<number>(60);
  const [dpoObjetivo, setDpoObjetivo] = useState<number>(45);
  const [devaluacionUsd, setDevaluacionUsd] = useState<number>(0); // 0, 10, 20, 30, 50%

  useEffect(() => {
    getCompanies().then((todas) => {
      const cs = todas.filter((c) => !esEntidadFinanciera(c));
      setEmpresas(cs);
      const inicial = searchParams.get("ticker");
      if (inicial && cs.some((c) => c.ticker === inicial)) {
        setTicker(inicial);
      } else if (!ticker && cs.length > 0) {
        setTicker(cs[0].ticker);
      }
    });
  }, [searchParams]);

  const company = useMemo(() => empresas.find((c) => c.ticker === ticker), [empresas, ticker]);

  const actualScore = useMemo(() => {
    if (!company) return null;
    return calcularCentinelaScore(company.metrics, company.metrics.marketCap);
  }, [company]);

  const actualAltman = useMemo(() => {
    if (!company) return null;
    return calcularAltman(company.metrics, company.metrics.marketCap);
  }, [company]);

  // Recalibrar al cambiar de empresa
  useEffect(() => {
    if (!company) return;
    setCrecimiento(5);
    setVariacionDeuda(0);
    setMargen(getMargenHistorico(company.metrics));
    setTasaInteres(getTasaInteresMercado(company.mercado));

    // Si la empresa tiene DSO y DPO reales, calibrar los sliders a sus valores reales
    const dsoReal = company.metrics.dso ?? (company.metrics.cuentasPorCobrar && company.metrics.revenue ? (company.metrics.cuentasPorCobrar / company.metrics.revenue) * 365 : null);
    const dpoReal = company.metrics.dpo ?? 40;
    setDsoObjetivo(dsoReal !== null ? Math.round(dsoReal) : 60);
    setDpoObjetivo(dpoReal !== null ? Math.round(dpoReal) : 45);
    setDevaluacionUsd(0);
  }, [company?.ticker]);

  function seleccionarEmpresa(nuevoTicker: string) {
    setTicker(nuevoTicker);
    setSearchParams({ ticker: nuevoTicker });
  }

  function cargarDemoPedro() {
    seleccionarEmpresa(EMPRESA_DEMO_PEDRO.ticker);
    setDsoObjetivo(60); // Reducción de 74 a 60 días para la demo
    setDpoObjetivo(50); // Extensión de 35 a 50 días para la demo
    setDevaluacionUsd(20); // +20% salto cambiario para la demo
  }

  const restablecerValoresBase = () => {
    if (!company) return;
    setCrecimiento(5);
    setVariacionDeuda(0);
    setMargen(getMargenHistorico(company.metrics));
    setTasaInteres(getTasaInteresMercado(company.mercado));
    const dsoReal = company.metrics.dso ?? 60;
    const dpoReal = company.metrics.dpo ?? 35;
    setDsoObjetivo(Math.round(dsoReal));
    setDpoObjetivo(Math.round(dpoReal));
    setDevaluacionUsd(0);
  };

  const supuestosBase: SupuestosSimulacion = useMemo(
    () => ({
      crecimientoRevenue: crecimiento / 100,
      margenNeto: margen / 100,
      variacionDeuda: variacionDeuda / 100,
      tasaInteres: tasaInteres / 100,
      dsoObjetivo,
      dpoObjetivo,
      deudaUsdPct: company?.metrics.deudaUsdPct ?? 0,
      devaluacionUsdPct: devaluacionUsd / 100,
    }),
    [crecimiento, margen, variacionDeuda, tasaInteres, dsoObjetivo, dpoObjetivo, devaluacionUsd, company]
  );

  const resultado = useMemo(() => {
    if (!company) return null;
    return simularEscenarios(company.metrics, supuestosBase, company.metrics.marketCap);
  }, [company, supuestosBase]);

  // Diagnósticos de capital de trabajo y caja de la empresa actual
  const m = company?.metrics;
  const cajaInferida = useMemo(() => {
    return inferirMetricasCaja(m, company?.sector, company?.mercado);
  }, [m, company]);

  const dsoActual = cajaInferida.dso;
  const dioActual = cajaInferida.dio;
  const dpoActual = cajaInferida.dpo;
  const cccActual = cajaInferida.ccc;
  const icrActual = cajaInferida.icr;

  const diagCcc = diagnosticarCcc(cccActual);
  const diagIcr = diagnosticarIcr(icrActual);

  // Cálculos rápidos de impacto monetario para las tarjetas de decisión
  const rev = m?.revenue ?? 0;
  const cogs = m?.costoVentas ?? (rev * 0.65);
  const cajaLiberadaDso = dsoActual !== null && rev > 0 ? calcularImpactoCajaDso(dsoActual, dsoObjetivo, rev) : 0;
  const cajaLiberadaDpo = dpoActual !== null && cogs > 0 ? calcularImpactoCajaDpo(dpoActual, dpoObjetivo, cogs) : 0;
  const cajaTotalLiberada = cajaLiberadaDso + cajaLiberadaDpo;

  const deudaTotalActual = m?.deudaTotal ?? 0;
  const deudaUsdPct = m?.deudaUsdPct ?? 0;
  const saltoDeudaUsd = calcularImpactoDevaluacionDeuda(deudaTotalActual, deudaUsdPct, devaluacionUsd / 100);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8 space-y-6">
      {/* Encabezado y selector rápido */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-accent/20 px-2 py-0.5 font-mono text-xs font-bold uppercase tracking-wider text-accent">
              Copiloto de Decisión
            </span>
            <h1 className="text-2xl font-bold text-ink">Simulador de Estrés y Palancas de Caja</h1>
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            ¿Dónde se rompe la caja y qué decisión la salva? Simulá plazos de cobro, crédito con proveedores y salto cambiario.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={cargarDemoPedro}
            className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors focus-ring ${
              ticker === EMPRESA_DEMO_PEDRO.ticker
                ? "bg-accent text-white"
                : "border border-accent text-accent hover:bg-accent-soft"
            }`}
          >
            ⭐ Caso Demo: Metalúrgica Don Pedro (Semana del Inversor)
          </button>
        </div>
      </div>

      {/* Selector de empresa */}
      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-ink">Empresa activa:</span>
          <select
            value={ticker}
            onChange={(e) => seleccionarEmpresa(e.target.value)}
            className="rounded-lg border border-border bg-bg px-3 py-2 text-sm font-medium text-ink focus-ring"
          >
            {empresas.map((c) => (
              <option key={c.ticker} value={c.ticker}>
                {c.companyType === "demo"
                  ? `⭐ ${c.nombre}`
                  : c.companyType === "user"
                  ? `👤 ${c.nombre} (mi empresa)`
                  : `${c.nombre} (${c.ticker})`}
              </option>
            ))}
          </select>
        </div>

        {company && (
          <div className="flex items-center gap-3 text-xs text-ink-muted">
            <span>
              Sector: <strong className="text-ink">{company.sector}</strong>
            </span>
            <span>·</span>
            <span>
              Moneda: <strong className="text-ink">{company.monedaReporte}</strong>
            </span>
            <span>·</span>
            <Link to={`/empresas/${company.ticker}`} className="text-accent underline font-medium">
              Ver ficha completa
            </Link>
          </div>
        )}
      </Card>

      {/* BLOQUE 1: DIAGNÓSTICO INICIAL (EL PULSO DE CAJA) */}
      {company && (
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-accent">Paso 1 · Diagnóstico Base</span>
              <h2 className="text-lg font-bold text-ink">¿Dónde está la vulnerabilidad de caja?</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-muted">Score Centinela:</span>
              <span className="font-mono text-sm font-bold text-ink">
                {actualScore?.total !== null ? `${fmtScore(actualScore?.total ?? 0)}/100` : "N/D"}
              </span>
              <Badge estado={actualScore?.estado ?? "sin_datos"} />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
            {/* Tarjeta CCC */}
            <div
              className={`rounded-xl p-3.5 border ${
                diagCcc.estado === "alerta"
                  ? "border-bad/40 bg-bad-soft/40"
                  : diagCcc.estado === "atencion"
                  ? "border-warn/40 bg-warn-soft/40"
                  : "border-border bg-bg/50"
              }`}
            >
              <div className="flex items-center justify-between text-xs text-ink-muted">
                <span>Ciclo de Caja (CCC)</span>
                <span>{diagCcc.estado === "alerta" ? "🔴" : diagCcc.estado === "atencion" ? "🟡" : "🟢"}</span>
              </div>
              <div className="mt-1 font-mono text-2xl font-bold text-ink flex items-baseline gap-1.5">
                <span>{cajaInferida.esCccEstimado ? `~${cccActual} d` : `${cccActual} d`}</span>
                {cajaInferida.esCccEstimado && (
                  <span className="font-mono text-[10px] text-accent bg-accent/15 px-1.5 py-0.5 rounded">
                    Est. Sectorial
                  </span>
                )}
              </div>
              <p className="mt-1 text-[11px] text-ink-muted leading-tight">
                {cajaInferida.esCccEstimado
                  ? `Mediana del sector ${nombreSector(company?.sector ?? "industrial")}. Podés simular metas abajo.`
                  : diagCcc.mensaje}
              </p>
            </div>

            {/* Tarjeta Descalce Cobro vs Pago */}
            <div className="rounded-xl p-3.5 border border-border bg-bg/50">
              <div className="flex items-center justify-between text-xs text-ink-muted">
                <span>Cobro vs Pago (DSO / DPO)</span>
                {(cajaInferida.esDsoEstimado || cajaInferida.esDpoEstimado) && (
                  <span className="font-mono text-[10px] text-ink-muted bg-surface px-1.5 py-0.2 rounded border border-border">
                    Mediana
                  </span>
                )}
              </div>
              <div className="mt-1 font-mono text-lg font-bold text-ink">
                <span>{cajaInferida.esDsoEstimado ? `~${dsoActual}d` : `${dsoActual}d`}</span>{" "}
                <span className="text-ink-muted font-normal text-xs">cobro / </span>
                <span>{cajaInferida.esDpoEstimado ? `~${dpoActual}d` : `${dpoActual}d`}</span>{" "}
                <span className="text-ink-muted font-normal text-xs">pago</span>
              </div>
              <p className="mt-1 text-[11px] text-ink-muted leading-tight">
                {dsoActual > dpoActual
                  ? `Financia ${Math.round(dsoActual - dpoActual)} días con capital propio o deuda bancaria.`
                  : "Los proveedores financian el ciclo operativo."}
              </p>
            </div>

            {/* Tarjeta ICR Cobertura */}
            <div
              className={`rounded-xl p-3.5 border ${
                diagIcr.estado === "alerta"
                  ? "border-bad/40 bg-bad-soft/40"
                  : diagIcr.estado === "atencion"
                  ? "border-warn/40 bg-warn-soft/40"
                  : "border-border bg-bg/50"
              }`}
            >
              <div className="flex items-center justify-between text-xs text-ink-muted">
                <span>Cobertura Intereses (ICR)</span>
                <span>{diagIcr.estado === "alerta" ? "🔴" : diagIcr.estado === "atencion" ? "🟡" : "🟢"}</span>
              </div>
              <div className="mt-1 font-mono text-2xl font-bold text-ink flex items-baseline gap-1.5">
                <span>{cajaInferida.esIcrEstimado ? `~${fmtNum(icrActual)}x` : `${fmtNum(icrActual)}x`}</span>
                {cajaInferida.esIcrEstimado && (
                  <span className="font-mono text-[10px] text-accent bg-accent/15 px-1.5 py-0.5 rounded">
                    Proxy Deuda
                  </span>
                )}
              </div>
              <p className="mt-1 text-[11px] text-ink-muted leading-tight">
                {cajaInferida.esIcrEstimado
                  ? "Estimación sintética según deuda y tasa de mercado. Podés simular variaciones abajo."
                  : diagIcr.mensaje}
              </p>
            </div>

            {/* Tarjeta Exposición USD */}
            <div className="rounded-xl p-3.5 border border-border bg-bg/50">
              <span className="text-xs text-ink-muted block">Deuda ARS / USD</span>
              <div className="mt-1 font-mono text-lg font-bold text-ink">
                {deudaUsdPct > 0 ? `${Math.round(deudaUsdPct * 100)}% USD` : "100% Moneda Local"}
              </div>
              <p className="mt-1 text-[11px] text-ink-muted leading-tight">
                {deudaUsdPct > 0
                  ? `Deuda total: ${fmtMonto(deudaTotalActual, company)}. Sensible a devaluación.`
                  : "Sin deuda reportada en dólares."}
              </p>
            </div>

            {/* Tarjeta Solvencia Altman Z'' */}
            <div className="rounded-xl p-3.5 border border-border bg-bg/50 col-span-2 sm:col-span-1">
              <span className="text-xs text-ink-muted block">Altman Z'' (Solvencia)</span>
              <div className="mt-1 font-mono text-2xl font-bold text-ink">{fmtNum(actualAltman?.zScore)}</div>
              <p className="mt-1 text-[11px] text-ink-muted leading-tight">
                {actualAltman?.estado === "normal"
                  ? "Estructura patrimonial sana (>2,6)."
                  : actualAltman?.estado === "atencion"
                  ? "Zona gris de seguimiento."
                  : "Zona de alerta de insolvencia (<1,1)."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* BLOQUE 2: PALANCAS DE DECISIÓN ("¿QUÉ PASA SI...?") */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-accent">Paso 2 · Palancas Accionables</span>
            <h2 className="text-lg font-bold text-ink">Mover las palancas operativas y financieras</h2>
          </div>
          <button
            type="button"
            onClick={restablecerValoresBase}
            className="text-xs font-medium text-accent hover:underline focus-ring"
          >
            ↺ Restablecer valores de la empresa
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Palanca A: Días de cobro DSO */}
          <div className="rounded-xl border border-border bg-bg/40 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">1. Días de cobro (DSO)</span>
              <span className="font-mono text-sm font-bold text-accent">{dsoObjetivo} días</span>
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              Actual: {dsoActual !== null ? `${Math.round(dsoActual)} días` : "N/D"}. Mover para simular pronto pago o cobranza ágil.
            </p>
            <input
              type="range"
              min={15}
              max={120}
              step={1}
              value={dsoObjetivo}
              onChange={(e) => setDsoObjetivo(Number(e.target.value))}
              className="mt-3 w-full accent-accent cursor-pointer"
            />
            <div className="mt-3 flex items-center justify-between text-xs border-t border-border/40 pt-2">
              <span className="text-ink-muted">Impacto en liquidez:</span>
              <span className={`font-mono font-bold ${cajaLiberadaDso >= 0 ? "text-ok" : "text-bad"}`}>
                {cajaLiberadaDso >= 0 ? "+" : ""}
                {fmtMonto(cajaLiberadaDso, company || EMPRESA_DEMO_PEDRO)}
              </span>
            </div>
          </div>

          {/* Palanca B: Días de pago a proveedores DPO */}
          <div className="rounded-xl border border-border bg-bg/40 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">2. Días a proveedores (DPO)</span>
              <span className="font-mono text-sm font-bold text-accent">{dpoObjetivo} días</span>
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              Actual: {dpoActual !== null ? `${Math.round(dpoActual)} días` : "N/D"}. Mover para simular renegociación de plazos comerciales.
            </p>
            <input
              type="range"
              min={15}
              max={100}
              step={1}
              value={dpoObjetivo}
              onChange={(e) => setDpoObjetivo(Number(e.target.value))}
              className="mt-3 w-full accent-accent cursor-pointer"
            />
            <div className="mt-3 flex items-center justify-between text-xs border-t border-border/40 pt-2">
              <span className="text-ink-muted">Caja retenida:</span>
              <span className={`font-mono font-bold ${cajaLiberadaDpo >= 0 ? "text-ok" : "text-bad"}`}>
                {cajaLiberadaDpo >= 0 ? "+" : ""}
                {fmtMonto(cajaLiberadaDpo, company || EMPRESA_DEMO_PEDRO)}
              </span>
            </div>
          </div>

          {/* Palanca C: Salto cambiario USD */}
          <div className="rounded-xl border border-border bg-bg/40 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">3. Estrés cambiario (USD)</span>
              <span className="font-mono text-sm font-bold text-warn">+{devaluacionUsd}%</span>
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              Afecta al {Math.round(deudaUsdPct * 100)}% de deuda en dólares. Salto cambiario inmediato.
            </p>
            <div className="mt-3 flex items-center gap-1.5">
              {[0, 10, 20, 30, 50].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setDevaluacionUsd(val)}
                  className={`flex-1 rounded py-1 font-mono text-xs font-semibold transition-colors focus-ring ${
                    devaluacionUsd === val
                      ? "bg-warn text-white"
                      : "border border-border bg-bg text-ink-muted hover:text-ink"
                  }`}
                >
                  +{val}%
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs border-t border-border/40 pt-2">
              <span className="text-ink-muted">Mayor pasivo en moneda local:</span>
              <span className="font-mono font-bold text-bad">
                +{fmtMonto(saltoDeudaUsd, company || EMPRESA_DEMO_PEDRO)}
              </span>
            </div>
          </div>
        </div>

        {/* Parámetros adicionales */}
        <div className="mt-4 pt-4 border-t border-border">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted block mb-3">
            Variables de crecimiento y tasa
          </span>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <CampoNumero
              label="Crecimiento de ventas"
              value={crecimiento}
              onChange={setCrecimiento}
              ayuda="Variación porcentual esperada."
            />
            <CampoNumero
              label="Margen neto objetivo"
              value={margen}
              onChange={setMargen}
              ayuda="Margen final sobre ventas."
            />
            <CampoNumero
              label="Variación deuda financiera"
              value={variacionDeuda}
              onChange={setVariacionDeuda}
              ayuda="Toma (+) o pago (-) de crédito."
            />
            <CampoNumero
              label="Tasa de interés aplicada"
              value={tasaInteres}
              onChange={setTasaInteres}
              ayuda={`Tasa de financiamiento (${company?.mercado || "local"}).`}
            />
          </div>
        </div>
      </Card>

      {/* BLOQUE 3: IMPACTO EN CAJA & PLAN DE ACCIÓN RECOMENDADO */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Panel del Efectivo Liberado */}
        <div className="rounded-xl border border-ok/40 bg-ok-soft/30 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">💰</span>
              <h3 className="font-bold text-ink">Efectivo Neto Liberado en Caja</h3>
            </div>
            <div className="mt-3 font-mono text-3xl font-extrabold text-ok">
              {cajaTotalLiberada >= 0 ? "+" : ""}
              {fmtMonto(cajaTotalLiberada, company || EMPRESA_DEMO_PEDRO)}
            </div>
            <p className="mt-2 text-xs text-ink-muted leading-relaxed">
              {cajaTotalLiberada > 0
                ? "Este capital de trabajo liberado ingresa directamente a la cuenta corriente sin requerir préstamos bancarios ni costo financiero."
                : "La configuración actual requiere inyectar liquidez para sostener los plazos operativos."}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-ok/30 text-xs flex justify-between font-medium">
            <span className="text-ink-muted">Por DSO: +{fmtMonto(cajaLiberadaDso, company || EMPRESA_DEMO_PEDRO)}</span>
            <span className="text-ink-muted">Por DPO: +{fmtMonto(cajaLiberadaDpo, company || EMPRESA_DEMO_PEDRO)}</span>
          </div>
        </div>

        {/* Panel Centinela Recomienda */}
        <div className="rounded-xl border border-accent/40 bg-accent-soft/20 p-5 col-span-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">🛡️</span>
            <h3 className="font-bold text-ink">Centinela Recomienda · Plan de Acción Priorizado</h3>
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg bg-surface p-3 border border-border">
              <span className="text-[11px] font-bold uppercase text-accent block">Prioridad 1 · Cobranzas</span>
              <h4 className="mt-1 text-sm font-semibold text-ink">Reducir DSO a 60 días</h4>
              <p className="mt-1 text-xs text-ink-muted">
                Ofrecer 3% de descuento por pronto pago a clientes clase A para capturar liquidez inmediata.
              </p>
            </div>
            <div className="rounded-lg bg-surface p-3 border border-border">
              <span className="text-[11px] font-bold uppercase text-accent block">Prioridad 2 · Proveedores</span>
              <h4 className="mt-1 text-sm font-semibold text-ink">Extender DPO a 50 días</h4>
              <p className="mt-1 text-xs text-ink-muted">
                Renegociar contratos de insumos clave con cheques a plazo o acuerdos de volumen diferido.
              </p>
            </div>
            <div className="rounded-lg bg-surface p-3 border border-border">
              <span className="text-[11px] font-bold uppercase text-warn block">Prioridad 3 · Riesgo FX</span>
              <h4 className="mt-1 text-sm font-semibold text-ink">Mitigar Deuda USD</h4>
              <p className="mt-1 text-xs text-ink-muted">
                Con un salto del {devaluacionUsd || 20}%, la cobertura ICR se tensiona. Priorizar cancelación en divisas.
              </p>
            </div>
          </div>
        </div>

        {/* Banner Plan de Acción 100% Automatizado */}
        <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-accent/40 bg-gradient-to-r from-accent/10 via-surface to-accent/5 p-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-2 py-0.5 font-mono text-[10px] font-bold text-accent">
              <span>●</span> PLAN DE ACCIÓN 100% AUTOMATIZADO
            </div>
            <p className="mt-1 text-xs font-bold text-ink">
              Hoja de ruta de mitigación de caja generada por el algoritmo de Centinela
            </p>
            <p className="text-[11px] text-ink-muted">
              Descargá el informe ejecutivo con las metas exactas de DSO, rotación de inventario y amortiguación cambiaria para compartir directamente con tu equipo de finanzas.
            </p>
          </div>
          <Link
            to={company ? `/empresas/${company.ticker}` : "/empresas"}
            className="shrink-0 rounded-lg bg-accent px-3 py-1.5 font-mono text-xs font-bold text-white hover:opacity-90 focus-ring"
          >
            Ver Ficha y Descargar Informe →
          </Link>
        </div>
      </div>

      {/* BLOQUE 4: PROYECCIÓN COMPARADA DE ESCENARIOS */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
            3
          </span>
          <h2 className="text-lg font-semibold text-ink">Proyección: Escenarios comparados (Base vs Optimista vs Adverso)</h2>
        </div>

        {!company || !resultado ? (
          <Card className="text-center text-ink-muted">Seleccioná una empresa para simular escenarios.</Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <ScenarioCard escenario={resultado.base} supuestosBase={supuestosBase} company={company} />
            <ScenarioCard escenario={resultado.optimista} supuestosBase={supuestosBase} company={company} />
            <ScenarioCard escenario={resultado.adverso} supuestosBase={supuestosBase} company={company} />
          </div>
        )}
      </div>

      <p className="text-center text-xs text-ink-muted pt-4">
        ¿Querés entender cómo se calculan el Score Centinela, el Altman Z&apos;&apos; y los ratios de capital de trabajo?{" "}
        <Link to="/metodologia" className="underline">
          Ver metodología completa
        </Link>
        .
      </p>
    </div>
  );
}
