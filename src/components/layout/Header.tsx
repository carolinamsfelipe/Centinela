import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import { SearchBox } from "./SearchBox";

const NAV_ITEMS = [
  { to: "/empresas", label: "Empresas" },
  { to: "/comparador", label: "Comparador" },
  { to: "/rankings", label: "Rankings" },
  { to: "/mercado", label: "Mercado" },
  { to: "/macro", label: "Macro" },
  { to: "/simulador", label: "Simulador" },
  { to: "/mi-empresa", label: "Mi empresa" },
  { to: "/asesores", label: "Asesores" },
  { to: "/favoritos", label: "Favoritos" },
  { to: "/metodologia", label: "Metodología" },
];

function navClass({ isActive }: { isActive: boolean }) {
  return `rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-ring ${
    isActive ? "text-accent" : "text-ink-muted hover:text-ink"
  }`;
}

export function Header() {
  const { dark, toggle } = useTheme();
  const [menuAbierto, setMenuAbierto] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 lg:px-8">
        <NavLink
          to="/"
          className="mr-3 flex items-center gap-2.5 border-r border-border/80 pr-4 font-mono text-lg font-bold tracking-tight text-ink transition-opacity hover:opacity-90 sm:mr-5 sm:pr-6"
        >
          <img src="/shield.svg" alt="" className="h-7 w-7" aria-hidden="true" />
          CENTINELA
        </NavLink>

        <nav className="hidden flex-1 items-center gap-1 lg:flex" aria-label="Navegación principal">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} className={navClass} end={item.to === "/"}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden w-64 lg:block">
          <SearchBox />
        </div>

        <button
          onClick={toggle}
          aria-label={dark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
          className="rounded-lg border border-border p-2 text-ink-muted hover:text-ink focus-ring"
        >
          {dark ? "☀️" : "🌙"}
        </button>

        <button
          className="rounded-lg border border-border p-2 lg:hidden focus-ring"
          aria-label="Abrir menú"
          aria-expanded={menuAbierto}
          onClick={() => setMenuAbierto((v) => !v)}
        >
          ☰
        </button>
      </div>

      {menuAbierto && (
        <div className="border-t border-border px-4 py-3 lg:hidden">
          <div className="mb-3">
            <SearchBox />
          </div>
          <nav className="flex flex-col gap-1" aria-label="Navegación móvil">
            {[{ to: "/", label: "Inicio" }, ...NAV_ITEMS].map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={navClass}
                end={item.to === "/"}
                onClick={() => setMenuAbierto(false)}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
