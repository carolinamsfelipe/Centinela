import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/Badge";
import { Card, Tooltip } from "@/components/ui/Card";
import { Gauge } from "@/components/ui/Gauge";
import { formatMacroValor, formatMacroVariacion, getRelevanciaSector, MACRO_DISCLAIMER } from "@/data/macro";
import { ALTMAN_THRESHOLDS } from "@/lib/financial/altman";
import {
  diagnosticarCapitalTrabajo,
  diagnosticarDeudaPatrimonio,
  diagnosticarEndeudamiento,
  diagnosticarLiquidez,
  diagnosticarMargenNeto,
  diagnosticarRoa,
  diagnosticarRoe,
  ESTADO_LABEL,
} from "@/lib/financial/diagnostics";
import { fmtMoney, fmtNum, fmtPct, fmtX } from "@/lib/format";
import { generarResumenEjecutivo } from "@/lib/financial/narrative";
import {
  calcularCapitalTrabajoSobreActivos,
  calcularDeudaSobrePatrimonio,
  calcularEndeudamiento,
  calcularLiquidez,
  calcularMargenNeto,
  calcularRoa,
  calcularRoe,
} from "@/lib/financial/ratios";
import { getCompanyAnalysis } from "@/services/companyService";
import { useFavorites } from "@/hooks/useFavorites";
import type { Estado } from "@/types";

type AnalisisEmpresa = Awaited<ReturnType<typeof getCompanyAnalysis>>;

const METRICAS_TOOLTIP: Record<string, string> = {
  "Market Cap": "Valor total de mercado de la empresa: precio de la acción multiplicado por la cantidad de acciones en circulación.",
  Revenue: "Ingresos totales generados por la empresa en el período.",
  EBITDA: "Resultado antes de intereses, impuestos, depreciación y amortización. Mide la rentabilidad operativa antes de decisiones financieras y contables.",
  "Net Income": "Resultado neto final del período, después de todos los costos, impuestos e intereses.",
  ROE: "Rentabilidad sobre el patrimonio: resultado neto dividido por el patrimonio neto. Mide cuánto rinde el capital de los accionistas.",
  ROA: "Rentabilidad sobre los activos: resultado neto dividido por el activo total.",
  "Debt/Equity": "Relación entre deuda total y patrimonio neto. Un valor elevado puede reflejar mayor utilización de financiamiento mediante deuda, aunque su interpretación depende del sector.",
  "Current Ratio": "Activo corriente sobre pasivo corriente: capacidad de cubrir obligaciones de corto plazo.",
  "P/E": "Precio de la acción sobre ganancia por acción (EPS). Indica cuántas veces se paga la ganancia anual.",
  "EV/EBITDA": "Valor de la empresa (market cap + deuda - caja) sobre EBITDA. Múltiplo de valuación comparable entre empresas.",
};

export function CompanyDetail() {
  const { ticker } = useParams<{ ticker: string }>();
  const [data, setData] = useState<AnalisisEmpresa | null | undefined>(undefined);
  const { isFavorite, toggleFavorite } = useFavorites();

  useEffect(() => {
    if (!ticker) return;
    getCompanyAnalysis(ticker).then((d) => setData(d ?? null));
  }, [ticker]);

  if (data === undefined) {
    return <div className="mx-auto max-w-5xl px-4 py-16 text-center text-ink-muted">Cargando...</div>;
  }

  if (data === null) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center">
        <p className="text-lg text-ink">No encontramos la empresa &quot;{ticker}&quot;.</p>
        <Link to="/empresas" className="mt-3 inline-block text-accent hover:underline">
          Volver al explorador de empresas
        </Link>
      </div>
    );
  }

  const { company, altman, score, senales } = data;
  const m = company.metrics;
  const resumen = generarResumenEjecutivo(company);

  const semaforo: Array<{ nombre: string; estado: Estado; valor: string }> = [
    { nombre: "Liquidez", estado: diagnosticarLiquidez(calcularLiquidez(m)).estado, valor: fmtNum(calcularLiquidez(m)) },
    { nombre: "Endeudamiento", estado: diagnosticarEndeudamiento(calcularEndeudamiento(m)).estado, valor: fmtPct(calcularEndeudamiento(m)) },
    { nombre: "Capital de trabajo", estado: diagnosticarCapitalTrabajo(calcularCapitalTrabajoSobreActivos(m)).estado, valor: fmtPct(calcularCapitalTrabajoSobreActivos(m)) },
    { nombre: "Deuda/Patrimonio", estado: diagnosticarDeudaPatrimonio(calcularDeudaSobrePatrimonio(m)).estado, valor: fmtX(calcularDeudaSobrePatrimonio(m)) },
    { nombre: "ROE", estado: diagnosticarRoe(calcularRoe(m)).estado, valor: fmtPct(calcularRoe(m)) },
    { nombre: "ROA", estado: diagnosticarRoa(calcularRoa(m)).estado, valor: fmtPct(calcularRoa(m)) },
    { nombre: "Margen neto", estado: diagnosticarMargenNeto(calcularMargenNeto(m)).estado, valor: fmtPct(calcularMargenNeto(m)) },
  ];

  const metricas: Array<{ label: string; valor: string }> = [
    { label: "Market Cap", valor: fmtMoney(m.marketCap) },
    { label: "Revenue", valor: fmtMoney(m.revenue) },
    { label: "EBITDA", valor: fmtMoney(m.ebitda) },
    { label: "Net Income", valor: fmtMoney(m.netIncome) },
    { label: "ROE", valor: fmtPct(m.roe) },
    { label: "ROA", valor: fmtPct(m.roa) },
    { label: "Debt/Equity", valor: fmtX(m.debtToEquity) },
    { label: "Current Ratio", valor: fmtNum(m.currentRatio) },
    { label: "P/E", valor: fmtNum(m.pe) },
    { label: "EV/EBITDA", valor: fmtNum(m.evEbitda) },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-ink">{company.nombre}</h1>
            <span className="font-mono text-sm text-ink-muted">{company.ticker}</span>
            {company.fuente === "demo" && <Badge estado="sin_datos" texto="Datos demo" />}
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            {company.sector} · {company.pais} · {company.tamano}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge estado={score.estado} />
          <Link
            to="/comparador"
            className="rounded-lg border border-border px-3 py-2 text-sm text-ink-muted hover:text-ink focus-ring"
          >
            Comparar
          </Link>
          <button
            onClick={() => toggleFavorite(company.ticker)}
            title={isFavorite(company.ticker) ? "Quitar de favoritos" : "Agregar a favoritos"}
            aria-pressed={isFavorite(company.ticker)}
            className={`rounded-lg border px-3 py-2 text-sm focus-ring ${
              isFavorite(company.ticker)
                ? "border-accent/40 bg-accent-soft text-accent"
                : "border-border text-ink-muted hover:text-ink"
            }`}
          >
            {isFavorite(company.ticker) ? "⭐ En favoritos" : "⭐ Favoritos"}
          </button>
        </div>
      </div>

      <Card className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Resumen financiero</h2>
        <p className="mt-2 text-ink">{resumen}</p>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-ink">Score Centinela</h2>
            <Badge estado={score.estado} />
          </div>
          <div className="mt-3 font-mono text-4xl font-bold text-ink">
            {score.total ?? "N/D"} <span className="text-base font-normal text-ink-muted">/ 100</span>
          </div>
          <p className="mt-2 text-sm text-ink-muted">
            El score combina indicadores de solvencia, liquidez, rentabilidad, endeudamiento y
            eficiencia. Ver <Link to="/metodologia" className="underline">metodología</Link>.
          </p>
          <div className="mt-4 space-y-2">
            {Object.values(score.categorias).map((c) => (
              <div key={c.nombre} className="flex items-center gap-3">
                <span className="w-32 text-sm text-ink-muted">{c.nombre}</span>
                <div className="h-2 flex-1 rounded-full bg-border">
                  <div
                    className="h-2 rounded-full bg-accent"
                    style={{ width: `${c.valor ?? 0}%` }}
                  />
                </div>
                <span className="w-10 text-right font-mono text-sm">{c.valor !== null ? Math.round(c.valor) : "N/D"}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-ink">Altman Z''</h2>
            <Badge estado={altman.estado} />
          </div>
          <Gauge value={altman.zScore} min={0} max={5} zonas={[ALTMAN_THRESHOLDS.distress, ALTMAN_THRESHOLDS.safe]} />
          <div className="text-center font-mono text-2xl font-bold text-ink">{fmtNum(altman.zScore)}</div>
          <p className="mt-2 text-center text-sm text-ink-muted">
            Distress &lt; {ALTMAN_THRESHOLDS.distress} · Zona gris · Segura &gt; {ALTMAN_THRESHOLDS.safe}
          </p>
          <p className="mt-3 text-xs text-ink-muted">
            El Altman Z'' Score es un modelo de riesgo financiero basado en determinados indicadores
            contables (Altman, Hartzell &amp; Peck, 1995). No constituye una predicción individual ni
            una recomendación de inversión.
          </p>
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="font-semibold text-ink">Estado financiero</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {semaforo.map((s) => (
            <div key={s.nombre} className="rounded-lg border border-border p-3">
              <div className="text-xs text-ink-muted">{s.nombre}</div>
              <div className="mt-1 font-mono font-semibold">{s.valor}</div>
              <div className="mt-1">
                <Badge estado={s.estado} texto={ESTADO_LABEL[s.estado]} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-6">
        <h2 className="font-semibold text-ink">Indicadores fundamentales</h2>
        <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-5">
          {metricas.map((met) => (
            <div key={met.label}>
              <div className="flex items-center gap-1 text-xs text-ink-muted">
                {METRICAS_TOOLTIP[met.label] ? (
                  <Tooltip texto={METRICAS_TOOLTIP[met.label]}>{met.label}</Tooltip>
                ) : (
                  met.label
                )}
              </div>
              <div className="mt-1 font-mono font-semibold text-ink">{met.valor}</div>
            </div>
          ))}
        </div>
      </Card>

      {company.historico.length > 1 && (
        <Card className="mt-6">
          <h2 className="font-semibold text-ink">Evolución histórica — ROE</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={company.historico}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
                <XAxis dataKey="periodo" stroke="rgb(var(--ink-muted))" fontSize={12} />
                <YAxis stroke="rgb(var(--ink-muted))" fontSize={12} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                <RechartsTooltip formatter={(v: number) => `${(v * 100).toFixed(1)}%`} />
                <Line type="monotone" dataKey="roe" stroke="rgb(var(--accent))" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <Card className="mt-6">
        <h2 className="font-semibold text-ink">Señales Centinela</h2>
        {senales.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">No se detectaron señales para el último período disponible.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {senales.map((s) => (
              <li key={s.id} className="flex items-start gap-2 rounded-lg border border-border p-3">
                <span aria-hidden="true">
                  {s.tipo === "positiva" ? "🟢" : s.tipo === "advertencia" ? "🟡" : "🔴"}
                </span>
                <div>
                  <div className="text-sm font-semibold text-ink">{s.titulo}</div>
                  <div className="text-sm text-ink-muted">{s.descripcion}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="mt-6">
        <h2 className="font-semibold text-ink">Contexto macroeconómico</h2>
        <p className="mt-1 text-xs text-ink-muted">
          {MACRO_DISCLAIMER} Ver el detalle completo en{" "}
          <Link to="/macro" className="underline">
            /macro
          </Link>
          .
        </p>
        <ul className="mt-4 space-y-3">
          {getRelevanciaSector(company.sector).map(({ indicador, motivo }) => {
            const variacion = formatMacroVariacion(indicador.variacion);
            return (
              <li key={indicador.id} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium text-ink">{indicador.nombre}</span>
                  <span className="font-mono text-sm text-ink">
                    {formatMacroValor(indicador)}{" "}
                    <span className={`text-xs font-semibold ${variacion.clase}`}>{variacion.texto}</span>
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink-muted">
                  Este indicador puede ser relevante para el sector debido a que {motivo}
                </p>
                <p className="mt-1 text-xs text-ink-muted">
                  Dato al {indicador.fecha} · Fuente: {indicador.fuente}
                </p>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
