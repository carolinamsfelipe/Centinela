import { formatMacroValor, formatMacroVariacion } from "@/data/macro";
import type { MacroIndicator } from "@/types";

/**
 * Tira de contexto macro (como el "ticker" de arriba del Centinela
 * original): los 3 indicadores mas relevantes para la empresa, en vivo, con
 * su fuente y fecha.
 */
export function MacroTicker({ indicadores, envivo }: { indicadores: MacroIndicator[]; envivo: boolean }) {
  if (indicadores.length === 0) return null;
  const visibles = indicadores.slice(0, 3);
  return (
    <div
      className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3"
      aria-label="Contexto macroeconómico"
    >
      {visibles.map((ind) => {
        const variacion = formatMacroVariacion(ind.variacion);
        return (
          <div key={ind.id} className="bg-surface px-4 py-3">
            <div className="text-[11px] uppercase tracking-wide text-ink-muted">{ind.nombre}</div>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="font-mono text-xl font-semibold text-ink">{formatMacroValor(ind)}</span>
              {ind.variacion !== null && (
                <span className={`font-mono text-xs font-semibold ${variacion.clase}`}>{variacion.texto}</span>
              )}
            </div>
            <div className="mt-0.5 text-[11px] text-ink-muted">
              {ind.fuente} · {envivo ? "en vivo" : "respaldo"}
            </div>
          </div>
        );
      })}
    </div>
  );
}
