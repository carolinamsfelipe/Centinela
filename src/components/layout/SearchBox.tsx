import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { nombreMercado, nombreSector } from "@/data/companies";
import { useDebounce } from "@/hooks/useDebounce";
import { searchCompanies } from "@/services/companyService";
import type { Company } from "@/types";

const SUGERENCIAS_INICIALES: Array<{
  ticker: string;
  nombre: string;
  sector: string;
  mercado: string;
}> = [
  { ticker: "YPF", nombre: "YPF S.A.", sector: "Energía", mercado: "Argentina" },
  { ticker: "PAM", nombre: "Pampa Energía S.A.", sector: "Energía", mercado: "Argentina" },
  { ticker: "ALUA", nombre: "Aluar", sector: "Materiales", mercado: "Argentina" },
  { ticker: "AAPL", nombre: "Apple Inc.", sector: "Tecnología", mercado: "Estados Unidos" },
  { ticker: "MELI", nombre: "MercadoLibre, Inc.", sector: "Tecnología", mercado: "Estados Unidos" },
  { ticker: "PBR", nombre: "Petrobras", sector: "Energía", mercado: "Brasil" },
  { ticker: "TS", nombre: "Tenaris S.A.", sector: "Industria", mercado: "Argentina" },
];

export function SearchBox({
  grande = false,
  placeholder = "Buscar empresa, ticker, sector o mercado...",
  className = "",
}: {
  grande?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<Company[]>([]);
  const [abierto, setAbierto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounced = useDebounce(query, 200);
  const navigate = useNavigate();

  useEffect(() => {
    let activo = true;
    if (debounced.trim().length < 1) {
      setResultados([]);
      return;
    }
    searchCompanies(debounced).then((r) => {
      if (activo) setResultados(r);
    });
    return () => {
      activo = false;
    };
  }, [debounced]);

  // Cierra si el usuario hace clic fuera del contenedor
  useEffect(() => {
    function handleClickAfuera(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", handleClickAfuera);
    return () => {
      document.removeEventListener("mousedown", handleClickAfuera);
    };
  }, []);

  function irA(ticker: string) {
    setAbierto(false);
    setQuery("");
    navigate(`/empresas/${ticker}`);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (resultados.length > 0) {
        irA(resultados[0].ticker);
      } else if (query.trim().length === 0 && SUGERENCIAS_INICIALES.length > 0) {
        irA(SUGERENCIAS_INICIALES[0].ticker);
      }
    } else if (e.key === "Escape") {
      setAbierto(false);
    }
  }

  const mostrarSugerencias = abierto && query.trim().length === 0;
  const mostrarResultados = abierto && query.trim().length > 0;

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative flex items-center">
        {/* Ícono de búsqueda */}
        <span
          className={`pointer-events-none absolute left-4 text-ink-muted ${
            grande ? "text-lg" : "text-sm"
          }`}
          aria-hidden="true"
        >
          🔍
        </span>

        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setAbierto(true);
          }}
          onFocus={() => setAbierto(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label={placeholder}
          className={`w-full rounded-xl border border-border bg-surface text-ink placeholder:text-ink-muted focus-ring transition-colors ${
            grande ? "pl-11 pr-10 py-3.5 text-base sm:text-lg" : "pl-9 pr-8 py-2 text-sm"
          }`}
        />

        {query.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResultados([]);
            }}
            aria-label="Limpiar búsqueda"
            className="absolute right-3 text-xs font-mono text-ink-muted hover:text-ink px-1.5 py-0.5 rounded"
          >
            ✕
          </button>
        )}
      </div>

      {/* DROPDOWN DE SUGERENCIAS AL HACER FOCO / CLIC */}
      {mostrarSugerencias && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-border bg-surface shadow-xl">
          <div className="flex items-center justify-between border-b border-border bg-bg/60 px-4 py-2 text-xs font-mono text-ink-muted">
            <span className="font-semibold uppercase tracking-wider text-accent">
              Referentes recomendados para comparar
            </span>
            <span className="text-[11px]">Hacé clic en uno</span>
          </div>
          <ul className="max-h-72 overflow-y-auto divide-y divide-border/40">
            {SUGERENCIAS_INICIALES.map((item) => (
              <li key={item.ticker}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    irA(item.ticker);
                  }}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-accent-soft focus-ring transition-colors cursor-pointer group"
                >
                  <span className="flex items-center gap-2">
                    <span className="font-semibold text-ink group-hover:text-accent transition-colors">
                      {item.nombre}
                    </span>
                    <span className="rounded bg-bg px-1.5 py-0.5 font-mono text-xs font-bold text-ink-muted">
                      {item.ticker}
                    </span>
                  </span>
                  <span className="text-xs text-ink-muted">
                    {item.mercado} · {item.sector}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* DROPDOWN DE RESULTADOS EN VIVO */}
      {mostrarResultados && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-border bg-surface shadow-xl">
          {resultados.length > 0 ? (
            <ul className="max-h-72 overflow-y-auto divide-y divide-border/40">
              {resultados.slice(0, 8).map((c) => (
                <li key={c.ticker}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      irA(c.ticker);
                    }}
                    className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-accent-soft focus-ring transition-colors cursor-pointer group"
                  >
                    <span>
                      <span className="font-semibold text-ink group-hover:text-accent transition-colors">
                        {c.nombre}
                      </span>{" "}
                      <span className="font-mono text-xs text-ink-muted">
                        {c.fuente === "propia" ? "· mi empresa" : `(${c.ticker})`}
                      </span>
                    </span>
                    <span className="text-xs text-ink-muted">
                      {nombreMercado(c.mercado)} · {nombreSector(c.sector)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-center text-sm text-ink-muted">
              No encontramos empresas con &quot;<span className="font-mono text-ink font-semibold">{query}</span>&quot;.
              <div className="mt-2">
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setAbierto(false);
                    navigate("/empresas");
                  }}
                  className="font-mono text-xs font-semibold text-accent hover:underline cursor-pointer"
                >
                  Explorar todo el universo (43 cotizantes) →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
