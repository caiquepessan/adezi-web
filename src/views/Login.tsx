import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { Lock, User, LogIn } from 'lucide-react';
import { Titlebar } from '../components/layout/Titlebar';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function Login() {
    const [username, setUsername] = useState('');
    const [senha, setSenha] = useState('');
    const [loading, setLoading] = useState(false);
    const [empresaNome, setEmpresaNome] = useState<string | null>(null);
    const { login } = useAuth();
    const { isOnline } = useOnlineStatus();
    const location = useLocation();

    useEffect(() => {
        const fetchEmpresa = async () => {
            const parts = location.pathname.split('/');
            // Expecting something like /uuid-1234/pdv
            // parts[0] is "", parts[1] is id, parts[2] is 'pdv'
            if (parts.length >= 3 && parts[2] === 'pdv') {
                const urlId = parts[1];
                const { data } = await supabase.from('empresa').select('nome').eq('id', urlId).single();
                if (data) {
                    setEmpresaNome(data.nome);
                }
            }
        };
        fetchEmpresa();
    }, [location.pathname]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!username || !senha) return;
        setLoading(true);
        await login(username, senha);
        setLoading(false);
    }

    return (
        <div className="h-screen w-screen bg-background text-foreground flex flex-col overflow-hidden relative">
            <Titlebar />

            {/* Background elements */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/20 blur-[120px] rounded-full pointer-events-none" />

            <div className="flex-1 flex items-center justify-center p-4 relative z-10">
                <div className="glass-panel w-full max-w-md p-8 rounded-2xl animate-in custom-zoom-in">

                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-4">
                            <img src="/logo-full.svg" alt="ADEZI" className="h-10 object-contain drop-shadow-lg" />
                        </div>
                        <p className="text-muted-foreground mt-2">{empresaNome ? `Acesso: ${empresaNome}` : 'Acesse o sistema'}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">Usuário</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    placeholder="Nome de usuário"
                                    autoComplete="username"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 outline-none focus:border-primary transition-all shadow-inner"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">Senha</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                                <input
                                    type="password"
                                    value={senha}
                                    onChange={e => setSenha(e.target.value)}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 outline-none focus:border-primary transition-all shadow-inner"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !username || !senha}
                            className="w-full bg-primary text-primary-foreground font-black py-3 rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
                        >
                            {loading ? 'Entrando...' : (
                                <>
                                    <LogIn size={18} />
                                    Acessar
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 flex flex-col items-center">
                        {!isOnline && (
                            <p className="text-xs text-amber-500 mt-3 text-center flex items-center gap-1 justify-center">
                                Você está sem internet. O sistema web precisa de conexão para fazer login inicial.
                            </p>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
