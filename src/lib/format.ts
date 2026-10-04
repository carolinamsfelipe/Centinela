import type { Company } from "@/types";

export function fmtPct(v: number | null, decimals = 1): string {
  if (v === null) return "N/D";
  return `${(v * 100).toFixed(decimals)}%`;
}

export function fmtNum(v: number | null, decimals = 2): string {
  if (v === null) return "N/D";
  return v.toFixed(decimals);
}

/** Abrevia magnitudes grandes: K (miles), M (millones), B (miles de millones), T (billones). */
export function abreviar(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000_000_000) return `${(v / 1_000_000_000_000).toFixed(2)}T`;
  if (abs >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toFixed(0);
}

export function fmtMoney(v: number | null, prefijo = "$"): string {
  if (v === null) return "N/D";
  return `${v < 0 ? "-" : ""}${prefijo}${abreviar(Math.abs(v))}`;
}

type ConMoneda = Pick<Company, "monedaReporte" | "tipoCambioUsd">;

/** Convierte una magnitud en moneda de reporte a USD con el tipo de cambio actual. null si no hay cotizacion. */
export function aUsd(valor: number | null, c: ConMoneda): number | null {
  if (valor === null) return null;
  if (c.monedaReporte === "USD") return valor;
  if (c.tipoCambioUsd === null || c.tipoCambioUsd <= 0) return null;
  return valor / c.tipoCambioUsd;
}

/**
 * Formatea una magnitud de una empresa. Por defecto la expresa en USD (asi
 * son comparables entre mercados); si no hay tipo de cambio disponible la
 * deja en su moneda de origen con el codigo bien visible, nunca la presenta
 * como dolares.
 */
export function fmtMonto(valor: number | null, c: ConMoneda, modo: "usd" | "nativa" = "usd"): string {
  if (valor === null) return "N/D";
  if (modo === "nativa" || c.monedaReporte === "USD") {
    return fmtMoney(valor, c.monedaReporte === "USD" ? "US$ " : `${c.monedaReporte} `);
  }
  const usd = aUsd(valor, c);
  return usd === null ? fmtMoney(valor, `${c.monedaReporte} `) : fmtMoney(usd, "US$ ");
}

export function fmtX(v: number | null, decimals = 2): string {
  if (v === null) return "N/D";
  return `${v.toFixed(decimals)}x`;
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
