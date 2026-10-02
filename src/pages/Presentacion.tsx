import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Gauge } from "@/components/ui/Gauge";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { ALTMAN_THRESHOLDS } from "@/lib/financial/altman";
import { fmtNum } from "@/lib/format";
import { generarResumenEjecutivo } from "@/lib/financial/narrative";
import { getCompanyAnalysis } from "@/services/companyService";
import type { Signal } from "@/types";

/**
 * Modo presentación — Fase 6.
 *
 * Página única, larga y narrativa pensada para mostrarse en vivo frente a un
 * jurado (no es un dashboard más). No importa componentes de fases ajenas
 * (Comparador, Rankings, Macro, Mercado, Simulador) porque pueden no existir
 * todavía; las secciones 7 y 8 describen esas funciones en texto en vez de
 * incrustarlas. Todo lo que SÍ se muestra (mini-dashboard, score, gauge,
 * señales) se calcula en vivo con los mismos datos y la misma lógica que el
 * resto de la plataforma — nada está hardcodeado ni inventado.
 */

type AnalisisEmpresa = Awaited<ReturnType<typeof getCompanyAnalysis>>;

// Dos empresas con datos reales (YPF, TEO) y una demo claramente marcada
// (CNRP), elegidas para mostrar variedad de sectores y de estados de riesgo.
const DASHBOARD_TICKERS = ["YPF", "TEO", "CNRP"];
const EJEMPLO_TICKER = "YPF";

interface SenalDestacada {
  ticker: string;
  nombre: string;
  demo: boolean;
  signal: Signal;
}

function Eyebrow({ children }: { children: string }) {
  return (
    <p className="mb-3 font-mono text-xs font-semibold uppercase tracking-widest text-accent">
      {children}
    </p>
  );
}

function MiniEmpresaCard({ analysis }: { analysis: AnalisisEmpresa | undefined }) {
  if (!analysis) {
    return (
      <Card>
        <div className="h-4 w-24 animate-pulse rounded bg-border" />
        <div className="mt-4 h-8 w-20 animate-pulse rounded bg-border" />
      </Card>
    );
  }

  const { company, score } = analysis;

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-mono text-sm font-semibold text-ink">{company.ticker}</div>
          <div className="text-xs text-ink-muted">{company.nombre}</div>
        </div>
        {company.fuente === "demo" && <Badge estado="sin_datos" texto="Datos demo" />}
      </div>
      <div className="mt-4 flex items-end justify-between">
        <div className="font-mono text-3xl font-bold text-ink">
          {score.total ?? "N/D"} <span className="text-sm font-normal text-ink-muted">/ 100</span>
        </div>
        <Badge estado={score.estado} />
      </div>
      <div className="mt-2 text-xs text-ink-muted">{company.sector}</div>
    </Card>
  );
}

export function Presentacion() {
  useDocumentTitle("Centinela — Presentación");

  const [preview, setPreview] = useState<Record<string, AnalisisEmpresa>>({});
  const [ejemplo, setEjemplo] = useState<AnalisisEmpresa | null>(null);
  const [senales, setSenales] = useState<SenalDestacada[]>([]);

  useEffect(() => {
    let activo = true;
    (async () => {
      const resultados = await Promise.all(DASHBOARD_TICKERS.map((t) => getCompanyAnalysis(t)));
      if (!activo) return;

      const mapa: Record<string, AnalisisEmpresa> = {};
      DASHBOARD_TICKERS.forEach((ticker, i) => {
        mapa[ticker] = resultados[i];
      });
      setPreview(mapa);
      setEjemplo(mapa[EJEMPLO_TICKER] ?? null);

      const destacadas: SenalDestacada[] = [];
      const ypf = mapa["YPF"];
      if (ypf && ypf.senales.length > 0) {
        destacadas.push({
          ticker: ypf.company.ticker,
          nombre: ypf.company.nombre,
          demo: ypf.company.fuente === "demo",
          signal: ypf.senales[0],
        });
      }
      const cnrp = mapa["CNRP"];
      if (cnrp && cnrp.senales.length > 0) {
        const negativa = cnrp.senales.find((s) => s.tipo === "negativa") ?? cnrp.senales[0];
        destacadas.push({
          ticker: cnrp.company.ticker,
          nombre: cnrp.company.nombre,
          demo: cnrp.company.fuente === "demo",
          signal: negativa,
        });
      }
      setSenales(destacadas);
    })();
    return () => {
      activo = false;
    };
  }, []);

  return (
    <div>
      {/* 1. Hero */}
      <section className="border-b border-border bg-gradient-to-b from-accent-soft/40 to-transparent">
        <div className="mx-auto max-w-4xl px-4 py-24 text-center lg:px-8">
          <p className="mb-4 font-mono text-sm font-semibold uppercase tracking-widest text-accent">
            Centinela PyME · Presentación
          </p>
          <h1 className="font-mono text-5xl font-bold tracking-tight text-ink sm:text-6xl">
            CENTINELA <span className="text-accent">PyME</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-xl leading-relaxed text-ink-muted">
            Inteligencia financiera para empresas: salud financiera, riesgo y contexto
            macroeconómico desde una única plataforma.
          </p>
        </div>
      </section>

      {/* 2. Problema */}
      <section className="border-b border-border py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 lg:px-8">
          <Eyebrow>01 · El problema</Eyebrow>
          <h2 className="text-3xl font-bold text-ink">
            El riesgo financiero casi nunca se anuncia con anticipación.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-ink-muted">
            Una empresa puede mostrar números prolijos un trimestre y entrar en problemas de
            solvencia pocos meses después. Las señales de ese deterioro suelen estar dispersas
            entre balances, ratios financieros y contexto macroeconómico — y casi nunca se leen
            juntas. Para una PyME, un inversor minorista o un analista sin un equipo de research
            propio, detectar el riesgo a tiempo hoy depende de cruzar manualmente demasiadas
            fuentes.
          </p>
        </div>
      </section>

      {/* 3. Solución */}
      <section className="border-b border-border py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 lg:px-8">
          <Eyebrow>02 · La solución</Eyebrow>
          <h2 className="text-3xl font-bold text-ink">
            Centinela traduce esos datos en una lectura de riesgo clara.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-ink-muted">
            Por cada empresa combinamos un modelo de insolvencia validado académicamente (Altman
            Z'') con una métrica propia de este proyecto — el Score Centinela — que
            pondera solvencia, liquidez, rentabilidad, endeudamiento y eficiencia en una sola
            lectura de 0 a 100. Un motor de señales con reglas explícitas marca los cambios
            período a período, y toda la metodología queda documentada y auditable: nunca es una
            caja negra.
          </p>
          <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              "Score Centinela de 0 a 100 por empresa",
              "Altman Z'' con zonas de riesgo",
              "Señales automáticas basadas en reglas, no en IA",
              "Metodología y fuentes 100% documentadas",
            ].map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-sm text-ink"
              >
                <span className="text-accent" aria-hidden="true">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 4. Dashboard (mini preview, en vivo) */}
      <section className="border-b border-border bg-surface/40 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          <Eyebrow>03 · El dashboard</Eyebrow>
          <h2 className="text-3xl font-bold text-ink">
            Una ficha por empresa, siempre con el mismo criterio.
          </h2>
          <p className="mt-4 max-w-2xl text-ink-muted">
            Esto no es una maqueta: son tres empresas reales del dataset actual, calculadas en
            vivo con la misma lógica que corre en{" "}
            <Link to="/empresas" className="underline">
              /empresas
            </Link>
            .
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {DASHBOARD_TICKERS.map((ticker) => (
              <MiniEmpresaCard key={ticker} analysis={preview[ticker]} />
            ))}
          </div>
        </div>
      </section>

      {/* 5. Ejemplo de empresa */}
      <section className="border-b border-border py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 lg:px-8">
          <Eyebrow>04 · Un caso real</Eyebrow>
          <h2 className="text-3xl font-bold text-ink">YPF, bajo la lupa de Centinela.</h2>
          <p className="mt-4 max-w-2xl text-ink-muted">
            Con datos reales de balance (Yahoo Finance), así se ve el análisis completo de una
            empresa que cotiza en el mercado argentino.
          </p>

          {!ejemplo ? (
            <p className="mt-8 text-ink-muted">Cargando análisis de YPF…</p>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-ink">Score Centinela</h3>
                  <Badge estado={ejemplo.score.estado} />
                </div>
                <div className="mt-3 font-mono text-4xl font-bold text-ink">
                  {ejemplo.score.total ?? "N/D"}{" "}
                  <span className="text-base font-normal text-ink-muted">/ 100</span>
                </div>
                <div className="mt-4 space-y-2">
                  {Object.values(ejemplo.score.categorias).map((c) => (
                    <div key={c.nombre} className="flex items-center gap-3">
                      <span className="w-32 text-sm text-ink-muted">{c.nombre}</span>
                      <div className="h-2 flex-1 rounded-full bg-border">
                        <div
                          className="h-2 rounded-full bg-accent"
                          style={{ width: `${c.valor ?? 0}%` }}
                        />
                      </div>
                      <span className="w-10 text-right font-mono text-sm">
                        {c.valor !== null ? Math.round(c.valor) : "N/D"}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-ink">Altman Z''</h3>
                  <Badge estado={ejemplo.altman.estado} />
                </div>
                <Gauge
                  value={ejemplo.altman.zScore}
                  min={0}
                  max={5}
                  zonas={[ALTMAN_THRESHOLDS.distress, ALTMAN_THRESHOLDS.safe]}
                />
                <div className="text-center font-mono text-2xl font-bold text-ink">
                  {fmtNum(ejemplo.altman.zScore)}
                </div>
                <p className="mt-2 text-center text-sm text-ink-muted">
                  Distress &lt; {ALTMAN_THRESHOLDS.distress} · Zona gris · Segura &gt;{" "}
                  {ALTMAN_THRESHOLDS.safe}
                </p>
              </Card>

              <Card className="lg:col-span-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
                  Resumen financiero
                </h3>
                <p className="mt-2 text-ink">{generarResumenEjecutivo(ejemplo.company)}</p>
                <Link
                  to={`/empresas/${ejemplo.company.ticker}`}
                  className="mt-3 inline-block text-sm text-accent hover:underline"
                >
                  Ver ficha completa de {ejemplo.company.ticker} →
                </Link>
              </Card>
            </div>
          )}
        </div>
      </section>

      {/* 6. Señales */}
      <section className="border-b border-border bg-surface/40 py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 lg:px-8">
          <Eyebrow>05 · Señales Centinela</Eyebrow>
          <h2 className="text-3xl font-bold text-ink">
            Cada cambio relevante, explicado en una frase.
          </h2>
          <p className="mt-4 text-ink-muted">
            Las señales no se infieren con un modelo de lenguaje: surgen de reglas explícitas que
            comparan el último período disponible contra el anterior. Estos dos ejemplos son
            señales reales, generadas por ese motor sobre el dataset actual.
          </p>
          <div className="mt-8 space-y-3">
            {senales.length === 0 ? (
              <p className="text-ink-muted">Cargando señales…</p>
            ) : (
              senales.map(({ ticker, nombre, demo, signal }) => (
                <div
                  key={signal.id}
                  className="flex items-start gap-3 rounded-lg border border-border bg-surface p-4"
                >
                  <span aria-hidden="true" className="text-lg">
                    {signal.tipo === "positiva" ? "🟢" : signal.tipo === "advertencia" ? "🟡" : "🔴"}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-ink-muted">{ticker}</span>
                      <span className="text-xs text-ink-muted">{nombre}</span>
                      {demo && <Badge estado="sin_datos" texto="Datos demo" />}
                    </div>
                    <div className="mt-1 font-semibold text-ink">{signal.titulo}</div>
                    <div className="text-sm text-ink-muted">{signal.descripcion}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* 7. Macro */}
      <section className="border-b border-border py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 lg:px-8">
          <Eyebrow>06 · Contexto macro</Eyebrow>
          <h2 className="text-3xl font-bold text-ink">Ninguna empresa opera en el vacío.</h2>
          <p className="mt-5 text-lg leading-relaxed text-ink-muted">
            El roadmap de Centinela incluye un panel de contexto macroeconómico argentino — dólar,
            inflación, tasa de interés de referencia, riesgo país, reservas y Merval — cada
            indicador con su fuente y fecha de actualización explícitas, para leer la salud de una
            empresa junto al escenario en el que opera. Está planificado para la Fase 4 del
            proyecto (ver{" "}
            <Link to="/macro" className="underline">
              /macro
            </Link>
            ) y todavía no forma parte del análisis por empresa que ya está construido.
          </p>
        </div>
      </section>

      {/* 8. Comparador */}
      <section className="border-b border-border bg-surface/40 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 lg:px-8">
          <Eyebrow>07 · Comparador</Eyebrow>
          <h2 className="text-3xl font-bold text-ink">
            Comparar empresas no debería ser abrir diez pestañas.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-ink-muted">
            El Comparador (Fase 3 del roadmap) va a permitir elegir entre 2 y 5 empresas y verlas
            lado a lado: tabla de indicadores, radar por categoría del Score Centinela y ranking
            relativo dentro del grupo elegido. Mientras se construye, la tabla de{" "}
            <Link to="/empresas" className="underline">
              /empresas
            </Link>{" "}
            ya permite ordenar todo el dataset por cualquier indicador.
          </p>
        </div>
      </section>

      {/* 9. Metodología */}
      <section className="border-b border-border py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 lg:px-8">
          <Eyebrow>08 · Metodología</Eyebrow>
          <h2 className="text-3xl font-bold text-ink">Todo lo que calculamos se puede auditar.</h2>
          <p className="mt-5 text-lg leading-relaxed text-ink-muted">
            El Altman Z'' es un modelo de riesgo de insolvencia para mercados emergentes
            (Altman, Hartzell &amp; Peck, 1995). El Score Centinela es una métrica propia de este
            proyecto académico — no un estándar de la industria — que combina cinco categorías
            normalizadas con pesos y umbrales documentados en código abierto. Ninguna señal se
            infiere con un modelo de lenguaje: todas surgen de reglas explícitas y documentadas.
          </p>
          <Link to="/metodologia" className="mt-5 inline-block text-accent hover:underline">
            Ver la metodología completa →
          </Link>
        </div>
      </section>

      {/* 10. Impacto */}
      <section className="bg-gradient-to-b from-transparent to-accent-soft/30 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center lg:px-8">
          <Eyebrow>09 · Impacto</Eyebrow>
          <h2 className="text-3xl font-bold text-ink">
            ¿A quién le sirve ver el riesgo antes de que explote?
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-ink-muted">
            A una PyME que necesita entender su propia salud financiera sin pagar una auditoría. A
            un inversor minorista que quiere algo más que el precio de la acción. A un analista o
            estudiante que busca una segunda lectura, rápida y transparente, antes de profundizar.
            Centinela no reemplaza el análisis profesional ni predice el futuro: ordena información
            que ya existe y la hace legible para quien no tiene un equipo de research propio.
          </p>
          <Link
            to="/empresas"
            className="mt-8 inline-block rounded-lg border border-border bg-surface px-6 py-3 font-semibold text-ink transition-colors hover:border-accent hover:text-accent focus-ring"
          >
            Explorar la plataforma completa →
          </Link>
        </div>
      </section>
    </div>
  );
}
