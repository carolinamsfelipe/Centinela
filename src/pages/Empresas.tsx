import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { BotonDescarga } from "@/components/ui/BotonDescarga";
import { MERCADOS, SECTORES, nombreMercado, nombreSector } from "@/data/companies";
import { diagnosticarAltman } from "@/lib/financial/altman";
import { analizarEmpresa } from "@/lib/financial/analysis";
import type { AnalisisCalculado } from "@/lib/financial/analysis";
import { aUsd, fmtMonto, fmtNum, fmtPct, fmtScore, fmtX } from "@/lib/format";
import { descargarExcelComparativo } from "@/lib/reports/comparativo";
import { getCompanies } from "@/services/companyService";
import type { Company, Estado, Mercado, Sector } from "@/types";

type ColumnaOrden =
  | "nombre"
  | "mercado"
  | "marketCap"
  | "revenue"
  | "roe"
  | "roa"
  | "debtToEquity"
  | "altman"
  | "score";

interface Fila {
  company: Company;
  analisis: AnalisisCalculado;
  altman: number | null;
  altmanEstado: Estado;
  score: number | null;
  scoreEstado: Estado;
}

export function Empresas() {
  const [params, setParams] = useSearchParams();
  const [empresas, setEmpresas] = useState<Company[] | null>(null);
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
    const mercadoParam = params.get("mercado") as Mercado | null;
    if (mercadoParam) setMercado(mercadoParam);
  }, [params]);

  const lista = useMemo(() => empresas ?? [], [empresas]);

  const filas: Fila[] = useMemo(() => {
    return lista.map((company) => {
      const analisis = analizarEmpresa(company);
      return {
        company,
        analisis,
        altman: analisis.altman.zScore,
        altmanEstado: diagnosticarAltman(analisis.altman.zScore),
        score: analisis.score.total,
        scoreEstado: analisis.score.estado,
      };
    });
  }, [lista]);

  const sectoresDisponibles = useMemo(
    () =>
      SECTORES.map((s) => ({ ...s, cantidad: lista.filter((c) => c.sector === s.id).length })).filter(
        (s) => s.cantidad > 0
      ),
    [lista]
  );
  const mercadosDisponibles = useMemo(
    () =>
      MERCADOS.map((m) => ({ ...m, cantidad: lista.filter((c) => c.mercado === m.id).length })).filter(
        (m) => m.cantidad > 0
      ),
    [lista]
  );

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
        case "mercado":
          va = nombreMercado(a.company.mercado);
          vb = nombreMercado(b.company.mercado);
          break;
        case "marketCap":
          va = aUsd(a.company.metrics.marketCap, a.company);
          vb = aUsd(b.company.metrics.marketCap, b.company);
          break;
        case "revenue":
          va = aUsd(a.company.metrics.revenue, a.company);
          vb = aUsd(b.company.metrics.revenue, b.company);
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

  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);

  const cantFiltrosActivos =
    sectoresSel.size + (mercado !== "Todos" ? 1 : 0) + (riesgo !== "Todos" ? 1 : 0);

  const limpiarFiltros = () => {
    setSectoresSel(new Set());
    setMercado("Todos");
    setRiesgo("Todos");
    setParams({});
  };

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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Empresas</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {empresas === null
              ? "Consultando datos en vivo de Yahoo Finance..."
              : `${ordenadas.length} de ${lista.length} empresas · datos en vivo · ordenamiento basado exclusivamente en el indicador seleccionado, no es una recomendación.`}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            Importes en US$ al tipo de cambio actual. Altman Z&apos;&apos; y Score no se calculan para bancos (N/A).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BotonDescarga
            label="Descargar listado (Excel)"
            disabled={ordenadas.length === 0}
            onDescargar={() =>
              descargarExcelComparativo(ordenadas.map((f) => ({ company: f.company, altman: f.analisis.altman, score: f.analisis.score })))
            }
          />
          <Link
            to="/mi-empresa"
            className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90 focus-ring"
          >
            + Cargar mi empresa
          </Link>
        </div>
      </div>

      {/* Controles mobile de filtros */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 lg:hidden">
        <button
          type="button"
          onClick={() => setFiltrosAbiertos(!filtrosAbiertos)}
          className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-ink focus-ring"
        >
          <span>Filtros</span>
          {cantFiltrosActivos > 0 && (
            <span className="rounded-full bg-accent px-1.5 py-0.5 text-xs text-white">
              {cantFiltrosActivos}
            </span>
          )}
          <span className="text-xs text-ink-muted">{filtrosAbiertos ? "▲" : "▼"}</span>
        </button>

        {cantFiltrosActivos > 0 && (
          <button
            type="button"
            onClick={limpiarFiltros}
            className="text-xs text-accent hover:underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Chips activos en mobile */}
      {cantFiltrosActivos > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5 lg:hidden">
          {Array.from(sectoresSel).map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-bg px-2.5 py-0.5 text-xs text-ink"
            >
              {nombreSector(s)}
              <button type="button" onClick={() => toggleSector(s)} className="text-ink-muted hover:text-ink">
                ×
              </button>
            </span>
          ))}
          {mercado !== "Todos" && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-bg px-2.5 py-0.5 text-xs text-ink">
              {nombreMercado(mercado)}
              <button type="button" onClick={() => setMercado("Todos")} className="text-ink-muted hover:text-ink">
                ×
              </button>
            </span>
          )}
          {riesgo !== "Todos" && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-bg px-2.5 py-0.5 text-xs text-ink">
              {riesgo === "normal" ? "Saludable" : riesgo === "atencion" ? "Atención" : "Riesgo"}
              <button type="button" onClick={() => setRiesgo("Todos")} className="text-ink-muted hover:text-ink">
                ×
              </button>
            </span>
          )}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
        <aside className={`space-y-6 ${filtrosAbiertos ? "block" : "hidden"} lg:block`}>
          <div>
            <h2 className="mb-2 text-sm font-semibold text-ink">Sector</h2>
            <div className="space-y-1.5">
              {sectoresDisponibles.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm text-ink-muted">
                  <input
                    type="checkbox"
                    checked={sectoresSel.has(s.id)}
                    onChange={() => toggleSector(s.id)}
                    className="rounded border-border"
                  />
                  {s.nombre} <span className="text-xs">({s.cantidad})</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold text-ink">Mercado</h2>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm text-ink-muted">
                <input type="radio" name="mercado" checked={mercado === "Todos"} onChange={() => setMercado("Todos")} />
                Todos
              </label>
              {mercadosDisponibles.map((m) => (
                <label key={m.id} className="flex items-center gap-2 text-sm text-ink-muted">
                  <input type="radio" name="mercado" checked={mercado === m.id} onChange={() => setMercado(m.id)} />
                  {m.nombre} <span className="text-xs">({m.cantidad})</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold text-ink">Riesgo (Score Centinela)</h2>
            <div className="space-y-1.5">
              {(["Todos", "normal", "atencion", "alerta"] as const).map((r) => (
                <label key={r} className="flex items-center gap-2 text-sm text-ink-muted">
                  <input type="radio" name="riesgo" checked={riesgo === r} onChange={() => setRiesgo(r)} />
                  {r === "Todos" ? "Todos" : r === "normal" ? "Saludable" : r === "atencion" ? "Atención" : "Riesgo"}
                </label>
              ))}
            </div>
          </div>
        </aside>

        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="border-b border-border bg-bg/50">
              <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-left">
                <th>{headerBtn("Empresa", "nombre")}</th>
                <th>{headerBtn("Mercado", "mercado")}</th>
                <th>Sector</th>
                <th>{headerBtn("Market Cap", "marketCap")}</th>
                <th>{headerBtn("Revenue", "revenue")}</th>
                <th>{headerBtn("ROE", "roe")}</th>
                <th>{headerBtn("ROA", "roa")}</th>
                <th>{headerBtn("D/E", "debtToEquity")}</th>
                <th>{headerBtn("Altman Z''", "altman")}</th>
                <th>{headerBtn("Score", "score")}</th>
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
                      {f.company.fuente === "propia" ? "Mi empresa" : f.company.ticker}
                      {f.company.fuente === "real" && !f.company.envivo && " · respaldo"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{nombreMercado(f.company.mercado)}</td>
                  <td className="px-4 py-3 text-ink-muted">{nombreSector(f.company.sector)}</td>
                  <td className="px-4 py-3 font-mono">{fmtMonto(f.company.metrics.marketCap, f.company)}</td>
                  <td className="px-4 py-3 font-mono">{fmtMonto(f.company.metrics.revenue, f.company)}</td>
                  <td className="px-4 py-3 font-mono">{fmtPct(f.company.metrics.roe)}</td>
                  <td className="px-4 py-3 font-mono">{fmtPct(f.company.metrics.roa)}</td>
                  <td className="px-4 py-3 font-mono">{fmtX(f.company.metrics.debtToEquity)}</td>
                  <td className="px-4 py-3 font-mono">{f.analisis.aplicaModeloCorporativo ? fmtNum(f.altman) : "N/A"}</td>
                  <td className="px-4 py-3 font-mono">{f.score !== null ? fmtScore(f.score) : (f.analisis.aplicaModeloCorporativo ? "N/D" : "N/A")}</td>
                  <td className="px-4 py-3">
                    <Badge estado={f.scoreEstado} />
                  </td>
                </tr>
              ))}
              {empresas === null && (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-ink-muted">
                    Cargando balances y precios en vivo...
                  </td>
                </tr>
              )}
              {empresas !== null && ordenadas.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-ink-muted">
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
