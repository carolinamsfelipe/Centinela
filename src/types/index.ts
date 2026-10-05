export type Estado = "alerta" | "atencion" | "normal" | "sin_datos";

export type Sector =
  | "Energia"
  | "Telecomunicaciones"
  | "Finanzas"
  | "Industria"
  | "Construccion"
  | "Agro"
  | "Consumo"
  | "Materiales"
  | "Tecnologia"
  | "Salud"
  | "Inmobiliario";

export type Mercado =
  | "Argentina"
  | "Brasil"
  | "Chile"
  | "Mexico"
  | "Estados Unidos"
  | "Europa"
  | "Asia";

export type TamanoEmpresa = "Small" | "Mid" | "Large";

export type CompanyType = "market" | "user" | "demo";

/** "real": cotiza y se consulta en vivo a Yahoo Finance. "propia": balance cargado por el usuario. */
export type FuenteDato = "real" | "propia";

export interface FinancialMetrics {
  periodo: string;
  precio: number | null;
  variacionDiaria: number | null;
  marketCap: number | null;
  revenue: number | null;
  ebitda: number | null;
  ebitMargin: number | null;
  netIncome: number | null;
  roe: number | null;
  roa: number | null;
  margenNeto: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  quickRatio: number | null;
  freeCashFlow: number | null;
  eps: number | null;
  pe: number | null;
  pb: number | null;
  evEbitda: number | null;
  activosCorrientes: number | null;
  activosTotales: number | null;
  pasivosCorrientes: number | null;
  pasivosTotales: number | null;
  patrimonioNeto: number | null;
  gananciasRetenidas: number | null;
  deudaTotal: number | null;
  ebit: number | null;
}

export interface AltmanResult {
  zScore: number | null;
  x1: number | null;
  x2: number | null;
  x3: number | null;
  x4: number | null;
  estado: Estado;
  motivoNoDisponible?: string;
  noAplica?: boolean;
}

export interface CategoriaScore {
  nombre: string;
  valor: number | null;
  peso: number;
}

export interface CentinelaScore {
  total: number | null;
  estado: Estado;
  categorias: {
    solvencia: CategoriaScore;
    liquidez: CategoriaScore;
    rentabilidad: CategoriaScore;
    endeudamiento: CategoriaScore;
    eficiencia: CategoriaScore;
  };
}

export interface Signal {
  id: string;
  tipo: "positiva" | "advertencia" | "negativa";
  titulo: string;
  descripcion: string;
}

export interface HistoricalPoint {
  periodo: string;
  revenue: number | null;
  ebitda: number | null;
  netIncome: number | null;
  roe: number | null;
  roa: number | null;
  debtToEquity: number | null;
  freeCashFlow: number | null;
  altmanZ: number | null;
  centinelaScore: number | null;
}

export interface Company {
  ticker: string;
  nombre: string;
  sector: Sector;
  mercado: Mercado;
  tamano: TamanoEmpresa;
  pais: string;
  fuente: FuenteDato;
  companyType: CompanyType;
  metrics: FinancialMetrics;
  historico: HistoricalPoint[];
  /** true si metrics vino de Yahoo Finance recien, false/undefined si es el respaldo estatico. */
  envivo?: boolean;
  /** timestamp ISO de cuando se consulto en vivo (null si nunca se pudo). */
  actualizado?: string | null;
  /** Moneda en la que estan expresadas las magnitudes de balance y resultados (ISO 4217). */
  monedaReporte: string;
  /** Unidades de monedaReporte por 1 USD (1 si ya es USD, null si no hay cotizacion disponible). */
  tipoCambioUsd: number | null;
  /** Moneda del precio de la accion (USD para los ADR). */
  monedaPrecio?: string | null;
  /** Aclaraciones sobre aproximaciones o datos faltantes, mostradas en ficha e informes. */
  notas?: string[];
  /** Solo empresas propias: ISO de cuando se cargo. */
  creada?: string;
}

export interface MacroIndicator {
  id: string;
  nombre: string;
  valor: number | null;
  unidad: string;
  variacion: number | null;
  fecha: string;
  fuente: string;
  historico?: Array<{ periodo: string; valor: number }>;
  /** Solo indicadores de referencia global: mercado al que da contexto ("Global" si aplica a todos). */
  mercado?: string;
}

export interface RiesgoEtiqueta {
  estado: Estado;
  mensaje: string;
}

export interface CompanyComparison {
  tickers: string[];
}
