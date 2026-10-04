import { nombreMercado, nombreSector } from "@/data/companies";
import { ESTADO_LABEL } from "@/lib/financial/diagnostics";
import type { BenchmarkMercado } from "@/lib/financial/benchmarks";
import type { AnalisisEjecutivo } from "@/lib/financial/narrative";
import { fmtFecha, fmtMonto, fmtNum, fmtPct, fmtX } from "@/lib/format";
import type { AltmanResult, CentinelaScore, Company, Signal } from "@/types";
import { cerrar, crearInforme, lista, nombreArchivoSeguro, parrafo, seccion, tabla } from "./pdfBase";

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
}

export function textoFuente(company: Company): string {
  if (company.fuente === "propia") {
    return "Balance cargado por el usuario en Centinela. Los datos no fueron verificados por Centinela.";
  }
  if (company.envivo && company.actualizado) {
    const hora = new Date(company.actualizado).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
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

export async function descargarInformeEmpresa(d: DatosInformeEmpresa): Promise<void> {
  const { company, altman, score, senales, analisis, benchmark, contextoMacro } = d;
  const m = company.metrics;
  const mon = (v: number | null) => fmtMonto(v, company);

  const ctx = await crearInforme(
    `${company.nombre} (${company.ticker.startsWith("MI-") ? "empresa propia" : company.ticker})`,
    "Informe de diagnóstico financiero",
    [
      `${nombreSector(company.sector)} - ${nombreMercado(company.mercado)} (${company.pais}) - Balance al ${fmtFecha(m.periodo)}`,
      `Generado el ${new Date().toLocaleDateString("es-AR")} - Fuente: ${textoFuente(company)}`,
    ]
  );

  seccion(ctx, "Resumen ejecutivo");
  parrafo(ctx, analisis.resumen);

  seccion(ctx, "Score Centinela y modelo Altman Z''");
  tabla(
    ctx,
    ["Medida", "Valor", "Estado"],
    [
      ["Score Centinela (0-100)", score.total !== null ? `${score.total} / 100` : "N/D", ESTADO_LABEL[score.estado]],
      ["Altman Z''", fmtNum(altman.zScore), ESTADO_LABEL[analisis.altman.estado]],
    ],
    { columnaEstado: 2, anchos: [70, 55, 55] }
  );
  parrafo(ctx, analisis.altman.texto, { suave: true, tamano: 9 });
  if (altman.zScore !== null) {
    tabla(
      ctx,
      ["Componente Altman", "Valor"],
      [
        ["X1 = Capital de trabajo / Activo total", fmtNum(altman.x1, 4)],
        ["X2 = Ganancias retenidas / Activo total", fmtNum(altman.x2, 4)],
        ["X3 = EBIT / Activo total", fmtNum(altman.x3, 4)],
        ["X4 = Valor de mercado del patrimonio / Pasivo total", fmtNum(altman.x4, 4)],
      ],
      { anchos: [130, 50] }
    );
  }
  if (score.total !== null) {
    tabla(
      ctx,
      ["Categoría del Score", "Peso", "Puntaje (0-100)"],
      Object.values(score.categorias).map((c) => [c.nombre, fmtPct(c.peso, 0), c.valor !== null ? String(Math.round(c.valor)) : "N/D"]),
      { anchos: [90, 40, 50] }
    );
  }

  seccion(ctx, "Estado financiero por indicador (semáforo)");
  tabla(
    ctx,
    ["Indicador", "Valor", "Estado", "Criterio"],
    analisis.situacion.map((i) => [i.nombre, i.valorTexto, ESTADO_LABEL[i.estado], i.criterio]),
    { columnaEstado: 2, anchos: [42, 24, 28, 86], tamano: 8.5 }
  );
  if (analisis.puntosDeSeguimiento.length > 0) {
    parrafo(ctx, "Puntos que requieren seguimiento:", { suave: true, tamano: 9 });
    lista(ctx, analisis.puntosDeSeguimiento);
  }

  seccion(ctx, "Indicadores fundamentales");
  const nm = notaMoneda(company);
  if (nm) parrafo(ctx, nm, { suave: true, tamano: 8.5 });
  tabla(
    ctx,
    ["Indicador", "Valor", "Indicador", "Valor"],
    [
      ["Market Cap", mon(m.marketCap), "ROE", fmtPct(m.roe)],
      ["Revenue", mon(m.revenue), "ROA", fmtPct(m.roa)],
      ["EBITDA", mon(m.ebitda), "Margen neto", fmtPct(m.margenNeto)],
      ["Net Income", mon(m.netIncome), "Margen EBIT", fmtPct(m.ebitMargin)],
      ["Free Cash Flow", mon(m.freeCashFlow), "Debt / Equity", fmtX(m.debtToEquity)],
      ["Activos totales", mon(m.activosTotales), "Current Ratio", fmtNum(m.currentRatio)],
      ["Pasivos totales", mon(m.pasivosTotales), "Quick Ratio", fmtNum(m.quickRatio)],
      ["Patrimonio neto", mon(m.patrimonioNeto), "P/E", fmtNum(m.pe)],
      ["Deuda total", mon(m.deudaTotal), "P/B", fmtNum(m.pb)],
      ["Precio", m.precio !== null ? `${company.monedaPrecio ?? "USD"} ${fmtNum(m.precio)}` : "N/D", "EV/EBITDA", fmtNum(m.evEbitda)],
    ],
    { anchos: [40, 50, 40, 50] }
  );

  if (company.historico.length > 1) {
    seccion(ctx, "Evolución por ejercicio");
    tabla(
      ctx,
      ["Ejercicio", "Revenue", "Net Income", "ROE", "ROA", "D/E", "Altman", "Score"],
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
      { tamano: 8 }
    );
  }

  seccion(ctx, "Señales Centinela");
  if (senales.length === 0) {
    parrafo(ctx, "No se detectaron señales para el último período disponible.", { suave: true });
  } else {
    lista(
      ctx,
      senales.map((s) => `${s.tipo === "positiva" ? "[+]" : s.tipo === "advertencia" ? "[!]" : "[-]"} ${s.titulo}: ${s.descripcion}`)
    );
  }

  if (benchmark.length > 0) {
    seccion(ctx, `Comparación con el sector ${nombreSector(company.sector)} en distintos mercados`);
    parrafo(
      ctx,
      "Mediana de cada indicador entre las empresas del mismo sector que cotizan en cada mercado, contra esta empresa. Con pocas empresas por grupo la mediana es una referencia, no un promedio sectorial oficial.",
      { suave: true, tamano: 8.5 }
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
      { anchos: [52, 20, 22, 26, 20, 20, 20], tamano: 8.5 }
    );
  }

  seccion(ctx, `Contexto macroeconómico (${nombreMercado(company.mercado)})`);
  if (contextoMacro.length === 0) {
    parrafo(ctx, "No se pudo obtener el contexto macroeconómico en vivo al momento del informe.", { suave: true });
  } else {
    lista(ctx, contextoMacro);
  }

  seccion(ctx, "Aspectos para revisar");
  lista(ctx, analisis.aspectosParaRevisar);

  seccion(ctx, "Notas y limitaciones");
  const notas = [...(company.notas ?? []), analisis.nota];
  lista(ctx, notas, { suave: true });

  cerrar(ctx, `centinela_informe_${nombreArchivoSeguro(company.nombre)}.pdf`);
}
