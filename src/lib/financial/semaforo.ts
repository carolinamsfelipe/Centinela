import type { Estado, FinancialMetrics } from "@/types";
import {
  diagnosticarCapitalTrabajo,
  diagnosticarDeudaPatrimonio,
  diagnosticarEndeudamiento,
  diagnosticarLiquidez,
  diagnosticarMargenNeto,
  diagnosticarRoa,
  diagnosticarRoe,
} from "./diagnostics";
import {
  calcularCapitalTrabajoSobreActivos,
  calcularDeudaSobrePatrimonio,
  calcularEndeudamiento,
  calcularLiquidez,
  calcularMargenNeto,
  calcularRoa,
  calcularRoe,
} from "./ratios";
import { fmtNum, fmtPct, fmtX } from "@/lib/format";

/**
 * Semaforo por indicador, con el criterio de cada color a la vista (igual que
 * el prototipo original de Centinela: el usuario siempre puede ver con que
 * umbral se pinto cada tarjeta). Los umbrales son los de diagnostics.ts; los
 * textos de criterio estan aca al lado para que si un umbral cambia se
 * actualicen juntos.
 */
export interface ItemSemaforo {
  id: "liquidez" | "endeudamiento" | "capitalTrabajo" | "deudaPatrimonio" | "roe" | "roa" | "margenNeto";
  nombre: string;
  valor: number | null;
  valorTexto: string;
  estado: Estado;
  mensaje: string;
  criterio: string;
  /** true si el indicador solo tiene lectura para empresas no financieras. */
  soloCorporativo: boolean;
}

export const CRITERIOS = {
  liquidez: "verde > 1.5x · amarillo 1.0–1.5x · rojo < 1.0x",
  endeudamiento: "verde < 50% · amarillo 50–70% · rojo > 70%",
  capitalTrabajo: "verde ≥ 10% · amarillo 0–10% · rojo < 0%",
  deudaPatrimonio: "verde < 1.0x · amarillo 1.0–2.0x · rojo > 2.0x",
  roe: "verde ≥ 15% · amarillo 0–15% · rojo < 0%",
  roa: "verde ≥ 5% · amarillo 0–5% · rojo < 0%",
  margenNeto: "verde ≥ 10% · amarillo 0–10% · rojo < 0%",
} as const;

export function construirSemaforo(m: FinancialMetrics): ItemSemaforo[] {
  const liquidez = calcularLiquidez(m);
  const endeudamiento = calcularEndeudamiento(m);
  const capitalTrabajo = calcularCapitalTrabajoSobreActivos(m);
  const deudaPatrimonio = calcularDeudaSobrePatrimonio(m);
  const roe = calcularRoe(m);
  const roa = calcularRoa(m);
  const margen = calcularMargenNeto(m);

  const item = (
    id: ItemSemaforo["id"],
    nombre: string,
    valor: number | null,
    valorTexto: string,
    d: { estado: Estado; mensaje: string },
    soloCorporativo: boolean
  ): ItemSemaforo => ({
    id,
    nombre,
    valor,
    valorTexto,
    estado: d.estado,
    mensaje: d.mensaje,
    criterio: CRITERIOS[id],
    soloCorporativo,
  });

  return [
    item("liquidez", "Liquidez", liquidez, fmtNum(liquidez), diagnosticarLiquidez(liquidez), true),
    item("endeudamiento", "Endeudamiento", endeudamiento, fmtPct(endeudamiento), diagnosticarEndeudamiento(endeudamiento), true),
    item("capitalTrabajo", "Capital de trabajo / Activos", capitalTrabajo, fmtPct(capitalTrabajo), diagnosticarCapitalTrabajo(capitalTrabajo), true),
    item("deudaPatrimonio", "Deuda / Patrimonio", deudaPatrimonio, fmtX(deudaPatrimonio), diagnosticarDeudaPatrimonio(deudaPatrimonio), true),
    item("roe", "ROE", roe, fmtPct(roe), diagnosticarRoe(roe), false),
    item("roa", "ROA", roa, fmtPct(roa), diagnosticarRoa(roa), false),
    item("margenNeto", "Margen neto", margen, fmtPct(margen), diagnosticarMargenNeto(margen), true),
  ];
}
