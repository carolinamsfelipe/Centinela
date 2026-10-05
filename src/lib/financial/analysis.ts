import type { AltmanResult, CentinelaScore, Company } from "@/types";
import { calcularAltman } from "./altman";
import { calcularCentinelaScore } from "./scores";

/**
 * Punto unico de entrada para calcular Altman Z'' y Score Centinela de una
 * empresa. Todas las pantallas pasan por aca (en vez de llamar a
 * calcularAltman / calcularCentinelaScore directo) para que la regla de
 * "a quien aplica el modelo" viva en un solo lugar.
 *
 * El Altman Z'' y los umbrales de liquidez / endeudamiento estan pensados
 * para empresas NO financieras: en un banco el pasivo es el negocio
 * (depositos), no hay activo corriente definido ni EBIT, y un
 * endeudamiento de 90% es normal. Forzar el modelo corporativo sobre un
 * banco produciria numeros sin sentido, asi que para entidades financieras
 * el Altman y el Score quedan "sin dato" con una explicacion, y solo se
 * muestran los indicadores que si tienen lectura (ROE, ROA, patrimonio sobre
 * activos).
 */
export function esEntidadFinanciera(company: Pick<Company, "sector">): boolean {
  return company.sector === "Finanzas";
}

export const NOTA_ENTIDAD_FINANCIERA =
  "El Altman Z'' y el Score Centinela están calibrados para empresas no financieras. En bancos y entidades financieras el pasivo es parte del negocio y no existe activo corriente ni EBIT comparables, por eso no se calculan. Se muestran ROE, ROA y capitalización.";

const ALTMAN_NO_APLICA: AltmanResult = {
  zScore: null,
  x1: null,
  x2: null,
  x3: null,
  x4: null,
  estado: "sin_datos",
  noAplica: true,
  motivoNoDisponible: "No aplica metodológicamente a entidades financieras.",
};

export interface AnalisisCalculado {
  altman: AltmanResult;
  score: CentinelaScore;
  aplicaModeloCorporativo: boolean;
}

export function analizarEmpresa(company: Company): AnalisisCalculado {
  const m = company.metrics;
  if (esEntidadFinanciera(company)) {
    const parcial = calcularCentinelaScore(m, m.marketCap);
    return {
      altman: ALTMAN_NO_APLICA,
      score: {
        total: null,
        estado: "sin_datos",
        categorias: {
          solvencia: { ...parcial.categorias.solvencia, valor: null },
          liquidez: { ...parcial.categorias.liquidez, valor: null },
          rentabilidad: parcial.categorias.rentabilidad,
          endeudamiento: { ...parcial.categorias.endeudamiento, valor: null },
          eficiencia: { ...parcial.categorias.eficiencia, valor: null },
        },
      },
      aplicaModeloCorporativo: false,
    };
  }
  return {
    altman: calcularAltman(m, m.marketCap),
    score: calcularCentinelaScore(m, m.marketCap),
    aplicaModeloCorporativo: true,
  };
}
