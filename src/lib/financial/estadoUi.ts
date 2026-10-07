import type { Estado } from "@/types";

export interface EstadoEstilo {
  label: string;
  forma: string;
  text: string;
  soft: string;
  border: string;
  css: string;
}

/**
 * Presentación única e institucional de los estados financieros.
 * Cumple WCAG 2.1 AA combinando color, forma geométrica distintiva y texto:
 *  ● Normal / Saludable
 *  ▲ Atención / Precaución
 *  ◆ Alerta / Crítico
 *  ○ Sin datos
 */
export const ESTADO_UI: Record<Estado, EstadoEstilo> = {
  normal: {
    label: "Saludable",
    forma: "●",
    text: "text-ok",
    soft: "bg-ok-soft",
    border: "border-ok/30",
    css: "rgb(var(--ok))",
  },
  atencion: {
    label: "Atención",
    forma: "▲",
    text: "text-warn",
    soft: "bg-warn-soft",
    border: "border-warn/30",
    css: "rgb(var(--warn))",
  },
  alerta: {
    label: "Alerta crítica",
    forma: "◆",
    text: "text-bad",
    soft: "bg-bad-soft",
    border: "border-bad/30",
    css: "rgb(var(--bad))",
  },
  sin_datos: {
    label: "Sin datos",
    forma: "○",
    text: "text-ink-muted",
    soft: "bg-neutral-soft",
    border: "border-border",
    css: "rgb(var(--ink-muted))",
  },
};

/**
 * Clase cromática según el signo de un valor de caja o flujo:
 * Verde para liberado (> 0), rojo para absorbido (< 0), neutro para 0.
 */
export function claseSigno(valor: number | null | undefined): string {
  if (valor == null || valor === 0) return "text-ink-muted";
  return valor > 0 ? "text-ok" : "text-bad";
}
