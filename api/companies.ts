import { cargarEmpresa } from "./_yahoo.js";

/**
 * GET /api/companies?tickers=YPF,PAM,AAPL
 * Version por lotes de /api/company/:ticker para las pantallas de lista
 * (explorador, rankings, mercado, comparador). Comparte el handshake de
 * Yahoo entre todos los tickers del lote y limita a 8 por pedido para no
 * exceder el tiempo maximo de la funcion. Cada ticker que falla vuelve como
 * null: un ticker caido no tira abajo el lote entero.
 */
const MAX_POR_LOTE = 8;

export default async function handler(req: any, res: any) {
  const raw = Array.isArray(req.query.tickers) ? req.query.tickers[0] : req.query.tickers;
  if (!raw || typeof raw !== "string") {
    res.status(400).json({ error: "Falta el parametro tickers." });
    return;
  }

  const tickers = Array.from(
    new Set(
      raw
        .split(",")
        .map((t: string) => t.trim().toUpperCase())
        .filter((t: string) => /^[A-Z0-9.\-^=]{1,12}$/.test(t))
    )
  ).slice(0, MAX_POR_LOTE) as string[];

  if (tickers.length === 0) {
    res.status(400).json({ error: "No hay tickers validos." });
    return;
  }

  const resultados = await Promise.all(
    tickers.map(async (ticker) => {
      try {
        return await cargarEmpresa(ticker);
      } catch {
        return null;
      }
    })
  );

  res.setHeader("Cache-Control", "public, s-maxage=900, stale-while-revalidate=1800");
  res.status(200).json({
    actualizado: new Date().toISOString(),
    empresas: Object.fromEntries(tickers.map((t, i) => [t, resultados[i]])),
  });
}
