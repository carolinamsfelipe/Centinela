import { useRef, useState } from "react";
import type { DragEvent } from "react";
import { MERCADOS, MONEDAS, SECTORES, nombreMercado } from "@/data/companies";
import { construirSemaforo } from "@/lib/financial/semaforo";
import { fmtNum } from "@/lib/format";
import {
  COLUMNAS_OBLIGATORIAS,
  COLUMNAS_OPCIONALES,
  PLANTILLA_CSV,
  empresaPropiaACompany,
  filasDesdeCsv,
  filasDesdeExcel,
  guardarEmpresaPropia,
  periodosDesdeFilas,
  validarTamanoArchivo,
} from "@/services/userCompanies";
import type { ResultadoLectura } from "@/services/userCompanies";
import type { Mercado, Sector } from "@/types";
import { EstadoBadge } from "./ui";

const CAMPO = "rounded-md border border-v2-line bg-v2-bg px-2.5 py-2 text-[13px] text-v2-ink focus-ring";

export function CargarEmpresa({ onCerrar, onGuardada }: { onCerrar: () => void; onGuardada: (id: string) => void }) {
  const [paso, setPaso] = useState<1 | 2>(1);
  const [nombre, setNombre] = useState("");
  const [mercado, setMercado] = useState<Mercado>("Argentina");
  const [sector, setSector] = useState<Sector>("Industria");
  const [moneda, setMoneda] = useState("ARS");
  const [archivo, setArchivo] = useState("");
  const [lectura, setLectura] = useState<ResultadoLectura | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function leer(f: File) {
    setError(null);
    try {
      validarTamanoArchivo(f);
      const n = f.name.toLowerCase();
      let filas;
      if (n.endsWith(".csv") || n.endsWith(".txt")) filas = filasDesdeCsv(await f.text());
      else if (n.endsWith(".xlsx") || n.endsWith(".xls")) filas = await filasDesdeExcel(await f.arrayBuffer());
      else {
        setError("Formato no soportado. Subí un archivo .csv, .txt, .xlsx o .xls.");
        return;
      }
      setArchivo(f.name);
      setLectura(periodosDesdeFilas(filas));
      setPaso(2);
    } catch (e) {
      setError(`No se pudo leer el archivo: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const alSoltar = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void leer(f);
  };

  function descargarPlantilla() {
    const blob = new Blob([PLANTILLA_CSV], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_centinela.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const periodos = lectura?.periodos ?? [];
  const cuadra = (p: (typeof periodos)[number]) => p.activosTotales > 0 && Math.abs(p.activosTotales - (p.pasivosTotales + p.patrimonioNeto)) / p.activosTotales <= 0.05;
  const descuadres = periodos.filter((p) => !cuadra(p)).length;

  const previa = (() => {
    if (periodos.length === 0) return [];
    const temporal = empresaPropiaACompany(
      { id: "MI-TMP", creada: new Date().toISOString(), nombre: nombre || "Mi empresa", mercado, sector, pais: nombreMercado(mercado), moneda, periodos },
      null
    );
    return construirSemaforo(temporal.metrics).slice(0, 6);
  })();

  function guardar() {
    if (periodos.length === 0) return;
    const g = guardarEmpresaPropia({ nombre: nombre.trim() || "Mi empresa", mercado, sector, pais: nombreMercado(mercado), moneda, periodos });
    if (!g) {
      setError("No se pudo guardar: el navegador no permite almacenamiento local.");
      return;
    }
    onGuardada(g.id);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cargar empresa"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(5,8,14,0.6)] p-4"
      onClick={(e) => e.target === e.currentTarget && onCerrar()}
    >
      <div className="flex max-h-[92vh] w-full max-w-[720px] flex-col overflow-hidden rounded-[10px] border border-v2-line2 bg-v2-s1 shadow-[0_24px_64px_rgba(0,0,0,0.45)]">
        <div className="flex items-center justify-between border-b border-v2-line px-5 py-3.5">
          <div className="flex items-center gap-3">
            <h2 className="text-[15px] font-semibold text-v2-ink">Cargar empresa</h2>
            <span className="font-mono text-[11px] text-v2-ink3">
              <span className={paso === 1 ? "text-v2-ink" : ""}>1 Datos</span> → <span className={paso === 2 ? "text-v2-ink" : ""}>2 Revisión</span>
            </span>
          </div>
          <button onClick={onCerrar} aria-label="Cerrar" className="rounded px-2 py-1 text-v2-ink2 hover:text-v2-ink focus-ring">
            ✕
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          {paso === 1 ? (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 sm:col-span-2">
                  <span className="text-xs text-v2-ink2">Nombre de la empresa</span>
                  <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Textil del Sur S.R.L." className={CAMPO} />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs text-v2-ink2">Mercado</span>
                  <select
                    value={mercado}
                    onChange={(e) => {
                      const m = e.target.value as Mercado;
                      setMercado(m);
                      setMoneda(MERCADOS.find((x) => x.id === m)?.monedaHabitual ?? moneda);
                    }}
                    className={CAMPO}
                  >
                    {MERCADOS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nombre}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs text-v2-ink2">Sector</span>
                  <select value={sector} onChange={(e) => setSector(e.target.value as Sector)} className={CAMPO}>
                    {SECTORES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs text-v2-ink2">Moneda de los importes</span>
                  <select value={moneda} onChange={(e) => setMoneda(e.target.value)} className={CAMPO}>
                    {MONEDAS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nombre}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={alSoltar}
                className={`flex flex-col items-center gap-2 rounded-lg border-[1.5px] border-dashed px-4 py-8 text-center transition-colors ${
                  drag ? "border-v2-acc bg-v2-acc/[0.12]" : "border-v2-line2"
                }`}
              >
                <span className="text-[13px] text-v2-ink">Arrastrá tu balance acá</span>
                <span className="text-xs text-v2-ink3">.csv, .txt, .xlsx o .xls · hasta 5 MB · se procesa en tu navegador</span>
                <button type="button" onClick={() => inputRef.current?.click()} className="mt-1 rounded-md border border-v2-line2 px-3 py-1.5 text-xs text-v2-acc hover:bg-v2-s2 focus-ring">
                  Elegir archivo
                </button>
                <input ref={inputRef} type="file" accept=".csv,.txt,.xlsx,.xls" className="hidden" onChange={(e) => e.target.files?.[0] && void leer(e.target.files[0])} />
              </div>

              <div className="rounded-lg border border-v2-line bg-v2-bg p-3 text-xs text-v2-ink2">
                <p>
                  <strong className="text-v2-ink">Obligatorias:</strong> <span className="font-mono text-[11px]">{COLUMNAS_OBLIGATORIAS.join(", ")}</span>
                </p>
                <p className="mt-1.5">
                  <strong className="text-v2-ink">Opcionales:</strong> <span className="font-mono text-[11px]">{COLUMNAS_OPCIONALES.join(", ")}</span>
                </p>
                <button type="button" onClick={descargarPlantilla} className="mt-2 text-v2-acc hover:underline focus-ring">
                  Descargar plantilla CSV
                </button>
              </div>
              {error && (
                <p role="alert" className="text-xs text-v2-bad">
                  <span aria-hidden="true">◆ </span>
                  {error}
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-[13px] text-v2-ink">
                <span className="font-mono">{archivo}</span> · {periodos.length} ejercicio{periodos.length === 1 ? "" : "s"} válido{periodos.length === 1 ? "" : "s"}
              </p>
              {(lectura?.errores.length ?? 0) > 0 && (
                <ul className="flex flex-col gap-1 text-xs text-v2-bad">
                  {lectura!.errores.map((e) => (
                    <li key={e}>◆ {e}</li>
                  ))}
                </ul>
              )}
              {((lectura?.advertencias.length ?? 0) > 0 || descuadres > 0) && (
                <ul className="flex flex-col gap-1 text-xs text-v2-warn">
                  {lectura!.advertencias.map((e) => (
                    <li key={e}>▲ {e}</li>
                  ))}
                  {descuadres > 0 && <li>▲ {descuadres} ejercicio(s) con balance que no cuadra (activo ≠ pasivo + patrimonio, más de 5%). Revisá los importes.</li>}
                </ul>
              )}
              {periodos.length > 0 && (
                <>
                  <div className="overflow-x-auto rounded-lg border border-v2-line">
                    <table className="w-full text-xs">
                      <thead className="bg-v2-bg text-left text-v2-ink3">
                        <tr>
                          {["Período", "Activo total", "Pasivo total", "Patrimonio", "Deuda", "EBIT", "Cuadra"].map((h) => (
                            <th key={h} className="px-3 py-2 font-medium">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="font-mono [&_td]:border-t [&_td]:border-v2-line [&_td]:px-3 [&_td]:py-1.5">
                        {periodos.map((p) => (
                          <tr key={p.periodo}>
                            <td>{p.periodo}</td>
                            <td>{fmtNum(p.activosTotales, 0)}</td>
                            <td>{fmtNum(p.pasivosTotales, 0)}</td>
                            <td>{fmtNum(p.patrimonioNeto, 0)}</td>
                            <td>{fmtNum(p.deudaTotal, 0)}</td>
                            <td>{fmtNum(p.ebit, 0)}</td>
                            <td className={cuadra(p) ? "text-v2-ok" : "text-v2-warn"}>{cuadra(p) ? "● Sí" : "▲ No"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <h3 className="mb-2 text-xs font-semibold text-v2-ink">Vista previa · semáforo del último ejercicio</h3>
                    <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                      {previa.map((s) => (
                        <li key={s.id} className="flex items-center justify-between rounded-md border border-v2-line px-3 py-1.5 text-xs">
                          <span className="text-v2-ink2">{s.nombre}</span>
                          <span className="flex items-center gap-2">
                            <span className="font-mono text-v2-ink">{s.valorTexto}</span>
                            <EstadoBadge estado={s.estado} />
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
              {error && (
                <p role="alert" className="text-xs text-v2-bad">
                  ◆ {error}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-v2-line px-5 py-3">
          <p className="text-[11px] text-v2-ink3">
            {paso === 1 ? "Formato de columnas igual al de /mi-empresa." : "Si no informás valor de mercado, el Altman usa el patrimonio libro."}
          </p>
          <div className="flex gap-2">
            {paso === 2 && (
              <button onClick={() => setPaso(1)} className="rounded-md border border-v2-line px-3 py-1.5 text-xs text-v2-ink2 hover:text-v2-ink focus-ring">
                Volver
              </button>
            )}
            {paso === 2 && (
              <button
                onClick={guardar}
                disabled={periodos.length === 0}
                className="rounded-md bg-v2-ink px-3 py-1.5 text-xs font-semibold text-v2-bg disabled:opacity-40 focus-ring"
              >
                Guardar y analizar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
