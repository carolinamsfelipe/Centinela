import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { calcularAltman, diagnosticarAltman } from "@/lib/financial/altman";
import { calcularCentinelaScore } from "@/lib/financial/scores";
import { fmtMoney, fmtNum, fmtPct, fmtX } from "@/lib/format";
import { SECTORES } from "@/data/companies";
import { getCompanies } from "@/services/companyService";
import type { Company, Estado, Mercado, Sector } from "@/types";

type ColumnaOrden =
  | "nombre"
  | "marketCap"
  | "revenue"
  | "roe"
  | "roa"
  | "debtToEquity"
  | "altman"
  | "score";

interface Fila {
  company: Company;
  altman: number | null;
  altmanEstado: Estado;
  score: number | null;
  scoreEstado: Estado;
}

export function Empresas() {
  const [params, setParams] = useSearchParams();
  const [empresas, setEmpresas] = useState<Company[]>([]);
  const [sectoresSel, setSectoresSel] = useState<Set<Sector>>(new Set());
  const [mercado, setMercado] = useState<Mercado | "Todos">("Todos");
  const [riesgo, setRiesgo] = useState<Estado | "Todos">("Todos");
  const [orden, setOrden] = useState<ColumnaOrden>("score");
  const [ordenAsc, setOrdenAsc] = useState(false);

  useEffect(() => {
    getCompanies().then(setEmpresas);
  }, []);

  useEffect(() => {
    const sectorParam = params.get("sector") as Sector | null;
    if (sectorParam) setSectoresSel(new Set([sectorParam]));
  }, [params]);

  const filas: Fila[] = useMemo(() => {
    return empresas.map((company) => {
      const altmanResult = calcularAltman(company.metrics, company.metrics.marketCap);
      const score = calcularCentinelaScore(company.metrics, company.metrics.marketCap);
      return {
        company,
        altman: altmanResult.zScore,
        altmanEstado: diagnosticarAltman(altmanResult.zScore),
        score: score.total,
        scoreEstado: score.estado,
      };
    });
  }, [empresas]);

  const filtradas = useMemo(() => {
    return filas.filter((f) => {
      if (sectoresSel.size > 0 && !sectoresSel.has(f.company.sector)) return false;
      if (mercado !== "Todos" && f.company.mercado !== mercado) return false;
      if (riesgo !== "Todos" && f.scoreEstado !== riesgo) return false;
      return true;
    });
  }, [filas, sectoresSel, mercado, riesgo]);

  const ordenadas = useMemo(() => {
    const copia = [...filtradas];
    copia.sort((a, b) => {
      let va: number | string | null = null;
      let vb: number | string | null = null;
      switch (orden) {
        case "nombre":
          va = a.company.nombre;
          vb = b.company.nombre;
          break;
        case "marketCap":
          va = a.company.metrics.marketCap;
          vb = b.company.metrics.marketCap;
          break;
        case "revenue":
          va = a.company.metrics.revenue;
          vb = b.company.metrics.revenue;
          break;
        case "roe":
          va = a.company.metrics.roe;
          vb = b.company.metrics.roe;
          break;
        case "roa":
          va = a.company.metrics.roa;
          vb = b.company.metrics.roa;
          break;
        case "debtToEquity":
          va = a.company.metrics.debtToEquity;
          vb = b.company.metrics.debtToEquity;
          break;
        case "altman":
          va = a.altman;
          vb = b.altman;
          break;
        case "score":
          va = a.score;
          vb = b.score;
          break;
      }
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      if (typeof va === "string" || typeof vb === "string") {
        return String(va).localeCompare(String(vb)) * (ordenAsc ? 1 : -1);
      }
      return (va - vb) * (ordenAsc ? 1 : -1);
    });
    return copia;
  }, [filtradas, orden, ordenAsc]);

  function toggleSector(sector: Sector) {
    const nuevo = new Set(sectoresSel);
    if (nuevo.has(sector)) nuevo.delete(sector);
    else nuevo.add(sector);
    setSectoresSel(nuevo);
    setParams(nuevo.size === 1 ? { sector: Array.from(nuevo)[0] } : {});
  }

  function ordenarPor(col: ColumnaOrden) {
    if (orden === col) setOrdenAsc(!ordenAsc);
    else {
      setOrden(col);
      setOrdenAsc(false);
    }
  }

  const headerBtn = (label: string, col: ColumnaOrden) => (
    <button
      onClick={() => ordenarPor(col)}
      className="flex items-center gap-1 text-left font-semibold text-ink-muted hover:text-ink focus-ring"
    >
      {label} {orden === col ? (ordenAsc ? "↑" : "↓") : ""}
    </button>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <h1 className="text-2xl font-bold text-ink">Empresas</h1>
      <p className="mt-1 text-sm text-ink-muted">
        {ordenadas.length} de {empresas.length} empresas · ordenamiento basado exclusivamente en el
        indicador seleccionado, no es una recomendación.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-6">
          <div>
            <h2 className="mb-2 text-sm font-semibold text-ink">Sector</h2>
            <div className="space-y-1.5">
              {SECTORES.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm text-ink-muted">
                  <input
                    type="checkbox"
                    checked={sectoresSel.has(s.id as Sector)}
                    onChange={() => toggleSector(s.id as Sector)}
                    className="rounded border-border"
                  />
                  {s.nombre}
                </label>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold text-ink">Mercado</h2>
            <div className="space-y-1.5">
              {(["Todos", "Argentina", "Internacional"] as const).map((m) => (
                <label key={m} className="flex items-center gap-2 text-sm text-ink-muted">
                  <input
                    type="radio"
                    name="mercado"
                    checked={mercado === m}
                    onChange={() => setMercado(m)}
                  />
                  {m}
                </label>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold text-ink">Riesgo (Score Centinela)</h2>
            <div className="space-y-1.5">
              {(["Todos", "normal", "atencion", "alerta"] as const).map((r) => (
                <label key={r} className="flex items-center gap-2 text-sm text-ink-muted">
                  <input
                    type="radio"
                    name="riesgo"
                    checked={riesgo === r}
                    onChange={() => setRiesgo(r)}
                  />
                  {r === "Todos" ? "Todos" : r === "normal" ? "Saludable" : r === "atencion" ? "Atención" : "Riesgo"}
                </label>
              ))}
            </div>
          </div>
        </aside>

        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b border-border bg-bg/50">
              <tr className="[&>th]:px-4 [&>th]:py-3">
                <th>{headerBtn("Empresa", "nombre")}</th>
                <th>Sector</th>
                <th>{headerBtn("Market Cap", "marketCap")}</th>
                <th>{headerBtn("Revenue", "revenue")}</th>
                <th>{headerBtn("ROE", "roe")}</th>
                <th>{headerBtn("ROA", "roa")}</th>
                <th>{headerBtn("D/E", "debtToEquity")}</th>
                <th>{headerBtn("Altman Z''", "altman")}</th>
                <th>{headerBtn("Score Centinela", "score")}</th>
                <th>Señal</th>
              </tr>
            </thead>
            <tbody>
              {ordenadas.map((f) => (
                <tr key={f.company.ticker} className="border-b border-border last:border-0 hover:bg-accent-soft/30">
                  <td className="px-4 py-3">
                    <Link to={`/empresas/${f.company.ticker}`} className="font-medium text-ink hover:text-accent focus-ring">
                      {f.company.nombre}
                    </Link>
                    <div className="font-mono text-xs text-ink-muted">
                      {f.company.ticker}
                      {f.company.fuente === "demo" && " · demo"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{f.company.sector}</td>
                  <td className="px-4 py-3 font-mono">{fmtMoney(f.company.metrics.marketCap)}</td>
                  <td className="px-4 py-3 font-mono">{fmtMoney(f.company.metrics.revenue)}</td>
                  <td className="px-4 py-3 font-mono">{fmtPct(f.company.metrics.roe)}</td>
                  <td className="px-4 py-3 font-mono">{fmtPct(f.company.metrics.roa)}</td>
                  <td className="px-4 py-3 font-mono">{fmtX(f.company.metrics.debtToEquity)}</td>
                  <td className="px-4 py-3 font-mono">{fmtNum(f.altman)}</td>
                  <td className="px-4 py-3 font-mono">{f.score ?? "N/D"}</td>
                  <td className="px-4 py-3">
                    <Badge estado={f.scoreEstado} />
                  </td>
                </tr>
              ))}
              {ordenadas.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-ink-muted">
                    Ninguna empresa coincide con los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
