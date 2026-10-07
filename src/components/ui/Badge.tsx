import type { Estado } from "@/types";
import { ESTADO_UI } from "@/lib/financial/estadoUi";

export function Badge({ estado, texto }: { estado: Estado; texto?: string }) {
  const ui = ESTADO_UI[estado] ?? ESTADO_UI.sin_datos;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border ${ui.soft} ${ui.text} ${ui.border}`}
      role="status"
    >
      <span aria-hidden="true" className="text-[10px] leading-none">{ui.forma}</span>
      {texto ?? ui.label}
    </span>
  );
}
