import type { ReactNode } from "react";
import type { Estado } from "@/types";

/** Estados: siempre color + forma + texto (nunca solo color). ● Saludable ▲ Precaución ◆ Crítico ○ Sin dato */
export const ESTADO_V2: Record<Estado, { label: string; glyph: string; text: string; bg: string; bar: string; css: string }> = {
  normal: { label: "Saludable", glyph: "●", text: "text-v2-ok", bg: "bg-v2-ok/10 dark:bg-v2-ok/[0.13]", bar: "bg-v2-ok", css: "rgb(var(--v2-ok))" },
  atencion: { label: "Precaución", glyph: "▲", text: "text-v2-warn", bg: "bg-v2-warn/10 dark:bg-v2-warn/[0.13]", bar: "bg-v2-warn", css: "rgb(var(--v2-warn))" },
  alerta: { label: "Crítico", glyph: "◆", text: "text-v2-bad", bg: "bg-v2-bad/10 dark:bg-v2-bad/[0.13]", bar: "bg-v2-bad", css: "rgb(var(--v2-bad))" },
  sin_datos: { label: "Sin dato", glyph: "○", text: "text-v2-ink3", bg: "bg-v2-s2", bar: "bg-v2-d1", css: "rgb(var(--v2-ink3))" },
};

export const SEVERIDAD: Record<Estado, number> = { alerta: 0, atencion: 1, sin_datos: 2, normal: 3 };

export function EstadoBadge({ estado, texto, className = "" }: { estado: Estado; texto?: string; className?: string }) {
  const ui = ESTADO_V2[estado];
  return (
    <span
      role="status"
      aria-label={texto ?? ui.label}
      className={`inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide ${ui.bg} ${ui.text} ${className}`}
    >
      <span aria-hidden="true">{ui.glyph}</span>
      {texto ?? ui.label}
    </span>
  );
}

/** Marca de dato estimado (nunca se muestra como dato reportado). */
export function TagEst({ children = "Est. sectorial" }: { children?: ReactNode }) {
  return <span className="rounded bg-v2-acc/15 px-1.5 py-0.5 font-mono text-[10px] text-v2-acc">{children}</span>;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-v2-line bg-v2-s1 ${className}`}>{children}</div>;
}

export function CardHeader({ titulo, derecha }: { titulo: ReactNode; derecha?: ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-v2-line px-4 py-3">
      <h2 className="text-[13px] font-semibold text-v2-ink">{titulo}</h2>
      {derecha && <span className="font-mono text-[11px] text-v2-ink3">{derecha}</span>}
    </header>
  );
}

/** Control segmentado (período, moneda, escenario). */
export function Seg<T extends string>({
  valor,
  opciones,
  onChange,
  etiqueta,
  mono = true,
  className = "",
}: {
  valor: T;
  opciones: Array<{ id: T; label: string; deshabilitado?: boolean; title?: string }>;
  onChange: (v: T) => void;
  etiqueta: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div role="group" aria-label={etiqueta} className={`flex gap-0.5 rounded-md border border-v2-line bg-v2-bg p-0.5 ${className}`}>
      {opciones.map((o) => (
        <button
          key={o.id}
          type="button"
          disabled={o.deshabilitado}
          title={o.title}
          aria-pressed={valor === o.id}
          onClick={() => onChange(o.id)}
          className={`flex-1 rounded px-2.5 py-1 text-[11px] transition-colors focus-ring disabled:cursor-not-allowed disabled:opacity-40 ${mono ? "font-mono" : ""} ${
            valor === o.id ? "bg-v2-s2 text-v2-ink" : "text-v2-ink2 hover:text-v2-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Slider nativo accesible. */
export function Slider({
  valor,
  min,
  max,
  step,
  onChange,
  etiqueta,
}: {
  valor: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  etiqueta: string;
}) {
  return (
    <input
      type="range"
      aria-label={etiqueta}
      min={min}
      max={max}
      step={step}
      value={valor}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-v2-line2 accent-[rgb(var(--v2-acc))] focus-ring"
    />
  );
}

/** Estado vacío honesto: explica qué dato falta y cómo completarlo (sin "N/D"). */
export function SinDato({ titulo, detalle }: { titulo: string; detalle: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-dashed border-v2-line2 bg-v2-s1 px-4 py-6 text-center">
      <span className="text-[13px] font-medium text-v2-ink">
        <span aria-hidden="true" className="mr-1.5 text-v2-ink3">
          ○
        </span>
        {titulo}
      </span>
      <span className="mx-auto max-w-md text-xs text-v2-ink3">{detalle}</span>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-v2-s2 motion-reduce:animate-none ${className}`} />;
}

export function PaginaSkeleton() {
  return (
    <div role="status" aria-live="polite" aria-label="Cargando datos" className="flex flex-col gap-4">
      <Skeleton className="h-20" />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-36" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

/** Sparkline SVG 112×32: línea de 1,5 px y punto final con el color del estado. */
export function Sparkline({ data, estado }: { data: number[]; estado: Estado }) {
  if (data.length < 3) return null;
  const w = 112;
  const h = 32;
  const pad = 4;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const rango = max - min || 1;
  const pts = data.map((v, i) => [pad + (i * (w - pad * 2)) / (data.length - 1), h - pad - ((v - min) / rango) * (h - pad * 2)] as const);
  const ultimo = pts[pts.length - 1];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" className="shrink-0">
      <polyline fill="none" stroke="rgb(var(--v2-d2))" strokeWidth="1.5" strokeLinejoin="round" points={pts.map((p) => p.join(",")).join(" ")} />
      <circle cx={ultimo[0]} cy={ultimo[1]} r="3" fill={ESTADO_V2[estado].css} />
    </svg>
  );
}
