import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { TOOLTIP_CONTENT_STYLE, TOOLTIP_LABEL_STYLE } from "@/components/charts/chartStyle";
import { Badge } from "@/components/ui/Badge";
import { BotonDescarga } from "@/components/ui/BotonDescarga";
import { Card, Tooltip } from "@/components/ui/Card";
import { Gauge } from "@/components/ui/Gauge";
import { MacroTicker } from "@/components/ui/MacroTicker";
import { nombreMercado, nombreSector } from "@/data/companies";
import { formatMacroValor, formatMacroVariacion, getContextoMercado, lineasContextoMacro } from "@/data/macro";
import { useFavorites } from "@/hooks/useFavorites";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { ALTMAN_THRESHOLDS } from "@/lib/financial/altman";
import { NOTA_ENTIDAD_FINANCIERA } from "@/lib/financial/analysis";
import { benchmarkPorMercado } from "@/lib/financial/benchmarks";
import { ESTADO_LABEL } from "@/lib/financial/diagnostics";
import { generarAnalisisEjecutivo } from "@/lib/financial/narrative";
import { fmtFecha, fmtMonto, fmtNum, fmtPct, fmtX } from "@/lib/format";
import { descargarExcelEmpresa } from "@/lib/reports/comparativo";
import { descargarInformeEmpresa, textoFuente } from "@/lib/reports/informeEmpresa";
import { construirPayloadAnalisis, generarAnalisisIA } from "@/services/aiService";
import type { AnalisisIA } from "@/services/aiService";
import { getCompanies, getCompanyAnalysis } from "@/services/companyService";
import { getMacroIndicators } from "@/services/macroService";
import type { MacroResultado } from "@/services/macroService";
import { eliminarEmpresaPropia } from "@/services/userCompanies";
import type { Company, HistoricalPoint } from "@/types";

type AnalisisEmpresa = Awaited<ReturnType<typeof getCompanyAnalysis>>;

const METRICAS_TOOLTIP: Record<string, string> = {
  "Market Cap": "Valor total de mercado de la empresa: precio de la acción multiplicado por la cantidad de acciones en circulación.",
  Revenue: "Ingresos totales generados por la empresa en el período.",
  EBITDA: "Resultado antes de intereses, impuestos, depreciación y amortización. Mide la rentabilidad operativa antes de decisiones financieras y contables.",
  "Net Income": "Resultado neto final del período, después de todos los costos, impuestos e intereses.",
  "Free Cash Flow": "Flujo de caja operativo menos inversiones en activos fijos: el efectivo que genera la empresa después de sostener su negocio.",
  ROE: "Rentabilidad sobre el patrimonio: resultado neto dividido por el patrimonio neto. Mide cuánto rinde el capital de los accionistas.",
  ROA: "Rentabilidad sobre los activos: resultado neto dividido por el activo total.",
  "Debt/Equity": "Relación entre deuda total y patrimonio neto. Un valor elevado puede reflejar mayor utilización de financiamiento mediante deuda, aunque su interpretación depende del sector.",
  "Current Ratio": "Activo corriente sobre pasivo corriente: capacidad de cubrir obligaciones de corto plazo.",
  "Quick Ratio": "Como el Current Ratio pero sin inventarios: capacidad de cubrir el corto plazo con activos de rápida conversión.",
  "P/E": "Precio de la acción sobre ganancia por acción. Indica cuántas veces se paga la ganancia anual.",
  "P/B": "Valor de mercado sobre patrimonio neto contable.",
  "EV/EBITDA": "Valor de la empresa (market cap + deuda - caja) sobre EBITDA. Múltiplo de valuación comparable entre empresas.",
};

type TipoFormato = "pct" | "money" | "x" | "num";
type MetricaHistorica = keyof Omit<HistoricalPoint, "periodo">;

const METRICAS_HISTORICAS: Array<{ id: MetricaHistorica; label: string; tipo: TipoFormato }> = [
  { id: "roe", label: "ROE", tipo: "pct" },
  { id: "roa", label: "ROA", tipo: "pct" },
  { id: "debtToEquity", label: "Debt/Equity", tipo: "x" },
  { id: "revenue", label: "Revenue", tipo: "money" },
  { id: "netIncome", label: "Net Income", tipo: "money" },
  { id: "ebitda", label: "EBITDA", tipo: "money" },
  { id: "freeCashFlow", label: "Free Cash Flow", tipo: "money" },
  { id: "altmanZ", label: "Altman Z''", tipo: "num" },
  { id: "centinelaScore", label: "Score Centinela", tipo: "num" },
];

function formatearHistorico(v: number | null, tipo: TipoFormato, company: Company): string {
  if (v === null) return "N/D";
  switch (tipo) {
    case "pct":
      return fmtPct(v);
    case "money":
      return fmtMonto(v, company, "nativa");
    case "x":
      return fmtX(v);
    case "num":
      return fmtNum(v);
  }
}

/** Estado del "Analisis contextual con IA" (solo se genera cuando el usuario lo pide). */
type EstadoIA =
  | { fase: "inactivo" }
  | { fase: "cargando" }
  | { fase: "listo"; resultado: AnalisisIA }
  | { fase: "sinConfigurar" }
  | { fase: "error"; mensaje: string; limite: boolean };

/** El modelo a veces devuelve marcas de Markdown: se muestran como texto plano. */
function textoPlanoIA(texto: string): string {
  return texto
    .replace(/\*\*/g, "")
    .replace(/^#{1,6}\s*/gm, "")
    .trim();
}

function Aviso({ tipo, children }: { tipo: "info" | "warn"; children: ReactNode }) {
  const clase = tipo === "warn" ? "border-warn/40 bg-warn-soft text-warn" : "border-border bg-surface text-ink-muted";
  return (
    <div role="note" className={`mt-4 rounded-xl border p-3 text-sm ${clase}`}>
      {children}
    </div>
  );
}

export function CompanyDetail() {
  const { ticker } = useParams<{ ticker: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<AnalisisEmpresa | null | undefined>(undefined);
  const { isFavorite, toggleFavorite } = useFavorites();
  const [macro, setMacro] = useState<MacroResultado | null>(null);
  const [universo, setUniverso] = useState<Company[] | null>(null);
  const [metricaHist, setMetricaHist] = useState<MetricaHistorica>("roe");
  const [ia, setIa] = useState<EstadoIA>({ fase: "inactivo" });
  const pedidoIa = useRef(0);

  useDocumentTitle(data ? `Centinela — ${data.company.nombre}` : "Centinela");

  useEffect(() => {
    if (!ticker) return;
    setData(undefined);
    getCompanyAnalysis(ticker).then((d) => setData(d ?? null));
  }, [ticker]);

  useEffect(() => {
    getMacroIndicators().then(setMacro);
  }, []);

  // Al cambiar de empresa se descarta el analisis de IA anterior (y se ignora cualquier respuesta en vuelo).
  useEffect(() => {
    pedidoIa.current += 1;
    setIa({ fase: "inactivo" });
  }, [ticker]);

  useEffect(() => {
    let activo = true;
    getCompanies().then((c) => {
      if (activo) setUniverso(c);
    });
    return () => {
      activo = false;
    };
  }, []);

  const metricaInfo = useMemo(
    () => METRICAS_HISTORICAS.find((m) => m.id === metricaHist) ?? METRICAS_HISTORICAS[0],
    [metricaHist]
  );

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

  const { company, altman, score, senales, aplicaModeloCorporativo } = data;
  const m = company.metrics;
  const esPropia = company.fuente === "propia";
  const sinDatos = !esPropia && !company.envivo && m.activosTotales === null;

  const contexto = macro ? getContextoMercado(company.mercado, company.sector, macro.indicadores, macro.globales) : [];
  const lineasMacro = lineasContextoMacro(contexto);
  const analisis = generarAnalisisEjecutivo(company, altman, lineasMacro);
  const benchmark = universo ? benchmarkPorMercado(company, universo) : null;
  const mon = (v: number | null) => fmtMonto(v, company);
  /** Texto del analisis contextual con IA (null si todavia no se generó). Disponible para el informe PDF. */
  const analisisIA: string | null = ia.fase === "listo" ? textoPlanoIA(ia.resultado.texto) : null;

  const metricas: Array<{ label: string; valor: string }> = [
    { label: "Market Cap", valor: mon(m.marketCap) },
    { label: "Revenue", valor: mon(m.revenue) },
    { label: "EBITDA", valor: mon(m.ebitda) },
    { label: "Net Income", valor: mon(m.netIncome) },
    { label: "Free Cash Flow", valor: mon(m.freeCashFlow) },
    { label: "ROE", valor: fmtPct(m.roe) },
    { label: "ROA", valor: fmtPct(m.roa) },
    { label: "Debt/Equity", valor: fmtX(m.debtToEquity) },
    { label: "Current Ratio", valor: fmtNum(m.currentRatio) },
    { label: "Quick Ratio", valor: fmtNum(m.quickRatio) },
    { label: "P/E", valor: fmtNum(m.pe) },
    { label: "P/B", valor: fmtNum(m.pb) },
    { label: "EV/EBITDA", valor: fmtNum(m.evEbitda) },
  ];

  async function descargarPdf() {
    const todas = universo ?? (await getCompanies());
    await descargarInformeEmpresa({
      company,
      altman,
      score,
      senales,
      analisis,
      benchmark: benchmarkPorMercado(company, todas),
      contextoMacro: lineasMacro,
      analisisIA,
    });
  }

  async function generarIA(forzar = false) {
    const pedido = ++pedidoIa.current;
    setIa({ fase: "cargando" });
    const payload = construirPayloadAnalisis({ company, altman, score, analisis, benchmark, lineasMacro });
    const r = await generarAnalisisIA(payload, { forzar });
    if (pedido !== pedidoIa.current) return;
    if (r.ok) {
      setIa({ fase: "listo", resultado: { texto: r.texto, proveedor: r.proveedor, modelo: r.modelo, generado: r.generado } });
    } else if (r.sinConfigurar) {
      setIa({ fase: "sinConfigurar" });
    } else {
      setIa({ fase: "error", mensaje: r.mensaje, limite: r.limite });
    }
  }

  async function descargarExcel() {
    await descargarExcelEmpresa({ company, altman, score });
  }

  function eliminar() {
    if (!window.confirm(`¿Eliminar "${company.nombre}" de tus empresas? Esta acción no se puede deshacer.`)) return;
    eliminarEmpresaPropia(company.ticker);
    navigate("/mi-empresa");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-ink">{company.nombre}</h1>
            {!esPropia && <span className="font-mono text-sm text-ink-muted">{company.ticker}</span>}
            {esPropia && (
              <span className="inline-flex items-center rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent">
                Balance propio
              </span>
            )}
            {!esPropia && company.envivo && <Badge estado="normal" texto="En vivo" />}
            {!esPropia && !company.envivo && <Badge estado="sin_datos" texto="Datos de respaldo" />}
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            {nombreSector(company.sector)} · {nombreMercado(company.mercado)}
            {company.pais !== nombreMercado(company.mercado) ? ` (${company.pais})` : ""} · {company.tamano} · Balance al{" "}
            {fmtFecha(m.periodo)} · Reporta en {company.monedaReporte}
          </p>
          <p className="mt-1 text-xs text-ink-muted">{textoFuente(company)}</p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <Badge estado={score.estado} />
          <BotonDescarga label="Descargar informe PDF" variante="principal" onDescargar={descargarPdf} disabled={sinDatos} />
          <BotonDescarga label="Descargar Excel" onDescargar={descargarExcel} disabled={sinDatos} />
          <Link
            to={`/comparador?empresas=${encodeURIComponent(company.ticker)}`}
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
          {esPropia && (
            <button
              onClick={eliminar}
              className="rounded-lg border border-border px-3 py-2 text-sm text-ink-muted hover:text-bad focus-ring"
            >
              Eliminar
            </button>
          )}
        </div>
      </div>

      {macro && contexto.length > 0 && (
        <div className="mt-6">
          <MacroTicker indicadores={contexto.map((c) => c.indicador)} envivo={macro.envivo} />
        </div>
      )}

      {sinDatos && (
        <Aviso tipo="warn">
          No se pudo consultar Yahoo Finance en este momento y no hay un respaldo guardado para esta empresa. Probá de
          nuevo en unos minutos: no se muestran cifras inventadas.
        </Aviso>
      )}
      {!esPropia && !company.envivo && !sinDatos && (
        <Aviso tipo="warn">
          No se pudo conectar con Yahoo Finance en este momento: se muestra el último dato guardado de una captura
          anterior.
        </Aviso>
      )}
      {(company.notas ?? []).map((nota) => (
        <Aviso key={nota} tipo="info">
          {nota}
        </Aviso>
      ))}

      <Card className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Resumen financiero</h2>
        <p className="mt-2 text-ink">{analisis.resumen}</p>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-ink">Score Centinela</h2>
            <Badge estado={score.estado} />
          </div>
          <div className="mt-3 font-mono text-4xl font-bold text-ink">
            {score.total ?? "N/A"} <span className="text-base font-normal text-ink-muted">/ 100</span>
          </div>
          {aplicaModeloCorporativo ? (
            <>
              <p className="mt-2 text-sm text-ink-muted">
                El score combina indicadores de solvencia, liquidez, rentabilidad, endeudamiento y eficiencia. Ver{" "}
                <Link to="/metodologia" className="underline">
                  metodología
                </Link>
                .
              </p>
              <div className="mt-4 space-y-2">
                {Object.values(score.categorias).map((c) => (
                  <div key={c.nombre} className="flex items-center gap-3">
                    <span className="w-32 text-sm text-ink-muted">{c.nombre}</span>
                    <div className="h-2 flex-1 rounded-full bg-border">
                      <div className="h-2 rounded-full bg-accent" style={{ width: `${c.valor ?? 0}%` }} />
                    </div>
                    <span className="w-10 text-right font-mono text-sm">{c.valor !== null ? Math.round(c.valor) : "N/D"}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-ink-muted">{NOTA_ENTIDAD_FINANCIERA}</p>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-ink">Altman Z&apos;&apos;</h2>
            <Badge estado={analisis.altman.estado} />
          </div>
          {aplicaModeloCorporativo ? (
            <>
              <Gauge value={altman.zScore} min={0} max={5} zonas={[ALTMAN_THRESHOLDS.distress, ALTMAN_THRESHOLDS.safe]} />
              <div className="text-center font-mono text-2xl font-bold text-ink">{fmtNum(altman.zScore)}</div>
              <p className="mt-2 text-center text-sm text-ink-muted">
                Distress &lt; {ALTMAN_THRESHOLDS.distress} · Zona gris · Segura &gt; {ALTMAN_THRESHOLDS.safe}
              </p>
              <p className="mt-2 text-center text-sm text-ink-muted">{analisis.altman.texto}</p>
              <p className="mt-3 text-xs text-ink-muted">
                El Altman Z&apos;&apos; Score es un modelo de riesgo financiero basado en determinados indicadores contables
                (Altman, Hartzell &amp; Peck, 1995). No constituye una predicción individual ni una recomendación de
                inversión.
              </p>
            </>
          ) : (
            <p className="mt-4 text-sm text-ink-muted">{analisis.altman.texto}</p>
          )}
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="font-semibold text-ink">Estado financiero</h2>
        <p className="mt-1 text-xs text-ink-muted">Cada tarjeta muestra con qué umbral se asigna su color.</p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {analisis.situacion.map((s) => (
            <div key={s.id} className="rounded-lg border border-border p-3">
              <div className="text-xs text-ink-muted">{s.nombre}</div>
              <div className="mt-1 font-mono text-xl font-semibold">{s.valorTexto}</div>
              <div className="mt-1">
                <Badge estado={s.estado} texto={ESTADO_LABEL[s.estado]} />
              </div>
              <div className="mt-2 text-[11px] leading-snug text-ink-muted">{s.criterio}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-6">
        <h2 className="font-semibold text-ink">Indicadores fundamentales</h2>
        {company.monedaReporte !== "USD" && (
          <p className="mt-1 text-xs text-ink-muted">
            Importes en US$ al tipo de cambio actual
            {company.tipoCambioUsd ? ` (${fmtNum(company.tipoCambioUsd)} ${company.monedaReporte} por USD)` : " (sin cotización disponible: se muestran en " + company.monedaReporte + ")"}
            ; la empresa reporta en {company.monedaReporte}.
          </p>
        )}
        <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
          {metricas.map((met) => (
            <div key={met.label}>
              <div className="flex items-center gap-1 text-xs text-ink-muted">
                {METRICAS_TOOLTIP[met.label] ? <Tooltip texto={METRICAS_TOOLTIP[met.label]}>{met.label}</Tooltip> : met.label}
              </div>
              <div className="mt-1 font-mono font-semibold text-ink">{met.valor}</div>
            </div>
          ))}
        </div>
      </Card>

      {company.historico.length > 1 && (
        <Card className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold text-ink">Evolución histórica — {metricaInfo.label}</h2>
            <select
              value={metricaHist}
              onChange={(e) => setMetricaHist(e.target.value as MetricaHistorica)}
              aria-label="Métrica de evolución histórica"
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus-ring"
            >
              {METRICAS_HISTORICAS.map((mt) => (
                <option key={mt.id} value={mt.id}>
                  {mt.label}
                </option>
              ))}
            </select>
          </div>
          {metricaInfo.tipo === "money" && (
            <p className="mt-1 text-xs text-ink-muted">Importes en {company.monedaReporte} (moneda de reporte).</p>
          )}
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={company.historico}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
                <XAxis dataKey="periodo" stroke="rgb(var(--ink-muted))" fontSize={12} />
                <YAxis
                  stroke="rgb(var(--ink-muted))"
                  fontSize={12}
                  width={70}
                  tickFormatter={(v: number) => formatearHistorico(v, metricaInfo.tipo, company)}
                />
                <RechartsTooltip
                  contentStyle={TOOLTIP_CONTENT_STYLE}
                  labelStyle={TOOLTIP_LABEL_STYLE}
                  formatter={(v: number) => [formatearHistorico(v, metricaInfo.tipo, company), metricaInfo.label]}
                />
                <Line type="monotone" dataKey={metricaHist} stroke="rgb(var(--accent))" strokeWidth={2} dot connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {company.historico.every((h) => h[metricaHist] === null) && (
            <p className="mt-2 text-xs text-ink-muted">
              Esta métrica no está disponible para los ejercicios de esta empresa (sin dato, no se estima).
            </p>
          )}
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
                <span aria-hidden="true">{s.tipo === "positiva" ? "🟢" : s.tipo === "advertencia" ? "🟡" : "🔴"}</span>
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-ink">Comparación con el sector en otros mercados</h2>
          <Link
            to={`/comparador?empresas=${encodeURIComponent(company.ticker)}`}
            className="text-sm text-accent hover:underline"
          >
            Armar una comparación →
          </Link>
        </div>
        <p className="mt-1 text-xs text-ink-muted">
          Mediana de cada indicador entre las empresas de {nombreSector(company.sector)} que cotizan en cada mercado,
          contra esta empresa. Con pocas empresas por grupo es una referencia, no un promedio sectorial oficial.
        </p>
        {benchmark === null ? (
          <p className="mt-3 text-sm text-ink-muted">Calculando con datos en vivo de todo el universo...</p>
        ) : benchmark.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">
            No hay otras empresas de {nombreSector(company.sector)} en el universo de Centinela para comparar.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-ink-muted [&>th]:px-3 [&>th]:py-2">
                  <th>Grupo</th>
                  <th>Empresas</th>
                  <th>ROE</th>
                  <th>Margen neto</th>
                  <th>Debt/Equity</th>
                  <th>Liquidez</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                <tr className="border-b border-border bg-accent-soft/30 [&>td]:px-3 [&>td]:py-2">
                  <td className="font-sans font-semibold text-ink">Esta empresa ({nombreMercado(company.mercado)})</td>
                  <td>1</td>
                  <td>{fmtPct(m.roe)}</td>
                  <td>{fmtPct(m.margenNeto)}</td>
                  <td>{fmtX(m.debtToEquity)}</td>
                  <td>{fmtNum(m.currentRatio)}</td>
                  <td>{score.total ?? "N/A"}</td>
                </tr>
                {benchmark.map((b) => (
                  <tr key={b.mercado} className="border-b border-border last:border-0 [&>td]:px-3 [&>td]:py-2">
                    <td className="font-sans text-ink">Sector en {nombreMercado(b.mercado)}</td>
                    <td>{b.grupo.cantidadEmpresas}</td>
                    <td>{fmtPct(b.grupo.roe)}</td>
                    <td>{fmtPct(b.grupo.margenNeto)}</td>
                    <td>{fmtX(b.grupo.debtToEquity)}</td>
                    <td>{fmtNum(b.grupo.currentRatio)}</td>
                    <td>{b.grupo.score !== null ? Math.round(b.grupo.score) : "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="mt-6">
        <h2 className="font-semibold text-ink">Contexto macroeconómico — {nombreMercado(company.mercado)}</h2>
        <p className="mt-1 text-xs text-ink-muted">
          {macro === null
            ? "Consultando fuentes en vivo..."
            : macro.envivo
              ? "Datos en vivo."
              : "No se pudo conectar en vivo: se muestra el último respaldo guardado."}{" "}
          Ver el detalle completo en{" "}
          <Link to="/macro" className="underline">
            /macro
          </Link>
          .
        </p>
        {macro !== null && contexto.length === 0 && (
          <p className="mt-3 text-sm text-ink-muted">No hay indicadores de contexto disponibles para este mercado en este momento.</p>
        )}
        <ul className="mt-4 space-y-3">
          {contexto.map(({ indicador, motivo }) => {
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
                <p className="mt-1 text-sm text-ink-muted">Este indicador puede ser relevante debido a que {motivo}</p>
                <p className="mt-1 text-xs text-ink-muted">
                  Dato al {indicador.fecha} · Fuente: {indicador.fuente}
                </p>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card className="mt-6">
        <h2 className="font-semibold text-ink">Aspectos para revisar</h2>
        <p className="mt-1 text-xs text-ink-muted">
          Preguntas sugeridas de due diligence, derivadas de los indicadores en atención o riesgo. Apoyo a la decisión,
          no un veredicto de crédito.
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-ink">
          {analisis.aspectosParaRevisar.map((pregunta) => (
            <li key={pregunta}>{pregunta}</li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-ink-muted">{analisis.nota}</p>
      </Card>

      <Card className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-ink">Análisis contextual con IA</h2>
          <span className="rounded-full border border-border px-2.5 py-1 text-xs text-ink-muted">
            Redactado con IA · orientativo, no es recomendación
          </span>
        </div>
        <p className="mt-1 text-xs text-ink-muted">
          Hipótesis generales sobre por qué podrían estar pasando estos números y cómo podrían afectarle el tipo de
          cambio, la inflación, las tasas y la competitividad de su sector frente a otros mercados. La IA solo redacta
          sobre las cifras ya calculadas en esta ficha: no calcula, no conoce hechos puntuales de la empresa y puede
          equivocarse.
        </p>

        {ia.fase === "inactivo" && (
          <>
            <p className="mt-3 text-xs text-ink-muted">
              {esPropia
                ? "Al generarlo se envían a un servicio externo de IA solo cifras agregadas de tu balance (importes, ratios y semáforo que ves en esta ficha); no se envía el archivo cargado. No se genera solo."
                : "Al generarlo se envían a un servicio externo de IA las cifras, ratios y contexto macro que ves en esta ficha. No se genera solo."}
            </p>
            <button
              type="button"
              onClick={() => void generarIA()}
              disabled={sinDatos}
              className="mt-3 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90 focus-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              Generar análisis
            </button>
          </>
        )}

        {ia.fase === "cargando" && (
          <p role="status" className="mt-4 text-sm text-ink-muted">
            Generando el análisis... puede tardar unos segundos.
          </p>
        )}

        {ia.fase === "listo" && (
          <>
            <div className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ink">{textoPlanoIA(ia.resultado.texto)}</div>
            <p className="mt-3 text-xs text-ink-muted">
              Redactado con IA ({ia.resultado.proveedor}
              {ia.resultado.modelo ? ` · ${ia.resultado.modelo}` : ""}) el {fmtFecha(ia.resultado.generado)}. Orientativo: no
              es una recomendación de inversión ni de crédito y puede contener errores.
            </p>
            <button
              type="button"
              onClick={() => void generarIA(true)}
              className="mt-2 rounded-lg border border-border px-3 py-1.5 text-xs text-ink-muted hover:text-ink focus-ring"
            >
              Volver a generar
            </button>
          </>
        )}

        {ia.fase === "error" && (
          <div role="alert" className="mt-4 rounded-xl border border-warn/40 bg-warn-soft p-3 text-sm text-warn">
            {ia.mensaje}
            {!ia.limite && (
              <button
                type="button"
                onClick={() => void generarIA(true)}
                className="ml-2 underline focus-ring"
              >
                Reintentar
              </button>
            )}
          </div>
        )}

        {ia.fase === "sinConfigurar" && (
          <div className="mt-4">
            <p className="text-sm text-ink-muted">
              El análisis con IA todavía no está activado en este despliegue. Mientras tanto, esta es la lectura
              determinística de la plataforma:
            </p>
            <p className="mt-3 text-sm text-ink">{analisis.resumen}</p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink">
              {analisis.aspectosParaRevisar.map((pregunta) => (
                <li key={pregunta}>{pregunta}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-ink-muted">
              Texto de respaldo, armado sin IA con los mismos indicadores y umbrales de arriba.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
