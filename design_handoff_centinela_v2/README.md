# Handoff: Centinela v2 (rediseño en paralelo, sin romper la app actual)

## Overview
Rediseño de Centinela como dashboard de diagnóstico financiero en 5 módulos: Panel general y alerta temprana, Capital de trabajo (CCC), Deuda y solvencia (ICR), Simulador FX y caja, y Benchmark. Incluye un selector de entidad persistente y la carga de empresa por CSV o Excel.

**Principio de implementación:** la v2 se agrega **al lado** de la app actual, bajo `/v2/*`. No se modifica ninguna ruta, página, componente, token ni función existente. Ambas versiones comparten la capa de datos (`src/services/`) y la lógica (`src/lib/financial/`), así que las cifras son idénticas en las dos. Cuando la v2 esté validada se cambia la ruta por defecto. Hasta entonces, revertir significa borrar una línea del router.

## About the Design Files
Los archivos de `diseño/` son **referencias de diseño hechas en HTML**: prototipos que muestran el aspecto y el comportamiento buscados, no código de producción para copiar. La tarea es **recrearlos dentro del repo `carolinamsfelipe/Centinela`** (React 18 + TypeScript + Vite + Tailwind 3 + React Router 6 + Recharts), con sus patrones actuales.

Los archivos de `codigo/` sí son componentes React/TSX pensados para el repo. Hay que revisarlos y ajustar sus imports (ver Fase 3).

## Fidelity
**Alta fidelidad (hifi).** Colores, tipografía, espaciado, estados y micro-interacciones son finales. Recrear con precisión de píxel usando los tokens de `codigo/tokens-v2.css`.

Las cifras de Metalúrgica Don Pedro salen de `EMPRESA_DEMO_PEDRO`. Las series trimestrales, el calendario de vencimientos y los comparables del benchmark son **ilustrativos** en el prototipo. En producción deben calcularse con las funciones existentes; nunca dejar datos fijos (regla del README del repo: "Nunca se inventan cifras").

---

## Plan de implementación sin romper el original

### Fase 0 · Garantías
- Rama `feat/v2`. Toda la UI nueva vive en `src/v2/` y no se importa desde las páginas actuales.
- **No tocar:** `src/pages/*`, `src/components/*`, `src/lib/*`, `src/services/*`, `src/types/*`, `api/*`, el bloque `:root`/`.dark` de `src/index.css` ni las claves existentes de `tailwind.config.ts`.
- Criterio de aceptación de cada PR: `npm run build` sin errores y todas las rutas actuales (`/`, `/empresas`, `/empresas/:ticker`, `/comparador`, `/rankings`, `/simulador`, `/mi-empresa`, `/mercado`, `/macro`, `/metodologia`, `/fuentes`, `/asesores`, `/presentacion`) se ven igual que en `main`.

### Fase 1 · Base (sin cambio visible)
1. Copiar `codigo/tokens-v2.css` a `src/v2/tokens-v2.css` e importarlo **solo** desde `src/v2/V2Layout.tsx`. Todas las variables tienen prefijo `--v2-` y viven bajo `.v2`, así que no pisan las actuales.
2. `tailwind.config.ts`: **agregar** colores con prefijo (sin modificar los existentes):
   ```ts
   "v2-bg": "rgb(var(--v2-bg) / <alpha-value>)", "v2-s1": ..., "v2-s2": ..., "v2-line": ..., "v2-line2": ...,
   "v2-ink": ..., "v2-ink2": ..., "v2-ink3": ..., "v2-acc": ..., "v2-ok": ..., "v2-warn": ..., "v2-bad": ...,
   "v2-d1": ..., "v2-d2": ..., "v2-d3": ...
   ```
   Fondos suaves de estado: `bg-v2-ok/10`, `bg-v2-warn/10`, `bg-v2-bad/10` (13% en oscuro, vía `dark:bg-v2-ok/[0.13]`).
3. Fuente: sumar `IBM+Plex+Sans:wght@400;500;600;700` al `<link>` de Google Fonts de `index.html`. Plex Mono ya está. Inter se mantiene para la app actual.
4. Dependencias nuevas: `lucide-react`. Opcional: `@radix-ui/react-slider`, `@radix-ui/react-toggle-group`, `@radix-ui/react-tooltip`, o generarlos con `npx shadcn@latest add slider toggle-group tooltip card` dentro de `src/v2/ui/` (no en `src/components/ui/`, que ya tiene `Card.tsx` y `Badge.tsx` propios). `recharts` y `xlsx` ya están.
5. El modo oscuro reutiliza `useTheme()` del repo, que pone `.dark` en `<html>`. No crear otro mecanismo.

### Fase 2 · Shell y rutas
- `src/v2/V2Layout.tsx`: `<div className="v2 grid min-h-screen grid-cols-[228px_minmax(0,1fr)] bg-v2-bg text-v2-ink">` con `<Sidebar/>`, `<TopBar/>` y `<Outlet/>`.
- En `src/App.tsx`, **agregar una sola** ruta anidada, sin cambiar las demás:
  ```tsx
  <Route path="/v2" element={<V2Layout />}>
    <Route index element={<PanelV2 />} />
    <Route path="capital-trabajo" element={<CapitalTrabajoV2 />} />
    <Route path="deuda" element={<DeudaV2 />} />
    <Route path="simulador" element={<SimuladorV2 />} />
    <Route path="benchmark" element={<BenchmarkV2 />} />
  </Route>
  ```
  El `<Header/>` y el `<Footer/>` actuales envuelven todo en `App.tsx`. Para que no aparezcan dentro de `/v2`, condicionarlos con `useLocation().pathname.startsWith("/v2")`. Es el único cambio en un archivo existente además del router.
- Contexto global en la URL: `/v2/...?empresa=DEMO-PEDRO&periodo=FY25&moneda=ARS`. Hook `useV2Filters()` sobre `useSearchParams`.
- Acceso opcional: un link "Probar nueva interfaz" en el `Header` actual, detrás de `import.meta.env.VITE_V2 === "1"`.

### Fase 3 · Datos (reutilizar, no duplicar)
| Necesidad en v2 | Función existente |
|---|---|
| Lista de entidades (selector) | `getCompanies()` / `getMarketCompanies()` de `companyService.ts` + `listarEmpresasPropias()` de `userCompanies.ts` |
| Caso demo | `EMPRESA_DEMO_PEDRO` (`src/data/companies.ts`) |
| Carga CSV / Excel | `filasDesdeCsv`, `filasDesdeExcel`, `periodosDesdeFilas`, `guardarEmpresaPropia`, `PLANTILLA_CSV`, `COLUMNAS_OBLIGATORIAS` (`userCompanies.ts`) |
| Métricas | `metricsDesdePeriodo`, `historicoDesdePeriodos` (`metrics.ts`) |
| Semáforo + criterios | `construirSemaforo`, `CRITERIOS` (`semaforo.ts`) + `diagnosticarCcc/Dso/Dpo/Icr` (`diagnostics.ts`) |
| Altman / Score | `calcularAltman`, `ALTMAN_THRESHOLDS`, `calcularCentinelaScore` |
| CCC / ICR con estimación | `inferirMetricasCaja` (`benchmarks.ts`); mostrar "Est. sectorial" si `es*Estimado` |
| Benchmark | `benchmarkPorMercado`, `calcularBenchmarkSector`, `MEDIANAS_SECTORIALES_DEFAULT` |
| Simulador | `simularEscenarios` (`simulation.ts`) para Base/Pesimista/Shock; impactos con `calcularImpactoCajaDso/Dpo`, `calcularImpactoDevaluacionDeuda` |
| Formatos | `fmtNum`, `fmtPct`, `fmtX`, `fmtMonto`, `aUsd` (`format.ts`) |

La carga de empresa de la v2 usa la **misma** clave de localStorage (`centinela-mis-empresas`) y el mismo formato que `/mi-empresa`. Una empresa cargada en una versión aparece en la otra.

Ajuste en `codigo/PanelAlertaTemprana.tsx` y `codigo/SimuladorCambiario.tsx`: reemplazar las clases `bg-surface`, `text-ink-muted`, `text-ok`, etc. por sus equivalentes `v2-*` (`bg-v2-s1`, `text-v2-ink2`, `text-v2-ok`…). Así no dependen de los tokens viejos ni los modifican.

**Faltantes de datos a resolver (no inventar):**
- Calendario de vencimientos y moneda por tramo: no existen en `FinancialMetrics`. Agregar columnas opcionales a la plantilla (`vencimientos_q1…q8`, `vencimientos_usd_q1…q8`) en un PR aparte. Si faltan, mostrar el módulo con estado "Sin dato".
- Series trimestrales para sparklines y QoQ: hoy solo hay ejercicios anuales. Usar `historico` anual (YoY) y ocultar el sparkline si hay menos de 3 puntos.
- Runway: requiere `efectivo` (ya es columna opcional de la plantilla). Runway = efectivo ÷ ((ventas − EBITDA) / 365) días. Sin efectivo, mostrar N/D.

### Fase 4 · Cambio de ruta por defecto (PR final, reversible)
Cuando la v2 esté validada: `/` → `<Navigate to="/v2" />` y mover `Home` a `/clasico`. Las rutas viejas se mantienen accesibles un tiempo, y `Metodología` y `Fuentes` quedan enlazadas desde el pie del sidebar.

---

## Screens / Views

### Shell
- **Sidebar** (228 px, sticky, alto 100vh, `bg-v2-s1`, borde derecho `v2-line`)
  - Logo: `public/shield.svg` 22 px + "CENTINELA" en Plex Mono 14/600, tracking 0.08em. Padding 16×18 y borde inferior.
  - **Selector de entidad:** botón con borde de 8 px de radio, padding 10×12 y fondo `v2-bg`. Muestra la etiqueta "ENTIDAD" (10 px, caps, +8%, `v2-ink3`), el nombre (13/600) y la meta en mono 11 `v2-ink2` (`TICKER · Sector · Moneda`). Ícono `ChevronsUpDown` 14 px. Abierto: borde `v2-acc`.
  - **Popover** (300 px, borde `v2-line2`, sombra `0 12px 32px rgba(0,0,0,.35)`):
    - buscador arriba;
    - grupos "Caso demo", "Mis empresas" y "Cotizantes", con ítems 13 px y tag mono 10 px a la derecha;
    - pie "Cargar empresa (CSV / Excel)" en `v2-acc` con ícono `Upload`.
    - Se cierra con un clic fuera.
  - **Nav "DIAGNÓSTICO":** 5 ítems con ícono 16 px, padding 8 px y radio 6. Activo: `bg-v2-s2` `text-v2-ink`. Inactivo: `text-v2-ink2`. Cada ítem lleva una píldora mono 10 px a la derecha, con el color del estado si corresponde:
    - Panel: cantidad de críticas;
    - CCC: "CCC";
    - Deuda: "ICR".
  - **Pie:** links Metodología y Fuentes, y control segmentado Oscuro / Claro que llama a `useTheme().toggle`.
- **TopBar** (sticky, `bg-v2-s1`, borde inferior, padding 12×24)
  - Breadcrumb "Entidad / Diagnóstico" (11 px `v2-ink3`) y título del módulo (16/600, −1%, una línea con elipsis).
  - Segmentados con contenedor de padding 2, borde y radio 6. Activo: `bg-v2-s2`; texto mono 11.
    - Período: FY23 · FY24 · FY25.
    - Moneda: ARS · USD.
  - Botón "vs Mediana {sector} · {mercado}".
  - A la derecha: estado del dato (punto de 6 px + mono 11, por ejemplo "Demo · cierre 31/12/2025") y el botón "Exportar" (fondo `v2-ink`, texto `v2-bg`, 12/600, radio 6).

### 01 Panel general
- **Franja de estado** (una card dividida por bordes verticales):
  - Score 24 px mono "/100 Score", o Altman Z'' si no hay Score;
  - badge de estado;
  - conteo Críticas / Precaución / Saludables (mono 20 coloreado);
  - resumen de 13/1.5 en `v2-ink2`.
- **4 KPI cards** (`grid auto-fit minmax(240px,1fr)`, gap 12, padding 14×16, radio 8). Hover: `bg-v2-s2` y borde `v2-line2`. Al hacer clic navegan al módulo causal.
  - Etiqueta 12 `v2-ink2` + badge.
  - Valor mono 30/500, −2%, interlineado 1, con unidad mono 12 `v2-ink3`.
  - Sparkline de 112×32: línea `v2-d2` de 1.5 px y punto final de r 3 con el color del estado.
  - Pie con borde superior: deltas mono 11 (rojo si empeora, verde si mejora) más la etiqueta "QoQ"/"YoY" en `v2-ink3`, y la referencia a la derecha.
  - KPIs:
    - CCC: días, referencia "med. 79 d";
    - ICR: x, "quiebre 1,0x";
    - Exposición cambiaria: % deuda USD, "+10% FX: $ 2,1 M";
    - Runway: días de egresos, "caja $ 51,0 M".
- **Alertas tempranas:** filas con barra de color de 3 px a la izquierda, título 13/500 con la forma del estado, detalle mono 11 `v2-ink2` y destino "Módulo ↗" a la derecha. Ordenadas por severidad.
- **Semáforo por indicador:** tabla 12 px (Indicador | Valor mono a la derecha | Estado | Umbrales mono 11 `v2-ink3`). Los umbrales salen de `CRITERIOS`, y la columna se puede ocultar.

### 02 Capital de trabajo
- **Franja de 4 KPIs:** CCC actual, mediana del sector, caja inmovilizada (CxC + Inventario − CxP) y caja liberable alineando a la mediana (en verde).
- **Línea de tiempo** (escala 0–130 días, 3 filas de 30 px):
  - Operación: DIO (`v2-d1`) y DSO (`v2-d2`);
  - Proveedores: DPO (`v2-s2` con borde `v2-line2`);
  - Brecha a financiar: desde el fin del DPO hasta el fin del DSO, `bg-warn/13` con borde punteado `v2-warn`, texto "CCC 84,6 d" y "≈ $ 55,6 M".
  - Al hacer clic en un segmento se selecciona (outline 2 px `v2-ink`).
- **3 cards DIO / DSO / DPO:**
  - valor mono 26;
  - barra de 6 px con el valor y una marca de 2 px en la mediana;
  - delta frente a la mediana con su equivalente en caja;
  - lectura de una línea;
  - tag: Ventaja (ok), Cuello de botella (bad) o Margen de mejora (warn).
- **Tabla de evolución:** mono 12, DIO/DSO/DPO/CCC por período, con la fila CCC en 600.

### 03 Deuda y solvencia
- **KPIs:** ICR, Deuda financiera (% USD/ARS), Deuda/EBITDA y Servicio a 12 meses (capital + intereses).
- **Estructura de pasivos:** barra apilada de 28 px con gap de 2. Segmentos: deuda ARS `v2-d2`, deuda USD `v2-acc`, proveedores `v2-d1`, otros `v2-s2`. Leyenda con monto y %.
- **Vencimientos frente a EBITDA trimestral:**
  - 8 columnas apiladas (intereses `v2-d1`, capital ARS `v2-d2`, capital USD `v2-acc`) de alto 200 px;
  - línea punteada de 1.5 px `v2-ink` al nivel del EBITDA trimestral;
  - las columnas que superan el EBITDA llevan la etiqueta "◆ +x,x" en `v2-bad`.
- **Distancia al quiebre:** dos mini-charts (ICR ante una caída de EBITDA de 0 a −40%, e ICR ante una suba de tasa de +0 a +30 pp) con línea de 1,0x punteada `v2-bad` al 50% del alto. Barras coloreadas: <1 bad, 1–2 warn, >2 ok.

### 04 Simulador FX y caja
- Layout `flex-wrap`: controles con `flex: 1 1 300px` y resultados con `flex: 2.6 1 520px`.
- **Controles:**
  - Segmentado Base / Pesimista / Shock FX, con su descripción (11 px `v2-ink3`) y "Restablecer".
  - 5 sliders (Devaluación 0–100% paso 5, Tasa ARS 30–120%, Ventas −30…+30%, DSO 30–120 d, DPO 15–90 d). El valor mono 13 está en `v2-ink` si es igual al actual, `v2-ok` si mejora y `v2-bad` si empeora. Bajo el riel: mínimo, "actual X" y máximo.
  - Mover un slider cambia el escenario a "custom".
- **Resultados:**
  - 4 KPIs antes→después (antes tachado mono 12 `v2-ink3`, después mono 22 coloreado, delta mono 11): Caja a 12 meses, Caja mínima (con el mes), ICR y CCC.
  - Gráfico de 12 meses: barra "antes" con borde punteado `v2-d2` y barra "después" sólida `v2-acc` (`v2-bad` bajo la caja mínima). Línea de caja mínima punteada `v2-bad`. Transición de altura de 200 ms ease.
  - Banner rojo cuando el saldo perfora el mínimo: "La caja perfora el mínimo operativo en {mes} ({monto})…".
  - Tabla puente: EBITDA, Intereses, Capex/otros, Capital de trabajo, Costo FX de amortizaciones, Flujo neto y Δ pasivo por FX.

### 05 Benchmark
- **Franjas de percentil:** grilla `96px | track | 64px | 40px`. El track tiene banda P25–P75 (`v2-s2` con borde), marca de mediana de 2 px y punto de 10 px coloreado por cuartil (P<25 bad, <50 warn, ≥50 ok). A la derecha, el valor y "Pnn".
- **Dispersión CCC (0–150) × ICR (0–8):**
  - cuadrantes en la mediana de CCC y en ICR 2x;
  - cuadrante superior izquierdo `ok/10` y cuadrante inferior derecho `bad/10`;
  - pares como puntos de 7 px `v2-d2` con ticker;
  - la entidad propia en un punto de 12 px `v2-acc` con halo.
- **Tabla de comparables:**
  - chips de mercado (activo: fondo `v2-ink`);
  - contador "n empresas" y botón CSV;
  - orden por columna (primer clic ascendente, segundo descendente, flecha ↑↓);
  - celdas del cuartil mejor y peor en verde y rojo;
  - fila propia con fondo `v2-acc/12`.

### Modal "Cargar empresa"
- Overlay `rgba(5,8,14,.6)`. Card de 720 px máximo, radio 10, sombra `0 24px 64px rgba(0,0,0,.45)`. Indicador de pasos "1 Datos → 2 Revisión".
- **Paso 1:**
  - campos Nombre, Mercado, Sector y Moneda (`MERCADOS`, `SECTORES`, `MONEDAS` del repo);
  - dropzone con borde punteado de 1.5 px y radio 8 (al arrastrar encima: borde `v2-acc` y fondo `v2-acc/12`), que acepta `.csv,.txt,.xlsx,.xls`;
  - recuadro de columnas obligatorias y opcionales, con el botón "Descargar plantilla CSV" (`PLANTILLA_CSV`).
- **Paso 2:**
  - archivo y cantidad de ejercicios;
  - errores (◆ bad) y advertencias (▲ warn) de `periodosDesdeFilas`, más la advertencia de balance que no cuadra (>5%);
  - tabla de períodos con columna "Cuadra";
  - vista previa del semáforo del último ejercicio (6 indicadores).
  - "Guardar y analizar" llama a `guardarEmpresaPropia`, la selecciona como entidad activa y navega a `/v2`.

## Interactions & Behavior
- Hover de card o fila: fondo `v2-s2` y borde `v2-line2` en 120 ms, sin escala ni sombra.
- Foco visible: anillo de 2 px `v2-acc` (reutilizar `.focus-ring`).
- Todo KPI o alerta navega al módulo que la explica.
- Los sliders recalculan en vivo, sin debounce: `simularEscenarios` es puro y tarda menos de 1 ms.
- Cambiar moneda o período reemplaza las cifras en el mismo lugar. Los estados de carga reales usan skeletons con la forma exacta del dato.
- Con `prefers-reduced-motion` se eliminan las transiciones de gráficos.
- Los estados combinan siempre color y forma: ● Saludable, ▲ Precaución, ◆ Crítico, ○ Sin dato. Esto reemplaza a `ESTADO_EMOJI` solo en la v2.

## State Management
- URL: `empresa`, `periodo`, `moneda` (`useV2Filters`).
- Local de cada módulo:
  - CCC: `cccSel`;
  - Simulador: `escenario`, `supuestos`;
  - Benchmark: `sortKey`, `sortDir`, `filtroMercado`;
  - Modal: `paso`, `archivo`, `periodos`, `errores`, `advertencias`, `drag`.
- Datos: `getCompanies()` (fetch con fallback, ya existente) y `listarEmpresasPropias()`.

## Design Tokens
Ver `codigo/tokens-v2.css`. La tabla completa claro/oscuro está en `diseño/Centinela Sistema.dc.html` (§05).
- **Tipografía:**
  - Plex Sans: 16/600 título de página, 13/600 título de card, 13/1.5 cuerpo, 12 etiquetas, 10 caps +8% overline;
  - Plex Mono: 30/500 KPI, 22–26 métricas, 12 tabla, 11 metadatos, 10 ejes.
- **Espaciado:** base 4; gaps 12/16; padding de card 14–16; filas de tabla de 7–8 px de alto vertical.
- **Radios:** card 8, control 6, badge 4, modal 10.
- **Sombras:** solo en popover y modal.

## Assets
- `public/shield.svg`, ya existente en el repo.
- Íconos de lucide-react: LayoutDashboard, RefreshCw, Landmark, SlidersHorizontal, ChartScatter, BookOpen, Database, Moon, Sun, ChevronsUpDown, Search, Upload, GitCompare, ChevronDown, Download, ArrowUpRight, RotateCcw, FileSpreadsheet, FileCheck, FileDown, Info, X.

## Files
- `diseño/Centinela v2.dc.html`: prototipo interactivo con los 5 módulos, el selector y la carga. Abrirlo en el navegador.
- `diseño/Centinela Sistema.dc.html`: auditoría, arquitectura, wireframes, tokens, tipografía y micro-interacciones.
- `diseño/Simulador (actual).dc.html`: recreación de `/simulador` actual como referencia del "antes".
- `codigo/PanelAlertaTemprana.tsx`, `codigo/SimuladorCambiario.tsx`: componentes base (adaptar las clases a `v2-*`).
- `codigo/tokens-v2.css`: tokens aditivos con alcance `.v2`.
