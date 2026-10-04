import { nombreMercado, nombreSector } from "@/data/companies";
import { ESTADO_LABEL } from "@/lib/financial/diagnostics";
import { aUsd, fmtFecha, fmtMonto, fmtNum, fmtPct, fmtX } from "@/lib/format";
import type { AltmanResult, CentinelaScore, Company } from "@/types";
import { cerrar, crearInforme, lista, parrafo, seccion, tabla } from "./pdfBase";
import { textoFuente } from "./informeEmpresa";

export interface AnalisisComparable {
  company: Company;
  altman: AltmanResult;
  score: CentinelaScore;
}

export interface FilaComparativa {
  label: string;
  valor: (a: AnalisisComparable) => string;
}

/** Filas de la tabla comparativa: las usan la pantalla y el informe, asi nunca difieren. */
export const FILAS_COMPARATIVAS: FilaComparativa[] = [
  { label: "Mercado", valor: (a) => nombreMercado(a.company.mercado) },
  { label: "Sector", valor: (a) => nombreSector(a.company.sector) },
  { label: "Moneda de reporte", valor: (a) => a.company.monedaReporte },
  { label: "Balance al", valor: (a) => fmtFecha(a.company.metrics.periodo) },
  { label: "Score Centinela", valor: (a) => (a.score.total !== null ? `${a.score.total} / 100` : "N/A") },
  { label: "Altman Z''", valor: (a) => (a.altman.zScore !== null ? fmtNum(a.altman.zScore) : "N/A") },
  { label: "Market Cap (US$)", valor: (a) => fmtMonto(a.company.metrics.marketCap, a.company) },
  { label: "Revenue (US$)", valor: (a) => fmtMonto(a.company.metrics.revenue, a.company) },
  { label: "EBITDA (US$)", valor: (a) => fmtMonto(a.company.metrics.ebitda, a.company) },
  { label: "Free Cash Flow (US$)", valor: (a) => fmtMonto(a.company.metrics.freeCashFlow, a.company) },
  { label: "Margen neto", valor: (a) => fmtPct(a.company.metrics.margenNeto) },
  { label: "ROE", valor: (a) => fmtPct(a.company.metrics.roe) },
  { label: "ROA", valor: (a) => fmtPct(a.company.metrics.roa) },
  { label: "Debt/Equity", valor: (a) => fmtX(a.company.metrics.debtToEquity) },
  { label: "Current Ratio", valor: (a) => fmtNum(a.company.metrics.currentRatio) },
  { label: "P/E", valor: (a) => fmtNum(a.company.metrics.pe) },
  { label: "P/B", valor: (a) => fmtNum(a.company.metrics.pb) },
  { label: "EV/EBITDA", valor: (a) => fmtNum(a.company.metrics.evEbitda) },
];

export const NOTA_COMPARACION =
  "Los importes se expresan en US$ al tipo de cambio actual para que sean comparables entre mercados; los ratios (ROE, ROA, márgenes, Debt/Equity, liquidez) no dependen de la moneda. El Altman Z'' y el Score Centinela no se calculan para bancos y entidades financieras (N/A). Las empresas que reportan en pesos argentinos tienen cifras nominales sin ajuste por inflación.";

function ordenarPorScore(analisis: AnalisisComparable[]): AnalisisComparable[] {
  return [...analisis].sort((a, b) => {
    if (a.score.total === null && b.score.total === null) return 0;
    if (a.score.total === null) return 1;
    if (b.score.total === null) return -1;
    return b.score.total - a.score.total;
  });
}

export async function descargarInformeComparativo(analisis: AnalisisComparable[]): Promise<void> {
  const mercados = Array.from(new Set(analisis.map((a) => nombreMercado(a.company.mercado))));
  const ctx = await crearInforme("Comparación de empresas", "Informe comparativo", [
    `${analisis.map((a) => a.company.nombre).join(" - ")}`,
    `Mercados: ${mercados.join(", ")} - Generado el ${new Date().toLocaleDateString("es-AR")}`,
  ]);

  seccion(ctx, "Tabla comparativa");
  const anchoPrimera = 38;
  const anchoResto = (180 - anchoPrimera) / analisis.length;
  tabla(
    ctx,
    ["Indicador", ...analisis.map((a) => `${a.company.nombre}${a.company.fuente === "propia" ? " (propia)" : ` (${a.company.ticker})`}`)],
    FILAS_COMPARATIVAS.map((f) => [f.label, ...analisis.map((a) => f.valor(a))]),
    { anchos: [anchoPrimera, ...analisis.map(() => anchoResto)], tamano: analisis.length > 3 ? 7.5 : 8.5 }
  );
  parrafo(ctx, NOTA_COMPARACION, { suave: true, tamano: 8.5 });

  seccion(ctx, "Ranking relativo por Score Centinela");
  tabla(
    ctx,
    ["#", "Empresa", "Mercado", "Score", "Estado"],
    ordenarPorScore(analisis).map((a, i) => [
      String(i + 1),
      a.company.nombre,
      nombreMercado(a.company.mercado),
      a.score.total !== null ? `${a.score.total} / 100` : "N/A",
      ESTADO_LABEL[a.score.estado],
    ]),
    { columnaEstado: 4, anchos: [10, 68, 40, 30, 32] }
  );
  parrafo(ctx, "El orden se basa exclusivamente en el Score Centinela y no constituye una recomendación de inversión.", {
    suave: true,
    tamano: 8.5,
  });

  seccion(ctx, "Fuentes de los datos");
  lista(
    ctx,
    analisis.map((a) => `${a.company.nombre}: ${textoFuente(a.company)}`),
    { suave: true }
  );

  cerrar(ctx, "centinela_comparacion.pdf");
}

/* ------------------------------------------------------------------ */
/* Excel                                                                */
/* ------------------------------------------------------------------ */

type Celda = string | number | null;

async function descargarExcel(nombre: string, hojas: Array<{ nombre: string; filas: Celda[][] }>): Promise<void> {
  const XLSX = await import("xlsx");
  const libro = XLSX.utils.book_new();
  for (const h of hojas) {
    XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet(h.filas), h.nombre.slice(0, 31));
  }
  XLSX.writeFile(libro, nombre);
}

function filaDatos(a: AnalisisComparable): Celda[] {
  const c = a.company;
  const m = c.metrics;
  return [
    c.nombre,
    c.fuente === "propia" ? "(propia)" : c.ticker,
    nombreMercado(c.mercado),
    nombreSector(c.sector),
    c.monedaReporte,
    m.periodo,
    a.score.total,
    a.altman.zScore,
    aUsd(m.marketCap, c),
    aUsd(m.revenue, c),
    aUsd(m.ebitda, c),
    aUsd(m.netIncome, c),
    aUsd(m.freeCashFlow, c),
    m.roe,
    m.roa,
    m.margenNeto,
    m.debtToEquity,
    m.currentRatio,
    m.pe,
    m.pb,
    m.evEbitda,
  ];
}

const ENCABEZADO_DATOS: Celda[] = [
  "Empresa",
  "Ticker",
  "Mercado",
  "Sector",
  "Moneda de reporte",
  "Balance al",
  "Score Centinela",
  "Altman Z''",
  "Market Cap (US$)",
  "Revenue (US$)",
  "EBITDA (US$)",
  "Net Income (US$)",
  "Free Cash Flow (US$)",
  "ROE",
  "ROA",
  "Margen neto",
  "Debt/Equity",
  "Current Ratio",
  "P/E",
  "P/B",
  "EV/EBITDA",
];

export async function descargarExcelComparativo(analisis: AnalisisComparable[]): Promise<void> {
  await descargarExcel("centinela_comparacion.xlsx", [
    { nombre: "Comparación", filas: [ENCABEZADO_DATOS, ...analisis.map(filaDatos)] },
    {
      nombre: "Notas",
      filas: [
        ["Generado", new Date().toISOString()],
        ["Importes", "En US$ al tipo de cambio de la fecha de generación."],
        ["Ratios", "ROE, ROA y margen neto en proporción (0.15 = 15%)."],
        ["Altman / Score", "N/A (celda vacía) para bancos y entidades financieras."],
        ...analisis.map((a): Celda[] => [a.company.nombre, textoFuente(a.company)]),
      ],
    },
  ]);
}

export async function descargarExcelEmpresa(a: AnalisisComparable): Promise<void> {
  const c = a.company;
  await descargarExcel(`centinela_${c.ticker}.xlsx`, [
    { nombre: "Resumen", filas: [ENCABEZADO_DATOS, filaDatos(a)] },
    {
      nombre: "Histórico",
      filas: [
        ["Ejercicio", `Revenue (${c.monedaReporte})`, `EBITDA (${c.monedaReporte})`, `Net Income (${c.monedaReporte})`, `Free Cash Flow (${c.monedaReporte})`, "ROE", "ROA", "Debt/Equity", "Altman Z''", "Score"],
        ...c.historico.map((h): Celda[] => [h.periodo, h.revenue, h.ebitda, h.netIncome, h.freeCashFlow, h.roe, h.roa, h.debtToEquity, h.altmanZ, h.centinelaScore]),
      ],
    },
    {
      nombre: "Notas",
      filas: [
        ["Fuente", textoFuente(c)],
        ...(c.notas ?? []).map((n): Celda[] => ["Nota", n]),
      ],
    },
  ]);
}
