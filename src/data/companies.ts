import type { Company, FinancialMetrics, Mercado, Sector, TamanoEmpresa } from "@/types";

/**
 * Universo de empresas de Centinela. TODAS cotizan y se consultan en vivo a
 * Yahoo Finance (ver /api/companies): balance, resultados, capitalizacion y
 * precio no estan escritos aca. Lo unico fijo en este archivo es la ficha de
 * clasificacion (nombre, sector, mercado) -- es metadata, no un dato
 * financiero. No hay empresas ficticias: si una empresa no se puede traer
 * de una fuente real, no esta en la plataforma.
 *
 * Las 5 empresas del prototipo original conservan ademas una captura real de
 * Yahoo Finance como RESPALDO por si la consulta en vivo falla; la interfaz
 * lo avisa ("Datos de respaldo"). Donde la captura guardaba la capitalizacion
 * de mercado en una moneda distinta a la del balance (TEO, CRESY, LOMA:
 * balance en ARS, market cap en USD) se anula en el respaldo para no mezclar
 * monedas en el Altman Z''.
 */

const RESPALDO_REAL: Company[] = [
  {
    ticker: "YPF",
    nombre: "YPF S.A.",
    sector: "Energia",
    mercado: "Argentina",
    tamano: "Large",
    pais: "Argentina",
    fuente: "real",
    companyType: "market",
    monedaReporte: "USD",
    tipoCambioUsd: 1,
    metrics: {
      periodo: "2025-12-31",
      precio: null,
      variacionDiaria: null,
      marketCap: 21309278695,
      revenue: null,
      ebitda: null,
      ebitMargin: null,
      netIncome: null,
      roe: null,
      roa: null,
      margenNeto: null,
      debtToEquity: 11152000000 / 10814000000,
      currentRatio: 6477000000 / 7443000000,
      quickRatio: null,
      freeCashFlow: null,
      eps: null,
      pe: null,
      pb: null,
      evEbitda: null,
      activosCorrientes: 6477000000,
      activosTotales: 29439000000,
      pasivosCorrientes: 7443000000,
      pasivosTotales: 18395000000,
      patrimonioNeto: 10814000000,
      gananciasRetenidas: -756000000,
      deudaTotal: 11152000000,
      ebit: 1844000000,
    },
    historico: [
      { periodo: "2023-12-31", revenue: null, ebitda: null, netIncome: null, roe: null, roa: null, debtToEquity: null, freeCashFlow: null, altmanZ: null, centinelaScore: null },
      { periodo: "2024-12-31", revenue: null, ebitda: null, netIncome: null, roe: null, roa: null, debtToEquity: null, freeCashFlow: null, altmanZ: null, centinelaScore: null },
      { periodo: "2025-12-31", revenue: null, ebitda: null, netIncome: null, roe: null, roa: null, debtToEquity: 11152000000 / 10814000000, freeCashFlow: null, altmanZ: null, centinelaScore: null },
    ],
  },
  {
    ticker: "PAM",
    nombre: "Pampa Energía S.A.",
    sector: "Energia",
    mercado: "Argentina",
    tamano: "Large",
    pais: "Argentina",
    fuente: "real",
    companyType: "market",
    monedaReporte: "USD",
    tipoCambioUsd: 1,
    metrics: {
      periodo: "2025-12-31",
      precio: null,
      variacionDiaria: null,
      marketCap: 4330380513,
      revenue: null,
      ebitda: null,
      ebitMargin: null,
      netIncome: null,
      roe: null,
      roa: null,
      margenNeto: null,
      debtToEquity: 1928000000 / 3596000000,
      currentRatio: 1988000000 / 639000000,
      quickRatio: null,
      freeCashFlow: null,
      eps: null,
      pe: null,
      pb: null,
      evEbitda: null,
      activosCorrientes: 1988000000,
      activosTotales: 6594000000,
      pasivosCorrientes: 639000000,
      pasivosTotales: 2989000000,
      patrimonioNeto: 3596000000,
      gananciasRetenidas: 351000000,
      deudaTotal: 1928000000,
      ebit: 771000000,
    },
    historico: [
      { periodo: "2023-12-31", revenue: null, ebitda: null, netIncome: null, roe: null, roa: null, debtToEquity: null, freeCashFlow: null, altmanZ: null, centinelaScore: null },
      { periodo: "2024-12-31", revenue: null, ebitda: null, netIncome: null, roe: null, roa: null, debtToEquity: null, freeCashFlow: null, altmanZ: null, centinelaScore: null },
      { periodo: "2025-12-31", revenue: null, ebitda: null, netIncome: null, roe: null, roa: null, debtToEquity: 1928000000 / 3596000000, freeCashFlow: null, altmanZ: null, centinelaScore: null },
    ],
  },
  {
    ticker: "TEO",
    nombre: "Telecom Argentina S.A.",
    sector: "Telecomunicaciones",
    mercado: "Argentina",
    tamano: "Large",
    pais: "Argentina",
    fuente: "real",
    companyType: "market",
    monedaReporte: "ARS",
    tipoCambioUsd: null,
    metrics: {
      periodo: "2025-12-31",
      precio: null,
      variacionDiaria: null,
      marketCap: null,
      revenue: null,
      ebitda: null,
      ebitMargin: null,
      netIncome: null,
      roe: null,
      roa: null,
      margenNeto: null,
      debtToEquity: 5825698000000 / 6863861000000,
      currentRatio: 1833812000000 / 3838300000000,
      quickRatio: null,
      freeCashFlow: null,
      eps: null,
      pe: null,
      pb: null,
      evEbitda: null,
      activosCorrientes: 1833812000000,
      activosTotales: 16622552000000,
      pasivosCorrientes: 3838300000000,
      pasivosTotales: 9639244000000,
      patrimonioNeto: 6863861000000,
      gananciasRetenidas: -170006000000,
      deudaTotal: 5825698000000,
      ebit: 287921000000,
    },
    historico: [
      { periodo: "2023-12-31", revenue: null, ebitda: null, netIncome: null, roe: null, roa: null, debtToEquity: null, freeCashFlow: null, altmanZ: null, centinelaScore: null },
      { periodo: "2024-12-31", revenue: null, ebitda: null, netIncome: null, roe: null, roa: null, debtToEquity: null, freeCashFlow: null, altmanZ: null, centinelaScore: null },
      { periodo: "2025-12-31", revenue: null, ebitda: null, netIncome: null, roe: null, roa: null, debtToEquity: 5825698000000 / 6863861000000, freeCashFlow: null, altmanZ: null, centinelaScore: null },
    ],
  },
  {
    ticker: "CRESY",
    nombre: "Cresud S.A.",
    sector: "Agro",
    mercado: "Argentina",
    tamano: "Mid",
    pais: "Argentina",
    fuente: "real",
    companyType: "market",
    monedaReporte: "ARS",
    tipoCambioUsd: null,
    metrics: {
      periodo: "2026-06-30",
      precio: null,
      variacionDiaria: null,
      marketCap: null,
      revenue: null,
      ebitda: null,
      ebitMargin: null,
      netIncome: null,
      roe: null,
      roa: null,
      margenNeto: null,
      debtToEquity: 2183939000000 / 1454933000000,
      currentRatio: 1824035000000 / 1245115000000,
      quickRatio: null,
      freeCashFlow: null,
      eps: null,
      pe: null,
      pb: null,
      evEbitda: null,
      activosCorrientes: 1824035000000,
      activosTotales: 7244639000000,
      pasivosCorrientes: 1245115000000,
      pasivosTotales: 4090132000000,
      patrimonioNeto: 1454933000000,
      gananciasRetenidas: 158137000000,
      deudaTotal: 2183939000000,
      ebit: 645953000000,
    },
    historico: [
      { periodo: "2024-06-30", revenue: null, ebitda: null, netIncome: null, roe: null, roa: null, debtToEquity: null, freeCashFlow: null, altmanZ: null, centinelaScore: null },
      { periodo: "2025-06-30", revenue: null, ebitda: null, netIncome: null, roe: null, roa: null, debtToEquity: null, freeCashFlow: null, altmanZ: null, centinelaScore: null },
      { periodo: "2026-06-30", revenue: null, ebitda: null, netIncome: null, roe: null, roa: null, debtToEquity: 2183939000000 / 1454933000000, freeCashFlow: null, altmanZ: null, centinelaScore: null },
    ],
  },
  {
    ticker: "LOMA",
    nombre: "Loma Negra C.I.A.S.A.",
    sector: "Materiales",
    mercado: "Argentina",
    tamano: "Mid",
    pais: "Argentina",
    fuente: "real",
    companyType: "market",
    monedaReporte: "ARS",
    tipoCambioUsd: null,
    metrics: {
      periodo: "2025-12-31",
      precio: null,
      variacionDiaria: null,
      marketCap: null,
      revenue: null,
      ebitda: null,
      ebitMargin: null,
      netIncome: null,
      roe: null,
      roa: null,
      margenNeto: null,
      debtToEquity: 303400246000 / 1067218651000,
      currentRatio: 439773439000 / 306101971000,
      quickRatio: null,
      freeCashFlow: null,
      eps: null,
      pe: null,
      pb: null,
      evEbitda: null,
      activosCorrientes: 439773439000,
      activosTotales: 1897943212000,
      pasivosCorrientes: 306101971000,
      pasivosTotales: 831780854000,
      patrimonioNeto: 1067218651000,
      gananciasRetenidas: 23584613000,
      deudaTotal: 303400246000,
      ebit: 89420662000,
    },
    historico: [
      { periodo: "2023-12-31", revenue: null, ebitda: null, netIncome: null, roe: null, roa: null, debtToEquity: null, freeCashFlow: null, altmanZ: null, centinelaScore: null },
      { periodo: "2024-12-31", revenue: null, ebitda: null, netIncome: null, roe: null, roa: null, debtToEquity: null, freeCashFlow: null, altmanZ: null, centinelaScore: null },
      { periodo: "2025-12-31", revenue: null, ebitda: null, netIncome: null, roe: null, roa: null, debtToEquity: 303400246000 / 1067218651000, freeCashFlow: null, altmanZ: null, centinelaScore: null },
    ],
  },
];

interface Ficha {
  ticker: string;
  nombre: string;
  sector: Sector;
  mercado: Mercado;
  pais: string;
  tamano: TamanoEmpresa;
}

const METRICAS_VACIAS: FinancialMetrics = {
  periodo: "",
  precio: null,
  variacionDiaria: null,
  marketCap: null,
  revenue: null,
  ebitda: null,
  ebitMargin: null,
  netIncome: null,
  roe: null,
  roa: null,
  margenNeto: null,
  debtToEquity: null,
  currentRatio: null,
  quickRatio: null,
  freeCashFlow: null,
  eps: null,
  pe: null,
  pb: null,
  evEbitda: null,
  activosCorrientes: null,
  activosTotales: null,
  pasivosCorrientes: null,
  pasivosTotales: null,
  patrimonioNeto: null,
  gananciasRetenidas: null,
  deudaTotal: null,
  ebit: null,
};

function sinRespaldo(f: Ficha): Company {
  return {
    ...f,
    fuente: "real",
    companyType: "market",
    monedaReporte: "USD",
    tipoCambioUsd: null,
    metrics: { ...METRICAS_VACIAS },
    historico: [],
  };
}

const FICHAS_SIN_RESPALDO: Ficha[] = [
  // Argentina
  { ticker: "ALUA", nombre: "Aluar Aluminio Argentino S.A.I.C.", sector: "Materiales", mercado: "Argentina", pais: "Argentina", tamano: "Large" },
  { ticker: "MELI", nombre: "MercadoLibre, Inc.", sector: "Tecnologia", mercado: "Estados Unidos", pais: "Argentina", tamano: "Large" },
  { ticker: "CEPU", nombre: "Central Puerto S.A.", sector: "Energia", mercado: "Argentina", pais: "Argentina", tamano: "Mid" },
  { ticker: "EDN", nombre: "Edenor S.A.", sector: "Energia", mercado: "Argentina", pais: "Argentina", tamano: "Mid" },
  { ticker: "TGS", nombre: "Transportadora de Gas del Sur S.A.", sector: "Energia", mercado: "Argentina", pais: "Argentina", tamano: "Mid" },
  { ticker: "IRS", nombre: "IRSA Inversiones y Representaciones S.A.", sector: "Inmobiliario", mercado: "Argentina", pais: "Argentina", tamano: "Mid" },
  { ticker: "GGAL", nombre: "Grupo Financiero Galicia S.A.", sector: "Finanzas", mercado: "Argentina", pais: "Argentina", tamano: "Large" },
  { ticker: "BMA", nombre: "Banco Macro S.A.", sector: "Finanzas", mercado: "Argentina", pais: "Argentina", tamano: "Large" },
  { ticker: "BBAR", nombre: "BBVA Argentina S.A.", sector: "Finanzas", mercado: "Argentina", pais: "Argentina", tamano: "Large" },
  { ticker: "TS", nombre: "Tenaris S.A.", sector: "Industria", mercado: "Argentina", pais: "Luxemburgo", tamano: "Large" },
  // Brasil
  { ticker: "PBR", nombre: "Petrobras", sector: "Energia", mercado: "Brasil", pais: "Brasil", tamano: "Large" },
  { ticker: "VALE", nombre: "Vale S.A.", sector: "Materiales", mercado: "Brasil", pais: "Brasil", tamano: "Large" },
  { ticker: "ITUB", nombre: "Itaú Unibanco", sector: "Finanzas", mercado: "Brasil", pais: "Brasil", tamano: "Large" },
  { ticker: "NU", nombre: "Nu Holdings (Nubank)", sector: "Finanzas", mercado: "Brasil", pais: "Brasil", tamano: "Large" },
  { ticker: "ABEV", nombre: "Ambev S.A.", sector: "Consumo", mercado: "Brasil", pais: "Brasil", tamano: "Large" },
  { ticker: "GGB", nombre: "Gerdau S.A.", sector: "Industria", mercado: "Brasil", pais: "Brasil", tamano: "Mid" },
  // México
  { ticker: "CX", nombre: "Cemex S.A.B. de C.V.", sector: "Construccion", mercado: "Mexico", pais: "México", tamano: "Large" },
  // Estados Unidos
  { ticker: "AAPL", nombre: "Apple Inc.", sector: "Tecnologia", mercado: "Estados Unidos", pais: "Estados Unidos", tamano: "Large" },
  { ticker: "MSFT", nombre: "Microsoft Corporation", sector: "Tecnologia", mercado: "Estados Unidos", pais: "Estados Unidos", tamano: "Large" },
  { ticker: "KO", nombre: "The Coca-Cola Company", sector: "Consumo", mercado: "Estados Unidos", pais: "Estados Unidos", tamano: "Large" },
  { ticker: "WMT", nombre: "Walmart Inc.", sector: "Consumo", mercado: "Estados Unidos", pais: "Estados Unidos", tamano: "Large" },
  { ticker: "JPM", nombre: "JPMorgan Chase & Co.", sector: "Finanzas", mercado: "Estados Unidos", pais: "Estados Unidos", tamano: "Large" },
  { ticker: "XOM", nombre: "Exxon Mobil Corporation", sector: "Energia", mercado: "Estados Unidos", pais: "Estados Unidos", tamano: "Large" },
  { ticker: "JNJ", nombre: "Johnson & Johnson", sector: "Salud", mercado: "Estados Unidos", pais: "Estados Unidos", tamano: "Large" },
  { ticker: "CAT", nombre: "Caterpillar Inc.", sector: "Industria", mercado: "Estados Unidos", pais: "Estados Unidos", tamano: "Large" },
  { ticker: "DE", nombre: "Deere & Company", sector: "Industria", mercado: "Estados Unidos", pais: "Estados Unidos", tamano: "Large" },
  { ticker: "GE", nombre: "GE Aerospace", sector: "Industria", mercado: "Estados Unidos", pais: "Estados Unidos", tamano: "Large" },
  { ticker: "VMC", nombre: "Vulcan Materials Company", sector: "Construccion", mercado: "Estados Unidos", pais: "Estados Unidos", tamano: "Large" },
  { ticker: "MLM", nombre: "Martin Marietta Materials, Inc.", sector: "Construccion", mercado: "Estados Unidos", pais: "Estados Unidos", tamano: "Large" },
  { ticker: "FLR", nombre: "Fluor Corporation", sector: "Construccion", mercado: "Estados Unidos", pais: "Estados Unidos", tamano: "Mid" },
  // Europa
  { ticker: "SAP", nombre: "SAP SE", sector: "Tecnologia", mercado: "Europa", pais: "Alemania", tamano: "Large" },
  { ticker: "NVO", nombre: "Novo Nordisk A/S", sector: "Salud", mercado: "Europa", pais: "Dinamarca", tamano: "Large" },
  { ticker: "SHEL", nombre: "Shell plc", sector: "Energia", mercado: "Europa", pais: "Reino Unido", tamano: "Large" },
  { ticker: "ABBNY", nombre: "ABB Ltd", sector: "Industria", mercado: "Europa", pais: "Suiza", tamano: "Large" },
  { ticker: "SIEGY", nombre: "Siemens AG", sector: "Industria", mercado: "Europa", pais: "Alemania", tamano: "Large" },
  { ticker: "VCISY", nombre: "Vinci SA", sector: "Construccion", mercado: "Europa", pais: "Francia", tamano: "Large" },
  // Asia
  { ticker: "TSM", nombre: "Taiwan Semiconductor (TSMC)", sector: "Tecnologia", mercado: "Asia", pais: "Taiwán", tamano: "Large" },
  { ticker: "BABA", nombre: "Alibaba Group", sector: "Consumo", mercado: "Asia", pais: "China", tamano: "Large" },
  { ticker: "KMTUY", nombre: "Komatsu Ltd.", sector: "Industria", mercado: "Asia", pais: "Japón", tamano: "Large" },
  { ticker: "KAJMY", nombre: "Kajima Corporation", sector: "Construccion", mercado: "Asia", pais: "Japón", tamano: "Mid" },
];

export const COMPANIES: Company[] = [...RESPALDO_REAL, ...FICHAS_SIN_RESPALDO.map(sinRespaldo)];

export const SECTORES: Array<{ id: Sector; nombre: string }> = [
  { id: "Energia", nombre: "Energía" },
  { id: "Telecomunicaciones", nombre: "Telecomunicaciones" },
  { id: "Finanzas", nombre: "Finanzas" },
  { id: "Industria", nombre: "Industria" },
  { id: "Construccion", nombre: "Construcción" },
  { id: "Agro", nombre: "Agro" },
  { id: "Consumo", nombre: "Consumo" },
  { id: "Materiales", nombre: "Materiales" },
  { id: "Tecnologia", nombre: "Tecnología" },
  { id: "Salud", nombre: "Salud" },
  { id: "Inmobiliario", nombre: "Inmobiliario" },
];

export const MERCADOS: Array<{ id: Mercado; nombre: string; monedaHabitual: string }> = [
  { id: "Argentina", nombre: "Argentina", monedaHabitual: "ARS" },
  { id: "Brasil", nombre: "Brasil", monedaHabitual: "BRL" },
  { id: "Chile", nombre: "Chile", monedaHabitual: "CLP" },
  { id: "Mexico", nombre: "México", monedaHabitual: "MXN" },
  { id: "Estados Unidos", nombre: "Estados Unidos", monedaHabitual: "USD" },
  { id: "Europa", nombre: "Europa", monedaHabitual: "EUR" },
  { id: "Asia", nombre: "Asia", monedaHabitual: "USD" },
];

export const MONEDAS: Array<{ id: string; nombre: string }> = [
  { id: "ARS", nombre: "Peso argentino (ARS)" },
  { id: "USD", nombre: "Dólar estadounidense (USD)" },
  { id: "BRL", nombre: "Real brasileño (BRL)" },
  { id: "CLP", nombre: "Peso chileno (CLP)" },
  { id: "MXN", nombre: "Peso mexicano (MXN)" },
  { id: "COP", nombre: "Peso colombiano (COP)" },
  { id: "UYU", nombre: "Peso uruguayo (UYU)" },
  { id: "PEN", nombre: "Sol peruano (PEN)" },
  { id: "EUR", nombre: "Euro (EUR)" },
  { id: "GBP", nombre: "Libra esterlina (GBP)" },
  { id: "CNY", nombre: "Yuan chino (CNY)" },
  { id: "JPY", nombre: "Yen japonés (JPY)" },
];

/** Etiqueta legible de un id de sector/mercado (los ids no llevan tildes). */
export function nombreSector(id: string): string {
  return SECTORES.find((s) => s.id === id)?.nombre ?? id;
}
export function nombreMercado(id: string): string {
  return MERCADOS.find((m) => m.id === id)?.nombre ?? id;
}

/**
 * Caso insignia de demostración — Semana del Inversor (Pitch de 3 minutos).
 * Empresa PyME metalúrgica del conurbano bonaerense (Quilmes).
 * Paradoja central:
 *   - Balance patrimonial sano (Altman Z'' = 2,8 en zona verde, patrimonio $120M, Current Ratio 2,07x).
 *   - Asfixia inminente de caja: CCC de 85 días (DSO 74d vs DPO 35d = 39 días de descubierto bancario),
 *     ICR ajustado de 1,4x y 30% de deuda en dólares sujeta a riesgo cambiario.
 */
export const EMPRESA_DEMO_PEDRO: Company = {
  ticker: "DEMO-PEDRO",
  nombre: "Metalúrgica Don Pedro S.A. (Demo PyME)",
  sector: "Industria",
  mercado: "Argentina",
  tamano: "Small",
  pais: "Argentina",
  fuente: "propia",
  companyType: "demo",
  monedaReporte: "ARS",
  tipoCambioUsd: 1485.5,
  monedaPrecio: "ARS",
  envivo: false,
  actualizado: null,
  notas: [
    "Caso insignia de demostración: PyME industrial con balance contable sano pero severo estrangulamiento de capital de trabajo y deuda en dólares.",
    "El componente X4 del Altman Z'' utiliza el valor libro del patrimonio neto ($120M) como ajuste metodológico para empresas privadas.",
  ],
  metrics: {
    periodo: "2025-12-31",
    precio: null,
    variacionDiaria: null,
    marketCap: 120_000_000,
    revenue: 365_000_000, // $1M/día: facilita la lectura instantánea en la demo
    costoVentas: 240_000_000,
    cuentasPorCobrar: 74_000_000, // DSO = 74 días
    inventarios: 30_000_000, // DIO = 45.6 días
    cuentasPorPagar: 23_000_000, // DPO = 35 días
    activosCorrientes: 155_000_000,
    activosTotales: 260_000_000,
    pasivosCorrientes: 75_000_000,
    pasivosTotales: 140_000_000,
    deudaTotal: 70_000_000,
    deudaUsdPct: 0.3, // 30% en USD
    deudaArsPct: 0.7, // 70% en ARS
    gastosIntereses: 34_000_000,
    patrimonioNeto: 120_000_000,
    gananciasRetenidas: 45_000_000,
    ebit: 42_000_000,
    ebitda: 48_000_000,
    netIncome: 8_000_000,
    roe: 8_000_000 / 120_000_000,
    roa: 8_000_000 / 260_000_000,
    margenNeto: 8_000_000 / 365_000_000,
    ebitMargin: 42_000_000 / 365_000_000,
    debtToEquity: 70_000_000 / 120_000_000,
    currentRatio: 155_000_000 / 75_000_000,
    quickRatio: (155_000_000 - 30_000_000) / 75_000_000,
    freeCashFlow: -12_000_000,
    eps: null,
    pe: null,
    pb: 1.0,
    evEbitda: (120_000_000 + 70_000_000 - 51_000_000) / 48_000_000,
    dso: 74,
    dio: Math.round(((30_000_000 / 240_000_000) * 365) * 10) / 10,
    dpo: 35,
    ccc: Math.round((74 + (30_000_000 / 240_000_000) * 365 - 35) * 10) / 10,
    icr: Math.round((48_000_000 / 34_000_000) * 100) / 100,
  },
  historico: [
    {
      periodo: "2023-12-31",
      revenue: 280_000_000,
      ebitda: 38_000_000,
      netIncome: 12_000_000,
      roe: 0.12,
      roa: 0.05,
      debtToEquity: 0.45,
      freeCashFlow: 5_000_000,
      altmanZ: 3.1,
      centinelaScore: 78,
    },
    {
      periodo: "2024-12-31",
      revenue: 320_000_000,
      ebitda: 44_000_000,
      netIncome: 10_000_000,
      roe: 0.09,
      roa: 0.04,
      debtToEquity: 0.52,
      freeCashFlow: -2_000_000,
      altmanZ: 2.9,
      centinelaScore: 72,
    },
    {
      periodo: "2025-12-31",
      revenue: 365_000_000,
      ebitda: 48_000_000,
      netIncome: 8_000_000,
      roe: 0.067,
      roa: 0.031,
      debtToEquity: 0.58,
      freeCashFlow: -12_000_000,
      altmanZ: 2.8,
      centinelaScore: 66,
    },
  ],
};

