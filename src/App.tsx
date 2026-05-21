import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "./components/theme-provider";
import { AuthProvider } from "@/hooks/auth-provider";
import { RequireAuth } from "./components/RequireAuth";
import { AppLayout } from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import Demandas from "./pages/Demandas";
import MinhasTarefas from "./pages/MinhasTarefas";
import CentralReunioes from "./pages/CentralReunioes";

import ClienteDetalhe from "./pages/ClienteDetalhe";
import CriarTarefa from "./pages/CriarTarefa";
import ProjetoCliente from "./pages/ProjetoCliente";
import PostDetalhe from "./pages/PostDetalhe";
import Contratos from "./pages/Contratos";
import Alertas from "./pages/Alertas";
import Relatorios from "./pages/Relatorios";
import Configuracoes from "./pages/Configuracoes";
import Aulas from "./pages/Aulas";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { useVersionCheck } from "./hooks/useVersionCheck";

const queryClient = new QueryClient();

function VersionWatcher() {
  useVersionCheck();
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <VersionWatcher />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route
                element={
                  <RequireAuth>
                    <AppLayout />
                  </RequireAuth>
                }
              >
                <Route path="/" element={<Dashboard />} />
                <Route path="/minhas-tarefas" element={<MinhasTarefas />} />
                <Route path="/central-reunioes" element={<CentralReunioes />} />
                <Route path="/clientes" element={<Clientes />} />
                <Route path="/criar-tarefa" element={<CriarTarefa />} />
                <Route path="/clientes/:clienteId" element={<ProjetoCliente />} />
                <Route path="/clientes/:clienteId/projeto" element={<ProjetoCliente />} />
                <Route path="/clientes/:clienteId/posts/:postId" element={<PostDetalhe />} />
                <Route path="/contratos" element={<Contratos />} />
                <Route path="/demandas" element={<Demandas />} />
                
                <Route path="/alertas" element={<Alertas />} />
                <Route path="/relatorios" element={<Relatorios />} />
                <Route path="/aulas" element={<Aulas />} />
                <Route path="/configuracoes" element={<Configuracoes />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
