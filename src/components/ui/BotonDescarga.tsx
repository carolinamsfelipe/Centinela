import { useState } from "react";

interface Props {
  label: string;
  onDescargar: () => Promise<void>;
  /** "principal" para la accion destacada, "secundario" para las demas. */
  variante?: "principal" | "secundario";
  disabled?: boolean;
}

/**
 * Boton que genera y descarga un archivo (PDF/Excel). La generacion corre en
 * el navegador y puede tardar un instante la primera vez (se descarga la
 * libreria bajo demanda), por eso muestra un estado "Generando..." y, si algo
 * falla, lo dice en vez de quedarse mudo.
 */
export function BotonDescarga({ label, onDescargar, variante = "secundario", disabled = false }: Props) {
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function manejarClick() {
    setGenerando(true);
    setError(null);
    try {
      await onDescargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo generar el archivo.");
    } finally {
      setGenerando(false);
    }
  }

  const clase =
    variante === "principal"
      ? "bg-accent text-white hover:opacity-90"
      : "border border-border text-ink-muted hover:text-ink";

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={manejarClick}
        disabled={disabled || generando}
        className={`rounded-lg px-3 py-2 text-sm font-medium focus-ring disabled:cursor-not-allowed disabled:opacity-50 ${clase}`}
      >
        {generando ? "Generando..." : label}
      </button>
      {error && (
        <span role="alert" className="text-xs text-bad">
          {error}
        </span>
      )}
    </span>
  );
}
