import { nombreMercado, nombreSector } from "@/data/companies";
import { ALTMAN_THRESHOLDS } from "@/lib/financial/altman";
import { ESTADO_LABEL } from "@/lib/financial/diagnostics";
import type { BenchmarkMercado } from "@/lib/financial/benchmarks";
import type { AnalisisEjecutivo } from "@/lib/financial/narrative";
import { esEntidadFinanciera } from "@/lib/financial/analysis";
import { SCORE_ESTADO_THRESHOLDS } from "@/lib/financial/scoreConfig";
import { abreviar, aUsd, fmtFecha, fmtMonto, fmtNum, fmtPct, fmtScore, fmtX } from "@/lib/format";
import type { AltmanResult, CentinelaScore, Company, Estado, Signal } from "@/types";
import {
  COLOR_ESTADO,
  type InformeCtx,
  barrasCategorias,
  cerrar,
  crearInforme,
  etiquetaPeriodo,
  graficoAltman,
  graficosEvolucion,
  lista,
  listaMarcada,
  nombreArchivoSeguro,
  parrafo,
  recuadro,
  seccion,
  subtitulo,
  tabla,
  tarjetasVeredicto,
} from "./pdfBase";

export interface DatosInformeEmpresa {
  company: Company;
  altman: AltmanResult;
  score: CentinelaScore;
  senales: Signal[];
  analisis: AnalisisEjecutivo;
  /** Mediana del mismo sector en cada mercado, ya calculada por la ficha. */
  benchmark: BenchmarkMercado[];
  /** Lineas de contexto macro del mercado de la empresa (ya formateadas). */
  contextoMacro: string[];
  /**
   * Analisis contextual generado con IA (texto libre, opcional). Si viene, el
   * informe agrega una seccion con aviso de que es orientativo. Lo produce un
   * servicio aparte: este modulo solo lo maqueta.
   */
  analisisIA?: string | null;
}

export function textoFuente(company: Company): string {
  if (company.fuente === "propia") {
    return "Balance cargado por el usuario en Centinela. Los datos no fueron verificados por Centinela.";
  }
  if (company.envivo && company.actualizado) {
    const hora = new Date(company.actualizado).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }).trim().replace(/\.+$/, "");
    return `Yahoo Finance, consultado en vivo el ${fmtFecha(company.actualizado)} a las ${hora}.`;
  }
  return "Datos de respaldo (captura anterior de Yahoo Finance): no se pudo consultar la fuente en vivo al generar el informe.";
}

function notaMoneda(company: Company): string | null {
  if (company.monedaReporte === "USD") return null;
  if (company.tipoCambioUsd) {
    return `Moneda de reporte: ${company.monedaReporte}. Los importes se expresan en US$ al tipo de cambio de la fecha del informe (${fmtNum(company.tipoCambioUsd)} ${company.monedaReporte} por USD) para que sean comparables entre mercados. Los ratios no dependen de la moneda.`;
  }
  return `Moneda de reporte: ${company.monedaReporte}. No hay cotización disponible para convertir a US$: los importes se muestran en ${company.monedaReporte}.`;
}

/** true si los importes del informe se expresan en US$ (nativos o convertidos). */
function enDolares(company: Company): boolean {
  return company.monedaReporte === "USD" || (company.tipoCambioUsd !== null && company.tipoCambioUsd > 0);
}

function etiquetaMoneda(company: Company): string {
  if (company.monedaReporte === "USD") return "US$";
  return enDolares(company) ? `${company.monedaReporte} (importes en US$)` : `${company.monedaReporte} (sin conversión)`;
}

const ORDEN_ESTADO: Record<Estado, number> = { sin_datos: 0, normal: 1, atencion: 2, alerta: 3 };

function peorEstado(estados: Estado[]): Estado {
  return estados.reduce<Estado>((peor, e) => (ORDEN_ESTADO[e] > ORDEN_ESTADO[peor] ? e : peor), "sin_datos");
}

const ZONA_ALTMAN: Record<Estado, string> = {
  normal: "Zona segura",
  atencion: "Zona gris",
  alerta: "Zona de distress",
  sin_datos: "Sin datos",
};

function pctConSigno(v: number): string {
  return `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;
}

/** 3 a 5 hallazgos clave, armados solo con los diagnosticos ya calculados. */
function construirHallazgos(d: DatosInformeEmpresa): string[] {
  const { company, altman, score, senales, analisis } = d;
  const hallazgos: string[] = [];

  // 1. Score y categorias extremas.
  if (score.total !== null) {
    const cats: Array<{ nombre: string; valor: number }> = [];
    for (const c of Object.values(score.categorias)) {
      if (c.valor !== null) cats.push({ nombre: c.nombre, valor: c.valor });
    }
    cats.sort((a, b) => b.valor - a.valor);
    const mejor = cats[0];
    const peor = cats[cats.length - 1];
    let texto = `Score Centinela de ${score.total}/100 (${ESTADO_LABEL[score.estado]}).`;
    if (mejor && peor && mejor !== peor) {
      texto += ` Mejor categoría: ${mejor.nombre} (${Math.round(mejor.valor)}); más débil: ${peor.nombre} (${Math.round(peor.valor)}).`;
    }
    hallazgos.push(texto);
  } else {
    hallazgos.push("No hay datos suficientes para calcular el Score Centinela de esta empresa.");
  }

  // 2. Altman.
  if (altman.zScore !== null) {
    const { distress, safe } = ALTMAN_THRESHOLDS;
    const zona =
      analisis.altman.estado === "normal"
        ? `zona segura (por encima de ${safe})`
        : analisis.altman.estado === "atencion"
          ? `zona gris (entre ${distress} y ${safe})`
          : `zona de distress (por debajo de ${distress})`;
    hallazgos.push(`Altman Z'' de ${fmtNum(altman.zScore)}: ${zona}.`);
  } else {
    hallazgos.push(analisis.altman.texto);
  }

  // 3. Semaforo.
  const conDatos = analisis.situacion.filter((i) => i.estado !== "sin_datos");
  if (conDatos.length > 0) {
    const verdes = conDatos.filter((i) => i.estado === "normal").length;
    const atencion = conDatos.filter((i) => i.estado === "atencion").map((i) => i.nombre);
    const riesgo = conDatos.filter((i) => i.estado === "alerta").map((i) => i.nombre);
    let texto = `${verdes} de ${conDatos.length} indicadores del semáforo están en zona saludable.`;
    if (riesgo.length > 0) texto += ` En riesgo: ${riesgo.join(", ")}.`;
    if (atencion.length > 0) texto += ` En atención: ${atencion.join(", ")}.`;
    hallazgos.push(texto);
  }

  // 4. Evolucion entre los dos ultimos ejercicios.
  const h = company.historico;
  const actual = h[h.length - 1];
  const previo = h[h.length - 2];
  if (actual && previo) {
    const partes: string[] = [];
    if (previo.centinelaScore !== null && actual.centinelaScore !== null) {
      partes.push(`Score de ${previo.centinelaScore} a ${actual.centinelaScore}`);
    }
    if (previo.revenue !== null && actual.revenue !== null && previo.revenue > 0) {
      partes.push(`ingresos ${pctConSigno(actual.revenue / previo.revenue - 1)}`);
    }
    if (previo.roe !== null && actual.roe !== null) {
      partes.push(`ROE de ${fmtPct(previo.roe)} a ${fmtPct(actual.roe)}`);
    }
    if (partes.length > 0) {
      hallazgos.push(`Evolución ${etiquetaPeriodo(previo.periodo)} - ${etiquetaPeriodo(actual.periodo)}: ${partes.join("; ")}.`);
    }
  }

  // 5. Señales.
  if (senales.length > 0) {
    const pos = senales.filter((s) => s.tipo === "positiva").length;
    const adv = senales.filter((s) => s.tipo === "advertencia").length;
    const neg = senales.filter((s) => s.tipo === "negativa").length;
    hallazgos.push(`Señales Centinela del último período: ${pos} positivas, ${adv} de advertencia y ${neg} negativas.`);
  }

  return hallazgos.slice(0, 5);
}

function lecturaGeneral(d: DatosInformeEmpresa): string {
  const { company, score, analisis } = d;
  if (score.total === null) return analisis.resumen;
  if (score.estado === "normal") {
    return `${company.nombre} se ubica en la zona saludable según los parámetros de Centinela. Los puntos siguientes resumen lo más relevante; el detalle está en las secciones posteriores.`;
  }
  if (score.estado === "atencion") {
    return `${company.nombre} se ubica en la zona de atención: no hay señales críticas generalizadas, pero existen aspectos que requieren seguimiento. Los puntos siguientes resumen lo más relevante.`;
  }
  return `${company.nombre} se ubica en la zona de riesgo según los parámetros de Centinela. Conviene profundizar el análisis de los puntos que se detallan a continuación.`;
}

interface BloqueIA {
  tipo: "titulo" | "parrafo" | "item";
  texto: string;
}

/** Convierte el texto libre de la IA (puede traer markdown) en bloques simples. */
function bloquesIA(texto: string): BloqueIA[] {
  const bloques: BloqueIA[] = [];
  let actual: string[] = [];
  const cerrarParrafo = () => {
    if (actual.length > 0) bloques.push({ tipo: "parrafo", texto: actual.join(" ") });
    actual = [];
  };
  for (const crudo of texto.replace(/\r/g, "").split("\n")) {
    const esTitulo = /^\s*#{1,6}\s+/.test(crudo);
    const linea = crudo
      .replace(/\*\*|__|`/g, "")
      .replace(/^\s*#{1,6}\s*/, "")
      .trim();
    if (linea === "") {
      cerrarParrafo();
      continue;
    }
    if (esTitulo) {
      cerrarParrafo();
      bloques.push({ tipo: "titulo", texto: linea });
      continue;
    }
    const item = /^(?:[-*•]|\d{1,2}[.)])\s+(.*)$/.exec(linea);
    if (item) {
      cerrarParrafo();
      bloques.push({ tipo: "item", texto: item[1] ?? "" });
      continue;
    }
    actual.push(linea);
  }
  cerrarParrafo();
  return bloques;
}

function seccionIA(ctx: InformeCtx, texto: string): void {
  seccion(ctx, "Análisis contextual (generado con IA)");
  recuadro(ctx, {
    titulo: "Contenido generado automáticamente",
    color: COLOR_ESTADO.atencion,
    texto:
      "Este análisis fue redactado por un modelo de inteligencia artificial a partir de los datos de este informe. Es orientativo, puede contener imprecisiones u omisiones y no reemplaza el análisis de un profesional ni constituye una recomendación. Verifique los datos relevantes antes de tomar decisiones.",
    tamano: 8.2,
  });
  const bloques = bloquesIA(texto);
  let items: string[] = [];
  const volcarItems = () => {
    if (items.length > 0) lista(ctx, items);
    items = [];
  };
  for (const b of bloques) {
    if (b.tipo === "item") {
      items.push(b.texto);
      continue;
    }
    volcarItems();
    if (b.tipo === "titulo") subtitulo(ctx, b.texto, 20);
    else parrafo(ctx, b.texto, { justificar: true, despues: 3 });
  }
  volcarItems();
}

export async function descargarInformeEmpresa(d: DatosInformeEmpresa): Promise<void> {
  const { company, altman, score, senales, analisis, benchmark, contextoMacro } = d;
  const m = company.metrics;
  const mon = (v: number | null) => fmtMonto(v, company);
  const esPropia = company.fuente === "propia";
  const cifra = (v: number | null): number | null => (enDolares(company) ? aUsd(v, company) : v);

  const ubicacion =
    company.pais && company.pais !== nombreMercado(company.mercado)
      ? `${nombreMercado(company.mercado)} (${company.pais})`
      : nombreMercado(company.mercado);

  const ctx = await crearInforme({
    tipo: "Informe de diagnóstico financiero",
    titulo: company.nombre,
    subtitulo: `${nombreSector(company.sector)} - ${ubicacion}`,
    meta: [
      ["Emisión", new Date().toLocaleDateString("es-AR")],
      ["Balance al", fmtFecha(m.periodo)],
      ["Cifras en", etiquetaMoneda(company)],
      ["Tipo", esPropia ? "Balance propio" : `Cotizada - ${company.ticker}`],
    ],
    fuente: textoFuente(company),
    nombreDocumento: `Informe de diagnóstico financiero - ${company.nombre}`,
  });

  /* ---------------- Veredicto ---------------- */
  const conDatos = analisis.situacion.filter((i) => i.estado !== "sin_datos");
  const verdes = conDatos.filter((i) => i.estado === "normal").length;
  const enAtencion = conDatos.filter((i) => i.estado === "atencion").length;
  const enRiesgo = conDatos.filter((i) => i.estado === "alerta").length;

  tarjetasVeredicto(ctx, [
    {
      titulo: "Score Centinela",
      valor: score.total !== null ? fmtScore(score.total) : (!esEntidadFinanciera(company) ? "N/D" : "N/A"),
      unidad: score.total !== null ? "/ 100" : undefined,
      estado: score.estado,
      etiquetaEstado: ESTADO_LABEL[score.estado],
      detalle: "Calificación global",
    },
    {
      titulo: "Altman Z''",
      valor: altman.zScore !== null ? fmtNum(altman.zScore) : (!esEntidadFinanciera(company) ? "N/D" : "N/A"),
      estado: analisis.altman.estado,
      etiquetaEstado: ESTADO_LABEL[analisis.altman.estado],
      detalle: ZONA_ALTMAN[analisis.altman.estado],
    },
    {
      titulo: "Indicadores saludables",
      valor: conDatos.length > 0 ? String(verdes) : "N/D",
      unidad: conDatos.length > 0 ? `/ ${conDatos.length}` : undefined,
      estado: conDatos.length > 0 ? peorEstado(conDatos.map((i) => i.estado)) : "sin_datos",
      etiquetaEstado: conDatos.length > 0 ? `${enAtencion} atención - ${enRiesgo} riesgo` : "Sin información",
    },
  ]);

  /* ---------------- 1. Resumen ejecutivo ---------------- */
  seccion(ctx, "Resumen ejecutivo");
  parrafo(ctx, lecturaGeneral(d), { justificar: true });
  lista(ctx, construirHallazgos(d));

  /* ---------------- 2. Score y Altman ---------------- */
  seccion(ctx, "Score Centinela y modelo Altman Z''");
  if (altman.zScore !== null) {
    subtitulo(ctx, "Altman Z'' - posición en la escala", 40);
    graficoAltman(ctx, altman.zScore);
  }
  parrafo(ctx, analisis.altman.texto, { suave: true, tamano: 8.8 });

  if (altman.zScore !== null) {
    subtitulo(ctx, "Componentes del modelo", 40);
    const coef = { x1: 6.56, x2: 3.26, x3: 6.72, x4: 1.05 };
    const aporte = (c: number, x: number | null) => (x === null ? "N/D" : fmtNum(c * x));
    tabla(
      ctx,
      ["Variable", "Definición", "Valor", "Coef.", "Aporte"],
      [
        ["X1", "Capital de trabajo / Activo total", fmtNum(altman.x1, 4), fmtNum(coef.x1), aporte(coef.x1, altman.x1)],
        ["X2", "Ganancias retenidas / Activo total", fmtNum(altman.x2, 4), fmtNum(coef.x2), aporte(coef.x2, altman.x2)],
        ["X3", "EBIT / Activo total", fmtNum(altman.x3, 4), fmtNum(coef.x3), aporte(coef.x3, altman.x3)],
        ["X4", "Valor de mercado del patrimonio / Pasivo total", fmtNum(altman.x4, 4), fmtNum(coef.x4), aporte(coef.x4, altman.x4)],
        ["Z''", "Suma de aportes", "", "", fmtNum(altman.zScore)],
      ],
      { anchos: [9, 55, 13, 11, 12], derecha: [2, 3, 4], resaltar: [4] }
    );
  }

  if (score.total !== null) {
    subtitulo(ctx, "Score por categoría", 50);
    barrasCategorias(
      ctx,
      Object.values(score.categorias).map((c) => ({ nombre: c.nombre, valor: c.valor, peso: c.peso }))
    );
    parrafo(
      ctx,
      `Las líneas verticales marcan los umbrales de clasificación: Atención desde ${SCORE_ESTADO_THRESHOLDS.atencion} puntos y Saludable desde ${SCORE_ESTADO_THRESHOLDS.normal}.`,
      { suave: true, tamano: 8 }
    );
  }

  /* ---------------- 3. Semaforo ---------------- */
  seccion(ctx, "Estado financiero por indicador (semáforo)");
  tabla(
    ctx,
    ["Indicador", "Valor", "Estado", "Criterio de evaluación"],
    analisis.situacion.map((i) => [i.nombre, i.valorTexto, ESTADO_LABEL[i.estado], i.criterio.replace(/\s·\s/g, " | ")]),
    { columnaEstado: 2, anchos: [34, 18, 26, 64], derecha: [1], tamano: 8.5 }
  );
  const enSeguimiento = analisis.situacion.filter((i) => i.estado === "atencion" || i.estado === "alerta");
  if (enSeguimiento.length > 0) {
    subtitulo(ctx, "Lectura de los indicadores en seguimiento", 24);
    listaMarcada(
      ctx,
      enSeguimiento.map((i) => ({ color: COLOR_ESTADO[i.estado], titulo: `${i.nombre} (${i.valorTexto})`, texto: i.mensaje }))
    );
  }

  /* ---------------- 4. Fundamentales ---------------- */
  seccion(ctx, "Indicadores fundamentales");
  const nm = notaMoneda(company);
  parrafo(
    ctx,
    `${nm ?? "Importes en US$."} K = miles, M = millones, B = miles de millones.`,
    { suave: true, tamano: 8.2 }
  );
  tabla(
    ctx,
    ["Magnitud", "Valor", "Ratio", "Valor"],
    [
      ["Capitalización bursátil", mon(m.marketCap), "ROE", fmtPct(m.roe)],
      ["Ingresos", mon(m.revenue), "ROA", fmtPct(m.roa)],
      ["EBITDA", mon(m.ebitda), "Margen neto", fmtPct(m.margenNeto)],
      ["Resultado neto", mon(m.netIncome), "Margen EBIT", fmtPct(m.ebitMargin)],
      ["Flujo de caja libre", mon(m.freeCashFlow), "Deuda / Patrimonio", fmtX(m.debtToEquity)],
      ["Activos totales", mon(m.activosTotales), "Liquidez corriente", fmtNum(m.currentRatio)],
      ["Pasivos totales", mon(m.pasivosTotales), "Prueba ácida", fmtNum(m.quickRatio)],
      ["Patrimonio neto", mon(m.patrimonioNeto), "Precio / Ganancias (P/E)", fmtNum(m.pe)],
      ["Deuda total", mon(m.deudaTotal), "Precio / Valor libro (P/B)", fmtNum(m.pb)],
      ["Precio de la acción", m.precio !== null ? `${company.monedaPrecio ?? "USD"} ${fmtNum(m.precio)}` : "N/D", "EV / EBITDA", fmtNum(m.evEbitda)],
    ],
    { anchos: [34, 28, 40, 24], derecha: [1, 3] }
  );

  /* ---------------- 5. Evolucion ---------------- */
  if (company.historico.length > 1) {
    seccion(ctx, "Evolución por ejercicio");
    const unidad = enDolares(company) ? "US$" : company.monedaReporte;
    graficosEvolucion(ctx, [
      {
        titulo: "Score Centinela",
        puntos: company.historico.map((h) => ({ etiqueta: etiquetaPeriodo(h.periodo), valor: h.centinelaScore })),
        formato: (v) => String(Math.round(v)),
      },
      {
        titulo: "ROE",
        puntos: company.historico.map((h) => ({ etiqueta: etiquetaPeriodo(h.periodo), valor: h.roe })),
        formato: (v) => `${(v * 100).toFixed(1)}%`,
      },
      {
        titulo: `Resultado neto (${unidad})`,
        puntos: company.historico.map((h) => ({ etiqueta: etiquetaPeriodo(h.periodo), valor: cifra(h.netIncome) })),
        formato: (v) => abreviar(v),
      },
    ]);
    tabla(
      ctx,
      ["Ejercicio", "Ingresos", "Resultado neto", "ROE", "ROA", "D/E", "Altman", "Score"],
      company.historico.map((h) => [
        fmtFecha(h.periodo),
        mon(h.revenue),
        mon(h.netIncome),
        fmtPct(h.roe),
        fmtPct(h.roa),
        fmtX(h.debtToEquity),
        fmtNum(h.altmanZ),
        h.centinelaScore !== null ? String(h.centinelaScore) : "N/D",
      ]),
      { anchos: [20, 24, 26, 14, 14, 14, 15, 13], derecha: [1, 2, 3, 4, 5, 6, 7], tamano: 8.3 }
    );
    parrafo(
      ctx,
      `Importes en ${enDolares(company) ? "US$ al tipo de cambio de la fecha del informe" : company.monedaReporte}, para todos los ejercicios.${
        company.monedaReporte === "ARS" ? " Las cifras en pesos son nominales, sin ajuste por inflación." : ""
      }`,
      { suave: true, tamano: 8 }
    );
  }

  /* ---------------- 6. Señales ---------------- */
  seccion(ctx, "Señales Centinela");
  if (senales.length === 0) {
    parrafo(ctx, "No se detectaron señales para el último período disponible.", { suave: true });
  } else {
    listaMarcada(
      ctx,
      senales.map((s) => ({
        color: s.tipo === "positiva" ? COLOR_ESTADO.normal : s.tipo === "advertencia" ? COLOR_ESTADO.atencion : COLOR_ESTADO.alerta,
        titulo: s.titulo,
        texto: s.descripcion,
      }))
    );
  }

  /* ---------------- 7. Comparacion sectorial ---------------- */
  if (benchmark.length > 0) {
    seccion(ctx, `Comparación con el sector (${nombreSector(company.sector)})`);
    parrafo(
      ctx,
      "Mediana de cada indicador entre las empresas del mismo sector que cotizan en cada mercado, contra esta empresa. Con pocas empresas por grupo la mediana es una referencia, no un promedio sectorial oficial.",
      { suave: true, tamano: 8.2 }
    );
    tabla(
      ctx,
      ["Grupo", "Empresas", "ROE", "Margen neto", "D/E", "Liquidez", "Score"],
      [
        [
          `Esta empresa (${nombreMercado(company.mercado)})`,
          "1",
          fmtPct(m.roe),
          fmtPct(m.margenNeto),
          fmtX(m.debtToEquity),
          fmtNum(m.currentRatio),
          score.total !== null ? String(score.total) : "N/D",
        ],
        ...benchmark.map((b) => [
          `Sector en ${nombreMercado(b.mercado)}`,
          String(b.grupo.cantidadEmpresas),
          fmtPct(b.grupo.roe),
          fmtPct(b.grupo.margenNeto),
          fmtX(b.grupo.debtToEquity),
          fmtNum(b.grupo.currentRatio),
          b.grupo.score !== null ? String(Math.round(b.grupo.score)) : "N/D",
        ]),
      ],
      { anchos: [50, 18, 16, 22, 16, 18, 14], derecha: [1, 2, 3, 4, 5, 6], tamano: 8.5, resaltar: [0] }
    );
  }

  /* ---------------- 8. Macro ---------------- */
  seccion(ctx, `Contexto macroeconómico (${nombreMercado(company.mercado)})`);
  if (contextoMacro.length === 0) {
    parrafo(ctx, "No se pudo obtener el contexto macroeconómico en vivo al momento del informe.", { suave: true });
  } else {
    lista(ctx, contextoMacro, { tamano: 9 });
  }

  /* ---------------- 9. IA (opcional) ---------------- */
  if (d.analisisIA && d.analisisIA.trim() !== "") {
    seccionIA(ctx, d.analisisIA);
  }

  /* ---------------- 10. Aspectos para revisar ---------------- */
  seccion(ctx, "Aspectos para revisar");
  lista(ctx, analisis.aspectosParaRevisar, { numerada: true });

  /* ---------------- 11. Metodología, fuentes y limitaciones ---------------- */
  seccion(ctx, "Metodología, fuentes y limitaciones");
  const metodologia: string[] = [
    `Fuente de los datos: ${textoFuente(company)}`,
    `Score Centinela (0-100): promedio ponderado de cinco categorías (${Object.values(score.categorias)
      .map((c) => `${c.nombre.toLowerCase()} ${Math.round(c.peso * 100)}%`)
      .join(", ")}). Se clasifica como Saludable desde ${SCORE_ESTADO_THRESHOLDS.normal} puntos, Atención desde ${SCORE_ESTADO_THRESHOLDS.atencion} y Riesgo por debajo.`,
    `Altman Z'' (Altman, 1995; empresas no manufactureras y mercados emergentes): Z'' = 6.56 X1 + 3.26 X2 + 6.72 X3 + 1.05 X4. Zona segura por encima de ${ALTMAN_THRESHOLDS.safe}, zona gris entre ${ALTMAN_THRESHOLDS.distress} y ${ALTMAN_THRESHOLDS.safe}, distress por debajo de ${ALTMAN_THRESHOLDS.distress}. No se calcula para bancos y entidades financieras (N/A) y se informa como N/D si faltan datos contables.`,
    "Semáforo: cada ratio se compara contra umbrales heurísticos definidos por Centinela (ver criterio en la sección 3); no son estándares regulatorios.",
    nm ? nm : "Los importes se presentan en US$ tal como los reporta la fuente.",
  ];
  if (benchmark.length > 0) {
    metodologia.push("Comparación sectorial: medianas calculadas sobre el universo de empresas disponible en Centinela, agrupadas por sector y mercado.");
  }
  if (contextoMacro.length > 0) {
    metodologia.push("Contexto macroeconómico: fuentes públicas citadas en cada línea, consultadas al generar el informe.");
  }
  lista(ctx, metodologia, { suave: true, tamano: 8.6 });

  recuadro(ctx, {
    color: COLOR_ESTADO.sin_datos,
    items: [...(company.notas ?? []), analisis.nota],
    tamano: 8.6,
  });

  cerrar(ctx, `centinela_informe_${nombreArchivoSeguro(company.nombre)}.pdf`);
}
