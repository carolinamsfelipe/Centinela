import { COMPANIES } from "@/data/companies";
import { calcularAltman } from "@/lib/financial/altman";
import { calcularCentinelaScore } from "@/lib/financial/scores";
import { generarSenales } from "@/lib/financial/signals";
import type { Company } from "@/types";

/**
 * Capa de acceso a datos de empresas. Hoy lee de /data/companies.ts (mock);
 * la UI consume estas funciones, nunca el array COMPANIES directamente, para
 * poder reemplazar la fuente por una API real (ver sección 30) sin tocar
 * componentes.
 */
export async function getCompanies(): Promise<Company[]> {
  return COMPANIES;
}

export async function getCompanyByTicker(ticker: string): Promise<Company | undefined> {
  return COMPANIES.find((c) => c.ticker === ticker);
}

export async function getCompanyAnalysis(ticker: string) {
  const company = await getCompanyByTicker(ticker);
  if (!company) return undefined;
  const altman = calcularAltman(company.metrics, company.metrics.marketCap);
  const score = calcularCentinelaScore(company.metrics, company.metrics.marketCap);
  const senales = generarSenales(company);
  return { company, altman, score, senales };
}

export async function searchCompanies(query: string): Promise<Company[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return COMPANIES.filter(
    (c) =>
      c.nombre.toLowerCase().includes(q) ||
      c.ticker.toLowerCase().includes(q) ||
      c.sector.toLowerCase().includes(q)
  );
}
