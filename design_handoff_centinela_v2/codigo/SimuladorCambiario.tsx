/**
 * Centinela · Simulador de Sensibilidad Cambiaria y Stress Test de Caja
 * React 18 + Tailwind (tokens de codigo/tokens.css) + shadcn/ui + lucide-react + Recharts.
 *
 * Requiere: npx shadcn@latest add card slider toggle-group
 *           npm i lucide-react recharts
 *
 * Modelo: proyección mensual de 12 meses (sensibilidad de un período, no
 * predicción), coherente con src/lib/financial/simulation.ts y ratios.ts:
 *  - calcularImpactoCajaDso / calcularImpactoCajaDpo para el capital de trabajo
 *  - calcularImpactoDevaluacionDeuda para el mayor pasivo en moneda local
 */
import { useMemo, useState } from "react";
import { RotateCcw, ShieldAlert } from "lucide-react";
import { Bar, CartesianGrid, ComposedChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { calcularImpactoCajaDpo, calcularImpactoCajaDso, calcularImpactoDevaluacionDeuda } from "@/lib/financial/ratios";
import { TOOLTIP_CONTENT_STYLE, TOOLTIP_LABEL_STYLE } from "@/components/charts/chartStyle";

/* ---------- Tipos ---------- */
export interface BaseCaja {
  cajaInicial: number;
  ventas: number; // anual
  costoVentas: number; // anual
  ebitda: number; // anual
  otrosEgresos: number; // capex + impuestos, anual
  deudaArs: number;
  deudaUsd: number; // expresada en moneda local al TC actual
  tasaUsd: number; // 0.09
  dso: number;
  dio: number;
  dpo: number;
  amortizacionesUsd: Record<number, number>; // mes (0-11) -> capital USD en moneda local
  cajaMinima: number; // piso operativo
}

export interface Supuestos {
  devaluacion: number; // %
  tasaArs: number; // %
  ventas: number; // % variación
  dso: number;
  dpo: number;
}

type EscenarioId = "base" | "pesimista" | "shock" | "custom";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

/* ---------- Modelo puro (testeable) ---------- */
export function proyectarCaja(b: BaseCaja, s: Supuestos) {
  const k = 1 + s.ventas / 100;
  const ebitda = b.ebitda * k;
  const intereses = b.deudaArs * (s.tasaArs / 100) + (b.deudaUsd + calcularImpactoDevaluacionDeuda(b.deudaUsd, 1, s.devaluacion / 100)) * b.tasaUsd;
  const flujoMensual = (ebitda - intereses - b.otrosEgresos) / 12;
  const capitalTrabajo =
    calcularImpactoCajaDso(b.dso, s.dso, b.ventas * k) + calcularImpactoCajaDpo(b.dpo, s.dpo, b.costoVentas * k);

  let saldo = b.cajaInicial;
  let costoFx = 0;
  const saldos = MESES.map((_, i) => {
    const fx = (b.amortizacionesUsd[i] ?? 0) * (s.devaluacion / 100);
    costoFx += fx;
    saldo += flujoMensual + (i < 3 ? capitalTrabajo / 3 : 0) - fx; // el capital de trabajo se libera en el primer trimestre
    return saldo;
  });
  const min = Math.min(...saldos);
  return {
    saldos,
    final: saldo,
    minimo: min,
    mesMinimo: saldos.indexOf(min),
    mesQuiebre: saldos.findIndex((v) => v < b.cajaMinima),
    icr: intereses > 0 ? ebitda / intereses : null,
    ccc: s.dso + b.dio - s.dpo,
    deltaPasivoFx: calcularImpactoDevaluacionDeuda(b.deudaUsd, 1, s.devaluacion / 100),
    puente: { ebitda, intereses, otros: b.otrosEgresos, capitalTrabajo, costoFx },
  };
}

/* ---------- UI ---------- */
interface Props {
  base: BaseCaja;
  escenarios: Record<Exclude<EscenarioId, "custom">, Supuestos>;
  formatMonto: (v: number, conSigno?: boolean) => string; // fmtMonto del repo, ya ligado a la moneda global
}

const DESCRIPCION: Record<EscenarioId, string> = {
  base: "Supuestos actuales de la empresa: sin salto cambiario y plazos del último cierre.",
  pesimista: "Caída de ventas, clientes que demoran el pago y proveedores que acortan plazos.",
  shock: "Salto cambiario abrupto con suba de tasa y deterioro moderado de cobranzas.",
  custom: "Escenario personalizado a partir de los controles.",
};

function Control({
  label, valor, min, max, step, base, fmt, empeoraSi, onChange,
}: {
  label: string; valor: number; min: number; max: number; step: number; base: number;
  fmt: (v: number) => string; empeoraSi: (v: number) => boolean; onChange: (v: number) => void;
}) {
  const color = valor === base ? "text-ink" : empeoraSi(valor) ? "text-bad" : "text-ok";
  return (
    <div className="flex flex-col gap-2 border-b border-border px-4 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="whitespace-nowrap text-xs text-ink-muted">{label}</span>
        <output className={`font-mono text-[13px] font-medium tabular-nums transition-colors ${color}`}>{fmt(valor)}</output>
      </div>
      <Slider value={[valor]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} aria-label={label} />
      <div className="flex justify-between font-mono text-[10px] text-ink-subtle">
        <span>{fmt(min)}</span>
        <span>actual {fmt(base)}</span>
        <span>{fmt(max)}</span>
      </div>
    </div>
  );
}

export function SimuladorCambiario({ base, escenarios, formatMonto }: Props) {
  const [escenario, setEscenario] = useState<EscenarioId>("base");
  const [s, setS] = useState<Supuestos>(escenarios.base);

  const antes = useMemo(() => proyectarCaja(base, escenarios.base), [base, escenarios.base]);
  const despues = useMemo(() => proyectarCaja(base, s), [base, s]);

  const set = (k: keyof Supuestos) => (v: number) => {
    setS((p) => ({ ...p, [k]: v }));
    setEscenario("custom");
  };
  const aplicar = (id: string) => {
    if (!id || id === "custom") return;
    setEscenario(id as EscenarioId);
    setS(escenarios[id as Exclude<EscenarioId, "custom">]);
  };

  const datos = MESES.map((m, i) => ({ m, antes: antes.saldos[i], despues: despues.saldos[i] }));
  const tono = (mejor: boolean, igual: boolean) => (igual ? "text-ink-subtle" : mejor ? "text-ok" : "text-bad");
  const b0 = escenarios.base;

  const kpis = [
    { label: "Caja a 12 meses", antes: formatMonto(antes.final), despues: formatMonto(despues.final), delta: formatMonto(despues.final - antes.final, true), cls: tono(despues.final > antes.final, Math.abs(despues.final - antes.final) < 0.05) },
    { label: "Caja mínima", antes: formatMonto(antes.minimo), despues: formatMonto(despues.minimo), delta: `en ${MESES[despues.mesMinimo]}`, cls: despues.minimo < base.cajaMinima ? "text-bad" : tono(despues.minimo > antes.minimo, Math.abs(despues.minimo - antes.minimo) < 0.05) },
    { label: "ICR proyectado", antes: `${antes.icr?.toFixed(2)}x`, despues: `${despues.icr?.toFixed(2)}x`, delta: `${((despues.icr ?? 0) - (antes.icr ?? 0)).toFixed(2)}x`, cls: (despues.icr ?? 0) < 1 ? "text-bad" : tono((despues.icr ?? 0) > (antes.icr ?? 0), Math.abs((despues.icr ?? 0) - (antes.icr ?? 0)) < 0.005) },
    { label: "CCC proyectado", antes: `${antes.ccc.toFixed(1)} d`, despues: `${despues.ccc.toFixed(1)} d`, delta: `${(despues.ccc - antes.ccc).toFixed(1)} d`, cls: tono(despues.ccc < antes.ccc, despues.ccc === antes.ccc) },
  ];

  return (
    <section aria-label="Simulador de sensibilidad cambiaria" className="flex flex-wrap items-start gap-4">
      {/* Controles */}
      <Card className="flex max-w-[340px] flex-[1_1_280px] flex-col rounded-lg border-border bg-surface p-0 shadow-none">
        <div className="flex flex-col gap-2.5 border-b border-border px-4 py-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-semibold">Escenario</h2>
            <button onClick={() => aplicar("base")} className="flex items-center gap-1 text-[11px] text-ink-subtle hover:text-ink focus-ring">
              <RotateCcw className="h-3 w-3" /> Restablecer
            </button>
          </div>
          <ToggleGroup type="single" value={escenario} onValueChange={aplicar} className="grid grid-cols-3 gap-0.5 rounded-md border border-border bg-bg p-0.5">
            <ToggleGroupItem value="base" className="h-7 text-xs data-[state=on]:bg-surface-2">Base</ToggleGroupItem>
            <ToggleGroupItem value="pesimista" className="h-7 text-xs data-[state=on]:bg-surface-2">Pesimista</ToggleGroupItem>
            <ToggleGroupItem value="shock" className="h-7 text-xs data-[state=on]:bg-surface-2">Shock FX</ToggleGroupItem>
          </ToggleGroup>
          <p className="text-[11px] leading-snug text-ink-subtle">{DESCRIPCION[escenario]}</p>
        </div>
        <Control label="Devaluación ARS/USD" valor={s.devaluacion} min={0} max={100} step={5} base={b0.devaluacion} fmt={(v) => `+${v}%`} empeoraSi={(v) => v > b0.devaluacion} onChange={set("devaluacion")} />
        <Control label="Tasa de interés ARS" valor={s.tasaArs} min={30} max={120} step={1} base={b0.tasaArs} fmt={(v) => `${v}%`} empeoraSi={(v) => v > b0.tasaArs} onChange={set("tasaArs")} />
        <Control label="Variación de ventas" valor={s.ventas} min={-30} max={30} step={1} base={b0.ventas} fmt={(v) => `${v > 0 ? "+" : ""}${v}%`} empeoraSi={(v) => v < b0.ventas} onChange={set("ventas")} />
        <Control label="Días de cobro (DSO)" valor={s.dso} min={30} max={120} step={1} base={b0.dso} fmt={(v) => `${v} d`} empeoraSi={(v) => v > b0.dso} onChange={set("dso")} />
        <Control label="Días de pago (DPO)" valor={s.dpo} min={15} max={90} step={1} base={b0.dpo} fmt={(v) => `${v} d`} empeoraSi={(v) => v < b0.dpo} onChange={set("dpo")} />
        <p className="px-4 py-3 text-[11px] leading-snug text-ink-subtle">Proyección de sensibilidad de un período a partir de los supuestos. No es una predicción.</p>
      </Card>

      {/* Resultados */}
      <div className="flex min-w-0 flex-[999_1_420px] flex-col gap-4">
        <Card className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] rounded-lg border-border bg-surface p-0 shadow-none">
          {kpis.map((k) => (
            <div key={k.label} className="flex flex-col gap-1.5 border-r border-border px-4 py-3.5 last:border-0">
              <span className="text-xs text-ink-muted">{k.label}</span>
              <div className="flex flex-wrap items-baseline gap-2 font-mono tabular-nums">
                <span className="whitespace-nowrap text-xs text-ink-subtle line-through">{k.antes}</span>
                <span className={`whitespace-nowrap text-[22px] transition-colors ${k.cls}`}>{k.despues}</span>
              </div>
              <span className={`font-mono text-[11px] ${k.cls}`}>{k.delta}</span>
            </div>
          ))}
        </Card>

        <Card className="flex flex-col gap-3 rounded-lg border-border bg-surface p-4 shadow-none">
          <h2 className="text-[13px] font-semibold">Saldo de caja proyectado · antes vs. después</h2>
          {despues.mesQuiebre >= 0 && (
            <div role="alert" className="flex items-center gap-2.5 rounded-md bg-bad-soft px-3 py-2 text-xs text-bad">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              La caja perfora el mínimo operativo en {MESES[despues.mesQuiebre]} ({formatMonto(despues.saldos[despues.mesQuiebre])}).
              Requiere financiamiento o una palanca de capital de trabajo.
            </div>
          )}
          <div className="h-[240px]">
            <ResponsiveContainer>
              <ComposedChart data={datos} barGap={2} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke="rgb(var(--border))" />
                <XAxis dataKey="m" tickLine={false} axisLine={{ stroke: "rgb(var(--border-strong))" }} tick={{ fontSize: 10, fontFamily: "IBM Plex Mono", fill: "rgb(var(--ink-subtle))" }} />
                <YAxis width={56} tickLine={false} axisLine={false} tick={{ fontSize: 10, fontFamily: "IBM Plex Mono", fill: "rgb(var(--ink-subtle))" }} tickFormatter={(v) => formatMonto(v)} />
                <Tooltip contentStyle={TOOLTIP_CONTENT_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} formatter={(v: number) => formatMonto(v)} cursor={{ fill: "rgb(var(--surface-2))" }} />
                <ReferenceLine y={base.cajaMinima} stroke="rgb(var(--bad))" strokeDasharray="4 3" label={{ value: "mín. operativo", position: "insideTopLeft", fontSize: 10, fill: "rgb(var(--bad))" }} />
                <Bar dataKey="antes" name="Antes (base)" fill="transparent" stroke="rgb(var(--chart-2))" strokeDasharray="3 2" animationDuration={200} />
                <Bar dataKey="despues" name="Después" fill="rgb(var(--accent))" animationDuration={200} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="overflow-hidden rounded-lg border-border bg-surface p-0 shadow-none">
          <h2 className="border-b border-border px-4 py-3 text-[13px] font-semibold">Puente de flujo neto anual</h2>
          <table className="w-full text-xs">
            <tbody className="[&_td]:border-b [&_td]:border-border [&_td]:px-4 [&_td]:py-2">
              <tr><td>EBITDA</td><td className="text-right font-mono tabular-nums">{formatMonto(despues.puente.ebitda)}</td></tr>
              <tr><td>Intereses (ARS + USD ajustado por FX)</td><td className="text-right font-mono tabular-nums">{formatMonto(-despues.puente.intereses)}</td></tr>
              <tr><td>Capex, impuestos y otros</td><td className="text-right font-mono tabular-nums">{formatMonto(-despues.puente.otros)}</td></tr>
              <tr><td>Capital de trabajo liberado / absorbido</td><td className={`text-right font-mono tabular-nums ${despues.puente.capitalTrabajo >= 0 ? "text-ok" : "text-bad"}`}>{formatMonto(despues.puente.capitalTrabajo, true)}</td></tr>
              <tr><td>Mayor costo de amortizaciones en USD</td><td className="text-right font-mono tabular-nums text-bad">{formatMonto(-despues.puente.costoFx)}</td></tr>
              <tr className="font-semibold"><td>Flujo neto anual</td><td className={`text-right font-mono tabular-nums ${despues.final >= base.cajaInicial ? "text-ok" : "text-bad"}`}>{formatMonto(despues.final - base.cajaInicial, true)}</td></tr>
            </tbody>
          </table>
        </Card>
      </div>
    </section>
  );
}

/* ---------- Ejemplo con el caso demo del repo (EMPRESA_DEMO_PEDRO, en millones ARS) ---------- */
export const BASE_DON_PEDRO: BaseCaja = {
  cajaInicial: 51, ventas: 365, costoVentas: 240, ebitda: 48, otrosEgresos: 26,
  deudaArs: 49, deudaUsd: 21, tasaUsd: 0.09, dso: 74, dio: 45.6, dpo: 35,
  amortizacionesUsd: { 2: 1, 5: 2, 8: 0, 11: 4 }, cajaMinima: 13,
};
export const ESCENARIOS_DON_PEDRO = {
  base: { devaluacion: 0, tasaArs: 65, ventas: 0, dso: 74, dpo: 35 },
  pesimista: { devaluacion: 15, tasaArs: 75, ventas: -10, dso: 85, dpo: 30 },
  shock: { devaluacion: 50, tasaArs: 90, ventas: -5, dso: 80, dpo: 35 },
};
