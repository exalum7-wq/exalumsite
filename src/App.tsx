import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "./components/layout/AppLayout";
import { Component, ErrorInfo, ReactNode } from "react";
import Dashboard from "./pages/Dashboard";
import Produtos from "./pages/Produtos";
import Estoque from "./pages/Estoque";
import Clientes from "./pages/Clientes";
import Orcamentos from "./pages/Orcamentos";
import Vendas from "./pages/Vendas";
import Fornecedores from "./pages/Fornecedores";
import Financeiro from "./pages/Financeiro";
import Relatorios from "./pages/Relatorios";
import Pedidos from "./pages/Pedidos";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Configuracoes from "./pages/Configuracoes";
import CatalogoCliente from "./pages/CatalogoCliente";
import Carrinho from "./pages/Carrinho";
import MeusPedidos from "./pages/MeusPedidos";
import CatalogoPublico from "./pages/CatalogoPublico";

const queryClient = new QueryClient();

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("App Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Erro na Aplicação</h1>
            <p className="text-gray-700 mb-4">
              Desculpe, ocorreu um erro ao carregar a aplicação.
            </p>
            <div className="bg-gray-100 p-4 rounded mb-4 overflow-auto max-h-40">
              <code className="text-sm text-red-600">
                {this.state.error?.message || "Erro desconhecido"}
              </code>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
            >
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/catalogo" replace />;
  }

  return <>{children}</>;
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/catalogo" element={<CatalogoPublico />} />
            <Route path="/catalogo-cliente" element={<CatalogoCliente />} />
            <Route path="/carrinho" element={<Carrinho />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Routes>
                      <Route path="/" element={
                        <AdminRoute>
                          <Dashboard />
                        </AdminRoute>
                      } />
                      <Route path="/dashboard" element={
                        <AdminRoute>
                          <Dashboard />
                        </AdminRoute>
                      } />
                      <Route path="/produtos" element={
                        <AdminRoute>
                          <Produtos />
                        </AdminRoute>
                      } />
                      <Route path="/estoque" element={
                        <AdminRoute>
                          <Estoque />
                        </AdminRoute>
                      } />
                      <Route path="/clientes" element={
                        <AdminRoute>
                          <Clientes />
                        </AdminRoute>
                      } />
                      <Route path="/orcamentos" element={
                        <AdminRoute>
                          <Orcamentos />
                        </AdminRoute>
                      } />
                      <Route path="/vendas" element={
                        <AdminRoute>
                          <Vendas />
                        </AdminRoute>
                      } />
                      <Route path="/fornecedores" element={
                        <AdminRoute>
                          <Fornecedores />
                        </AdminRoute>
                      } />
                      <Route path="/financeiro" element={
                        <AdminRoute>
                          <Financeiro />
                        </AdminRoute>
                      } />
                      <Route path="/pedidos" element={
                        <AdminRoute>
                          <Pedidos />
                        </AdminRoute>
                      } />
                      <Route path="/relatorios" element={
                        <AdminRoute>
                          <Relatorios />
                        </AdminRoute>
                      } />
                      <Route path="/configuracoes" element={
                        <AdminRoute>
                          <Configuracoes />
                        </AdminRoute>
                      } />
                      <Route path="/meus-pedidos" element={<MeusPedidos />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </AppLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
