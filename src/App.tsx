import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Auth from "./pages/Auth";
import Produtos from "./pages/Produtos";
import Responsaveis from "./pages/Responsaveis";
import Status from "./pages/Status";
import Roadmap from "./pages/Roadmap";
import Configuracoes from "./pages/Configuracoes";
import ExecutiveDashboard from "./pages/ExecutiveDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<Navigate to="/produtos" replace />} />
          <Route path="/dashboard" element={<Navigate to="/produtos" replace />} />
          <Route path="/backlog" element={<Navigate to="/produtos" replace />} />
          <Route path="/produtos" element={<Produtos />} />
          <Route path="/responsaveis" element={<Responsaveis />} />
          <Route path="/status" element={<Status />} />
          <Route path="/kanban" element={<Navigate to="/produtos" replace />} />
          <Route path="/roadmap" element={<Roadmap />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
          <Route path="/dashboard-executivo" element={<ExecutiveDashboard />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
