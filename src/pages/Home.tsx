import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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

const CHIPS_RAPIDOS = [
  { ticker: "YPFD.BA", label: "YPF" },
  { ticker: "PAMP.BA", label: "Pampa Energía" },
  { ticker: "ALUA.BA", label: "Aluar" },
  { ticker: "AAPL", label: "Apple" },
  { ticker: "MELI", label: "MercadoLibre" },
  { ticker: "PBR", label: "Petrobras" },
];

export function Home() {
  const [empresas, setEmpresas] = useState<Company[] | null>(null);
  const [panorama, setPanorama] = useState<Panorama | null>(null);
  const navigate = useNavigate();

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
    <div className="space-y-12 pb-16">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-accent-soft/30 via-surface to-surface pt-12 pb-16">
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          {/* Status Bar Micro-accent tipo acuantoesta */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1 text-xs font-mono text-ink-muted shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-ok" />
              </span>
              <span className="font-semibold text-ink">DATOS EN VIVO</span>
              <span>·</span>
              <span>43 Cotizantes BYMA / SEC / B3</span>
              <span>·</span>
              <span className="text-accent font-medium">Auditoría 24/7</span>
            </div>
          </div>

          {/* Copywriting comercial de alto impacto */}
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-5xl sm:leading-[1.15]">
              Detectá dónde se rompe la caja de tu empresa{" "}
              <span className="bg-gradient-to-r from-accent to-emerald-500 bg-clip-text text-transparent">
                antes de que sea tarde.
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-ink-muted sm:text-lg">
              Copiloto de diagnóstico financiero y alerta temprana: auditá capital de trabajo (CCC), cobertura de
              deuda (ICR) y sensibilidad cambiaria en segundos. Compará contra el mercado y simulá decisiones de caja.
            </p>
          </div>

          {/* LAYOUT SIMÉTRICO DE DOS CAJAS (Feedback Darío) */}
          <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* CAJA 1: DIAGNOSTICAR MI EMPRESA */}
            <div className="relative flex flex-col justify-between rounded-2xl border-2 border-accent/40 bg-surface p-6 shadow-sm transition-all hover:border-accent hover:shadow-md sm:p-8">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-accent/15 px-3 py-1 font-mono text-xs font-bold tracking-wide text-accent">
                    TU PYME O EMPRESA
                  </span>
                  <span className="text-xs font-mono text-ink-muted">100% confidencial</span>
                </div>

                <h2 className="mt-4 text-xl font-bold text-ink sm:text-2xl">
                  Auditoría y Simulación de Caja
                </h2>
                <p className="mt-2 text-sm text-ink-muted leading-relaxed">
                  Cargá tus cuentas principales para evaluar plazos de cobro (DSO), rotación de inventario (DIO),
                  proveedores (DPO), ratio ICR de intereses y estrés ante devaluación cambiaria.
                </p>

                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <Link
                    to="/mi-empresa"
                    className="flex-1 rounded-xl bg-accent px-5 py-3.5 text-center text-sm font-bold text-white shadow-sm transition-transform hover:opacity-95 active:scale-[0.99] focus-ring"
                  >
                    Cargar balance de mi empresa →
                  </Link>
                  <Link
                    to="/simulador"
                    className="rounded-xl border border-border bg-surface px-4 py-3.5 text-center text-sm font-semibold text-ink hover:border-accent hover:text-accent focus-ring"
                  >
                    Ir al Simulador
                  </Link>
                </div>
              </div>

              {/* Acceso 1-click caso demo real */}
              <div className="mt-6 rounded-xl border border-border bg-bg/60 p-3.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-semibold uppercase text-ink-muted">
                    ¿Querés probar sin cargar datos?
                  </span>
                  <span className="rounded bg-warn/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-warn">
                    CASO DEMO
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-ink">Metalúrgica Don Pedro S.A.</span>
                    <p className="text-xs text-ink-muted">
                      PyME industrial con CCC de 95 días y deuda en USD.
                    </p>
                  </div>
                  <Link
                    to="/empresas/DEMO-PEDRO"
                    className="shrink-0 rounded-lg bg-surface px-3 py-1.5 text-xs font-bold text-accent border border-border shadow-sm hover:border-accent"
                  >
                    Ver caso →
                  </Link>
                </div>
              </div>
            </div>

            {/* CAJA 2: COMPARAR CONTRA EL MERCADO */}
            <div className="relative flex flex-col justify-between rounded-2xl border border-border bg-surface p-6 shadow-sm transition-all hover:border-border hover:shadow-md sm:p-8">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-ink/5 dark:bg-ink/10 px-3 py-1 font-mono text-xs font-bold tracking-wide text-ink">
                    BENCHMARK SECTORIAL & COTIZANTES
                  </span>
                  <span className="text-xs font-mono text-ok font-semibold">● Datos en tiempo real</span>
                </div>

                <h2 className="mt-4 text-xl font-bold text-ink sm:text-2xl">
                  Compará contra el Mercado
                </h2>
                <p className="mt-2 text-sm text-ink-muted leading-relaxed">
                  Contrastá tus márgenes, capital de trabajo y Score de Resiliencia contra empresas cotizantes de
                  Argentina (BYMA), Brasil (B3) y EE.UU. (NYSE/NASDAQ) con balances auditados.
                </p>

                {/* Buscador embebido con microcopy pedido */}
                <div className="mt-6">
                  <SearchBox
                    grande
                    placeholder="Compará tu empresa respecto de YPF, Pampa Energía, Apple..."
                  />
                </div>
              </div>

              {/* Chips rápidos */}
              <div className="mt-6">
                <div className="text-xs font-mono font-semibold text-ink-muted mb-2 uppercase tracking-wide">
                  Acceso rápido a referentes:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {CHIPS_RAPIDOS.map((chip) => (
                    <button
                      key={chip.ticker}
                      onClick={() => navigate(`/empresas/${chip.ticker}`)}
                      className="rounded-lg border border-border bg-bg/50 px-2.5 py-1 font-mono text-xs font-medium text-ink transition-colors hover:border-accent hover:bg-surface hover:text-accent focus-ring"
                    >
                      {chip.label}
                    </button>
                  ))}
                  <Link
                    to="/comparador"
                    className="rounded-lg border border-border/80 bg-surface px-2.5 py-1 text-xs font-medium text-accent hover:underline"
                  >
                    Ver todas →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* METODOLOGÍA / FLUJO DE VALOR EN 4 PASOS */}
      <section className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-6">
          <div>
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent">
              EL FLUJO CENTINELA
            </span>
            <h2 className="text-xl font-bold text-ink mt-1">Cómo apoya tus decisiones financieras</h2>
          </div>
          <Link to="/metodologia" className="mt-2 sm:mt-0 text-sm font-semibold text-accent hover:underline">
            Conocer la metodología matemática →
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="relative border-l-4 border-l-accent">
            <span className="font-mono text-xs font-bold text-accent">PASO 01</span>
            <h3 className="mt-1 font-bold text-ink">Alerta Temprana</h3>
            <p className="mt-1 text-xs text-ink-muted">
              Escaneo automatizado de solvencia patrimonial mediante el modelo Altman Z'' calibrado para mercados emergentes.
            </p>
          </Card>
          <Card className="relative border-l-4 border-l-ok">
            <span className="font-mono text-xs font-bold text-ok">PASO 02</span>
            <h3 className="mt-1 font-bold text-ink">Ciclo de Efectivo</h3>
            <p className="mt-1 text-xs text-ink-muted">
              Desglose quirúrgico del CCC: días de cobro (DSO), rotación de stock (DIO) y apalancamiento en proveedores (DPO).
            </p>
          </Card>
          <Card className="relative border-l-4 border-l-warn">
            <span className="font-mono text-xs font-bold text-warn">PASO 03</span>
            <h3 className="mt-1 font-bold text-ink">Simulador de Palancas</h3>
            <p className="mt-1 text-xs text-ink-muted">
              Calculá con precisión matemática cuántos pesos o dólares de caja se liberan optimizando cada día del ciclo.
            </p>
          </Card>
          <Card className="relative border-l-4 border-l-ink-muted">
            <span className="font-mono text-xs font-bold text-ink">PASO 04</span>
            <h3 className="mt-1 font-bold text-ink">Asesoría Certificada</h3>
            <p className="mt-1 text-xs text-ink-muted">
              Si el score enciende alertas, conectá con directores financieros y matriculados CNV/CFA para estructurar soluciones.
            </p>
          </Card>
        </div>
      </section>

      {/* PANORAMA DEL MERCADO (ESTILO ACUANTOESTA) */}
      <section className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-ink">Panorama de Mercado en Vivo</h2>
          <span className="font-mono text-xs text-ink-muted">
            {panorama?.actualizado
              ? `Actualizado: ${new Date(panorama.actualizado).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} hs`
              : "Sincronizando..."}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card className="border border-border/80 bg-surface">
            <div className="font-mono text-xs uppercase tracking-wide text-ink-muted">Cotizantes Analizadas</div>
            <div className="mt-2 font-mono text-3xl font-bold text-ink">{panorama ? panorama.analizadas : "…"}</div>
            <div className="mt-1 text-[11px] text-ink-muted">BYMA, B3, NYSE, NASDAQ</div>
          </Card>
          <Card className="border border-border/80 bg-surface">
            <div className="font-mono text-xs uppercase tracking-wide text-ink-muted">En Zona de Alerta</div>
            <div className="mt-2 font-mono text-3xl font-bold text-bad">{panorama ? panorama.enRiesgo : "…"}</div>
            <div className="mt-1 text-[11px] text-bad font-medium">Requieren monitoreo crítico</div>
          </Card>
          <Card className="border border-border/80 bg-surface">
            <div className="font-mono text-xs uppercase tracking-wide text-ink-muted">Mercados Conectados</div>
            <div className="mt-2 font-mono text-3xl font-bold text-ink">{panorama ? panorama.mercados : "…"}</div>
            <div className="mt-1 text-[11px] text-ink-muted">Argentina, Brasil y EE.UU.</div>
          </Card>
          <Card className="border border-border/80 bg-surface">
            <div className="font-mono text-xs uppercase tracking-wide text-ink-muted">Conexión con Yahoo Finance</div>
            <div className="mt-2 font-mono text-3xl font-bold text-ok">
              {panorama ? `${panorama.enVivo}/${panorama.cotizantes}` : "…"}
            </div>
            <div className="mt-1 text-[11px] text-ok font-medium">Cotizaciones y balances en vivo</div>
          </Card>
        </div>
      </section>

      {/* EXPLORAR POR SECTOR */}
      <section className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-ink">Explorá empresas por sector</h2>
          <Link to="/empresas" className="text-sm font-semibold text-accent hover:underline">
            Ver catálogo completo →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {sectoresConEmpresas.map((s) => (
            <Link
              key={s.id}
              to={`/empresas?sector=${s.id}`}
              className="group rounded-xl border border-border bg-surface p-4 text-center font-medium text-ink transition-all hover:border-accent hover:shadow-sm focus-ring"
            >
              <span className="text-sm group-hover:text-accent transition-colors">{s.nombre}</span>
            </Link>
          ))}
          {empresas === null && <p className="col-span-full text-sm text-ink-muted">Consultando datos en vivo...</p>}
        </div>
      </section>
    </div>
  );
}
