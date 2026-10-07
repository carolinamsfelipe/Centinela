import { Suspense, lazy } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Home } from "@/pages/Home";
const Empresas = lazy(() => import("@/pages/Empresas").then((m) => ({ default: m.Empresas })));
const CompanyDetail = lazy(() => import("@/pages/CompanyDetail").then((m) => ({ default: m.CompanyDetail })));
const Comparador = lazy(() => import("@/pages/Comparador").then((m) => ({ default: m.Comparador })));
const Rankings = lazy(() => import("@/pages/Rankings").then((m) => ({ default: m.Rankings })));
const Macro = lazy(() => import("@/pages/Macro").then((m) => ({ default: m.Macro })));
const Mercado = lazy(() => import("@/pages/Mercado").then((m) => ({ default: m.Mercado })));
const Simulador = lazy(() => import("@/pages/Simulador").then((m) => ({ default: m.Simulador })));
const AlertasCaja = lazy(() => import("@/pages/AlertasCaja").then((m) => ({ default: m.AlertasCaja })));
const MiEmpresa = lazy(() => import("@/pages/MiEmpresa").then((m) => ({ default: m.MiEmpresa })));
const Presentacion = lazy(() => import("@/pages/Presentacion").then((m) => ({ default: m.Presentacion })));
const Metodologia = lazy(() => import("@/pages/Metodologia").then((m) => ({ default: m.Metodologia })));
const Fuentes = lazy(() => import("@/pages/Fuentes").then((m) => ({ default: m.Fuentes })));
const Asesores = lazy(() => import("@/pages/Asesores").then((m) => ({ default: m.Asesores })));
import { ComingSoon } from "@/pages/ComingSoon";

// Módulos V2
import { V2Layout } from "@/v2/V2Layout";
import { PanelPage } from "@/v2/pages/PanelPage";
import { CapitalTrabajoPage } from "@/v2/pages/CapitalTrabajoPage";
import { DeudaPage } from "@/v2/pages/DeudaPage";
import { SimuladorPage } from "@/v2/pages/SimuladorPage";
import { BenchmarkPage } from "@/v2/pages/BenchmarkPage";

function CargandoPagina() {
  return (
    <div role="status" aria-live="polite" aria-label="Cargando contenido" className="mx-auto max-w-5xl animate-pulse px-4 py-10">
      <div className="h-8 w-1/3 rounded bg-surface" />
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-lg border border-border bg-surface" />
        ))}
      </div>
      <div className="mt-6 h-64 rounded-lg border border-border bg-surface" />
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const isV2 = location.pathname.startsWith("/v2");

  if (isV2) {
    return (
      <Routes>
        <Route path="/v2" element={<V2Layout />}>
          <Route index element={<PanelPage />} />
          <Route path="capital-trabajo" element={<CapitalTrabajoPage />} />
          <Route path="deuda" element={<DeudaPage />} />
          <Route path="simulador" element={<SimuladorPage />} />
          <Route path="benchmark" element={<BenchmarkPage />} />
        </Route>
      </Routes>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="flex-1">
        <Suspense fallback={<CargandoPagina />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/empresas" element={<Empresas />} />
          <Route path="/empresas/:ticker" element={<CompanyDetail />} />
          <Route path="/comparador" element={<Comparador />} />
          <Route path="/alertas" element={<AlertasCaja />} />
          <Route path="/rankings" element={<Rankings />} />
          <Route path="/mercado" element={<Mercado />} />
          <Route path="/macro" element={<Macro />} />
          <Route path="/simulador" element={<Simulador />} />
          <Route path="/mi-empresa" element={<MiEmpresa />} />
          <Route path="/asesores" element={<Asesores />} />
          <Route path="/favoritos" element={<Navigate to="/comparador" replace />} />
          <Route path="/presentacion" element={<Presentacion />} />
          <Route path="/metodologia" element={<Metodologia />} />
          <Route path="/fuentes" element={<Fuentes />} />
          <Route
            path="*"
            element={
              <ComingSoon
                titulo="Página no encontrada"
                fase="404"
                descripcion="Esa ruta no existe en Centinela."
              />
            }
          />
        </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
