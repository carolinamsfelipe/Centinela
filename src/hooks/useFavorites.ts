import { useEffect, useState } from "react";

const STORAGE_KEY = "centinela-favoritos";

function leerFavoritos(): string[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t): t is string => typeof t === "string");
  } catch {
    return [];
  }
}

function guardarFavoritos(tickers: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tickers));
  } catch {
    // localStorage no disponible (navegación privada): los favoritos no persisten, no es crítico.
  }
}

/**
 * Hook de favoritos respaldado por localStorage, siguiendo el mismo patrón
 * que useTheme.ts: toda lectura/escritura está envuelta en try/catch para
 * nunca romper en navegación privada o entornos sin storage disponible.
 */
export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>(() => leerFavoritos());

  useEffect(() => {
    guardarFavoritos(favorites);
  }, [favorites]);

  function isFavorite(ticker: string): boolean {
    return favorites.includes(ticker);
  }

  function toggleFavorite(ticker: string) {
    setFavorites((prev) =>
      prev.includes(ticker) ? prev.filter((t) => t !== ticker) : [...prev, ticker]
    );
  }

  return { favorites, isFavorite, toggleFavorite };
}
