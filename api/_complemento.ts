/**
 * Segunda fuente de datos: SEC EDGAR (data.sec.gov), gratuita, publica y sin
 * clave. Se usa SOLO como complemento de Yahoo Finance para el Altman Z'':
 * rellena unos pocos campos de balance que Yahoo dejo en null, y nunca pisa
 * un dato que Yahoo ya informo.
 *
 * Reglas (el proyecto prefiere "N/D" antes que un numero dudoso):
 * - Se aceptan solo hechos de formularios ANUALES (10-K, 20-F, 40-F y sus /A).
 * - La moneda del hecho debe coincidir exactamente con la moneda de reporte
 *   de Yahoo (nunca se convierte).
 * - El cierre del ejercicio debe coincidir con el de Yahoo. Tolerancia de
 *   7 dias porque Yahoo normaliza a fin de mes los ejercicios de 52/53
 *   semanas (ej. JNJ cierra el 2025-12-28 y Yahoo lo informa al 2025-12-31).
 * - Control cruzado: el total de activos que la SEC informa para ese mismo
 *   cierre y moneda debe coincidir con el de Yahoo (tolerancia 0,5 %). Asi se
 *   asegura que ambos hablan del mismo balance (misma base y reexpresion).
 * - No se complementan EBIT ni capitalizacion de mercado: la SEC no tiene un
 *   EBIT con la misma definicion que Yahoo, y la relacion ADR/accion ordinaria
 *   no esta en los datos estructurados, asi que multiplicar precio por
 *   acciones seria una estimacion.
 *
 * Todo falla en silencio (devuelve sin complementos): si EDGAR no responde,
 * el resultado queda identico al de solo-Yahoo. Los CIK y los hechos
 * relevantes se cachean en memoria del modulo.
 *
 * SEC exige un User-Agent identificable; se puede definir el contacto con la
 * variable de entorno SEC_USER_AGENT (ej. "Centinela contacto@dominio.com").
 */

export interface Complemento {
  campo: string;
  fuente: string;
  periodo: string;
}

export interface ResultadoComplemento {
  valores: Record<string, number>;
  complementos: Complemento[];
}

const VACIO: ResultadoComplemento = { valores: {}, complementos: [] };

export const FUENTE_SEC = "SEC EDGAR";

const TIMEOUT_MS = 5000;
const TTL_CIK_MS = 24 * 60 * 60 * 1000;
const TTL_FACTS_MS = 6 * 60 * 60 * 1000;
const TOLERANCIA_DIAS = 7;
const TOLERANCIA_ACTIVOS = 0.005;
const FORMULARIOS_ANUALES = /^(10-K|20-F|40-F)(\/A)?$/;

function userAgent(): string {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  return env?.SEC_USER_AGENT?.trim() || "Centinela-Web/1.0 (plataforma academica de diagnostico financiero)";
}

/** Campos que se pueden completar: nombre interno -> conceptos XBRL equivalentes (taxonomia, etiqueta). */
const CONCEPTOS: Record<string, Array<[string, string]>> = {
  gananciasRetenidas: [
    ["ifrs-full", "RetainedEarnings"],
    ["us-gaap", "RetainedEarningsAccumulatedDeficit"],
  ],
  activosCorrientes: [
    ["ifrs-full", "CurrentAssets"],
    ["us-gaap", "AssetsCurrent"],
  ],
  pasivosCorrientes: [
    ["ifrs-full", "CurrentLiabilities"],
    ["us-gaap", "LiabilitiesCurrent"],
  ],
  pasivosTotales: [
    ["ifrs-full", "Liabilities"],
    ["us-gaap", "Liabilities"],
  ],
};
const CONCEPTOS_ACTIVOS: Array<[string, string]> = [
  ["ifrs-full", "Assets"],
  ["us-gaap", "Assets"],
];
/** Clave interna del control cruzado (no es un campo a completar). */
const CLAVE_ACTIVOS = "activosTotales";

interface HechoSec {
  end: string;
  val: number;
  filed: string;
  moneda: string;
}

/** campo -> hechos anuales de todas las monedas. */
type FactsSlim = Record<string, HechoSec[]>;

// ---- Cache en memoria ------------------------------------------------------

let cikPorTicker: Map<string, number> | null = null;
let cikObtenido = 0;
let cikEnCurso: Promise<void> | null = null;

const factsCache = new Map<number, { datos: FactsSlim | null; obtenido: number }>();
const factsEnCurso = new Map<number, Promise<FactsSlim | null>>();

async function pedirJson(url: string): Promise<unknown> {
  const resp = await fetch(url, {
    headers: { "User-Agent": userAgent(), Accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!resp.ok) throw new Error(`SEC respondio ${resp.status}`);
  return resp.json();
}

/**
 * Descarga (una vez, y cacheada 24 h) el mapa ticker -> CIK. Se puede lanzar
 * en paralelo con los pedidos a Yahoo para que no sume latencia. Nunca lanza.
 */
export function precargarCik(): Promise<void> {
  if (cikPorTicker && Date.now() - cikObtenido < TTL_CIK_MS) return Promise.resolve();
  if (cikEnCurso) return cikEnCurso;
  cikEnCurso = (async () => {
    try {
      const data = (await pedirJson("https://www.sec.gov/files/company_tickers.json")) as Record<
        string,
        { cik_str?: number; ticker?: string }
      >;
      const mapa = new Map<string, number>();
      for (const e of Object.values(data ?? {})) {
        if (typeof e?.cik_str === "number" && typeof e?.ticker === "string") {
          mapa.set(e.ticker.toUpperCase(), e.cik_str);
        }
      }
      if (mapa.size > 0) {
        cikPorTicker = mapa;
        cikObtenido = Date.now();
      }
    } catch {
      // Sin mapa de CIK no hay complemento: se sigue solo con Yahoo.
    } finally {
      cikEnCurso = null;
    }
  })();
  return cikEnCurso;
}

interface RawFact {
  end?: string;
  val?: number;
  form?: string;
  filed?: string;
}
type RawConcepto = { units?: Record<string, RawFact[]> };
type RawFacts = { facts?: Record<string, Record<string, RawConcepto> | undefined> };

function extraerHechos(raw: RawFacts): FactsSlim {
  const slim: FactsSlim = {};
  const grupos: Array<[string, Array<[string, string]>]> = [
    ...Object.entries(CONCEPTOS),
    [CLAVE_ACTIVOS, CONCEPTOS_ACTIVOS],
  ];
  for (const [campo, lista] of grupos) {
    const hechos: HechoSec[] = [];
    for (const [taxonomia, etiqueta] of lista) {
      const unidades = raw.facts?.[taxonomia]?.[etiqueta]?.units;
      if (!unidades) continue;
      for (const [moneda, items] of Object.entries(unidades)) {
        for (const f of items ?? []) {
          if (
            typeof f.end === "string" &&
            typeof f.val === "number" &&
            Number.isFinite(f.val) &&
            typeof f.form === "string" &&
            FORMULARIOS_ANUALES.test(f.form)
          ) {
            hechos.push({ end: f.end, val: f.val, filed: f.filed ?? "", moneda });
          }
        }
      }
    }
    slim[campo] = hechos;
  }
  return slim;
}

function cargarHechos(cik: number): Promise<FactsSlim | null> {
  const cacheado = factsCache.get(cik);
  if (cacheado && Date.now() - cacheado.obtenido < TTL_FACTS_MS) return Promise.resolve(cacheado.datos);
  const enCurso = factsEnCurso.get(cik);
  if (enCurso) return enCurso;
  const promesa = (async () => {
    try {
      const raw = (await pedirJson(
        `https://data.sec.gov/api/xbrl/companyfacts/CIK${String(cik).padStart(10, "0")}.json`
      )) as RawFacts;
      const datos = extraerHechos(raw);
      factsCache.set(cik, { datos, obtenido: Date.now() });
      return datos;
    } catch {
      return null; // no se cachea el fallo: el proximo pedido reintenta
    } finally {
      factsEnCurso.delete(cik);
    }
  })();
  factsEnCurso.set(cik, promesa);
  return promesa;
}

// ---- Seleccion del dato ----------------------------------------------------

function diasEntre(a: string, b: string): number {
  const ta = Date.parse(`${a}T00:00:00Z`);
  const tb = Date.parse(`${b}T00:00:00Z`);
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return Number.POSITIVE_INFINITY;
  return Math.abs(ta - tb) / 86_400_000;
}

/** Hechos de la moneda pedida cuyo cierre esta a menos de TOLERANCIA_DIAS del periodo de Yahoo. */
function candidatos(hechos: HechoSec[] | undefined, moneda: string, periodo: string): HechoSec[] {
  return (hechos ?? []).filter((h) => h.moneda === moneda && diasEntre(h.end, periodo) <= TOLERANCIA_DIAS);
}

/** Mas cercano al cierre de Yahoo y, a igualdad, el presentado mas recientemente (reexpresiones). */
function elegir(lista: HechoSec[], periodo: string): HechoSec | null {
  if (lista.length === 0) return null;
  return [...lista].sort(
    (a, b) => diasEntre(a.end, periodo) - diasEntre(b.end, periodo) || b.filed.localeCompare(a.filed)
  )[0];
}

function numero(v: string | number | null | undefined): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/**
 * Intenta completar los campos faltantes (`faltantes`) del ejercicio `periodo`
 * de `ticker`. `periodoYahoo` es el ultimo periodo de Yahoo (para verificar el
 * total de activos). Devuelve solo lo que paso todos los controles; si algo
 * falla o no hay datos, devuelve vacio.
 */
export async function complementarDesdeSec(
  ticker: string,
  periodoYahoo: Record<string, string | number | null>,
  monedaReporte: string | null,
  faltantes: string[]
): Promise<ResultadoComplemento> {
  try {
    const periodo = typeof periodoYahoo.periodo === "string" ? periodoYahoo.periodo : null;
    const activosYahoo = numero(periodoYahoo.activosTotales);
    const pedidos = faltantes.filter((c) => c in CONCEPTOS);
    // Sin periodo, moneda o total de activos de Yahoo no hay forma de verificar que sea el mismo balance.
    if (!periodo || !monedaReporte || activosYahoo === null || activosYahoo <= 0 || pedidos.length === 0) {
      return VACIO;
    }

    await precargarCik();
    const cik = cikPorTicker?.get(ticker.toUpperCase().replace(/\./g, "-"));
    if (cik === undefined) return VACIO;

    const hechos = await cargarHechos(cik);
    if (!hechos) return VACIO;

    // Control cruzado: total de activos de la SEC para el mismo cierre y moneda.
    const activosSec = candidatos(hechos[CLAVE_ACTIVOS], monedaReporte, periodo);
    const mismoBalance = (end: string): boolean =>
      activosSec.some((a) => a.end === end && Math.abs(a.val - activosYahoo) / activosYahoo <= TOLERANCIA_ACTIVOS);

    const valores: Record<string, number> = {};
    const complementos: Complemento[] = [];
    for (const campo of pedidos) {
      const elegido = elegir(
        candidatos(hechos[campo], monedaReporte, periodo).filter((h) => mismoBalance(h.end)),
        periodo
      );
      if (!elegido) continue;
      valores[campo] = elegido.val;
      complementos.push({ campo, fuente: FUENTE_SEC, periodo: elegido.end });
    }
    return { valores, complementos };
  } catch {
    return VACIO;
  }
}
