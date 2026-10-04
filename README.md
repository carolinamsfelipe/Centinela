# Centinela — plataforma web

Copiloto de diagnóstico financiero y alerta temprana: salud financiera, riesgo y
contexto macroeconómico de empresas de distintos mercados, con datos reales en
vivo. Reescritura en React + TypeScript del prototipo original en Streamlit,
que conserva su esencia: semáforo por indicador con el criterio a la vista,
gauge del Altman Z'', contexto macro arriba, análisis ejecutivo con preguntas
de revisión (due diligence) y carga del balance de una empresa propia. Es un
apoyo a la decisión, no un veredicto de crédito.

Link en vivo: **https://centinela-ivory.vercel.app**

## Cómo correrlo

```bash
npm install
npm run dev
```

Las funciones de `/api` (Yahoo Finance, BCRA, dolarapi.com) corren como
funciones serverless de Vercel: localmente con `npm run dev` (Vite puro) no
están disponibles, así que las empresas caen al respaldo (o a "sin dato").
Para probarlas de verdad hace falta `vercel dev` o el deploy real.

## Stack

React 18 + TypeScript + Vite + Tailwind CSS + React Router + Recharts, más
funciones serverless de Vercel (Node) bajo `/api`. Informes: `jspdf` +
`jspdf-autotable` (PDF) y `xlsx` (Excel, lectura y escritura), cargados bajo
demanda para no pesar en la carga inicial.

## Datos en vivo (sin datos ficticios)

- **29 empresas** que cotizan en Argentina, Brasil, Estados Unidos, Europa y
  Asia: `/api/companies` (lotes) y `/api/company/:ticker` consultan Yahoo
  Finance en el momento: balance, resultados, EBITDA, flujo de caja, precio y
  capitalización. Cacheado 15 min en el borde de Vercel.
- **Monedas**: cada empresa reporta en su moneda; la capitalización de mercado
  se convierte a esa moneda con el tipo de cambio de Yahoo antes de calcular
  el Altman Z'' (X4), y se descartan ejercicios en otra moneda (p. ej. YPF
  2022 en ARS) en vez de mezclarlos. En las pantallas, los importes se
  expresan en US$ al tipo de cambio actual para comparar entre mercados.
- **Contexto macro**: `/api/macro` combina dolarapi.com (dólar oficial, blue,
  MEP), la API pública del BCRA v4.0 (reservas, inflación, BADLAR) y Yahoo
  Finance (Merval + referencias de otros mercados: S&P 500, Nasdaq, VIX, bono
  EE.UU. 10 años, Ibovespa, S&P/BMV IPC, Euro Stoxx 50, Nikkei, Hang Seng,
  euro, real, oro y petróleo). `/api/fx` expone los tipos de cambio.
- **Si la conexión en vivo falla**, la ficha lo avisa ("Datos de respaldo").
  Solo las 5 empresas del prototipo original conservan una captura anterior;
  el resto queda "sin dato". Nunca se inventan cifras.
- **Bancos**: Altman Z'' y Score no se calculan (N/A): el modelo corporativo
  no aplica a entidades financieras. Se muestran ROE, ROA y capitalización.

Se descartaron a propósito **riesgo país**, **actividad económica (EMAE)** y
**desempleo**: no hay una fuente pública, gratuita y realmente actualizada.

## Mi empresa, informes y comparación entre mercados

- `/mi-empresa`: cargá el balance de una empresa que no cotiza (CSV o Excel con
  plantilla, o a mano), elegí mercado, sector y moneda. Se guarda solo en el
  navegador (localStorage). Si no se informa el valor de mercado del
  patrimonio se usa el valor libro y se aclara en ficha e informe.
- La empresa propia funciona como cualquier otra: ficha completa, comparador,
  favoritos, simulador y ranking.
- **Informes descargables**: PDF y Excel por empresa (ficha) y para el
  comparador; Excel del listado de empresas.
- **Comparación entre mercados**: el comparador mezcla mercados y sectores; la
  ficha incluye la mediana del mismo sector en cada mercado contra la empresa;
  `/mercado` muestra el Score promedio por mercado.

## Qué está construido

- Home, `/empresas` (filtros por sector, mercado y riesgo), ficha de empresa
  (Score Centinela, Altman Z'', semáforo con criterios, indicadores, histórico,
  señales, comparación con otros mercados, contexto macro por mercado,
  análisis ejecutivo y aspectos para revisar).
- `/comparador`, `/rankings`, `/macro`, `/mercado`, `/simulador`, `/favoritos`,
  `/mi-empresa`, `/presentacion`.
- `/metodologia` y `/fuentes`: documentación de cómo se calcula cada cosa, qué
  no se calcula y por qué, y de dónde sale cada dato.
- Lógica financiera aislada en `src/lib/financial/` y generación de informes en
  `src/lib/reports/`, separadas de la presentación.

## Arquitectura de datos

`src/services/` es la única puerta de entrada a los datos: ningún componente
importa `/api` ni `src/data/` directamente. `companyService.ts` y
`macroService.ts` intentan la fuente en vivo y caen al respaldo; las empresas
propias salen de `userCompanies.ts` y entran al resto de la app como cualquier
otra empresa.

## Limitaciones conocidas

- El Score Centinela es una métrica propia de este proyecto académico, no un
  estándar de la industria; su metodología está en `/metodologia`.
- El Altman Z'' y el Score históricos solo se calculan para empresas propias
  (usan el valor libro de cada ejercicio); para empresas que cotizan Yahoo no
  entrega la capitalización de cada cierre pasado y se deja en blanco.
- Las cifras en pesos argentinos son nominales (sin ajuste por inflación): los
  ratios son comparables, la evolución nominal de importes no.
- Yahoo Finance es una fuente no oficial y puede no informar algún dato (p. ej.
  la capitalización de TEO en ciertos momentos); en ese caso el indicador
  queda en N/D.
