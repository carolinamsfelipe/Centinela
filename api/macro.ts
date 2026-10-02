/**
 * GET /api/macro
 * Contexto macroeconomico argentino en vivo:
 *  - Dolar (oficial, blue, MEP) -- dolarapi.com
 *  - Reservas, inflacion mensual/interanual, tasa BADLAR -- API publica del BCRA v4.0
 *  - Merval -- Yahoo Finance (^MERV), mismo cliente que /api/company
 *
 * Se dejaron afuera a proposito "riesgo pais", "actividad economica (EMAE)"
 * y "desempleo": no encontramos una fuente publica, gratuita y realmente
 * actualizada para esos tres -- mejor no mostrarlos que mostrar un numero
 * viejo o inventado como si fuera en vivo.
 *
 * Cacheado 15 min en el borde de Vercel.
 */
import { fetchChart } from "./_yahoo.js";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

interface BcraDetalle {
  fecha: string;
  valor: number;
}

async function fetchBcraSerie(idVariable: number, limit = 6): Promise<BcraDetalle[]> {
  try {
    const resp = await fetch(
      `https://api.bcra.gob.ar/estadisticas/v4.0/monetarias/${idVariable}?limit=${limit}`,
      { headers: { "User-Agent": UA } }
    );
    if (!resp.ok) return [];
    const data = await resp.json();
    return data?.results?.[0]?.detalle ?? [];
  } catch {
    return [];
  }
}

interface DolarCasa {
  casa: string;
  compra: number;
  venta: number;
  fechaActualizacion: string;
}

async function fetchDolar(): Promise<DolarCasa[]> {
  try {
    const resp = await fetch("https://dolarapi.com/v1/dolares");
    if (!resp.ok) return [];
    return await resp.json();
  } catch {
    return [];
  }
}

function construirIndicador(
  id: string,
  nombre: string,
  unidad: string,
  fuente: string,
  serie: BcraDetalle[]
) {
  const actual = serie[0];
  const anterior = serie[1];
  return {
    id,
    nombre,
    unidad,
    valor: actual ? actual.valor : null,
    variacion: actual && anterior && anterior.valor !== 0 ? (actual.valor - anterior.valor) / Math.abs(anterior.valor) : null,
    fecha: actual ? actual.fecha : null,
    fuente,
    historico: serie
      .slice()
      .reverse()
      .map((d) => ({ periodo: d.fecha, valor: d.valor })),
  };
}

export default async function handler(_req: any, res: any) {
  try {
    const [dolares, reservas, inflacionMensual, inflacionInteranual, badlar, merval] = await Promise.all([
      fetchDolar(),
      fetchBcraSerie(1),
      fetchBcraSerie(27),
      fetchBcraSerie(28),
      fetchBcraSerie(7),
      fetchChart("%5EMERV").catch(() => ({ precio: null, variacionDiaria: null, moneda: null })),
    ]);

    const oficial = dolares.find((d) => d.casa === "oficial");
    const blue = dolares.find((d) => d.casa === "blue");
    const mep = dolares.find((d) => d.casa === "bolsa");

    const indicadores = [
      oficial && {
        id: "dolar_oficial",
        nombre: "Dólar oficial (venta)",
        unidad: "ARS",
        valor: oficial.venta,
        variacion: null,
        fecha: oficial.fechaActualizacion.slice(0, 10),
        fuente: "dolarapi.com",
        historico: [],
      },
      blue && {
        id: "dolar_blue",
        nombre: "Dólar blue (venta)",
        unidad: "ARS",
        valor: blue.venta,
        variacion: null,
        fecha: blue.fechaActualizacion.slice(0, 10),
        fuente: "dolarapi.com",
        historico: [],
      },
      mep && {
        id: "dolar_mep",
        nombre: "Dólar MEP (venta)",
        unidad: "ARS",
        valor: mep.venta,
        variacion: null,
        fecha: mep.fechaActualizacion.slice(0, 10),
        fuente: "dolarapi.com",
        historico: [],
      },
      construirIndicador("reservas", "Reservas internacionales", "USD millones", "BCRA", reservas),
      construirIndicador("inflacion_mensual", "Inflación mensual (IPC)", "%", "BCRA", inflacionMensual),
      construirIndicador("inflacion_interanual", "Inflación interanual (IPC)", "%", "BCRA", inflacionInteranual),
      construirIndicador("tasa_badlar", "Tasa BADLAR bancos privados", "%", "BCRA", badlar),
      merval.precio !== null && {
        id: "merval",
        nombre: "Índice Merval",
        unidad: "puntos",
        valor: merval.precio,
        variacion: merval.variacionDiaria,
        fecha: new Date().toISOString().slice(0, 10),
        fuente: "Yahoo Finance",
        historico: [],
      },
    ].filter(Boolean);

    res.setHeader("Cache-Control", "public, s-maxage=900, stale-while-revalidate=1800");
    res.status(200).json({ envivo: true, actualizado: new Date().toISOString(), indicadores });
  } catch (error) {
    res.status(502).json({ error: `No se pudo consultar el contexto macro: ${(error as Error).message}` });
  }
}
