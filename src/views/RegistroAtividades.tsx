
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Activity, RefreshCw, User, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LogAtividade {
    id: string;
    created_at: string;
    acao: string;
    detalhes: string;
    usuarios: {
        username: string;
    };
}

export function RegistroAtividades() {
    const { hasPermission } = useAuth();
    const canView = hasPermission('registro_atividades');

    const [logs, setLogs] = useState<LogAtividade[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionFilter, setActionFilter] = useState('');
    const [userFilter, setUserFilter] = useState('');

    useEffect(() => {
        if (canView) fetchLogs();
    }, [canView]);

    async function fetchLogs() {
        setLoading(true);
        try {
            let query = supabase
                .from('logs_atividade')
                .select(`
id,
    created_at,
    acao,
    detalhes,
    usuarios(username)
        `)
                .order('created_at', { ascending: false })
                .limit(150);

            if (actionFilter) {
                query = query.ilike('acao', `% ${actionFilter}% `);
            }

            const { data, error } = await query;

            if (!error && data) {
                // Manually filter by user if provided, since we are doing associative filtering
                let finalData = data as unknown as LogAtividade[];
                if (userFilter) {
                    finalData = finalData.filter(l => l.usuarios?.username.toLowerCase().includes(userFilter.toLowerCase()));
                }
                setLogs(finalData);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    if (!canView) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 animate-in fade-in zoom-in duration-500 h-full">
                <div className="w-24 h-24 bg-red-500/10 text-red-500 flex items-center justify-center rounded-3xl mb-6">
                    <Activity size={48} strokeWidth={1.5} />
                </div>
                <h1 className="text-3xl font-black mb-2 tracking-tight">Acesso Negado</h1>
                <p className="text-muted-foreground max-w-md text-lg">
                    Você não tem permissão para visualizar o registro de atividades do sistema.
                </p>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-500 h-full flex flex-col">
            <header className="mb-6 shrink-0 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white/90">Registro de Atividades</h1>
                    <p className="text-sm text-white/50 mt-1">Auditoria de ações realizadas no sistema.</p>
                </div>
                <button
                    onClick={fetchLogs}
                    className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary font-medium rounded-lg transition-colors"
                >
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    Atualizar
                </button>
            </header>

            <div className="glass p-6 rounded-xl flex flex-col gap-6 flex-1 min-h-0">
                {/* Filtros */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <input
                            type="text"
                            placeholder="Filtrar por nome de usuário..."
                            value={userFilter}
                            onChange={(e) => setUserFilter(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
                            className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-3 outline-none focus:border-primary transition-colors focus:ring-1 focus:ring-primary/50"
                        />
                    </div>
                    <div className="relative">
                        <Activity className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar tipo de ação..."
                            value={actionFilter}
                            onChange={(e) => setActionFilter(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
                            className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-3 outline-none focus:border-primary transition-colors focus:ring-1 focus:ring-primary/50"
                        />
                    </div>
                </div>

                {/* Tabela de logs */}
                <div className="border border-white/5 bg-background/30 rounded-lg overflow-hidden flex-1 flex flex-col min-h-[300px]">
                    {loading ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground space-y-4">
                            <Activity className="animate-bounce" size={32} />
                            <p>Carregando registros...</p>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
                            <Search size={48} className="mb-4 text-white/10" />
                            <p className="text-lg">Nenhum registro encontrado.</p>
                        </div>
                    ) : (
                        <div className="overflow-y-auto flex-1">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-background/95 backdrop-blur-md z-10 border-b border-white/5">
                                    <tr>
                                        <th className="py-4 px-6 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Data/Hora</th>
                                        <th className="py-4 px-6 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Usuário</th>
                                        <th className="py-4 px-6 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Ação</th>
                                        <th className="py-4 px-6 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Detalhes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log) => (
                                        <tr key={log.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                            <td className="py-4 px-6 whitespace-nowrap text-sm">
                                                <div className="flex items-center gap-2 text-white/70">
                                                    <Calendar size={14} className="text-primary/70" />
                                                    {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 whitespace-nowrap">
                                                <div className="flex items-center gap-2 font-medium">
                                                    <User size={14} className="text-muted-foreground" />
                                                    {log.usuarios?.username || 'Sistema'}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 whitespace-nowrap">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 text-white/90">
                                                    {log.acao}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-sm text-muted-foreground min-w-[300px] leading-relaxed">
                                                {log.detalhes}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                <p className="text-xs text-center text-muted-foreground mt-2 shrink-0">
                    Mostrando os {logs.length} registros mais recentes.
                </p>
            </div>
        </div>
    );
}
