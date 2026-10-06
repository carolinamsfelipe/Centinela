import { useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { ASESORES_FINANCIEROS, type AsesorFinanciero } from "@/data/asesores";

const ESPECIALIDADES = [
  "Todas",
  "Capital de Trabajo & CCC",
  "Reestructuración de Deuda",
  "Estrategia Cambiaria (ARS/USD)",
  "Mercado de Capitales PyME",
];

export function Asesores() {
  const [especialidadSeleccionada, setEspecialidadSeleccionada] = useState("Todas");
  const [asesorModal, setAsesorModal] = useState<AsesorFinanciero | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    empresa: "",
    contacto: "",
    motivo: "Capital de Trabajo & Ciclo de Caja (CCC)",
    mensaje: "",
  });

  const filtrados = ASESORES_FINANCIEROS.filter((a) => {
    if (especialidadSeleccionada === "Todas") return true;
    return a.especialidades.some((e) => e.toLowerCase().includes(especialidadSeleccionada.toLowerCase()));
  });

  function handleAbrirModal(asesor: AsesorFinanciero) {
    setAsesorModal(asesor);
    setEnviado(false);
  }

  function handleCerrarModal() {
    setAsesorModal(null);
    setEnviado(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviado(true);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
      {/* HEADER */}
      <div className="mx-auto max-w-3xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3.5 py-1 font-mono text-xs font-bold text-accent">
          <span>●</span> RED CERTIFICADA B2B
        </div>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Directorio de Asesores Financieros y CFOs PyME
        </h1>
        <p className="mt-3 text-base text-ink-muted sm:text-lg">
          ¿El diagnóstico de Centinela detectó fugas de caja, atrasos de cobro o tensión por deuda? Agendá una sesión
          1-a-1 de 30 minutos con directores financieros matriculados para estructurar tu plan de acción.
        </p>
      </div>

      {/* METRICAS DEL MARKETPLACE */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="border border-border/80 text-center">
          <div className="font-mono text-xs uppercase text-ink-muted">Satisfacción PyME</div>
          <div className="mt-1 font-mono text-2xl font-bold text-ink sm:text-3xl">4.9 / 5.0 ★</div>
          <div className="text-[11px] text-ok font-medium">+180 valoraciones</div>
        </Card>
        <Card className="border border-border/80 text-center">
          <div className="font-mono text-xs uppercase text-ink-muted">Acreditación</div>
          <div className="mt-1 font-mono text-2xl font-bold text-ink sm:text-3xl">100%</div>
          <div className="text-[11px] text-ink-muted">CNV / CPCE / CFA</div>
        </Card>
        <Card className="border border-border/80 text-center">
          <div className="font-mono text-xs uppercase text-ink-muted">Respuesta</div>
          <div className="mt-1 font-mono text-2xl font-bold text-accent sm:text-3xl">&lt; 2 hs</div>
          <div className="text-[11px] text-ink-muted">Contacto prioritario</div>
        </Card>
        <Card className="border border-border/80 text-center">
          <div className="font-mono text-xs uppercase text-ink-muted">Casos Resueltos</div>
          <div className="mt-1 font-mono text-2xl font-bold text-ink sm:text-3xl">+120</div>
          <div className="text-[11px] text-ink-muted">PyMEs industriales y comerciales</div>
        </Card>
      </div>

      {/* FILTROS POR ESPECIALIDAD */}
      <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-semibold uppercase text-ink-muted mr-2">Especialidad:</span>
          {ESPECIALIDADES.map((esp) => (
            <button
              key={esp}
              onClick={() => setEspecialidadSeleccionada(esp)}
              className={`rounded-lg px-3 py-1.5 font-mono text-xs font-semibold transition-all focus-ring ${
                especialidadSeleccionada === esp
                  ? "bg-accent text-white shadow-sm"
                  : "border border-border bg-surface text-ink-muted hover:text-ink"
              }`}
            >
              {esp}
            </button>
          ))}
        </div>
        <span className="font-mono text-xs text-ink-muted">
          Mostrando {filtrados.length} profesionales disponibles
        </span>
      </div>

      {/* LISTADO DE ASESORES */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {filtrados.map((a) => (
          <div
            key={a.id}
            className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-6 shadow-sm transition-all hover:border-accent/60 hover:shadow-md"
          >
            <div>
              {/* Header de la tarjeta */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 font-mono text-base font-bold text-accent">
                    {a.avatar}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-ink">{a.nombre}</h2>
                      <span className="inline-flex items-center rounded-full bg-ok/15 px-2 py-0.5 font-mono text-[10px] font-bold text-ok">
                        ✓ Verificado
                      </span>
                    </div>
                    <p className="text-xs text-ink-muted">{a.cargo}</p>
                    <p className="font-mono text-[11px] text-ink-muted">{a.matricula}</p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono text-sm font-bold text-amber-500">
                    ★ {a.rating.toFixed(2)}
                  </div>
                  <span className="font-mono text-[10px] text-ink-muted">
                    ({a.resenasTotal} reseñas)
                  </span>
                </div>
              </div>

              {/* Bio */}
              <p className="mt-4 text-xs text-ink-muted leading-relaxed">{a.bio}</p>

              {/* Tags de especialidad */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {a.especialidades.map((esp) => (
                  <span
                    key={esp}
                    className="rounded bg-bg px-2 py-0.5 font-mono text-[10px] font-semibold text-ink-muted border border-border/80"
                  >
                    {esp}
                  </span>
                ))}
              </div>

              {/* Reseña Destacada */}
              <div className="mt-4 rounded-xl border border-border bg-bg/60 p-3 text-xs">
                <div className="flex items-center justify-between text-[11px] font-semibold text-ink">
                  <span>
                    {a.resenaDestacada.autor} · {a.resenaDestacada.cargo}
                  </span>
                  <span className="font-mono text-[10px] text-accent">
                    {a.resenaDestacada.empresa}
                  </span>
                </div>
                <p className="mt-1 text-ink-muted italic">"{a.resenaDestacada.comentario}"</p>
              </div>
            </div>

            {/* Footer con CTA */}
            <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
              <span className="font-mono text-xs text-ink-muted flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-ok" />
                Responde {a.tiempoRespuesta}
              </span>
              <button
                onClick={() => handleAbrirModal(a)}
                className="rounded-xl bg-accent px-4 py-2 font-mono text-xs font-bold text-white shadow-sm hover:opacity-90 focus-ring"
              >
                Agendar diagnóstico (30 min) →
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL DE RESERVA INTERACTIVO */}
      {asesorModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-2xl sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <span className="font-mono text-xs font-bold uppercase text-accent">
                  SESIÓN 1-A-1 DE DIAGNÓSTICO
                </span>
                <h3 className="text-lg font-bold text-ink mt-1">
                  Agendar con {asesorModal.nombre}
                </h3>
                <p className="text-xs text-ink-muted">{asesorModal.cargo}</p>
              </div>
              <button
                onClick={handleCerrarModal}
                className="rounded-lg border border-border p-1.5 text-xs text-ink-muted hover:text-ink"
              >
                ✕
              </button>
            </div>

            {!enviado ? (
              <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    Tu nombre y cargo
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Juan Pérez (Socio Gerente)"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-xs text-ink placeholder:text-ink-muted focus-ring"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    Nombre de tu empresa y CUIT / Ticker
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Metalúrgica Sur SRL (30-71234567-8)"
                    value={form.empresa}
                    onChange={(e) => setForm({ ...form, empresa: e.target.value })}
                    className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-xs text-ink placeholder:text-ink-muted focus-ring"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    Email corporativo o WhatsApp
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. jperez@metalurgicasur.com o +54 9 11 4455-6677"
                    value={form.contacto}
                    onChange={(e) => setForm({ ...form, contacto: e.target.value })}
                    className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-xs text-ink placeholder:text-ink-muted focus-ring"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    Motivo principal de consulta
                  </label>
                  <select
                    value={form.motivo}
                    onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                    className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-xs text-ink focus-ring"
                  >
                    <option value="Capital de Trabajo & Ciclo de Caja (CCC)">
                      Optimizar Ciclo de Caja (CCC: Cobranzas / Stock / Proveedores)
                    </option>
                    <option value="Renegociación de Pasivos Bancarios y Comerciales">
                      Renegociación de Pasivos Bancarios y Comerciales
                    </option>
                    <option value="Estrategia Cambiaria y Deuda en Dólares">
                      Estrategia Cambiaria frente a Devaluación (ARS/USD)
                    </option>
                    <option value="Acceso a Mercado de Capitales (ONs PyME / CPDs)">
                      Acceso a Mercado de Capitales (ONs PyME / CPDs con SGR)
                    </option>
                    <option value="Diagnóstico Integral de Balance">
                      Diagnóstico Integral de Balance y Estrés Financiero
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    Detalle o contexto adicional (opcional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Contanos brevemente qué situación estás atravesando..."
                    value={form.mensaje}
                    onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
                    className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-xs text-ink placeholder:text-ink-muted focus-ring"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-accent py-2.5 font-mono text-xs font-bold text-white shadow-sm hover:opacity-90 focus-ring"
                  >
                    Confirmar solicitud de diagnóstico gratuito (30 min)
                  </button>
                  <p className="mt-2 text-center text-[11px] text-ink-muted">
                    Sesión confidencial sin costo. El profesional revisará tus métricas Centinela antes de la llamada.
                  </p>
                </div>
              </form>
            ) : (
              <div className="mt-6 text-center py-4 space-y-3">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-ok/15 text-ok text-2xl font-bold">
                  ✓
                </div>
                <h4 className="text-base font-bold text-ink">¡Solicitud enviada con éxito!</h4>
                <p className="text-xs text-ink-muted max-w-sm mx-auto">
                  Hemos notificado a <strong>{asesorModal.nombre}</strong> con los datos de tu empresa (
                  {form.empresa}). Se comunicará en menos de 2 horas al contacto provisto para coordinar la llamada.
                </p>
                <div className="pt-4">
                  <button
                    onClick={handleCerrarModal}
                    className="rounded-xl bg-ink px-6 py-2 text-xs font-semibold text-surface hover:opacity-90"
                  >
                    Cerrar y volver al directorio
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
