import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useFavorites } from "@/hooks/useFavorites";
import { nombreMercado, nombreSector } from "@/data/companies";
import { fmtNum, fmtPct } from "@/lib/format";
import { getCompanyAnalysis } from "@/services/companyService";

type Analisis = Awaited<ReturnType<typeof getCompanyAnalysis>>;

function fmtPrecio(v: number | null, moneda: string | null | undefined): string {
  if (v === null) return "N/D";
  return `${moneda ?? "USD"} ${v.toFixed(2)}`;
}

function VariacionTexto({ v }: { v: number | null }) {
  if (v === null) return <span className="text-ink-muted">N/D</span>;
  const clase = v > 0 ? "text-ok" : v < 0 ? "text-bad" : "text-ink-muted";
  const signo = v > 0 ? "+" : "";
  return <span className={clase}>{signo}{fmtPct(v)}</span>;
}

export function Favoritos() {
  const { favorites, toggleFavorite } = useFavorites();
  const [analisis, setAnalisis] = useState<Record<string, Analisis | null>>({});

  useEffect(() => {
    let activo = true;
    Promise.all(
      favorites.map(async (ticker) => [ticker, (await getCompanyAnalysis(ticker)) ?? null] as const)
    ).then((entradas) => {
      if (!activo) return;
      setAnalisis(Object.fromEntries(entradas));
    });
    return () => {
      activo = false;
    };
  }, [favorites]);

  if (favorites.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center">
        <p className="text-lg text-ink">Todavía no marcaste ninguna empresa como favorita.</p>
        <p className="mt-2 text-sm text-ink-muted">
          Abrí la ficha de cualquier empresa y tocá &quot;⭐ Favoritos&quot; para guardarla acá y
          hacerle seguimiento rápido.
        </p>
        <Link to="/empresas" className="mt-4 inline-block text-accent hover:underline">
          Ir al explorador de empresas
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <h1 className="text-2xl font-bold text-ink">Favoritos</h1>
      <p className="mt-1 text-sm text-ink-muted">
        {favorites.length} {favorites.length === 1 ? "empresa guardada" : "empresas guardadas"} para
        seguimiento rápido.
      </p>

      <div className="mt-6 space-y-4">
        {favorites.map((ticker) => {
          const data = analisis[ticker];

          if (data === undefined) {
            return (
              <Card key={ticker} className="text-sm text-ink-muted">
                Cargando {ticker}...
              </Card>
            );
          }

          if (data === null) {
            return (
              <Card key={ticker} className="flex items-center justify-between">
                <p className="text-sm text-ink-muted">
                  La empresa &quot;{ticker}&quot; ya no está disponible (por ejemplo, una empresa propia que eliminaste).
                </p>
                <button
                  onClick={() => toggleFavorite(ticker)}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm text-ink-muted hover:text-ink focus-ring"
                >
                  Quitar
                </button>
              </Card>
            );
          }

          const { company, score, senales } = data;
          const m = company.metrics;

          return (
            <Card key={ticker}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/empresas/${company.ticker}`}
                      className="font-semibold text-ink hover:text-accent focus-ring"
                    >
                      {company.nombre}
                    </Link>
                    <span className="font-mono text-xs text-ink-muted">{company.ticker}</span>
                    {company.fuente === "propia" && (
                      <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">
                        Balance propio
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-ink-muted">
                    {nombreSector(company.sector)} · {nombreMercado(company.mercado)}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs text-ink-muted">Precio</div>
                    <div className="font-mono font-semibold text-ink">{fmtPrecio(m.precio, company.monedaPrecio)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-ink-muted">Variación</div>
                    <div className="font-mono font-semibold">
                      <VariacionTexto v={m.variacionDiaria} />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-ink-muted">Score Centinela</div>
                    <div className="font-mono font-semibold text-ink">{score.total ?? "N/A"} / 100</div>
                  </div>
                  <Badge estado={score.estado} />
                  <button
                    onClick={() => toggleFavorite(ticker)}
                    title="Quitar de favoritos"
                    aria-label={`Quitar ${company.nombre} de favoritos`}
                    className="rounded-lg border border-border px-2.5 py-1.5 text-sm text-ink-muted hover:text-bad focus-ring"
                  >
                    ⭐ Quitar
                  </button>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-4 text-xs text-ink-muted">
                <span>ROE {fmtPct(m.roe)}</span>
                <span>D/E {fmtNum(m.debtToEquity)}x</span>
              </div>

              {senales.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {senales.slice(0, 3).map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-ink-muted"
                    >
                      <span aria-hidden="true">
                        {s.tipo === "positiva" ? "🟢" : s.tipo === "advertencia" ? "🟡" : "🔴"}
                      </span>
                      {s.titulo}
                    </li>
                  ))}
                  {senales.length > 3 && (
                    <li className="px-2.5 py-1 text-xs text-ink-muted">+{senales.length - 3} más</li>
                  )}
                </ul>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
