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

export function diagnosticarDeudaPatrimonio(v: number | null, patrimonioNeg = false): RiesgoEtiqueta {
  if (patrimonioNeg) return { estado: "alerta", mensaje: "Patrimonio neto negativo: los pasivos superan a los activos." };
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

export function diagnosticarCcc(v: number | null): RiesgoEtiqueta {
  if (v === null) return sinDatos("No hay datos suficientes para calcular el ciclo de conversión de efectivo (CCC).");
  if (v > 90) return { estado: "alerta", mensaje: "Ciclo de caja excesivo (>90 días): la empresa financia más de 3 meses de operación con deuda o capital propio." };
  if (v > 60) return { estado: "atencion", mensaje: "Ciclo de caja prolongado (60-90 días): requiere seguimiento para evitar tensiones de liquidez operativa." };
  return { estado: "normal", mensaje: "Ciclo de caja ágil (<=60 días): rápida recuperación del efectivo inmovilizado en la operación." };
}

export function diagnosticarIcr(v: number | null, sinIntereses = false): RiesgoEtiqueta {
  if (sinIntereses) return { estado: "normal", mensaje: "La empresa no registra carga de intereses financieros relevantes." };
  if (v === null) return sinDatos("No hay datos suficientes para calcular la cobertura de intereses (ICR).");
  if (v < 0) return { estado: "alerta", mensaje: "EBITDA negativo: la operación no genera fondos para pagar intereses." };
  if (v < 1.0) return { estado: "alerta", mensaje: "Alerta crítica: la generación operativa (EBITDA) no alcanza para pagar los intereses de la deuda." };
  if (v < 2.0) return { estado: "atencion", mensaje: "Cobertura de intereses ajustada (1x-2x): vulnerable ante subas de tasa o caídas en ventas." };
  return { estado: "normal", mensaje: "Cobertura de intereses sólida (>2x): la generación operativa cubre holgadamente el servicio financiero." };
}

export function diagnosticarDso(v: number | null): RiesgoEtiqueta {
  if (v === null) return sinDatos("No hay datos suficientes para calcular los días de cobro (DSO).");
  if (v > 75) return { estado: "alerta", mensaje: "Plazo de cobro muy extendido (>75 días): alto volumen de caja inmovilizado en clientes." };
  if (v > 50) return { estado: "atencion", mensaje: "Plazo de cobro moderado (50-75 días): evaluar acuerdos de pronto pago para descomprimir caja." };
  return { estado: "normal", mensaje: "Cobranzas ágiles (<=50 días): rotación saludable de cuentas a cobrar." };
}

export function diagnosticarDpo(v: number | null): RiesgoEtiqueta {
  if (v === null) return sinDatos("No hay datos suficientes para calcular los días de pago (DPO).");
  if (v < 30) return { estado: "atencion", mensaje: "Plazo de pago corto (<30 días): la empresa cancela rápido a proveedores antes de cobrar." };
  return { estado: "normal", mensaje: "Plazo de pago a proveedores equilibrado." };
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
