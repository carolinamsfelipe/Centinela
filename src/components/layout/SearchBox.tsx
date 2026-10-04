import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { nombreMercado, nombreSector } from "@/data/companies";
import { useDebounce } from "@/hooks/useDebounce";
import { searchCompanies } from "@/services/companyService";
import type { Company } from "@/types";

export function SearchBox({ grande = false }: { grande?: boolean }) {
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<Company[]>([]);
  const [abierto, setAbierto] = useState(false);
  const debounced = useDebounce(query, 250);
  const navigate = useNavigate();

  useEffect(() => {
    let activo = true;
    if (debounced.length < 1) {
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

  function irA(ticker: string) {
    setAbierto(false);
    setQuery("");
    navigate(`/empresas/${ticker}`);
  }

  return (
    <div className="relative w-full">
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        placeholder="Buscar empresa, ticker, sector o mercado..."
        aria-label="Buscar empresa, ticker, sector o mercado"
        className={`w-full rounded-xl border border-border bg-surface text-ink placeholder:text-ink-muted focus-ring ${
          grande ? "px-5 py-4 text-lg" : "px-4 py-2 text-sm"
        }`}
      />
      {abierto && resultados.length > 0 && (
        <ul className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
          {resultados.slice(0, 6).map((c) => (
            <li key={c.ticker}>
              <button
                onMouseDown={() => irA(c.ticker)}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-accent-soft focus-ring"
              >
                <span>
                  <span className="font-semibold">{c.nombre}</span>{" "}
                  <span className="text-ink-muted">{c.fuente === "propia" ? "mi empresa" : c.ticker}</span>
                </span>
                <span className="text-xs text-ink-muted">
                  {nombreMercado(c.mercado)} · {nombreSector(c.sector)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
