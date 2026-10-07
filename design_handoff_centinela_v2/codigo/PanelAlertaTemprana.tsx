/**
 * Centinela · Panel de Alerta Temprana
 * React 18 + Tailwind (tokens de codigo/tokens.css) + shadcn/ui + lucide-react + Recharts.
 *
 * Requiere: npx shadcn@latest add card badge tooltip
 *           npm i lucide-react recharts
 *
 * Los estados reutilizan el tipo `Estado` del repo (src/types) y los umbrales
 * de src/lib/financial/diagnostics.ts: el panel no calcula, solo presenta.
 */
import { useMemo } from "react";
import { ArrowUpRight, Circle, Diamond, Triangle } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Estado } from "@/types";

/* ---------- Tipos ---------- */
export type ModuloId = "panel" | "ccc" | "deuda" | "sim" | "bench";

export interface KpiAlerta {
  id: "ccc" | "icr" | "fx" | "runway";
  label: string;
  valor: string; // ya formateado con fmtNum/fmtX del repo
  unidad: string;
  estado: Estado;
  serie: number[]; // 8 trimestres, el último es el actual
  deltaQoQ: { texto: string; empeora: boolean };
  deltaYoY: { texto: string; empeora: boolean };
  referencia: string; // "med. 79 d", "quiebre 1,0x"
  criterio: string; // CRITERIOS de semaforo.ts
  modulo: ModuloId;
}

export interface AlertaTemprana {
  id: string;
  estado: Exclude<Estado, "normal" | "sin_datos">;
  titulo: string;
  detalle: string;
  modulo: ModuloId;
  moduloLabel: string;
}

interface Props {
  score: number | null;
  estadoGeneral: Estado;
  resumen: string;
  kpis: KpiAlerta[];
  alertas: AlertaTemprana[];
  conteo: { alerta: number; atencion: number; normal: number };
  onNavigate: (m: ModuloId) => void;
}

/* ---------- Estado -> presentación (color + forma, nunca solo color) ---------- */
const ESTADO_UI: Record<Estado, { label: string; text: string; bg: string; Icon: typeof Circle }> = {
  normal: { label: "Saludable", text: "text-ok", bg: "bg-ok-soft", Icon: Circle },
  atencion: { label: "Precaución", text: "text-warn", bg: "bg-warn-soft", Icon: Triangle },
  alerta: { label: "Crítico", text: "text-bad", bg: "bg-bad-soft", Icon: Diamond },
  sin_datos: { label: "Sin dato", text: "text-ink-muted", bg: "bg-neutral-soft", Icon: Circle },
};

const SEVERIDAD: Record<Estado, number> = { alerta: 0, atencion: 1, sin_datos: 2, normal: 3 };

export function EstadoBadge({ estado, className = "" }: { estado: Estado; className?: string }) {
  const ui = ESTADO_UI[estado];
  return (
    <span
      role="status"
      className={`inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide ${ui.bg} ${ui.text} ${className}`}
    >
      <ui.Icon className="h-2.5 w-2.5 fill-current" aria-hidden />
      {ui.label}
    </span>
  );
}

/* ---------- Sparkline ---------- */
function Sparkline({ data, estado }: { data: number[]; estado: Estado }) {
  const puntos = useMemo(() => data.map((v, i) => ({ i, v })), [data]);
  const color = { normal: "rgb(var(--ok))", atencion: "rgb(var(--warn))", alerta: "rgb(var(--bad))", sin_datos: "rgb(var(--ink-muted))" }[estado];
  return (
    <div className="h-8 w-28 shrink-0" aria-hidden>
      <ResponsiveContainer>
        <LineChart data={puntos} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Line
            type="monotone"
            dataKey="v"
            stroke="rgb(var(--chart-2))"
            strokeWidth={1.5}
            isAnimationActive={false}
            dot={(p: { index: number; cx: number; cy: number }) =>
              p.index === puntos.length - 1 ? <circle key="last" cx={p.cx} cy={p.cy} r={3} fill={color} /> : <g key={p.index} />
            }
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ---------- KPI card ---------- */
function KpiCard({ kpi, onClick }: { kpi: KpiAlerta; onClick: () => void }) {
  const delta = (d: KpiAlerta["deltaQoQ"]) => (d.empeora ? "text-bad" : "text-ok");
  return (
    <button
      onClick={onClick}
      className="group flex flex-col gap-2.5 rounded-lg border border-border bg-surface p-4 text-left transition-colors hover:border-border-strong hover:bg-surface-2 focus-ring"
    >
      <div className="flex w-full items-center justify-between gap-2">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs text-ink-muted underline decoration-dotted underline-offset-4">{kpi.label}</span>
            </TooltipTrigger>
            <TooltipContent className="font-mono text-[11px]">{kpi.criterio}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <EstadoBadge estado={kpi.estado} />
      </div>
      <div className="flex w-full items-end justify-between gap-2">
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono text-3xl font-medium leading-none tracking-tight tabular-nums text-ink">{kpi.valor}</span>
          <span className="font-mono text-xs text-ink-subtle">{kpi.unidad}</span>
        </div>
        <Sparkline data={kpi.serie} estado={kpi.estado} />
      </div>
      <div className="flex w-full flex-wrap gap-x-3.5 gap-y-1 border-t border-border pt-2.5 font-mono text-[11px] tabular-nums">
        <span className={delta(kpi.deltaQoQ)}>
          {kpi.deltaQoQ.texto} <span className="text-ink-subtle">QoQ</span>
        </span>
        <span className={delta(kpi.deltaYoY)}>
          {kpi.deltaYoY.texto} <span className="text-ink-subtle">YoY</span>
        </span>
        <span className="ml-auto text-ink-subtle">{kpi.referencia}</span>
      </div>
    </button>
  );
}

/* ---------- Panel ---------- */
export function PanelAlertaTemprana({ score, estadoGeneral, resumen, kpis, alertas, conteo, onNavigate }: Props) {
  const ordenadas = useMemo(() => [...alertas].sort((a, b) => SEVERIDAD[a.estado] - SEVERIDAD[b.estado]), [alertas]);

  return (
    <section aria-label="Panel de alerta temprana" className="flex flex-col gap-4">
      {/* Franja de estado general */}
      <Card className="flex flex-wrap items-stretch overflow-hidden rounded-lg border-border bg-surface p-0 shadow-none">
        <div className="flex min-w-[200px] flex-col justify-center gap-1 border-r border-border px-4 py-3.5">
          <span className="text-[10px] uppercase tracking-[0.08em] text-ink-subtle">Estado general</span>
          <div className="flex items-baseline gap-2 whitespace-nowrap">
            <span className="font-mono text-2xl font-medium tabular-nums">{score ?? "N/D"}</span>
            <span className="font-mono text-xs text-ink-subtle">/100 Score</span>
          </div>
          <EstadoBadge estado={estadoGeneral} className="self-start" />
        </div>
        <dl className="flex items-center gap-5 border-r border-border px-4 py-3.5">
          {([["alerta", "Críticas", "text-bad"], ["atencion", "Precaución", "text-warn"], ["normal", "Saludables", "text-ok"]] as const).map(([k, l, c]) => (
            <div key={k} className="flex flex-col items-center gap-0.5">
              <dd className={`font-mono text-xl tabular-nums ${c}`}>{conteo[k]}</dd>
              <dt className="text-[11px] text-ink-muted">{l}</dt>
            </div>
          ))}
        </dl>
        <p className="m-0 min-w-[260px] flex-1 px-4 py-3.5 text-[13px] leading-relaxed text-ink-muted text-pretty">{resumen}</p>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
        {kpis.map((k) => (
          <KpiCard key={k.id} kpi={k} onClick={() => onNavigate(k.modulo)} />
        ))}
      </div>

      {/* Feed de alertas */}
      <Card className="rounded-lg border-border bg-surface p-0 shadow-none">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-[13px] font-semibold">Alertas tempranas</h2>
          <span className="font-mono text-[11px] text-ink-subtle">{alertas.length} activas · por severidad</span>
        </header>
        <ul role="list">
          {ordenadas.map((a) => {
            const ui = ESTADO_UI[a.estado];
            return (
              <li key={a.id}>
                <button
                  onClick={() => onNavigate(a.modulo)}
                  className="grid w-full grid-cols-[3px_minmax(0,1fr)_auto] items-center gap-3 border-b border-border py-3 pr-4 text-left transition-colors last:border-0 hover:bg-surface-2 focus-ring"
                >
                  <span className={`self-stretch ${a.estado === "alerta" ? "bg-bad" : "bg-warn"}`} aria-hidden />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="flex items-center gap-2 text-[13px] font-medium text-ink">
                      <ui.Icon className={`h-2.5 w-2.5 fill-current ${ui.text}`} aria-label={ui.label} />
                      {a.titulo}
                    </span>
                    <span className="font-mono text-[11px] tabular-nums text-ink-muted">{a.detalle}</span>
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-ink-subtle transition-colors group-hover:text-ink">
                    {a.moduloLabel}
                    <ArrowUpRight className="h-3 w-3" aria-hidden />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Card>
    </section>
  );
}
