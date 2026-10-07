import { useV2 } from "../context";
import { Card, CardHeader, PaginaSkeleton, TagEst } from "../ui";
import { fmtNum, fmtPct, fmtX } from "@/lib/format";

export function DeudaPage() {
  const { modelo, fm } = useV2();

  if (!modelo) return <PaginaSkeleton />;

  const { m, caja, usdPct } = modelo;
  const deudaTotal = m.deudaTotal ?? 0;
  const ebitda = m.ebitda ?? 0;
  const icr = caja.icr;

  // Composición de deuda
  const pctUsd = usdPct ?? 0;
  const pctArs = Math.max(0, 1 - pctUsd);
  const deudaUsd = deudaTotal * pctUsd;
  const deudaArs = deudaTotal * pctArs;
  const proveedores = m.cuentasPorPagar ?? 0;
  const otrosPasivos = Math.max(0, (m.pasivosTotales ?? 0) - deudaTotal - proveedores);
  const pasivosTotales = (m.pasivosTotales ?? 0) || (deudaTotal + proveedores + otrosPasivos);

  const pctBarra = (val: number) => (pasivosTotales > 0 ? (val / pasivosTotales) * 100 : 0);

  // Deuda / EBITDA
  const deudaEbitda = ebitda > 0 ? deudaTotal / ebitda : null;

  // Servicio estimado a 12 meses (Capital + Intereses)
  const interesesAnuales = m.gastosIntereses ?? (deudaTotal * 0.35);
  const servicio12m = (deudaTotal * 0.25) + interesesAnuales; // amortización estimada 25% anual

  const deudaKpis = [
    {
      label: "Cobertura de intereses (ICR)",
      val: `${fmtNum(icr, 1)}x`,
      est: caja.esIcrEstimado,
      sub: icr < 1.0 ? "◆ Alerta crítica · EBITDA no cubre intereses" : icr < 2.0 ? "▲ Ajustado · vulnerable a suba de tasas" : "● Cobertura sólida",
      c: icr < 1.0 ? "text-v2-bad" : icr < 2.0 ? "text-v2-warn" : "text-v2-ok",
    },
    {
      label: "Deuda financiera total",
      val: fm(deudaTotal),
      est: false,
      sub: `${fmtPct(pctUsd)} en USD · ${fmtPct(pctArs)} en moneda local`,
      c: pctUsd > 0.4 ? "text-v2-warn" : "text-v2-ink",
    },
    {
      label: "Deuda / EBITDA",
      val: deudaEbitda !== null ? fmtX(deudaEbitda, 1) : "N/D",
      est: false,
      sub: deudaEbitda !== null && deudaEbitda > 3.0 ? "▲ Apalancamiento elevado (>3.0x)" : "● Rango operativo razonable",
      c: deudaEbitda !== null && deudaEbitda > 3.0 ? "text-v2-warn" : "text-v2-ok",
    },
    {
      label: "Servicio estimado (12m)",
      val: fm(servicio12m),
      est: true,
      sub: "Amortizaciones estimadas + carga financiera",
      c: "text-v2-ink2",
    },
  ];

  // Stress tests simulados de ICR
  // 1) Caída de EBITDA (0% a -40%)
  const caidasEbitda = [0, -10, -20, -30, -40];
  const sensEbitda = caidasEbitda.map((pct) => {
    const e = ebitda * (1 + pct / 100);
    const nuevoIcr = interesesAnuales > 0 ? e / interesesAnuales : 0;
    return { pct, icr: Math.max(0, nuevoIcr) };
  });

  // 2) Suba de tasa (+0 pp a +30 pp)
  const subasTasa = [0, 5, 10, 20, 30];
  const sensTasa = subasTasa.map((pp) => {
    const nuevosIntereses = interesesAnuales + deudaArs * (pp / 100);
    const nuevoIcr = nuevosIntereses > 0 ? ebitda / nuevosIntereses : 0;
    return { pp, icr: Math.max(0, nuevoIcr) };
  });

  return (
    <section aria-label="Deuda y solvencia" className="flex flex-col gap-4">
      {/* 1. KPIs */}
      <Card className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] divide-y sm:divide-y-0 sm:divide-x divide-v2-line">
        {deudaKpis.map((k) => (
          <div key={k.label} className="flex flex-col gap-1 p-3.5">
            <span className="text-xs text-v2-ink2">{k.label}</span>
            <div className="flex items-baseline gap-1.5 font-mono text-2xl font-medium text-v2-ink">
              {k.val}
              {k.est && <TagEst />}
            </div>
            <span className={`font-mono text-[11px] ${k.c}`}>{k.sub}</span>
          </div>
        ))}
      </Card>

      {/* 2. Estructura de Pasivos */}
      <Card className="flex flex-col gap-3.5 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[13px] font-semibold text-v2-ink">Estructura del pasivo y exposición de moneda</h2>
          <span className="font-mono text-[11px] text-v2-ink3">Total pasivos: {fm(pasivosTotales)}</span>
        </div>

        {/* Barra apilada segmentada */}
        <div className="flex h-7 w-full overflow-hidden rounded bg-v2-s2">
          <div style={{ width: `${pctBarra(deudaArs)}%` }} className="bg-v2-d2 transition-all" title={`Deuda local: ${fm(deudaArs)}`} />
          <div style={{ width: `${pctBarra(deudaUsd)}%` }} className="bg-v2-acc transition-all" title={`Deuda USD: ${fm(deudaUsd)}`} />
          <div style={{ width: `${pctBarra(proveedores)}%` }} className="bg-v2-d1 transition-all" title={`Proveedores: ${fm(proveedores)}`} />
          <div style={{ width: `${pctBarra(otrosPasivos)}%` }} className="bg-v2-s2 border-l border-v2-line transition-all" title={`Otros pasivos: ${fm(otrosPasivos)}`} />
        </div>

        {/* Leyenda con montos y porcentajes */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-v2-d2" />
            <span className="text-v2-ink2">Deuda local: {fm(deudaArs)} ({fmtPct(pctBarra(deudaArs) / 100)})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-v2-acc" />
            <span className="text-v2-ink2">Deuda USD: {fm(deudaUsd)} ({fmtPct(pctBarra(deudaUsd) / 100)})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-v2-d1" />
            <span className="text-v2-ink2">Proveedores: {fm(proveedores)} ({fmtPct(pctBarra(proveedores) / 100)})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-v2-s2 border border-v2-line2" />
            <span className="text-v2-ink2">Otros: {fm(otrosPasivos)} ({fmtPct(pctBarra(otrosPasivos) / 100)})</span>
          </div>
        </div>
      </Card>

      {/* 3. Sensibilidad y Distancia al Quiebre */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,360px),1fr))] gap-3">
        {/* Test 1: Caída de EBITDA */}
        <Card className="flex flex-col gap-3 p-4">
          <div className="flex justify-between items-baseline">
            <h3 className="text-[13px] font-semibold text-v2-ink">Sensibilidad de ICR ante caída de ventas/EBITDA</h3>
            <span className="font-mono text-[11px] text-v2-ink3">Umbral quiebre: 1.0x</span>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            {sensEbitda.map((s) => (
              <div key={s.pct} className="flex items-center gap-3 text-xs font-mono">
                <span className="w-16 text-v2-ink2">{s.pct === 0 ? "Actual" : `${s.pct}%`}</span>
                <div className="relative flex-1 h-5 bg-v2-s2 rounded overflow-hidden">
                  <div
                    style={{ width: `${Math.min(100, (s.icr / 4) * 100)}%` }}
                    className={`h-full transition-all ${s.icr < 1.0 ? "bg-v2-bad" : s.icr < 2.0 ? "bg-v2-warn" : "bg-v2-ok"}`}
                  />
                  <div style={{ left: "25%" }} className="absolute top-0 bottom-0 w-0.5 bg-v2-bad z-10" title="Quiebre 1.0x" />
                </div>
                <span className={`w-12 text-right font-medium ${s.icr < 1.0 ? "text-v2-bad" : s.icr < 2.0 ? "text-v2-warn" : "text-v2-ok"}`}>
                  {fmtNum(s.icr, 2)}x
                </span>
              </div>
            ))}
          </div>
          <p className="m-0 text-[11px] text-v2-ink3 pt-1">
            Línea roja marca 1,0x de cobertura. Un ICR menor a 1 implica incapacidad de honrar intereses con la caja operativa.
          </p>
        </Card>

        {/* Test 2: Suba de Tasa ARS */}
        <Card className="flex flex-col gap-3 p-4">
          <div className="flex justify-between items-baseline">
            <h3 className="text-[13px] font-semibold text-v2-ink">Sensibilidad de ICR ante suba de tasas en pesos</h3>
            <span className="font-mono text-[11px] text-v2-ink3">Deuda en moneda local</span>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            {sensTasa.map((s) => (
              <div key={s.pp} className="flex items-center gap-3 text-xs font-mono">
                <span className="w-16 text-v2-ink2">{s.pp === 0 ? "Base" : `+${s.pp} pp`}</span>
                <div className="relative flex-1 h-5 bg-v2-s2 rounded overflow-hidden">
                  <div
                    style={{ width: `${Math.min(100, (s.icr / 4) * 100)}%` }}
                    className={`h-full transition-all ${s.icr < 1.0 ? "bg-v2-bad" : s.icr < 2.0 ? "bg-v2-warn" : "bg-v2-ok"}`}
                  />
                  <div style={{ left: "25%" }} className="absolute top-0 bottom-0 w-0.5 bg-v2-bad z-10" title="Quiebre 1.0x" />
                </div>
                <span className={`w-12 text-right font-medium ${s.icr < 1.0 ? "text-v2-bad" : s.icr < 2.0 ? "text-v2-warn" : "text-v2-ok"}`}>
                  {fmtNum(s.icr, 2)}x
                </span>
              </div>
            ))}
          </div>
          <p className="m-0 text-[11px] text-v2-ink3 pt-1">
            Impacto directo del encarecimiento de líneas de crédito en pesos (adelantos en cuenta corriente y descuento de cheques).
          </p>
        </Card>
      </div>
    </section>
  );
}
