import { Card } from "@/components/ui/Card";

interface Fuente {
  fuente: string;
  variable: string;
  frecuencia: string;
  actualizacion: string;
  url: string;
  descripcion: string;
}

const FUENTES: Fuente[] = [
  {
    fuente: "Yahoo Finance",
    variable: "Balance, EBIT, capitalización de mercado",
    frecuencia: "Por período contable reportado",
    actualizacion: "Captura puntual, ver fecha en cada ficha",
    url: "https://finance.yahoo.com",
    descripcion: "Balances de empresas argentinas que cotizan (YPF, Pampa Energía, Telecom Argentina, Cresud, Loma Negra).",
  },
  {
    fuente: "Datos Argentina (series de tiempo)",
    variable: "Inflación, tasa de interés de referencia",
    frecuencia: "Mensual",
    actualizacion: "Según publicación del organismo de origen",
    url: "https://apis.datos.gob.ar/series/api",
    descripcion: "API pública de series de tiempo del Estado argentino, usada en el prototipo original de análisis.",
  },
];

export function Fuentes() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 lg:px-8">
      <h1 className="text-2xl font-bold text-ink">Fuentes</h1>
      <p className="mt-2 text-ink-muted">
        Cada dato que se muestra en Centinela PyME tiene una fuente identificable. Las empresas
        marcadas como <strong>demo</strong> en la plataforma tienen cifras ficticias, creadas para
        cubrir sectores sin datos públicos reales disponibles en el plazo de este proyecto — nunca
        se presentan como información real.
      </p>

      <Card className="mt-6">
        <h2 className="font-semibold text-ink">Empresas con datos reales</h2>
        <p className="mt-2 text-sm text-ink-muted">
          YPF, Pampa Energía (PAM), Telecom Argentina (TEO), Cresud (CRESY) y Loma Negra (LOMA)
          usan cifras de balance de una captura puntual de Yahoo Finance. El resto del dataset está
          marcado <code className="font-mono text-xs">fuente: &quot;demo&quot;</code> en el código y con el
          badge &quot;Datos demo&quot; en la interfaz.
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          Esa captura de Yahoo Finance trae balance (activos, pasivos, patrimonio, EBIT) y
          capitalización de mercado, pero no trae estado de resultados completo. Por eso, en la
          ficha de estas cinco empresas, campos como <em>Revenue</em>, <em>Net Income</em>,{" "}
          <em>ROE</em>, <em>ROA</em>, <em>P/E</em> o <em>EV/EBITDA</em> aparecen como &quot;N/D&quot;: no es un
          error de carga ni un dato faltante por accidente, es que esta plataforma prefiere mostrar
          &quot;sin dato&quot; antes que inventar o estimar un número que no puede respaldar con una fuente
          real. El Score Centinela y el Altman Z'' de estas empresas sí se calculan igual, porque
          ambos modelos pueden resolverse solo con datos de balance.
        </p>
      </Card>

      <div className="mt-6 space-y-4">
        {FUENTES.map((f) => (
          <Card key={f.fuente}>
            <h2 className="font-semibold text-ink">{f.fuente}</h2>
            <dl className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs text-ink-muted">Variable</dt>
                <dd>{f.variable}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Frecuencia</dt>
                <dd>{f.frecuencia}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Actualización</dt>
                <dd>{f.actualizacion}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">URL</dt>
                <dd>
                  <a href={f.url} className="text-accent hover:underline" target="_blank" rel="noreferrer">
                    {new URL(f.url).hostname}
                  </a>
                </dd>
              </div>
            </dl>
            <p className="mt-2 text-sm text-ink-muted">{f.descripcion}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <h2 className="font-semibold text-ink">Roadmap de fuentes (no integradas todavía)</h2>
        <p className="mt-2 text-sm text-ink-muted">
          INDEC, BCRA, BYMA y CNV son candidatas naturales para el dashboard de Macro y Mercado
          (Fase 4). No se declaran como integradas hasta que efectivamente lo estén — ver{" "}
          <a href="/macro" className="underline">Macro</a>.
        </p>
      </Card>
    </div>
  );
}
