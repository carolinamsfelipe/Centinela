export type Estado = "alerta" | "atencion" | "normal" | "sin_datos";

export type Sector =
  | "Energia"
  | "Telecomunicaciones"
  | "Finanzas"
  | "Industria"
  | "Construccion"
  | "Agro"
  | "Consumo"
  | "Materiales";

export type Mercado = "Argentina" | "Internacional";

export type TamanoEmpresa = "Small" | "Mid" | "Large";

export type FuenteDato = "real" | "demo";

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
  metrics: FinancialMetrics;
  historico: HistoricalPoint[];
}

export interface MacroIndicator {
  id: string;
  nombre: string;
  valor: number | null;
  unidad: string;
  variacion: number | null;
  fecha: string;
  fuente: string;
}

export interface RiesgoEtiqueta {
  estado: Estado;
  mensaje: string;
}

export interface CompanyComparison {
  tickers: string[];
}
