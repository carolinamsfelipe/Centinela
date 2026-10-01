import { Link } from "react-router-dom";

export function ComingSoon({ titulo, fase, descripcion }: { titulo: string; fase: string; descripcion: string }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
        {fase}
      </div>
      <h1 className="text-2xl font-bold text-ink">{titulo}</h1>
      <p className="mt-3 text-ink-muted">{descripcion}</p>
      <Link to="/empresas" className="mt-6 inline-block text-accent hover:underline">
        Ir al explorador de empresas →
      </Link>
    </div>
  );
}
