import { Route, Routes } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Home } from "@/pages/Home";
import { Empresas } from "@/pages/Empresas";
import { CompanyDetail } from "@/pages/CompanyDetail";
import { Comparador } from "@/pages/Comparador";
import { Rankings } from "@/pages/Rankings";
import { Macro } from "@/pages/Macro";
import { Mercado } from "@/pages/Mercado";
import { Simulador } from "@/pages/Simulador";
import { Favoritos } from "@/pages/Favoritos";
import { Presentacion } from "@/pages/Presentacion";
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
          <Route path="/comparador" element={<Comparador />} />
          <Route path="/rankings" element={<Rankings />} />
          <Route path="/mercado" element={<Mercado />} />
          <Route path="/macro" element={<Macro />} />
          <Route path="/simulador" element={<Simulador />} />
          <Route path="/favoritos" element={<Favoritos />} />
          <Route path="/presentacion" element={<Presentacion />} />
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
