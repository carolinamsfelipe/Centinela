import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { Card } from "@/components/ui/Card";
import { formatMacroValor, formatMacroVariacion, MACRO_DISCLAIMER_RESPALDO } from "@/data/macro";
import { fmtNum } from "@/lib/format";
import { getMacroIndicators } from "@/services/macroService";
import type { MacroIndicator } from "@/types";

function IndicadorCard({ indicador }: { indicador: MacroIndicator }) {
  const variacion = formatMacroVariacion(indicador.variacion);
  const historico = indicador.historico ?? [];

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-ink">{indicador.nombre}</h3>
      </div>

      <div className="mt-3 flex items-end justify-between">
        <div className="font-mono text-2xl font-bold text-ink">{formatMacroValor(indicador)}</div>
        <div className={`font-mono text-sm font-semibold ${variacion.clase}`}>{variacion.texto}</div>
      </div>

      {historico.length > 1 && (
        <div className="mt-4 h-16">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={historico}>
              <CartesianGrid stroke="rgb(var(--border))" strokeDasharray="3 3" vertical={false} />
              <RechartsTooltip
                labelFormatter={(v) => String(v)}
                formatter={(v: number) => [fmtNum(v, 2), indicador.unidad]}
                contentStyle={{
                  background: "rgb(var(--surface))",
                  border: "1px solid rgb(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Line type="monotone" dataKey="valor" stroke="rgb(var(--accent))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <dl className="mt-4 space-y-1 border-t border-border pt-3 text-xs text-ink-muted">
        <div className="flex justify-between gap-2">
          <dt>Fecha del dato</dt>
          <dd className="font-mono text-ink">{indicador.fecha}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Fuente</dt>
          <dd className="text-right">{indicador.fuente}</dd>
        </div>
      </dl>
    </Card>
  );
}

export function Macro() {
  const [indicadores, setIndicadores] = useState<MacroIndicator[]>([]);
  const [envivo, setEnvivo] = useState<boolean | null>(null);
  const [actualizado, setActualizado] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    getMacroIndicators().then((r) => {
      if (!activo) return;
      setIndicadores(r.indicadores);
      setEnvivo(r.envivo);
      setActualizado(r.actualizado);
    });
    return () => {
      activo = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <h1 className="text-2xl font-bold text-ink">Contexto macroeconómico</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Indicadores de referencia de la economía argentina: dólar, inflación, tasa BADLAR, reservas
        internacionales e índice Merval.
      </p>

      {envivo === true && (
        <div role="status" className="mt-4 rounded-xl border border-ok bg-ok-soft p-3 text-sm text-ok">
          🟢 En vivo — conectado a dolarapi.com, BCRA y Yahoo Finance.
          {actualizado && (
            <span className="ml-1 text-ink-muted">
              Última consulta: {new Date(actualizado).toLocaleTimeString("es-AR")}.
            </span>
          )}
        </div>
      )}
      {envivo === false && (
        <div role="status" className="mt-4 rounded-xl border border-warn bg-warn-soft p-4 text-sm text-warn">
          <span className="font-semibold">⚠️ {MACRO_DISCLAIMER_RESPALDO}</span>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {indicadores.map((indicador) => (
          <IndicadorCard key={indicador.id} indicador={indicador} />
        ))}
        {envivo === null && (
          <p className="text-sm text-ink-muted">Consultando fuentes en vivo...</p>
        )}
      </div>
    </div>
  );
}
