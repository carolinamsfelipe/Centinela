# Centinela PyME — plataforma web

Inteligencia financiera para empresas: salud financiera, riesgo y contexto
macroeconómico desde una única plataforma. Reescritura en React + TypeScript
del prototipo original en Streamlit ([Centinela-PyME](https://github.com/carolinamsfelipe/Centinela-PyME)),
pensada como producto de análisis (no un dashboard de cards).

Link en vivo: **https://centinela-ivory.vercel.app**

## Cómo correrlo

```bash
npm install
npm run dev
```

Las funciones de `/api` (Yahoo Finance, BCRA, dolarapi.com) corren como
funciones serverless de Vercel: localmente con `npm run dev` (Vite puro) no
están disponibles, así que la app cae automáticamente al respaldo estático.
Para probarlas de verdad hace falta `vercel dev` o el deploy real.

## Stack

React 18 + TypeScript + Vite + Tailwind CSS + React Router + Recharts, más
funciones serverless de Vercel (Node) bajo `/api` para los datos en vivo.

## Datos en vivo

- **Empresas que cotizan** (YPF, Pampa Energía, Telecom Argentina, Cresud,
  Loma Negra): `/api/company/:ticker` consulta Yahoo Finance en el momento
  (precio, balance, resultados, market cap) — el mismo enfoque que usaba
  `yfinance` en el prototipo Python, pero corriendo server-side para evitar
  CORS. Cacheado 15 min en el borde de Vercel.
- **Contexto macro**: `/api/macro` combina dolarapi.com (dólar oficial, blue,
  MEP), la API pública del BCRA v4.0 (reservas, inflación mensual e
  interanual, tasa BADLAR) y Yahoo Finance (Merval).
- **Si la conexión en vivo falla** (Yahoo con rate limit, BCRA caído, etc.),
  la app cae a un respaldo estático con un aviso visible ("Datos de
  respaldo") en vez de romperse o mostrar un dato viejo sin aclarar.
- **Empresas demo** (Banco Capital Federal, Metalúrgica del Sur, etc.) nunca
  pegan a una API real: son ficticias a propósito, para cubrir sectores sin
  datos públicos disponibles.

Se descartaron a propósito **riesgo país**, **actividad económica (EMAE)** y
**desempleo**: no encontramos una fuente pública, gratuita y realmente
actualizada para esos tres. Mejor no mostrarlos que mostrar un número viejo o
inventado como si fuera información real — ver `/metodologia`.

## Qué está construido

- Layout: header sticky, buscador con debounce, modo oscuro.
- Home, `/empresas` (filtros + tabla), ficha de empresa completa (Score
  Centinela, Altman Z'', semáforo, indicadores, histórico, señales, contexto
  macro por sector, favoritos).
- `/comparador`, `/rankings`, `/macro`, `/mercado`, `/simulador`,
  `/favoritos`, `/presentacion` (modo pitch para el jurado).
- `/metodologia` y `/fuentes`: documentación honesta de cómo se calcula cada
  cosa y de dónde sale cada dato.
- Lógica financiera aislada en `src/lib/financial/` (ratios, Altman, Score
  Centinela, señales, benchmarks, simulación), separada de la presentación.

## Arquitectura de datos

`src/services/` es la única puerta de entrada a los datos — ningún
componente importa `/api` ni `src/data/` directamente. Esto permite que
`companyService.ts` y `macroService.ts` intenten la fuente en vivo y caigan
al respaldo sin que la UI tenga que saber la diferencia (solo lee el flag
`envivo` para mostrar el aviso correspondiente).

## Limitaciones conocidas

- El Score Centinela es una métrica propia de este proyecto académico, no un
  estándar de la industria — su metodología está documentada en
  `/metodologia` para que se pueda auditar y ajustar.
- El Altman Z'' histórico (en los gráficos de evolución) usa el market cap
  actual, no el de cada período pasado — Yahoo no lo provee por este camino.
- No se pudo correr `npm run build` ni probar las funciones de `/api` con un
  navegador real en el entorno donde se escribió este código (sin Node.js
  disponible); se verificó la lógica contra la API real de Yahoo/BCRA/dolarapi
  con `curl`, y el comportamiento final en el navegador se confirmó en el
  deploy real de Vercel.
