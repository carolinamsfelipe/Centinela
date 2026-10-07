import type { Company, Signal } from "@/types";
import { SIGNAL_RULES } from "./signalRules";

/**
 * Motor de señales: compara el período más reciente del histórico contra el
 * anterior y dispara señales explícitas basadas en SIGNAL_RULES. No infiere
 * causas ni inventa señales fuera de estas reglas documentadas.
 */
export function generarSenales(company: Company): Signal[] {
  const historico = company.historico;
  if (historico.length < 2) return [];

  const actual = historico[historico.length - 1];
  const anterior = historico[historico.length - 2];
  const senales: Signal[] = [];

  if (actual.roe !== null && anterior.roe !== null) {
    const delta = actual.roe - anterior.roe;
    if (delta >= SIGNAL_RULES.ROE_CHANGE_THRESHOLD) {
      senales.push({
        id: `${company.ticker}-roe-up`,
        tipo: "positiva",
        titulo: "Mejora de rentabilidad",
        descripcion: `El ROE subió ${(delta * 100).toFixed(1)} puntos porcentuales respecto del período anterior.`,
      });
    }
  }

  if (actual.debtToEquity !== null && anterior.debtToEquity !== null) {
    const delta = actual.debtToEquity - anterior.debtToEquity;
    if (delta <= -SIGNAL_RULES.DEBT_CHANGE_THRESHOLD) {
      senales.push({
        id: `${company.ticker}-debt-down`,
        tipo: "positiva",
        titulo: "Reducción de deuda",
        descripcion: `La relación Deuda/Patrimonio bajó de ${anterior.debtToEquity.toFixed(2)}x a ${actual.debtToEquity.toFixed(2)}x.`,
      });
    } else if (delta >= SIGNAL_RULES.DEBT_CHANGE_THRESHOLD) {
      senales.push({
        id: `${company.ticker}-debt-up`,
        tipo: "advertencia",
        titulo: "Aumento de endeudamiento",
        descripcion: `La relación Deuda/Patrimonio subió de ${anterior.debtToEquity.toFixed(2)}x a ${actual.debtToEquity.toFixed(2)}x.`,
      });
    }
  }

  const margenActual =
    company.metrics.margenNeto ??
    (actual.revenue && actual.revenue > 0 && actual.netIncome !== null ? actual.netIncome / actual.revenue : null);
  const penultimo = historico[historico.length - 2];
  const margenAnterior =
    penultimo.revenue && penultimo.revenue > 0 && penultimo.netIncome !== null
      ? penultimo.netIncome / penultimo.revenue
      : null;

  if (margenActual !== null && margenAnterior !== null) {
    const deltaMargen = margenActual - margenAnterior;
    if (deltaMargen <= -SIGNAL_RULES.MARGIN_CHANGE_THRESHOLD) {
      senales.push({
        id: `${company.ticker}-margin-down`,
        tipo: "advertencia",
        titulo: "Caída de margen",
        descripcion: `El margen neto cayó ${(Math.abs(deltaMargen) * 100).toFixed(1)} puntos porcentuales respecto del período anterior.`,
      });
    }
  }

  if (actual.altmanZ !== null && anterior.altmanZ !== null) {
    const delta = actual.altmanZ - anterior.altmanZ;
    if (delta <= -SIGNAL_RULES.ALTMAN_DROP_THRESHOLD) {
      senales.push({
        id: `${company.ticker}-altman-down`,
        tipo: "negativa",
        titulo: "Deterioro significativo de solvencia",
        descripcion: `El Altman Z'' bajó de ${anterior.altmanZ.toFixed(2)} a ${actual.altmanZ.toFixed(2)}.`,
      });
    }
  }

  const currentRatioActual = company.metrics.currentRatio;
  if (currentRatioActual !== null && currentRatioActual < 1) {
    senales.push({
      id: `${company.ticker}-liquidity-warning`,
      tipo: "advertencia",
      titulo: "Alerta de liquidez",
      descripcion: "El ratio de liquidez corriente se encuentra por debajo de 1.",
    });
  }

  return senales;
}
