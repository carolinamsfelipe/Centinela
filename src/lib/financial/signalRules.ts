/**
 * Umbrales de variación que disparan cada señal en signals.ts.
 * Todas las variaciones se calculan como (período actual - período anterior).
 */
export const SIGNAL_RULES = {
  ROE_CHANGE_THRESHOLD: 0.02,
  DEBT_CHANGE_THRESHOLD: 0.15,
  MARGIN_CHANGE_THRESHOLD: 0.02,
  ALTMAN_DROP_THRESHOLD: 0.3,
};

export const UMBRALES_CAJA = {
  DEUDA_USD_ATENCION: 0.2, // 20%
  DEUDA_USD_ALERTA: 0.5,   // 50%
};
