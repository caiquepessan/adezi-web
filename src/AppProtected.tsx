import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { Sidebar } from './components/layout/Sidebar'

import { Portal } from './views/Portal'
import { Dashboard } from './views/Dashboard'
import { Produtos } from './views/Produtos'
import { Estoque } from './views/Estoque'
import { Categorias } from './views/Categorias'
import { Configuracoes } from './views/Configuracoes'
import { PDV } from './views/PDV'
import { HistoricoVendas } from './views/HistoricoVendas'
import { Login as POSLogin } from './views/Login'
import { Usuarios } from './views/Usuarios'
import { RegistroAtividades } from './views/RegistroAtividades'
import { Consumo } from './views/Consumo'
import { Toaster } from 'react-hot-toast'
import { ConfirmDialogProvider } from './components/ui/ConfirmDialog'
import { useOnlineStatus } from './hooks/useOnlineStatus'
import { supabase } from './lib/supabase'
import { AuthProvider, useAuth } from './contexts/AuthContext'

function AppContent() {
  useOnlineStatus();
  const { user, loading, hasPermission } = useAuth();
  const [supabaseLoading, setSupabaseLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login', { replace: true });
      }
      setSupabaseLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/login', { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (supabaseLoading || loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="text-primary font-bold">Carregando Sistema...</div>
      </div>
    );
  }

  // Intercept the POS login screen for users without an active PIN auth
  if (!user) {
    return <POSLogin />;
  }

  return (
    <div className="h-screen w-screen bg-background text-foreground flex flex-col overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 bg-background p-8 overflow-y-auto relative glass-panel m-2 rounded-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
          <Routes>
            <Route path="portal" element={<Portal />} />
            <Route path="pdv" element={<PDV />} />
            
            {hasPermission('ver_faturamento') ? (
              <Route path="dashboard" element={<Dashboard />} />
            ) : (
              <Route path="dashboard" element={<Navigate to="/portal" replace />} />
            )}

            {(hasPermission('estoque_view') || hasPermission('todas')) && <Route path="produtos" element={<Produtos />} />}
            {(hasPermission('estoque_view') || hasPermission('todas')) && <Route path="estoque" element={<Estoque />} />}
            {(hasPermission('categorias_gerir') || hasPermission('todas')) && <Route path="categorias" element={<Categorias />} />}
            {(hasPermission('historico_ver') || hasPermission('todas')) && <Route path="historico-vendas" element={<HistoricoVendas />} />}
            {(hasPermission('todas')) && <Route path="consumo" element={<Consumo />} />}
            {(hasPermission('registro_atividades') || hasPermission('todas')) && <Route path="registro-atividades" element={<RegistroAtividades />} />}
            {user.is_admin && <Route path="configuracoes" element={<Configuracoes />} />}
            {user.is_admin && <Route path="usuarios" element={<Usuarios />} />}
            
            <Route path="*" element={<Navigate to="/portal" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export function AppProtected() {
  return (
    <AuthProvider>
      <ConfirmDialogProvider>
        <AppContent />
        <Toaster position="top-center" toastOptions={{
          style: {
            background: 'rgb(24 24 27 / 0.9)',
            backdropFilter: 'blur(12px)',
            color: '#d4d4d8',
            border: '1px solid rgb(255 255 255 / 0.1)',
            borderRadius: '0.75rem',
            fontWeight: 500
          },
          success: { iconTheme: { primary: '#f59e0b', secondary: '#18181b' } }
        }} />
      </ConfirmDialogProvider>
    </AuthProvider>
  )
}
