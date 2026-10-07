import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { EMPRESA_DEMO_PEDRO } from "@/data/companies";
import { fmtMonto } from "@/lib/format";
import { getCompanies } from "@/services/companyService";
import { listarEmpresasPropias } from "@/services/userCompanies";
import type { PeriodoBalance } from "@/services/userCompanies";
import type { Company } from "@/types";
import { construirModelo } from "./model";
import type { ModeloV2 } from "./model";

export const EMPRESA_POR_DEFECTO = EMPRESA_DEMO_PEDRO.ticker;

/** Filtros globales en la URL: ?empresa=DEMO-PEDRO&periodo=2025-12-31&moneda=ARS */
export function useV2Filters() {
  const [params, setParams] = useSearchParams();
  const empresa = params.get("empresa") ?? EMPRESA_POR_DEFECTO;
  const periodo = params.get("periodo");
  const moneda = params.get("moneda");
  const set = useCallback(
    (cambios: Record<string, string | null>) => {
      setParams(
        (prev) => {
          const n = new URLSearchParams(prev);
          Object.entries(cambios).forEach(([k, v]) => (v === null ? n.delete(k) : n.set(k, v)));
          return n;
        },
        { replace: true }
      );
    },
    [setParams]
  );
  return { empresa, periodo, moneda, set };
}

interface V2Ctx {
  companies: Company[] | null;
  cargando: boolean;
  modelo: ModeloV2 | null;
  monedaNativa: string;
  monedaVista: string;
  /** Formatea una magnitud en la moneda elegida en la barra superior. */
  fm: (v: number | null | undefined, conSigno?: boolean) => string;
  recargar: () => void;
}

const Ctx = createContext<V2Ctx | null>(null);

export function V2Provider({ children }: { children: ReactNode }) {
  const { empresa, periodo, moneda } = useV2Filters();
  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let vivo = true;
    getCompanies()
      .then((c) => vivo && setCompanies(c))
      .catch(() => vivo && setCompanies([EMPRESA_DEMO_PEDRO]));
    return () => {
      vivo = false;
    };
  }, [version]);

  const company = useMemo(() => {
    if (!companies) return null;
    return companies.find((c) => c.ticker === empresa) ?? companies.find((c) => c.ticker === EMPRESA_POR_DEFECTO) ?? companies[0] ?? null;
  }, [companies, empresa]);

  const periodos: PeriodoBalance[] | null = useMemo(() => {
    if (!company || company.companyType !== "user") return null;
    return listarEmpresasPropias().find((e) => e.id === company.ticker)?.periodos ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company, version]);

  const modelo = useMemo(() => (company ? construirModelo(company, periodos, periodo) : null), [company, periodos, periodo]);

  const monedaNativa = company?.monedaReporte ?? "ARS";
  const monedaVista = moneda === "USD" ? "USD" : moneda && moneda === monedaNativa ? monedaNativa : monedaNativa;

  const fm = useCallback(
    (v: number | null | undefined, conSigno = false) => {
      if (v === null || v === undefined || !Number.isFinite(v)) return "Sin dato";
      if (!company) return String(v);
      const txt = fmtMonto(v, company, monedaVista === "USD" ? "usd" : "nativa");
      return conSigno && v > 0 ? `+${txt}` : txt;
    },
    [company, monedaVista]
  );

  const value: V2Ctx = {
    companies,
    cargando: companies === null,
    modelo,
    monedaNativa,
    monedaVista,
    fm,
    recargar: () => setVersion((x) => x + 1),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useV2(): V2Ctx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useV2 debe usarse dentro de <V2Provider>.");
  return c;
}
