import { Link } from "react-router-dom";
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
          Modelo de riesgo de insolvencia para mercados emergentes y empresas no manufactureras (Altman, Hartzell &amp; Peck, 1995):
        </p>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-bg p-3 font-mono text-xs text-ink">
{`Z'' = 6.56·X1 + 3.26·X2 + 6.72·X3 + 1.05·X4

X1 = Capital de trabajo / Activo total
X2 = Resultados acumulados / Activo total
X3 = EBIT / Activo total
X4 = Valor de mercado del patrimonio / Pasivo total`}
        </pre>
        <p className="mt-2 text-sm text-ink-muted">
          Zonas de clasificación: distress &lt; {ALTMAN_THRESHOLDS.distress} · zona gris {ALTMAN_THRESHOLDS.distress}–{ALTMAN_THRESHOLDS.safe} ·
          segura &gt; {ALTMAN_THRESHOLDS.safe}. Se utiliza la formulación estándar de cuatro variables para mercados emergentes, con cortes documentados y una convención internamente consistente.
        </p>
        <p className="mt-2 text-xs text-ink-muted">
          Limitación: Calibrado originalmente con datos de empresas estadounidenses y de mercados emergentes generales, no
          específicamente para micro-empresas ni para modelos concesionales de infraestructura intensivos en activos intangibles.
        </p>
      </Card>

      <Card className="mt-6">
        <h2 className="font-semibold text-ink">Score Centinela</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Combina cinco dimensiones financieras normalizadas a una escala continua de 0 a 100, ponderadas según los parámetros del sistema:
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
          Cada categoría se normaliza de forma lineal a una escala 0–100 contra un umbral de saturación predefinido: Altman Z'' hasta{" "}
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
          motor de cálculo evalúa los umbrales de riesgo sobre el puntaje continuo antes del redondeo
          para evitar distorsiones de borde. El score es una herramienta de diagnóstico orientativa, no una calificación crediticia vinculante.
        </p>

        <div className="mt-4 border-t border-border pt-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
            Escala de Grados de Resiliencia
          </h3>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-ok/30 bg-ok/5 p-2.5">
              <span className="font-bold text-ok">Grado A (80 – 100):</span> Resiliencia Alta. Baja probabilidad de tensión de liquidez o quiebra.
            </div>
            <div className="rounded-lg border border-accent/30 bg-accent/5 p-2.5">
              <span className="font-bold text-accent">Grado B (65 – 79):</span> Resiliencia Aceptable. Estructura financiera sostenible con necesidad de monitoreo regular.
            </div>
            <div className="rounded-lg border border-warn/30 bg-warn/5 p-2.5">
              <span className="font-bold text-warn">Grado C (45 – 64):</span> Vulnerabilidad Moderada. Fugas en capital de trabajo o carga de intereses exigente.
            </div>
            <div className="rounded-lg border border-bad/30 bg-bad/5 p-2.5">
              <span className="font-bold text-bad">Grado D (&lt; 45):</span> Alerta Crítica. Severa asfixia de caja o sobreendeudamiento crítico.
            </div>
          </div>
        </div>
      </Card>

      <Card className="mt-6">
        <h2 className="font-semibold text-ink">Ciclo de Conversión de Efectivo (CCC) e ICR</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Complementa la solvencia patrimonial con la dinámica operativa de la caja en el día a día:
        </p>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-bg p-3 font-mono text-xs text-ink">
{`CCC = DSO + DIO - DPO

DSO (Días de Cobro)      = (Cuentas por Cobrar / Ventas Anuales) × 365
DIO (Días de Inventario) = (Inventarios / Costo de Ventas) × 365
DPO (Días Proveedores)   = (Cuentas por Pagar / Costo de Ventas) × 365

ICR (Cobertura de Intereses) = EBITDA / Gastos por Intereses`}
        </pre>
        <p className="mt-2 text-sm text-ink-muted">
          <strong>Interpretación de caja:</strong> Un CCC elevado (ej. &gt; 90 días) indica que la empresa financia casi un trimestre de operaciones con capital propio o pasivo oneroso. Reducir 1 día de DSO libera directamente: <code className="font-mono text-xs">Caja Liberada = Ventas Anuales / 365</code>.
        </p>
      </Card>

      <Card className="mt-6">
        <h2 className="font-semibold text-ink">Semáforo financiero</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Además del Score Centinela (una única lectura agregada), cada indicador se clasifica
          también de forma individual mediante la matriz de diagnóstico financiero — es el detalle visible en la
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
          Surgen de reglas cuantitativas del motor de alertas tempranas que
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
            liquidez, endeudamiento y capital de trabajo están pensados para empresas corporativas no financieras. En un banco el
            pasivo es el negocio principal (depósitos de clientes), no existen activo corriente ni EBIT comparables y un endeudamiento superior al 85% es
            habitual; aplicarles el modelo corporativo arrojaría distorsiones severas. Para ellos se muestran indicadores de rentabilidad y tamaño (ROE, ROA, Market Cap) y el
            Score se etiqueta estrictamente como N/A (no aplica metodológicamente).
          </li>
          <li>
            <strong className="text-ink">Concesiones de infraestructura y servicios públicos (IFRIC 12):</strong> Empresas con contratos de concesión de largo plazo (como aeropuertos o autopistas, por ejemplo Vinci) operan con capital de trabajo estructuralmente negativo y financiamiento de proyectos a gran escala. Esta estructura contable penaliza fuertemente las variables X1 y X4 del Altman Z'', pudiendo generar falsos positivos de riesgo en empresas que cuentan con flujos operativos altamente predecibles.
          </li>
          <li>
            <strong className="text-ink">Diferenciación estricta entre N/A y N/D:</strong> Se utiliza N/A únicamente cuando un indicador no corresponde metodológicamente al modelo de negocio (ej. bancos). Se utiliza N/D cuando el indicador corresponde conceptualmente pero no pudo calcularse por falta de estados contables completos o incompatibilidad temporal en las fuentes.
          </li>
          <li>
            <strong className="text-ink">Cifras en pesos argentinos (ARS):</strong> Las empresas que reportan en ARS presentan estados contables en moneda local. Cuando se convierten a US$ se utiliza el tipo de cambio oficial interbancario de la fecha de cierre; sus cifras nominales en pesos no reflejan ajuste integral por inflación y deben analizarse considerando el contexto macroeconómico.
          </li>
          <li>
            <strong className="text-ink">Empresas privadas o balances manuales:</strong> En empresas cargadas manualmente por el usuario donde no existe cotización pública, el componente de patrimonio de mercado (X4) se calcula utilizando el valor libro contable, tal como autoriza la formulación Z'' de Altman para firmas no cotizantes.
          </li>
        </ul>
      </Card>

      <Card className="mt-6">
        <h2 className="font-semibold text-ink">Análisis contextual con IA</h2>
        <p className="mt-2 text-sm text-ink-muted">
          El Score, el Altman Z&apos;&apos;, el semáforo, las señales y el análisis ejecutivo se calculan con reglas
          cuantitativas fijas y no usan ningún modelo de lenguaje. La herramienta opcional &quot;Análisis contextual con IA&quot; es lo
          único redactado por un modelo: recibe exclusivamente los resultados ya calculados y estructurados (cifras, ratios, semáforo, moneda de
          reporte, tipo de cambio, contexto macro y benchmarks sectoriales) y los explica en forma de hipótesis
          generales (&quot;podría&quot;, &quot;suele&quot;), sin inventar causas no comprobadas.
        </p>
        <ul className="mt-3 space-y-1.5 text-sm text-ink-muted">
          <li>• La IA no calcula: se le instruye usar únicamente las cifras provistas y respetar la moneda reportada por la empresa.</li>
          <li>• Distingue efectos cambiarios sin atribuir causalidad categórica si los datos contables no lo evidencian.</li>
          <li>• Mantiene una convención homogénea de magnitudes y respeta la restricción de tamaño muestral (n &ge; 2) para promedios sectoriales.</li>
          <li>• Su contenido es orientativo y no constituye una recomendación de inversión ni una decisión crediticia.</li>
        </ul>
      </Card>

      <Card className="mt-6">
        <h2 className="font-semibold text-ink">Datos y actualización</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Ver la sección <Link to="/fuentes" className="underline">Fuentes</Link> para el detalle de qué
          dato proviene de qué fuente, con qué frecuencia de refresco y con qué criterios de respaldo.
        </p>
      </Card>
    </div>
  );
}
