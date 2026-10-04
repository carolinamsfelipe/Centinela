import { Card } from "@/components/ui/Card";

interface Fuente {
  fuente: string;
  variable: string;
  frecuencia: string;
  actualizacion: string;
  url: string;
  descripcion: string;
}

const FUENTES: Fuente[] = [
  {
    fuente: "Yahoo Finance",
    variable: "Balance, resultados, flujo de caja, capitalización, precio y tipos de cambio",
    frecuencia: "Estados anuales por ejercicio; precio y tipo de cambio en la última rueda",
    actualizacion: "En vivo: se consulta al abrir cada pantalla (caché de 15 minutos)",
    url: "https://finance.yahoo.com",
    descripcion:
      "29 empresas que cotizan en Argentina, Brasil, Estados Unidos, Europa y Asia (ADR en dólares). Cada ficha indica a qué hora se consultó la fuente y en qué moneda reporta la empresa.",
  },
  {
    fuente: "dolarapi.com",
    variable: "Dólar oficial, blue y MEP",
    frecuencia: "Continua",
    actualizacion: "En vivo (caché de 15 minutos)",
    url: "https://dolarapi.com",
    descripcion: "Cotizaciones del dólar en Argentina.",
  },
  {
    fuente: "BCRA — Estadísticas monetarias v4.0",
    variable: "Reservas internacionales, inflación mensual e interanual (IPC), tasa BADLAR",
    frecuencia: "Diaria (reservas, BADLAR) y mensual (IPC)",
    actualizacion: "En vivo (caché de 15 minutos); la fecha de cada dato se muestra en /macro",
    url: "https://api.bcra.gob.ar",
    descripcion: "API pública del Banco Central de la República Argentina.",
  },
  {
    fuente: "Yahoo Finance — índices y referencias globales",
    variable: "Merval, S&P 500, Nasdaq, VIX, bono EE.UU. 10 años, Ibovespa, S&P/BMV IPC, Euro Stoxx 50, Nikkei, Hang Seng, euro y real, oro y petróleo",
    frecuencia: "Última rueda",
    actualizacion: "En vivo (caché de 15 minutos)",
    url: "https://finance.yahoo.com",
    descripcion: "Referencias de contexto para empresas de cada mercado.",
  },
];

export function Fuentes() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 lg:px-8">
      <h1 className="text-2xl font-bold text-ink">Fuentes</h1>
      <p className="mt-2 text-ink-muted">
        Cada dato que se muestra en Centinela tiene una fuente identificable y se consulta en vivo. No hay
        empresas ni cifras ficticias: lo que no se puede obtener de una fuente real se muestra sin dato.
        Lo único que no viene de una fuente externa son los balances que cargás vos en{" "}
        <a href="/mi-empresa" className="underline">Mi empresa</a>, que se guardan solo en tu navegador y se
        identifican como "Balance propio".
      </p>

      <Card className="mt-6">
        <h2 className="font-semibold text-ink">Datos de respaldo</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Si Yahoo Finance no responde en un momento dado, la ficha lo avisa con la etiqueta &quot;Datos de
          respaldo&quot;. Solo YPF, Pampa Energía, Telecom Argentina, Cresud y Loma Negra conservan una captura anterior
          de sus balances como respaldo; para el resto de las empresas, sin conexión se muestra &quot;sin dato&quot; en
          lugar de inventar cifras.
        </p>
      </Card>

      <div className="mt-6 space-y-4">
        {FUENTES.map((f) => (
          <Card key={f.fuente}>
            <h2 className="font-semibold text-ink">{f.fuente}</h2>
            <dl className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs text-ink-muted">Variable</dt>
                <dd>{f.variable}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Frecuencia</dt>
                <dd>{f.frecuencia}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Actualización</dt>
                <dd>{f.actualizacion}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">URL</dt>
                <dd>
                  <a href={f.url} className="text-accent hover:underline" target="_blank" rel="noreferrer">
                    {new URL(f.url).hostname}
                  </a>
                </dd>
              </div>
            </dl>
            <p className="mt-2 text-sm text-ink-muted">{f.descripcion}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <h2 className="font-semibold text-ink">Indicadores que no se muestran</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Riesgo país, actividad económica (EMAE) y desempleo no están integrados: no encontramos una fuente pública,
          gratuita y realmente actualizada para esos tres, y se prefiere no mostrarlos antes que mostrar un número viejo o
          inventado como si fuera en vivo.
        </p>
      </Card>
    </div>
  );
}
