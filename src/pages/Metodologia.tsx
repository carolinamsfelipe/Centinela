import { Card } from "@/components/ui/Card";
import { NORMALIZATION, SCORE_WEIGHTS } from "@/lib/financial/scoreConfig";
import { ALTMAN_THRESHOLDS } from "@/lib/financial/altman";
import { SIGNAL_RULES } from "@/lib/financial/signalRules";

export function Metodologia() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 lg:px-8">
      <h1 className="text-2xl font-bold text-ink">Metodología</h1>
      <p className="mt-2 text-ink-muted">
        La transparencia metodológica es parte central de Centinela. Esta página documenta
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
          específicamente para empresas medianas o chicas ni para cada sector.
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
        <p className="mt-3 text-sm text-ink-muted">
          Cada categoría se normaliza de forma lineal a una escala 0–100 contra un tope fijo
          definido en <code className="font-mono text-xs">scoreConfig.ts</code>: Altman Z'' hasta{" "}
          {NORMALIZATION.altmanZMax}, liquidez corriente hasta {NORMALIZATION.liquidezMax}x, ROE
          hasta {NORMALIZATION.roeMax * 100}%, ROA hasta {NORMALIZATION.roaMax * 100}%, margen neto
          hasta {NORMALIZATION.margenNetoMax * 100}%, margen EBIT hasta{" "}
          {NORMALIZATION.ebitMarginMax * 100}% y deuda/patrimonio hasta{" "}
          {NORMALIZATION.deudaPatrimonioMax}x (este último caso, invertido: a menor deuda, mayor
          puntaje). Cualquier valor que supere el tope se recorta a 100; cualquier valor negativo se
          recorta a 0.
        </p>
        <p className="mt-3 text-xs text-ink-muted">
          Si una categoría no tiene datos suficientes, se excluye del promedio y se redistribuye el
          peso entre las categorías disponibles — nunca se completa con un valor inventado. El
          cálculo (<code className="font-mono">scores.ts</code>), la visualización y la
          interpretación están separados a propósito, para poder ajustar la fórmula sin tocar la UI.
          El score es orientativo, no una verdad absoluta.
        </p>
      </Card>

      <Card className="mt-6">
        <h2 className="font-semibold text-ink">Semáforo financiero</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Además del Score Centinela (una única lectura agregada), cada indicador se clasifica
          también de forma individual con reglas fijas en{" "}
          <code className="font-mono text-xs">diagnostics.ts</code> — es el detalle que se ve en la
          sección &quot;Estado financiero&quot; de cada ficha de empresa:
        </p>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-left text-ink-muted">
              <th className="pb-1">Indicador</th>
              <th className="pb-1">Riesgo</th>
              <th className="pb-1">Atención</th>
              <th className="pb-1">Saludable</th>
            </tr>
          </thead>
          <tbody className="text-ink">
            <tr><td>Liquidez corriente</td><td>&lt; 1</td><td>1 – 1.5</td><td>&gt; 1.5</td></tr>
            <tr><td>Endeudamiento (pasivo/activo)</td><td>&gt; 70%</td><td>50% – 70%</td><td>&lt; 50%</td></tr>
            <tr><td>Capital de trabajo / activos</td><td>&lt; 0</td><td>0% – 10%</td><td>&gt; 10%</td></tr>
            <tr><td>Deuda / patrimonio</td><td>&gt; 2x</td><td>1x – 2x</td><td>&lt; 1x</td></tr>
            <tr><td>ROE</td><td>&lt; 0%</td><td>0% – 15%</td><td>&gt; 15%</td></tr>
            <tr><td>ROA</td><td>&lt; 0%</td><td>0% – 5%</td><td>&gt; 5%</td></tr>
            <tr><td>Margen neto</td><td>&lt; 0%</td><td>0% – 10%</td><td>&gt; 10%</td></tr>
          </tbody>
        </table>
        <p className="mt-3 text-xs text-ink-muted">
          Estos cortes son criterios propios de la plataforma, no una norma contable: se eligieron
          para distinguir casos de riesgo relativamente claros sin requerir un benchmark por sector.
          Cuando el indicador no se puede calcular con los datos disponibles, se muestra como &quot;Sin
          información&quot; en vez de asumírsele un valor.
        </p>
      </Card>

      <Card className="mt-6">
        <h2 className="font-semibold text-ink">Señales Centinela</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Surgen de reglas explícitas en <code className="font-mono text-xs">signalRules.ts</code> que
          comparan el último período disponible contra el anterior. No hay señales inferidas por un
          modelo de lenguaje ni generadas sin una regla documentada que las respalde:
        </p>
        <ul className="mt-3 space-y-1.5 text-sm text-ink-muted">
          <li>• ROE sube ≥ {SIGNAL_RULES.ROE_CHANGE_THRESHOLD * 100} puntos porcentuales → mejora de rentabilidad.</li>
          <li>• Deuda/Patrimonio varía ≥ {SIGNAL_RULES.DEBT_CHANGE_THRESHOLD}x (en cualquier dirección) → aumento o reducción de endeudamiento.</li>
          <li>• Resultado neto cae ≥ {SIGNAL_RULES.MARGIN_CHANGE_THRESHOLD * 100}% en términos relativos respecto del período anterior con margen conocido → caída de margen.</li>
          <li>• Altman Z'' cae ≥ {SIGNAL_RULES.ALTMAN_DROP_THRESHOLD} puntos entre períodos → deterioro significativo de solvencia.</li>
          <li>• Liquidez corriente &lt; 1 en el último período → alerta de liquidez (se evalúa siempre, no depende del histórico).</li>
        </ul>
      </Card>

      <Card className="mt-6">
        <h2 className="font-semibold text-ink">Qué no se calcula (y por qué)</h2>
        <ul className="mt-2 space-y-2 text-sm text-ink-muted">
          <li>
            <strong className="text-ink">Bancos y entidades financieras:</strong> el Altman Z&apos;&apos; y los umbrales de
            liquidez, endeudamiento y capital de trabajo están pensados para empresas no financieras. En un banco el
            pasivo es el negocio (depósitos), no existe activo corriente ni EBIT comparables y un endeudamiento de 90% es
            normal; aplicarles el modelo daría números sin sentido. Para ellos se muestran ROE, ROA y capitalización, y el
            Score figura como N/A.
          </li>
          <li>
            <strong className="text-ink">Valores sin dato:</strong> si una fuente no informa una cifra (por ejemplo la
            capitalización de mercado de un ticker en un momento dado), el indicador que la necesita queda en N/D. No se
            estima ni se completa con un valor inventado.
          </li>
          <li>
            <strong className="text-ink">Cifras en pesos argentinos:</strong> las empresas que reportan en ARS (moneda de
            alta inflación) muestran cifras nominales sin ajuste por inflación. Sus ratios son comparables; la variación
            nominal de ingresos entre ejercicios no, y por eso no entran al ranking de crecimiento.
          </li>
          <li>
            <strong className="text-ink">Mezcla de monedas:</strong> el balance se expresa en la moneda de reporte de cada
            empresa y la capitalización de mercado se convierte a esa misma moneda antes de calcular el Altman Z&apos;&apos;.
            Cuando una empresa cambió de moneda de reporte entre ejercicios se descartan los ejercicios en la otra moneda
            en vez de convertirlos con un tipo de cambio de hoy.
          </li>
          <li>
            <strong className="text-ink">Empresas que no cotizan:</strong> en un balance cargado por el usuario, si no se
            informa el valor de mercado del patrimonio se usa el valor libro (ajuste que el propio modelo recomienda para
            empresas privadas) y se aclara en la ficha y en el informe.
          </li>
        </ul>
      </Card>

      <Card className="mt-6">
        <h2 className="font-semibold text-ink">Análisis contextual con IA</h2>
        <p className="mt-2 text-sm text-ink-muted">
          El Score, el Altman Z&apos;&apos;, el semáforo, las señales y el análisis ejecutivo se calculan con reglas
          fijas y no usan ningún modelo de lenguaje. La tarjeta opcional &quot;Análisis contextual con IA&quot; es lo
          único redactado por un modelo: recibe esos resultados ya calculados (cifras, ratios, semáforo, moneda de
          reporte, tipo de cambio, contexto macro y medianas del sector por mercado) y los explica en forma de hipótesis
          generales (&quot;podría&quot;, &quot;suele&quot;).
        </p>
        <ul className="mt-3 space-y-1.5 text-sm text-ink-muted">
          <li>• La IA no calcula: se le indica usar solo las cifras recibidas y no inventar números, noticias ni hechos de la empresa.</li>
          <li>• Las causas que menciona son hipótesis generales del sector, no hechos verificados sobre la empresa.</li>
          <li>• Puede equivocarse o simplificar de más: debe leerse como orientación, no como recomendación de inversión ni de crédito.</li>
          <li>• Se genera solo cuando el usuario lo pide; si el servicio no está activado se muestra el texto determinístico de respaldo.</li>
        </ul>
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
