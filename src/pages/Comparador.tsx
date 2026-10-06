import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
import { TOOLTIP_CONTENT_STYLE, TOOLTIP_LABEL_STYLE } from "@/components/charts/chartStyle";
import { Badge } from "@/components/ui/Badge";
import { BotonDescarga } from "@/components/ui/BotonDescarga";
import { Card } from "@/components/ui/Card";
import { MERCADOS, nombreMercado, nombreSector } from "@/data/companies";
import { ESTADO_LABEL } from "@/lib/financial/diagnostics";
import { aUsd, fmtMonto, fmtNum, fmtPct, fmtScore, fmtX } from "@/lib/format";
import {
  FILAS_COMPARATIVAS,
  NOTA_COMPARACION,
  descargarExcelComparativo,
  descargarInformeComparativo,
} from "@/lib/reports/comparativo";
import { getCompanies, getCompanyAnalysis } from "@/services/companyService";
import type { Company, HistoricalPoint, Mercado } from "@/types";

type AnalisisEmpresa = NonNullable<Awaited<ReturnType<typeof getCompanyAnalysis>>>;

const MAX_SELECCION = 5;
const MIN_SELECCION = 2;

// Paleta institucional de alto contraste diferenciada (Koyfin / Bloomberg Terminal):
const COLORES = [
  "#06b6d4", // Cyan eléctrico (Empresa 1)
  "#f59e0b", // Ámbar / Naranja vibrante (Empresa 2)
  "#10b981", // Verde Esmeralda (Empresa 3)
  "#a855f7", // Violeta / Púrpura (Empresa 4)
  "#ec4899", // Rosa / Magenta (Empresa 5)
];

const CATEGORIAS: Array<{ key: keyof AnalisisEmpresa["score"]["categorias"]; label: string }> = [
  { key: "solvencia", label: "Solvencia" },
  { key: "liquidez", label: "Liquidez" },
  { key: "rentabilidad", label: "Rentabilidad" },
  { key: "endeudamiento", label: "Endeudamiento" },
  { key: "eficiencia", label: "Eficiencia" },
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
      return fmtMonto(v, { monedaReporte: "USD", tipoCambioUsd: 1 });
    case "x":
      return fmtX(v);
    case "num":
      return fmtNum(v);
  }
}

export function Comparador() {
  const [params] = useSearchParams();
  const [empresas, setEmpresas] = useState<Company[]>([]);
  const [cargando, setCargando] = useState(true);
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [analisis, setAnalisis] = useState<AnalisisEmpresa[]>([]);
  const [filtro, setFiltro] = useState("");
  const [filtroMercado, setFiltroMercado] = useState<Mercado | "Todos">("Todos");
  const [metricaEvolucion, setMetricaEvolucion] = useState<MetricaEvolucion>("roe");

  useEffect(() => {
    getCompanies().then((cs) => {
      setEmpresas(cs);
      setCargando(false);
      const inicial = (params.get("empresas") ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter((t) => cs.some((c) => c.ticker === t));
      if (inicial.length > 0) setSeleccion(inicial.slice(0, MAX_SELECCION));
    });
    // Solo se lee el parametro al abrir la pagina.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const mercadosDisponibles = useMemo(
    () => MERCADOS.filter((m) => empresas.some((c) => c.mercado === m.id)),
    [empresas]
  );

  const empresasFiltradas = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    return empresas.filter((c) => {
      if (filtroMercado !== "Todos" && c.mercado !== filtroMercado) return false;
      if (!q) return true;
      return (
        c.nombre.toLowerCase().includes(q) ||
        c.ticker.toLowerCase().includes(q) ||
        nombreSector(c.sector).toLowerCase().includes(q) ||
        nombreMercado(c.mercado).toLowerCase().includes(q)
      );
    });
  }, [empresas, filtro, filtroMercado]);

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
      const fila: Record<string, string | number | null> = { categoria: label };
      analisis.forEach((a) => {
        fila[a.company.ticker] = a.score.categorias[key].valor;
      });
      return fila;
    });
  }, [analisis]);

  const metricaInfo = METRICAS_EVOLUCION.find((m) => m.id === metricaEvolucion) ?? METRICAS_EVOLUCION[0];

  // Las empresas no tienen los mismos cierres ni la misma moneda: se alinean por posicion
  // (ultimo ejercicio con ultimo ejercicio) y los importes se pasan a US$ para poder
  // superponerlos. Los ratios no dependen de la moneda.
  const evolucionData = useMemo(() => {
    const maxLen = analisis.reduce((max, a) => Math.max(max, a.company.historico.length), 0);
    return Array.from({ length: maxLen }, (_, i) => {
      const fila: Record<string, string | number | null> = { periodo: `Ejercicio -${maxLen - 1 - i}` };
      if (i === maxLen - 1) fila.periodo = "Último ejercicio";
      analisis.forEach((a) => {
        const h = a.company.historico;
        const punto = h[h.length - maxLen + i];
        const valor = punto ? punto[metricaEvolucion] : null;
        fila[a.company.ticker] = valor !== null && metricaInfo.tipo === "money" ? aUsd(valor, a.company) : valor;
      });
      return fila;
    });
  }, [analisis, metricaEvolucion, metricaInfo.tipo]);

  const rankingRelativo = useMemo(() => {
    return [...analisis].sort((a, b) => {
      if (a.score.total === null && b.score.total === null) return 0;
      if (a.score.total === null) return 1;
      if (b.score.total === null) return -1;
      return b.score.total - a.score.total;
    });
  }, [analisis]);

  const hayMercadosMezclados = new Set(analisis.map((a) => a.company.mercado)).size > 1;
  const hayARS = analisis.some((a) => a.company.monedaReporte === "ARS");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Comparador de empresas</h1>
          <p className="mt-1 max-w-3xl text-sm text-ink-muted">
            Elegí entre {MIN_SELECCION} y {MAX_SELECCION} empresas, de cualquier mercado y sector, incluidas las que
            cargaste vos (&quot;Mi empresa&quot;), para ver sus indicadores, categorías del Score Centinela y evolución
            una junto a la otra. Las diferencias se muestran de forma objetiva; la interpretación queda a tu criterio.
          </p>
        </div>
        <Link
          to="/mi-empresa"
          className="rounded-lg border border-border px-3 py-2 text-sm text-ink-muted hover:text-ink focus-ring"
        >
          + Cargar mi empresa
        </Link>
      </div>

      <Card className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-ink">
            Selección ({seleccion.length}/{MAX_SELECCION})
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filtroMercado}
              onChange={(e) => setFiltroMercado(e.target.value as Mercado | "Todos")}
              aria-label="Filtrar por mercado"
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus-ring"
            >
              <option value="Todos">Todos los mercados</option>
              {mercadosDisponibles.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
            <input
              type="search"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Filtrar por nombre, ticker, sector o mercado..."
              aria-label="Filtrar empresas"
              className="w-full max-w-xs rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus-ring"
            />
          </div>
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
                  {c.nombre} · {nombreMercado(c.mercado)}
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

        <div className="mt-4 max-h-72 overflow-y-auto rounded-lg border border-border">
          {cargando ? (
            <p className="p-4 text-center text-sm text-ink-muted">Consultando balances y precios en vivo...</p>
          ) : empresasFiltradas.length === 0 ? (
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
                        <span className="font-mono text-xs text-ink-muted">
                          {c.fuente === "propia" ? "mi empresa" : c.ticker}
                        </span>
                      </span>
                      <span className="text-xs text-ink-muted">
                        {nombreMercado(c.mercado)} · {nombreSector(c.sector)}
                      </span>
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
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-muted">
              {hayMercadosMezclados
                ? "Comparación entre mercados distintos: los importes están en US$ y los ratios son directamente comparables."
                : "Comparación dentro de un mismo mercado."}
            </p>
            <div className="flex flex-wrap items-start gap-2">
              <BotonDescarga
                label="Descargar informe PDF"
                variante="principal"
                onDescargar={() => descargarInformeComparativo(analisis)}
              />
              <BotonDescarga label="Descargar Excel" onDescargar={() => descargarExcelComparativo(analisis)} />
            </div>
          </div>

          <Card className="mt-4 overflow-x-auto">
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
                      <div className="font-mono text-xs text-ink-muted">
                        {a.company.fuente === "propia" ? "mi empresa" : a.company.ticker}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FILAS_COMPARATIVAS.map((fila) => (
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
            <p className="mt-3 text-xs text-ink-muted">{NOTA_COMPARACION}</p>
          </Card>

          <Card className="mt-6 border-accent/20">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <div>
                <h2 className="text-base font-bold text-ink">Score Centinela Multidimensional</h2>
                <p className="mt-0.5 text-xs text-ink-muted">
                  Comparación radial sobre las 5 dimensiones cuantitativas auditadas (0 a 100 puntos).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-surface px-2.5 py-1 text-xs font-mono text-ink-muted border border-border">
                  Escala: 0 a 100 pts
                </span>
              </div>
            </div>

            {/* GRÁFICO RADIAL DE ALTA FIDELIDAD */}
            <div className="mt-4 h-96 sm:h-[420px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="75%">
                  <PolarGrid stroke="rgb(var(--border))" strokeOpacity={0.7} gridType="polygon" />
                  <PolarAngleAxis
                    dataKey="categoria"
                    stroke="rgb(var(--ink))"
                    tick={{ fill: "currentColor", fontSize: 13, fontWeight: 600 }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={false}
                    axisLine={false}
                  />
                  <Legend
                    verticalAlign="top"
                    align="center"
                    wrapperStyle={{ paddingBottom: "14px" }}
                    formatter={(value) => (
                      <span className="font-semibold text-xs sm:text-sm text-ink ml-1 mr-3 cursor-default">
                        {value}
                      </span>
                    )}
                  />
                  {analisis.map((a, i) => (
                    <Radar
                      key={a.company.ticker}
                      name={a.company.fuente === "propia" ? `${a.company.nombre} (mi empresa)` : `${a.company.nombre} (${a.company.ticker})`}
                      dataKey={a.company.ticker}
                      stroke={COLORES[i % COLORES.length]}
                      fill={COLORES[i % COLORES.length]}
                      fillOpacity={0.18}
                      strokeWidth={2.5}
                      dot={{
                        r: 4.5,
                        fill: COLORES[i % COLORES.length],
                        stroke: "rgb(var(--surface))",
                        strokeWidth: 2,
                      }}
                      activeDot={{
                        r: 7,
                        fill: COLORES[i % COLORES.length],
                        stroke: "#ffffff",
                        strokeWidth: 2,
                      }}
                    />
                  ))}
                  <RechartsTooltip
                    contentStyle={TOOLTIP_CONTENT_STYLE}
                    labelStyle={TOOLTIP_LABEL_STYLE}
                    formatter={(v: any, name: string) => {
                      if (v === null || v === undefined || Number.isNaN(v)) {
                        return ["N/A", name];
                      }
                      return [`${Math.round(Number(v))} / 100`, name];
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* MATRIZ DE DESGLOSE COMPARATIVO VISUAL */}
            <div className="mt-6 border-t border-border pt-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-ink-muted">
                  Desglose cuantitativo por empresa (0 a 100)
                </span>
                <span className="text-[11px] font-mono text-ink-muted">5 pilares del Score</span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {analisis.map((a, i) => {
                  const color = COLORES[i % COLORES.length];
                  return (
                    <div
                      key={a.company.ticker}
                      className="rounded-xl border border-border bg-bg/50 p-4 transition-all hover:border-accent/40 hover:shadow-sm"
                      style={{ borderTop: `3px solid ${color}` }}
                    >
                      <div className="flex items-center justify-between pb-2.5 border-b border-border/60">
                        <div className="min-w-0 pr-2">
                          <div className="font-bold text-ink text-sm truncate flex items-center gap-1.5">
                            <span className="inline-block w-2.5 h-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                            <span className="truncate">{a.company.nombre}</span>
                          </div>
                          <span className="text-[11px] font-mono text-ink-muted block pl-4">
                            {a.company.fuente === "propia" ? "Empresa propia" : a.company.ticker}
                          </span>
                        </div>
                        <span
                          className="shrink-0 rounded-md px-2 py-0.5 font-mono text-xs font-bold"
                          style={{
                            backgroundColor: `${color}18`,
                            color: color,
                          }}
                        >
                          {a.score.total !== null ? `${fmtScore(a.score.total)} pts` : "N/A"}
                        </span>
                      </div>

                      <div className="mt-3 space-y-2.5">
                        {CATEGORIAS.map(({ key, label }) => {
                          const val = a.score.categorias[key].valor;
                          const pct = Math.min(100, Math.max(0, val ?? 0));
                          return (
                            <div key={key} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-ink-muted font-medium">{label}</span>
                                <span className="font-mono font-bold text-ink">
                                  {val !== null ? `${Math.round(val)} / 100` : "N/A"}
                                </span>
                              </div>
                              <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/80">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${pct}%`,
                                    backgroundColor: color,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="mt-4 text-xs text-ink-muted">
              Valores normalizados de 0 a 100. En entidades financieras donde no aplican ratios operativos o de inventario, se indican como N/A.
            </p>
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
            <p className="mt-1 text-xs text-ink-muted">
              Cada empresa cierra su balance en fechas distintas: se alinean por ejercicio (el último con el último).
              {metricaInfo.tipo === "money" && " Importes en US$ al tipo de cambio actual."}
              {metricaInfo.tipo === "money" && hayARS && " Las cifras en pesos no están ajustadas por inflación: su evolución nominal no es comparable en términos reales."}
            </p>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolucionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
                  <XAxis dataKey="periodo" stroke="rgb(var(--ink-muted))" fontSize={12} />
                  <YAxis
                    stroke="rgb(var(--ink-muted))"
                    fontSize={12}
                    width={70}
                    tickFormatter={(v: number) => formatearPorTipo(v, metricaInfo.tipo)}
                  />
                  <RechartsTooltip
                    contentStyle={TOOLTIP_CONTENT_STYLE}
                    labelStyle={TOOLTIP_LABEL_STYLE}
                    formatter={(v: number) => formatearPorTipo(v, metricaInfo.tipo)}
                  />
                  <Legend />
                  {analisis.map((a, i) => (
                    <Line
                      key={a.company.ticker}
                      type="monotone"
                      dataKey={a.company.ticker}
                      name={a.company.fuente === "propia" ? `${a.company.nombre} (mi empresa)` : `${a.company.nombre} (${a.company.ticker})`}
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
              Orden de las empresas seleccionadas según su Score Centinela, de mayor a menor. No implica una
              recomendación de inversión.
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
                    <span className="text-xs text-ink-muted">{nombreMercado(a.company.mercado)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-ink">
                      {a.score.total !== null
                        ? `${fmtScore(a.score.total)} / 100`
                        : a.aplicaModeloCorporativo
                        ? "N/D"
                        : "N/A"}
                    </span>
                    <Badge estado={a.score.estado} texto={ESTADO_LABEL[a.score.estado]} />
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
