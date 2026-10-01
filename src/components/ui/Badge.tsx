import type { Estado } from "@/types";
import { ESTADO_EMOJI, ESTADO_LABEL } from "@/lib/financial/diagnostics";

const CLASSES: Record<Estado, string> = {
  alerta: "bg-bad-soft text-bad",
  atencion: "bg-warn-soft text-warn",
  normal: "bg-ok-soft text-ok",
  sin_datos: "bg-neutral-soft text-neutral",
};

export function Badge({ estado, texto }: { estado: Estado; texto?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${CLASSES[estado]}`}
      role="status"
    >
      <span aria-hidden="true">{ESTADO_EMOJI[estado]}</span>
      {texto ?? ESTADO_LABEL[estado]}
    </span>
  );
}
