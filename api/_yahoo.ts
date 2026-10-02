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

export interface QuoteSummaryData {
  marketCap: number | null;
  pe: number | null;
  eps: number | null;
  evEbitda: number | null;
}

export async function fetchQuoteSummary(ticker: string): Promise<QuoteSummaryData> {
  const { cookie, crumb } = await obtenerAuth();
  const modules = "price,summaryDetail,defaultKeyStatistics";
  const resp = await fetch(
    `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=${modules}&crumb=${encodeURIComponent(crumb)}`,
    { headers: { "User-Agent": UA, Cookie: cookie } }
  );
  if (!resp.ok) return { marketCap: null, pe: null, eps: null, evEbitda: null };
  const data = await resp.json();
  const result = data?.quoteSummary?.result?.[0];
  if (!result) return { marketCap: null, pe: null, eps: null, evEbitda: null };
  const price = result.price ?? {};
  const summary = result.summaryDetail ?? {};
  const stats = result.defaultKeyStatistics ?? {};
  const ev = stats.enterpriseValue?.raw ?? null;
  const ebitda = summary.ebitda?.raw ?? null;
  return {
    marketCap: price.marketCap?.raw ?? null,
    pe: summary.trailingPE?.raw ?? null,
    eps: stats.trailingEps?.raw ?? null,
    evEbitda: ev !== null && ebitda ? ev / ebitda : null,
  };
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
  annualTotalRevenue: "revenue",
  annualNetIncomeCommonStockholders: "netIncome",
  annualCashAndCashEquivalents: "efectivo",
  annualNetPPE: "ppeNeto",
};

export interface PeriodoFinanciero {
  periodo: string;
  [campo: string]: string | number | null;
}

export async function fetchTimeseries(ticker: string): Promise<PeriodoFinanciero[]> {
  const { cookie, crumb } = await obtenerAuth();
  const types = Object.keys(TIMESERIES_FIELDS).join(",");
  const now = Math.floor(Date.now() / 1000);
  const period1 = now - 4 * 365 * 24 * 3600;
  const resp = await fetch(
    `https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(ticker)}?type=${types}&period1=${period1}&period2=${now}&crumb=${encodeURIComponent(crumb)}`,
    { headers: { "User-Agent": UA, Cookie: cookie } }
  );
  if (!resp.ok) return [];
  const data = await resp.json();
  const blocks: Array<{ meta: { type: string[] }; [key: string]: unknown }> =
    data?.timeseries?.result ?? [];

  const porPeriodo: Record<string, PeriodoFinanciero> = {};
  for (const block of blocks) {
    const tipoYahoo = block.meta?.type?.[0];
    if (!tipoYahoo) continue;
    const campo = TIMESERIES_FIELDS[tipoYahoo];
    if (!campo) continue;
    const entradas = (block[tipoYahoo] as Array<{
      asOfDate: string;
      reportedValue?: { raw: number };
    } | null>) ?? [];
    for (const entrada of entradas) {
      if (!entrada) continue;
      const fecha = entrada.asOfDate;
      if (!porPeriodo[fecha]) porPeriodo[fecha] = { periodo: fecha };
      porPeriodo[fecha][campo] = entrada.reportedValue?.raw ?? null;
    }
  }

  return Object.values(porPeriodo).sort((a, b) => a.periodo.localeCompare(b.periodo));
}
