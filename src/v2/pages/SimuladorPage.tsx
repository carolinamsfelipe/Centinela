import { useMemo, useState } from "react";
import { useV2 } from "../context";
import { Card, CardHeader, PaginaSkeleton, Slider, Seg } from "../ui";
import { fmtNum } from "@/lib/format";
import { calcularImpactoCajaDpo, calcularImpactoCajaDso, calcularImpactoDevaluacionDeuda } from "@/lib/financial/ratios";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

interface Supuestos {
  devaluacion: number; // %
  tasaArs: number; // %
  ventas: number; // % variación
  dso: number; // días
  dpo: number; // días
}

export function SimuladorPage() {
  const { modelo, fm } = useV2();

  if (!modelo) return <PaginaSkeleton />;

  const base = modelo.base;

  // Supuestos base derivados de la entidad activa
  const b0: Supuestos = useMemo(() => {
    return {
      devaluacion: 0,
      tasaArs: base?.tasaArsBase ?? 65,
      ventas: 0,
      dso: base?.dso ?? 74,
      dpo: base?.dpo ?? 35,
    };
  }, [base]);

  const [escenario, setEscenario] = useState<"base" | "pesimista" | "shock" | "custom">("base");
  const [s, setS] = useState<Supuestos>(b0);

  const aplicarEscenario = (id: "base" | "pesimista" | "shock" | "custom") => {
    setEscenario(id);
    if (id === "base") {
      setS(b0);
    } else if (id === "pesimista") {
      setS({ devaluacion: 15, tasaArs: b0.tasaArs + 10, ventas: -10, dso: b0.dso + 10, dpo: Math.max(15, b0.dpo - 5) });
    } else if (id === "shock") {
      setS({ devaluacion: 50, tasaArs: b0.tasaArs + 25, ventas: -5, dso: b0.dso + 6, dpo: b0.dpo });
    }
  };

  const actualizarSupuesto = (k: keyof Supuestos, val: number) => {
    setS((prev) => ({ ...prev, [k]: val }));
    setEscenario("custom");
  };

  // Modelo de proyección de 12 meses
  const sim = useMemo(() => {
    if (!base) return null;

    const simular = (sup: Supuestos) => {
      const k = 1 + sup.ventas / 100;
      const ebitda = base.ebitda * k;
      const saltoFxDeuda = calcularImpactoDevaluacionDeuda(base.deudaUsd, 1, sup.devaluacion / 100);
      const intereses = base.deudaArs * (sup.tasaArs / 100) + (base.deudaUsd + saltoFxDeuda) * base.tasaUsd;
      const flujoOperativoMensual = (ebitda - intereses - base.otrosEgresos) / 12;

      // Liberación o absorción de capital de trabajo (se proyecta en los primeros 3 meses)
      const varWc = calcularImpactoCajaDso(base.dso, sup.dso, base.ventas * k) + calcularImpactoCajaDpo(base.dpo, sup.dpo, base.costoVentas * k);

      // Mayor costo mensual estimado de pagos en USD
      const costoFxMensual = (base.deudaUsd * 0.15 * (sup.devaluacion / 100)) / 12;

      let saldo = base.cajaInicial;
      const saldos = MESES.map((_, i) => {
        saldo += flujoOperativoMensual + (i < 3 ? varWc / 3 : 0) - costoFxMensual;
        return saldo;
      });

      const minimo = Math.min(...saldos);
      const finalCaja = saldos[saldos.length - 1];
      const mesMinimo = saldos.indexOf(minimo);
      const mesQuiebre = saldos.findIndex((v) => v < base.cajaMinima);
      const icr = intereses > 0 ? ebitda / intereses : null;
      const ccc = sup.dso + base.dio - sup.dpo;

      return {
        saldos,
        minimo,
        final: finalCaja,
        mesMinimo,
        mesQuiebre,
        icr,
        ccc,
        puente: {
          ebitda,
          intereses,
          otros: base.otrosEgresos,
          varWc,
          costoFx: costoFxMensual * 12,
          flujoNeto: finalCaja - base.cajaInicial,
        },
      };
    };

    const antes = simular(b0);
    const despues = simular(s);

    return { antes, despues };
  }, [base, b0, s]);

  if (!base || !sim) {
    return <Card className="p-8 text-center text-v2-ink3">Datos insuficientes para simular el flujo de caja de la entidad.</Card>;
  }

  const { antes, despues } = sim;

  // Escala para el gráfico de barras (altura relativa)
  const todosLosSaldos = [...antes.saldos, ...despues.saldos, base.cajaMinima];
  const maxS = Math.max(...todosLosSaldos, 1);
  const minS = Math.min(...todosLosSaldos, 0);
  const rango = maxS - minS || 1;

  const alturaBarra = (val: number) => `${Math.max(4, Math.min(100, ((val - minS) / rango) * 100))}%`;
  const posMinima = `${Math.max(0, Math.min(100, ((base.cajaMinima - minS) / rango) * 100))}%`;

  return (
    <section aria-label="Simulador de sensibilidad cambiaria y caja" className="flex flex-wrap items-start gap-4">
      {/* 1. Panel de Controles y Sliders */}
      <Card className="flex w-full max-w-[340px] flex-col overflow-hidden">
        <div className="flex flex-col gap-2.5 border-b border-v2-line p-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-semibold text-v2-ink">Escenario</h2>
            <button
              type="button"
              onClick={() => aplicarEscenario("base")}
              className="text-[11px] text-v2-ink3 hover:text-v2-ink focus-ring"
            >
              Restablecer
            </button>
          </div>
          <Seg
            etiqueta="Escenario de simulación"
            mono={false}
            valor={escenario}
            onChange={(v) => aplicarEscenario(v)}
            opciones={[
              { id: "base", label: "Base" },
              { id: "pesimista", label: "Pesimista" },
              { id: "shock", label: "Shock FX" },
            ]}
          />
          <span className="text-[11px] text-v2-ink3">
            {escenario === "base"
              ? "Sin salto cambiario y plazos actuales del ejercicio."
              : escenario === "pesimista"
              ? "Caída de ventas, mora de clientes y recorte de crédito de proveedores."
              : escenario === "shock"
              ? "Devaluación del 50%, encarecimiento de tasas en pesos y tensión de liquidez."
              : "Parámetros modificados manualmente por el usuario."}
          </span>
        </div>

        {/* Sliders */}
        <div className="flex flex-col divide-y divide-v2-line">
          <div className="flex flex-col gap-2 p-3.5">
            <div className="flex justify-between items-baseline text-xs">
              <span className="text-v2-ink2">Devaluación ARS/USD</span>
              <span className={`font-mono font-medium ${s.devaluacion > 0 ? "text-v2-bad" : "text-v2-ink"}`}>
                +{s.devaluacion}%
              </span>
            </div>
            <Slider
              etiqueta="Devaluación"
              min={0}
              max={100}
              step={5}
              valor={s.devaluacion}
              onChange={(v) => actualizarSupuesto("devaluacion", v)}
            />
            <div className="flex justify-between font-mono text-[10px] text-v2-ink3">
              <span>0%</span>
              <span>actual 0%</span>
              <span>+100%</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 p-3.5">
            <div className="flex justify-between items-baseline text-xs">
              <span className="text-v2-ink2">Tasa de interés ARS</span>
              <span className={`font-mono font-medium ${s.tasaArs > b0.tasaArs ? "text-v2-bad" : "text-v2-ink"}`}>
                {s.tasaArs}%
              </span>
            </div>
            <Slider
              etiqueta="Tasa ARS"
              min={30}
              max={120}
              step={1}
              valor={s.tasaArs}
              onChange={(v) => actualizarSupuesto("tasaArs", v)}
            />
            <div className="flex justify-between font-mono text-[10px] text-v2-ink3">
              <span>30%</span>
              <span>base {b0.tasaArs}%</span>
              <span>120%</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 p-3.5">
            <div className="flex justify-between items-baseline text-xs">
              <span className="text-v2-ink2">Variación de ventas</span>
              <span className={`font-mono font-medium ${s.ventas < 0 ? "text-v2-bad" : s.ventas > 0 ? "text-v2-ok" : "text-v2-ink"}`}>
                {s.ventas > 0 ? `+${s.ventas}%` : `${s.ventas}%`}
              </span>
            </div>
            <Slider
              etiqueta="Ventas"
              min={-30}
              max={30}
              step={1}
              valor={s.ventas}
              onChange={(v) => actualizarSupuesto("ventas", v)}
            />
            <div className="flex justify-between font-mono text-[10px] text-v2-ink3">
              <span>-30%</span>
              <span>0%</span>
              <span>+30%</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 p-3.5">
            <div className="flex justify-between items-baseline text-xs">
              <span className="text-v2-ink2">Días de cobro (DSO)</span>
              <span className={`font-mono font-medium ${s.dso > b0.dso ? "text-v2-bad" : s.dso < b0.dso ? "text-v2-ok" : "text-v2-ink"}`}>
                {s.dso} d
              </span>
            </div>
            <Slider
              etiqueta="DSO"
              min={30}
              max={120}
              step={1}
              valor={s.dso}
              onChange={(v) => actualizarSupuesto("dso", v)}
            />
            <div className="flex justify-between font-mono text-[10px] text-v2-ink3">
              <span>30 d</span>
              <span>actual {b0.dso} d</span>
              <span>120 d</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 p-3.5">
            <div className="flex justify-between items-baseline text-xs">
              <span className="text-v2-ink2">Días de pago (DPO)</span>
              <span className={`font-mono font-medium ${s.dpo < b0.dpo ? "text-v2-bad" : s.dpo > b0.dpo ? "text-v2-ok" : "text-v2-ink"}`}>
                {s.dpo} d
              </span>
            </div>
            <Slider
              etiqueta="DPO"
              min={15}
              max={90}
              step={1}
              valor={s.dpo}
              onChange={(v) => actualizarSupuesto("dpo", v)}
            />
            <div className="flex justify-between font-mono text-[10px] text-v2-ink3">
              <span>15 d</span>
              <span>actual {b0.dpo} d</span>
              <span>90 d</span>
            </div>
          </div>
        </div>

        <p className="m-0 p-3 text-[11px] leading-relaxed text-v2-ink3">
          Proyección de sensibilidad de un período a partir de los supuestos. No es una predicción.
        </p>
      </Card>

      {/* 2. Resultados Proyectados y Gráfico */}
      <div className="flex flex-1 min-w-[320px] flex-col gap-4">
        {/* KPIs Antes vs Después */}
        <Card className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] divide-y sm:divide-y-0 sm:divide-x divide-v2-line">
          <div className="flex flex-col gap-1 p-3.5">
            <span className="text-xs text-v2-ink2">Caja a 12 meses</span>
            <div className="flex items-baseline gap-2 font-mono">
              <span className="text-xs text-v2-ink3 line-through">{fm(antes.final)}</span>
              <span className={`text-xl font-medium ${despues.final < antes.final ? "text-v2-bad" : "text-v2-ok"}`}>
                {fm(despues.final)}
              </span>
            </div>
            <span className={`font-mono text-[11px] ${despues.final < antes.final ? "text-v2-bad" : "text-v2-ok"}`}>
              {fm(despues.final - antes.final, true)}
            </span>
          </div>

          <div className="flex flex-col gap-1 p-3.5">
            <span className="text-xs text-v2-ink2">Caja mínima</span>
            <div className="flex items-baseline gap-2 font-mono">
              <span className="text-xs text-v2-ink3 line-through">{fm(antes.minimo)}</span>
              <span className={`text-xl font-medium ${despues.minimo < base.cajaMinima ? "text-v2-bad" : "text-v2-ink"}`}>
                {fm(despues.minimo)}
              </span>
            </div>
            <span className="font-mono text-[11px] text-v2-ink3">en {MESES[despues.mesMinimo]}</span>
          </div>

          <div className="flex flex-col gap-1 p-3.5">
            <span className="text-xs text-v2-ink2">ICR proyectado</span>
            <div className="flex items-baseline gap-2 font-mono">
              <span className="text-xs text-v2-ink3 line-through">{fmtNum(antes.icr, 2)}x</span>
              <span className={`text-xl font-medium ${(despues.icr ?? 0) < 1.0 ? "text-v2-bad" : "text-v2-ink"}`}>
                {fmtNum(despues.icr, 2)}x
              </span>
            </div>
            <span className="font-mono text-[11px] text-v2-ink3">
              {((despues.icr ?? 0) - (antes.icr ?? 0)).toFixed(2)}x
            </span>
          </div>

          <div className="flex flex-col gap-1 p-3.5">
            <span className="text-xs text-v2-ink2">CCC proyectado</span>
            <div className="flex items-baseline gap-2 font-mono">
              <span className="text-xs text-v2-ink3 line-through">{fmtNum(antes.ccc, 1)} d</span>
              <span className={`text-xl font-medium ${despues.ccc > antes.ccc ? "text-v2-bad" : "text-v2-ok"}`}>
                {fmtNum(despues.ccc, 1)} d
              </span>
            </div>
            <span className={`font-mono text-[11px] ${despues.ccc > antes.ccc ? "text-v2-bad" : "text-v2-ok"}`}>
              {fmtNum(despues.ccc - antes.ccc, 1)} d
            </span>
          </div>
        </Card>

        {/* Gráfico de Barras Mensual */}
        <Card className="flex flex-col gap-3 p-4">
          <div className="flex justify-between items-baseline flex-wrap gap-2">
            <h3 className="text-[13px] font-semibold text-v2-ink">Saldo de caja proyectado · antes vs. después</h3>
            <div className="flex gap-3 text-[11px] text-v2-ink2">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 border border-dashed border-v2-d2" /> Antes (base)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 bg-v2-acc" /> Después
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-3 border-t border-dashed border-v2-bad" /> Mínimo operativo
              </span>
            </div>
          </div>

          {/* Alerta de quiebre de caja */}
          {despues.mesQuiebre >= 0 && (
            <div role="alert" className="flex items-center gap-2 rounded bg-v2-bad/10 px-3 py-2 text-xs text-v2-bad">
              <span>◆</span>
              <span>
                La caja perfora el mínimo operativo en {MESES[despues.mesQuiebre]} ({fm(despues.saldos[despues.mesQuiebre])}). Se requerirá financiamiento o acelerar cobranzas.
              </span>
            </div>
          )}

          {/* Riel de gráfico */}
          <div className="relative flex h-56 items-end gap-1.5 border-b border-v2-line2 pt-6">
            {/* Línea de piso mínimo */}
            <div
              style={{ bottom: posMinima }}
              className="absolute left-0 right-0 border-t border-dashed border-v2-bad z-10"
            />
            <span
              style={{ bottom: posMinima }}
              className="absolute left-1 font-mono text-[9px] text-v2-bad pb-0.5 z-10"
            >
              mín. {fm(base.cajaMinima)}
            </span>

            {/* Columnas mensuales */}
            {MESES.map((m, i) => {
              const hAntes = alturaBarra(antes.saldos[i]);
              const hDespues = alturaBarra(despues.saldos[i]);
              const bajoMin = despues.saldos[i] < base.cajaMinima;
              return (
                <div key={m} className="flex flex-1 h-full items-end justify-center gap-0.5" title={`${m}: ${fm(despues.saldos[i])}`}>
                  <div
                    style={{ height: hAntes }}
                    className="w-2.5 sm:w-3.5 border border-dashed border-v2-d2 border-b-0 transition-all"
                  />
                  <div
                    style={{ height: hDespues }}
                    className={`w-2.5 sm:w-3.5 transition-all ${bajoMin ? "bg-v2-bad" : "bg-v2-acc"}`}
                  />
                </div>
              );
            })}
          </div>

          {/* Eje X de meses */}
          <div className="flex gap-1.5 font-mono text-[10px] text-v2-ink3">
            {MESES.map((m) => (
              <span key={m} className="flex-1 text-center">
                {m}
              </span>
            ))}
          </div>
        </Card>

        {/* Tabla Puente de Flujo */}
        <Card className="overflow-hidden">
          <CardHeader titulo="Puente de flujo neto anual proyectado" derecha="12 meses" />
          <table className="w-full border-collapse text-xs">
            <tbody className="divide-y divide-v2-line">
              <tr>
                <td className="px-4 py-2 text-v2-ink">EBITDA proyectado</td>
                <td className="px-4 py-2 text-right font-mono text-v2-ink">{fm(despues.puente.ebitda)}</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-v2-ink">Intereses financieros (ARS + USD)</td>
                <td className="px-4 py-2 text-right font-mono text-v2-bad">-{fm(despues.puente.intereses)}</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-v2-ink">Capex, impuestos y otros egresos</td>
                <td className="px-4 py-2 text-right font-mono text-v2-bad">-{fm(despues.puente.otros)}</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-v2-ink">Capital de trabajo liberado / absorbido</td>
                <td className={`px-4 py-2 text-right font-mono ${despues.puente.varWc >= 0 ? "text-v2-ok" : "text-v2-bad"}`}>
                  {fm(despues.puente.varWc, true)}
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-v2-ink">Mayor costo de amortizaciones por FX</td>
                <td className="px-4 py-2 text-right font-mono text-v2-bad">-{fm(despues.puente.costoFx)}</td>
              </tr>
              <tr className="font-semibold bg-v2-s2/40">
                <td className="px-4 py-2 text-v2-ink">Flujo neto anual</td>
                <td className={`px-4 py-2 text-right font-mono ${despues.puente.flujoNeto >= 0 ? "text-v2-ok" : "text-v2-bad"}`}>
                  {fm(despues.puente.flujoNeto, true)}
                </td>
              </tr>
            </tbody>
          </table>
        </Card>
      </div>
    </section>
  );
}
