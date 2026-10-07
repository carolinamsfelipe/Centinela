import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { MERCADOS, MONEDAS, SECTORES, nombreMercado, nombreSector } from "@/data/companies";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { fmtFecha, fmtNum } from "@/lib/format";
import { getCompanies } from "@/services/companyService";
import {
  PLANTILLA_CSV,
  eliminarEmpresaPropia,
  filasDesdeCsv,
  filasDesdeExcel,
  guardarEmpresaPropia,
  listarEmpresasPropias,
  parsearNumero,
  periodosDesdeFilas,
  validarTamanoArchivo,
} from "@/services/userCompanies";
import type { PeriodoBalance, ResultadoLectura } from "@/services/userCompanies";
import type { Company, Mercado, Sector } from "@/types";

type Modo = "archivo" | "manual";

interface CampoManual {
  clave: string;
  label: string;
  obligatorio: boolean;
  ayuda: string;
}

const CAMPOS_MANUALES: CampoManual[] = [
  { clave: "activos_corrientes", label: "Activo corriente", obligatorio: true, ayuda: "Caja, cuentas a cobrar, inventarios y otros activos de corto plazo." },
  { clave: "activos_totales", label: "Activo total", obligatorio: true, ayuda: "Todo lo que tiene la empresa." },
  { clave: "pasivos_corrientes", label: "Pasivo corriente", obligatorio: true, ayuda: "Deudas y obligaciones a pagar dentro del año." },
  { clave: "pasivos_totales", label: "Pasivo total", obligatorio: true, ayuda: "Todo lo que debe la empresa (corriente y no corriente)." },
  { clave: "patrimonio_neto", label: "Patrimonio neto", obligatorio: true, ayuda: "Activo total menos pasivo total." },
  { clave: "ganancias_retenidas", label: "Ganancias retenidas", obligatorio: true, ayuda: "Resultados acumulados no distribuidos (puede ser negativo)." },
  { clave: "deuda_total", label: "Deuda financiera total", obligatorio: true, ayuda: "Préstamos bancarios, obligaciones negociables y similares." },
  { clave: "ebit", label: "EBIT (resultado operativo)", obligatorio: true, ayuda: "Resultado antes de intereses e impuestos." },
  { clave: "ventas", label: "Ventas del ejercicio", obligatorio: false, ayuda: "Opcional: habilita margen neto, DSO y mejora el Score." },
  { clave: "costo_ventas", label: "Costo de ventas (COGS)", obligatorio: false, ayuda: "Opcional: insumos y costo de producción. Habilita DIO, DPO y Ciclo de Caja (CCC)." },
  { clave: "cuentas_por_cobrar", label: "Cuentas por cobrar (clientes)", obligatorio: false, ayuda: "Opcional: dinero en la calle pendiente de cobro. Habilita días de cobro (DSO)." },
  { clave: "inventarios", label: "Inventarios / Stock", obligatorio: false, ayuda: "Opcional: materias primas y productos terminados. Habilita días de inventario (DIO)." },
  { clave: "cuentas_por_pagar", label: "Cuentas por pagar (proveedores)", obligatorio: false, ayuda: "Opcional: deudas comerciales con proveedores. Habilita días de pago (DPO)." },
  { clave: "gastos_intereses", label: "Intereses financieros anuales", obligatorio: false, ayuda: "Opcional: costo del descubierto y préstamos. Habilita cobertura de intereses (ICR)." },
  { clave: "deuda_usd_pct", label: "% Deuda en USD (0 a 100%)", obligatorio: false, ayuda: "Opcional: ej. 30 para 30% en moneda extranjera. Habilita estrés cambiario." },
  { clave: "resultado_neto", label: "Resultado neto", obligatorio: false, ayuda: "Opcional: habilita ROE, ROA y margen neto." },
  { clave: "valor_mercado_patrimonio", label: "Valor de mercado del patrimonio", obligatorio: false, ayuda: "Opcional. Si no cotiza y lo dejás vacío se usa el valor libro (patrimonio neto)." },
];

const CLASE_INPUT =
  "mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus-ring";

function descargarPlantilla() {
  const blob = new Blob(["﻿" + PLANTILLA_CSV], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "plantilla_balance_centinela.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function MiEmpresa() {
  useDocumentTitle("Centinela — Mi empresa");
  const navigate = useNavigate();

  const [guardadas, setGuardadas] = useState(() => listarEmpresasPropias());
  const [universo, setUniverso] = useState<Company[]>([]);
  const [modo, setModo] = useState<Modo>("archivo");

  const [nombre, setNombre] = useState("");
  const [mercado, setMercado] = useState<Mercado>("Argentina");
  const [sector, setSector] = useState<Sector>("Industria");
  const [pais, setPais] = useState("");
  const [moneda, setMoneda] = useState("ARS");

  const [lectura, setLectura] = useState<ResultadoLectura | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [periodoManual, setPeriodoManual] = useState(`${new Date().getFullYear() - 1}-12-31`);
  const [manual, setManual] = useState<Record<string, string>>({});
  const [errores, setErrores] = useState<string[]>([]);

  useEffect(() => {
    let activo = true;
    getCompanies().then((cs) => {
      if (activo) setUniverso(cs.filter((c) => c.fuente === "real"));
    });
    return () => {
      activo = false;
    };
  }, []);

  function cambiarMercado(nuevo: Mercado) {
    setMercado(nuevo);
    const habitual = MERCADOS.find((m) => m.id === nuevo)?.monedaHabitual;
    if (habitual) setMoneda(habitual);
  }

  const comparables = useMemo(() => {
    const delSector = universo.filter((c) => c.sector === sector);
    const porMercado = new Map<Mercado, number>();
    for (const c of delSector) porMercado.set(c.mercado, (porMercado.get(c.mercado) ?? 0) + 1);
    return { total: delSector.length, porMercado: Array.from(porMercado.entries()) };
  }, [universo, sector]);

  async function alElegirArchivo(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setNombreArchivo(archivo.name);
    setErrores([]);
    setLectura(null);
    try {
      validarTamanoArchivo(archivo);
      const minuscula = archivo.name.toLowerCase();
      let filas: Array<Record<string, unknown>>;
      if (minuscula.endsWith(".csv")) {
        filas = filasDesdeCsv(await archivo.text());
      } else if (minuscula.endsWith(".xlsx") || minuscula.endsWith(".xls")) {
        filas = await filasDesdeExcel(await archivo.arrayBuffer());
      } else {
        setErrores(["Formato no soportado. Subí un archivo .csv, .xlsx o .xls."]);
        return;
      }
      setLectura(periodosDesdeFilas(filas));
    } catch (err) {
      setErrores([`No se pudo leer el archivo: ${err instanceof Error ? err.message : String(err)}`]);
    }
  }

  function periodoManualDesdeFormulario(): PeriodoBalance | null {
    const faltantes: string[] = [];
    const valores: Record<string, number | null> = {};
    for (const campo of CAMPOS_MANUALES) {
      const v = parsearNumero(manual[campo.clave] ?? "");
      valores[campo.clave] = v;
      if (campo.obligatorio && v === null) faltantes.push(campo.label);
    }
    if (faltantes.length > 0) {
      setErrores([`Completá con números válidos: ${faltantes.join(", ")}.`]);
      return null;
    }
    if ((valores["activos_totales"] as number) <= 0) {
      setErrores(["El activo total debe ser mayor que cero."]);
      return null;
    }
    return {
      periodo: periodoManual.trim() || "Último ejercicio",
      activosCorrientes: valores["activos_corrientes"] as number,
      activosTotales: valores["activos_totales"] as number,
      pasivosCorrientes: valores["pasivos_corrientes"] as number,
      pasivosTotales: valores["pasivos_totales"] as number,
      patrimonioNeto: valores["patrimonio_neto"] as number,
      gananciasRetenidas: valores["ganancias_retenidas"] as number,
      deudaTotal: valores["deuda_total"] as number,
      ebit: valores["ebit"] as number,
      revenue: valores["ventas"],
      costoVentas: valores["costo_ventas"],
      cuentasPorCobrar: valores["cuentas_por_cobrar"],
      inventarios: valores["inventarios"],
      cuentasPorPagar: valores["cuentas_por_pagar"],
      gastosIntereses: valores["gastos_intereses"],
      deudaUsdPct:
        valores["deuda_usd_pct"] !== null
          ? (valores["deuda_usd_pct"] as number) > 1
            ? (valores["deuda_usd_pct"] as number) / 100
            : (valores["deuda_usd_pct"] as number)
          : null,
      netIncome: valores["resultado_neto"],
      valorMercado: valores["valor_mercado_patrimonio"],
    };
  }

  function guardar() {
    setErrores([]);
    if (nombre.trim() === "") {
      setErrores(["Poné un nombre para tu empresa."]);
      return;
    }

    let periodos: PeriodoBalance[];
    if (modo === "archivo") {
      if (!lectura || lectura.periodos.length === 0) {
        setErrores(["Subí un archivo con al menos un ejercicio válido."]);
        return;
      }
      periodos = lectura.periodos;
    } else {
      const p = periodoManualDesdeFormulario();
      if (!p) return;
      periodos = [p];
    }

    const guardada = guardarEmpresaPropia({
      nombre: nombre.trim(),
      mercado,
      sector,
      pais: pais.trim() || nombreMercado(mercado),
      moneda,
      periodos,
    });
    if (!guardada) {
      setErrores(["No se pudo guardar en este navegador (¿navegación privada o sin espacio?)."]);
      return;
    }
    navigate(`/empresas/${guardada.id}`);
  }

  function eliminar(id: string, nombreEmpresa: string) {
    if (!window.confirm(`¿Eliminar "${nombreEmpresa}" de tus empresas? Esta acción no se puede deshacer.`)) return;
    eliminarEmpresaPropia(id);
    setGuardadas(listarEmpresasPropias());
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-8">
      <h1 className="text-2xl font-bold text-ink">Mi empresa</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Cargá el balance de tu empresa (o el de un cliente que no cotiza en bolsa), clasificala por mercado y sector, y
        Centinela la analiza con la misma metodología que usa para las empresas que cotizan: Score, Altman Z&apos;&apos;,
        semáforo de indicadores, contexto macro, informe descargable y comparación con empresas de otros mercados.
      </p>
      <p className="mt-2 rounded-lg border border-border bg-surface p-3 text-xs text-ink-muted">
        Tus datos se guardan solo en este navegador: no se envían a ningún servidor. Si borrás los datos del navegador se
        pierden, por eso conviene descargar el informe en PDF o Excel de cada empresa que cargues.
      </p>

      {/* Caso insignia demo Semana del Inversor */}
      <div className="mt-6 rounded-xl border border-accent/30 bg-accent-soft/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-accent px-2 py-0.5 font-mono text-[11px] font-bold uppercase text-white">
                Caso Demo
              </span>
              <h3 className="font-semibold text-ink">Metalúrgica Don Pedro S.A.</h3>
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              PyME industrial insignia (Semana del Inversor): balance patrimonial sano ($120M PN, Altman 2,8), pero ciclo
              de caja de 85 días, ICR 1,4x y 30% de deuda en USD.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/empresas/DEMO-PEDRO"
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:text-accent focus-ring"
            >
              Ver ficha
            </Link>
            <Link
              to="/simulador?ticker=DEMO-PEDRO"
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 focus-ring"
            >
              Simular decisiones de caja ➔
            </Link>
          </div>
        </div>
      </div>

      {guardadas.length > 0 && (
        <Card className="mt-6">
          <h2 className="font-semibold text-ink">Tus empresas cargadas</h2>
          <ul className="mt-3 divide-y divide-border">
            {guardadas.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <Link to={`/empresas/${g.id}`} className="font-medium text-ink hover:text-accent focus-ring">
                    {g.nombre}
                  </Link>
                  <div className="text-xs text-ink-muted">
                    {nombreMercado(g.mercado)} · {nombreSector(g.sector)} · {g.moneda} · {g.periodos.length}{" "}
                    {g.periodos.length === 1 ? "ejercicio" : "ejercicios"} · cargada el {fmtFecha(g.creada)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/empresas/${g.id}`}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm text-ink-muted hover:text-ink focus-ring"
                  >
                    Ver análisis
                  </Link>
                  <Link
                    to={`/comparador?empresas=${encodeURIComponent(g.id)}`}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm text-ink-muted hover:text-ink focus-ring"
                  >
                    Comparar
                  </Link>
                  <button
                    onClick={() => eliminar(g.id, g.nombre)}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm text-ink-muted hover:text-bad focus-ring"
                  >
                    Eliminar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="mt-6">
        <h2 className="font-semibold text-ink">1. Datos de la empresa</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-ink-muted">Nombre *</span>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej.: Metalúrgica Rosario S.A."
              className={CLASE_INPUT}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink-muted">Mercado *</span>
            <select value={mercado} onChange={(e) => cambiarMercado(e.target.value as Mercado)} className={CLASE_INPUT}>
              {MERCADOS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink-muted">Sector *</span>
            <select value={sector} onChange={(e) => setSector(e.target.value as Sector)} className={CLASE_INPUT}>
              {SECTORES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink-muted">País (opcional)</span>
            <input
              value={pais}
              onChange={(e) => setPais(e.target.value)}
              placeholder={nombreMercado(mercado)}
              className={CLASE_INPUT}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink-muted">Moneda del balance *</span>
            <select value={moneda} onChange={(e) => setMoneda(e.target.value)} className={CLASE_INPUT}>
              {MONEDAS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-3 text-xs text-ink-muted">
          {comparables.total === 0
            ? `Todavía no hay empresas de ${nombreSector(sector)} en el universo para comparar.`
            : `Con esta clasificación vas a poder comparar tu empresa con ${comparables.total} empresas de ${nombreSector(sector)} que cotizan: ${comparables.porMercado
                .map(([m, n]) => `${n} en ${nombreMercado(m)}`)
                .join(", ")}.`}{" "}
          Los importes se convierten a US$ para poder compararlos entre mercados.
        </p>
      </Card>

      <Card className="mt-6">
        <h2 className="font-semibold text-ink">2. Balance</h2>
        <div className="mt-3 inline-flex rounded-lg border border-border p-1" role="tablist" aria-label="Forma de carga">
          {(
            [
              ["archivo", "Subir archivo (CSV / Excel)"],
              ["manual", "Completar a mano"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={modo === id}
              onClick={() => {
                setModo(id);
                setErrores([]);
              }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium focus-ring ${
                modo === id ? "bg-accent-soft text-accent" : "text-ink-muted hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {modo === "archivo" ? (
          <div className="mt-4">
            <p className="text-sm text-ink-muted">
              Un archivo con una fila por ejercicio (podés cargar varios años para ver la evolución). Columnas
              obligatorias: activos_corrientes, activos_totales, pasivos_corrientes, pasivos_totales, patrimonio_neto,
              ganancias_retenidas, deuda_total, ebit. Opcionales: periodo, ventas, resultado_neto, ebitda, efectivo,
              valor_mercado_patrimonio.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={descargarPlantilla}
                className="rounded-lg border border-border px-3 py-2 text-sm text-ink-muted hover:text-ink focus-ring"
              >
                Descargar plantilla (CSV)
              </button>
              <label className="cursor-pointer rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90 focus-within:ring-2 focus-within:ring-accent">
                Elegir archivo
                <input type="file" accept=".csv,.xlsx,.xls" onChange={alElegirArchivo} className="sr-only" />
              </label>
              {nombreArchivo && <span className="text-sm text-ink-muted">{nombreArchivo}</span>}
            </div>
            <p className="mt-2 text-xs text-ink-muted">
              Usá punto decimal o sin separador de miles (también se entienden formatos como 1.234.567,89). Si no
              completás valor_mercado_patrimonio —lo normal en una empresa que no cotiza— se usa el valor libro del
              patrimonio como aproximación para el Altman Z&apos;&apos;.
            </p>

            {lectura && lectura.periodos.length > 0 && (
              <div className="mt-4 overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[600px] text-sm">
                  <thead className="border-b border-border bg-bg/50 text-left text-ink-muted [&>tr>th]:px-3 [&>tr>th]:py-2">
                    <tr>
                      <th>Ejercicio</th>
                      <th>Activo total</th>
                      <th>Pasivo total</th>
                      <th>Patrimonio neto</th>
                      <th>EBIT</th>
                      <th>Ventas</th>
                      <th>Resultado neto</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {lectura.periodos.map((p) => (
                      <tr key={p.periodo} className="border-b border-border last:border-0 [&>td]:px-3 [&>td]:py-2">
                        <td>{p.periodo}</td>
                        <td>{fmtNum(p.activosTotales, 0)}</td>
                        <td>{fmtNum(p.pasivosTotales, 0)}</td>
                        <td>{fmtNum(p.patrimonioNeto, 0)}</td>
                        <td>{fmtNum(p.ebit, 0)}</td>
                        <td>{p.revenue != null ? fmtNum(p.revenue, 0) : "N/D"}</td>
                        <td>{p.netIncome != null ? fmtNum(p.netIncome, 0) : "N/D"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {lectura && lectura.advertencias.length > 0 && (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-warn">
                {lectura.advertencias.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            )}
            {lectura && lectura.errores.length > 0 && (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-bad">
                {lectura.errores.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-sm text-ink-muted">
              Cargá los importes del último ejercicio, todos en la moneda elegida arriba (en unidades, sin abreviar). Los
              campos con * son obligatorios.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-ink-muted">Fecha del balance</span>
                <input value={periodoManual} onChange={(e) => setPeriodoManual(e.target.value)} className={CLASE_INPUT} />
              </label>
              <span className="hidden sm:block" />
              {CAMPOS_MANUALES.map((c) => (
                <label key={c.clave} className="block">
                  <span className="text-sm font-medium text-ink-muted">
                    {c.label}
                    {c.obligatorio ? " *" : ""}
                  </span>
                  <input
                    inputMode="decimal"
                    value={manual[c.clave] ?? ""}
                    onChange={(e) => setManual((prev) => ({ ...prev, [c.clave]: e.target.value }))}
                    className={`${CLASE_INPUT} font-mono`}
                  />
                  <span className="mt-1 block text-[11px] text-ink-muted">{c.ayuda}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </Card>

      {errores.length > 0 && (
        <div role="alert" className="mt-4 rounded-xl border border-bad/40 bg-bad-soft p-3 text-sm text-bad">
          <ul className="list-disc space-y-1 pl-5">
            {errores.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={guardar}
          className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white hover:opacity-90 focus-ring"
        >
          Analizar mi empresa
        </button>
        <span className="text-xs text-ink-muted">
          Es una herramienta de apoyo a la decisión, no un veredicto de crédito.
        </span>
      </div>
    </div>
  );
}
