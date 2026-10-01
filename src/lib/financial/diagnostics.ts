import type { Estado, RiesgoEtiqueta } from "@/types";

function sinDatos(mensaje: string): RiesgoEtiqueta {
  return { estado: "sin_datos", mensaje };
}

export function diagnosticarLiquidez(v: number | null): RiesgoEtiqueta {
  if (v === null) return sinDatos("No hay datos suficientes para calcular la liquidez.");
  if (v < 1) return { estado: "alerta", mensaje: "La empresa tiene menos activos corrientes que pasivos corrientes." };
  if (v < 1.5) return { estado: "atencion", mensaje: "La liquidez corriente es positiva, aunque con un margen reducido." };
  return { estado: "normal", mensaje: "La empresa presenta una posición de liquidez corriente relativamente holgada." };
}

export function diagnosticarEndeudamiento(v: number | null): RiesgoEtiqueta {
  if (v === null) return sinDatos("No hay datos suficientes para calcular el endeudamiento.");
  if (v > 0.7) return { estado: "alerta", mensaje: "Una proporción elevada de los activos está financiada mediante pasivos." };
  if (v > 0.5) return { estado: "atencion", mensaje: "La empresa presenta un nivel de endeudamiento que requiere seguimiento." };
  return { estado: "normal", mensaje: "El nivel de endeudamiento se encuentra por debajo de los umbrales de seguimiento definidos." };
}

export function diagnosticarCapitalTrabajo(v: number | null): RiesgoEtiqueta {
  if (v === null) return sinDatos("No hay datos suficientes para calcular el capital de trabajo sobre activos.");
  if (v < 0) return { estado: "alerta", mensaje: "El capital de trabajo es negativo en relación con los activos." };
  if (v < 0.1) return { estado: "atencion", mensaje: "El capital de trabajo positivo representa una proporción reducida de los activos." };
  return { estado: "normal", mensaje: "El capital de trabajo representa una proporción positiva de los activos." };
}

export function diagnosticarDeudaPatrimonio(v: number | null): RiesgoEtiqueta {
  if (v === null) return sinDatos("No hay datos suficientes para calcular la deuda sobre patrimonio.");
  if (v > 2) return { estado: "alerta", mensaje: "La deuda financiera supera ampliamente al patrimonio neto." };
  if (v > 1) return { estado: "atencion", mensaje: "La deuda financiera supera al patrimonio neto y requiere seguimiento." };
  return { estado: "normal", mensaje: "La deuda financiera se encuentra por debajo del patrimonio neto." };
}

export function diagnosticarRoe(v: number | null): RiesgoEtiqueta {
  if (v === null) return sinDatos("No hay datos suficientes para calcular el ROE.");
  if (v < 0) return { estado: "alerta", mensaje: "El resultado neto es negativo en relación con el patrimonio neto." };
  if (v < 0.15) return { estado: "atencion", mensaje: "La rentabilidad del patrimonio es positiva pero reducida." };
  return { estado: "normal", mensaje: "La empresa presenta una rentabilidad del patrimonio relativamente sólida." };
}

export function diagnosticarRoa(v: number | null): RiesgoEtiqueta {
  if (v === null) return sinDatos("No hay datos suficientes para calcular el ROA.");
  if (v < 0) return { estado: "alerta", mensaje: "El resultado neto es negativo en relación con el activo total." };
  if (v < 0.05) return { estado: "atencion", mensaje: "La rentabilidad sobre los activos es positiva pero reducida." };
  return { estado: "normal", mensaje: "La empresa presenta una rentabilidad sobre los activos relativamente sólida." };
}

export function diagnosticarMargenNeto(v: number | null): RiesgoEtiqueta {
  if (v === null) return sinDatos("No hay datos suficientes para calcular el margen neto.");
  if (v < 0) return { estado: "alerta", mensaje: "Las ventas no alcanzan a cubrir los costos y gastos totales." };
  if (v < 0.1) return { estado: "atencion", mensaje: "El margen neto es positivo pero representa una proporción reducida de las ventas." };
  return { estado: "normal", mensaje: "La empresa retiene una proporción relativamente sólida de sus ventas como ganancia." };
}

export const ESTADO_LABEL: Record<Estado, string> = {
  alerta: "Riesgo",
  atencion: "Atención",
  normal: "Saludable",
  sin_datos: "Sin información",
};

export const ESTADO_EMOJI: Record<Estado, string> = {
  alerta: "🔴",
  atencion: "🟡",
  normal: "🟢",
  sin_datos: "⚪",
};
