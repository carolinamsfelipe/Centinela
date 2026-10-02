import { fmtNum, fmtPct } from "@/lib/format";
import type { MacroIndicator, Sector } from "@/types";

/**
 * Dataset de indicadores macroeconómicos — Fase 4.
 *
 * HONESTIDAD DE LOS DATOS (ver README, sección "Datos" / "Limitaciones
 * conocidas"): esta aplicación no tiene backend propio y, al momento de
 * escribir este archivo, no hay forma de verificar desde este entorno que
 * una integración en vivo (fetch a una API pública) funcione de punta a
 * punta (CORS, disponibilidad, formato de respuesta) sin un navegador real
 * para probarla. Para no arriesgar mostrar datos rotos o, peor, datos reales
 * mal parseados como si fueran correctos, se optó deliberadamente por la
 * opción (a): valores estáticos ilustrativos, con fecha y fuente plausibles
 * (BCRA, INDEC, BYMA), pero NUNCA presentados como información en vivo.
 * La página que consume este dataset (`src/pages/Macro.tsx`) debe mostrar
 * siempre el aviso `MACRO_DISCLAIMER` de forma visible, además de la fecha y
 * la fuente de cada indicador individual. Si en una fase futura se conecta
 * una fuente real (p. ej. dolarapi.com para el dólar), esta es la única
 * pieza que debería cambiar: la UI ya está preparada para mostrar
 * fecha/fuente por indicador.
 */

export const MACRO_DISCLAIMER =
  "Datos de demostración — no sincronizados en vivo. Los valores, variaciones y fechas de esta sección son ilustrativos (no provienen de una conexión en tiempo real a BCRA, INDEC o BYMA) y no deben usarse para decisiones financieras reales.";

export interface MacroHistoricoPunto {
  fecha: string;
  valor: number;
}

export interface MacroIndicatorConHistorico extends MacroIndicator {
  historico: MacroHistoricoPunto[];
}

export const MACRO_INDICATORS: MacroIndicatorConHistorico[] = [
  {
    id: "dolar_oficial",
    nombre: "Dólar oficial (mayorista)",
    valor: 1485.5,
    unidad: "ARS/USD",
    variacion: 0.003,
    fecha: "2026-09-30",
    fuente: "BCRA — Comunicación A, tipo de cambio mayorista (dato ilustrativo, no en vivo)",
    historico: [
      { fecha: "2026-05-30", valor: 1390.2 },
      { fecha: "2026-06-30", valor: 1415.8 },
      { fecha: "2026-07-31", valor: 1442.1 },
      { fecha: "2026-08-31", valor: 1468.9 },
      { fecha: "2026-09-30", valor: 1485.5 },
    ],
  },
  {
    id: "inflacion",
    nombre: "Inflación mensual (IPC)",
    valor: 0.021,
    unidad: "% mensual",
    variacion: -0.004,
    fecha: "2026-08-31",
    fuente: "INDEC — Índice de Precios al Consumidor (dato ilustrativo, no en vivo)",
    historico: [
      { fecha: "2026-04-30", valor: 0.031 },
      { fecha: "2026-05-31", valor: 0.028 },
      { fecha: "2026-06-30", valor: 0.026 },
      { fecha: "2026-07-31", valor: 0.025 },
      { fecha: "2026-08-31", valor: 0.021 },
    ],
  },
  {
    id: "tasa_interes",
    nombre: "Tasa de Política Monetaria (BCRA)",
    valor: 0.35,
    unidad: "% TNA",
    variacion: 0,
    fecha: "2026-09-15",
    fuente: "BCRA — Tasa de referencia de política monetaria (dato ilustrativo, no en vivo)",
    historico: [
      { fecha: "2026-05-15", valor: 0.4 },
      { fecha: "2026-06-15", valor: 0.38 },
      { fecha: "2026-07-15", valor: 0.37 },
      { fecha: "2026-08-15", valor: 0.35 },
      { fecha: "2026-09-15", valor: 0.35 },
    ],
  },
  {
    id: "riesgo_pais",
    nombre: "Riesgo País (EMBI+ Argentina)",
    valor: 650,
    unidad: "puntos básicos",
    variacion: -0.02,
    fecha: "2026-09-30",
    fuente: "JP Morgan EMBI+ (serie habitualmente replicada por bancos locales; dato ilustrativo, no en vivo)",
    historico: [
      { fecha: "2026-05-30", valor: 780 },
      { fecha: "2026-06-30", valor: 740 },
      { fecha: "2026-07-31", valor: 710 },
      { fecha: "2026-08-31", valor: 663 },
      { fecha: "2026-09-30", valor: 650 },
    ],
  },
  {
    id: "actividad_economica",
    nombre: "Estimador Mensual de Actividad Económica (EMAE)",
    valor: 0.018,
    unidad: "% var. i.a.",
    variacion: 0.003,
    fecha: "2026-07-31",
    fuente: "INDEC — EMAE (dato ilustrativo, no en vivo)",
    historico: [
      { fecha: "2026-03-31", valor: 0.005 },
      { fecha: "2026-04-30", valor: 0.009 },
      { fecha: "2026-05-31", valor: 0.012 },
      { fecha: "2026-06-30", valor: 0.015 },
      { fecha: "2026-07-31", valor: 0.018 },
    ],
  },
  {
    id: "desempleo",
    nombre: "Tasa de desempleo",
    valor: 0.072,
    unidad: "%",
    variacion: -0.001,
    fecha: "2026-06-30",
    fuente: "INDEC — Encuesta Permanente de Hogares (dato ilustrativo, no en vivo)",
    historico: [
      { fecha: "2025-09-30", valor: 0.079 },
      { fecha: "2025-12-31", valor: 0.077 },
      { fecha: "2026-03-31", valor: 0.075 },
      { fecha: "2026-06-30", valor: 0.072 },
    ],
  },
  {
    id: "reservas_internacionales",
    nombre: "Reservas Internacionales (BCRA)",
    valor: 38500,
    unidad: "USD M",
    variacion: 0.012,
    fecha: "2026-09-30",
    fuente: "BCRA — Reservas internacionales del BCRA (dato ilustrativo, no en vivo)",
    historico: [
      { fecha: "2026-05-30", valor: 34200 },
      { fecha: "2026-06-30", valor: 35600 },
      { fecha: "2026-07-31", valor: 36800 },
      { fecha: "2026-08-31", valor: 38050 },
      { fecha: "2026-09-30", valor: 38500 },
    ],
  },
  {
    id: "merval",
    nombre: "Índice Merval",
    valor: 1850000,
    unidad: "puntos",
    variacion: 0.015,
    fecha: "2026-10-01",
    fuente: "BYMA — Índice Merval (dato ilustrativo, no en vivo)",
    historico: [
      { fecha: "2026-06-01", valor: 1580000 },
      { fecha: "2026-07-01", valor: 1655000 },
      { fecha: "2026-08-01", valor: 1740000 },
      { fecha: "2026-09-01", valor: 1822000 },
      { fecha: "2026-10-01", valor: 1850000 },
    ],
  },
];

export function getMacroIndicator(id: string): MacroIndicatorConHistorico | undefined {
  return MACRO_INDICATORS.find((m) => m.id === id);
}

/** Formatea el valor de un indicador macro según su unidad. Usado tanto en
 * `/macro` como en el bloque de contexto macro de la ficha de empresa, para
 * no duplicar la lógica de formato en dos lugares. */
export function formatMacroValor(indicador: MacroIndicator): string {
  if (indicador.valor === null) return "N/D";
  if (indicador.unidad.includes("%")) return fmtPct(indicador.valor, 1);
  if (indicador.unidad === "ARS/USD") return `$${fmtNum(indicador.valor, 2)}`;
  if (indicador.unidad === "USD M") return `US$ ${fmtNum(indicador.valor, 0)} M`;
  return `${fmtNum(indicador.valor, 0)} ${indicador.unidad}`;
}

export function formatMacroVariacion(variacion: number | null): { texto: string; clase: string } {
  if (variacion === null) return { texto: "N/D", clase: "text-ink-muted" };
  if (variacion === 0) return { texto: "0.0%", clase: "text-ink-muted" };
  const texto = `${variacion > 0 ? "+" : ""}${fmtPct(variacion, 1)}`;
  return { texto, clase: variacion > 0 ? "text-ok" : "text-bad" };
}

/**
 * Relevancia sectorial — Fase 4, ficha de empresa.
 *
 * Mapeo deliberadamente simple de qué indicadores macro mostrar según el
 * sector de la empresa. El texto de cada entrada describe por qué el
 * indicador puede ser *relevante* para el sector (un vínculo plausible y
 * genérico, documentado en la literatura económica), nunca que explique o
 * cause el desempeño puntual de una empresa individual — eso requeriría un
 * análisis causal que esta app no puede ni pretende hacer con los datos
 * disponibles.
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
    indicadorId: "inflacion",
    motivo:
      "la evolución general de precios puede afectar los costos operativos y las decisiones de pricing de las empresas del sector.",
  },
  {
    indicadorId: "tasa_interes",
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
      indicadorId: "inflacion",
      motivo:
        "las tarifas y los costos operativos del sector energético suelen guardar alguna relación con la evolución general de precios.",
    },
    {
      indicadorId: "tasa_interes",
      motivo:
        "el sector energético es intensivo en capital, por lo que el costo del crédito es un factor estructural a seguir.",
    },
    {
      indicadorId: "riesgo_pais",
      motivo:
        "el acceso y el costo del financiamiento internacional para proyectos energéticos suelen estar vinculados al riesgo país.",
    },
  ],
  Finanzas: [
    {
      indicadorId: "tasa_interes",
      motivo:
        "el margen de intermediación financiera depende en buena medida del nivel de las tasas de referencia.",
    },
    {
      indicadorId: "inflacion",
      motivo:
        "la inflación puede afectar el valor real de activos y pasivos financieros, además de las decisiones de tasas.",
    },
    {
      indicadorId: "actividad_economica",
      motivo:
        "el nivel de actividad económica suele influir en la demanda de crédito y en la calidad de la cartera de préstamos.",
    },
    {
      indicadorId: "riesgo_pais",
      motivo:
        "el riesgo país condiciona habitualmente el costo de fondeo externo y el apetito por activos financieros locales.",
    },
  ],
  Consumo: [
    {
      indicadorId: "inflacion",
      motivo:
        "el poder de compra de los consumidores y la fijación de precios de bienes de consumo masivo están asociados a la evolución de precios.",
    },
    {
      indicadorId: "actividad_economica",
      motivo: "el consumo masivo tiende a moverse en la misma dirección que el nivel general de actividad económica.",
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
};

export function getRelevanciaSector(
  sector: Sector
): Array<{ indicador: MacroIndicatorConHistorico; motivo: string }> {
  const items = RELEVANCIA_POR_SECTOR[sector] ?? DEFAULT_RELEVANCIA;
  const resultado: Array<{ indicador: MacroIndicatorConHistorico; motivo: string }> = [];
  for (const item of items) {
    const indicador = getMacroIndicator(item.indicadorId);
    if (indicador) resultado.push({ indicador, motivo: item.motivo });
  }
  return resultado;
}
