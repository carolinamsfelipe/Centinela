import { fmtNum, fmtPct } from "@/lib/format";
import type { MacroIndicator, Mercado, Sector } from "@/types";

/**
 * Respaldo estático de indicadores macro — se usa SOLO si /api/macro (Fase
 * "conectar con Yahoo Finance y BCRA en vivo") no responde. Los ids
 * coinciden a propósito con los que devuelve la API en vivo, para que
 * getRelevanciaSector() funcione igual con datos reales o de respaldo.
 *
 * Se descartaron a propósito "riesgo país", "actividad económica (EMAE)" y
 * "desempleo": no encontramos una fuente pública, gratuita y realmente
 * actualizada para esos tres — mejor no mostrarlos que mostrar un número
 * viejo o inventado como si fuera información real.
 */

export const MACRO_DISCLAIMER_RESPALDO =
  "No se pudo conectar con las fuentes en vivo (BCRA / dolarapi.com / Yahoo Finance) en este momento: se muestran los últimos valores guardados como respaldo, claramente desactualizados respecto del dato real de hoy.";

export const MACRO_INDICATORS_RESPALDO: MacroIndicator[] = [
  {
    id: "dolar_oficial",
    nombre: "Dólar oficial (venta)",
    valor: 1485.5,
    unidad: "ARS",
    variacion: 0.003,
    fecha: "2026-09-30",
    fuente: "dolarapi.com (respaldo, no en vivo)",
    historico: [],
  },
  {
    id: "dolar_blue",
    nombre: "Dólar blue (venta)",
    valor: 1510,
    unidad: "ARS",
    variacion: 0.002,
    fecha: "2026-09-30",
    fuente: "dolarapi.com (respaldo, no en vivo)",
    historico: [],
  },
  {
    id: "dolar_mep",
    nombre: "Dólar MEP (venta)",
    valor: 1520,
    unidad: "ARS",
    variacion: 0.001,
    fecha: "2026-09-30",
    fuente: "dolarapi.com (respaldo, no en vivo)",
    historico: [],
  },
  {
    id: "reservas",
    nombre: "Reservas internacionales",
    valor: 38500,
    unidad: "USD millones",
    variacion: 0.012,
    fecha: "2026-09-30",
    fuente: "BCRA (respaldo, no en vivo)",
    historico: [],
  },
  {
    id: "inflacion_mensual",
    nombre: "Inflación mensual (IPC)",
    valor: 2.1,
    unidad: "%",
    variacion: -0.4,
    fecha: "2026-08-31",
    fuente: "BCRA (respaldo, no en vivo)",
    historico: [],
  },
  {
    id: "inflacion_interanual",
    nombre: "Inflación interanual (IPC)",
    valor: 33.5,
    unidad: "%",
    variacion: null,
    fecha: "2026-08-31",
    fuente: "BCRA (respaldo, no en vivo)",
    historico: [],
  },
  {
    id: "tasa_badlar",
    nombre: "Tasa BADLAR bancos privados",
    valor: 22.8,
    unidad: "%",
    variacion: 0,
    fecha: "2026-09-30",
    fuente: "BCRA (respaldo, no en vivo)",
    historico: [],
  },
  {
    id: "merval",
    nombre: "Índice Merval",
    valor: 1850000,
    unidad: "puntos",
    variacion: 0.015,
    fecha: "2026-10-01",
    fuente: "Yahoo Finance (respaldo, no en vivo)",
    historico: [],
  },
];

export function getMacroIndicator(
  indicadores: MacroIndicator[],
  id: string
): MacroIndicator | undefined {
  return indicadores.find((m) => m.id === id);
}

/** Formatea el valor de un indicador macro según su unidad. Usado tanto en
 * `/macro` como en el bloque de contexto macro de la ficha de empresa, para
 * no duplicar la lógica de formato en dos lugares. */
export function formatMacroValor(indicador: MacroIndicator): string {
  if (indicador.valor === null) return "N/D";
  if (indicador.unidad === "%") return `${fmtNum(indicador.valor, 1)}%`;
  if (indicador.unidad === "ARS") return `$${fmtNum(indicador.valor, 2)}`;
  if (indicador.unidad === "USD millones") return `US$ ${fmtNum(indicador.valor, 0)} M`;
  const decimales = Math.abs(indicador.valor) < 100 ? 2 : 0;
  return `${fmtNum(indicador.valor, decimales)} ${indicador.unidad}`;
}

export function formatMacroVariacion(variacion: number | null, unidad?: string): { texto: string; clase: string } {
  if (variacion === null) return { texto: "N/D", clase: "text-ink-muted" };
  if (variacion === 0) return { texto: "0,0%", clase: "text-ink-muted" };
  if (unidad === "%") {
    const sign = variacion > 0 ? "+" : "";
    return { texto: `${sign}${fmtNum(variacion, 1)} p.p.`, clase: variacion > 0 ? "text-ok" : "text-bad" };
  }
  const texto = `${variacion > 0 ? "+" : ""}${fmtPct(variacion, 1)}`;
  return { texto, clase: variacion > 0 ? "text-ok" : "text-bad" };
}

/**
 * Relevancia sectorial — qué indicadores macro mostrar según el sector de
 * la empresa, y por qué. El texto describe por qué el indicador puede ser
 * *relevante* para el sector (un vínculo plausible y genérico, documentado
 * en la literatura económica), nunca que explique o cause el desempeño
 * puntual de una empresa individual — eso requeriría un análisis causal que
 * esta app no puede ni pretende hacer con los datos disponibles.
 */
export interface RelevanciaMacro {
  indicadorId: string;
  motivo: string;
}

const DEFAULT_RELEVANCIA: RelevanciaMacro[] = [
  {
    indicadorId: "dolar_oficial",
    motivo:
      "el tipo de cambio suele incidir en el costo de insumos importados y en la competitividad de precios de empresas de este sector.",
  },
  {
    indicadorId: "inflacion_mensual",
    motivo:
      "la evolución general de precios puede afectar los costos operativos y las decisiones de pricing de las empresas del sector.",
  },
  {
    indicadorId: "tasa_badlar",
    motivo:
      "el costo del financiamiento disponible es un factor habitual en las decisiones de inversión y capital de trabajo del sector.",
  },
];

export const RELEVANCIA_POR_SECTOR: Record<Sector, RelevanciaMacro[]> = {
  Energia: [
    {
      indicadorId: "dolar_oficial",
      motivo:
        "una parte relevante de los costos, inversiones y contratos del sector energético suele estar denominada o indexada en dólares.",
    },
    {
      indicadorId: "inflacion_mensual",
      motivo:
        "las tarifas y los costos operativos del sector energético suelen guardar alguna relación con la evolución general de precios.",
    },
    {
      indicadorId: "tasa_badlar",
      motivo:
        "el sector energético es intensivo en capital, por lo que el costo del crédito es un factor estructural a seguir.",
    },
    {
      indicadorId: "reservas",
      motivo:
        "el nivel de reservas del Banco Central suele asociarse a la disponibilidad de divisas para pagar importaciones de insumos energéticos.",
    },
  ],
  Finanzas: [
    {
      indicadorId: "tasa_badlar",
      motivo:
        "el margen de intermediación financiera depende en buena medida del nivel de las tasas de referencia.",
    },
    {
      indicadorId: "inflacion_mensual",
      motivo:
        "la inflación puede afectar el valor real de activos y pasivos financieros, además de las decisiones de tasas.",
    },
    {
      indicadorId: "dolar_blue",
      motivo:
        "la brecha entre el dólar oficial y el blue suele asociarse a expectativas sobre el sistema financiero y cambiario.",
    },
    {
      indicadorId: "reservas",
      motivo:
        "el nivel de reservas condiciona habitualmente el costo de fondeo externo y el apetito por activos financieros locales.",
    },
  ],
  Consumo: [
    {
      indicadorId: "inflacion_mensual",
      motivo:
        "el poder de compra de los consumidores y la fijación de precios de bienes de consumo masivo están asociados a la evolución de precios.",
    },
    {
      indicadorId: "merval",
      motivo:
        "el desempeño de las acciones locales suele usarse como una referencia general del clima de negocios que afecta al consumo.",
    },
    {
      indicadorId: "dolar_oficial",
      motivo:
        "una parte de los insumos y productos importados del sector consumo puede estar atada al tipo de cambio.",
    },
  ],
  Telecomunicaciones: DEFAULT_RELEVANCIA,
  Industria: DEFAULT_RELEVANCIA,
  Construccion: DEFAULT_RELEVANCIA,
  Agro: DEFAULT_RELEVANCIA,
  Materiales: DEFAULT_RELEVANCIA,
  Tecnologia: DEFAULT_RELEVANCIA,
  Salud: DEFAULT_RELEVANCIA,
  Inmobiliario: DEFAULT_RELEVANCIA,
};

export function getRelevanciaSector(
  sector: Sector,
  indicadores: MacroIndicator[]
): Array<{ indicador: MacroIndicator; motivo: string }> {
  const items = RELEVANCIA_POR_SECTOR[sector] ?? DEFAULT_RELEVANCIA;
  const resultado: Array<{ indicador: MacroIndicator; motivo: string }> = [];
  for (const item of items) {
    const indicador = getMacroIndicator(indicadores, item.indicadorId);
    if (indicador) resultado.push({ indicador, motivo: item.motivo });
  }
  return resultado;
}

/**
 * Contexto para empresas de otros mercados: referencias globales en vivo
 * (Yahoo Finance) del propio mercado, en lugar de los indicadores
 * argentinos, que no tienen relacion con una empresa que no opera en
 * Argentina. Igual que arriba, el motivo describe por que el indicador es
 * una referencia pertinente, no que explique a una empresa puntual.
 */
const CONTEXTO_POR_MERCADO: Record<string, RelevanciaMacro[]> = {
  "Estados Unidos": [
    { indicadorId: "sp500", motivo: "es la referencia general del mercado accionario estadounidense." },
    { indicadorId: "vix", motivo: "mide la volatilidad esperada del mercado y suele asociarse al apetito por riesgo." },
    { indicadorId: "bono_eeuu_10a", motivo: "es la tasa libre de riesgo de referencia que condiciona el costo de capital de las empresas." },
  ],
  Brasil: [
    { indicadorId: "bovespa", motivo: "es la referencia general del mercado accionario brasileño." },
    { indicadorId: "real_dolar", motivo: "el tipo de cambio incide en costos, deuda en dólares y resultados de empresas exportadoras o importadoras." },
    { indicadorId: "bono_eeuu_10a", motivo: "la tasa de EE.UU. condiciona el costo de financiamiento externo de los mercados emergentes." },
  ],
  Mexico: [
    { indicadorId: "mexbol", motivo: "es la referencia general del mercado accionario mexicano." },
    { indicadorId: "sp500", motivo: "la economía mexicana está fuertemente vinculada al ciclo de EE.UU." },
  ],
  Europa: [
    { indicadorId: "eurostoxx", motivo: "es la referencia general de las grandes empresas de la zona euro." },
    { indicadorId: "euro_dolar", motivo: "el tipo de cambio incide en los resultados de empresas europeas con ventas en dólares." },
  ],
  Asia: [
    { indicadorId: "nikkei", motivo: "es una referencia del mercado accionario japonés y del ciclo industrial asiático." },
    { indicadorId: "hangseng", motivo: "es una referencia del mercado accionario de Hong Kong y de China continental." },
  ],
  Chile: [
    { indicadorId: "sp500", motivo: "es una referencia global del apetito por riesgo que influye en los mercados emergentes." },
    { indicadorId: "bono_eeuu_10a", motivo: "la tasa de EE.UU. condiciona el costo de financiamiento externo de los mercados emergentes." },
  ],
};

export function getContextoMercado(
  mercado: Mercado,
  sector: Sector,
  argentinos: MacroIndicator[],
  globales: MacroIndicator[]
): Array<{ indicador: MacroIndicator; motivo: string }> {
  if (mercado === "Argentina") return getRelevanciaSector(sector, argentinos);
  const items = CONTEXTO_POR_MERCADO[mercado] ?? [];
  const resultado: Array<{ indicador: MacroIndicator; motivo: string }> = [];
  for (const item of items) {
    const indicador = getMacroIndicator(globales, item.indicadorId);
    if (indicador) {
      resultado.push({ indicador, motivo: item.motivo });
    }
  }
  return resultado;
}

/** Lineas de texto para el analisis ejecutivo y los informes. */
export function lineasContextoMacro(items: Array<{ indicador: MacroIndicator }>): string[] {
  return items.map(({ indicador }) => {
    const variacion = indicador.variacion !== null ? ` (${formatMacroVariacion(indicador.variacion).texto} respecto del dato anterior)` : "";
    return `${indicador.nombre}: ${formatMacroValor(indicador)}${variacion}. Fuente: ${indicador.fuente}, dato al ${indicador.fecha}.`;
  });
}
