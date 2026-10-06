import { nombreMercado, nombreSector } from "@/data/companies";
import { ALTMAN_THRESHOLDS } from "@/lib/financial/altman";
import { ESTADO_LABEL } from "@/lib/financial/diagnostics";
import { SCORE_ESTADO_THRESHOLDS, SCORE_WEIGHTS } from "@/lib/financial/scoreConfig";
import { esEntidadFinanciera } from "@/lib/financial/analysis";
import { inferirMetricasCaja } from "@/lib/financial/benchmarks";
import { aUsd, fmtFecha, fmtMonto, fmtNum, fmtPct, fmtScore, fmtX } from "@/lib/format";
import type { AltmanResult, CentinelaScore, Company, Estado } from "@/types";
import {
  COLOR_ESTADO,
  type FilaTabla,
  barrasHorizontales,
  cerrar,
  crearInforme,
  lista,
  parrafo,
  recuadro,
  seccion,
  subtitulo,
  tabla,
  tarjetasVeredicto,
} from "./pdfBase";
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
  {
    label: "Score Centinela",
    valor: (a) =>
      a.score.total !== null
        ? `${fmtScore(a.score.total)} / 100`
        : esEntidadFinanciera(a.company)
        ? "N/A"
        : "N/D",
  },
  {
    label: "Altman Z''",
    valor: (a) =>
      a.altman.zScore !== null
        ? fmtNum(a.altman.zScore)
        : a.altman.noAplica || esEntidadFinanciera(a.company)
        ? "N/A"
        : "N/D",
  },
  { label: "Market Cap (US$)", valor: (a) => fmtMonto(a.company.metrics.marketCap, a.company) },
  { label: "Revenue (US$)", valor: (a) => fmtMonto(a.company.metrics.revenue, a.company) },
  { label: "EBITDA (US$)", valor: (a) => fmtMonto(a.company.metrics.ebitda, a.company) },
  { label: "Free Cash Flow (US$)", valor: (a) => fmtMonto(a.company.metrics.freeCashFlow, a.company) },
  { label: "Margen neto", valor: (a) => fmtPct(a.company.metrics.margenNeto) },
  { label: "ROE", valor: (a) => fmtPct(a.company.metrics.roe) },
  { label: "ROA", valor: (a) => fmtPct(a.company.metrics.roa) },
  { label: "Debt/Equity", valor: (a) => fmtX(a.company.metrics.debtToEquity) },
  { label: "Current Ratio", valor: (a) => fmtNum(a.company.metrics.currentRatio) },
  {
    label: "Ciclo de caja (CCC)",
    valor: (a) => {
      const c = inferirMetricasCaja(a.company.metrics, a.company.sector, a.company.mercado);
      return c.esCccEstimado ? `~${c.ccc} d (Est.)` : `${c.ccc} d`;
    },
  },
  {
    label: "Días de cobro (DSO)",
    valor: (a) => {
      const c = inferirMetricasCaja(a.company.metrics, a.company.sector, a.company.mercado);
      return c.esDsoEstimado ? `~${c.dso} d (Est.)` : `${c.dso} d`;
    },
  },
  {
    label: "Días proveedores (DPO)",
    valor: (a) => {
      const c = inferirMetricasCaja(a.company.metrics, a.company.sector, a.company.mercado);
      return c.esDpoEstimado ? `~${c.dpo} d (Est.)` : `${c.dpo} d`;
    },
  },
  {
    label: "Cobertura intereses (ICR)",
    valor: (a) => {
      const c = inferirMetricasCaja(a.company.metrics, a.company.sector, a.company.mercado);
      return c.esIcrEstimado ? `~${fmtNum(c.icr)}x (Proxy)` : `${fmtNum(c.icr)}x`;
    },
  },
  { label: "P/E", valor: (a) => fmtNum(a.company.metrics.pe) },
  { label: "P/B", valor: (a) => fmtNum(a.company.metrics.pb) },
  { label: "EV/EBITDA", valor: (a) => fmtNum(a.company.metrics.evEbitda) },
];

export const NOTA_COMPARACION =
  "Los importes se expresan en US$ al tipo de cambio actual para que sean comparables entre mercados; los ratios (ROE, ROA, márgenes, Debt/Equity, liquidez) no dependen de la moneda. El Altman Z'' y el Score Centinela no se calculan para bancos y entidades financieras (N/A) y se indican como N/D cuando la información contable disponible es insuficiente. Las empresas que reportan en pesos argentinos tienen cifras nominales sin ajuste por inflación.";

function ordenarPorScore(analisis: AnalisisComparable[]): AnalisisComparable[] {
  return [...analisis].sort((a, b) => {
    if (a.score.total === null && b.score.total === null) return 0;
    if (a.score.total === null) return 1;
    if (b.score.total === null) return -1;
    return b.score.total - a.score.total;
  });
}

const ZONA_ALTMAN: Record<Estado, string> = {
  normal: "Zona segura",
  atencion: "Zona gris",
  alerta: "Zona de distress",
  sin_datos: "Sin datos",
};

/** Agrupacion de filas en la tabla comparativa del PDF (solo presentacion; la pantalla usa FILAS_COMPARATIVAS tal cual). */
const GRUPOS_TABLA: Array<{ titulo: string; labels: string[] }> = [
  { titulo: "Perfil", labels: ["Mercado", "Sector", "Moneda de reporte", "Balance al"] },
  { titulo: "Diagnóstico Centinela", labels: ["Score Centinela", "Altman Z''"] },
  { titulo: "Tamaño y resultados (US$)", labels: ["Market Cap (US$)", "Revenue (US$)", "EBITDA (US$)", "Free Cash Flow (US$)"] },
  { titulo: "Rentabilidad y solvencia", labels: ["Margen neto", "ROE", "ROA", "Debt/Equity", "Current Ratio"] },
  { titulo: "Múltiplos de valuación", labels: ["P/E", "P/B", "EV/EBITDA"] },
];

const ETIQUETA_PDF: Record<string, string> = {
  "Market Cap (US$)": "Capitalización bursátil (US$)",
  "Revenue (US$)": "Ingresos (US$)",
  "EBITDA (US$)": "EBITDA (US$)",
  "Free Cash Flow (US$)": "Flujo de caja libre (US$)",
  "Debt/Equity": "Deuda / Patrimonio",
  "Current Ratio": "Liquidez corriente",
};

function dividirOraciones(texto: string): string[] {
  return texto
    .split(/\.\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .map((t) => (t.endsWith(".") ? t : `${t}.`));
}

function construirHallazgosComparativo(ordenadas: AnalisisComparable[]): string[] {
  const hallazgos: string[] = [];
  const conScore = ordenadas.filter((a) => a.score.total !== null);
  const primero = conScore[0];
  const ultimo = conScore[conScore.length - 1];
  if (primero && ultimo) {
    const desc = (a: AnalisisComparable) => `${a.company.nombre} (${a.score.total}/100, ${ESTADO_LABEL[a.score.estado]})`;
    hallazgos.push(
      primero === ultimo
        ? `Score Centinela: ${desc(primero)}.`
        : `Score Centinela: mayor para ${desc(primero)}; menor para ${desc(ultimo)}.`
    );
  }

  const conAltman = ordenadas
    .filter((a): a is AnalisisComparable & { altman: { zScore: number } } => a.altman.zScore !== null)
    .sort((a, b) => b.altman.zScore - a.altman.zScore);
  const mejorAltman = conAltman[0];
  if (mejorAltman) {
    const distress = conAltman.filter((a) => a.altman.estado === "alerta").map((a) => a.company.nombre);
    hallazgos.push(
      `Altman Z'': el mayor es ${mejorAltman.company.nombre} (${fmtNum(mejorAltman.altman.zScore)}, ${ZONA_ALTMAN[mejorAltman.altman.estado].toLowerCase()}).` +
        (distress.length > 0 ? ` En zona de distress: ${distress.join(", ")}.` : " Ninguna empresa se ubica en zona de distress.")
    );
  }

  const conRoe = ordenadas.filter((a) => a.company.metrics.roe !== null).sort((a, b) => (b.company.metrics.roe ?? 0) - (a.company.metrics.roe ?? 0));
  const mejorRoe = conRoe[0];
  const peorRoe = conRoe[conRoe.length - 1];
  if (mejorRoe && peorRoe && mejorRoe !== peorRoe) {
    hallazgos.push(
      `Rentabilidad: el ROE más alto es el de ${mejorRoe.company.nombre} (${fmtPct(mejorRoe.company.metrics.roe)}) y el más bajo el de ${peorRoe.company.nombre} (${fmtPct(peorRoe.company.metrics.roe)}).`
    );
  }

  const conDe = ordenadas
    .filter((a) => a.company.metrics.debtToEquity !== null)
    .sort((a, b) => (a.company.metrics.debtToEquity ?? 0) - (b.company.metrics.debtToEquity ?? 0));
  const menorDe = conDe[0];
  const mayorDe = conDe[conDe.length - 1];
  if (menorDe && mayorDe && menorDe !== mayorDe) {
    hallazgos.push(
      `Endeudamiento: menor Deuda / Patrimonio en ${menorDe.company.nombre} (${fmtX(menorDe.company.metrics.debtToEquity)}); mayor en ${mayorDe.company.nombre} (${fmtX(mayorDe.company.metrics.debtToEquity)}).`
    );
  }

  const sinScore = ordenadas.filter((a) => a.score.total === null).map((a) => a.company.nombre);
  if (sinScore.length > 0) {
    hallazgos.push(`Sin Score Centinela (bancos y entidades financieras, o datos insuficientes): ${sinScore.join(", ")}.`);
  }
  return hallazgos.slice(0, 5);
}

export async function descargarInformeComparativo(analisis: AnalisisComparable[]): Promise<void> {
  const mercados = Array.from(new Set(analisis.map((a) => nombreMercado(a.company.mercado))));
  const ordenadas = ordenarPorScore(analisis);
  const nombres = analisis.map((a) => a.company.nombre);

  const ctx = await crearInforme({
    tipo: "Informe comparativo",
    titulo: "Comparación de empresas",
    subtitulo: nombres.join("  |  "),
    meta: [
      ["Emisión", new Date().toLocaleDateString("es-AR")],
      ["Empresas", String(analisis.length)],
      ["Mercados", mercados.join(", ")],
      ["Cifras en", "US$ (convertidos)"],
    ],
    nombreDocumento: `Informe comparativo - ${nombres.join(" vs ")}`,
  });

  /* ---------------- Veredicto: top por Score ---------------- */
  const top = ordenadas.slice(0, 4);
  tarjetasVeredicto(
    ctx,
    top.map((a, i) => ({
      titulo: `#${i + 1} ${a.company.nombre}`,
      valor: a.score.total !== null ? String(a.score.total) : "N/A",
      unidad: a.score.total !== null ? "/ 100" : undefined,
      estado: a.score.estado,
      etiquetaEstado: ESTADO_LABEL[a.score.estado],
      detalle: top.length <= 3 && a.altman.zScore !== null ? `Altman ${fmtNum(a.altman.zScore)}` : undefined,
    }))
  );

  /* ---------------- 1. Resumen ejecutivo ---------------- */
  seccion(ctx, "Resumen ejecutivo");
  parrafo(
    ctx,
    `Se comparan ${analisis.length} empresas de ${mercados.length === 1 ? "un mercado" : `${mercados.length} mercados`} (${mercados.join(", ")}). Los importes se expresan en US$ al tipo de cambio de la fecha del informe; los ratios no dependen de la moneda. El orden se basa exclusivamente en el Score Centinela.`,
    { justificar: true }
  );
  const hallazgos = construirHallazgosComparativo(ordenadas);
  if (hallazgos.length > 0) lista(ctx, hallazgos);

  /* ---------------- 2. Ranking y posicionamiento ---------------- */
  seccion(ctx, "Ranking y posicionamiento");
  subtitulo(ctx, "Score Centinela (0-100)", 40);
  barrasHorizontales(
    ctx,
    ordenadas.map((a) => ({
      etiqueta: `${a.company.nombre}${a.company.fuente === "propia" ? " (propia)" : ""}`,
      valor: a.score.total,
      color: COLOR_ESTADO[a.score.estado],
      texto: a.score.total !== null ? `${a.score.total} - ${ESTADO_LABEL[a.score.estado]}` : "N/A",
    })),
    {
      max: 100,
      marcas: [
        { valor: SCORE_ESTADO_THRESHOLDS.atencion, etiqueta: String(SCORE_ESTADO_THRESHOLDS.atencion) },
        { valor: SCORE_ESTADO_THRESHOLDS.normal, etiqueta: String(SCORE_ESTADO_THRESHOLDS.normal) },
      ],
    }
  );
  parrafo(
    ctx,
    `Líneas verticales: umbrales de clasificación (Atención desde ${SCORE_ESTADO_THRESHOLDS.atencion} puntos, Saludable desde ${SCORE_ESTADO_THRESHOLDS.normal}). El ranking no constituye una recomendación de inversión.`,
    { suave: true, tamano: 8 }
  );
  if (analisis.some((a) => a.altman.zScore !== null)) {
    subtitulo(ctx, "Altman Z'' (escala 0 a 4+)", 40);
    barrasHorizontales(
      ctx,
      ordenadas.map((a) => ({
        etiqueta: `${a.company.nombre}${a.company.fuente === "propia" ? " (propia)" : ""}`,
        valor: a.altman.zScore,
        color: COLOR_ESTADO[a.altman.estado],
        texto: a.altman.zScore !== null ? `${fmtNum(a.altman.zScore)} - ${ZONA_ALTMAN[a.altman.estado]}` : "N/A",
      })),
      {
        max: 4,
        marcas: [
          { valor: ALTMAN_THRESHOLDS.distress, etiqueta: String(ALTMAN_THRESHOLDS.distress) },
          { valor: ALTMAN_THRESHOLDS.safe, etiqueta: String(ALTMAN_THRESHOLDS.safe) },
        ],
      }
    );
  }

  /* ---------------- 3. Tabla comparativa ---------------- */
  seccion(ctx, "Tabla comparativa");
  const filasPorLabel = new Map(FILAS_COMPARATIVAS.map((f) => [f.label, f]));
  const usadas = new Set<string>();
  const filasTabla: FilaTabla[] = [];
  let filaScore = -1;
  let filaAltman = -1;
  const agregarGrupo = (titulo: string, labels: string[]) => {
    const presentes = labels.filter((l) => filasPorLabel.has(l));
    if (presentes.length === 0) return;
    filasTabla.push({ grupo: titulo });
    for (const l of presentes) {
      const f = filasPorLabel.get(l);
      if (!f) continue;
      usadas.add(l);
      if (l === "Score Centinela") filaScore = filasTabla.length;
      if (l === "Altman Z''") filaAltman = filasTabla.length;
      filasTabla.push([ETIQUETA_PDF[l] ?? l, ...analisis.map((a) => f.valor(a))]);
    }
  };
  for (const g of GRUPOS_TABLA) agregarGrupo(g.titulo, g.labels);
  agregarGrupo(
    "Otros",
    FILAS_COMPARATIVAS.map((f) => f.label).filter((l) => !usadas.has(l))
  );

  tabla(
    ctx,
    ["Indicador", ...analisis.map((a) => `${a.company.nombre}${a.company.fuente === "propia" ? " (propia)" : ` (${a.company.ticker})`}`)],
    filasTabla,
    {
      anchos: [1.5, ...analisis.map(() => 1)],
      derecha: analisis.map((_, i) => i + 1),
      tamano: analisis.length > 3 ? 7.8 : 8.6,
      celdaColor: (fila, col) => {
        const a = analisis[col - 1];
        if (!a) return undefined;
        if (fila === filaScore) return COLOR_ESTADO[a.score.estado];
        if (fila === filaAltman) return COLOR_ESTADO[a.altman.estado];
        return undefined;
      },
    }
  );

  /* ---------------- 4. Metodologia y fuentes ---------------- */
  seccion(ctx, "Metodología y fuentes");
  lista(
    ctx,
    [
      `Score Centinela (0-100): promedio ponderado de cinco categorías (solvencia ${Math.round(SCORE_WEIGHTS.solvencia * 100)}%, liquidez ${Math.round(SCORE_WEIGHTS.liquidez * 100)}%, rentabilidad ${Math.round(SCORE_WEIGHTS.rentabilidad * 100)}%, endeudamiento ${Math.round(SCORE_WEIGHTS.endeudamiento * 100)}%, eficiencia ${Math.round(SCORE_WEIGHTS.eficiencia * 100)}%). Saludable desde ${SCORE_ESTADO_THRESHOLDS.normal} puntos, Atención desde ${SCORE_ESTADO_THRESHOLDS.atencion}, Riesgo por debajo.`,
      `Altman Z'' (Altman, 1995): Z'' = 6.56 X1 + 3.26 X2 + 6.72 X3 + 1.05 X4. Zona segura por encima de ${ALTMAN_THRESHOLDS.safe}, zona gris entre ${ALTMAN_THRESHOLDS.distress} y ${ALTMAN_THRESHOLDS.safe}, distress por debajo de ${ALTMAN_THRESHOLDS.distress}.`,
      "Los importes se convierten a US$ con el tipo de cambio de la fecha de generación del informe.",
    ],
    { suave: true, tamano: 8.6 }
  );
  subtitulo(ctx, "Fuente de los datos por empresa", 20);
  lista(
    ctx,
    analisis.map((a) => `${a.company.nombre}: ${textoFuente(a.company)}`),
    { suave: true, tamano: 8.6 }
  );

  /* ---------------- 5. Notas y limitaciones ---------------- */
  seccion(ctx, "Notas y limitaciones");
  recuadro(ctx, {
    color: COLOR_ESTADO.sin_datos,
    items: [...dividirOraciones(NOTA_COMPARACION), "Este informe es orientativo y no constituye asesoramiento financiero ni una recomendación de inversión."],
    tamano: 8.6,
  });

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
  const caja = inferirMetricasCaja(m, c.sector, c.mercado);
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
    caja.ccc,
    caja.dso,
    caja.dpo,
    caja.icr,
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
  "CCC (días)",
  "DSO (días)",
  "DPO (días)",
  "ICR Cobertura",
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
