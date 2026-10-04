/**
 * Cliente de Yahoo Finance para las funciones serverless de /api. Corre en
 * el servidor (Node de Vercel), nunca en el browser: evita el problema de
 * CORS de pegarle a Yahoo directo desde el cliente, y es el mismo enfoque
 * que yfinance (la libreria de Python que usaba el prototipo original).
 *
 * Yahoo exige desde 2024 un "crumb" (token anti-scraping) atado a una
 * cookie de sesion para los endpoints de datos fundamentales. El flujo:
 * 1) pedir una cookie a fc.yahoo.com
 * 2) con esa cookie, pedir un crumb a query2.finance.yahoo.com/v1/test/getcrumb
 * 3) mandar cookie + crumb en cada pedido a quoteSummary / fundamentals-timeseries
 * El endpoint de "chart" (precio en vivo) no necesita nada de esto.
 *
 * El par cookie+crumb se cachea en memoria del modulo: una instancia tibia
 * de la funcion serverless lo reusa entre pedidos en vez de repetir el
 * handshake cada vez.
 */

import { complementarDesdeSec, precargarCik } from "./_complemento.js";
import type { Complemento } from "./_complemento.js";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

let cachedAuth: { cookie: string; crumb: string; obtenido: number } | null = null;
const AUTH_TTL_MS = 30 * 60 * 1000;

async function obtenerAuth(): Promise<{ cookie: string; crumb: string }> {
  if (cachedAuth && Date.now() - cachedAuth.obtenido < AUTH_TTL_MS) {
    return cachedAuth;
  }

  const cookieResp = await fetch("https://fc.yahoo.com", {
    headers: { "User-Agent": UA },
    redirect: "manual",
  });
  const setCookie = cookieResp.headers.get("set-cookie") ?? "";
  const cookie = setCookie.split(";")[0] ?? "";

  const crumbResp = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", {
    headers: { "User-Agent": UA, Cookie: cookie },
  });
  const crumb = (await crumbResp.text()).trim();

  if (!crumb || crumb.includes("<")) {
    throw new Error("No se pudo obtener el crumb de Yahoo Finance.");
  }

  cachedAuth = { cookie, crumb, obtenido: Date.now() };
  return cachedAuth;
}

export interface ChartData {
  precio: number | null;
  variacionDiaria: number | null;
  moneda: string | null;
}

export async function fetchChart(ticker: string): Promise<ChartData> {
  const resp = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`,
    { headers: { "User-Agent": UA } }
  );
  if (!resp.ok) return { precio: null, variacionDiaria: null, moneda: null };
  const data = await resp.json();
  const meta = data?.chart?.result?.[0]?.meta;
  if (!meta) return { precio: null, variacionDiaria: null, moneda: null };
  return {
    precio: meta.regularMarketPrice ?? null,
    variacionDiaria:
      meta.regularMarketChangePercent !== undefined ? meta.regularMarketChangePercent / 100 : null,
    moneda: meta.currency ?? null,
  };
}

/**
 * Unidades de `moneda` por 1 USD (ej. ARS => ~1500, EUR => ~0.89, USD => 1).
 * Yahoo publica estos cruces como "<MONEDA>=X". Cacheado en memoria 15 min.
 * Devuelve null si Yahoo no responde: nunca se inventa un tipo de cambio.
 */
const fxCache = new Map<string, { valor: number | null; obtenido: number }>();
const FX_TTL_MS = 15 * 60 * 1000;

export async function fetchFxPorUsd(moneda: string): Promise<number | null> {
  const codigo = moneda.toUpperCase();
  if (codigo === "USD") return 1;
  const cacheado = fxCache.get(codigo);
  if (cacheado && Date.now() - cacheado.obtenido < FX_TTL_MS) return cacheado.valor;
  let valor: number | null = null;
  try {
    const chart = await fetchChart(`${codigo}=X`);
    valor = chart.precio !== null && chart.precio > 0 ? chart.precio : null;
  } catch {
    valor = null;
  }
  fxCache.set(codigo, { valor, obtenido: Date.now() });
  return valor;
}

export interface QuoteSummaryData {
  marketCap: number | null;
  monedaCotizacion: string | null;
  pe: number | null;
  eps: number | null;
}

const QUOTE_VACIO: QuoteSummaryData = { marketCap: null, monedaCotizacion: null, pe: null, eps: null };

async function quoteSummaryUnaVez(ticker: string): Promise<QuoteSummaryData | null> {
  const { cookie, crumb } = await obtenerAuth();
  const modules = "price,summaryDetail,defaultKeyStatistics";
  const resp = await fetch(
    `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=${modules}&crumb=${encodeURIComponent(crumb)}`,
    { headers: { "User-Agent": UA, Cookie: cookie } }
  );
  if (!resp.ok) return null;
  const data = await resp.json();
  const result = data?.quoteSummary?.result?.[0];
  if (!result) return null;
  const price = result.price ?? {};
  const summary = result.summaryDetail ?? {};
  const stats = result.defaultKeyStatistics ?? {};
  return {
    marketCap: price.marketCap?.raw ?? summary.marketCap?.raw ?? null,
    monedaCotizacion: price.currency ?? summary.currency ?? null,
    pe: summary.trailingPE?.raw ?? null,
    eps: stats.trailingEps?.raw ?? null,
  };
}

/** Un reintento: Yahoo a veces devuelve el bloque vacio en el primer pedido. */
export async function fetchQuoteSummary(ticker: string): Promise<QuoteSummaryData> {
  const primero = await quoteSummaryUnaVez(ticker).catch(() => null);
  if (primero && primero.marketCap !== null) return primero;
  const segundo = await quoteSummaryUnaVez(ticker).catch(() => null);
  return segundo ?? primero ?? QUOTE_VACIO;
}

const TIMESERIES_FIELDS: Record<string, string> = {
  annualTotalAssets: "activosTotales",
  annualCurrentAssets: "activosCorrientes",
  annualCurrentLiabilities: "pasivosCorrientes",
  annualTotalLiabilitiesNetMinorityInterest: "pasivosTotales",
  annualStockholdersEquity: "patrimonioNeto",
  annualRetainedEarnings: "gananciasRetenidas",
  annualTotalDebt: "deudaTotal",
  annualWorkingCapital: "capitalTrabajo",
  annualEBIT: "ebit",
  annualEBITDA: "ebitda",
  annualTotalRevenue: "revenue",
  annualNetIncomeCommonStockholders: "netIncome",
  annualCashAndCashEquivalents: "efectivo",
  annualInventory: "inventario",
  annualFreeCashFlow: "freeCashFlow",
};

export interface PeriodoFinanciero {
  periodo: string;
  [campo: string]: string | number | null;
}

export interface SerieFinanciera {
  moneda: string | null;
  periodos: PeriodoFinanciero[];
}

/**
 * Trae hasta ~5 anios de balance y resultados anuales. Cada valor viene con
 * su moneda (currencyCode); hay empresas que cambiaron de moneda de reporte
 * entre un ejercicio y otro (ej. YPF: 2022 en ARS, 2023+ en USD). Mezclar
 * monedas en una misma serie falsea cualquier ratio y tendencia, asi que se
 * toma como moneda de reporte la del ultimo ejercicio y se descarta todo
 * valor de otra moneda en vez de convertirlo con un tipo de cambio de hoy.
 */
export async function fetchTimeseries(ticker: string): Promise<SerieFinanciera> {
  const { cookie, crumb } = await obtenerAuth();
  const types = Object.keys(TIMESERIES_FIELDS).join(",");
  const now = Math.floor(Date.now() / 1000);
  const period1 = now - 5 * 365 * 24 * 3600;
  const resp = await fetch(
    `https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(ticker)}?type=${types}&period1=${period1}&period2=${now}&crumb=${encodeURIComponent(crumb)}`,
    { headers: { "User-Agent": UA, Cookie: cookie } }
  );
  if (!resp.ok) return { moneda: null, periodos: [] };
  const data = await resp.json();
  const blocks: Array<{ meta: { type: string[] }; [key: string]: unknown }> =
    data?.timeseries?.result ?? [];

  interface Entrada {
    asOfDate: string;
    currencyCode?: string;
    reportedValue?: { raw: number };
  }

  const entradas: Array<{ campo: string; fecha: string; moneda: string | null; valor: number | null }> = [];
  for (const block of blocks) {
    const tipoYahoo = block.meta?.type?.[0];
    if (!tipoYahoo) continue;
    const campo = TIMESERIES_FIELDS[tipoYahoo];
    if (!campo) continue;
    const lista = (block[tipoYahoo] as Array<Entrada | null>) ?? [];
    for (const e of lista) {
      if (!e) continue;
      entradas.push({
        campo,
        fecha: e.asOfDate,
        moneda: e.currencyCode ?? null,
        valor: e.reportedValue?.raw ?? null,
      });
    }
  }
  if (entradas.length === 0) return { moneda: null, periodos: [] };

  // Moneda de reporte = la del activo total mas reciente (o, si falta, la del dato mas reciente).
  const activos = entradas.filter((e) => e.campo === "activosTotales" && e.moneda);
  const referencia = (activos.length > 0 ? activos : entradas.filter((e) => e.moneda)).sort((a, b) =>
    b.fecha.localeCompare(a.fecha)
  )[0];
  const moneda = referencia?.moneda ?? null;

  const porPeriodo: Record<string, PeriodoFinanciero> = {};
  for (const e of entradas) {
    if (moneda !== null && e.moneda !== null && e.moneda !== moneda) continue;
    if (!porPeriodo[e.fecha]) porPeriodo[e.fecha] = { periodo: e.fecha };
    porPeriodo[e.fecha][e.campo] = e.valor;
  }

  // Un ejercicio sin activos totales ni patrimonio no sirve para ningun ratio.
  const periodos = Object.values(porPeriodo)
    .filter((p) => p.activosTotales != null || p.patrimonioNeto != null)
    .sort((a, b) => a.periodo.localeCompare(b.periodo));

  return { moneda, periodos };
}

export interface EmpresaEnVivo {
  ticker: string;
  envivo: true;
  actualizado: string;
  monedaReporte: string | null;
  tipoCambioUsd: number | null;
  ultimo: Record<string, string | number | null>;
  historico: PeriodoFinanciero[];
  /** Campos que Yahoo no informaba y se completaron con otra fuente (trazabilidad). */
  complementos: Complemento[];
}

function numero(v: string | number | null | undefined): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Campos de balance del Altman Z'' que se pueden completar desde la SEC. */
const CAMPOS_COMPLETABLES = ["gananciasRetenidas", "activosCorrientes", "pasivosCorrientes", "pasivosTotales"];

/**
 * Si Yahoo dejo en null algun dato del Altman, intenta completarlo con SEC EDGAR
 * (ver _complemento.ts). Modifica `periodo` solo en los campos que estaban en
 * null y devuelve la lista de campos completados. Si no hay nada que completar,
 * si la fuente falla o si el dato no pasa los controles de moneda y ejercicio,
 * no toca nada y devuelve [].
 *
 * Las entidades financieras (balance sin clasificar: sin activos/pasivos
 * corrientes ni EBIT) quedan afuera: el Altman no les aplica.
 */
async function completarConSec(
  ticker: string,
  periodo: PeriodoFinanciero,
  monedaReporte: string | null
): Promise<Complemento[]> {
  if (periodo.activosTotales == null) return [];
  const sinClasificar =
    periodo.activosCorrientes == null && periodo.pasivosCorrientes == null && periodo.ebit == null;
  if (sinClasificar) return [];
  const faltantes = CAMPOS_COMPLETABLES.filter((c) => numero(periodo[c]) === null);
  if (faltantes.length === 0) return [];
  const { valores, complementos } = await complementarDesdeSec(ticker, periodo, monedaReporte, faltantes);
  for (const campo of Object.keys(valores)) {
    if (numero(periodo[campo]) === null) periodo[campo] = valores[campo];
  }
  return complementos.filter((c) => numero(periodo[c.campo]) !== null);
}

/**
 * Arma todo lo que la plataforma necesita de una empresa a partir de Yahoo.
 * Devuelve null si Yahoo no tiene ni balance ni precio para el ticker.
 *
 * Las magnitudes de balance/resultados quedan en la moneda de reporte; la
 * capitalizacion de mercado (que Yahoo da en la moneda de cotizacion, USD
 * para los ADR) se convierte a esa misma moneda para que X4 del Altman
 * (market cap / pasivos) y P/B o EV/EBITDA sean consistentes. Si no hay tipo
 * de cambio, el market cap queda en null: nunca se mezclan monedas.
 */
export async function cargarEmpresa(ticker: string): Promise<EmpresaEnVivo | null> {
  const [chart, quote, serie] = await Promise.all([
    fetchChart(ticker).catch(() => ({ precio: null, variacionDiaria: null, moneda: null }) as ChartData),
    fetchQuoteSummary(ticker).catch(() => QUOTE_VACIO),
    fetchTimeseries(ticker).catch(() => ({ moneda: null, periodos: [] }) as SerieFinanciera),
    precargarCik(), // mapa ticker->CIK de la SEC (cacheado, nunca lanza): no suma latencia
  ]);

  if (serie.periodos.length === 0 && chart.precio === null) return null;

  const monedaReporte = serie.moneda;
  const monedaCotizacion = quote.monedaCotizacion ?? chart.moneda ?? "USD";

  let tipoCambioUsd: number | null = null; // unidades de moneda de reporte por 1 USD
  let marketCap: number | null = null;
  if (monedaReporte) {
    const [fxReporte, fxCotizacion] = await Promise.all([
      fetchFxPorUsd(monedaReporte),
      fetchFxPorUsd(monedaCotizacion),
    ]);
    tipoCambioUsd = fxReporte;
    if (quote.marketCap !== null && fxReporte !== null && fxCotizacion !== null) {
      marketCap = (quote.marketCap / fxCotizacion) * fxReporte;
    }
  } else if (monedaCotizacion.toUpperCase() === "USD") {
    marketCap = quote.marketCap;
  }

  const ultimoPeriodo: PeriodoFinanciero =
    serie.periodos[serie.periodos.length - 1] ?? { periodo: new Date().toISOString().slice(0, 10) };

  const complementos = await completarConSec(ticker, ultimoPeriodo, monedaReporte);

  const patrimonio = numero(ultimoPeriodo.patrimonioNeto);
  const deuda = numero(ultimoPeriodo.deudaTotal);
  const efectivo = numero(ultimoPeriodo.efectivo);
  const ebitda = numero(ultimoPeriodo.ebitda);
  const activosCorr = numero(ultimoPeriodo.activosCorrientes);
  const inventario = numero(ultimoPeriodo.inventario);
  const pasivosCorr = numero(ultimoPeriodo.pasivosCorrientes);

  const pb = marketCap !== null && patrimonio !== null && patrimonio > 0 ? marketCap / patrimonio : null;
  const evEbitda =
    marketCap !== null && deuda !== null && efectivo !== null && ebitda !== null && ebitda > 0
      ? (marketCap + deuda - efectivo) / ebitda
      : null;
  const quickRatio =
    activosCorr !== null && inventario !== null && pasivosCorr !== null && pasivosCorr > 0
      ? (activosCorr - inventario) / pasivosCorr
      : null;

  return {
    ticker,
    envivo: true,
    actualizado: new Date().toISOString(),
    monedaReporte,
    tipoCambioUsd,
    ultimo: {
      ...ultimoPeriodo,
      precio: chart.precio,
      variacionDiaria: chart.variacionDiaria,
      monedaPrecio: monedaCotizacion,
      marketCap,
      pe: quote.pe,
      eps: quote.eps,
      pb,
      evEbitda,
      quickRatio,
    },
    historico: serie.periodos,
    complementos,
  };
}
