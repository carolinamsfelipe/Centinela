/**
 * Configuración centralizada del Score Centinela.
 * Separa pesos y umbrales de normalización de la lógica de cálculo (scores.ts)
 * para poder ajustar la metodología sin tocar código en múltiples lugares.
 * Ver /metodologia en la app para la explicación completa al usuario.
 */
export const SCORE_WEIGHTS = {
  solvencia: 0.25,
  liquidez: 0.2,
  rentabilidad: 0.25,
  endeudamiento: 0.2,
  eficiencia: 0.1,
};

export const NORMALIZATION = {
  altmanZMax: 4,
  liquidezMax: 2,
  roeMax: 0.25,
  roaMax: 0.1,
  margenNetoMax: 0.2,
  ebitMarginMax: 0.2,
  deudaPatrimonioMax: 2,
};

export const SCORE_ESTADO_THRESHOLDS = {
  normal: 70,
  atencion: 45,
};
