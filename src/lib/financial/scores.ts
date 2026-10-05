import type { CentinelaScore, Estado, FinancialMetrics } from "@/types";
import { calcularAltman } from "./altman";
import {
  calcularDeudaSobrePatrimonio,
  calcularLiquidez,
  calcularMargenNeto,
  calcularRoa,
  calcularRoe,
} from "./ratios";
import { NORMALIZATION, SCORE_ESTADO_THRESHOLDS, SCORE_WEIGHTS } from "./scoreConfig";

function clamp01to100(v: number): number {
  return Math.max(0, Math.min(100, v));
}

function normalizar(valor: number | null, max: number): number | null {
  if (valor === null) return null;
  return clamp01to100((valor / max) * 100);
}

function normalizarInverso(valor: number | null, max: number): number | null {
  if (valor === null) return null;
  return clamp01to100(100 - (valor / max) * 100);
}

function promedio(valores: Array<number | null>): number | null {
  const validos = valores.filter((v): v is number => v !== null);
  if (validos.length === 0) return null;
  return validos.reduce((a, b) => a + b, 0) / validos.length;
}

export function getRiskLevel(score: number | null): Estado {
  if (score === null || Number.isNaN(score)) return "sin_datos";
  if (score >= SCORE_ESTADO_THRESHOLDS.normal) return "normal";
  if (score >= SCORE_ESTADO_THRESHOLDS.atencion) return "atencion";
  return "alerta";
}

export function calcularCentinelaScore(m: FinancialMetrics, marketCap: number | null): CentinelaScore {
  const altman = calcularAltman(m, marketCap);
  const solvencia = normalizar(altman.zScore, NORMALIZATION.altmanZMax);

  const liquidez = normalizar(calcularLiquidez(m), NORMALIZATION.liquidezMax);

  const rentabilidad = promedio([
    normalizar(calcularRoe(m), NORMALIZATION.roeMax),
    normalizar(calcularRoa(m), NORMALIZATION.roaMax),
    normalizar(calcularMargenNeto(m), NORMALIZATION.margenNetoMax),
  ]);

  const endeudamiento = normalizarInverso(calcularDeudaSobrePatrimonio(m), NORMALIZATION.deudaPatrimonioMax);

  const eficiencia = normalizar(m.ebitMargin, NORMALIZATION.ebitMarginMax);

  const categorias = {
    solvencia: { nombre: "Solvencia", valor: solvencia, peso: SCORE_WEIGHTS.solvencia },
    liquidez: { nombre: "Liquidez", valor: liquidez, peso: SCORE_WEIGHTS.liquidez },
    rentabilidad: { nombre: "Rentabilidad", valor: rentabilidad, peso: SCORE_WEIGHTS.rentabilidad },
    endeudamiento: { nombre: "Endeudamiento", valor: endeudamiento, peso: SCORE_WEIGHTS.endeudamiento },
    eficiencia: { nombre: "Eficiencia", valor: eficiencia, peso: SCORE_WEIGHTS.eficiencia },
  };

  const disponibles = Object.values(categorias).filter((c) => c.valor !== null);
  const pesoTotalDisponible = disponibles.reduce((acc, c) => acc + c.peso, 0);
  const rawTotal =
    disponibles.length === 0
      ? null
      : disponibles.reduce((acc, c) => acc + (c.valor as number) * c.peso, 0) / pesoTotalDisponible;

  // Clasificacion rigurosa sobre el valor continuo real, nunca sobre el redondeo.
  const estado = getRiskLevel(rawTotal);

  return {
    total: rawTotal === null ? null : Math.round(rawTotal * 10) / 10,
    estado,
    categorias,
  };
}
