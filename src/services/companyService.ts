import { COMPANIES, EMPRESA_DEMO_PEDRO, nombreMercado, nombreSector } from "@/data/companies";
import { NOTA_ENTIDAD_FINANCIERA, analizarEmpresa, esEntidadFinanciera } from "@/lib/financial/analysis";
import { historicoDesdePeriodos, metricsDesdePeriodo } from "@/lib/financial/metrics";
import type { PeriodoDatos } from "@/lib/financial/metrics";
import { generarSenales } from "@/lib/financial/signals";
import { getTipoCambioUsd } from "@/services/fxService";
import {
  empresaPropiaACompany,
  esEmpresaPropia,
  listarEmpresasPropias,
} from "@/services/userCompanies";
import type { Company } from "@/types";

/**
 * Capa de acceso a datos de empresas. Todas las empresas del universo
 * cotizan: sus balances, resultados, capitalizacion y precio se traen en
 * vivo de Yahoo Finance via /api/companies (funcion serverless, evita CORS)
 * en lotes. Si la consulta falla, se cae al respaldo guardado (las 5
 * empresas del prototipo original lo tienen; el resto queda con "sin dato")
 * y la interfaz lo avisa con el campo `envivo`. Las empresas propias (balance
 * cargado por el usuario) salen del navegador, nunca de la red.
 *
 * La UI nunca llama a la API ni a COMPANIES directamente, siempre pasa por
 * estas funciones -- asi se puede ajustar la estrategia de cache o la
 * fuente sin tocar componentes.
 */

const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_TTL_FALLO_MS = 60 * 1000;
const TAMANO_LOTE = 6;

/** Dato que Yahoo no informaba y la API completo con otra fuente (ver api/_complemento.ts). */
interface ComplementoApi {
  campo: string;
  fuente: string;
  periodo: string;
}

const ETIQUETA_CAMPO: Record<string, string> = {
  gananciasRetenidas: "Ganancias retenidas",
  activosCorrientes: "Activos corrientes",
  pasivosCorrientes: "Pasivos corrientes",
  pasivosTotales: "Pasivos totales",
};

interface EmpresaApi {
  ticker: string;
  actualizado: string;
  monedaReporte: string | null;
  tipoCambioUsd: number | null;
  ultimo: PeriodoDatos & { monedaPrecio?: string | null };
  historico: PeriodoDatos[];
  complementos?: ComplementoApi[];
}

const BASE = new Map(COMPANIES.map((c) => [c.ticker, c]));
const cache = new Map<string, { empresa: Company; obtenido: number }>();
const enCurso = new Map<string, Promise<void>>();

function notasDe(company: Company, complementos: ComplementoApi[] = []): string[] {
  const notas: string[] = [];
  if (esEntidadFinanciera(company)) notas.push(NOTA_ENTIDAD_FINANCIERA);
  // Las entidades financieras no usan el Altman: no se anotan complementos sobre ellas.
  if (!esEntidadFinanciera(company)) {
    for (const c of complementos) {
      const dato = ETIQUETA_CAMPO[c.campo] ?? c.campo;
      notas.push(
        `${dato} completado con ${c.fuente} (ejercicio ${c.periodo}) porque Yahoo Finance no lo informa. Se usó solo con la misma moneda de reporte y el mismo cierre de ejercicio, y el total de activos coincide con el de Yahoo.`
      );
    }
  }
  if (company.envivo && company.metrics.marketCap === null && !esEntidadFinanciera(company)) {
    notas.push(
      "Yahoo Finance no informa la capitalización de mercado de este ticker en este momento: el Altman Z'' y los múltiplos de valuación (P/B, EV/EBITDA) no pueden calcularse. Se prefiere mostrarlos sin dato antes que estimarlos."
    );
  }
  if (company.monedaReporte === "ARS") {
    notas.push(
      "Cifras reportadas en pesos (moneda de alta inflación): las variaciones nominales entre ejercicios no están ajustadas por inflación y no son comparables en términos reales. Los ratios sí son comparables."
    );
  }
  return notas;
}

function combinar(base: Company, api: EmpresaApi): Company {
  const monedaReporte = api.monedaReporte ?? base.monedaReporte;
  const metrics = metricsDesdePeriodo(api.ultimo);
  const historico = historicoDesdePeriodos(api.historico ?? []);
  const empresa: Company = {
    ...base,
    metrics,
    historico: historico.length > 0 ? historico : base.historico,
    envivo: true,
    actualizado: api.actualizado ?? new Date().toISOString(),
    monedaReporte,
    tipoCambioUsd: api.tipoCambioUsd,
    monedaPrecio: api.ultimo.monedaPrecio ?? "USD",
  };
  return { ...empresa, notas: notasDe(empresa, api.complementos ?? []) };
}

function respaldo(base: Company): Company {
  const empresa: Company = { ...base, envivo: false, actualizado: null };
  return { ...empresa, notas: notasDe(empresa) };
}

async function pedirLote(tickers: string[]): Promise<Record<string, EmpresaApi | null> | null> {
  try {
    const resp = await fetch(`/api/companies?tickers=${encodeURIComponent(tickers.join(","))}`);
    if (!resp.ok) return null;
    const data = await resp.json();
    return (data?.empresas as Record<string, EmpresaApi | null>) ?? null;
  } catch {
    return null;
  }
}

function cargarLote(tickers: string[]): Promise<void> {
  const promesa = (async () => {
    const respuestas = await pedirLote(tickers);
    for (const ticker of tickers) {
      const base = BASE.get(ticker);
      if (!base) continue;
      const api = respuestas?.[ticker] ?? null;
      cache.set(ticker, { empresa: api ? combinar(base, api) : respaldo(base), obtenido: Date.now() });
    }
  })().finally(() => {
    for (const t of tickers) enCurso.delete(t);
  });
  for (const t of tickers) enCurso.set(t, promesa);
  return promesa;
}

function vigente(ticker: string): boolean {
  const c = cache.get(ticker);
  if (!c) return false;
  const ttl = c.empresa.envivo ? CACHE_TTL_MS : CACHE_TTL_FALLO_MS;
  return Date.now() - c.obtenido < ttl;
}

async function asegurarCargados(tickers: string[]): Promise<void> {
  const esperando: Array<Promise<void>> = [];
  const pendientes: string[] = [];
  for (const t of tickers) {
    if (!BASE.has(t) || vigente(t)) continue;
    const ya = enCurso.get(t);
    if (ya) esperando.push(ya);
    else pendientes.push(t);
  }
  for (let i = 0; i < pendientes.length; i += TAMANO_LOTE) {
    esperando.push(cargarLote(pendientes.slice(i, i + TAMANO_LOTE)));
  }
  await Promise.all(esperando);
}

async function empresasPropias(): Promise<Company[]> {
  const guardadas = listarEmpresasPropias();
  if (guardadas.length === 0) return [];
  const monedas = Array.from(new Set(guardadas.map((g) => g.moneda)));
  const tipos = await Promise.all(monedas.map((m) => getTipoCambioUsd(m)));
  const porMoneda = new Map(monedas.map((m, i) => [m, tipos[i]]));
  return guardadas.map((g) => empresaPropiaACompany(g, porMoneda.get(g.moneda) ?? null));
}

export function isMarketCompany(company: Company): boolean {
  return company.companyType === "market";
}

/** Devuelve EXCLUSIVAMENTE las empresas que cotizan en mercado (excluye empresas de usuario o demo). */
export async function getMarketCompanies(): Promise<Company[]> {
  await asegurarCargados(COMPANIES.map((c) => c.ticker));
  return COMPANIES.map((c) => cache.get(c.ticker)?.empresa ?? respaldo(c));
}

export async function getCompanies(): Promise<Company[]> {
  const cotizantes = await getMarketCompanies();
  const propias = await empresasPropias();
  return [...cotizantes, ...propias, EMPRESA_DEMO_PEDRO];
}

export async function getCompanyByTicker(ticker: string): Promise<Company | undefined> {
  if (ticker === EMPRESA_DEMO_PEDRO.ticker) {
    return EMPRESA_DEMO_PEDRO;
  }
  if (esEmpresaPropia(ticker)) {
    return (await empresasPropias()).find((e) => e.ticker === ticker);
  }
  if (!BASE.has(ticker)) return undefined;
  await asegurarCargados([ticker]);
  return cache.get(ticker)?.empresa ?? respaldo(BASE.get(ticker) as Company);
}

export async function getCompanyAnalysis(ticker: string) {
  const company = await getCompanyByTicker(ticker);
  if (!company) return undefined;
  const { altman, score, aplicaModeloCorporativo } = analizarEmpresa(company);
  const senales = generarSenales(company);
  return { company, altman, score, senales, aplicaModeloCorporativo };
}

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export async function searchCompanies(query: string): Promise<Company[]> {
  const q = normalizar(query.trim());
  if (!q) return [];
  const propias = listarEmpresasPropias().map((g) => empresaPropiaACompany(g, null));
  return [...propias, ...COMPANIES, EMPRESA_DEMO_PEDRO].filter((c) =>
    normalizar(`${c.nombre} ${c.ticker} ${nombreSector(c.sector)} ${nombreMercado(c.mercado)}`).includes(q)
  );
}

