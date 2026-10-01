import { useEffect, useState } from "react";

export function useTheme() {
  const [dark, setDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("centinela-theme");
      if (saved) return saved === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("centinela-theme", dark ? "dark" : "light");
    } catch {
      // localStorage no disponible (navegación privada): el tema no persiste, no es crítico.
    }
  }, [dark]);

  return { dark, toggle: () => setDark((d) => !d) };
}
