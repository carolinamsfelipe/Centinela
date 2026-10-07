import { sanitizarTextoPlanilla } from "@/services/userCompanies";

/** Descarga un CSV (separador ;, BOM UTF-8 para Excel). Toda celda de texto se sanitiza contra formula injection. */
export function descargarCsv(nombre: string, filas: Array<Array<string | number | null>>): void {
  const celda = (c: string | number | null): string => {
    const t = c === null ? "" : typeof c === "number" ? String(c).replace(".", ",") : sanitizarTextoPlanilla(c);
    return /[;"\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const csv = filas.map((f) => f.map(celda).join(";")).join("\r\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
