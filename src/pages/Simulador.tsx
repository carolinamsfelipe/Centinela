import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ALTMAN_THRESHOLDS } from "@/lib/financial/altman";
import type { EscenarioSimulado, SupuestosSimulacion } from "@/lib/financial/simulation";
import { simularEscenarios } from "@/lib/financial/simulation";
import { esEntidadFinanciera } from "@/lib/financial/analysis";
import { fmtMonto, fmtNum, fmtPct } from "@/lib/format";
import { getCompanies } from "@/services/companyService";
import type { Company } from "@/types";

const DEFAULTS = {
  crecimiento: 5,
  margen: 10,
  variacionDeuda: 0,
  tasaInteres: 35,
};

function CampoNumero({
  label,
  value,
  onChange,
  step = 1,
  sufijo = "%",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  sufijo?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink-muted">{label}</span>
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
    <Card>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-ink">{escenario.etiqueta}</h3>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${ESCENARIO_BADGE_CLASSES[escenario.nombre]}`}
          >
            Escenario hipotético
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
          <div className="text-xs text-ink-muted">Resultado neto proyectado</div>
          <div className="mt-1 font-mono font-semibold text-ink">{fmtMonto(metricas.netIncome, company)}</div>
        </div>
        <div>
          <div className="text-xs text-ink-muted">Margen neto proyectado</div>
          <div className="mt-1 font-mono font-semibold text-ink">{fmtPct(metricas.margenNeto)}</div>
        </div>
        <div>
          <div className="text-xs text-ink-muted">Deuda/Patrimonio proyectada</div>
          <div className="mt-1 font-mono font-semibold text-ink">{fmtNum(metricas.debtToEquity)}x</div>
        </div>
      </div>

      <div className="mt-4 border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Score Centinela</span>
          <span className="font-mono text-lg font-bold text-ink">{score.total ?? "N/D"} / 100</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Altman Z''</span>
          <span className="font-mono text-lg font-bold text-ink">{fmtNum(altman.zScore)}</span>
        </div>
        <p className="mt-1 text-[11px] text-ink-muted">
          Distress &lt; {ALTMAN_THRESHOLDS.distress} · Zona gris · Segura &gt; {ALTMAN_THRESHOLDS.safe}
        </p>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-bg/60 p-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
          Supuestos aplicados en este escenario
        </div>
        <dl className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
          <dt className="text-ink-muted">Crecimiento revenue</dt>
          <dd className="text-right font-mono text-ink">{fmtPct(escenario.supuestos.crecimientoRevenue)}</dd>
          <dt className="text-ink-muted">Margen neto objetivo</dt>
          <dd className="text-right font-mono text-ink">{fmtPct(escenario.supuestos.margenNeto)}</dd>
          <dt className="text-ink-muted">Variación de deuda</dt>
          <dd className="text-right font-mono text-ink">{fmtPct(escenario.supuestos.variacionDeuda)}</dd>
          <dt className="text-ink-muted">Tasa de interés</dt>
          <dd className="text-right font-mono text-ink">{fmtPct(escenario.supuestos.tasaInteres)}</dd>
        </dl>
        {difiereDelBase && (
          <p className="mt-2 text-[11px] text-ink-muted">
            Supuestos ajustados a partir del escenario base ingresado
            (crecimiento {fmtPct(supuestosBase.crecimientoRevenue)}, margen {fmtPct(supuestosBase.margenNeto)},
            deuda {fmtPct(supuestosBase.variacionDeuda)}, tasa {fmtPct(supuestosBase.tasaInteres)}) mediante
            multiplicadores fijos y documentados, no mediante un cálculo estadístico.
          </p>
        )}
      </div>
    </Card>
  );
}

export function Simulador() {
  const [empresas, setEmpresas] = useState<Company[]>([]);
  const [ticker, setTicker] = useState<string>("");
  const [crecimiento, setCrecimiento] = useState<number>(DEFAULTS.crecimiento);
  const [margen, setMargen] = useState<number>(DEFAULTS.margen);
  const [variacionDeuda, setVariacionDeuda] = useState<number>(DEFAULTS.variacionDeuda);
  const [tasaInteres, setTasaInteres] = useState<number>(DEFAULTS.tasaInteres);

  useEffect(() => {
    getCompanies().then((todas) => {
      // El modelo (Altman, liquidez, endeudamiento) no aplica a bancos: no se simulan.
      const cs = todas.filter((c) => !esEntidadFinanciera(c));
      setEmpresas(cs);
      if (cs.length > 0) setTicker((prev) => prev || cs[0].ticker);
    });
  }, []);

  const company = useMemo(() => empresas.find((c) => c.ticker === ticker), [empresas, ticker]);

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
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <h1 className="text-2xl font-bold text-ink">Simulador de escenarios</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Explorá qué pasaría con los indicadores de una empresa bajo distintos supuestos de
        crecimiento, margen y deuda.
      </p>

      <Card className="mt-4 border-accent/30 bg-accent-soft">
        <div className="flex items-start gap-2">
          <span aria-hidden="true">⚠️</span>
          <p className="text-sm text-ink">
            <strong>Escenario hipotético.</strong> Todo lo que ves en esta página es el resultado de
            una proyección lineal simple a partir de los supuestos que elegís abajo: un ejercicio de
            &quot;¿qué pasaría si...?&quot;, no una descripción de lo que va a ocurrir con la empresa.
            Cambiá los supuestos libremente para ver cómo responden los indicadores.
          </p>
        </div>
      </Card>

      <Card className="mt-6">
        <h2 className="font-semibold text-ink">Supuestos del escenario base</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="block">
            <span className="text-sm font-medium text-ink-muted">Empresa</span>
            <select
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-ink focus-ring"
            >
              {empresas.map((c) => (
                <option key={c.ticker} value={c.ticker}>
                  {c.fuente === "propia" ? `${c.nombre} (mi empresa)` : `${c.nombre} (${c.ticker})`}
                </option>
              ))}
            </select>
          </label>

          <CampoNumero label="Crecimiento de revenue" value={crecimiento} onChange={setCrecimiento} />
          <CampoNumero label="Margen neto objetivo" value={margen} onChange={setMargen} />
          <CampoNumero label="Variación de deuda" value={variacionDeuda} onChange={setVariacionDeuda} />
          <CampoNumero label="Tasa de interés" value={tasaInteres} onChange={setTasaInteres} />
        </div>
        <p className="mt-3 text-xs text-ink-muted">
          Los escenarios &quot;Optimista&quot; y &quot;Adverso&quot; se calculan ajustando estos
          supuestos base con multiplicadores fijos (ver código del simulador), no son supuestos
          independientes que tengas que completar. Los bancos y entidades financieras no se
          simulan: el Altman Z&apos;&apos; y los umbrales de liquidez y endeudamiento no se les aplican.
        </p>
      </Card>

      {!company || !resultado ? (
        <Card className="mt-6 text-center text-ink-muted">Seleccioná una empresa para simular escenarios.</Card>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <ScenarioCard escenario={resultado.base} supuestosBase={supuestosBase} company={company} />
          <ScenarioCard escenario={resultado.optimista} supuestosBase={supuestosBase} company={company} />
          <ScenarioCard escenario={resultado.adverso} supuestosBase={supuestosBase} company={company} />
        </div>
      )}

      <p className="mt-6 text-center text-xs text-ink-muted">
        ¿Querés entender cómo se calculan el Score Centinela y el Altman Z&apos;&apos; reales?{" "}
        <Link to="/metodologia" className="underline">
          Ver metodología
        </Link>
        .
      </p>
    </div>
  );
}
