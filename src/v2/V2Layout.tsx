import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { nombreMercado, nombreSector } from "@/data/companies";
import { useTheme } from "@/hooks/useTheme";
import { fmtFecha } from "@/lib/format";
import type { Company } from "@/types";
import { CargarEmpresa } from "./CargarEmpresa";
import { V2Provider, useV2, useV2Filters } from "./context";
import { descargarCsv } from "./exportar";
import { ETIQUETA_PERIODO, MODULOS } from "./model";
import { ESTADO_V2, PaginaSkeleton, Seg } from "./ui";
import "./tokens-v2.css";

const ICONO: Record<string, string> = { panel: "▦", ccc: "↻", deuda: "▤", sim: "☰", bench: "∷" };

/* ------------------------------ Selector de entidad ------------------------------ */
function SelectorEntidad({ onCargar }: { onCargar: () => void }) {
  const { companies, modelo } = useV2();
  const { set } = useV2Filters();
  const [abierto, setAbierto] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const alClic = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setAbierto(false);
    const alTecla = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("mousedown", alClic);
    document.addEventListener("keydown", alTecla);
    return () => {
      document.removeEventListener("mousedown", alClic);
      document.removeEventListener("keydown", alTecla);
    };
  }, [abierto]);

  const grupos = useMemo(() => {
    const t = q.trim().toLowerCase();
    const ok = (c: Company) => !t || c.nombre.toLowerCase().includes(t) || c.ticker.toLowerCase().includes(t);
    const lista = (companies ?? []).filter(ok);
    return [
      { titulo: "Caso demo", items: lista.filter((c) => c.companyType === "demo") },
      { titulo: "Mis empresas", items: lista.filter((c) => c.companyType === "user") },
      { titulo: "Cotizantes", items: lista.filter((c) => c.companyType === "market") },
    ].filter((g) => g.items.length > 0);
  }, [companies, q]);

  const c = modelo?.company;
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={abierto}
        onClick={() => setAbierto((a) => !a)}
        className={`flex w-full items-center gap-2 rounded-lg border bg-v2-bg px-3 py-2.5 text-left focus-ring ${abierto ? "border-v2-acc" : "border-v2-line"}`}
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] uppercase tracking-[0.08em] text-v2-ink3">Entidad</span>
          <span className="block truncate text-[13px] font-semibold text-v2-ink">{c?.nombre ?? "Cargando…"}</span>
          {c && (
            <span className="block truncate font-mono text-[11px] text-v2-ink2">
              {c.ticker} · {nombreSector(c.sector)} · {c.monedaReporte}
            </span>
          )}
        </span>
        <span aria-hidden="true" className="text-v2-ink3">
          ⇅
        </span>
      </button>
      {abierto && (
        <div className="absolute left-0 top-full z-40 mt-1.5 w-[300px] overflow-hidden rounded-lg border border-v2-line2 bg-v2-s1 shadow-[0_12px_32px_rgba(0,0,0,0.35)]">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar empresa o ticker…"
            aria-label="Buscar empresa"
            className="w-full border-b border-v2-line bg-transparent px-3 py-2.5 text-[13px] text-v2-ink outline-none placeholder:text-v2-ink3"
          />
          <div role="listbox" className="max-h-[300px] overflow-y-auto">
            {grupos.length === 0 && <p className="px-3 py-4 text-xs text-v2-ink3">Sin coincidencias.</p>}
            {grupos.map((g) => (
              <div key={g.titulo}>
                <div className="px-3 pb-1 pt-2.5 text-[10px] uppercase tracking-[0.08em] text-v2-ink3">{g.titulo}</div>
                {g.items.map((it) => (
                  <button
                    key={it.ticker}
                    role="option"
                    aria-selected={it.ticker === c?.ticker}
                    onClick={() => {
                      set({ empresa: it.ticker, periodo: null, moneda: null });
                      setAbierto(false);
                      setQ("");
                    }}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-[13px] hover:bg-v2-s2 focus-ring ${it.ticker === c?.ticker ? "text-v2-ink" : "text-v2-ink2"}`}
                  >
                    <span className="truncate">{it.nombre}</span>
                    <span className="shrink-0 font-mono text-[10px] text-v2-ink3">{it.companyType === "user" ? `${it.monedaReporte} · ${it.historico.length} ej.` : it.ticker}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
          <button
            onClick={() => {
              setAbierto(false);
              onCargar();
            }}
            className="flex w-full items-center gap-2 border-t border-v2-line px-3 py-2.5 text-left text-[13px] font-medium text-v2-acc hover:bg-v2-s2 focus-ring"
          >
            <span aria-hidden="true">⤒</span> Cargar empresa (CSV / Excel)
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------ Sidebar ------------------------------------ */
function Sidebar({ onCargar }: { onCargar: () => void }) {
  const { modelo } = useV2();
  const { dark, toggle } = useTheme();
  const loc = useLocation();
  const criticas = modelo?.conteo.alerta ?? 0;
  const estadoDe = (id: "ccc" | "icr") => modelo?.kpis.find((k) => k.id === id)?.estado ?? "sin_datos";

  const pildora = (id: string): { texto: string; clase: string } | null => {
    if (id === "panel") return criticas > 0 ? { texto: String(criticas), clase: `${ESTADO_V2.alerta.text} ${ESTADO_V2.alerta.bg}` } : null;
    if (id === "ccc") return { texto: "CCC", clase: `${ESTADO_V2[estadoDe("ccc")].text}` };
    if (id === "deuda") return { texto: "ICR", clase: `${ESTADO_V2[estadoDe("icr")].text}` };
    return null;
  };

  return (
    <aside className="sticky top-0 flex h-screen flex-col border-r border-v2-line bg-v2-s1">
      <div className="flex items-center gap-2.5 border-b border-v2-line px-[18px] py-4">
        <img src="/shield.svg" alt="" width={22} height={22} />
        <span className="font-mono text-sm font-semibold tracking-[0.08em]">CENTINELA</span>
      </div>
      <div className="px-3 pt-3">
        <SelectorEntidad onCargar={onCargar} />
      </div>
      <nav aria-label="Diagnóstico" className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pt-4">
        <span className="px-2 pb-1.5 text-[10px] uppercase tracking-[0.08em] text-v2-ink3">Diagnóstico</span>
        {MODULOS.map((mod) => {
          const p = pildora(mod.id);
          return (
            <NavLink
              key={mod.id}
              to={{ pathname: mod.ruta, search: loc.search }}
              end={mod.id === "panel"}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-md p-2 text-[13px] transition-colors focus-ring ${isActive ? "bg-v2-s2 text-v2-ink" : "text-v2-ink2 hover:bg-v2-s2/60"}`
              }
            >
              <span aria-hidden="true" className="w-4 text-center text-v2-ink3">
                {ICONO[mod.id]}
              </span>
              <span className="flex-1 truncate">{mod.label}</span>
              {p && <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${p.clase}`}>{p.texto}</span>}
            </NavLink>
          );
        })}
      </nav>
      <div className="flex flex-col gap-2.5 border-t border-v2-line p-3">
        <div className="flex gap-3 px-1 text-xs text-v2-ink2">
          <Link to="/metodologia" className="hover:text-v2-ink focus-ring">
            Metodología
          </Link>
          <Link to="/fuentes" className="hover:text-v2-ink focus-ring">
            Fuentes
          </Link>
          <Link to="/" className="ml-auto hover:text-v2-ink focus-ring" title="Volver a la versión clásica">
            Clásica
          </Link>
        </div>
        <Seg valor={dark ? "oscuro" : "claro"} etiqueta="Tema" mono={false} onChange={(v) => (v === "oscuro") !== dark && toggle()} opciones={[{ id: "oscuro", label: "Oscuro" }, { id: "claro", label: "Claro" }]} />
      </div>
    </aside>
  );
}

/* ------------------------------------- TopBar ------------------------------------- */
function TopBar() {
  const { modelo, monedaNativa, monedaVista } = useV2();
  const { set } = useV2Filters();
  const loc = useLocation();
  const navigate = useNavigate();
  const mod = MODULOS.find((x) => x.ruta === loc.pathname.replace(/\/$/, "")) ?? MODULOS[0];

  const periodos = modelo?.periodos?.map((p) => p.periodo) ?? (modelo ? [modelo.m.periodo] : []);
  const monedas = monedaNativa === "USD" ? ["USD"] : [monedaNativa, "USD"];
  const tipo = modelo?.company.companyType;
  const fuente =
    tipo === "demo" ? "Demo" : tipo === "user" ? "Balance cargado" : modelo?.company.envivo ? "En vivo" : "Respaldo estático";
  const punto = tipo === "market" && modelo?.company.envivo ? "bg-v2-ok" : "bg-v2-warn";

  function exportar() {
    if (!modelo) return;
    descargarCsv(`centinela_${modelo.company.ticker}.csv`, [
      ["Indicador", "Valor", "Estado", "Criterio"],
      ...modelo.kpis.map((k) => [k.label, `${k.valor} ${k.unidad}`.trim(), ESTADO_V2[k.estado].label, k.criterio]),
      ...modelo.semaforo.map((s) => [s.nombre, s.valorTexto, ESTADO_V2[s.estado].label, s.criterio]),
    ]);
  }

  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-v2-line bg-v2-s1 px-6 py-3">
      <div className="min-w-0 flex-1 basis-[220px]">
        <div className="truncate text-[11px] text-v2-ink3">{modelo?.company.nombre ?? "Entidad"} / Diagnóstico</div>
        <h1 className="truncate text-base font-semibold tracking-[-0.01em] text-v2-ink">{mod.titulo}</h1>
      </div>
      <Seg
        etiqueta="Período"
        valor={modelo?.periodoActual ?? ""}
        onChange={(v) => set({ periodo: v })}
        opciones={periodos.map((p) => ({ id: p, label: ETIQUETA_PERIODO(p), deshabilitado: periodos.length === 1, title: periodos.length === 1 ? "Solo hay un ejercicio con balance completo" : undefined }))}
      />
      <Seg etiqueta="Moneda" valor={monedaVista} onChange={(v) => set({ moneda: v })} opciones={monedas.map((m) => ({ id: m, label: m }))} />
      {modelo && (
        <button
          onClick={() => navigate({ pathname: "/v2/benchmark", search: loc.search })}
          className="rounded-md border border-v2-line px-2.5 py-1.5 text-[11px] text-v2-ink2 hover:bg-v2-s2 hover:text-v2-ink focus-ring"
        >
          vs Mediana {nombreSector(modelo.company.sector)} · {nombreMercado(modelo.company.mercado)}
        </button>
      )}
      <div className="ml-auto flex items-center gap-3">
        <span className="flex items-center gap-1.5 font-mono text-[11px] text-v2-ink2">
          <span className={`h-1.5 w-1.5 rounded-full ${punto}`} aria-hidden="true" />
          {fuente} · cierre {fmtFecha(modelo?.m.periodo)}
        </span>
        <button onClick={exportar} disabled={!modelo} className="rounded-md bg-v2-ink px-3 py-1.5 text-xs font-semibold text-v2-bg disabled:opacity-40 focus-ring">
          Exportar
        </button>
      </div>
    </header>
  );
}

/* ------------------------------------- Layout ------------------------------------- */
function Shell() {
  const [cargando, setCargando] = useState(false);
  const { set } = useV2Filters();
  const { recargar, cargando: cargandoDatos } = useV2();
  const navigate = useNavigate();
  return (
    <div className="v2 grid min-h-screen grid-cols-[228px_minmax(0,1fr)] bg-v2-bg text-v2-ink">
      <Sidebar onCargar={() => setCargando(true)} />
      <div className="flex min-w-0 flex-col">
        <TopBar />
        <main className="flex-1 p-6">
          {cargandoDatos ? (
            <PaginaSkeleton />
          ) : (
            <Suspense fallback={<PaginaSkeleton />}>
              <Outlet />
            </Suspense>
          )}
        </main>
      </div>
      {cargando && (
        <CargarEmpresa
          onCerrar={() => setCargando(false)}
          onGuardada={(id) => {
            recargar();
            set({ empresa: id, periodo: null, moneda: null });
            setCargando(false);
            navigate({ pathname: "/v2", search: `?empresa=${encodeURIComponent(id)}` });
          }}
        />
      )}
    </div>
  );
}

export function V2Layout() {
  return (
    <V2Provider>
      <Shell />
    </V2Provider>
  );
}
