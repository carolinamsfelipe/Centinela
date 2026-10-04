import type { AltmanResult, Company, Estado } from "@/types";
import { esEntidadFinanciera } from "./analysis";
import { diagnosticarAltman } from "./altman";
import { construirSemaforo } from "./semaforo";
import type { ItemSemaforo } from "./semaforo";
import { fmtNum } from "@/lib/format";

/**
 * Analisis ejecutivo. Igual que el prototipo original, el texto se arma
 * EXCLUSIVAMENTE con los diagnosticos ya calculados (ratios + umbrales):
 * nunca infiere causas que los datos no permiten demostrar, solo describe
 * el estado de cada indicador y deriva preguntas de revision (due diligence)
 * de los indicadores en alerta o atencion. No usa un modelo de lenguaje: el
 * resultado es reproducible y auditable.
 */

export interface AnalisisEjecutivo {
  resumen: string;
  situacion: ItemSemaforo[];
  puntosDeSeguimiento: string[];
  altman: { texto: string; estado: Estado };
  macro: string[];
  aspectosParaRevisar: string[];
  nota: string;
}

const NOTA =
  "Los resultados son orientativos y dependen de la información disponible. Los umbrales utilizados son heurísticos y no reemplazan un análisis financiero completo ni constituyen una decisión crediticia ni una recomendación de inversión.";

function itemsAplicables(company: Company): ItemSemaforo[] {
  const todos = construirSemaforo(company.metrics);
  return esEntidadFinanciera(company) ? todos.filter((i) => !i.soloCorporativo) : todos;
}

/** Resumen de un parrafo (se mantiene la firma historica usada por las fichas). */
export function generarResumenEjecutivo(company: Company): string {
  const items = itemsAplicables(company);
  const señales = items.filter((d) => d.estado === "alerta" || d.estado === "atencion");

  if (items.every((i) => i.estado === "sin_datos")) {
    return `No hay datos suficientes para evaluar a ${company.nombre} con los indicadores de esta plataforma.`;
  }
  if (señales.length === 0) {
    return `${company.nombre} no muestra señales de alerta en los indicadores analizados según los parámetros utilizados por esta plataforma.`;
  }
  return `${company.nombre} presenta los siguientes puntos que requieren seguimiento: ${señales.map((s) => s.mensaje).join(" ")}`;
}

function preguntasDeRevision(company: Company, items: ItemSemaforo[], altman: AltmanResult): string[] {
  const enRiesgo = (id: ItemSemaforo["id"]) => {
    const i = items.find((x) => x.id === id);
    return i !== undefined && (i.estado === "alerta" || i.estado === "atencion");
  };
  const preguntas: string[] = [];

  if (enRiesgo("liquidez")) {
    preguntas.push("¿Qué información adicional permite evaluar la evolución de la liquidez corriente y las obligaciones de corto plazo?");
  }
  if (enRiesgo("endeudamiento")) {
    preguntas.push("¿Cuál es la composición de los pasivos y cómo se distribuyen sus próximos vencimientos?");
  }
  if (enRiesgo("capitalTrabajo")) {
    preguntas.push("¿Cómo se proyecta la evolución del capital de trabajo en los próximos períodos?");
  }
  if (enRiesgo("deudaPatrimonio")) {
    preguntas.push("¿Cómo está compuesta la estructura de deuda y patrimonio y qué evolución se proyecta para los próximos períodos?");
  }
  if (enRiesgo("roe") || enRiesgo("roa") || enRiesgo("margenNeto")) {
    preguntas.push("¿Qué factores explican el nivel de rentabilidad del último ejercicio y si se consideran transitorios o estructurales?");
  }

  if (esEntidadFinanciera(company)) {
    preguntas.push("¿Cómo evolucionan la calidad de la cartera (morosidad y cobertura con previsiones) y la solvencia regulatoria de la entidad?");
  } else if (altman.estado === "sin_datos") {
    preguntas.push(
      company.fuente === "propia"
        ? "¿Falta algún dato del balance (por ejemplo ganancias retenidas o EBIT) para completar el cálculo del modelo Altman Z''?"
        : "¿Qué información adicional sería necesaria para completar el cálculo del modelo Altman Z''?"
    );
  } else if (altman.estado === "atencion") {
    preguntas.push("¿Se realizan análisis de sensibilidad sobre los componentes del modelo Altman Z''?");
  } else if (altman.estado === "alerta") {
    preguntas.push("¿Qué plan existe para mejorar la rentabilidad operativa y la estructura de capital que determinan el resultado del modelo Altman Z''?");
  }

  if (company.fuente === "propia" && (company.notas ?? []).some((n) => n.includes("valor libro"))) {
    preguntas.push("¿Existe una valuación reciente del patrimonio (tasación, venta de participaciones) que permita reemplazar el valor libro en el componente X4 del Altman Z''?");
  }
  if (company.monedaReporte === "ARS") {
    preguntas.push("¿Se dispone de estados contables ajustados por inflación para interpretar la evolución real de los resultados?");
  }
  if (preguntas.length === 0) {
    preguntas.push("¿Existen cambios previstos en la estructura financiera que deban considerarse en próximos análisis?");
  }
  return preguntas;
}

export function generarAnalisisEjecutivo(
  company: Company,
  altman: AltmanResult,
  macroLineas: string[]
): AnalisisEjecutivo {
  const items = itemsAplicables(company);
  const puntos = items.filter((i) => i.estado === "alerta" || i.estado === "atencion").map((i) => i.mensaje);

  let textoAltman: string;
  if (esEntidadFinanciera(company)) {
    textoAltman = "El modelo Altman Z'' no se aplica a entidades financieras.";
  } else if (altman.zScore === null) {
    textoAltman = "No fue posible calcular el indicador debido a la falta de información necesaria.";
  } else {
    textoAltman = `El resultado obtenido fue ${fmtNum(altman.zScore)} (${
      diagnosticarAltman(altman.zScore) === "normal" ? "zona segura" : diagnosticarAltman(altman.zScore) === "atencion" ? "zona gris" : "zona de distress"
    }). Este valor debe interpretarse junto con el resto de los indicadores financieros.`;
  }

  return {
    resumen: generarResumenEjecutivo(company),
    situacion: items,
    puntosDeSeguimiento: puntos,
    altman: { texto: textoAltman, estado: esEntidadFinanciera(company) ? "sin_datos" : altman.estado },
    macro: macroLineas,
    aspectosParaRevisar: preguntasDeRevision(company, items, altman),
    nota: NOTA,
  };
}
