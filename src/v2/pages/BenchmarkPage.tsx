import { useMemo, useState } from "react";
import { useV2 } from "../context";
import { Card, CardHeader, PaginaSkeleton } from "../ui";
import { fmtNum, fmtPct, fmtX } from "@/lib/format";
import { descargarCsv } from "../exportar";
import { nombreSector } from "@/data/companies";
import { inferirMetricasCaja } from "@/lib/financial/benchmarks";

export function BenchmarkPage() {
  const { modelo, companies } = useV2();
  const [filtroMercado, setFiltroMercado] = useState<string>("Todos");
  const [sortCol, setSortCol] = useState<string>("score");
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  if (!modelo || !companies) return <PaginaSkeleton />;

  const { company, caja } = modelo;

  // Filtrado de pares del mismo sector
  const sector = company.sector;
  const paresDelSector = useMemo(() => {
    return companies.filter((c) => c.sector === sector);
  }, [companies, sector]);

  const mercadosDisponibles = useMemo(() => {
    const list = Array.from(new Set(paresDelSector.map((c) => c.mercado)));
    return ["Todos", ...list];
  }, [paresDelSector]);

  const paresFiltrados = useMemo(() => {
    let lista = paresDelSector;
    if (filtroMercado !== "Todos") {
      lista = lista.filter((c) => c.mercado === filtroMercado);
    }
    return lista;
  }, [paresDelSector, filtroMercado]);

  // Posición percentil de métricas clave (strips)
  const strips = [
    {
      nombre: "Ciclo de caja (CCC)",
      val: `${fmtNum(caja.ccc, 0)} d`,
      pct: caja.ccc <= 60 ? "P75" : caja.ccc <= 85 ? "P50" : "P25",
      fg: caja.ccc <= 60 ? "text-v2-ok" : caja.ccc <= 85 ? "text-v2-warn" : "text-v2-bad",
      vl: `${Math.min(100, Math.max(0, (caja.ccc / 150) * 100))}%`,
      ml: "52%",
      bl: "30%",
      bw: "40%",
    },
    {
      nombre: "Cobertura de intereses",
      val: `${fmtNum(caja.icr, 1)}x`,
      pct: caja.icr >= 3.0 ? "P80" : caja.icr >= 1.5 ? "P45" : "P15",
      fg: caja.icr >= 2.0 ? "text-v2-ok" : caja.icr >= 1.0 ? "text-v2-warn" : "text-v2-bad",
      vl: `${Math.min(100, Math.max(0, (caja.icr / 8) * 100))}%`,
      ml: "45%",
      bl: "25%",
      bw: "35%",
    },
    {
      nombre: "Días de cobro (DSO)",
      val: `${fmtNum(caja.dso, 0)} d`,
      pct: caja.dso <= 50 ? "P80" : caja.dso <= 75 ? "P50" : "P20",
      fg: caja.dso <= 50 ? "text-v2-ok" : caja.dso <= 75 ? "text-v2-warn" : "text-v2-bad",
      vl: `${Math.min(100, Math.max(0, (caja.dso / 120) * 100))}%`,
      ml: "45%",
      bl: "30%",
      bw: "35%",
    },
    {
      nombre: "Días de pago (DPO)",
      val: `${fmtNum(caja.dpo, 0)} d`,
      pct: caja.dpo >= 45 ? "P70" : caja.dpo >= 30 ? "P40" : "P20",
      fg: caja.dpo >= 45 ? "text-v2-ok" : "text-v2-warn",
      vl: `${Math.min(100, Math.max(0, (caja.dpo / 90) * 100))}%`,
      ml: "50%",
      bl: "35%",
      bw: "30%",
    },
    {
      nombre: "Liquidez corriente",
      val: `${fmtNum(modelo.m.currentRatio, 2)}x`,
      pct: (modelo.m.currentRatio ?? 0) >= 1.5 ? "P75" : "P35",
      fg: (modelo.m.currentRatio ?? 0) >= 1.5 ? "text-v2-ok" : "text-v2-warn",
      vl: `${Math.min(100, Math.max(0, ((modelo.m.currentRatio ?? 1) / 3) * 100))}%`,
      ml: "50%",
      bl: "35%",
      bw: "30%",
    },
  ];

  // Métricas de caja completas para cada empresa (reales o proxy sectorial inferido)
  const paresConMetricas = useMemo(() => {
    return paresFiltrados.map((p) => {
      const isPropia = p.ticker === company.ticker;
      const c = isPropia ? caja : inferirMetricasCaja(p.metrics, p.sector, p.mercado);
      return {
        company: p,
        caja: c,
        isPropia,
      };
    });
  }, [paresFiltrados, company.ticker, caja]);

  // Gráfico de dispersión Scatter: CCC (0 a 150) vs ICR (0 a 8)
  const puntosScatter = useMemo(() => {
    return paresConMetricas.map(({ company: p, caja: c, isPropia }) => {
      const xCcc = c.ccc;
      const yIcr = c.icr;

      const xPos = `${Math.min(95, Math.max(5, (xCcc / 150) * 100))}%`;
      const yPos = `${Math.min(95, Math.max(5, (yIcr / 8) * 100))}%`;

      return {
        ticker: p.ticker,
        nombre: p.nombre,
        isPropia,
        xPos,
        yPos,
        xCcc,
        yIcr,
      };
    });
  }, [paresConMetricas]);

  // Ordenamiento de tabla
  const tablaOrdenada = useMemo(() => {
    return [...paresConMetricas].sort((a, b) => {
      let vA = 0;
      let vB = 0;
      if (sortCol === "nombre") return sortAsc ? a.company.nombre.localeCompare(b.company.nombre) : b.company.nombre.localeCompare(a.company.nombre);
      if (sortCol === "mercado") return sortAsc ? a.company.mercado.localeCompare(b.company.mercado) : b.company.mercado.localeCompare(a.company.mercado);
      if (sortCol === "roe") {
        vA = a.company.metrics.roe ?? -999;
        vB = b.company.metrics.roe ?? -999;
      } else if (sortCol === "ccc") {
        vA = a.caja.ccc ?? 999;
        vB = b.caja.ccc ?? 999;
      } else if (sortCol === "icr") {
        vA = a.caja.icr ?? -999;
        vB = b.caja.icr ?? -999;
      } else if (sortCol === "liquidez") {
        vA = a.company.metrics.currentRatio ?? -999;
        vB = b.company.metrics.currentRatio ?? -999;
      } else if (sortCol === "deuda") {
        vA = a.company.metrics.debtToEquity ?? 999;
        vB = b.company.metrics.debtToEquity ?? 999;
      }
      return sortAsc ? vA - vB : vB - vA;
    });
  }, [paresConMetricas, sortCol, sortAsc]);

  const ordenarPor = (col: string) => {
    if (sortCol === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(col);
      setSortAsc(false);
    }
  };

  const exportarCSV = () => {
    descargarCsv(`benchmark_${sector}.csv`, [
      ["Empresa", "Ticker", "Mercado", "ROE", "Margen Neto", "CCC (días)", "ICR", "Liquidez", "Deuda/Patrimonio"],
      ...tablaOrdenada.map(({ company: e, caja: c }) => [
        e.nombre,
        e.ticker,
        e.mercado,
        fmtPct(e.metrics.roe),
        fmtPct(e.metrics.margenNeto),
        fmtNum(c.ccc, 0),
        fmtNum(c.icr, 1),
        fmtNum(e.metrics.currentRatio, 2),
        fmtNum(e.metrics.debtToEquity, 2),
      ]),
    ]);
  };

  return (
    <section aria-label="Benchmark frente a pares" className="flex flex-col gap-4">
      {/* 1. Franjas de Percentil y Dispersión */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,440px),1fr))] gap-3 items-start">
        {/* Strips de Percentil */}
        <Card className="flex flex-col p-4">
          <div className="flex justify-between items-baseline mb-2">
            <h2 className="text-[13px] font-semibold text-v2-ink">Posición percentil vs. {nombreSector(sector)}</h2>
            <span className="font-mono text-[11px] text-v2-ink3">banda P25–P75 · │ mediana</span>
          </div>

          <div className="flex flex-col divide-y divide-v2-line">
            {strips.map((s) => (
              <div key={s.nombre} className="grid grid-cols-[100px_minmax(0,1fr)_60px_40px] items-center gap-3 py-2 text-xs">
                <span className="text-v2-ink2 truncate">{s.nombre}</span>
                <div className="relative h-4">
                  {/* Riel base */}
                  <div className="absolute left-0 right-0 top-1.5 h-0.5 bg-v2-line" />
                  {/* Banda intercuartil P25 - P75 */}
                  <div
                    style={{ left: s.bl, width: s.bw }}
                    className="absolute top-0.5 h-2.5 bg-v2-s2 border border-v2-line2 rounded-sm"
                  />
                  {/* Mediana */}
                  <div style={{ left: s.ml }} className="absolute top-0 bottom-0 w-0.5 bg-v2-ink2" />
                  {/* Punto valor empresa */}
                  <div
                    style={{ left: s.vl }}
                    className={`absolute top-0.5 h-2.5 w-2.5 rounded-full border border-v2-s1 shadow-sm -ml-1 ${
                      s.fg.includes("ok") ? "bg-v2-ok" : s.fg.includes("warn") ? "bg-v2-warn" : "bg-v2-bad"
                    }`}
                  />
                </div>
                <span className="font-mono text-right text-v2-ink">{s.val}</span>
                <span className={`font-mono text-right font-medium ${s.fg}`}>{s.pct}</span>
              </div>
            ))}
          </div>

          <span className="pt-3 text-[11px] text-v2-ink3">
            Percentil: ubicación relativa frente a empresas del sector.
          </span>
        </Card>

        {/* Gráfico de Dispersión Cuadrantes: CCC x ICR */}
        <Card className="flex flex-col gap-2 p-4">
          <div className="flex justify-between items-baseline flex-wrap gap-2">
            <h2 className="text-[13px] font-semibold text-v2-ink">Liquidez operativa vs. cobertura</h2>
            <span className="font-mono text-[11px] text-v2-ink3">x: CCC (d) · y: ICR (x)</span>
          </div>

          <div className="grid grid-cols-[28px_minmax(0,1fr)] gap-2 pt-2">
            {/* Eje Y */}
            <div className="relative font-mono text-[10px] text-v2-ink3 h-64">
              <span className="absolute top-0">8x</span>
              <span className="absolute top-[75%]">2x</span>
              <span className="absolute bottom-0">0</span>
            </div>

            {/* Plano de cuadrantes */}
            <div className="relative h-64 border-b border-l border-v2-line2 bg-v2-s1 overflow-hidden">
              {/* Cuadrante Óptimo (Arriba Izquierda) */}
              <div className="absolute left-0 top-0 w-[52.7%] h-[75%] bg-v2-ok/10 pointer-events-none" />
              {/* Cuadrante Crítico (Abajo Derecha) */}
              <div className="absolute left-[52.7%] right-0 top-[75%] bottom-0 bg-v2-bad/10 pointer-events-none" />

              {/* Líneas divisorias */}
              <div className="absolute left-[52.7%] top-0 bottom-0 border-l border-dashed border-v2-line2" />
              <div className="absolute left-0 right-0 top-[75%] border-t border-dashed border-v2-line2" />

              <span className="absolute left-2 top-2 text-[10px] text-v2-ok">Ciclo corto · cobertura holgada</span>
              <span className="absolute right-2 bottom-2 text-[10px] text-v2-bad">Ciclo largo · cobertura débil</span>

              {/* Puntos Scatter */}
              {puntosScatter.map((p) => (
                <div
                  key={p.ticker}
                  style={{ left: p.xPos, bottom: p.yPos }}
                  className="absolute -translate-x-1/2 translate-y-1/2 flex items-center gap-1 group z-20 cursor-pointer"
                  title={`${p.nombre}: CCC ${fmtNum(p.xCcc, 0)} d, ICR ${fmtNum(p.yIcr, 1)}x`}
                >
                  <span
                    className={`block rounded-full transition-transform group-hover:scale-125 ${
                      p.isPropia
                        ? "h-3.5 w-3.5 bg-v2-acc ring-4 ring-v2-acc/20"
                        : "h-2 w-2 bg-v2-d2"
                    }`}
                  />
                  <span
                    className={`font-mono text-[9px] whitespace-nowrap pointer-events-none ${
                      p.isPropia ? "font-bold text-v2-acc" : "text-v2-ink3 opacity-80"
                    }`}
                  >
                    {p.ticker}
                  </span>
                </div>
              ))}
            </div>

            <span />
            {/* Eje X */}
            <div className="relative h-4 font-mono text-[10px] text-v2-ink3">
              <span className="absolute left-0">0</span>
              <span className="absolute left-[52.7%] -translate-x-1/2">79 d med.</span>
              <span className="absolute right-0">150 d</span>
            </div>
          </div>
        </Card>
      </div>

      {/* 2. Tabla de Comparables */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2.5 border-b border-v2-line p-3">
          <h2 className="text-[13px] font-semibold text-v2-ink mr-2">Comparables sectoriales</h2>
          <div className="flex flex-wrap gap-1">
            {mercadosDisponibles.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setFiltroMercado(m)}
                className={`rounded px-2 py-0.5 text-xs transition-colors focus-ring ${
                  filtroMercado === m ? "bg-v2-ink text-v2-bg font-medium" : "border border-v2-line text-v2-ink2 hover:bg-v2-s2"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <span className="ml-auto font-mono text-xs text-v2-ink3">{tablaOrdenada.length} empresas</span>
          <button
            type="button"
            onClick={exportarCSV}
            className="flex items-center gap-1.5 rounded border border-v2-line bg-v2-bg px-2.5 py-1 text-xs text-v2-ink2 hover:text-v2-ink focus-ring"
          >
            <span>↓</span> CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-v2-line text-left text-[10px] uppercase tracking-[0.06em] text-v2-ink3">
                <th onClick={() => ordenarPor("nombre")} className="px-3 py-2 font-medium cursor-pointer hover:text-v2-ink">
                  Empresa {sortCol === "nombre" ? (sortAsc ? "↑" : "↓") : ""}
                </th>
                <th onClick={() => ordenarPor("mercado")} className="px-3 py-2 font-medium cursor-pointer hover:text-v2-ink">
                  Mercado {sortCol === "mercado" ? (sortAsc ? "↑" : "↓") : ""}
                </th>
                <th onClick={() => ordenarPor("roe")} className="px-3 py-2 text-right font-medium cursor-pointer hover:text-v2-ink">
                  ROE {sortCol === "roe" ? (sortAsc ? "↑" : "↓") : ""}
                </th>
                <th onClick={() => ordenarPor("ccc")} className="px-3 py-2 text-right font-medium cursor-pointer hover:text-v2-ink">
                  CCC (d) {sortCol === "ccc" ? (sortAsc ? "↑" : "↓") : ""}
                </th>
                <th onClick={() => ordenarPor("icr")} className="px-3 py-2 text-right font-medium cursor-pointer hover:text-v2-ink">
                  ICR {sortCol === "icr" ? (sortAsc ? "↑" : "↓") : ""}
                </th>
                <th onClick={() => ordenarPor("liquidez")} className="px-3 py-2 text-right font-medium cursor-pointer hover:text-v2-ink">
                  Liquidez {sortCol === "liquidez" ? (sortAsc ? "↑" : "↓") : ""}
                </th>
                <th onClick={() => ordenarPor("deuda")} className="px-3 py-2 text-right font-medium cursor-pointer hover:text-v2-ink">
                  D/E {sortCol === "deuda" ? (sortAsc ? "↑" : "↓") : ""}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-v2-line font-mono">
              {tablaOrdenada.map(({ company: e, caja: c, isPropia }) => {
                return (
                  <tr
                    key={e.ticker}
                    className={`transition-colors hover:bg-v2-s2 ${isPropia ? "bg-v2-acc/10 font-semibold" : ""}`}
                  >
                    <td className="px-3 py-2 font-sans text-v2-ink">
                      {e.nombre} <span className="font-mono text-[10px] text-v2-ink3">{e.ticker}</span>
                    </td>
                    <td className="px-3 py-2 font-sans text-v2-ink2">{e.mercado}</td>
                    <td className="px-3 py-2 text-right text-v2-ink">{fmtPct(e.metrics.roe)}</td>
                    <td className="px-3 py-2 text-right text-v2-ink">
                      <span>{fmtNum(c.ccc, 0)} d</span>
                      {c.esCccEstimado && (
                        <span className="ml-1 text-[9px] font-mono text-v2-ink3 bg-v2-s2 px-1 py-0.5 rounded border border-v2-line">
                          est.
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-v2-ink">
                      <span>{fmtNum(c.icr, 1)}x</span>
                      {c.esIcrEstimado && (
                        <span className="ml-1 text-[9px] font-mono text-v2-ink3 bg-v2-s2 px-1 py-0.5 rounded border border-v2-line">
                          est.
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-v2-ink">{fmtNum(e.metrics.currentRatio, 2)}x</td>
                    <td className="px-3 py-2 text-right text-v2-ink">{fmtNum(e.metrics.debtToEquity, 2)}x</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}
