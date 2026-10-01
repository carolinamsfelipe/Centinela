import type { Company, Estado } from "@/types";
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

/**
 * Arma un resumen ejecutivo basado EXCLUSIVAMENTE en los diagnósticos ya
 * calculados (ratios.ts + diagnostics.ts): nunca infiere causas que los
 * datos no permiten demostrar, solo describe el estado de cada indicador.
 */
export function generarResumenEjecutivo(company: Company): string {
  const m = company.metrics;
  const diagnosticos: Array<{ estado: Estado; mensaje: string }> = [
    diagnosticarLiquidez(calcularLiquidez(m)),
    diagnosticarEndeudamiento(calcularEndeudamiento(m)),
    diagnosticarCapitalTrabajo(calcularCapitalTrabajoSobreActivos(m)),
    diagnosticarDeudaPatrimonio(calcularDeudaSobrePatrimonio(m)),
    diagnosticarRoe(calcularRoe(m)),
    diagnosticarRoa(calcularRoa(m)),
    diagnosticarMargenNeto(calcularMargenNeto(m)),
  ];

  const señales = diagnosticos.filter((d) => d.estado === "alerta" || d.estado === "atencion");

  if (señales.length === 0) {
    return `${company.nombre} no muestra señales de alerta en los indicadores analizados según los parámetros utilizados por esta plataforma.`;
  }

  const frases = señales.map((s) => s.mensaje);
  return `${company.nombre} presenta los siguientes puntos que requieren seguimiento: ${frases.join(" ")}`;
}
