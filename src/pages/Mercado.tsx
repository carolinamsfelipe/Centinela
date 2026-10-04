import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { MERCADOS, SECTORES } from "@/data/companies";
import { analizarEmpresa } from "@/lib/financial/analysis";
import { SCORE_ESTADO_THRESHOLDS } from "@/lib/financial/scoreConfig";
import { fmtNum, fmtPct } from "@/lib/format";
import { getCompanies } from "@/services/companyService";
import type { Company, Estado } from "@/types";

const ESTADO_TILE_CLASSES: Record<Estado, string> = {
  alerta: "bg-bad-soft text-bad border-bad/30",
  atencion: "bg-warn-soft text-warn border-warn/30",
  normal: "bg-ok-soft text-ok border-ok/30",
  sin_datos: "bg-neutral-soft text-neutral border-neutral/30",
};

function estadoDesdePromedio(avg: number | null): Estado {
  if (avg === null) return "sin_datos";
  if (avg >= SCORE_ESTADO_THRESHOLDS.normal) return "normal";
  if (avg >= SCORE_ESTADO_THRESHOLDS.atencion) return "atencion";
  return "alerta";
}

interface FilaVariacion {
  company: Company;
  variacion: number;
}

function fmtVariacionConSigno(v: number): string {
  return `${v > 0 ? "+" : ""}${fmtPct(v, 1)}`;
}

export function Mercado() {
  const [empresas, setEmpresas] = useState<Company[] | null>(null);

  useEffect(() => {
    getCompanies().then(setEmpresas);
  }, []);

  const lista = useMemo(() => empresas ?? [], [empresas]);

  const conVariacion: FilaVariacion[] = useMemo(() => {
    return lista
      .filter((c) => c.metrics.variacionDiaria !== null)
      .map((c) => ({ company: c, variacion: c.metrics.variacionDiaria as number }));
  }, [lista]);

  const ganadores = useMemo(
    () =>
      conVariacion
        .filter((f) => f.variacion > 0)
        .sort((a, b) => b.variacion - a.variacion)
        .slice(0, 5),
    [conVariacion]
  );
  const perdedores = useMemo(
    () =>
      conVariacion
        .filter((f) => f.variacion < 0)
        .sort((a, b) => a.variacion - b.variacion)
        .slice(0, 5),
    [conVariacion]
  );

  const heatmap = useMemo(() => {
    return SECTORES.map((s) => {
      const delSector = lista.filter((c) => c.sector === s.id);
      const scores = delSector
        .map((c) => analizarEmpresa(c).score.total)
        .filter((v): v is number => v !== null);
      const promedio = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
      return {
        sector: s,
        promedio,
        estado: estadoDesdePromedio(promedio),
        cantidadEmpresas: delSector.length,
      };
    }).filter((h) => h.cantidadEmpresas > 0);
  }, [lista]);

  const porMercado = useMemo(() => {
    return MERCADOS.map((mk) => {
      const delMercado = lista.filter((c) => c.mercado === mk.id);
      const scores = delMercado
        .map((c) => analizarEmpresa(c).score.total)
        .filter((v): v is number => v !== null);
      const promedio = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
      return {
        mercado: mk,
        promedio,
        estado: estadoDesdePromedio(promedio),
        cantidadEmpresas: delMercado.length,
        conScore: scores.length,
      };
    }).filter((h) => h.cantidadEmpresas > 0);
  }, [lista]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <h1 className="text-2xl font-bold text-ink">Mercado</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Panorama calculado en vivo sobre el dataset de <Link to="/empresas" className="underline">empresas</Link>.
        No constituye una recomendación de inversión.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold text-ink">Ganadores del día</h2>
          <p className="mt-1 text-xs text-ink-muted">
            Variación del último día de negociación de cada empresa, en vivo desde Yahoo Finance
            (precio en la moneda de cotización: US$ para los ADR). Un mercado cerrado muestra la
            variación de su última rueda.
          </p>
          <ul className="mt-3 space-y-2">
            {ganadores.map((f) => (
              <li key={f.company.ticker} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <Link
                    to={`/empresas/${f.company.ticker}`}
                    className="font-medium text-ink hover:text-accent focus-ring"
                  >
                    {f.company.nombre}
                  </Link>
                  <div className="font-mono text-xs text-ink-muted">{f.company.ticker}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm text-ink">
                    {f.company.metrics.precio !== null ? `${f.company.monedaPrecio ?? "USD"} ${fmtNum(f.company.metrics.precio, 2)}` : "N/D"}
                  </div>
                  <div className="font-mono text-sm font-semibold text-ok">
                    {fmtVariacionConSigno(f.variacion)}
                  </div>
                </div>
              </li>
            ))}
            {ganadores.length === 0 && (
              <li className="rounded-lg border border-border p-3 text-sm text-ink-muted">
                {empresas === null ? "Consultando precios en vivo..." : "No hay empresas con variación diaria disponible."}
              </li>
            )}
          </ul>
        </Card>

        <Card>
          <h2 className="font-semibold text-ink">Perdedores del día</h2>
          <p className="mt-1 text-xs text-ink-muted">
            Idem: variación de la última rueda de cada empresa.
          </p>
          <ul className="mt-3 space-y-2">
            {perdedores.map((f) => (
              <li key={f.company.ticker} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <Link
                    to={`/empresas/${f.company.ticker}`}
                    className="font-medium text-ink hover:text-accent focus-ring"
                  >
                    {f.company.nombre}
                  </Link>
                  <div className="font-mono text-xs text-ink-muted">{f.company.ticker}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm text-ink">
                    {f.company.metrics.precio !== null ? `${f.company.monedaPrecio ?? "USD"} ${fmtNum(f.company.metrics.precio, 2)}` : "N/D"}
                  </div>
                  <div className="font-mono text-sm font-semibold text-bad">
                    {fmtVariacionConSigno(f.variacion)}
                  </div>
                </div>
              </li>
            ))}
            {perdedores.length === 0 && (
              <li className="rounded-lg border border-border p-3 text-sm text-ink-muted">
                {empresas === null ? "Consultando precios en vivo..." : "No hay empresas con variación diaria disponible."}
              </li>
            )}
          </ul>
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="font-semibold text-ink">Heatmap sectorial — Score Centinela promedio</h2>
        <p className="mt-1 text-xs text-ink-muted">
          Cada celda es el promedio del Score Centinela de las empresas del sector en el universo de
          Centinela (los bancos no tienen Score). No es un índice sectorial oficial; con pocas
          empresas por sector, el promedio puede no ser representativo del sector real.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {heatmap.map((h) => (
            <div
              key={h.sector.id}
              className={`rounded-lg border p-3 ${ESTADO_TILE_CLASSES[h.estado]}`}
            >
              <div className="text-xs font-medium opacity-90">{h.sector.nombre}</div>
              <div className="mt-1 font-mono text-xl font-bold">
                {h.promedio !== null ? Math.round(h.promedio) : "N/D"}
              </div>
              <div className="mt-1 text-xs opacity-80">
                {h.cantidadEmpresas} {h.cantidadEmpresas === 1 ? "empresa" : "empresas"}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-6">
        <h2 className="font-semibold text-ink">Score Centinela promedio por mercado</h2>
        <p className="mt-1 text-xs text-ink-muted">
          Promedio de las empresas de cada mercado que tienen Score (excluye bancos). Sirve para
          comparar la salud financiera típica entre mercados; no es un índice de mercado.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {porMercado.map((h) => (
            <Link
              key={h.mercado.id}
              to={`/empresas?mercado=${encodeURIComponent(h.mercado.id)}`}
              className={`rounded-lg border p-3 focus-ring ${ESTADO_TILE_CLASSES[h.estado]}`}
            >
              <div className="text-xs font-medium opacity-90">{h.mercado.nombre}</div>
              <div className="mt-1 font-mono text-xl font-bold">
                {h.promedio !== null ? Math.round(h.promedio) : "N/D"}
              </div>
              <div className="mt-1 text-xs opacity-80">
                {h.conScore} de {h.cantidadEmpresas} {h.cantidadEmpresas === 1 ? "empresa" : "empresas"} con Score
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
