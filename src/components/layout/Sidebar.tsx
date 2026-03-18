import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { LogOut, User } from 'lucide-react'

export function Sidebar() {
    const location = useLocation()
    const { user, logout, hasPermission } = useAuth()

    const isActive = (path: string) => location.pathname === path

    const baseClass = "flex items-center gap-3 px-3 py-2 rounded-lg transition-all"
    const activeClass = `${baseClass} bg-primary/10 text-primary`
    const inactiveClass = `${baseClass} hover:bg-white/5 text-muted-foreground hover:text-foreground`

    return (
        <div className="w-64 border-r border-white/5 bg-card/30 flex flex-col h-full shrink-0">
            <div className="p-6 flex-1 overflow-y-auto">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-4">Principal</p>
                <nav className="space-y-2">
                    <Link to="/portal" className={isActive('/portal') ? activeClass : inactiveClass}>
                        Início
                    </Link>
                    {hasPermission('ver_faturamento') && (
                        <Link to="/dashboard" className={isActive('/dashboard') ? activeClass : inactiveClass}>
                            Dashboard
                        </Link>
                    )}
                    <Link to="/pdv" className={isActive('/pdv') ? activeClass : inactiveClass}>
                        Ponto de Venda (PDV)
                    </Link>
                    {(hasPermission('historico_ver') || hasPermission('todas')) && (
                        <Link to="/historico-vendas" className={isActive('/historico-vendas') ? activeClass : inactiveClass}>
                            Histórico de Vendas
                        </Link>
                    )}
                    {(hasPermission('todas')) && (
                        <Link to="/consumo" className={isActive('/consumo') ? activeClass : inactiveClass}>
                            Consumo
                        </Link>
                    )}
                    {(hasPermission('estoque_view') || hasPermission('todas')) && (
                        <Link to="/produtos" className={isActive('/produtos') ? activeClass : inactiveClass}>
                            Produtos
                        </Link>
                    )}
                    {(hasPermission('estoque_view') || hasPermission('todas')) && (
                        <Link to="/estoque" className={isActive('/estoque') ? activeClass : inactiveClass}>
                            Estoque
                        </Link>
                    )}
                    {(hasPermission('categorias_gerir') || hasPermission('todas')) && (
                        <Link to="/categorias" className={isActive('/categorias') ? activeClass : inactiveClass}>
                            Categorias
                        </Link>
                    )}
                </nav>

                {user?.is_admin || hasPermission('registro_atividades') ? (
                    <>
                        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mt-8 mb-4">Administração</p>
                        <nav className="space-y-2">
                            {user?.is_admin && (
                                <Link to="/usuarios" className={isActive('/usuarios') ? activeClass : inactiveClass}>
                                    Usuários e Permissões
                                </Link>
                            )}
                            {(user?.is_admin || hasPermission('registro_atividades')) && (
                                <Link to="/registro-atividades" className={isActive('/registro-atividades') ? activeClass : inactiveClass}>
                                    Registro de Atividades
                                </Link>
                            )}
                            {user?.is_admin && (
                                <Link to="/configuracoes" className={isActive('/configuracoes') ? activeClass : inactiveClass}>
                                    Configurações
                                </Link>
                            )}
                        </nav>
                    </>
                ) : null}
            </div>

            <div className="p-6 border-t border-white/5 bg-background/50">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
                        <User size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate text-white">{user?.username}</p>
                        <p className="text-xs text-muted-foreground truncate">{user?.is_admin ? 'Administrador' : user?.isGuest ? 'Modo Visitante' : 'Colaborador'}</p>
                    </div>
                </div>
                <Link
                    to="/"
                    className="w-full flex items-center justify-center gap-2 py-2.5 mb-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm font-bold"
                >
                    Voltar para o Site
                </Link>
                <button
                    onClick={logout}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-red-500/20 text-red-500 hover:bg-red-500/10 hover:border-red-500/50 transition-colors text-sm font-bold shadow-inner shadow-red-500/10"
                >
                    <LogOut size={16} />
                    Sair
                </button>
            </div>
        </div>
    );
}
