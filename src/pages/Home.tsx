import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { SearchBox } from "@/components/layout/SearchBox";
import { SECTORES } from "@/data/companies";
import { getCompanies, getCompanyAnalysis } from "@/services/companyService";

interface Panorama {
  analizadas: number;
  enRiesgo: number;
  saludables: number;
  sectores: number;
  actualizado: string;
}

export function Home() {
  const [panorama, setPanorama] = useState<Panorama | null>(null);

  useEffect(() => {
    let activo = true;
    (async () => {
      const empresas = await getCompanies();
      const analisis = await Promise.all(empresas.map((e) => getCompanyAnalysis(e.ticker)));
      const enRiesgo = analisis.filter((a) => a?.score.estado === "alerta").length;
      const saludables = analisis.filter((a) => a?.score.estado === "normal").length;
      const sectoresUnicos = new Set(empresas.map((e) => e.sector)).size;
      if (activo) {
        setPanorama({
          analizadas: empresas.length,
          enRiesgo,
          saludables,
          sectores: sectoresUnicos,
          actualizado: new Date().toLocaleDateString("es-AR"),
        });
      }
    })();
    return () => {
      activo = false;
    };
  }, []);

  return (
    <div>
      <section className="border-b border-border bg-gradient-to-b from-accent-soft/40 to-transparent">
        <div className="mx-auto max-w-5xl px-4 py-20 text-center lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight text-ink sm:text-5xl">
            Detectá las señales financieras antes de que se conviertan en problemas.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-ink-muted">
            Analizá empresas, riesgo financiero, indicadores fundamentales y contexto
            macroeconómico desde una única plataforma.
          </p>
          <div className="mx-auto mt-8 max-w-xl">
            <SearchBox grande />
          </div>
          <p className="mt-3 text-sm text-ink-muted">
            Probá con YPF, Pampa Energía, Telecom Argentina, Cresud, Loma Negra...
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <h2 className="mb-5 text-lg font-semibold text-ink">Explorá empresas por sector</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SECTORES.map((s) => (
            <Link
              key={s.id}
              to={`/empresas?sector=${s.id}`}
              className="rounded-xl border border-border bg-surface p-4 text-center text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent focus-ring"
            >
              {s.nombre}
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 lg:px-8">
        <h2 className="mb-5 text-lg font-semibold text-ink">Panorama del mercado</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <div className="text-xs uppercase tracking-wide text-ink-muted">Empresas analizadas</div>
            <div className="mt-1 font-mono text-3xl font-bold text-ink">
              {panorama ? panorama.analizadas : "…"}
            </div>
          </Card>
          <Card>
            <div className="text-xs uppercase tracking-wide text-ink-muted">Señales de riesgo</div>
            <div className="mt-1 font-mono text-3xl font-bold text-bad">
              {panorama ? panorama.enRiesgo : "…"}
            </div>
          </Card>
          <Card>
            <div className="text-xs uppercase tracking-wide text-ink-muted">Sectores monitoreados</div>
            <div className="mt-1 font-mono text-3xl font-bold text-ink">
              {panorama ? panorama.sectores : "…"}
            </div>
          </Card>
          <Card>
            <div className="text-xs uppercase tracking-wide text-ink-muted">Última actualización</div>
            <div className="mt-1 font-mono text-xl font-bold text-ink">
              {panorama ? panorama.actualizado : "…"}
            </div>
          </Card>
        </div>
        <p className="mt-3 text-xs text-ink-muted">
          Valores calculados en vivo sobre el conjunto de empresas cargado en esta instancia (datos
          reales de Yahoo Finance combinados con empresas de demostración claramente identificadas).
        </p>
      </section>
    </div>
  );
}
