import type { Company, Estado } from "@/types";
import { diagnosticarCcc, diagnosticarDpo, diagnosticarDso, diagnosticarIcr } from "./diagnostics";
import { UMBRALES_CAJA } from "./signalRules";
import { fmtMonto, fmtNum, fmtPct } from "../format";

export interface AlertaCaja {
  id: string;
  categoria: "liquidez" | "cobertura" | "cambiario" | "fcf";
  estado: "alerta" | "atencion";
  titulo: string;
  detalle: string;
  valorTexto: string;
}

/**
 * Genera alertas de caja tempranas estrictamente sobre datos reportados reales
 * de la empresa (omitiendo valores estimados o imputados por mediana sectorial).
 */
export function generarAlertasCaja(company: Company): AlertaCaja[] {
  const m = company.metrics;
  const alertas: AlertaCaja[] = [];

  // 1. Ciclo de Conversión de Efectivo (CCC)
  if (m.ccc != null && Number.isFinite(m.ccc)) {
    const diag = diagnosticarCcc(m.ccc);
    if (diag.estado === "alerta" || diag.estado === "atencion") {
      alertas.push({
        id: "ccc",
        categoria: "liquidez",
        estado: diag.estado,
        titulo: "Ciclo de caja prolongado",
        detalle: diag.mensaje,
        valorTexto: `${fmtNum(m.ccc, 0)} días`,
      });
    }
  }

  // 2. Días de cobro (DSO)
  if (m.dso != null && Number.isFinite(m.dso)) {
    const diag = diagnosticarDso(m.dso);
    if (diag.estado === "alerta" || diag.estado === "atencion") {
      alertas.push({
        id: "dso",
        categoria: "liquidez",
        estado: diag.estado,
        titulo: "Cobranzas demoradas (DSO)",
        detalle: diag.mensaje,
        valorTexto: `${fmtNum(m.dso, 0)} días`,
      });
    }
  }

  // 3. Días de pago a proveedores (DPO)
  if (m.dpo != null && Number.isFinite(m.dpo)) {
    const diag = diagnosticarDpo(m.dpo);
    if (diag.estado === "atencion") {
      alertas.push({
        id: "dpo",
        categoria: "liquidez",
        estado: "atencion",
        titulo: "Plazo de pago corto (DPO)",
        detalle: diag.mensaje,
        valorTexto: `${fmtNum(m.dpo, 0)} días`,
      });
    }
  }

  // 4. Cobertura de intereses (ICR)
  if (m.icr != null && Number.isFinite(m.icr)) {
    const sinIntereses = m.gastosIntereses === 0 && m.deudaTotal === 0;
    const diag = diagnosticarIcr(m.icr, sinIntereses);
    if (diag.estado === "alerta" || diag.estado === "atencion") {
      alertas.push({
        id: "icr",
        categoria: "cobertura",
        estado: diag.estado,
        titulo: "Cobertura de intereses ajustada",
        detalle: diag.mensaje,
        valorTexto: `${fmtNum(m.icr, 2)}x`,
      });
    }
  }

  // 5. Exposición cambiaria en deuda (% deuda en USD)
  if (m.deudaUsdPct != null && Number.isFinite(m.deudaUsdPct)) {
    if (m.deudaUsdPct >= UMBRALES_CAJA.DEUDA_USD_ALERTA) {
      alertas.push({
        id: "fx",
        categoria: "cambiario",
        estado: "alerta",
        titulo: "Alta exposición de deuda en USD",
        detalle: `El ${fmtPct(m.deudaUsdPct)} de la deuda está en dólares. Un salto cambiario impacta directamente sobre el patrimonio y la liquidez.`,
        valorTexto: fmtPct(m.deudaUsdPct),
      });
    } else if (m.deudaUsdPct >= UMBRALES_CAJA.DEUDA_USD_ATENCION) {
      alertas.push({
        id: "fx",
        categoria: "cambiario",
        estado: "atencion",
        titulo: "Exposición cambiaria moderada",
        detalle: `El ${fmtPct(m.deudaUsdPct)} de la deuda está en dólares. Vulnerable a depreciaciones de la moneda local.`,
        valorTexto: fmtPct(m.deudaUsdPct),
      });
    }
  }

  // 6. Free Cash Flow (FCF) negativo
  if (m.freeCashFlow != null && m.freeCashFlow < 0) {
    alertas.push({
      id: "fcf",
      categoria: "fcf",
      estado: "alerta",
      titulo: "Flujo de caja libre negativo",
      detalle: "La empresa quema efectivo luego de cubrir operaciones e inversiones de capital.",
      valorTexto: fmtMonto(m.freeCashFlow, company),
    });
  }

  return alertas;
}
