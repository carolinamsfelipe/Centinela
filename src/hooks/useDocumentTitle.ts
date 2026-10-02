import { useEffect } from "react";

/**
 * React Router (modo SPA, sin loaders de título) no actualiza
 * `document.title` al cambiar de ruta. Este hook lo hace a mano: mejora la
 * pestaña del navegador (UX) y da a cada página un <title> distinto (SEO).
 *
 * Uso: llamarlo una vez al principio del componente de página.
 *   useDocumentTitle("Empresas — Centinela");
 */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    const anterior = document.title;
    document.title = title;
    return () => {
      document.title = anterior;
    };
  }, [title]);
}
