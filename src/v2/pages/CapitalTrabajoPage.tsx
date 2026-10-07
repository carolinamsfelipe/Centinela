import { useState } from "react";
import { useV2 } from "../context";
import { Card, CardHeader, PaginaSkeleton, TagEst } from "../ui";
import { fmtNum } from "@/lib/format";
import { nombreSector } from "@/data/companies";

export function CapitalTrabajoPage() {
  const { modelo, fm } = useV2();
  const [sel, setSel] = useState<"dio" | "dso" | "dpo" | null>(null);

  if (!modelo) return <PaginaSkeleton />;

  const { caja, m, company, periodos } = modelo;
  const dio = caja.dio;
  const dso = caja.dso;
  const dpo = caja.dpo;
  const ccc = caja.ccc;

  // Mediana del sector
  const medCcc = 79.0;
  const medDio = 45.6;
  const medDso = 64.0;
  const medDpo = 45.0;

  // Cálculo de caja inmovilizada = Cuentas por Cobrar + Inventarios - Cuentas por Pagar
  const cxc = m.cuentasPorCobrar ?? 0;
  const inv = m.inventarios ?? 0;
  const cxp = m.cuentasPorPagar ?? 0;
  const cajaInmovilizada = cxc + inv - cxp;

  // Oportunidad liberando capital = reducción de 10 días en DSO + extensión 10 días DPO
  const rev = m.revenue ?? 0;
  const cogs = m.costoVentas ?? 0;
  const liberable = (10 * rev) / 365 + (10 * cogs) / 365;

  // Escala para barra visual (0 - 130 días)
  const maxDias = 130;
  const pctDio = Math.min(100, (dio / maxDias) * 100);
  const pctDso = Math.min(100, (dso / maxDias) * 100);
  const pctDpo = Math.min(100, (dpo / maxDias) * 100);
  const pctCcc = Math.min(100, (ccc / maxDias) * 100);

  const componentes = [
    {
      id: "dio" as const,
      nombre: "Días de inventario (DIO)",
      val: fmtNum(dio, 1),
      mediana: fmtNum(medDio, 1),
      delta: dio <= medDio ? "En línea con sector" : `+${fmtNum(dio - medDio, 1)} d`,
      fg: dio <= medDio ? "text-v2-ok" : "text-v2-warn",
      tag: dio <= medDio ? "Ventaja" : "Margen de mejora",
      sh: dio <= medDio ? "●" : "▲",
      w: `${Math.min(100, (dio / 100) * 100)}%`,
      med: `${Math.min(100, (medDio / 100) * 100)}%`,
      lectura: "Tiempo que el stock permanece inmovilizado antes de salir a la venta o producción.",
    },
    {
      id: "dso" as const,
      nombre: "Días de cobro (DSO)",
      val: fmtNum(dso, 1),
      mediana: fmtNum(medDso, 1),
      delta: dso <= medDso ? "En línea" : `+${fmtNum(dso - medDso, 1)} d`,
      fg: dso > 75 ? "text-v2-bad" : dso > 50 ? "text-v2-warn" : "text-v2-ok",
      tag: dso > 75 ? "Cuello de botella" : "Monitorear",
      sh: dso > 75 ? "◆" : "▲",
      w: `${Math.min(100, (dso / 100) * 100)}%`,
      med: `${Math.min(100, (medDso / 100) * 100)}%`,
      lectura: "Plazo promedio que tardan los clientes en cancelar facturas comerciales emitidas.",
    },
    {
      id: "dpo" as const,
      nombre: "Días de pago (DPO)",
      val: fmtNum(dpo, 1),
      mediana: fmtNum(medDpo, 1),
      delta: dpo >= medDpo ? "Buen financiamiento" : `${fmtNum(dpo - medDpo, 1)} d`,
      fg: dpo < 30 ? "text-v2-warn" : "text-v2-ok",
      tag: dpo >= medDpo ? "Ventaja comercial" : "Margen de negociación",
      sh: dpo >= medDpo ? "●" : "▲",
      w: `${Math.min(100, (dpo / 100) * 100)}%`,
      med: `${Math.min(100, (medDpo / 100) * 100)}%`,
      lectura: "Plazo promedio de financiamiento otorgado espontáneamente por proveedores de insumos.",
    },
  ];

  return (
    <section aria-label="Capital de trabajo y ciclo de caja" className="flex flex-col gap-4">
      {/* 1. Franja de 4 KPIs */}
      <Card className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] divide-y sm:divide-y-0 sm:divide-x divide-v2-line">
        <div className="flex flex-col gap-1 p-3.5">
          <span className="text-xs text-v2-ink2">CCC actual</span>
          <div className="flex items-baseline gap-1.5 font-mono text-2xl font-medium text-v2-ink">
            {fmtNum(ccc, 1)} <span className="text-xs text-v2-ink3">días</span>
            {caja.esCccEstimado && <TagEst />}
          </div>
          <span className={`font-mono text-[11px] ${ccc > 90 ? "text-v2-bad" : ccc > 60 ? "text-v2-warn" : "text-v2-ok"}`}>
            {ccc > 90 ? "◆ Alerta · ciclo excesivo" : ccc > 60 ? "▲ Precaución · ciclo tenso" : "● Saludable"}
          </span>
        </div>

        <div className="flex flex-col gap-1 p-3.5">
          <span className="text-xs text-v2-ink2">Mediana {nombreSector(company.sector)}</span>
          <div className="flex items-baseline gap-1.5 font-mono text-2xl font-medium text-v2-ink">
            {fmtNum(medCcc, 1)} <span className="text-xs text-v2-ink3">días</span>
          </div>
          <span className="font-mono text-[11px] text-v2-ink3">Referencia histórica de la industria</span>
        </div>

        <div className="flex flex-col gap-1 p-3.5">
          <span className="text-xs text-v2-ink2">Caja neta inmovilizada</span>
          <div className="flex items-baseline gap-1.5 font-mono text-2xl font-medium text-v2-ink">
            {cajaInmovilizada > 0 ? fm(cajaInmovilizada) : "Sin datos"}
          </div>
          <span className="font-mono text-[11px] text-v2-ink3">CxC + Stock − Proveedores</span>
        </div>

        <div className="flex flex-col gap-1 p-3.5">
          <span className="text-xs text-v2-ink2">Liberable alineando a mediana</span>
          <div className="flex items-baseline gap-1.5 font-mono text-2xl font-medium text-v2-ok">
            {liberable > 0 ? `+${fm(liberable)}` : "$ 0 M"}
          </div>
          <span className="font-mono text-[11px] text-v2-ink3">Cobro −10 d · Pago +10 d</span>
        </div>
      </Card>

      {/* 2. Línea de Tiempo del Ciclo Operativo */}
      <Card className="flex flex-col gap-3.5 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[13px] font-semibold text-v2-ink">Línea de tiempo del ciclo operativo</h2>
          <span className="font-mono text-[11px] text-v2-ink3">CCC = DIO + DSO − DPO · escala 0–130 días</span>
        </div>

        <div className="grid grid-cols-[90px_minmax(0,1fr)] items-center gap-y-2 gap-x-3 text-xs sm:grid-cols-[110px_minmax(0,1fr)]">
          <span className="text-v2-ink2">Operación</span>
          <div className="flex h-7.5 w-full">
            <button
              type="button"
              onClick={() => setSel(sel === "dio" ? null : "dio")}
              style={{ width: `${pctDio}%` }}
              className={`flex items-center px-2.5 font-mono text-[11px] text-v2-ink bg-v2-d1 transition-all ${
                sel === "dio" ? "ring-2 ring-v2-ink ring-inset font-bold" : ""
              }`}
            >
              DIO {fmtNum(dio, 1)} d
            </button>
            <button
              type="button"
              onClick={() => setSel(sel === "dso" ? null : "dso")}
              style={{ width: `${pctDso}%` }}
              className={`flex items-center px-2.5 font-mono text-[11px] text-v2-bg bg-v2-d2 transition-all ${
                sel === "dso" ? "ring-2 ring-v2-ink ring-inset font-bold" : ""
              }`}
            >
              DSO {fmtNum(dso, 1)} d
            </button>
          </div>

          <span className="text-v2-ink2">Proveedores</span>
          <div className="flex h-7.5 w-full">
            <button
              type="button"
              onClick={() => setSel(sel === "dpo" ? null : "dpo")}
              style={{ width: `${pctDpo}%` }}
              className={`flex items-center px-2.5 font-mono text-[11px] text-v2-ink bg-v2-s2 border border-v2-line2 transition-all ${
                sel === "dpo" ? "ring-2 ring-v2-ink ring-inset font-bold" : ""
              }`}
            >
              DPO {fmtNum(dpo, 1)} d
            </button>
          </div>

          <span className="text-v2-ink2">Brecha a financiar</span>
          <div className="flex h-7.5 w-full">
            <div style={{ width: `${pctDpo}%` }} />
            <div
              style={{ width: `${pctCcc}%` }}
              className="flex items-center justify-between gap-2 border border-dashed border-v2-warn bg-v2-warn/10 px-2.5 font-mono text-[11px] text-v2-warn"
            >
              <span className="whitespace-nowrap">CCC {fmtNum(ccc, 1)} d</span>
              <span className="truncate">≈ {fm(cajaInmovilizada)}</span>
            </div>
          </div>

          <span />
          <div className="relative h-4 font-mono text-[10px] text-v2-ink3">
            <span className="absolute left-0">0</span>
            <span className="absolute left-[23.1%]">30</span>
            <span className="absolute left-[46.2%]">60</span>
            <span className="absolute left-[69.2%]">90</span>
            <span className="absolute right-0">130 d</span>
          </div>
        </div>
      </Card>

      {/* 3. Cards DIO / DSO / DPO */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
        {componentes.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setSel(sel === c.id ? null : c.id)}
            className={`flex flex-col gap-2.5 rounded-lg border bg-v2-s1 p-4 text-left transition-colors hover:bg-v2-s2 focus-ring ${
              sel === c.id ? "border-v2-ink ring-1 ring-v2-ink" : "border-v2-line"
            }`}
          >
            <div className="flex w-full items-center justify-between">
              <span className="text-xs text-v2-ink2">{c.nombre}</span>
              <span className={`text-[11px] font-semibold ${c.fg}`}>
                {c.sh} {c.tag}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 font-mono text-2xl font-medium text-v2-ink">
              {c.val} <span className="text-xs text-v2-ink3">días</span>
            </div>
            <div className="relative h-1.5 w-full rounded-full bg-v2-s2">
              <div style={{ width: c.w }} className="absolute bottom-0 left-0 top-0 rounded-full bg-v2-d2" />
              <div style={{ left: c.med }} className="absolute -top-1 -bottom-1 w-0.5 bg-v2-ink" title="Mediana sectorial" />
            </div>
            <div className="flex w-full items-center justify-between font-mono text-[11px]">
              <span className="text-v2-ink3">Mediana {c.mediana} d</span>
              <span className={c.fg}>{c.delta}</span>
            </div>
            <p className="m-0 text-xs leading-relaxed text-v2-ink2 text-pretty">{c.lectura}</p>
          </button>
        ))}
      </div>

      {/* 4. Tabla de Evolución Histórica */}
      {periodos && periodos.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader titulo="Evolución de capital de trabajo" derecha="días por ejercicio" />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse font-mono text-xs">
              <thead>
                <tr className="border-b border-v2-line text-right text-[10px] text-v2-ink3">
                  <th className="px-4 py-2 text-left font-medium">Métrica</th>
                  {periodos.map((p) => (
                    <th key={p.periodo} className="px-3 py-2 font-medium">
                      {p.periodo}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-v2-line">
                <tr>
                  <td className="px-4 py-2 text-v2-ink font-sans">Días de inventario (DIO)</td>
                  {periodos.map((p) => (
                    <td key={p.periodo} className="px-3 py-2 text-right">
                      {p.inventarios && p.costoVentas ? fmtNum((p.inventarios / p.costoVentas) * 365, 1) : "—"}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-4 py-2 text-v2-ink font-sans">Días de cobro (DSO)</td>
                  {periodos.map((p) => (
                    <td key={p.periodo} className="px-3 py-2 text-right">
                      {p.cuentasPorCobrar && p.revenue ? fmtNum((p.cuentasPorCobrar / p.revenue) * 365, 1) : "—"}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-4 py-2 text-v2-ink font-sans">Días de pago (DPO)</td>
                  {periodos.map((p) => (
                    <td key={p.periodo} className="px-3 py-2 text-right">
                      {p.cuentasPorPagar && p.costoVentas ? fmtNum((p.cuentasPorPagar / p.costoVentas) * 365, 1) : "—"}
                    </td>
                  ))}
                </tr>
                <tr className="font-semibold bg-v2-s2/40">
                  <td className="px-4 py-2 text-v2-ink font-sans">Ciclo de caja (CCC)</td>
                  {periodos.map((p) => {
                    const di = p.inventarios && p.costoVentas ? (p.inventarios / p.costoVentas) * 365 : 0;
                    const ds = p.cuentasPorCobrar && p.revenue ? (p.cuentasPorCobrar / p.revenue) * 365 : 0;
                    const dp = p.cuentasPorPagar && p.costoVentas ? (p.cuentasPorPagar / p.costoVentas) * 365 : 0;
                    const cVal = ds + di - dp;
                    return (
                      <td key={p.periodo} className="px-3 py-2 text-right text-v2-ink">
                        {ds && dp ? fmtNum(cVal, 1) : "—"}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </section>
  );
}
