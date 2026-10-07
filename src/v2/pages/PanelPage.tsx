import { useNavigate } from "react-router-dom";
import { useV2 } from "../context";
import { Card, CardHeader, EstadoBadge, PaginaSkeleton, Sparkline } from "../ui";
import { ESTADO_V2 } from "../ui";

export function PanelPage() {
  const { modelo } = useV2();
  const navigate = useNavigate();

  if (!modelo) return <PaginaSkeleton />;

  const { score, altmanZ, estadoGeneral, conteo, resumen, kpis, alertas, semaforo } = modelo;
  const criticas = alertas.filter((a) => a.estado === "alerta");
  const ordenadas = [...alertas].sort((a, b) => (a.estado === "alerta" ? -1 : b.estado === "alerta" ? 1 : 0));

  return (
    <section aria-label="Panel general y alerta temprana" className="flex flex-col gap-4">
      {/* 1. Franja de Estado General */}
      <Card className="flex flex-wrap items-stretch overflow-hidden">
        <div className="flex min-w-[200px] flex-col justify-center gap-1 border-b border-v2-line p-3.5 sm:border-b-0 sm:border-r">
          <span className="text-[10px] uppercase tracking-[0.08em] text-v2-ink3">Estado general</span>
          <div className="flex items-baseline gap-2 whitespace-nowrap">
            <span className="font-mono text-2xl font-medium text-v2-ink">{score ?? (altmanZ ? altmanZ.toFixed(2) : "N/D")}</span>
            <span className="font-mono text-xs text-v2-ink3">{score ? "/100 Score" : "Altman Z''"}</span>
          </div>
          <EstadoBadge estado={estadoGeneral} className="self-start" />
        </div>
        <div className="flex items-center gap-5 border-b border-v2-line p-3.5 sm:border-b-0 sm:border-r">
          <div className="flex flex-col items-center gap-0.5">
            <span className="font-mono text-xl font-medium text-v2-bad">{conteo.alerta}</span>
            <span className="text-[11px] text-v2-ink2">Críticas</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="font-mono text-xl font-medium text-v2-warn">{conteo.atencion}</span>
            <span className="text-[11px] text-v2-ink2">Precaución</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="font-mono text-xl font-medium text-v2-ok">{conteo.normal}</span>
            <span className="text-[11px] text-v2-ink2">Saludables</span>
          </div>
        </div>
        <p className="m-0 min-w-[260px] flex-1 p-3.5 text-[13px] leading-relaxed text-v2-ink2 text-pretty">{resumen}</p>
      </Card>

      {/* 2. KPIs de Alerta Temprana con Sparklines */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
        {kpis.map((k) => (
          <button
            key={k.id}
            type="button"
            onClick={() => navigate(`/v2/${k.modulo === "panel" ? "" : k.modulo === "sim" ? "simulador" : k.modulo === "bench" ? "benchmark" : k.modulo === "ccc" ? "capital-trabajo" : k.modulo}`)}
            className="flex flex-col gap-2.5 rounded-lg border border-v2-line bg-v2-s1 p-4 text-left transition-colors hover:border-v2-line2 hover:bg-v2-s2 focus-ring"
          >
            <div className="flex w-full items-center justify-between gap-2">
              <span className="text-xs text-v2-ink2">{k.label}</span>
              <EstadoBadge estado={k.estado} />
            </div>
            <div className="flex w-full items-end justify-between gap-2">
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono text-3xl font-medium tracking-tight text-v2-ink">{k.valor}</span>
                <span className="font-mono text-xs text-v2-ink3">{k.unidad}</span>
              </div>
              <Sparkline data={k.serie} estado={k.estado} />
            </div>
            <div className="flex w-full flex-wrap items-center gap-x-3.5 gap-y-1 border-t border-v2-line pt-2.5 font-mono text-[11px]">
              {k.delta && (
                <span className={k.delta.empeora ? "text-v2-bad" : "text-v2-ok"}>
                  {k.delta.texto} <span className="text-v2-ink3">YoY</span>
                </span>
              )}
              <span className="ml-auto text-v2-ink3">{k.referencia}</span>
            </div>
          </button>
        ))}
      </div>

      {/* 3. Alertas Tempranas y Semáforo */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] gap-3 items-start">
        {/* Alertas */}
        <Card className="overflow-hidden">
          <CardHeader titulo="Alertas tempranas" derecha={`${ordenadas.length} activas · por severidad`} />
          <ul role="list" className="divide-y divide-v2-line">
            {ordenadas.length === 0 ? (
              <li className="p-4 text-xs text-v2-ink3">No se detectaron alertas críticas ni de atención.</li>
            ) : (
              ordenadas.map((a) => {
                const ui = ESTADO_V2[a.estado];
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/v2/${a.modulo === "panel" ? "" : a.modulo === "sim" ? "simulador" : a.modulo === "bench" ? "benchmark" : a.modulo === "ccc" ? "capital-trabajo" : a.modulo}`)}
                      className="grid w-full grid-cols-[3px_minmax(0,1fr)_auto] items-center gap-3 p-3 text-left transition-colors hover:bg-v2-s2 focus-ring"
                    >
                      <span className={`self-stretch ${ui.bar}`} aria-hidden="true" />
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="flex items-center gap-2 text-[13px] font-medium text-v2-ink">
                          <span className={`text-[10px] ${ui.text}`} aria-hidden="true">
                            {ui.glyph}
                          </span>
                          {a.titulo}
                        </span>
                        <span className="font-mono text-[11px] text-v2-ink2">{a.detalle}</span>
                      </div>
                      <span className="flex items-center gap-1 text-[11px] text-v2-ink3">
                        {a.moduloLabel}
                        <span aria-hidden="true">↗</span>
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </Card>

        {/* Semáforo por Indicador */}
        <Card className="overflow-hidden">
          <CardHeader titulo="Semáforo por indicador" derecha="criterio a la vista" />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-v2-line text-left text-[10px] uppercase tracking-[0.06em] text-v2-ink3">
                  <th className="px-4 py-2 font-medium">Indicador</th>
                  <th className="px-3 py-2 text-right font-medium">Valor</th>
                  <th className="px-3 py-2 font-medium">Estado</th>
                  <th className="px-4 py-2 font-medium">Umbrales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-v2-line">
                {semaforo.map((s) => {
                  const ui = ESTADO_V2[s.estado];
                  return (
                    <tr key={s.id} className="transition-colors hover:bg-v2-s2">
                      <td className="px-4 py-2 text-v2-ink">{s.nombre}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right font-mono text-v2-ink">{s.valorTexto}</td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${ui.text}`}>
                          <span aria-hidden="true" className="text-[9px]">
                            {ui.glyph}
                          </span>
                          {ui.label}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-mono text-[11px] text-v2-ink3">{s.criterio}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </section>
  );
}
