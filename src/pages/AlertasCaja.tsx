import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { MERCADOS } from "@/data/companies";
import { generarAlertasCaja, type AlertaCaja } from "@/lib/financial/alertasCaja";
import { ESTADO_UI } from "@/lib/financial/estadoUi";
import { getCompanies } from "@/services/companyService";
import type { Company, Mercado } from "@/types";

interface FilaEmpresaAlertas {
  company: Company;
  alertas: AlertaCaja[];
  alertasCriticas: number;
  alertasAtencion: number;
}

export function AlertasCaja() {
  const [empresas, setEmpresas] = useState<Company[]>([]);
  const [mercado, setMercado] = useState<Mercado | "Todos">("Todos");
  const [filtroSeveridad, setFiltroSeveridad] = useState<"todas" | "alerta" | "atencion">("todas");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    getCompanies()
      .then((data) => {
        setEmpresas(data);
      })
      .finally(() => setCargando(false));
  }, []);

  const filasConAlertas: FilaEmpresaAlertas[] = useMemo(() => {
    return empresas
      .filter((c) => mercado === "Todos" || c.mercado === mercado)
      .map((company) => {
        const alertas = generarAlertasCaja(company);
        return {
          company,
          alertas,
          alertasCriticas: alertas.filter((a) => a.estado === "alerta").length,
          alertasAtencion: alertas.filter((a) => a.estado === "atencion").length,
        };
      })
      .filter((fila) => {
        if (filtroSeveridad === "alerta") return fila.alertasCriticas > 0;
        if (filtroSeveridad === "atencion") return fila.alertasAtencion > 0;
        return fila.alertas.length > 0;
      })
      .sort((a, b) => {
        // Primero empresas con mayor cantidad de alertas críticas, luego de atención
        if (b.alertasCriticas !== a.alertasCriticas) {
          return b.alertasCriticas - a.alertasCriticas;
        }
        return b.alertasAtencion - a.alertasAtencion;
      });
  }, [empresas, mercado, filtroSeveridad]);

  const totalCriticas = useMemo(
    () => filasConAlertas.reduce((acc, f) => acc + f.alertasCriticas, 0),
    [filasConAlertas]
  );
  const totalAtencion = useMemo(
    () => filasConAlertas.reduce((acc, f) => acc + f.alertasAtencion, 0),
    [filasConAlertas]
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-bad/15 px-2 py-0.5 font-mono text-xs font-bold uppercase tracking-wider text-bad">
              Monitoreo Activo
            </span>
            <h1 className="text-2xl font-bold text-ink">Alertas de Caja Temprana</h1>
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            Detección rigurosa de tensiones de tesorería (CCC extendido, iliquidez por cobro o proveedores, estrés cambiario y FCF negativo) sobre estados contables reportados.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-border bg-surface px-3 py-2 text-center">
            <div className="font-mono text-xl font-bold text-bad">{totalCriticas}</div>
            <div className="text-[11px] text-ink-muted">Críticas (◆)</div>
          </div>
          <div className="rounded-lg border border-border bg-surface px-3 py-2 text-center">
            <div className="font-mono text-xl font-bold text-warn">{totalAtencion}</div>
            <div className="text-[11px] text-ink-muted">Atención (▲)</div>
          </div>
        </div>
      </div>

      {/* Controles de filtrado */}
      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-ink-muted">
            Mercado:
            <select
              value={mercado}
              onChange={(e) => setMercado(e.target.value as Mercado | "Todos")}
              className="rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-ink focus-ring"
            >
              <option value="Todos">Todos los mercados</option>
              {MERCADOS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center gap-1 rounded-lg border border-border p-1 bg-bg text-xs">
            <button
              onClick={() => setFiltroSeveridad("todas")}
              className={`rounded px-2.5 py-1 font-medium transition-colors ${
                filtroSeveridad === "todas" ? "bg-surface text-ink font-semibold shadow-sm" : "text-ink-muted hover:text-ink"
              }`}
            >
              Todas ({filasConAlertas.length})
            </button>
            <button
              onClick={() => setFiltroSeveridad("alerta")}
              className={`rounded px-2.5 py-1 font-medium transition-colors ${
                filtroSeveridad === "alerta" ? "bg-bad/20 text-bad font-semibold" : "text-ink-muted hover:text-ink"
              }`}
            >
              Sólo Alertas Críticas (◆)
            </button>
            <button
              onClick={() => setFiltroSeveridad("atencion")}
              className={`rounded px-2.5 py-1 font-medium transition-colors ${
                filtroSeveridad === "atencion" ? "bg-warn/20 text-warn font-semibold" : "text-ink-muted hover:text-ink"
              }`}
            >
              Sólo Atención (▲)
            </button>
          </div>
        </div>

        <Link
          to="/simulador"
          className="text-xs font-semibold text-accent hover:underline flex items-center gap-1"
        >
          Probar en Simulador de Caja →
        </Link>
      </Card>

      {/* Listado de empresas */}
      {cargando ? (
        <Card className="p-8 text-center text-ink-muted">Evaluando métricas de caja en el universo de empresas...</Card>
      ) : filasConAlertas.length === 0 ? (
        <Card className="p-8 text-center text-ink-muted">
          No se encontraron empresas con señales activas de tensión de caja para los filtros seleccionados.
        </Card>
      ) : (
        <div className="space-y-4">
          {filasConAlertas.map(({ company, alertas, alertasCriticas, alertasAtencion }) => (
            <div
              key={company.ticker}
              className="rounded-xl border border-border bg-surface p-5 transition-shadow hover:shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/empresas/${company.ticker}`}
                      className="font-bold text-ink hover:text-accent focus-ring text-base"
                    >
                      {company.nombre}
                    </Link>
                    <span className="font-mono text-xs text-ink-muted">({company.ticker})</span>
                    <span className="rounded bg-neutral-soft px-2 py-0.5 text-[11px] font-medium text-ink-muted">
                      {company.sector}
                    </span>
                    <span className="rounded bg-neutral-soft px-2 py-0.5 text-[11px] font-medium text-ink-muted">
                      {company.mercado}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink-muted">
                    {company.pais} · {company.sector} · Reporta en {company.monedaReporte}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {alertasCriticas > 0 && (
                    <Badge estado="alerta" texto={`${alertasCriticas} Crítica${alertasCriticas > 1 ? "s" : ""}`} />
                  )}
                  {alertasAtencion > 0 && (
                    <Badge estado="atencion" texto={`${alertasAtencion} Atención`} />
                  )}
                  <Link
                    to={`/simulador?ticker=${company.ticker}`}
                    className="ml-2 rounded-lg border border-accent/40 bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent hover:bg-accent/20 transition-colors"
                  >
                    Simular Caja
                  </Link>
                </div>
              </div>

              {/* Tarjetas de alertas de la empresa */}
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {alertas.map((alerta) => {
                  const ui = ESTADO_UI[alerta.estado] ?? ESTADO_UI.sin_datos;
                  return (
                    <div
                      key={alerta.id}
                      className={`rounded-lg border p-3 ${ui.soft} ${ui.border}`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-semibold ${ui.text} flex items-center gap-1.5`}>
                          <span aria-hidden="true">{ui.forma}</span>
                          {alerta.titulo}
                        </span>
                        <span className="font-mono font-bold text-ink">{alerta.valorTexto}</span>
                      </div>
                      <p className="mt-1.5 text-xs text-ink-muted leading-relaxed">
                        {alerta.detalle}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
