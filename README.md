# Centinela PyME — plataforma web

Inteligencia financiera para empresas: salud financiera, riesgo y contexto
macroeconómico desde una única plataforma. Reescritura en React + TypeScript
del prototipo original en Streamlit ([Centinela-PyME](https://github.com/carolinamsfelipe/Centinela-PyME)),
pensada como producto de análisis (no un dashboard de cards).

## Cómo correrlo

```bash
npm install
npm run dev
```

## Stack

React 18 + TypeScript + Vite + Tailwind CSS + React Router + Recharts.
Sin backend propio todavía: los datos viven en `src/data/companies.ts` y se
acceden siempre a través de `src/services/` (nunca directo desde los
componentes), para poder reemplazar el mock por una API real sin tocar la UI.

## Qué está construido (Fase 1 + Fase 2)

- Layout: header sticky con navegación, buscador con debounce y modo oscuro;
  footer con disclaimer legal.
- Home: hero, buscador, exploración por sector, panorama del mercado
  (calculado en vivo sobre el dataset, no hardcodeado).
- `/empresas`: explorador con filtros (sector, mercado, riesgo) y tabla
  ordenable por cualquier columna.
- `/empresas/:ticker`: ficha completa — resumen ejecutivo basado en reglas
  (nunca infiere causas que los datos no muestran), Score Centinela con
  desglose por categoría, Altman Z'' con gauge, semáforo financiero,
  indicadores fundamentales con tooltips, evolución histórica (Recharts) y
  señales automáticas.
- `/metodologia` y `/fuentes`: documentación completa y honesta de cómo se
  calcula cada cosa y de dónde sale cada dato.
- Lógica financiera aislada en `src/lib/financial/` (ratios, Altman, Score
  Centinela, señales, benchmarks), separada de la presentación — son las
  mismas fórmulas ya validadas en el prototipo Python.

## Qué falta (Fase 3 a 6 — roadmap, no implementado)

Comparador, rankings, dashboard de mercado y macro, simulador de escenarios,
favoritos, alertas, modo presentación, SEO/A11y/performance avanzados. Las
rutas ya existen y muestran un estado "Próximamente" explícito en vez de una
página vacía o un link roto — ver `src/App.tsx`.

## Datos

Las empresas YPF, Pampa Energía, Telecom Argentina, Cresud y Loma Negra usan
cifras de balance reales (fuente: Yahoo Finance, vía el prototipo Python).
Las demás empresas del dataset están marcadas `fuente: "demo"` en el código y
con un badge "Datos demo" en la interfaz: son ficticias, creadas para poder
mostrar sectores sin datos públicos reales disponibles en el plazo del
proyecto. Nunca se presentan como información real. Ver `/fuentes`.

## Limitaciones conocidas

- No hay backend ni base de datos: todo corre en el cliente sobre datos
  estáticos. `src/services/` está armado para que cambiar esto después no
  requiera tocar componentes.
- El Score Centinela es una métrica propia de este proyecto académico, no un
  estándar de la industria — su metodología está documentada en
  `/metodologia` para que se pueda auditar y ajustar.
- No se pudo correr `npm run build` en el entorno donde se escribió este
  código (sin Node.js disponible); se verificó a mano y se desplegó en
  Vercel, que sí corre el build real.
