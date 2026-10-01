import { Link } from "react-router-dom";

const LINKS = [
  { to: "/empresas", label: "Empresas" },
  { to: "/comparador", label: "Comparador" },
  { to: "/rankings", label: "Rankings" },
  { to: "/mercado", label: "Mercado" },
  { to: "/macro", label: "Macro" },
  { to: "/simulador", label: "Simulador" },
  { to: "/metodologia", label: "Metodología" },
  { to: "/fuentes", label: "Fuentes" },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:justify-between">
          <div>
            <div className="font-mono text-lg font-bold">
              CENTINELA <span className="text-accent">PyME</span>
            </div>
            <p className="mt-1 max-w-sm text-sm text-ink-muted">
              Convertimos datos financieros en señales.
            </p>
          </div>
          <nav className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm text-ink-muted sm:grid-cols-4" aria-label="Enlaces del pie de página">
            {LINKS.map((l) => (
              <Link key={l.to} to={l.to} className="hover:text-ink focus-ring">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-8 border-t border-border pt-6 text-xs leading-relaxed text-ink-muted">
          Centinela PyME es una herramienta educativa y de análisis. La información presentada no
          constituye asesoramiento financiero, recomendación de inversión ni garantía de resultados
          futuros. Los modelos e indicadores utilizados presentan limitaciones y deben interpretarse
          dentro de su contexto. Ver <Link to="/metodologia" className="underline">metodología</Link> y{" "}
          <Link to="/fuentes" className="underline">fuentes</Link>.
        </div>
      </div>
    </footer>
  );
}
