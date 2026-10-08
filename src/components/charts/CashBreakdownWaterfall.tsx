import { useMemo, useState } from "react";
import { fmtMonto } from "@/lib/format";
import type { Company } from "@/types";

interface CashBreakdownWaterfallProps {
  ebitda: number | null;
  freeCashFlow: number | null;
  revenue: number | null;
  deudaTotal: number | null;
  activosCorrientes: number | null;
  pasivosCorrientes: number | null;
  gastosIntereses?: number | null;
  monedaReporte?: string;
  tipoCambioUsd?: number | null;
  company?: Company;
  nombreEmpresa?: string;
}

export function CashBreakdownWaterfall({
  ebitda,
  freeCashFlow,
  deudaTotal,
  activosCorrientes,
  pasivosCorrientes,
  gastosIntereses,
  monedaReporte = "ARS",
  tipoCambioUsd = null,
  company,
  nombreEmpresa = "la empresa",
}: CashBreakdownWaterfallProps) {
  const [modoMoneda, setModoMoneda] = useState<"usd" | "nativa">("usd");
  const analisisCaja = useMemo(() => {
    const eb = ebitda ?? 0;
    const fcf = freeCashFlow ?? 0;
    const dt = deudaTotal ?? 0;
    const ac = activosCorrientes ?? 0;
    const pc = pasivosCorrientes ?? 0;

    // Estimación sintética o real de intereses
    const intereses =
      gastosIntereses && gastosIntereses > 0
        ? gastosIntereses
        : dt > 0
        ? dt * 0.082
        : 0;

    // Capex aproximado consistente: EBITDA - Intereses - FCF
    let capex = 0;
    if (eb > 0) {
      capex = Math.max(0, eb - intereses - fcf);
    }

    const brechaCapitalTrabajo = ac - pc;
    const liquidezRatio = pc > 0 ? ac / pc : 1.0;

    // Identificación matemática del cuello de botella principal
    let cuelloBotella = "Equilibrio Operativo";
    let gravedad: "alerta" | "atencion" | "saludable" = "saludable";
    let diagnosticoTexto = "La compañía genera suficiente caja para fondear sus inversiones y pasivos.";

    if (fcf < 0) {
      gravedad = "alerta";
      if (capex > eb * 0.55) {
        cuelloBotella = "Intensidad de Capex de Capital";
        diagnosticoTexto =
          "La caja operativa es devorada por reinversión acelerada en activos físicos. Requiere fondeo externo continuo.";
      } else if (intereses > eb * 0.3) {
        cuelloBotella = "Servicio de Deuda e Intereses";
        diagnosticoTexto =
          "La carga de intereses absorbe una porción crítica del EBITDA. Alta vulnerabilidad ante subas de tasa.";
      } else if (brechaCapitalTrabajo < 0) {
        cuelloBotella = "Estrangulamiento de Pasivos de Corto Plazo";
        diagnosticoTexto =
          "Los pasivos corrientes superan a los activos líquidos realizables en el año. Dependencia de líneas de crédito.";
      }
    } else if (brechaCapitalTrabajo < 0) {
      gravedad = "atencion";
      cuelloBotella = "Descalce Corriente de Tesorería";
      diagnosticoTexto =
        "A pesar de un FCF positivo, los pasivos exigibles a 12 meses superan la liquidez inmediata.";
    }

    return {
      ebitda: eb,
      intereses,
      capex,
      fcf,
      brechaCapitalTrabajo,
      liquidezRatio,
      cuelloBotella,
      gravedad,
      diagnosticoTexto,
    };
  }, [ebitda, freeCashFlow, deudaTotal, activosCorrientes, pasivosCorrientes, gastosIntereses]);

  const maxEscala = Math.max(
    analisisCaja.ebitda,
    analisisCaja.capex + analisisCaja.intereses,
    1
  );

  const getWidthPct = (val: number) => {
    return Math.min(100, Math.max(8, (Math.abs(val) / maxEscala) * 100));
  };

  const objetoMoneda = useMemo(() => {
    return {
      monedaReporte: company?.monedaReporte ?? monedaReporte,
      tipoCambioUsd: company?.tipoCambioUsd ?? tipoCambioUsd ?? (monedaReporte === "ARS" ? 1485.5 : null),
    };
  }, [company, monedaReporte, tipoCambioUsd]);

  const fmtValor = (val: number | null | undefined) => {
    if (val === null || val === undefined) return "N/D";
    // Si no hay tipo de cambio y no es USD, fmtMonto usa modo nativa automáticamente
    return fmtMonto(val, objetoMoneda, modoMoneda);
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      {/* Encabezado del Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-bad/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-bad">
            <span className="h-1.5 w-1.5 rounded-full bg-bad animate-pulse" />
            CASH BREAKDOWN ENGINE · DIAGNÓSTICO INSTITUCIONAL
          </div>
          <h3 className="mt-1 text-base font-bold text-ink sm:text-lg">
            ¿Dónde se rompe la caja en {nombreEmpresa}?
          </h3>
          <p className="text-xs text-ink-muted">
            Trazabilidad del flujo: desde la generación bruta (EBITDA) hasta la absorción por Capex, deuda y FCF.
          </p>
        </div>

        {/* Badge del Cuello de Botella Detectado y selector de moneda */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {objetoMoneda.monedaReporte !== "USD" && (
            <button
              type="button"
              onClick={() => setModoMoneda(modoMoneda === "usd" ? "nativa" : "usd")}
              className="rounded border border-border bg-bg px-2.5 py-1 font-mono text-xs font-semibold text-ink-muted hover:text-ink focus-ring"
              title="Cambiar entre dólares y moneda local"
            >
              {modoMoneda === "usd" ? `Ver en ${objetoMoneda.monedaReporte}` : "Ver en US$"}
            </button>
          )}

          <div
            className={`rounded-xl border px-3 py-2 text-right ${
              analisisCaja.gravedad === "alerta"
                ? "border-bad/40 bg-bad-soft/30 text-bad"
                : analisisCaja.gravedad === "atencion"
                ? "border-warn/40 bg-warn-soft/30 text-warn"
                : "border-ok/40 bg-ok-soft/30 text-ok"
            }`}
          >
            <span className="block font-mono text-[10px] uppercase font-bold tracking-wider">
              Cuello de botella principal
            </span>
            <span className="font-mono text-xs font-bold sm:text-sm">
              {analisisCaja.cuelloBotella}
            </span>
          </div>
        </div>
      </div>

      {/* Gráfico Cascada (Waterfall) de Absorción de Flujo */}
      <div className="mt-6 space-y-4">
        {/* Paso 1: EBITDA */}
        <div>
          <div className="flex items-center justify-between text-xs font-mono mb-1">
            <span className="font-bold text-ink">1. Generación Operativa Bruta (EBITDA)</span>
            <span className="font-bold text-ok">+{fmtValor(analisisCaja.ebitda)}</span>
          </div>
          <div className="h-6 w-full rounded-lg bg-bg p-0.5 border border-border">
            <div
              className="h-full rounded-md bg-ok flex items-center justify-end pr-2 font-mono text-[11px] font-bold text-white transition-all"
              style={{ width: `${getWidthPct(analisisCaja.ebitda)}%` }}
            >
              100% flujo bruto
            </div>
          </div>
        </div>

        {/* Paso 2: Absorción por Capex */}
        <div>
          <div className="flex items-center justify-between text-xs font-mono mb-1">
            <span className="font-bold text-ink-muted">
              2. Fuga de Capital Intensivo (Capex e Infraestructura)
            </span>
            <span className="font-bold text-bad">-{fmtValor(analisisCaja.capex)}</span>
          </div>
          <div className="h-6 w-full rounded-lg bg-bg p-0.5 border border-border">
            <div
              className="h-full rounded-md bg-bad/80 flex items-center justify-end pr-2 font-mono text-[11px] font-bold text-white transition-all"
              style={{ width: `${getWidthPct(analisisCaja.capex)}%` }}
            >
              {analisisCaja.ebitda > 0
                ? `${Math.round((analisisCaja.capex / analisisCaja.ebitda) * 100)}% del EBITDA`
                : "Absorción"}
            </div>
          </div>
        </div>

        {/* Paso 3: Fuga por Servicio de Intereses */}
        <div>
          <div className="flex items-center justify-between text-xs font-mono mb-1">
            <span className="font-bold text-ink-muted">
              3. Carga Financiera (Servicio Estimado de Intereses)
            </span>
            <span className="font-bold text-warn">-{fmtValor(analisisCaja.intereses)}</span>
          </div>
          <div className="h-6 w-full rounded-lg bg-bg p-0.5 border border-border">
            <div
              className="h-full rounded-md bg-warn/80 flex items-center justify-end pr-2 font-mono text-[11px] font-bold text-white transition-all"
              style={{ width: `${getWidthPct(analisisCaja.intereses)}%` }}
            >
              {analisisCaja.ebitda > 0
                ? `${Math.round((analisisCaja.intereses / analisisCaja.ebitda) * 100)}% del EBITDA`
                : "Carga financiera"}
            </div>
          </div>
        </div>

        {/* Paso 4: Saldo Final Free Cash Flow */}
        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between text-xs font-mono mb-1">
            <span className="font-bold text-ink">
              4. Saldo Resultante de Caja Libre (Free Cash Flow)
            </span>
            <span
              className={`font-bold text-sm ${
                analisisCaja.fcf < 0 ? "text-bad" : "text-ok"
              }`}
            >
              {analisisCaja.fcf > 0 ? "+" : ""}
              {fmtValor(analisisCaja.fcf)}
            </span>
          </div>
          <div className="h-6 w-full rounded-lg bg-bg p-0.5 border border-border">
            <div
              className={`h-full rounded-md flex items-center justify-end pr-2 font-mono text-[11px] font-bold text-white transition-all ${
                analisisCaja.fcf < 0 ? "bg-bad" : "bg-ok"
              }`}
              style={{ width: `${getWidthPct(analisisCaja.fcf)}%` }}
            >
              {analisisCaja.fcf < 0 ? "Déficit de Flujo" : "Superávit de Flujo"}
            </div>
          </div>
        </div>
      </div>

      {/* Tarjeta de Diagnóstico y Brecha Corriente */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-border text-xs">
        <div className="rounded-xl border border-border bg-bg/60 p-3">
          <span className="font-mono font-bold uppercase text-[10px] text-ink-muted block">
            Dictamen del Motor de Caja
          </span>
          <p className="mt-1 text-ink leading-relaxed font-medium">
            {analisisCaja.diagnosticoTexto}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-bg/60 p-3">
          <div className="flex items-center justify-between">
            <span className="font-mono font-bold uppercase text-[10px] text-ink-muted">
              Brecha de Capital de Trabajo
            </span>
            <span
              className={`font-mono font-bold text-xs ${
                analisisCaja.brechaCapitalTrabajo < 0 ? "text-bad" : "text-ok"
              }`}
            >
              {fmtValor(analisisCaja.brechaCapitalTrabajo)}
            </span>
          </div>
          <p className="mt-1 text-ink-muted leading-tight text-[11px]">
            {analisisCaja.brechaCapitalTrabajo < 0
              ? `Pasivos corrientes superan en ${fmtValor(
                  Math.abs(analisisCaja.brechaCapitalTrabajo)
                )} a los activos corrientes (cobertura ${analisisCaja.liquidezRatio.toFixed(2)}x).`
              : "Activos líquidos suficientes para responder a vencimientos a 12 meses."}
          </p>
        </div>
      </div>
    </div>
  );
}
