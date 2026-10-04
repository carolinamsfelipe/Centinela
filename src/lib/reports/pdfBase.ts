import type { jsPDF } from "jspdf";
import type { Estado } from "@/types";
import { ALTMAN_THRESHOLDS } from "@/lib/financial/altman";
import { SCORE_ESTADO_THRESHOLDS } from "@/lib/financial/scoreConfig";

/**
 * Base comun de los informes PDF. jsPDF y jspdf-autotable se cargan bajo
 * demanda (import dinamico) para no sumar su peso al bundle inicial: solo
 * se descargan cuando alguien pide un informe.
 *
 * Las fuentes estandar del PDF (Helvetica) cubren Latin-1 (acentos, n, signos
 * de apertura) pero no emoji ni simbolos como >= o flechas: `limpiar` los
 * reemplaza por equivalentes en texto para que nada salga como un cuadrado
 * roto en el informe. Todos los graficos se dibujan con primitivas de jsPDF
 * (rect, line, circle, triangle): no hay imagenes ni html2canvas.
 *
 * Convencion de maquetacion: `ctx.y` es el BORDE SUPERIOR del proximo bloque
 * (no una linea base). Cada bloque llama a `asegurarEspacio` con su alto antes
 * de dibujarse; si no entra, salta de pagina. Los titulos de seccion se
 * dibujan de forma diferida, junto con el primer bloque de contenido, asi
 * nunca queda un titulo huerfano al pie de una pagina.
 */

type AutoTableFn = (doc: jsPDF, options: Record<string, unknown>) => void;
export type RGB = [number, number, number];

export interface InformeCtx {
  doc: jsPDF;
  autoTable: AutoTableFn;
  /** Borde superior del proximo bloque a dibujar (mm). */
  y: number;
  ancho: number;
  margen: number;
  altoPagina: number;
  /** Nombre del documento, se repite en la cabecera de las paginas internas. */
  nombreDocumento: string;
  /** Titulo de seccion pendiente de dibujar (se dibuja junto al primer bloque). */
  seccionPendiente: string | null;
  numeroSeccion: number;
}

/* ------------------------------------------------------------------ */
/* Paleta y medidas                                                     */
/* ------------------------------------------------------------------ */

export const MARGEN = 18;
const TOP_INTERNA = 22;
const MARGEN_INFERIOR = 20;
const ALTO_SECCION = 18;
const PAD_V = 1.9;
const PAD_H = 2.4;

export const COLOR_ESTADO: Record<Estado, RGB> = {
  normal: [21, 138, 77],
  atencion: [194, 120, 3],
  alerta: [185, 48, 48],
  sin_datos: [100, 112, 140],
};
export const COLOR_NAVY: RGB = [18, 38, 64];
export const COLOR_ACENTO: RGB = [15, 143, 130];
export const COLOR_TEXTO: RGB = [31, 38, 51];
export const COLOR_SUAVE: RGB = [98, 107, 124];
const COLOR_LINEA: RGB = [221, 226, 234];
const COLOR_FONDO: RGB = [246, 248, 251];
const COLOR_CABECERA_TABLA: RGB = [232, 238, 246];
const COLOR_PISTA: RGB = [230, 234, 241];
const COLOR_BARRA_PREVIA: RGB = [160, 174, 192];

const AVISO_LEGAL =
  "Centinela es una herramienta educativa y de análisis. Este documento es orientativo y no constituye asesoramiento financiero, calificación crediticia ni recomendación de inversión.";

/** Mezcla un color con blanco (t = 0 deja el color, t = 1 da blanco). */
export function aclarar(c: RGB, t: number): RGB {
  return [Math.round(c[0] + (255 - c[0]) * t), Math.round(c[1] + (255 - c[1]) * t), Math.round(c[2] + (255 - c[2]) * t)];
}

export function limpiar(texto: string): string {
  return texto
    .replace(/≥/g, ">=")
    .replace(/≤/g, "<=")
    .replace(/≈/g, "~")
    .replace(/[→⟶]/g, "->")
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[·•]/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\x00-\xFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Alto aproximado (mm) entre el borde superior de una linea y su linea base. */
function ascenso(tamanoPt: number): number {
  return tamanoPt * 0.3528 * 0.8;
}

function fijar(ctx: InformeCtx, tamano: number, negrita: boolean, color: RGB): void {
  ctx.doc.setFont("helvetica", negrita ? "bold" : "normal");
  ctx.doc.setFontSize(tamano);
  ctx.doc.setTextColor(...color);
}

/** Escribe varias lineas con interlinea propia (no depende del interlineado interno de jsPDF). */
function escribirLineas(ctx: InformeCtx, lineas: string[], x: number, yTop: number, tamano: number, interlinea: number): void {
  lineas.forEach((l, i) => ctx.doc.text(l, x, yTop + ascenso(tamano) + i * interlinea));
}

function anchoUtil(ctx: InformeCtx): number {
  return ctx.ancho - 2 * ctx.margen;
}

function limiteInferior(ctx: InformeCtx): number {
  return ctx.altoPagina - MARGEN_INFERIOR;
}

/* ------------------------------------------------------------------ */
/* Portada / encabezado                                                 */
/* ------------------------------------------------------------------ */

export interface OpcionesPortada {
  /** Tipo de documento, en la banda superior (ej. "Informe de diagnostico financiero"). */
  tipo: string;
  titulo: string;
  subtitulo?: string;
  /** Datos cortos mostrados en una fila: [etiqueta, valor]. */
  meta?: Array<[string, string]>;
  /** Fuente de los datos, en una linea de texto bajo la fila de metadatos. */
  fuente?: string;
  /** Nombre del documento para la cabecera de las paginas internas. */
  nombreDocumento: string;
}

export async function crearInforme(opciones: OpcionesPortada): Promise<InformeCtx> {
  const { jsPDF: JsPDF } = await import("jspdf");
  const autoTableModulo = await import("jspdf-autotable");
  const doc = new JsPDF({ unit: "mm", format: "a4" });
  const ancho = doc.internal.pageSize.getWidth();
  const altoPagina = doc.internal.pageSize.getHeight();

  const ctx: InformeCtx = {
    doc,
    autoTable: autoTableModulo.default as unknown as AutoTableFn,
    y: 0,
    ancho,
    margen: MARGEN,
    altoPagina,
    nombreDocumento: limpiar(opciones.nombreDocumento),
    seccionPendiente: null,
    numeroSeccion: 0,
  };

  doc.setProperties({
    title: limpiar(opciones.titulo),
    subject: limpiar(opciones.tipo),
    author: "Centinela",
    creator: "Centinela",
  });

  // Banda superior sobria con la marca.
  doc.setFillColor(...COLOR_NAVY);
  doc.rect(0, 0, ancho, 26, "F");
  doc.setFillColor(...COLOR_ACENTO);
  doc.rect(0, 26, ancho, 1.2, "F");
  fijar(ctx, 16, true, [255, 255, 255]);
  doc.text("CENTINELA", MARGEN, 14.5);
  fijar(ctx, 7.5, false, [176, 194, 214]);
  doc.text("Diagnóstico financiero", MARGEN, 20);
  fijar(ctx, 8, true, [255, 255, 255]);
  doc.text(limpiar(opciones.tipo).toUpperCase(), ancho - MARGEN, 16.5, { align: "right" });

  // Titulo y subtitulo.
  const util = anchoUtil(ctx);
  let y = 41;
  fijar(ctx, 22, true, COLOR_NAVY);
  const lineasTitulo = doc.splitTextToSize(limpiar(opciones.titulo), util) as string[];
  for (const l of lineasTitulo) {
    doc.text(l, MARGEN, y);
    y += 9.5;
  }
  if (opciones.subtitulo) {
    fijar(ctx, 10.5, false, COLOR_SUAVE);
    const lineasSub = doc.splitTextToSize(limpiar(opciones.subtitulo), util) as string[];
    for (const l of lineasSub) {
      doc.text(l, MARGEN, y);
      y += 5;
    }
  }
  y += 2;

  // Fila de metadatos.
  const meta = opciones.meta ?? [];
  if (meta.length > 0) {
    doc.setDrawColor(...COLOR_LINEA);
    doc.setLineWidth(0.3);
    doc.line(MARGEN, y, ancho - MARGEN, y);
    y += 4.5;
    const colAncho = util / meta.length;
    let altoFila = 0;
    meta.forEach(([etiqueta, valor], i) => {
      const x = MARGEN + i * colAncho;
      fijar(ctx, 6.8, true, COLOR_SUAVE);
      doc.text(limpiar(etiqueta).toUpperCase(), x, y);
      fijar(ctx, 9.2, true, COLOR_TEXTO);
      const lineas = (doc.splitTextToSize(limpiar(valor), colAncho - 3) as string[]).slice(0, 2);
      lineas.forEach((l, k) => doc.text(l, x, y + 4.6 + k * 4.2));
      altoFila = Math.max(altoFila, 4.6 + lineas.length * 4.2);
    });
    y += altoFila + 1.5;
    doc.line(MARGEN, y, ancho - MARGEN, y);
    y += 4;
  }

  if (opciones.fuente) {
    fijar(ctx, 6.8, true, COLOR_SUAVE);
    doc.text("FUENTE DE LOS DATOS", MARGEN, y + 1);
    y += 4.6;
    fijar(ctx, 8.5, false, COLOR_SUAVE);
    const lineas = doc.splitTextToSize(limpiar(opciones.fuente), util) as string[];
    for (const l of lineas) {
      doc.text(l, MARGEN, y);
      y += 4;
    }
  }

  ctx.y = y + 5;
  return ctx;
}

/* ------------------------------------------------------------------ */
/* Control de paginas y secciones                                       */
/* ------------------------------------------------------------------ */

function nuevaPagina(ctx: InformeCtx): void {
  ctx.doc.addPage();
  ctx.y = TOP_INTERNA;
}

function dibujarSeccion(ctx: InformeCtx, texto: string): void {
  const { doc } = ctx;
  if (ctx.y > TOP_INTERNA + 0.5) ctx.y += 6;
  ctx.numeroSeccion += 1;
  doc.setFillColor(...COLOR_ACENTO);
  doc.rect(ctx.margen, ctx.y, 1.3, 5.6, "F");
  fijar(ctx, 12.5, true, COLOR_NAVY);
  const titulo = (doc.splitTextToSize(`${ctx.numeroSeccion}. ${limpiar(texto)}`, anchoUtil(ctx) - 4) as string[])[0] ?? "";
  doc.text(titulo, ctx.margen + 3.6, ctx.y + 4.5);
  doc.setDrawColor(...COLOR_LINEA);
  doc.setLineWidth(0.3);
  doc.line(ctx.margen, ctx.y + 7.4, ctx.ancho - ctx.margen, ctx.y + 7.4);
  ctx.y += 11;
}

/**
 * Garantiza `alto` mm libres desde ctx.y; si no entran, salta de pagina. Si hay
 * un titulo de seccion pendiente, lo dibuja justo antes del bloque (y lo cuenta
 * en el espacio necesario), de modo que titulo y contenido nunca se separan.
 */
export function asegurarEspacio(ctx: InformeCtx, alto: number): void {
  const extra = ctx.seccionPendiente !== null ? ALTO_SECCION : 0;
  if (ctx.y + extra + alto > limiteInferior(ctx) && ctx.y > TOP_INTERNA + 0.5) nuevaPagina(ctx);
  if (ctx.seccionPendiente !== null) {
    const t = ctx.seccionPendiente;
    ctx.seccionPendiente = null;
    dibujarSeccion(ctx, t);
  }
}

/** Abre una seccion numerada. El titulo se dibuja con el primer bloque que siga. */
export function seccion(ctx: InformeCtx, texto: string): void {
  ctx.seccionPendiente = texto;
}

export function subtitulo(ctx: InformeCtx, texto: string, reservar = 14): void {
  asegurarEspacio(ctx, reservar);
  fijar(ctx, 9.8, true, COLOR_NAVY);
  ctx.doc.text(limpiar(texto), ctx.margen, ctx.y + ascenso(9.8));
  ctx.y += 6.2;
}

export function espacio(ctx: InformeCtx, mm: number): void {
  ctx.y += mm;
}

/* ------------------------------------------------------------------ */
/* Texto                                                                */
/* ------------------------------------------------------------------ */

function lineaJustificada(doc: jsPDF, linea: string, x: number, y: number, ancho: number): void {
  const palabras = linea.split(" ");
  if (palabras.length < 2) {
    doc.text(linea, x, y);
    return;
  }
  const anchos = palabras.map((p) => doc.getTextWidth(p));
  const suma = anchos.reduce((a, b) => a + b, 0);
  const gap = (ancho - suma) / (palabras.length - 1);
  const normal = doc.getTextWidth(" ");
  if (gap > normal * 3 || gap < normal * 0.6) {
    doc.text(linea, x, y);
    return;
  }
  let cx = x;
  palabras.forEach((p, i) => {
    doc.text(p, cx, y);
    cx += (anchos[i] ?? 0) + gap;
  });
}

export interface OpcionesParrafo {
  suave?: boolean;
  tamano?: number;
  negrita?: boolean;
  /** Justifica el texto (la ultima linea del parrafo queda alineada a la izquierda). */
  justificar?: boolean;
  /** Espacio posterior en mm. */
  despues?: number;
}

export function parrafo(ctx: InformeCtx, texto: string, opciones?: OpcionesParrafo): void {
  const tamano = opciones?.tamano ?? 9.5;
  const interlinea = tamano * 0.5;
  const util = anchoUtil(ctx);
  fijar(ctx, tamano, opciones?.negrita ?? false, opciones?.suave ? COLOR_SUAVE : COLOR_TEXTO);
  const lineas = ctx.doc.splitTextToSize(limpiar(texto), util) as string[];
  lineas.forEach((linea, i) => {
    // Evita dejar una sola linea suelta al pie o al comienzo de una pagina.
    const necesario = i === 0 && lineas.length > 1 ? interlinea * 2 : interlinea;
    asegurarEspacio(ctx, necesario);
    fijar(ctx, tamano, opciones?.negrita ?? false, opciones?.suave ? COLOR_SUAVE : COLOR_TEXTO);
    const yBase = ctx.y + ascenso(tamano);
    if (opciones?.justificar && i < lineas.length - 1) lineaJustificada(ctx.doc, linea, ctx.margen, yBase, util);
    else ctx.doc.text(linea, ctx.margen, yBase);
    ctx.y += interlinea;
  });
  ctx.y += opciones?.despues ?? 2.5;
}

export interface OpcionesLista {
  suave?: boolean;
  numerada?: boolean;
  tamano?: number;
}

export function lista(ctx: InformeCtx, items: string[], opciones?: OpcionesLista): void {
  const tamano = opciones?.tamano ?? 9.5;
  const interlinea = tamano * 0.5;
  const color = opciones?.suave ? COLOR_SUAVE : COLOR_TEXTO;
  const sangria = opciones?.numerada ? 7 : 5.5;
  items.forEach((item, i) => {
    fijar(ctx, tamano, false, color);
    const lineas = ctx.doc.splitTextToSize(limpiar(item), anchoUtil(ctx) - sangria) as string[];
    asegurarEspacio(ctx, lineas.length * interlinea + 1);
    fijar(ctx, tamano, false, color);
    const yBase = ctx.y + ascenso(tamano);
    if (opciones?.numerada) {
      fijar(ctx, tamano, true, COLOR_ACENTO);
      ctx.doc.text(`${i + 1}.`, ctx.margen + 0.5, yBase);
      fijar(ctx, tamano, false, color);
    } else {
      ctx.doc.setFillColor(...COLOR_ACENTO);
      ctx.doc.circle(ctx.margen + 1.5, yBase - 1.1, 0.6, "F");
    }
    escribirLineas(ctx, lineas, ctx.margen + sangria, ctx.y, tamano, interlinea);
    ctx.y += lineas.length * interlinea + 1.6;
  });
  ctx.y += 1;
}

export interface ItemMarcado {
  color: RGB;
  titulo: string;
  texto: string;
}

/** Lista con marcador de color (semaforo) y titulo en negrita sobre el texto. */
export function listaMarcada(ctx: InformeCtx, items: ItemMarcado[]): void {
  const util = anchoUtil(ctx);
  for (const item of items) {
    fijar(ctx, 8.8, false, COLOR_SUAVE);
    const lineas = ctx.doc.splitTextToSize(limpiar(item.texto), util - 7) as string[];
    const alto = 5.4 + lineas.length * 4.4 + 1.8;
    asegurarEspacio(ctx, alto);
    ctx.doc.setFillColor(...item.color);
    ctx.doc.circle(ctx.margen + 1.8, ctx.y + 2.5, 1.2, "F");
    fijar(ctx, 9.3, true, COLOR_TEXTO);
    ctx.doc.text(limpiar(item.titulo), ctx.margen + 6, ctx.y + 3.3);
    fijar(ctx, 8.8, false, COLOR_SUAVE);
    escribirLineas(ctx, lineas, ctx.margen + 6, ctx.y + 5.4, 8.8, 4.4);
    ctx.y += alto;
  }
  ctx.y += 1;
}

export interface OpcionesRecuadro {
  titulo?: string;
  color?: RGB;
  texto?: string;
  items?: string[];
  tamano?: number;
  /** Justifica el texto corrido (no los items). */
  justificar?: boolean;
}

/** Recuadro con borde lateral de color: avisos, notas y limitaciones. */
export function recuadro(ctx: InformeCtx, o: OpcionesRecuadro): void {
  const tamano = o.tamano ?? 8.8;
  const interlinea = tamano * 0.5;
  const color = o.color ?? COLOR_SUAVE;
  const interior = anchoUtil(ctx) - 11;
  fijar(ctx, tamano, false, COLOR_TEXTO);
  const bloques: string[][] = [];
  if (o.texto) bloques.push(ctx.doc.splitTextToSize(limpiar(o.texto), interior) as string[]);
  for (const it of o.items ?? []) bloques.push(ctx.doc.splitTextToSize(limpiar(it), interior - 4) as string[]);
  const lineasTotal = bloques.reduce((a, b) => a + b.length, 0);
  const alto = 6 + (o.titulo ? 5.5 : 0) + lineasTotal * interlinea + (o.items?.length ?? 0) * 1.4;
  asegurarEspacio(ctx, alto);
  const { doc } = ctx;
  const x = ctx.margen;
  const y = ctx.y;
  doc.setFillColor(...aclarar(color, 0.92));
  doc.rect(x, y, anchoUtil(ctx), alto, "F");
  doc.setFillColor(...color);
  doc.rect(x, y, 1.5, alto, "F");
  let cy = y + 3.2;
  if (o.titulo) {
    fijar(ctx, 8.8, true, color);
    doc.text(limpiar(o.titulo), x + 5, cy + ascenso(8.8));
    cy += 5.5;
  }
  fijar(ctx, tamano, false, COLOR_TEXTO);
  let primero = true;
  if (o.texto) {
    const lineas = bloques[0] ?? [];
    lineas.forEach((l, i) => {
      const yBase = cy + ascenso(tamano);
      if (o.justificar && i < lineas.length - 1) lineaJustificada(doc, l, x + 5, yBase, interior);
      else doc.text(l, x + 5, yBase);
      cy += interlinea;
    });
    primero = false;
  }
  const inicioItems = primero ? 0 : 1;
  bloques.slice(inicioItems).forEach((lineas) => {
    doc.setFillColor(...color);
    doc.circle(x + 6, cy + ascenso(tamano) - 1, 0.5, "F");
    escribirLineas(ctx, lineas, x + 9, cy, tamano, interlinea);
    cy += lineas.length * interlinea + 1.4;
  });
  ctx.y += alto + 3;
}

/* ------------------------------------------------------------------ */
/* Tarjetas de veredicto                                                */
/* ------------------------------------------------------------------ */

export interface TarjetaVeredicto {
  titulo: string;
  valor: string;
  unidad?: string;
  estado: Estado;
  etiquetaEstado: string;
  detalle?: string;
}

export function tarjetasVeredicto(ctx: InformeCtx, tarjetas: TarjetaVeredicto[]): void {
  if (tarjetas.length === 0) return;
  const alto = 31;
  asegurarEspacio(ctx, alto);
  const { doc } = ctx;
  const sep = 4;
  const w = (anchoUtil(ctx) - sep * (tarjetas.length - 1)) / tarjetas.length;
  tarjetas.forEach((t, i) => {
    const x = ctx.margen + i * (w + sep);
    const y = ctx.y;
    const color = COLOR_ESTADO[t.estado];
    doc.setFillColor(...aclarar(color, 0.9));
    doc.setDrawColor(...aclarar(color, 0.6));
    doc.setLineWidth(0.3);
    doc.rect(x, y, w, alto, "FD");
    doc.setFillColor(...color);
    doc.rect(x, y, 2.2, alto, "F");

    fijar(ctx, 6.8, true, COLOR_SUAVE);
    const titulo = (doc.splitTextToSize(limpiar(t.titulo).toUpperCase(), w - 9) as string[])[0] ?? "";
    doc.text(titulo, x + 6, y + 6);

    fijar(ctx, 25, true, color);
    doc.text(limpiar(t.valor), x + 6, y + 17.5);
    if (t.unidad) {
      const wv = doc.getTextWidth(limpiar(t.valor));
      fijar(ctx, 10, false, COLOR_SUAVE);
      doc.text(limpiar(t.unidad), x + 6 + wv + 1.8, y + 17.5);
    }

    fijar(ctx, 7.6, true, [255, 255, 255]);
    const etiqueta = limpiar(t.etiquetaEstado);
    const wc = doc.getTextWidth(etiqueta) + 5;
    doc.setFillColor(...color);
    doc.roundedRect(x + 6, y + 22, wc, 5.2, 1, 1, "F");
    doc.text(etiqueta, x + 8.5, y + 25.7);
    if (t.detalle) {
      fijar(ctx, 7.4, false, COLOR_SUAVE);
      const restante = w - 6 - wc - 5;
      if (restante > 12) {
        const l = (doc.splitTextToSize(limpiar(t.detalle), restante) as string[])[0] ?? "";
        doc.text(l, x + 6 + wc + 2.2, y + 25.7);
      }
    }
  });
  ctx.y += alto + 5;
}

/* ------------------------------------------------------------------ */
/* Graficos con primitivas de jsPDF                                     */
/* ------------------------------------------------------------------ */

/** Escala horizontal del Altman Z'' con zonas roja/amarilla/verde y marcador. */
export function graficoAltman(ctx: InformeCtx, z: number | null): void {
  const alto = 24;
  asegurarEspacio(ctx, alto);
  const { doc } = ctx;
  const x0 = ctx.margen;
  const w = anchoUtil(ctx);
  const max = 4;
  const escala = (v: number) => x0 + (Math.min(Math.max(v, 0), max) / max) * w;
  const yBar = ctx.y + 10;
  const hBar = 6.5;
  const { distress, safe } = ALTMAN_THRESHOLDS;
  const zonas: Array<{ desde: number; hasta: number; color: RGB; texto: string }> = [
    { desde: 0, hasta: distress, color: COLOR_ESTADO.alerta, texto: "Zona de distress" },
    { desde: distress, hasta: safe, color: COLOR_ESTADO.atencion, texto: "Zona gris" },
    { desde: safe, hasta: max, color: COLOR_ESTADO.normal, texto: "Zona segura" },
  ];
  for (const zona of zonas) {
    const xa = escala(zona.desde);
    const xb = escala(zona.hasta);
    doc.setFillColor(...zona.color);
    doc.rect(xa, yBar, xb - xa, hBar, "F");
    fijar(ctx, 7.2, true, [255, 255, 255]);
    doc.text(zona.texto, (xa + xb) / 2, yBar + 4.4, { align: "center" });
  }
  // Marcas de umbral.
  fijar(ctx, 7, false, COLOR_SUAVE);
  doc.setDrawColor(...COLOR_SUAVE);
  doc.setLineWidth(0.2);
  for (const v of [distress, safe]) {
    doc.line(escala(v), yBar + hBar, escala(v), yBar + hBar + 1.4);
    doc.text(v.toFixed(1), escala(v), yBar + hBar + 4.6, { align: "center" });
  }
  doc.text("0", x0, yBar + hBar + 4.6);
  doc.text(`${max}+`, x0 + w, yBar + hBar + 4.6, { align: "right" });

  if (z !== null) {
    const xm = escala(z);
    doc.setFillColor(...COLOR_NAVY);
    doc.triangle(xm - 2.2, yBar - 4.4, xm + 2.2, yBar - 4.4, xm, yBar - 0.6, "F");
    doc.setDrawColor(...COLOR_NAVY);
    doc.setLineWidth(0.7);
    doc.line(xm, yBar - 0.6, xm, yBar + hBar);
    fijar(ctx, 8.5, true, COLOR_NAVY);
    const etiqueta = `Z'' = ${z.toFixed(2)}`;
    const mitad = doc.getTextWidth(etiqueta) / 2;
    const xt = Math.min(Math.max(xm, x0 + mitad), x0 + w - mitad);
    doc.text(etiqueta, xt, yBar - 6);
  }
  ctx.y += alto;
}

export interface CategoriaBarra {
  nombre: string;
  valor: number | null;
  peso: number;
}

function estadoPorPuntaje(v: number | null): Estado {
  if (v === null) return "sin_datos";
  if (v >= SCORE_ESTADO_THRESHOLDS.normal) return "normal";
  if (v >= SCORE_ESTADO_THRESHOLDS.atencion) return "atencion";
  return "alerta";
}

/** Barras horizontales (0-100) por categoria del Score, con los umbrales marcados. */
export function barrasCategorias(ctx: InformeCtx, categorias: CategoriaBarra[]): void {
  const filaAlto = 7.6;
  const alto = 7 + categorias.length * filaAlto + 6;
  asegurarEspacio(ctx, alto);
  const { doc } = ctx;
  const x0 = ctx.margen;
  const xPista = x0 + 46;
  const wPista = 88;
  const xDerecha = ctx.ancho - ctx.margen;
  const y0 = ctx.y;

  fijar(ctx, 6.8, true, COLOR_SUAVE);
  doc.text("CATEGORÍA", x0, y0 + 3);
  doc.text("PUNTAJE (0-100)", xPista, y0 + 3);
  doc.text("PESO", xDerecha, y0 + 3, { align: "right" });
  doc.setDrawColor(...COLOR_LINEA);
  doc.setLineWidth(0.3);
  doc.line(x0, y0 + 4.5, xDerecha, y0 + 4.5);

  categorias.forEach((c, i) => {
    const y = y0 + 7 + i * filaAlto;
    const color = COLOR_ESTADO[estadoPorPuntaje(c.valor)];
    fijar(ctx, 9, false, COLOR_TEXTO);
    doc.text(limpiar(c.nombre), x0, y + 4);
    doc.setFillColor(...COLOR_PISTA);
    doc.rect(xPista, y + 1, wPista, 3.8, "F");
    if (c.valor !== null) {
      const wv = Math.max(0.8, (Math.min(Math.max(c.valor, 0), 100) / 100) * wPista);
      doc.setFillColor(...color);
      doc.rect(xPista, y + 1, wv, 3.8, "F");
    }
    fijar(ctx, 9, true, c.valor !== null ? color : COLOR_SUAVE);
    doc.text(c.valor !== null ? String(Math.round(c.valor)) : "N/D", xPista + wPista + 4, y + 4);
    fijar(ctx, 8.5, false, COLOR_SUAVE);
    doc.text(`${Math.round(c.peso * 100)}%`, xDerecha, y + 4, { align: "right" });
  });

  // Lineas de umbral sobre las pistas.
  const yTop = y0 + 7;
  const yBot = y0 + 7 + categorias.length * filaAlto;
  doc.setDrawColor(...COLOR_NAVY);
  doc.setLineWidth(0.2);
  for (const u of [SCORE_ESTADO_THRESHOLDS.atencion, SCORE_ESTADO_THRESHOLDS.normal]) {
    const xu = xPista + (u / 100) * wPista;
    doc.line(xu, yTop, xu, yBot);
    fijar(ctx, 6.5, false, COLOR_SUAVE);
    doc.text(String(u), xu, yBot + 3, { align: "center" });
  }
  ctx.y += alto;
}

export interface ItemBarraHorizontal {
  etiqueta: string;
  valor: number | null;
  color: RGB;
  /** Texto a la derecha de la barra (ej. "64 - Atencion"). */
  texto: string;
}

export interface OpcionesBarrasHorizontales {
  max: number;
  marcas?: Array<{ valor: number; etiqueta: string }>;
  anchoEtiqueta?: number;
}

/** Ranking en barras horizontales con lineas de umbral. Una barra por item. */
export function barrasHorizontales(ctx: InformeCtx, items: ItemBarraHorizontal[], o: OpcionesBarrasHorizontales): void {
  if (items.length === 0) return;
  const filaAlto = 8;
  const alto = 6 + items.length * filaAlto + 4;
  asegurarEspacio(ctx, alto);
  const { doc } = ctx;
  const x0 = ctx.margen;
  const anchoEtiqueta = o.anchoEtiqueta ?? 48;
  const xPista = x0 + anchoEtiqueta + 2;
  const wPista = anchoUtil(ctx) - anchoEtiqueta - 2 - 30;
  const y0 = ctx.y + 5;

  items.forEach((it, i) => {
    const y = y0 + i * filaAlto;
    fijar(ctx, 9, false, COLOR_TEXTO);
    const etiqueta = (doc.splitTextToSize(limpiar(it.etiqueta), anchoEtiqueta) as string[])[0] ?? "";
    doc.text(etiqueta, x0, y + 4.4);
    doc.setFillColor(...COLOR_PISTA);
    doc.rect(xPista, y + 1.2, wPista, 4.4, "F");
    if (it.valor !== null) {
      const wv = Math.max(0.8, (Math.min(Math.max(it.valor, 0), o.max) / o.max) * wPista);
      doc.setFillColor(...it.color);
      doc.rect(xPista, y + 1.2, wv, 4.4, "F");
    }
    fijar(ctx, 8.8, true, it.valor !== null ? it.color : COLOR_SUAVE);
    doc.text(limpiar(it.texto), xPista + wPista + 3, y + 4.6);
  });

  const yFin = y0 + items.length * filaAlto;
  doc.setDrawColor(...COLOR_NAVY);
  doc.setLineWidth(0.2);
  for (const m of o.marcas ?? []) {
    const xm = xPista + (m.valor / o.max) * wPista;
    doc.line(xm, y0, xm, yFin);
    fijar(ctx, 6.5, false, COLOR_SUAVE);
    doc.text(limpiar(m.etiqueta), xm, y0 - 1.2, { align: "center" });
  }
  ctx.y += alto;
}

export interface SerieEvolucion {
  titulo: string;
  puntos: Array<{ etiqueta: string; valor: number | null }>;
  formato: (v: number) => string;
}

/** Etiqueta corta de un ejercicio: "2025" si cierra en diciembre, "mm/aa" si no. */
export function etiquetaPeriodo(periodo: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(periodo);
  if (!m) return periodo;
  const anio = m[1] ?? "";
  const mes = m[2] ?? "";
  return mes === "12" ? anio : `${mes}/${anio.slice(2)}`;
}

/** Mini graficos de barras por ejercicio, uno al lado del otro. La ultima barra se destaca. */
export function graficosEvolucion(ctx: InformeCtx, series: SerieEvolucion[]): void {
  if (series.length === 0) return;
  const alto = 44;
  asegurarEspacio(ctx, alto);
  const { doc } = ctx;
  const sep = 5;
  const w = (anchoUtil(ctx) - sep * (series.length - 1)) / series.length;

  series.forEach((s, i) => {
    const x = ctx.margen + i * (w + sep);
    const y = ctx.y;
    doc.setFillColor(251, 252, 253);
    doc.setDrawColor(...COLOR_LINEA);
    doc.setLineWidth(0.3);
    doc.rect(x, y, w, alto, "FD");
    fijar(ctx, 8.4, true, COLOR_NAVY);
    doc.text(limpiar(s.titulo), x + 3, y + 5.6);

    const puntos = s.puntos.slice(-5);
    const valores = puntos.map((p) => p.valor).filter((v): v is number => v !== null);
    if (valores.length === 0) {
      fijar(ctx, 8, false, COLOR_SUAVE);
      doc.text("Sin datos", x + w / 2, y + alto / 2 + 2, { align: "center" });
      return;
    }
    const px = x + 4;
    const pw = w - 8;
    const yTop = y + 15;
    const vmin = Math.min(0, ...valores);
    let vmax = Math.max(0, ...valores);
    if (vmax === vmin) vmax = vmin + 1;
    const yBase = y + alto - 9 - (vmin < 0 ? 3.5 : 0);
    const hArea = yBase - yTop;
    const yv = (v: number) => yBase - ((v - vmin) / (vmax - vmin)) * hArea;
    const y0 = yv(0);
    const slot = pw / puntos.length;
    const barW = Math.min(slot * 0.5, 13);

    puntos.forEach((p, k) => {
      const bx = px + k * slot + (slot - barW) / 2;
      const ultimo = k === puntos.length - 1;
      if (p.valor !== null) {
        const negativo = p.valor < 0;
        const color = ultimo ? (negativo ? COLOR_ESTADO.alerta : COLOR_ACENTO) : COLOR_BARRA_PREVIA;
        const yb = yv(p.valor);
        doc.setFillColor(...color);
        doc.rect(bx, Math.min(y0, yb), barW, Math.max(Math.abs(yb - y0), 0.4), "F");
        fijar(ctx, 7.3, ultimo, ultimo ? COLOR_TEXTO : COLOR_SUAVE);
        const yEtiqueta = negativo ? yb + 3.2 : yb - 1.3;
        doc.text(s.formato(p.valor), bx + barW / 2, yEtiqueta, { align: "center" });
      } else {
        fijar(ctx, 7, false, COLOR_SUAVE);
        doc.text("N/D", bx + barW / 2, y0 - 1.3, { align: "center" });
      }
      fijar(ctx, 7.2, false, COLOR_SUAVE);
      doc.text(limpiar(p.etiqueta), bx + barW / 2, y + alto - 3.4, { align: "center" });
    });
    doc.setDrawColor(...COLOR_SUAVE);
    doc.setLineWidth(0.25);
    doc.line(px, y0, px + pw, y0);
  });
  ctx.y += alto + 4;
}

/* ------------------------------------------------------------------ */
/* Tablas                                                               */
/* ------------------------------------------------------------------ */

export type FilaTabla = string[] | { grupo: string };

export interface OpcionesTabla {
  /** Indice de columna cuyo texto es un estado (Saludable / Atencion / Riesgo...): se pinta con semaforo. */
  columnaEstado?: number;
  /** Anchos relativos de columna; se escalan para ocupar todo el ancho util. */
  anchos?: number[];
  /** Columnas alineadas a la derecha (cifras). */
  derecha?: number[];
  tamano?: number;
  /** Color de texto por celda del cuerpo (indices: fila de `filas`, columna). */
  celdaColor?: (fila: number, columna: number) => RGB | undefined;
  /** Filas del cuerpo a resaltar (negrita y fondo suave). */
  resaltar?: number[];
}

const ESTADO_POR_TEXTO: Record<string, Estado> = {
  Saludable: "normal",
  Atención: "atencion",
  Riesgo: "alerta",
  "Sin información": "sin_datos",
};

interface EstilosCelda {
  textColor?: RGB;
  fillColor?: RGB;
  fontStyle?: string;
  halign?: string;
  fontSize?: number;
}

interface DatosCelda {
  section: string;
  row: { index: number };
  column: { index: number };
  cell: { x: number; y: number; width: number; height: number; text: string[]; styles: EstilosCelda };
}

/** Alto estimado de la tabla (mm), para decidir un salto de pagina antes de dibujarla. */
function estimarAltoTabla(
  ctx: InformeCtx,
  encabezado: string[],
  filas: FilaTabla[],
  anchos: number[],
  tamano: number,
  columnaEstado: number | undefined
): number {
  const { doc } = ctx;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(tamano);
  const lh = (tamano * doc.getLineHeightFactor()) / doc.internal.scaleFactor;
  const lineasDe = (texto: string, i: number) => {
    const ancho = (anchos[i] ?? 20) - 2 * PAD_H - (i === columnaEstado ? 3.6 : 0);
    return (doc.splitTextToSize(limpiar(texto), Math.max(ancho, 5)) as string[]).length;
  };
  let total = Math.max(...encabezado.map((t, i) => lineasDe(t, i))) * lh + 2 * PAD_V;
  for (const f of filas) {
    if (!Array.isArray(f)) {
      total += lh + 2 * PAD_V;
      continue;
    }
    total += Math.max(1, ...f.map((t, i) => lineasDe(t, i))) * lh + 2 * PAD_V;
  }
  return total;
}

export function tabla(ctx: InformeCtx, encabezado: string[], filas: FilaTabla[], opciones: OpcionesTabla = {}): void {
  const n = encabezado.length;
  const tamano = opciones.tamano ?? 8.8;
  const util = anchoUtil(ctx);
  const pesos = opciones.anchos && opciones.anchos.length === n ? opciones.anchos : encabezado.map(() => 1);
  const sumaPesos = pesos.reduce((a, b) => a + b, 0);
  const anchos = pesos.map((p) => (p * util) / sumaPesos);
  const derecha = new Set(opciones.derecha ?? []);
  const resaltar = new Set(opciones.resaltar ?? []);

  // Zebra suave que se reinicia despues de cada fila de grupo.
  const cebra: boolean[] = [];
  let contador = 0;
  for (const f of filas) {
    if (Array.isArray(f)) {
      cebra.push(contador % 2 === 1);
      contador += 1;
    } else {
      cebra.push(false);
      contador = 0;
    }
  }

  // Mantener la tabla junta: si cabe en una pagina pero no en lo que queda, pasa a la siguiente.
  const altoEstimado = estimarAltoTabla(ctx, encabezado, filas, anchos, tamano, opciones.columnaEstado);
  const alturaPagina = limiteInferior(ctx) - TOP_INTERNA;
  const necesario = altoEstimado <= alturaPagina * 0.95 ? altoEstimado : Math.min(altoEstimado, 45);
  asegurarEspacio(ctx, necesario);

  const columnStyles: Record<number, Record<string, unknown>> = {};
  anchos.forEach((w, i) => {
    columnStyles[i] = { cellWidth: w, halign: derecha.has(i) ? "right" : "left" };
  });

  const cuerpo = filas.map((f) =>
    Array.isArray(f)
      ? f.map(limpiar)
      : [{ content: limpiar(f.grupo).toUpperCase(), colSpan: n, styles: { halign: "left" } }]
  );

  const doc = ctx.doc;
  ctx.autoTable(doc, {
    startY: ctx.y,
    head: [encabezado.map(limpiar)],
    body: cuerpo,
    margin: { left: ctx.margen, right: ctx.margen, top: TOP_INTERNA, bottom: MARGEN_INFERIOR },
    tableWidth: util,
    theme: "plain",
    rowPageBreak: "avoid",
    showHead: "everyPage",
    styles: {
      font: "helvetica",
      fontSize: tamano,
      cellPadding: { top: PAD_V, bottom: PAD_V, left: PAD_H, right: PAD_H },
      textColor: COLOR_TEXTO,
      overflow: "linebreak",
      valign: "middle",
      lineWidth: 0,
    },
    headStyles: {
      fillColor: COLOR_CABECERA_TABLA,
      textColor: COLOR_NAVY,
      fontStyle: "bold",
      fontSize: tamano - 0.6,
    },
    columnStyles,
    didParseCell: (data: DatosCelda) => {
      const col = data.column.index;
      if (data.section === "head") {
        if (derecha.has(col)) data.cell.styles.halign = "right";
        return;
      }
      if (data.section !== "body") return;
      const fila = filas[data.row.index];
      if (fila === undefined) return;
      if (!Array.isArray(fila)) {
        data.cell.styles.fillColor = COLOR_FONDO;
        data.cell.styles.textColor = COLOR_ACENTO;
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fontSize = tamano - 1.2;
        return;
      }
      if (resaltar.has(data.row.index)) {
        data.cell.styles.fillColor = aclarar(COLOR_ACENTO, 0.9);
        data.cell.styles.fontStyle = "bold";
      } else if (cebra[data.row.index]) {
        data.cell.styles.fillColor = COLOR_FONDO;
      }
      const color = opciones.celdaColor?.(data.row.index, col);
      if (color) {
        data.cell.styles.textColor = color;
        data.cell.styles.fontStyle = "bold";
      }
      if (col === opciones.columnaEstado) {
        const estado = ESTADO_POR_TEXTO[data.cell.text.join(" ").trim()];
        if (estado) {
          data.cell.styles.textColor = COLOR_ESTADO[estado];
          data.cell.styles.fontStyle = "bold";
          // Deja lugar al marcador circular de semaforo que se dibuja en didDrawCell.
          data.cell.text = [`    ${data.cell.text.join(" ").trim()}`];
        }
      }
    },
    didDrawCell: (data: DatosCelda) => {
      const { cell } = data;
      if (data.section === "head") {
        doc.setDrawColor(...COLOR_NAVY);
        doc.setLineWidth(0.4);
        doc.line(cell.x, cell.y + cell.height, cell.x + cell.width, cell.y + cell.height);
        return;
      }
      if (data.section !== "body") return;
      doc.setDrawColor(...COLOR_LINEA);
      doc.setLineWidth(0.15);
      doc.line(cell.x, cell.y + cell.height, cell.x + cell.width, cell.y + cell.height);
      if (data.column.index === opciones.columnaEstado) {
        const estado = ESTADO_POR_TEXTO[cell.text.join(" ").trim()];
        if (estado) {
          doc.setFillColor(...COLOR_ESTADO[estado]);
          doc.circle(cell.x + PAD_H + 1.1, cell.y + cell.height / 2, 1.1, "F");
        }
      }
    },
  });

  const final = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;
  ctx.y = (final ?? ctx.y) + 5;
}

/* ------------------------------------------------------------------ */
/* Cierre: cabecera, pie y descarga                                     */
/* ------------------------------------------------------------------ */

export function cerrar(ctx: InformeCtx, nombreArchivo: string): void {
  const { doc } = ctx;
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);

    // Cabecera discreta en paginas internas (la portada ya tiene su banda).
    if (i > 1) {
      fijar(ctx, 8, true, COLOR_NAVY);
      doc.text("CENTINELA", ctx.margen, 11);
      fijar(ctx, 8, false, COLOR_SUAVE);
      doc.text(ctx.nombreDocumento, ctx.ancho - ctx.margen, 11, { align: "right" });
      doc.setDrawColor(...COLOR_LINEA);
      doc.setLineWidth(0.3);
      doc.line(ctx.margen, 13.5, ctx.ancho - ctx.margen, 13.5);
    }

    // Pie: aviso legal a la izquierda, numeracion a la derecha.
    const yLinea = ctx.altoPagina - 15;
    doc.setDrawColor(...COLOR_LINEA);
    doc.setLineWidth(0.3);
    doc.line(ctx.margen, yLinea, ctx.ancho - ctx.margen, yLinea);
    fijar(ctx, 6.8, false, COLOR_SUAVE);
    const aviso = doc.splitTextToSize(limpiar(AVISO_LEGAL), 128) as string[];
    aviso.slice(0, 3).forEach((l, k) => doc.text(l, ctx.margen, yLinea + 4.2 + k * 3));
    fijar(ctx, 8, true, COLOR_NAVY);
    doc.text(`Página ${i} de ${total}`, ctx.ancho - ctx.margen, yLinea + 4.6, { align: "right" });
    fijar(ctx, 6.8, false, COLOR_SUAVE);
    const nombreDoc = (doc.splitTextToSize(ctx.nombreDocumento, 42) as string[])[0] ?? "";
    doc.text(nombreDoc, ctx.ancho - ctx.margen, yLinea + 8.4, { align: "right" });
  }
  doc.save(nombreArchivo);
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
