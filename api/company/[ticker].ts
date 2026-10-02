import { fetchChart, fetchQuoteSummary, fetchTimeseries } from "../_yahoo";

/**
 * GET /api/company/:ticker
 * Datos en vivo de Yahoo Finance para una empresa que cotiza: balance,
 * resultados y mercado del ultimo periodo disponible, mas el historico de
 * periodos previos (sin datos de mercado historicos, Yahoo no los da por
 * este camino -- se deja en null en vez de aproximar).
 *
 * Cacheado 15 min en el borde de Vercel (misma logica que el prototipo
 * Python: evita pegarle a Yahoo en cada visita y reduce el riesgo de que
 * Yahoo empiece a tirar 429 por demasiados pedidos).
 */
export default async function handler(req: any, res: any) {
  const ticker = Array.isArray(req.query.ticker) ? req.query.ticker[0] : req.query.ticker;
  if (!ticker || typeof ticker !== "string") {
    res.status(400).json({ error: "Falta el ticker." });
    return;
  }

  try {
    const [chart, quoteSummary, periodos] = await Promise.all([
      fetchChart(ticker),
      fetchQuoteSummary(ticker).catch(() => ({ marketCap: null, pe: null, eps: null, evEbitda: null })),
      fetchTimeseries(ticker),
    ]);

    if (periodos.length === 0 && chart.precio === null) {
      res.status(404).json({ error: `No se encontraron datos para ${ticker}.` });
      return;
    }

    const ultimo = periodos[periodos.length - 1] ?? { periodo: new Date().toISOString().slice(0, 10) };

    res.setHeader("Cache-Control", "public, s-maxage=900, stale-while-revalidate=1800");
    res.status(200).json({
      ticker,
      envivo: true,
      actualizado: new Date().toISOString(),
      ultimo: {
        ...ultimo,
        precio: chart.precio,
        variacionDiaria: chart.variacionDiaria,
        moneda: chart.moneda,
        marketCap: quoteSummary.marketCap,
        pe: quoteSummary.pe,
        eps: quoteSummary.eps,
        evEbitda: quoteSummary.evEbitda,
      },
      historico: periodos,
    });
  } catch (error) {
    res.status(502).json({ error: `No se pudo consultar Yahoo Finance: ${(error as Error).message}` });
  }
}
