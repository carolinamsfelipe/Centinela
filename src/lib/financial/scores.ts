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

export interface ScoreGradeInfo {
  grado: "A" | "B" | "C" | "D" | "N/D";
  label: string;
  badgeClass: string;
  descripcion: string;
}

export function getScoreGrade(score: number | null): ScoreGradeInfo {
  if (score === null || Number.isNaN(score)) {
    return {
      grado: "N/D",
      label: "Sin datos suficientes",
      badgeClass: "border-border text-ink-muted bg-surface",
      descripcion: "Información financiera insuficiente para computar el índice completo.",
    };
  }
  if (score >= 80) {
    return {
      grado: "A",
      label: "Resiliencia Alta",
      badgeClass: "border-ok/30 bg-ok/10 text-ok",
      descripcion: "Salud patrimonial y operativa robusta; baja probabilidad de tensión de liquidez o quiebra.",
    };
  }
  if (score >= 65) {
    return {
      grado: "B",
      label: "Resiliencia Aceptable",
      badgeClass: "border-accent/30 bg-accent/10 text-accent",
      descripcion: "Estructura financiera sostenible con necesidad de monitoreo en capital de trabajo o endeudamiento.",
    };
  }
  if (score >= 45) {
    return {
      grado: "C",
      label: "Vulnerabilidad Moderada",
      badgeClass: "border-warn/30 bg-warn/10 text-warn",
      descripcion: "Presión en plazos de cobro/inventario o cobertura de pasivos; riesgo latente ante shocks macro.",
    };
  }
  return {
    grado: "D",
    label: "Alerta Crítica",
    badgeClass: "border-bad/30 bg-bad/10 text-bad",
    descripcion: "Severa asfixia de caja, desequilibrio en capital de trabajo o sobreendeudamiento crítico.",
  };
}

export function calcularCentinelaScore(m: FinancialMetrics, marketCap: number | null): CentinelaScore {
  const altman = calcularAltman(m, marketCap);
  const solvencia = normalizar(altman.zScore, NORMALIZATION.altmanZMax);

  const liquidez = normalizar(calcularLiquidez(m), NORMALIZATION.liquidezMax);

  // Quiebra técnica (patrimonio <= 0): penalización máxima, nunca puntaje por cociente de signos negativos.
  const quiebraTecnica = m.patrimonioNeto !== null && m.patrimonioNeto <= 0;

  const rentabilidad = promedio([
    quiebraTecnica ? 0 : normalizar(calcularRoe(m), NORMALIZATION.roeMax),
    normalizar(calcularRoa(m), NORMALIZATION.roaMax),
    normalizar(calcularMargenNeto(m), NORMALIZATION.margenNetoMax),
  ]);

  const endeudamiento = quiebraTecnica
    ? 0
    : normalizarInverso(calcularDeudaSobrePatrimonio(m), NORMALIZATION.deudaPatrimonioMax);

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
  const gradeInfo = getScoreGrade(rawTotal);

  return {
    total: rawTotal === null ? null : Math.round(rawTotal * 10) / 10,
    estado,
    grado: gradeInfo.grado,
    gradoLabel: gradeInfo.label,
    categorias,
  };
}
