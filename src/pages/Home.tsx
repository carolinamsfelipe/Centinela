import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { SearchBox } from "@/components/layout/SearchBox";
import { SECTORES } from "@/data/companies";
import { analizarEmpresa } from "@/lib/financial/analysis";
import { getCompanies } from "@/services/companyService";
import type { Company } from "@/types";

interface Panorama {
  analizadas: number;
  enRiesgo: number;
  mercados: number;
  enVivo: number;
  cotizantes: number;
  actualizado: string | null;
}

export function Home() {
  const [empresas, setEmpresas] = useState<Company[] | null>(null);
  const [panorama, setPanorama] = useState<Panorama | null>(null);

  useEffect(() => {
    let activo = true;
    getCompanies().then((cs) => {
      if (!activo) return;
      const cotizantes = cs.filter((c) => c.companyType === "market");
      const enRiesgo = cotizantes.filter((c) => analizarEmpresa(c).score.estado === "alerta").length;
      const enVivo = cotizantes.filter((c) => c.envivo).length;
      const instantes = cotizantes.map((c) => c.actualizado).filter((a): a is string => !!a);
      const ultimo = instantes.length > 0 ? instantes.sort()[instantes.length - 1] : null;
      setEmpresas(cs);
      setPanorama({
        analizadas: cotizantes.length,
        enRiesgo,
        mercados: new Set(cotizantes.map((c) => c.mercado)).size,
        enVivo,
        cotizantes: cotizantes.length,
        actualizado: ultimo,
      });
    });
    return () => {
      activo = false;
    };
  }, []);

  const sectoresConEmpresas = SECTORES.filter((s) => (empresas ?? []).some((c) => c.sector === s.id));

  return (
    <div>
      <section className="border-b border-border bg-gradient-to-b from-accent-soft/40 to-transparent">
        <div className="mx-auto max-w-5xl px-4 py-20 text-center lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight text-ink sm:text-5xl">
            Detectá las señales financieras antes de que se conviertan en problemas.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-ink-muted">
            Copiloto de diagnóstico financiero y alerta temprana: analizá el riesgo de empresas de distintos mercados
            con datos reales en vivo, cargá el balance de tu propia empresa y compará. Apoyo a la decisión, no un
            veredicto de crédito.
          </p>
          <div className="mx-auto mt-8 max-w-xl">
            <SearchBox grande />
          </div>
          <p className="mt-3 text-sm text-ink-muted">Probá con YPF, Pampa Energía, Petrobras, Apple, Coca-Cola...</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/mi-empresa"
              className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white hover:opacity-90 focus-ring"
            >
              Cargar mi empresa
            </Link>
            <Link
              to="/comparador"
              className="rounded-xl border border-border px-5 py-3 text-sm font-semibold text-ink hover:border-accent hover:text-accent focus-ring"
            >
              Comparar entre mercados
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <h2 className="mb-5 text-lg font-semibold text-ink">Explorá empresas por sector</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {sectoresConEmpresas.map((s) => (
            <Link
              key={s.id}
              to={`/empresas?sector=${s.id}`}
              className="rounded-xl border border-border bg-surface p-4 text-center text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent focus-ring"
            >
              {s.nombre}
            </Link>
          ))}
          {empresas === null && <p className="col-span-full text-sm text-ink-muted">Consultando datos en vivo...</p>}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 lg:px-8">
        <h2 className="mb-5 text-lg font-semibold text-ink">Panorama</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <div className="text-xs uppercase tracking-wide text-ink-muted">Empresas analizadas</div>
            <div className="mt-1 font-mono text-3xl font-bold text-ink">{panorama ? panorama.analizadas : "…"}</div>
          </Card>
          <Card>
            <div className="text-xs uppercase tracking-wide text-ink-muted">Señales de riesgo</div>
            <div className="mt-1 font-mono text-3xl font-bold text-bad">{panorama ? panorama.enRiesgo : "…"}</div>
          </Card>
          <Card>
            <div className="text-xs uppercase tracking-wide text-ink-muted">Mercados comparables</div>
            <div className="mt-1 font-mono text-3xl font-bold text-ink">{panorama ? panorama.mercados : "…"}</div>
          </Card>
          <Card>
            <div className="text-xs uppercase tracking-wide text-ink-muted">Última consulta en vivo</div>
            <div className="mt-1 font-mono text-xl font-bold text-ink">
              {panorama
                ? panorama.actualizado
                  ? new Date(panorama.actualizado).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
                  : "sin conexión"
                : "…"}
            </div>
          </Card>
        </div>
        <p className="mt-3 text-xs text-ink-muted">
          Valores calculados sobre datos reales de Yahoo Finance
          {panorama ? ` (${panorama.enVivo} de ${panorama.cotizantes} empresas que cotizan consultadas en vivo en este momento)` : ""}. No hay
          empresas ficticias: si una empresa no se puede consultar, se muestra sin dato y se avisa.
        </p>
      </section>
    </div>
  );
}
