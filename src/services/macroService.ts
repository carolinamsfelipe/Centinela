import { MACRO_INDICATORS_RESPALDO } from "@/data/macro";
import type { MacroIndicator } from "@/types";

export interface MacroResultado {
  indicadores: MacroIndicator[];
  /** Referencias de otros mercados (S&P 500, Bovespa, Euro Stoxx...). Vacio si no hay conexion. */
  globales: MacroIndicator[];
  envivo: boolean;
  actualizado: string | null;
}

const CACHE_TTL_MS = 10 * 60 * 1000;
let cache: { resultado: MacroResultado; obtenido: number } | null = null;

export async function getMacroIndicators(): Promise<MacroResultado> {
  if (cache && Date.now() - cache.obtenido < CACHE_TTL_MS) {
    return cache.resultado;
  }

  try {
    const resp = await fetch("/api/macro");
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    if (!Array.isArray(data?.indicadores) || data.indicadores.length === 0) {
      throw new Error("Respuesta vacía");
    }
    const resultado: MacroResultado = {
      indicadores: data.indicadores,
      globales: Array.isArray(data.globales) ? data.globales : [],
      envivo: true,
      actualizado: data.actualizado ?? new Date().toISOString(),
    };
    cache = { resultado, obtenido: Date.now() };
    return resultado;
  } catch {
    const resultado: MacroResultado = {
      indicadores: MACRO_INDICATORS_RESPALDO,
      globales: [],
      envivo: false,
      actualizado: null,
    };
    cache = { resultado, obtenido: Date.now() };
    return resultado;
  }
}
