import { Card } from "@/components/ui/Card";
import { NORMALIZATION, SCORE_WEIGHTS } from "@/lib/financial/scoreConfig";
import { ALTMAN_THRESHOLDS } from "@/lib/financial/altman";

export function Metodologia() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 lg:px-8">
      <h1 className="text-2xl font-bold text-ink">Metodología</h1>
      <p className="mt-2 text-ink-muted">
        La transparencia metodológica es parte central de Centinela PyME. Esta página documenta
        cómo se calcula cada indicador, qué supuestos usa y qué limitaciones tiene.
      </p>

      <Card className="mt-6">
        <h2 className="font-semibold text-ink">Altman Z'' Score</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Modelo de riesgo de insolvencia para mercados emergentes (Altman, Hartzell &amp; Peck, 1995):
        </p>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-bg p-3 font-mono text-xs text-ink">
{`Z'' = 6.56·X1 + 3.26·X2 + 6.72·X3 + 1.05·X4

X1 = Capital de trabajo / Activo total
X2 = Resultados acumulados / Activo total
X3 = EBIT / Activo total
X4 = Valor de mercado del patrimonio / Pasivo total`}
        </pre>
        <p className="mt-2 text-sm text-ink-muted">
          Zonas: distress &lt; {ALTMAN_THRESHOLDS.distress} · zona gris {ALTMAN_THRESHOLDS.distress}–{ALTMAN_THRESHOLDS.safe} ·
          segura &gt; {ALTMAN_THRESHOLDS.safe}. Es el modelo original (sin la constante +3.25 que
          publican algunas fuentes), con estos cortes — una convención internamente consistente.
        </p>
        <p className="mt-2 text-xs text-ink-muted">
          Limitación: calibrado con datos de EE.UU. y mercados emergentes en general, no
          específicamente para PyMEs ni empresas argentinas por sector.
        </p>
      </Card>

      <Card className="mt-6">
        <h2 className="font-semibold text-ink">Score Centinela</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Combina cinco categorías normalizadas a una escala 0–100, cada una ponderada según{" "}
          <code className="font-mono text-xs">scoreConfig.ts</code>:
        </p>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-left text-ink-muted">
              <th className="pb-1">Categoría</th>
              <th className="pb-1">Peso</th>
              <th className="pb-1">Basada en</th>
            </tr>
          </thead>
          <tbody className="text-ink">
            <tr><td>Solvencia</td><td>{SCORE_WEIGHTS.solvencia * 100}%</td><td>Altman Z'' normalizado</td></tr>
            <tr><td>Liquidez</td><td>{SCORE_WEIGHTS.liquidez * 100}%</td><td>Liquidez corriente</td></tr>
            <tr><td>Rentabilidad</td><td>{SCORE_WEIGHTS.rentabilidad * 100}%</td><td>Promedio de ROE, ROA y margen neto</td></tr>
            <tr><td>Endeudamiento</td><td>{SCORE_WEIGHTS.endeudamiento * 100}%</td><td>Deuda/Patrimonio (invertido)</td></tr>
            <tr><td>Eficiencia</td><td>{SCORE_WEIGHTS.eficiencia * 100}%</td><td>Margen EBIT</td></tr>
          </tbody>
        </table>
        <p className="mt-3 text-xs text-ink-muted">
          Si una categoría no tiene datos suficientes, se excluye del promedio y se redistribuye el
          peso entre las categorías disponibles — nunca se completa con un valor inventado. El
          cálculo (<code className="font-mono">scores.ts</code>), la visualización y la
          interpretación están separados a propósito, para poder ajustar la fórmula sin tocar la UI.
          El score es orientativo, no una verdad absoluta.
        </p>
      </Card>

      <Card className="mt-6">
        <h2 className="font-semibold text-ink">Señales Centinela</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Surgen de reglas explícitas en <code className="font-mono text-xs">signalRules.ts</code> que
          comparan el último período disponible contra el anterior (variación de ROE, deuda,
          margen, Altman, liquidez). No hay señales inferidas por un modelo de lenguaje ni
          generadas sin una regla documentada que las respalde.
        </p>
      </Card>

      <Card className="mt-6">
        <h2 className="font-semibold text-ink">Datos y actualización</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Ver la sección <a href="/fuentes" className="underline">Fuentes</a> para el detalle de qué
          dato viene de qué fuente, con qué frecuencia y desde cuándo.
        </p>
      </Card>
    </div>
  );
}
