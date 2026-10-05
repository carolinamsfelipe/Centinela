import { nombreMercado, nombreSector } from "@/data/companies";
import { ESTADO_LABEL } from "@/lib/financial/diagnostics";
import type { BenchmarkMercado } from "@/lib/financial/benchmarks";
import type { AnalisisEjecutivo } from "@/lib/financial/narrative";
import { fmtFecha, fmtMonto, fmtNum, fmtPct, fmtX } from "@/lib/format";
import type { AltmanResult, CentinelaScore, Company } from "@/types";

/**
 * Cliente del "Analisis contextual con IA". Envia a /api/analisis SOLO
 * resultados ya calculados (nunca el balance crudo) y devuelve el texto
 * redactado. La IA no calcula nada: el servidor la instruye para redactar
 * hipotesis generales sobre las cifras recibidas. La clave del proveedor vive
 * solo en el servidor (variable de entorno de Vercel).
 */

export interface PayloadAnalisis {
  nombre: string;
  ticker?: string;
  sector: string;
  mercado: string;
  pais: string;
  tamano: string;
  propia: boolean;
  periodo: string;
  monedaReporte: string;
  monedaEtiqueta: string;
  tipoCambio: string;
  score: string;
  altman: string;
  resumen: string;
  cifras: Array<{ nombre: string; valor: string }>;
  semaforo: Array<{ nombre: string; valor: string; estado: string }>;
  puntosDeSeguimiento: string[];
  macro: string[];
  benchmarks: Array<{
    mercado: string;
    empresas: number;
    avisoMuestra?: string;
    roe: string;
    margenNeto: string;
    deudaPatrimonio: string;
    liquidez: string;
    score: string;
  }>;
  notas: string[];
}

export interface AnalisisIA {
  texto: string;
  proveedor: string;
  modelo: string;
  generado: string;
}

export type ResultadoAnalisisIA =
  | ({ ok: true } & AnalisisIA)
  | {
      ok: false;
      /** La IA no esta activada en este despliegue (o no hay backend): usar el texto deterministico de respaldo. */
      sinConfigurar: boolean;
      /** Se alcanzo el limite de uso por hora. */
      limite: boolean;
      mensaje: string;
    };

interface EntradaPayload {
  company: Company;
  altman: AltmanResult;
  score: CentinelaScore;
  analisis: AnalisisEjecutivo;
  benchmark: BenchmarkMercado[] | null;
  lineasMacro: string[];
}

function obtenerEtiquetaMoneda(moneda: string): string {
  switch (moneda) {
    case "ARS":
      return "ARS / pesos argentinos (cifras contables en pesos, nominales sin ajuste por inflación)";
    case "USD":
      return "USD / dólares estadounidenses";
    case "BRL":
      return "BRL / reales brasileños";
    case "CLP":
      return "CLP / pesos chilenos";
    case "MXN":
      return "MXN / pesos mexicanos";
    case "EUR":
      return "EUR / euros";
    default:
      return `${moneda} / moneda local`;
  }
}

/** Arma el payload con lo que la plataforma ya calculo y mostro en pantalla. */
export function construirPayloadAnalisis({ company, altman, score, analisis, benchmark, lineasMacro }: EntradaPayload): PayloadAnalisis {
  const m = company.metrics;
  const mon = (v: number | null) => fmtMonto(v, company);

  const cifras: Array<{ nombre: string; valor: string }> = [
    { nombre: "Capitalización de mercado", valor: mon(m.marketCap) },
    { nombre: "Ingresos", valor: mon(m.revenue) },
    { nombre: "EBITDA", valor: mon(m.ebitda) },
    { nombre: "Resultado neto", valor: mon(m.netIncome) },
    { nombre: "Flujo de caja libre", valor: mon(m.freeCashFlow) },
    { nombre: "Activo total", valor: mon(m.activosTotales) },
    { nombre: "Pasivo total", valor: mon(m.pasivosTotales) },
    { nombre: "Patrimonio neto", valor: mon(m.patrimonioNeto) },
    { nombre: "Deuda total", valor: mon(m.deudaTotal) },
    { nombre: "ROE", valor: fmtPct(m.roe) },
    { nombre: "ROA", valor: fmtPct(m.roa) },
    { nombre: "Margen neto", valor: fmtPct(m.margenNeto) },
    { nombre: "Margen EBIT", valor: fmtPct(m.ebitMargin) },
    { nombre: "Deuda/Patrimonio", valor: fmtX(m.debtToEquity) },
    { nombre: "Liquidez corriente", valor: fmtNum(m.currentRatio) },
    { nombre: "Prueba ácida", valor: fmtNum(m.quickRatio) },
    { nombre: "P/E", valor: fmtNum(m.pe) },
    { nombre: "P/B", valor: fmtNum(m.pb) },
    { nombre: "EV/EBITDA", valor: fmtNum(m.evEbitda) },
  ].filter((c) => c.valor !== "N/D");

  let tipoCambio: string;
  if (company.monedaReporte === "USD") {
    tipoCambio = "La empresa reporta en USD: no requiere conversión contable.";
  } else if (company.tipoCambioUsd !== null && company.tipoCambioUsd > 0) {
    tipoCambio = `${fmtNum(company.tipoCambioUsd)} ${company.monedaReporte} por 1 USD (tipo de cambio de referencia usado para expresar los importes en US$).`;
  } else {
    tipoCambio = `Sin cotización disponible para convertir ${company.monedaReporte} a USD: los importes figuran exclusivamente en ${company.monedaReporte}.`;
  }

  return {
    nombre: company.nombre,
    ticker: company.ticker,
    sector: nombreSector(company.sector),
    mercado: nombreMercado(company.mercado),
    pais: company.pais,
    tamano: company.tamano,
    propia: company.fuente === "propia",
    periodo: fmtFecha(m.periodo),
    monedaReporte: company.monedaReporte,
    monedaEtiqueta: obtenerEtiquetaMoneda(company.monedaReporte),
    tipoCambio,
    score: score.total !== null ? `${score.total}/100 (${ESTADO_LABEL[score.estado]})` : "N/D",
    altman: `${analisis.altman.texto} Estado: ${ESTADO_LABEL[analisis.altman.estado]}.`,
    resumen: analisis.resumen,
    cifras,
    semaforo: analisis.situacion.map((s) => ({ nombre: s.nombre, valor: s.valorTexto, estado: ESTADO_LABEL[s.estado] })),
    puntosDeSeguimiento: analisis.puntosDeSeguimiento,
    macro: lineasMacro,
    benchmarks: (benchmark ?? []).map((b) => {
      const n = b.grupo.cantidadEmpresas;
      return {
        mercado: nombreMercado(b.mercado),
        empresas: n,
        avisoMuestra:
          n < 2
            ? "Muestra insuficiente (1 sola empresa): NO constituye promedio sectorial."
            : `Muestra de n = ${n} empresas del mercado`,
        roe: fmtPct(b.grupo.roe),
        margenNeto: fmtPct(b.grupo.margenNeto),
        deudaPatrimonio: fmtX(b.grupo.debtToEquity),
        liquidez: fmtNum(b.grupo.currentRatio),
        score: b.grupo.score !== null ? String(Math.round(b.grupo.score)) : "N/D",
      };
    }),
    notas: company.notas ?? [],
  };
}

// ----------------------------------------------------------- Cache de sesion

const cacheMemoria = new Map<string, AnalisisIA>();
const PREFIJO_STORAGE = "centinela.analisisIA.v1:";

/** Clave determinista del payload (sirve para no repetir llamadas con los mismos datos). */
function claveDe(payload: PayloadAnalisis): string {
  const s = JSON.stringify(payload);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return `${payload.nombre}|${payload.monedaReporte}|${s.length}|${(h >>> 0).toString(36)}`;
}

function leerSesion(clave: string): AnalisisIA | null {
  const enMemoria = cacheMemoria.get(clave);
  if (enMemoria) return enMemoria;
  try {
    const crudo = window.sessionStorage.getItem(PREFIJO_STORAGE + clave);
    if (!crudo) return null;
    const v = JSON.parse(crudo) as Partial<AnalisisIA>;
    if (typeof v.texto === "string" && typeof v.proveedor === "string" && typeof v.modelo === "string" && typeof v.generado === "string") {
      const ok: AnalisisIA = { texto: v.texto, proveedor: v.proveedor, modelo: v.modelo, generado: v.generado };
      cacheMemoria.set(clave, ok);
      return ok;
    }
  } catch {
    /* sessionStorage no disponible: se sigue sin cache persistente */
  }
  return null;
}

function guardarSesion(clave: string, valor: AnalisisIA) {
  cacheMemoria.set(clave, valor);
  try {
    window.sessionStorage.setItem(PREFIJO_STORAGE + clave, JSON.stringify(valor));
  } catch {
    /* cuota o modo privado: alcanza con la memoria */
  }
}

// ------------------------------------------------------------------ Llamada

const TIMEOUT_CLIENTE_MS = 30_000;

/** Pide el analisis a /api/analisis. Nunca lanza: los errores vuelven en `ok: false`. */
export async function generarAnalisisIA(payload: PayloadAnalisis, opciones: { forzar?: boolean } = {}): Promise<ResultadoAnalisisIA> {
  const clave = claveDe(payload);
  if (!opciones.forzar) {
    const previo = leerSesion(clave);
    if (previo) return { ok: true, ...previo };
  }

  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), TIMEOUT_CLIENTE_MS);
  try {
    const resp = await fetch("/api/analisis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });

    let data: Record<string, unknown> | null = null;
    try {
      data = (await resp.json()) as Record<string, unknown>;
    } catch {
      data = null;
    }

    if (resp.ok && data && typeof data.texto === "string" && data.texto.trim() !== "") {
      const ok: AnalisisIA = {
        texto: data.texto,
        proveedor: typeof data.proveedor === "string" ? data.proveedor : "IA",
        modelo: typeof data.modelo === "string" ? data.modelo : "",
        generado: typeof data.generado === "string" ? data.generado : new Date().toISOString(),
      };
      guardarSesion(clave, ok);
      return { ok: true, ...ok };
    }

    const mensajeServidor = data && typeof data.error === "string" ? data.error : "";
    // 404 / respuesta sin JSON: no hay backend (por ejemplo `npm run dev` sin funciones serverless).
    const sinBackend = resp.status === 404 || data === null;
    const sinConfigurar = sinBackend || (data !== null && data.sinConfigurar === true);
    return {
      ok: false,
      sinConfigurar,
      limite: resp.status === 429,
      mensaje: sinConfigurar
        ? "El análisis con IA no está activado en este despliegue."
        : mensajeServidor || "No se pudo generar el análisis en este momento. Probá de nuevo en un rato.",
    };
  } catch (e) {
    const abortado = e instanceof DOMException && e.name === "AbortError";
    return {
      ok: false,
      sinConfigurar: false,
      limite: false,
      mensaje: abortado
        ? "El análisis tardó demasiado en responder. Probá de nuevo en un rato."
        : "No se pudo conectar con el servicio de análisis. Revisá tu conexión y probá de nuevo.",
    };
  } finally {
    window.clearTimeout(timer);
  }
}
