import { useEffect } from "react";
import { Link } from "react-router-dom";

interface ScoreExplicacionModalProps {
  abierto: boolean;
  onCerrar: () => void;
  scoreActual?: number | null;
  gradoActual?: string;
}

export function ScoreExplicacionModal({
  abierto,
  onCerrar,
  scoreActual,
  gradoActual,
}: ScoreExplicacionModalProps) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCerrar();
    }
    if (abierto) {
      window.addEventListener("keydown", onKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="score-modal-title"
    >
      <div
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-2xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border pb-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-2.5 py-0.5 font-mono text-xs font-bold text-accent">
              TRANSPARENCIA METODOLÓGICA
            </div>
            <h2 id="score-modal-title" className="mt-2 text-xl font-bold text-ink sm:text-2xl">
              ¿Cómo se calcula el Score Centinela?
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Índice cuantitativo de resiliencia financiera y operativa (0 a 100)
            </p>
          </div>
          <button
            onClick={onCerrar}
            className="rounded-lg border border-border p-2 text-ink-muted hover:bg-bg hover:text-ink focus-ring"
            aria-label="Cerrar modal"
          >
            ✕
          </button>
        </div>

        {/* Disclaimer / Compliance */}
        <div className="mt-4 rounded-xl border border-accent/30 bg-accent-soft/30 p-3.5 text-xs text-ink">
          <span className="font-bold">⚖️ Diagnóstico operativo, no calificación crediticia: </span>
          El Score Centinela evalúa la capacidad de absorción de shocks, la salud de la caja y la solvencia
          estructural. Apoya la toma de decisiones estratégicas del directorio y tesorería; no reemplaza calificaciones
          de riesgo de emisión de deuda ni scorings de burós crediticios.
        </div>

        {/* Estado actual si aplica */}
        {scoreActual !== undefined && scoreActual !== null && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-bg p-3.5">
            <div>
              <span className="text-xs font-mono uppercase text-ink-muted">Puntaje evaluado</span>
              <div className="text-sm font-bold text-ink">
                Empresa actual: <span className="font-mono text-accent text-base">{scoreActual} / 100</span>
              </div>
            </div>
            {gradoActual && (
              <span className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-1 font-mono text-xs font-bold text-accent">
                {gradoActual}
              </span>
            )}
          </div>
        )}

        {/* Los 3 Pilares Metodológicos */}
        <div className="mt-6 space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-ink-muted">
            Los 3 Pilares del Algoritmo
          </h3>

          <div className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-ink text-sm">1. Pulso de Caja y Capital de Trabajo</span>
              <span className="font-mono text-xs font-bold text-accent bg-accent/10 px-2 py-0.5 rounded">
                40% Ponderación
              </span>
            </div>
            <p className="mt-1 text-xs text-ink-muted leading-relaxed">
              Mide la agilidad del ciclo de efectivo (<strong>CCC = DSO + DIO - DPO</strong>), liquidez corriente y
              disponibilidad inmediata. Penaliza fuertemente a las empresas cuya caja queda atrapada en inventario
              inmóvil o facturas por cobrar con plazos excesivos.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-ink text-sm">2. Solvencia Estructural y Cobertura</span>
              <span className="font-mono text-xs font-bold text-ok bg-ok/10 px-2 py-0.5 rounded">
                35% Ponderación
              </span>
            </div>
            <p className="mt-1 text-xs text-ink-muted leading-relaxed">
              Basado en el modelo <strong>Altman Z''</strong> calibrado para mercados emergentes, apalancamiento
              (Deuda/Patrimonio) y ratio de cobertura de intereses (<strong>ICR = EBITDA / Gastos por Intereses</strong>).
              Verifica si la empresa resiste un encarecimiento del crédito o una devaluación abrupta.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-ink text-sm">3. Rentabilidad y Eficiencia Operativa</span>
              <span className="font-mono text-xs font-bold text-neutral bg-neutral/10 px-2 py-0.5 rounded">
                25% Ponderación
              </span>
            </div>
            <p className="mt-1 text-xs text-ink-muted leading-relaxed">
              Márgenes Operativo y Neto, ROE (rendimiento sobre patrimonio) y ROA. Evalúa si el modelo operativo genera
              flujo genuino y excedentes o si subsiste consumiendo patrimonio de los accionistas.
            </p>
          </div>
        </div>

        {/* Escala de Grados de Resiliencia A-D */}
        <div className="mt-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-ink-muted mb-3">
            Escala de Grados de Resiliencia
          </h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs">
            <div className="rounded-lg border border-ok/30 bg-ok-soft/30 p-2.5">
              <div className="flex items-center justify-between font-bold text-ok">
                <span>Grado A (80 - 100)</span>
                <span>Salud Óptima</span>
              </div>
              <p className="mt-1 text-[11px] text-ink-muted">
                Holgura patrimonial, ciclo de caja equilibrado y sólida cobertura de pasivos.
              </p>
            </div>

            <div className="rounded-lg border border-accent/30 bg-accent-soft/30 p-2.5">
              <div className="flex items-center justify-between font-bold text-accent">
                <span>Grado B (65 - 79)</span>
                <span>Resiliencia Aceptable</span>
              </div>
              <p className="mt-1 text-[11px] text-ink-muted">
                Financieramente sostenible. Conviene monitorear plazos de cobro o endeudamiento bancario.
              </p>
            </div>

            <div className="rounded-lg border border-warn/30 bg-warn-soft/30 p-2.5">
              <div className="flex items-center justify-between font-bold text-warn">
                <span>Grado C (45 - 64)</span>
                <span>Vulnerabilidad Moderada</span>
              </div>
              <p className="mt-1 text-[11px] text-ink-muted">
                Caja tensionada o cobertura de intereses ajustada. Requiere plan de acción de capital de trabajo.
              </p>
            </div>

            <div className="rounded-lg border border-bad/30 bg-bad-soft/30 p-2.5">
              <div className="flex items-center justify-between font-bold text-bad">
                <span>Grado D (&lt; 45)</span>
                <span>Alerta Crítica</span>
              </div>
              <p className="mt-1 text-[11px] text-ink-muted">
                Asfixia operativa severa o riesgo elevado de cesación de pagos ante shocks económicos.
              </p>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border pt-4">
          <Link
            to="/metodologia"
            onClick={onCerrar}
            className="text-xs font-semibold text-accent hover:underline"
          >
            Ver fórmulas y parámetros completos en Metodología →
          </Link>
          <button
            onClick={onCerrar}
            className="w-full sm:w-auto rounded-xl bg-ink px-5 py-2 text-xs font-semibold text-surface hover:opacity-90 focus-ring"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
