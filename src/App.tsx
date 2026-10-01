import { Route, Routes } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Home } from "@/pages/Home";
import { Empresas } from "@/pages/Empresas";
import { CompanyDetail } from "@/pages/CompanyDetail";
import { Metodologia } from "@/pages/Metodologia";
import { Fuentes } from "@/pages/Fuentes";
import { ComingSoon } from "@/pages/ComingSoon";

export default function App() {
  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/empresas" element={<Empresas />} />
          <Route path="/empresas/:ticker" element={<CompanyDetail />} />
          <Route
            path="/comparador"
            element={
              <ComingSoon
                titulo="Comparador de empresas"
                fase="Fase 3"
                descripcion="Vas a poder elegir entre 2 y 5 empresas y compararlas con tabla, radar y ranking relativo. Por ahora, abrí una ficha de empresa para ver su análisis individual."
              />
            }
          />
          <Route
            path="/rankings"
            element={
              <ComingSoon
                titulo="Rankings"
                fase="Fase 3"
                descripcion="Rankings filtrables por ROE, margen, endeudamiento, liquidez y Score Centinela. Mientras tanto, ordená la tabla de /empresas por cualquier columna."
              />
            }
          />
          <Route
            path="/mercado"
            element={
              <ComingSoon
                titulo="Mercado"
                fase="Fase 4"
                descripcion="Dashboard de Merval, acciones argentinas, volumen, ganadores/perdedores y heatmap sectorial."
              />
            }
          />
          <Route
            path="/macro"
            element={
              <ComingSoon
                titulo="Contexto macroeconómico"
                fase="Fase 4"
                descripcion="Dólar, inflación, tasa de interés, riesgo país, reservas y Merval, cada uno con fuente y fecha de actualización explícitas."
              />
            }
          />
          <Route
            path="/simulador"
            element={
              <ComingSoon
                titulo="Simulador de escenarios"
                fase="Fase 5"
                descripcion="Escenarios hipotéticos (base, optimista, adverso) a partir de supuestos de crecimiento, margen, deuda y tasa — nunca presentados como predicción."
              />
            }
          />
          <Route path="/metodologia" element={<Metodologia />} />
          <Route path="/fuentes" element={<Fuentes />} />
          <Route
            path="*"
            element={
              <ComingSoon
                titulo="Página no encontrada"
                fase="404"
                descripcion="Esa ruta no existe todavía en Centinela PyME."
              />
            }
          />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
