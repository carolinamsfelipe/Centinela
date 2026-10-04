import type { jsPDF } from "jspdf";
import type { Estado } from "@/types";

/**
 * Base comun de los informes PDF. jsPDF y jspdf-autotable se cargan bajo
 * demanda (import dinamico) para no sumar su peso al bundle inicial: solo
 * se descargan cuando alguien pide un informe.
 *
 * Las fuentes estandar del PDF (Helvetica) cubren Latin-1 (acentos, n, signos
 * de apertura) pero no emoji ni simbolos como >= o flechas: `limpiar` los
 * reemplaza por equivalentes en texto para que nada salga como un cuadrado
 * roto en el informe.
 */

type AutoTableFn = (doc: jsPDF, options: Record<string, unknown>) => void;

export interface InformeCtx {
  doc: jsPDF;
  autoTable: AutoTableFn;
  y: number;
  ancho: number;
  margen: number;
  altoPagina: number;
}

const MARGEN = 15;
const PIE = 16;

export const COLOR_ESTADO: Record<Estado, [number, number, number]> = {
  normal: [21, 138, 77],
  atencion: [161, 92, 7],
  alerta: [177, 51, 51],
  sin_datos: [100, 112, 140],
};
const COLOR_ACENTO: [number, number, number] = [15, 143, 130];
const COLOR_TEXTO: [number, number, number] = [15, 20, 32];
const COLOR_SUAVE: [number, number, number] = [93, 101, 120];

export function limpiar(texto: string): string {
  return texto
    .replace(/≥/g, ">=")
    .replace(/≤/g, "<=")
    .replace(/[→⟶]/g, "->")
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/·/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\x00-\xFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function crearInforme(titulo: string, subtitulo: string, detalle: string[]): Promise<InformeCtx> {
  const { jsPDF: JsPDF } = await import("jspdf");
  const autoTableModulo = await import("jspdf-autotable");
  const doc = new JsPDF({ unit: "mm", format: "a4" });
  const ancho = doc.internal.pageSize.getWidth();
  const altoPagina = doc.internal.pageSize.getHeight();

  const ctx: InformeCtx = {
    doc,
    autoTable: autoTableModulo.default as unknown as AutoTableFn,
    y: MARGEN,
    ancho,
    margen: MARGEN,
    altoPagina,
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLOR_ACENTO);
  doc.text("CENTINELA", MARGEN, ctx.y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_SUAVE);
  doc.text(limpiar(subtitulo), ancho - MARGEN, ctx.y, { align: "right" });
  ctx.y += 3;
  doc.setDrawColor(...COLOR_ACENTO);
  doc.setLineWidth(0.6);
  doc.line(MARGEN, ctx.y, ancho - MARGEN, ctx.y);
  ctx.y += 9;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...COLOR_TEXTO);
  const lineasTitulo = doc.splitTextToSize(limpiar(titulo), ancho - 2 * MARGEN) as string[];
  doc.text(lineasTitulo, MARGEN, ctx.y);
  ctx.y += lineasTitulo.length * 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...COLOR_SUAVE);
  for (const linea of detalle) {
    const partes = doc.splitTextToSize(limpiar(linea), ancho - 2 * MARGEN) as string[];
    doc.text(partes, MARGEN, ctx.y);
    ctx.y += partes.length * 4.4;
  }
  ctx.y += 4;
  return ctx;
}

export function asegurarEspacio(ctx: InformeCtx, alto: number): void {
  if (ctx.y + alto > ctx.altoPagina - PIE - 4) {
    ctx.doc.addPage();
    ctx.y = MARGEN + 4;
  }
}

export function seccion(ctx: InformeCtx, texto: string): void {
  asegurarEspacio(ctx, 16);
  ctx.y += 3;
  ctx.doc.setFont("helvetica", "bold");
  ctx.doc.setFontSize(12);
  ctx.doc.setTextColor(...COLOR_ACENTO);
  ctx.doc.text(limpiar(texto), ctx.margen, ctx.y);
  ctx.y += 2;
  ctx.doc.setDrawColor(224, 228, 237);
  ctx.doc.setLineWidth(0.3);
  ctx.doc.line(ctx.margen, ctx.y, ctx.ancho - ctx.margen, ctx.y);
  ctx.y += 5;
}

export function parrafo(ctx: InformeCtx, texto: string, opciones?: { suave?: boolean; tamano?: number }): void {
  const tamano = opciones?.tamano ?? 10;
  ctx.doc.setFont("helvetica", "normal");
  ctx.doc.setFontSize(tamano);
  ctx.doc.setTextColor(...(opciones?.suave ? COLOR_SUAVE : COLOR_TEXTO));
  const lineas = ctx.doc.splitTextToSize(limpiar(texto), ctx.ancho - 2 * ctx.margen) as string[];
  const alto = tamano * 0.46;
  for (const linea of lineas) {
    asegurarEspacio(ctx, alto + 1);
    ctx.doc.text(linea, ctx.margen, ctx.y);
    ctx.y += alto;
  }
  ctx.y += 2;
}

export function lista(ctx: InformeCtx, items: string[], opciones?: { suave?: boolean }): void {
  ctx.doc.setFont("helvetica", "normal");
  ctx.doc.setFontSize(10);
  ctx.doc.setTextColor(...(opciones?.suave ? COLOR_SUAVE : COLOR_TEXTO));
  for (const item of items) {
    const lineas = ctx.doc.splitTextToSize(limpiar(item), ctx.ancho - 2 * ctx.margen - 5) as string[];
    asegurarEspacio(ctx, lineas.length * 4.6 + 1);
    ctx.doc.text("-", ctx.margen + 1, ctx.y);
    ctx.doc.text(lineas, ctx.margen + 5, ctx.y);
    ctx.y += lineas.length * 4.6 + 1.2;
  }
  ctx.y += 1;
}

export interface OpcionesTabla {
  /** Indice de columna cuyo texto es un estado (Saludable / Atencion / Riesgo...) y se pinta de color. */
  columnaEstado?: number;
  /** Anchos de columna en mm; si se omite se reparten solos. */
  anchos?: number[];
  tamano?: number;
}

const ESTADO_POR_TEXTO: Record<string, Estado> = {
  Saludable: "normal",
  Atención: "atencion",
  Riesgo: "alerta",
  "Sin información": "sin_datos",
};

export function tabla(ctx: InformeCtx, encabezado: string[], filas: string[][], opciones?: OpcionesTabla): void {
  asegurarEspacio(ctx, 20);
  const columnStyles: Record<number, { cellWidth: number }> = {};
  opciones?.anchos?.forEach((w, i) => {
    columnStyles[i] = { cellWidth: w };
  });

  ctx.autoTable(ctx.doc, {
    startY: ctx.y,
    head: [encabezado.map(limpiar)],
    body: filas.map((f) => f.map(limpiar)),
    margin: { left: ctx.margen, right: ctx.margen, bottom: PIE + 4 },
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: opciones?.tamano ?? 9,
      cellPadding: 1.8,
      lineColor: [224, 228, 237],
      lineWidth: 0.2,
      textColor: COLOR_TEXTO,
      overflow: "linebreak",
    },
    headStyles: { fillColor: COLOR_ACENTO, textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [246, 247, 250] },
    columnStyles,
    didParseCell: (data: {
      section: string;
      column: { index: number };
      cell: { text: string[]; styles: { textColor?: unknown; fontStyle?: string } };
    }) => {
      if (data.section !== "body" || opciones?.columnaEstado === undefined) return;
      if (data.column.index !== opciones.columnaEstado) return;
      const estado = ESTADO_POR_TEXTO[data.cell.text.join(" ")];
      if (estado) {
        data.cell.styles.textColor = COLOR_ESTADO[estado];
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  const final = (ctx.doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;
  ctx.y = (final ?? ctx.y) + 5;
}

export function cerrar(ctx: InformeCtx, nombreArchivo: string): void {
  const total = ctx.doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    ctx.doc.setPage(i);
    ctx.doc.setDrawColor(224, 228, 237);
    ctx.doc.setLineWidth(0.3);
    ctx.doc.line(ctx.margen, ctx.altoPagina - PIE, ctx.ancho - ctx.margen, ctx.altoPagina - PIE);
    ctx.doc.setFont("helvetica", "normal");
    ctx.doc.setFontSize(7.5);
    ctx.doc.setTextColor(...COLOR_SUAVE);
    const aviso = limpiar(
      "Centinela es una herramienta educativa y de análisis. No constituye asesoramiento financiero ni recomendación de inversión."
    );
    ctx.doc.text(aviso, ctx.margen, ctx.altoPagina - PIE + 5);
    ctx.doc.text(`Página ${i} de ${total}`, ctx.ancho - ctx.margen, ctx.altoPagina - PIE + 5, { align: "right" });
  }
  ctx.doc.save(nombreArchivo);
}

export function nombreArchivoSeguro(texto: string): string {
  return (
    texto
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .toLowerCase() || "informe"
  );
}
