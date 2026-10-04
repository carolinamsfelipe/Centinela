import { cargarEmpresa } from "../_yahoo.js";

/**
 * GET /api/company/:ticker
 * Datos en vivo de Yahoo Finance para una empresa que cotiza: balance,
 * resultados y mercado del ultimo periodo disponible, mas el historico de
 * periodos previos, con la moneda de reporte y el tipo de cambio a USD.
 *
 * Cacheado 15 min en el borde de Vercel: evita pegarle a Yahoo en cada
 * visita y reduce el riesgo de que empiece a tirar 429.
 */
export default async function handler(req: any, res: any) {
  const ticker = Array.isArray(req.query.ticker) ? req.query.ticker[0] : req.query.ticker;
  if (!ticker || typeof ticker !== "string") {
    res.status(400).json({ error: "Falta el ticker." });
    return;
  }

  try {
    const empresa = await cargarEmpresa(ticker);
    if (!empresa) {
      res.status(404).json({ error: `No se encontraron datos para ${ticker}.` });
      return;
    }
    res.setHeader("Cache-Control", "public, s-maxage=900, stale-while-revalidate=1800");
    res.status(200).json(empresa);
  } catch (error) {
    res.status(502).json({ error: `No se pudo consultar Yahoo Finance: ${(error as Error).message}` });
  }
}
