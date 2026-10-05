import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { MERCADOS, nombreMercado, nombreSector } from "@/data/companies";
import { analizarEmpresa, esEntidadFinanciera } from "@/lib/financial/analysis";
import { aUsd, fmtMonto, fmtPct, fmtX } from "@/lib/format";
import { getMarketCompanies } from "@/services/companyService";
import type { Company, Estado, Mercado } from "@/types";

type RankingId = "score" | "roe" | "margenNeto" | "endeudamiento" | "marketCap" | "crecimiento";

interface Fila {
  company: Company;
  scoreTotal: number | null;
  scoreEstado: Estado;
  crecimientoRevenue: number | null;
}

interface RankingConfig {
  id: RankingId;
  label: string;
  descripcion: string;
  valorLabel: string;
  asc: boolean;
  getValor: (f: Fila) => number | null;
  format: (v: number | null) => string;
}

// En monedas de alta inflacion la variacion nominal de ingresos no mide crecimiento real:
// esas empresas quedan fuera de este ranking en lugar de aparecer arriba por la inflacion.
const MONEDAS_ALTA_INFLACION = ["ARS"];

function calcularCrecimientoRevenue(company: Company): number | null {
  if (MONEDAS_ALTA_INFLACION.includes(company.monedaReporte)) return null;
  const h = company.historico;
  if (h.length < 2) return null;
  const last = h[h.length - 1];
  const prev = h[h.length - 2];
  if (last.revenue === null || prev.revenue === null || prev.revenue === 0) return null;
  return (last.revenue - prev.revenue) / prev.revenue;
}

const RANKINGS: RankingConfig[] = [
  {
    id: "score",
    label: "Mayor Score Centinela",
    descripcion: "Empresas ordenadas de mayor a menor Score Centinela (0-100).",
    valorLabel: "Score Centinela",
    asc: false,
    getValor: (f) => f.scoreTotal,
    format: (v) => (v === null ? "N/D" : `${v} / 100`),
  },
  {
    id: "roe",
    label: "Mayor ROE",
    descripcion: "Empresas ordenadas de mayor a menor rentabilidad sobre el patrimonio (ROE).",
    valorLabel: "ROE",
    asc: false,
    getValor: (f) => f.company.metrics.roe,
    format: fmtPct,
  },
  {
    id: "margenNeto",
    label: "Mayor margen neto",
    descripcion: "Empresas ordenadas de mayor a menor margen neto sobre ventas.",
    valorLabel: "Margen neto",
    asc: false,
    getValor: (f) => f.company.metrics.margenNeto,
    format: fmtPct,
  },
  {
    id: "endeudamiento",
    label: "Menor endeudamiento",
    descripcion: "Empresas ordenadas de menor a mayor relación Deuda/Patrimonio (Debt/Equity). No incluye bancos: en una entidad financiera la deuda es parte del negocio.",
    valorLabel: "Debt/Equity",
    asc: true,
    getValor: (f) => (esEntidadFinanciera(f.company) ? null : f.company.metrics.debtToEquity),
    format: fmtX,
  },
  {
    id: "marketCap",
    label: "Mayor Market Cap",
    descripcion: "Empresas ordenadas de mayor a menor capitalización de mercado, en US$ al tipo de cambio actual.",
    valorLabel: "Market Cap",
    asc: false,
    getValor: (f) => aUsd(f.company.metrics.marketCap, f.company),
    format: (v) => fmtMonto(v, { monedaReporte: "USD", tipoCambioUsd: 1 }),
  },
  {
    id: "crecimiento",
    label: "Mayor crecimiento de ingresos",
    descripcion:
      "Variación de ingresos entre los dos últimos ejercicios. Solo se calcula para empresas con ingresos informados en ambos y que no reporten en una moneda de alta inflación (pesos argentinos): su variación nominal no mide crecimiento real.",
    valorLabel: "Crecimiento de ingresos",
    asc: false,
    getValor: (f) => f.crecimientoRevenue,
    format: fmtPct,
  },
];

export function Rankings() {
  const [empresas, setEmpresas] = useState<Company[] | null>(null);
  const [rankingId, setRankingId] = useState<RankingId>("score");
  const [mercado, setMercado] = useState<Mercado | "Todos">("Todos");

  useEffect(() => {
    getMarketCompanies().then(setEmpresas);
  }, []);

  const filas: Fila[] = useMemo(() => {
    return (empresas ?? [])
      .filter((company) => mercado === "Todos" || company.mercado === mercado)
      .map((company) => {
        const { score } = analizarEmpresa(company);
        return {
          company,
          scoreTotal: score.total,
          scoreEstado: score.estado,
          crecimientoRevenue: calcularCrecimientoRevenue(company),
        };
      });
  }, [empresas, mercado]);

  const ranking = RANKINGS.find((r) => r.id === rankingId) ?? RANKINGS[0];

  const ordenadas = useMemo(() => {
    const copia = [...filas];
    copia.sort((a, b) => {
      const va = ranking.getValor(a);
      const vb = ranking.getValor(b);
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      return (va - vb) * (ranking.asc ? 1 : -1);
    });
    return copia;
  }, [filas, ranking]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <h1 className="text-2xl font-bold text-ink">Rankings</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Ordenamiento basado exclusivamente en el indicador seleccionado. Esta vista no constituye
        asesoramiento financiero ni una recomendación de inversión.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {RANKINGS.map((r) => (
          <button
            key={r.id}
            onClick={() => setRankingId(r.id)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold focus-ring ${
              rankingId === r.id
                ? "bg-accent-soft text-accent"
                : "border border-border text-ink-muted hover:text-ink"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          Mercado
          <select
            value={mercado}
            onChange={(e) => setMercado(e.target.value as Mercado | "Todos")}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-ink focus-ring"
          >
            <option value="Todos">Todos los mercados</option>
            {MERCADOS.filter((m) => (empresas ?? []).some((c) => c.mercado === m.id)).map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-ink-muted">{ranking.descripcion}</p>
      </div>

      <Card className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="border-b border-border bg-bg/50">
            <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-left">
              <th>#</th>
              <th>Empresa</th>
              <th>Mercado</th>
              <th>Sector</th>
              <th>{ranking.valorLabel}</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {ordenadas.map((f, i) => (
              <tr key={f.company.ticker} className="border-b border-border last:border-0 hover:bg-accent-soft/30">
                <td className="px-4 py-3 font-mono text-ink-muted">{i + 1}</td>
                <td className="px-4 py-3">
                  <Link
                    to={`/empresas/${f.company.ticker}`}
                    className="font-medium text-ink hover:text-accent focus-ring"
                  >
                    {f.company.nombre}
                  </Link>
                  <div className="font-mono text-xs text-ink-muted">
                    {f.company.fuente === "propia" ? "Mi empresa" : f.company.ticker}
                  </div>
                </td>
                <td className="px-4 py-3 text-ink-muted">{nombreMercado(f.company.mercado)}</td>
                <td className="px-4 py-3 text-ink-muted">{nombreSector(f.company.sector)}</td>
                <td className="px-4 py-3 font-mono text-ink">
                  {ranking.format(ranking.getValor(f))}
                </td>
                <td className="px-4 py-3">
                  <Badge estado={f.scoreEstado} />
                </td>
              </tr>
            ))}
            {empresas === null && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-ink-muted">
                  Cargando datos en vivo...
                </td>
              </tr>
            )}
            {empresas !== null && ordenadas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-ink-muted">
                  No hay empresas disponibles.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
