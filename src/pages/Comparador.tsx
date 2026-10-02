import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Legend,
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { fmtMoney, fmtNum, fmtPct, fmtX } from "@/lib/format";
import { getCompanies, getCompanyAnalysis } from "@/services/companyService";
import type { Company, HistoricalPoint } from "@/types";

type AnalisisEmpresa = NonNullable<Awaited<ReturnType<typeof getCompanyAnalysis>>>;

const MAX_SELECCION = 5;
const MIN_SELECCION = 2;

// Colores por posición de selección (mismos tokens que el resto de la UI).
const COLORES = [
  "rgb(var(--accent))",
  "rgb(var(--ok))",
  "rgb(var(--warn))",
  "rgb(var(--bad))",
  "rgb(var(--neutral))",
];

const CATEGORIAS: Array<{ key: keyof AnalisisEmpresa["score"]["categorias"]; label: string }> = [
  { key: "solvencia", label: "Solvencia" },
  { key: "liquidez", label: "Liquidez" },
  { key: "rentabilidad", label: "Rentabilidad" },
  { key: "endeudamiento", label: "Endeudamiento" },
  { key: "eficiencia", label: "Eficiencia" },
];

const FILAS_TABLA: Array<{ label: string; valor: (a: AnalisisEmpresa) => string }> = [
  { label: "Score Centinela", valor: (a) => (a.score.total !== null ? `${a.score.total} / 100` : "N/D") },
  { label: "Altman Z''", valor: (a) => fmtNum(a.altman.zScore) },
  { label: "Market Cap", valor: (a) => fmtMoney(a.company.metrics.marketCap) },
  { label: "Revenue", valor: (a) => fmtMoney(a.company.metrics.revenue) },
  { label: "EBITDA", valor: (a) => fmtMoney(a.company.metrics.ebitda) },
  { label: "Margen neto", valor: (a) => fmtPct(a.company.metrics.margenNeto) },
  { label: "ROE", valor: (a) => fmtPct(a.company.metrics.roe) },
  { label: "ROA", valor: (a) => fmtPct(a.company.metrics.roa) },
  { label: "Debt/Equity", valor: (a) => fmtX(a.company.metrics.debtToEquity) },
  { label: "Current Ratio", valor: (a) => fmtNum(a.company.metrics.currentRatio) },
  { label: "P/E", valor: (a) => fmtNum(a.company.metrics.pe) },
  { label: "EV/EBITDA", valor: (a) => fmtNum(a.company.metrics.evEbitda) },
];

type MetricaEvolucion = keyof Omit<HistoricalPoint, "periodo">;
type TipoFormato = "pct" | "money" | "x" | "num";

const METRICAS_EVOLUCION: Array<{ id: MetricaEvolucion; label: string; tipo: TipoFormato }> = [
  { id: "roe", label: "ROE", tipo: "pct" },
  { id: "roa", label: "ROA", tipo: "pct" },
  { id: "revenue", label: "Revenue", tipo: "money" },
  { id: "ebitda", label: "EBITDA", tipo: "money" },
  { id: "netIncome", label: "Net Income", tipo: "money" },
  { id: "debtToEquity", label: "Debt/Equity", tipo: "x" },
  { id: "freeCashFlow", label: "Free Cash Flow", tipo: "money" },
  { id: "altmanZ", label: "Altman Z''", tipo: "num" },
  { id: "centinelaScore", label: "Score Centinela", tipo: "num" },
];

function formatearPorTipo(v: number | null, tipo: TipoFormato): string {
  if (v === null) return "N/D";
  switch (tipo) {
    case "pct":
      return fmtPct(v);
    case "money":
      return fmtMoney(v);
    case "x":
      return fmtX(v);
    case "num":
      return fmtNum(v);
  }
}

export function Comparador() {
  const [empresas, setEmpresas] = useState<Company[]>([]);
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [analisis, setAnalisis] = useState<AnalisisEmpresa[]>([]);
  const [filtro, setFiltro] = useState("");
  const [metricaEvolucion, setMetricaEvolucion] = useState<MetricaEvolucion>("roe");

  useEffect(() => {
    getCompanies().then(setEmpresas);
  }, []);

  useEffect(() => {
    if (seleccion.length === 0) {
      setAnalisis([]);
      return;
    }
    let activo = true;
    Promise.all(seleccion.map((ticker) => getCompanyAnalysis(ticker))).then((resultados) => {
      if (!activo) return;
      setAnalisis(resultados.filter((r): r is AnalisisEmpresa => r !== undefined));
    });
    return () => {
      activo = false;
    };
  }, [seleccion]);

  const empresasFiltradas = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return empresas;
    return empresas.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        c.ticker.toLowerCase().includes(q) ||
        c.sector.toLowerCase().includes(q)
    );
  }, [empresas, filtro]);

  function toggleSeleccion(ticker: string) {
    setSeleccion((prev) => {
      if (prev.includes(ticker)) return prev.filter((t) => t !== ticker);
      if (prev.length >= MAX_SELECCION) return prev;
      return [...prev, ticker];
    });
  }

  const hayComparacion = analisis.length >= MIN_SELECCION;

  const radarData = useMemo(() => {
    return CATEGORIAS.map(({ key, label }) => {
      const fila: Record<string, string | number> = { categoria: label };
      analisis.forEach((a) => {
        fila[a.company.ticker] = a.score.categorias[key].valor ?? 0;
      });
      return fila;
    });
  }, [analisis]);

  const metricaInfo = METRICAS_EVOLUCION.find((m) => m.id === metricaEvolucion) ?? METRICAS_EVOLUCION[0];

  const evolucionData = useMemo(() => {
    const maxLen = analisis.reduce((max, a) => Math.max(max, a.company.historico.length), 0);
    return Array.from({ length: maxLen }, (_, i) => {
      const fila: Record<string, string | number | null> = {
        periodo: analisis[0]?.company.historico[i]?.periodo ?? `P${i + 1}`,
      };
      analisis.forEach((a) => {
        const punto = a.company.historico[i];
        fila[a.company.ticker] = punto ? punto[metricaEvolucion] : null;
      });
      return fila;
    });
  }, [analisis, metricaEvolucion]);

  const rankingRelativo = useMemo(() => {
    return [...analisis].sort((a, b) => {
      if (a.score.total === null && b.score.total === null) return 0;
      if (a.score.total === null) return 1;
      if (b.score.total === null) return -1;
      return b.score.total - a.score.total;
    });
  }, [analisis]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <h1 className="text-2xl font-bold text-ink">Comparador de empresas</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Elegí entre {MIN_SELECCION} y {MAX_SELECCION} empresas para ver sus indicadores, categorías del
        Score Centinela y evolución histórica una junto a la otra. Las diferencias se muestran de forma
        objetiva; la interpretación queda a tu criterio.
      </p>

      <Card className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-ink">Selección ({seleccion.length}/{MAX_SELECCION})</h2>
          <input
            type="search"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Filtrar por nombre, ticker o sector..."
            aria-label="Filtrar empresas"
            className="w-full max-w-xs rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus-ring"
          />
        </div>

        {seleccion.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {seleccion.map((ticker, i) => {
              const c = empresas.find((e) => e.ticker === ticker);
              if (!c) return null;
              return (
                <span
                  key={ticker}
                  className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-semibold"
                  style={{ color: COLORES[i % COLORES.length] }}
                >
                  {c.nombre} ({c.ticker})
                  <button
                    onClick={() => toggleSeleccion(ticker)}
                    aria-label={`Quitar ${c.nombre} de la comparación`}
                    className="text-ink-muted hover:text-ink focus-ring"
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        )}

        <div className="mt-4 max-h-64 overflow-y-auto rounded-lg border border-border">
          {empresasFiltradas.length === 0 ? (
            <p className="p-4 text-center text-sm text-ink-muted">Ninguna empresa coincide con el filtro.</p>
          ) : (
            <ul className="divide-y divide-border">
              {empresasFiltradas.map((c) => {
                const marcada = seleccion.includes(c.ticker);
                const deshabilitada = !marcada && seleccion.length >= MAX_SELECCION;
                return (
                  <li key={c.ticker}>
                    <label
                      className={`flex items-center justify-between gap-3 px-4 py-2.5 text-sm ${
                        deshabilitada ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-accent-soft/30"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={marcada}
                          disabled={deshabilitada}
                          onChange={() => toggleSeleccion(c.ticker)}
                          className="rounded border-border"
                        />
                        <span className="font-medium text-ink">{c.nombre}</span>
                        <span className="font-mono text-xs text-ink-muted">{c.ticker}</span>
                      </span>
                      <span className="text-xs text-ink-muted">{c.sector}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Card>

      {!hayComparacion ? (
        <Card className="mt-6 text-center text-ink-muted">
          Seleccioná al menos {MIN_SELECCION} empresas arriba para ver la comparación.
        </Card>
      ) : (
        <>
          <Card className="mt-6 overflow-x-auto">
            <h2 className="font-semibold text-ink">Tabla comparativa</h2>
            <table className="mt-3 w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-border [&>th]:px-3 [&>th]:py-2 [&>th]:text-left">
                  <th className="text-ink-muted">Indicador</th>
                  {analisis.map((a, i) => (
                    <th key={a.company.ticker}>
                      <Link
                        to={`/empresas/${a.company.ticker}`}
                        className="font-semibold hover:underline focus-ring"
                        style={{ color: COLORES[i % COLORES.length] }}
                      >
                        {a.company.nombre}
                      </Link>
                      <div className="font-mono text-xs text-ink-muted">{a.company.ticker}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FILAS_TABLA.map((fila) => (
                  <tr key={fila.label} className="border-b border-border last:border-0 [&>td]:px-3 [&>td]:py-2">
                    <td className="text-ink-muted">{fila.label}</td>
                    {analisis.map((a) => (
                      <td key={a.company.ticker} className="font-mono text-ink">
                        {fila.valor(a)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card className="mt-6">
            <h2 className="font-semibold text-ink">Score Centinela por categoría</h2>
            <div className="mt-4 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgb(var(--border))" />
                  <PolarAngleAxis dataKey="categoria" stroke="rgb(var(--ink-muted))" fontSize={12} />
                  <PolarRadiusAxis domain={[0, 100]} stroke="rgb(var(--ink-muted))" fontSize={10} />
                  {analisis.map((a, i) => (
                    <Radar
                      key={a.company.ticker}
                      name={`${a.company.nombre} (${a.company.ticker})`}
                      dataKey={a.company.ticker}
                      stroke={COLORES[i % COLORES.length]}
                      fill={COLORES[i % COLORES.length]}
                      fillOpacity={0.15}
                    />
                  ))}
                  <Legend />
                  <RechartsTooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="mt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold text-ink">Evolución histórica</h2>
              <select
                value={metricaEvolucion}
                onChange={(e) => setMetricaEvolucion(e.target.value as MetricaEvolucion)}
                aria-label="Métrica de evolución histórica"
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus-ring"
              >
                {METRICAS_EVOLUCION.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolucionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
                  <XAxis dataKey="periodo" stroke="rgb(var(--ink-muted))" fontSize={12} />
                  <YAxis
                    stroke="rgb(var(--ink-muted))"
                    fontSize={12}
                    tickFormatter={(v: number) => formatearPorTipo(v, metricaInfo.tipo)}
                  />
                  <RechartsTooltip formatter={(v: number) => formatearPorTipo(v, metricaInfo.tipo)} />
                  <Legend />
                  {analisis.map((a, i) => (
                    <Line
                      key={a.company.ticker}
                      type="monotone"
                      dataKey={a.company.ticker}
                      name={`${a.company.nombre} (${a.company.ticker})`}
                      stroke={COLORES[i % COLORES.length]}
                      strokeWidth={2}
                      dot
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="mt-6">
            <h2 className="font-semibold text-ink">Ranking relativo (Score Centinela)</h2>
            <p className="mt-1 text-xs text-ink-muted">
              Orden de las empresas seleccionadas según su Score Centinela, de mayor a menor. No implica
              una recomendación de inversión.
            </p>
            <ol className="mt-3 space-y-2">
              {rankingRelativo.map((a, i) => (
                <li
                  key={a.company.ticker}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-ink-muted">#{i + 1}</span>
                    <Link to={`/empresas/${a.company.ticker}`} className="font-medium text-ink hover:text-accent focus-ring">
                      {a.company.nombre}
                    </Link>
                    <span className="font-mono text-xs text-ink-muted">{a.company.ticker}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-ink">{a.score.total ?? "N/D"} / 100</span>
                    <Badge estado={a.score.estado} />
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </>
      )}
    </div>
  );
}
