import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { Lock, User, LogIn, WifiOff } from 'lucide-react';
import { Titlebar } from '../components/layout/Titlebar';

export function Login() {
    const [username, setUsername] = useState('');
    const [senha, setSenha] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, loginAsGuest } = useAuth();
    const { isOnline } = useOnlineStatus();

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
                        <div className="w-20 h-20 bg-primary/10 flex items-center justify-center rounded-2xl mx-auto mb-4 border border-primary/20 shadow-[0_0_15px_rgba(255,191,0,0.2)] overflow-hidden">
                            <img src="./icon.png" alt="ADEZI" className="w-16 h-16 object-contain drop-shadow-md" />
                        </div>
                        <h1 className="text-3xl font-black tracking-tighter">ADEZI</h1>
                        <p className="text-muted-foreground mt-2">Acesse o sistema</p>
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
                        <div className="flex items-center gap-4 w-full mb-6">
                            <div className="h-px bg-white/10 flex-1" />
                            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">OU</span>
                            <div className="h-px bg-white/10 flex-1" />
                        </div>

                        <button
                            type="button"
                            onClick={loginAsGuest}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-sm font-semibold text-muted-foreground hover:text-white"
                        >
                            <WifiOff size={16} />
                            Acessar como Visitante (Offline)
                        </button>

                        {!isOnline && (
                            <p className="text-xs text-amber-500 mt-3 text-center flex items-center gap-1 justify-center">
                                Você está sem internet. Use o modo visitante para acessar o PDV.
                            </p>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
