import { historicoDesdePeriodos, metricsDesdePeriodo } from "@/lib/financial/metrics";
import type { PeriodoDatos } from "@/lib/financial/metrics";
import type { Company, Mercado, Sector, TamanoEmpresa } from "@/types";

/**
 * Empresas cargadas por el usuario (tipicamente una empresa que no cotiza, el
 * caso original de Centinela: el asesor carga el balance de su cliente).
 * Viven SOLO en el navegador (localStorage): no se envian a ningun servidor.
 * Cada empresa propia entra al resto de la plataforma (ficha, comparador,
 * informes) como cualquier otra, pero identificada como "propia".
 */

const STORAGE_KEY = "centinela-mis-empresas";
export const PREFIJO_PROPIA = "MI-";

export interface PeriodoBalance extends PeriodoDatos {
  periodo: string;
  activosCorrientes: number;
  activosTotales: number;
  pasivosCorrientes: number;
  pasivosTotales: number;
  patrimonioNeto: number;
  gananciasRetenidas: number;
  deudaTotal: number;
  ebit: number;
  /** Valor de mercado del patrimonio, si se conoce. Si no, se usa el valor libro. */
  valorMercado?: number | null;
  cuentasPorCobrar?: number | null;
  inventarios?: number | null;
  cuentasPorPagar?: number | null;
  costoVentas?: number | null;
  gastosIntereses?: number | null;
  deudaUsdPct?: number | null;
}

export interface DatosEmpresaPropia {
  nombre: string;
  mercado: Mercado;
  sector: Sector;
  pais: string;
  moneda: string;
  periodos: PeriodoBalance[];
}

export interface EmpresaPropiaGuardada extends DatosEmpresaPropia {
  id: string;
  creada: string;
}

export function esEmpresaPropia(ticker: string): boolean {
  return ticker.startsWith(PREFIJO_PROPIA);
}

/** Tamaño máximo de archivo aceptado en la ingesta (evita congelar el hilo principal del navegador). */
export const MAX_ARCHIVO_BYTES = 5 * 1024 * 1024;

/**
 * Lanza un Error si el archivo supera el límite. Llamar ANTES de file.text() / file.arrayBuffer().
 */
export function validarTamanoArchivo(archivo: { size: number }): void {
  if (archivo.size > MAX_ARCHIVO_BYTES) {
    throw new Error(`El archivo supera el límite de seguridad de ${MAX_ARCHIVO_BYTES / (1024 * 1024)} MB.`);
  }
}

/**
 * Neutraliza CSV/Excel Formula Injection: un texto que empieza con = + - @ TAB o CR
 * se antepone con apóstrofe para que la planilla lo trate como texto. Los textos que
 * son números simples ("-1.234,5", "+3%") no se tocan para no degradar datos legítimos.
 */
export function sanitizarTextoPlanilla(valor: string): string {
  if (/^[=+\-@\t\r]/.test(valor) && !/^[-+]?[\d.,]+%?$/.test(valor.trim())) {
    return `'${valor}`;
  }
  return valor;
}

const CAMPOS_NUMERICOS_REQUERIDOS = [
  "activosCorrientes",
  "activosTotales",
  "pasivosCorrientes",
  "pasivosTotales",
  "patrimonioNeto",
  "gananciasRetenidas",
  "deudaTotal",
  "ebit",
] as const;

const esNumeroFinito = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/**
 * Depura un período leído de localStorage: si falta o está corrupto algún campo
 * requerido (NaN, Infinity, string) se descarta el período completo; en los campos
 * opcionales, un valor no numérico finito se convierte en null (sin contaminar cálculos).
 */
function depurarPeriodo(p: unknown): PeriodoBalance | null {
  if (!p || typeof p !== "object") return null;
  const o = p as Record<string, unknown>;
  if (typeof o.periodo !== "string" || o.periodo === "") return null;
  for (const campo of CAMPOS_NUMERICOS_REQUERIDOS) {
    if (!esNumeroFinito(o[campo])) return null;
  }
  const salida: Record<string, unknown> = { ...o };
  for (const [k, v] of Object.entries(o)) {
    if (k === "periodo" || (CAMPOS_NUMERICOS_REQUERIDOS as readonly string[]).includes(k)) continue;
    if (typeof v === "number" && !Number.isFinite(v)) salida[k] = null;
    else if (v !== null && v !== undefined && typeof v !== "number") salida[k] = null;
  }
  return salida as unknown as PeriodoBalance;
}

function leerTodas(): EmpresaPropiaGuardada[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const resultado: EmpresaPropiaGuardada[] = [];
    for (const e of parsed) {
      if (!e || typeof e.id !== "string" || typeof e.nombre !== "string" || !Array.isArray(e.periodos)) continue;
      const periodos = e.periodos.map(depurarPeriodo).filter((p: PeriodoBalance | null): p is PeriodoBalance => p !== null);
      if (periodos.length === 0) continue;
      resultado.push({ ...e, periodos });
    }
    return resultado;
  } catch {
    return [];
  }
}

function escribirTodas(lista: EmpresaPropiaGuardada[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
    return true;
  } catch {
    return false;
  }
}

export function listarEmpresasPropias(): EmpresaPropiaGuardada[] {
  return leerTodas();
}

export function guardarEmpresaPropia(datos: DatosEmpresaPropia): EmpresaPropiaGuardada | null {
  const id = `${PREFIJO_PROPIA}${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const periodos = [...datos.periodos].sort((a, b) => a.periodo.localeCompare(b.periodo));
  const nueva: EmpresaPropiaGuardada = { ...datos, periodos, id, creada: new Date().toISOString() };
  const ok = escribirTodas([...leerTodas(), nueva]);
  return ok ? nueva : null;
}

export function eliminarEmpresaPropia(id: string): void {
  escribirTodas(leerTodas().filter((e) => e.id !== id));
}

function tamanoDesdeActivosUsd(activosUsd: number | null): TamanoEmpresa {
  if (activosUsd === null) return "Small";
  if (activosUsd >= 2_000_000_000) return "Large";
  if (activosUsd >= 50_000_000) return "Mid";
  return "Small";
}

/**
 * Convierte la empresa guardada en una Company igual a las que cotizan, con
 * una diferencia importante y declarada: si no se informo el valor de mercado
 * del patrimonio, se usa el valor LIBRO del patrimonio neto (el ajuste que el
 * propio Altman propone para empresas privadas). Se deja constancia en las
 * notas para que ficha e informes lo aclaren y no se lo confunda con un dato
 * de mercado.
 */
export function empresaPropiaACompany(g: EmpresaPropiaGuardada, tipoCambioUsd: number | null): Company {
  const marketCapDe = (p: PeriodoBalance) => (p.valorMercado != null ? p.valorMercado : p.patrimonioNeto);
  const ultimo = g.periodos[g.periodos.length - 1];
  const metrics = metricsDesdePeriodo({ ...ultimo, marketCap: marketCapDe(ultimo) });
  const historico = historicoDesdePeriodos(g.periodos, (p) => marketCapDe(p as PeriodoBalance));

  const tc = g.moneda === "USD" ? 1 : tipoCambioUsd;
  const activosUsd = tc ? ultimo.activosTotales / tc : null;

  const notas: string[] = [];
  if (ultimo.valorMercado == null) {
    notas.push(
      "No se informó el valor de mercado del patrimonio: el componente X4 del Altman Z'' usa el valor libro del patrimonio neto como aproximación (ajuste recomendado para empresas que no cotizan)."
    );
  }
  if (ultimo.revenue == null || ultimo.netIncome == null) {
    notas.push(
      "No se cargaron ventas y/o resultado neto: ROE, ROA y margen neto quedan sin dato y el Score Centinela se calcula con las categorías disponibles."
    );
  }
  const descuadre = Math.abs(ultimo.activosTotales - (ultimo.pasivosTotales + ultimo.patrimonioNeto));
  if (ultimo.activosTotales > 0 && descuadre / ultimo.activosTotales > 0.05) {
    notas.push(
      "El balance cargado no cuadra (activo total distinto de pasivo + patrimonio neto por más de 5%): revisá los importes antes de usar el diagnóstico."
    );
  }

  return {
    ticker: g.id,
    nombre: g.nombre,
    sector: g.sector,
    mercado: g.mercado,
    tamano: tamanoDesdeActivosUsd(activosUsd),
    pais: g.pais,
    fuente: "propia",
    companyType: "user",
    metrics,
    historico,
    envivo: false,
    actualizado: null,
    monedaReporte: g.moneda,
    tipoCambioUsd: tc,
    monedaPrecio: null,
    notas,
    creada: g.creada,
  };
}

/* ------------------------------------------------------------------ */
/* Lectura de archivos CSV / Excel                                      */
/* ------------------------------------------------------------------ */

export const COLUMNAS_OBLIGATORIAS = [
  "activos_corrientes",
  "activos_totales",
  "pasivos_corrientes",
  "pasivos_totales",
  "patrimonio_neto",
  "ganancias_retenidas",
  "deuda_total",
  "ebit",
] as const;

export const COLUMNAS_OPCIONALES = [
  "periodo",
  "ventas",
  "costo_ventas",
  "cuentas_por_cobrar",
  "inventarios",
  "cuentas_por_pagar",
  "gastos_intereses",
  "deuda_usd_pct",
  "resultado_neto",
  "ebitda",
  "efectivo",
  "valor_mercado_patrimonio",
] as const;

export const PLANTILLA_CSV =
  "periodo,activos_corrientes,activos_totales,pasivos_corrientes,pasivos_totales,patrimonio_neto,ganancias_retenidas,deuda_total,ebit,ventas,costo_ventas,cuentas_por_cobrar,inventarios,cuentas_por_pagar,gastos_intereses,deuda_usd_pct,resultado_neto,valor_mercado_patrimonio\n" +
  "2024-12-31,13000000,38000000,8000000,20000000,18000000,3500000,11000000,3000000,30000000,20000000,5000000,3000000,2500000,2500000,0.25,1800000,\n" +
  "2025-12-31,15000000,42000000,9000000,22000000,20000000,4000000,12000000,3500000,34000000,22000000,6000000,3500000,2800000,2800000,0.30,2200000,\n";

const SINONIMOS: Record<string, string> = {
  activo_corriente: "activos_corrientes",
  activos_corrientes: "activos_corrientes",
  activo_total: "activos_totales",
  activos_totales: "activos_totales",
  pasivo_corriente: "pasivos_corrientes",
  pasivos_corrientes: "pasivos_corrientes",
  pasivo_total: "pasivos_totales",
  pasivos_totales: "pasivos_totales",
  patrimonio_neto: "patrimonio_neto",
  patrimonio: "patrimonio_neto",
  ganancias_retenidas: "ganancias_retenidas",
  resultados_acumulados: "ganancias_retenidas",
  deuda_total: "deuda_total",
  deuda_financiera: "deuda_total",
  ebit: "ebit",
  resultado_operativo: "ebit",
  ventas: "ventas",
  ingresos: "ventas",
  revenue: "ventas",
  costo_ventas: "costo_ventas",
  costo_de_ventas: "costo_ventas",
  costo: "costo_ventas",
  cogs: "costo_ventas",
  cuentas_por_cobrar: "cuentas_por_cobrar",
  cuentas_a_cobrar: "cuentas_por_cobrar",
  creditos_por_ventas: "cuentas_por_cobrar",
  deudores_por_ventas: "cuentas_por_cobrar",
  clientes: "cuentas_por_cobrar",
  inventarios: "inventarios",
  inventario: "inventarios",
  bienes_de_cambio: "inventarios",
  stock: "inventarios",
  cuentas_por_pagar: "cuentas_por_pagar",
  cuentas_a_pagar: "cuentas_por_pagar",
  proveedores: "cuentas_por_pagar",
  deudas_comerciales: "cuentas_por_pagar",
  gastos_intereses: "gastos_intereses",
  intereses: "gastos_intereses",
  intereses_financieros: "gastos_intereses",
  deuda_usd_pct: "deuda_usd_pct",
  porcentaje_deuda_usd: "deuda_usd_pct",
  resultado_neto: "resultado_neto",
  ganancia_neta: "resultado_neto",
  utilidad_neta: "resultado_neto",
  ebitda: "ebitda",
  efectivo: "efectivo",
  caja: "efectivo",
  valor_mercado_patrimonio: "valor_mercado_patrimonio",
  valor_de_mercado: "valor_mercado_patrimonio",
  periodo: "periodo",
  ejercicio: "periodo",
  fecha: "periodo",
};

function normalizarEncabezado(h: string): string {
  const limpio = h
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return SINONIMOS[limpio] ?? limpio;
}

/** Acepta 1234.56, 1.234.567, 1.234.567,89, 1,234,567.89 y 1234,56. Devuelve null si no es un numero. */
export function parsearNumero(valor: unknown): number | null {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : null;
  if (typeof valor !== "string") return null;
  let s = valor.trim().replace(/[\s$]|US\$|ARS|USD/gi, "");
  if (s === "" || s === "-") return null;
  let negativo = false;
  if (/^\(.*\)$/.test(s)) {
    negativo = true;
    s = s.slice(1, -1);
  }
  const tienePunto = s.includes(".");
  const tieneComa = s.includes(",");
  if (tienePunto && tieneComa) {
    s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (tieneComa) {
    s = /^-?\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, "") : s.replace(",", ".");
  } else if (tienePunto) {
    s = (s.match(/\./g) ?? []).length > 1 ? s.replace(/\./g, "") : s;
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negativo ? -n : n;
}

function partirLineaCsv(linea: string, sep: string): string[] {
  const celdas: string[] = [];
  let actual = "";
  let entreComillas = false;
  for (let i = 0; i < linea.length; i++) {
    const c = linea[i];
    if (c === '"') {
      if (entreComillas && linea[i + 1] === '"') {
        actual += '"';
        i++;
      } else {
        entreComillas = !entreComillas;
      }
    } else if (c === sep && !entreComillas) {
      celdas.push(actual);
      actual = "";
    } else {
      actual += c;
    }
  }
  celdas.push(actual);
  return celdas.map((x) => x.trim());
}

export function filasDesdeCsv(texto: string): Array<Record<string, unknown>> {
  const lineas = texto
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim() !== "");
  if (lineas.length < 2) return [];
  const sep = [";", "\t", ","].sort(
    (a, b) => (lineas[0].split(b).length - 1) - (lineas[0].split(a).length - 1)
  )[0];
  const encabezados = partirLineaCsv(lineas[0], sep).map(normalizarEncabezado);
  return lineas.slice(1).map((l) => {
    const celdas = partirLineaCsv(l, sep);
    const fila: Record<string, unknown> = {};
    encabezados.forEach((h, i) => {
      fila[h] = celdas[i] ?? "";
    });
    return fila;
  });
}

export async function filasDesdeExcel(buffer: ArrayBuffer): Promise<Array<Record<string, unknown>>> {
  const XLSX = await import("xlsx");
  const libro = XLSX.read(buffer, { type: "array" });
  const hoja = libro.Sheets[libro.SheetNames[0]];
  if (!hoja) return [];
  const filas = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, { defval: null, raw: true });
  return filas.map((fila) => {
    const normalizada: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fila)) normalizada[normalizarEncabezado(k)] = v;
    return normalizada;
  });
}

function periodoComoTexto(v: unknown, indice: number): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number" && v > 20000 && v < 80000) {
    // Fecha serial de Excel.
    return new Date(Math.round((v - 25569) * 86400 * 1000)).toISOString().slice(0, 10);
  }
  if (typeof v === "string" && v.trim() !== "") return v.trim();
  if (typeof v === "number") return String(v);
  return `Período ${indice + 1}`;
}

export interface ResultadoLectura {
  periodos: PeriodoBalance[];
  errores: string[];
  advertencias: string[];
}

export function periodosDesdeFilas(filas: Array<Record<string, unknown>>): ResultadoLectura {
  const errores: string[] = [];
  const advertencias: string[] = [];
  if (filas.length === 0) {
    return { periodos: [], errores: ["El archivo no tiene ninguna fila de datos."], advertencias };
  }

  const periodos: PeriodoBalance[] = [];
  filas.forEach((fila, i) => {
    const etiqueta = `Fila ${i + 2}`;
    const faltantes = COLUMNAS_OBLIGATORIAS.filter((c) => parsearNumero(fila[c]) === null);
    if (faltantes.length > 0) {
      errores.push(`${etiqueta}: faltan o no son números válidos: ${faltantes.join(", ")}.`);
      return;
    }
    const num = (c: string) => parsearNumero(fila[c]);
    const p: PeriodoBalance = {
      periodo: periodoComoTexto(fila["periodo"], i),
      activosCorrientes: num("activos_corrientes") as number,
      activosTotales: num("activos_totales") as number,
      pasivosCorrientes: num("pasivos_corrientes") as number,
      pasivosTotales: num("pasivos_totales") as number,
      patrimonioNeto: num("patrimonio_neto") as number,
      gananciasRetenidas: num("ganancias_retenidas") as number,
      deudaTotal: num("deuda_total") as number,
      ebit: num("ebit") as number,
      revenue: num("ventas"),
      costoVentas: num("costo_ventas"),
      cuentasPorCobrar: num("cuentas_por_cobrar"),
      inventarios: num("inventarios"),
      cuentasPorPagar: num("cuentas_por_pagar"),
      gastosIntereses: num("gastos_intereses"),
      deudaUsdPct: num("deuda_usd_pct"),
      netIncome: num("resultado_neto"),
      ebitda: num("ebitda"),
      efectivo: num("efectivo"),
      valorMercado: num("valor_mercado_patrimonio"),
    };
    if (p.activosTotales <= 0) {
      errores.push(`${etiqueta}: el activo total debe ser mayor que cero.`);
      return;
    }
    if (p.activosCorrientes > p.activosTotales) {
      advertencias.push(`${etiqueta}: el activo corriente supera al activo total.`);
    }
    periodos.push(p);
  });

  return { periodos: errores.length > 0 && periodos.length === 0 ? [] : periodos, errores, advertencias };
}
