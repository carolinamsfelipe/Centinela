import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ALTMAN_THRESHOLDS, calcularAltman } from "@/lib/financial/altman";
import { calcularCentinelaScore } from "@/lib/financial/scores";
import type { EscenarioSimulado, SupuestosSimulacion } from "@/lib/financial/simulation";
import { simularEscenarios } from "@/lib/financial/simulation";
import { esEntidadFinanciera } from "@/lib/financial/analysis";
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
    <Card className="flex flex-col justify-between">
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
            <div className="text-xs text-ink-muted">Margen neto proyectado</div>
            <div className="mt-1 font-mono font-semibold text-ink">{fmtPct(metricas.margenNeto)}</div>
          </div>
          <div>
            <div className="text-xs text-ink-muted">Deuda/Patrimonio</div>
            <div className="mt-1 font-mono font-semibold text-ink">{fmtX(metricas.debtToEquity)}</div>
          </div>
        </div>

        <div className="mt-4 border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Score Centinela</span>
            <span className="font-mono text-lg font-bold text-ink">
              {score.total !== null ? `${fmtScore(score.total)} / 100` : "N/D"}
            </span>
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
          Supuestos de este escenario
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
        </dl>
        {difiereDelBase && (
          <p className="mt-2 text-[11px] text-ink-muted">
            Derivado del escenario base (crecimiento {fmtPct(supuestosBase.crecimientoRevenue)}, margen{" "}
            {fmtPct(supuestosBase.margenNeto)}, deuda {fmtPct(supuestosBase.variacionDeuda)}, tasa{" "}
            {fmtPct(supuestosBase.tasaInteres)}) mediante multiplicadores predefinidos.
          </p>
        )}
      </div>
    </Card>
  );
}

export function Simulador() {
  const [empresas, setEmpresas] = useState<Company[]>([]);
  const [ticker, setTicker] = useState<string>("");
  const [crecimiento, setCrecimiento] = useState<number>(5);
  const [margen, setMargen] = useState<number>(10);
  const [variacionDeuda, setVariacionDeuda] = useState<number>(0);
  const [tasaInteres, setTasaInteres] = useState<number>(5);

  useEffect(() => {
    getCompanies().then((todas) => {
      // El modelo (Altman, liquidez, endeudamiento) no aplica a bancos: no se simulan.
      const cs = todas.filter((c) => !esEntidadFinanciera(c));
      setEmpresas(cs);
      if (cs.length > 0) setTicker((prev) => prev || cs[0].ticker);
    });
  }, []);

  const company = useMemo(() => empresas.find((c) => c.ticker === ticker), [empresas, ticker]);

  const actualScore = useMemo(() => {
    if (!company) return null;
    return calcularCentinelaScore(company.metrics, company.metrics.marketCap);
  }, [company]);

  const actualAltman = useMemo(() => {
    if (!company) return null;
    return calcularAltman(company.metrics, company.metrics.marketCap);
  }, [company]);

  // Recalibración independiente al cambiar de empresa: elimina estado residual
  useEffect(() => {
    if (!company) return;
    setCrecimiento(5);
    setVariacionDeuda(0);
    setMargen(getMargenHistorico(company.metrics));
    setTasaInteres(getTasaInteresMercado(company.mercado));
  }, [company?.ticker]);

  const restablecerValoresBase = () => {
    if (!company) return;
    setCrecimiento(5);
    setVariacionDeuda(0);
    setMargen(getMargenHistorico(company.metrics));
    setTasaInteres(getTasaInteresMercado(company.mercado));
  };

  const supuestosBase: SupuestosSimulacion = useMemo(
    () => ({
      crecimientoRevenue: crecimiento / 100,
      margenNeto: margen / 100,
      variacionDeuda: variacionDeuda / 100,
      tasaInteres: tasaInteres / 100,
    }),
    [crecimiento, margen, variacionDeuda, tasaInteres]
  );

  const resultado = useMemo(() => {
    if (!company) return null;
    return simularEscenarios(company.metrics, supuestosBase, company.metrics.marketCap);
  }, [company, supuestosBase]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Simulador de escenarios</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Explorá el impacto sobre liquidez, rentabilidad, Score Centinela y solvencia bajo distintos
          supuestos operacionales y financieros.
        </p>
      </div>

      <Card className="border-accent/30 bg-accent-soft">
        <div className="flex items-start gap-2">
          <span aria-hidden="true" className="text-base">ℹ️</span>
          <p className="text-sm text-ink leading-relaxed">
            <strong>Proyección hipotética:</strong> Las simulaciones parten de los estados financieros
            históricos de la empresa seleccionada y aplican una proyección lineal de un período. No
            constituyen pronósticos de cotización ni metas auditadas.
          </p>
        </div>
      </Card>

      {/* ETAPA 1: HISTÓRICO */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
                1
              </span>
              <h2 className="text-lg font-semibold text-ink">Histórico: Base financiera real</h2>
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              Punto de partida del último ejercicio reportado sobre el que se aplican los supuestos.
            </p>
          </div>

          <div className="min-w-[220px]">
            <label className="block">
              <span className="text-xs font-medium text-ink-muted">Seleccionar empresa</span>
              <select
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-ink focus-ring font-medium"
              >
                {empresas.map((c) => (
                  <option key={c.ticker} value={c.ticker}>
                    {c.companyType === "user" ? `${c.nombre} (mi empresa)` : `${c.nombre} (${c.ticker})`}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {company && (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-lg bg-bg/50 p-3 border border-border/50">
              <span className="text-xs text-ink-muted">Revenue actual</span>
              <p className="mt-1 font-mono font-semibold text-ink text-sm">
                {fmtMonto(company.metrics.revenue, company)}
              </p>
              <span className="text-[10px] text-ink-muted">Moneda: {company.monedaReporte}</span>
            </div>
            <div className="rounded-lg bg-bg/50 p-3 border border-border/50">
              <span className="text-xs text-ink-muted">Resultado neto</span>
              <p className="mt-1 font-mono font-semibold text-ink text-sm">
                {fmtMonto(company.metrics.netIncome, company)}
              </p>
              <span className="text-[10px] text-ink-muted">Período {company.metrics.periodo || "N/D"}</span>
            </div>
            <div className="rounded-lg bg-bg/50 p-3 border border-border/50">
              <span className="text-xs text-ink-muted">Margen neto real</span>
              <p className="mt-1 font-mono font-semibold text-ink text-sm">
                {fmtPct(company.metrics.margenNeto)}
              </p>
              <span className="text-[10px] text-ink-muted">Histórico auditado</span>
            </div>
            <div className="rounded-lg bg-bg/50 p-3 border border-border/50">
              <span className="text-xs text-ink-muted">Deuda total actual</span>
              <p className="mt-1 font-mono font-semibold text-ink text-sm">
                {fmtMonto(company.metrics.deudaTotal, company)}
              </p>
              <span className="text-[10px] text-ink-muted">Pasivo financiero</span>
            </div>
            <div className="rounded-lg bg-bg/50 p-3 border border-border/50">
              <span className="text-xs text-ink-muted">Debt / Equity</span>
              <p className="mt-1 font-mono font-semibold text-ink text-sm">
                {fmtX(company.metrics.debtToEquity)}
              </p>
              <span className="text-[10px] text-ink-muted">Apalancamiento</span>
            </div>
            <div className="rounded-lg bg-bg/50 p-3 border border-border/50">
              <span className="text-xs text-ink-muted">Score / Altman actual</span>
              <p className="mt-1 font-mono font-semibold text-ink text-sm">
                {actualScore?.total !== null && actualScore?.total !== undefined
                  ? fmtScore(actualScore.total)
                  : "N/D"}{" "}
                · Z'' {fmtNum(actualAltman?.zScore)}
              </p>
              <span className="text-[10px] text-ink-muted">{company.mercado}</span>
            </div>
          </div>
        )}
      </Card>

      {/* ETAPA 2: SUPUESTOS */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
              2
            </span>
            <h2 className="text-lg font-semibold text-ink">Supuestos: Configuración del escenario base</h2>
          </div>
          <button
            type="button"
            onClick={restablecerValoresBase}
            className="text-xs font-medium text-accent hover:underline"
          >
            ↺ Restablecer a valores base de la empresa
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <CampoNumero
            label="Crecimiento de revenue"
            value={crecimiento}
            onChange={setCrecimiento}
            ayuda="Variación esperada de ventas en el próximo ejercicio."
          />
          <CampoNumero
            label="Margen neto objetivo"
            value={margen}
            onChange={setMargen}
            ayuda={`Calibrado según margen histórico real (${company ? fmtPct(company.metrics.margenNeto) : "N/D"}).`}
          />
          <CampoNumero
            label="Variación de deuda"
            value={variacionDeuda}
            onChange={setVariacionDeuda}
            ayuda="Expansión (+) o desendeudamiento (-) del pasivo financiero."
          />
          <CampoNumero
            label="Tasa de interés estimada"
            value={tasaInteres}
            onChange={setTasaInteres}
            ayuda={`Tasa de referencia para ${company?.mercado || "el mercado"} (${getTasaInteresMercado(company?.mercado)}%).`}
          />
        </div>
      </Card>

      {/* ETAPA 3: PROYECCIÓN */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
            3
          </span>
          <h2 className="text-lg font-semibold text-ink">Proyección: Escenarios comparados</h2>
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
        ¿Querés entender cómo se calculan el Score Centinela y el Altman Z&apos;&apos; reales?{" "}
        <Link to="/metodologia" className="underline">
          Ver metodología completa
        </Link>
        .
      </p>
    </div>
  );
}
