import type { CSSProperties } from "react";

/**
 * Estilo comun de los tooltips de Recharts. Sin esto Recharts dibuja un
 * cuadro blanco con letra gris clara que en el tema oscuro casi no se lee.
 * Los nombres de cada serie conservan el color de su linea (no se pisa
 * itemStyle); solo se fija el fondo, el borde y el titulo.
 */
export const TOOLTIP_CONTENT_STYLE: CSSProperties = {
  background: "rgb(var(--surface))",
  border: "1px solid rgb(var(--border))",
  borderRadius: 8,
  fontSize: 12,
  boxShadow: "0 4px 12px rgb(0 0 0 / 0.18)",
};

export const TOOLTIP_LABEL_STYLE: CSSProperties = {
  color: "rgb(var(--ink))",
  fontWeight: 600,
  marginBottom: 4,
};
