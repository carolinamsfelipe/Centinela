import type { Company } from "@/types";

const NUM_FORMATTERS = new Map<number, Intl.NumberFormat>();

function getFormatter(decimals: number): Intl.NumberFormat {
  let f = NUM_FORMATTERS.get(decimals);
  if (!f) {
    f = new Intl.NumberFormat("es-AR", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    NUM_FORMATTERS.set(decimals, f);
  }
  return f;
}

/**
 * Formatea un número respetando locale es-AR (separador de miles con punto, decimales con coma).
 * Devuelve "N/D" si es null, undefined o NaN.
 */
export function fmtNum(v: number | null | undefined, decimals = 2): string {
  if (v === null || v === undefined || Number.isNaN(v) || !Number.isFinite(v)) return "N/D";
  return getFormatter(decimals).format(v);
}

/**
 * Formatea un porcentaje multiplicando por 100 con sufijo %.
 */
export function fmtPct(v: number | null | undefined, decimals = 1): string {
  if (v === null || v === undefined || Number.isNaN(v) || !Number.isFinite(v)) return "N/D";
  return `${getFormatter(decimals).format(v * 100)}%`;
}

/**
 * Formatea el Score Centinela (0 a 100): si tiene decimal significativo se muestra con 1 decimal (ej. 69,6),
 * si es entero se muestra redondo (ej. 70).
 */
export function fmtScore(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v) || !Number.isFinite(v)) return "N/D";
  return v % 1 === 0 ? v.toFixed(0) : getFormatter(1).format(v);
}

/** Abrevia magnitudes grandes con convención clara: K (miles), M (millones), B (miles de millones), T (billones). */
export function abreviar(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000_000_000) return `${getFormatter(1).format(v / 1_000_000_000_000)} T`;
  if (abs >= 1_000_000_000) return `${getFormatter(1).format(v / 1_000_000_000)} B`;
  if (abs >= 1_000_000) return `${getFormatter(1).format(v / 1_000_000)} M`;
  if (abs >= 1_000) return `${getFormatter(1).format(v / 1_000)} K`;
  return getFormatter(0).format(v);
}

export function fmtMoney(v: number | null | undefined, prefijo = "$ "): string {
  if (v === null || v === undefined || Number.isNaN(v) || !Number.isFinite(v)) return "N/D";
  return `${v < 0 ? "-" : ""}${prefijo}${abreviar(Math.abs(v))}`;
}

type ConMoneda = Pick<Company, "monedaReporte" | "tipoCambioUsd">;

/** Convierte una magnitud en moneda de reporte a USD con el tipo de cambio actual. null si no hay cotización. */
export function aUsd(valor: number | null | undefined, c: ConMoneda): number | null {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return null;
  if (c.monedaReporte === "USD") return valor;
  if (c.tipoCambioUsd === null || c.tipoCambioUsd <= 0) return null;
  return valor / c.tipoCambioUsd;
}

/**
 * Formatea una magnitud monetaria de una empresa. Por defecto la expresa en US$ (comparable entre mercados);
 * si no hay tipo de cambio disponible la deja en su moneda de origen con el código bien visible.
 */
export function fmtMonto(valor: number | null | undefined, c: ConMoneda, modo: "usd" | "nativa" = "usd"): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return "N/D";
  if (modo === "nativa" || c.monedaReporte === "USD") {
    return fmtMoney(valor, c.monedaReporte === "USD" ? "US$ " : `${c.monedaReporte} `);
  }
  const usd = aUsd(valor, c);
  return usd === null ? fmtMoney(valor, `${c.monedaReporte} `) : fmtMoney(usd, "US$ ");
}

export function fmtX(v: number | null | undefined, decimals = 2): string {
  if (v === null || v === undefined || Number.isNaN(v) || !Number.isFinite(v)) return "N/D";
  return `${getFormatter(decimals).format(v)}x`;
}

/** Fecha ISO (AAAA-MM-DD o ISO completo) a dd/mm/aaaa. */
export function fmtFecha(iso: string | null | undefined): string {
  if (!iso) return "N/D";
  const soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (soloFecha) return `${soloFecha[3]}/${soloFecha[2]}/${soloFecha[1]}`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-AR");
}

/** Traducción en español del tamaño de empresa. */
export function nombreTamano(tamano: string | null | undefined): string {
  if (!tamano) return "N/D";
  switch (tamano.toLowerCase()) {
    case "large":
      return "Grande";
    case "mid":
      return "Mediana";
    case "small":
      return "Pequeña";
    default:
      return tamano;
  }
}
