import { useAuth } from '../contexts/AuthContext'
import { Link } from 'react-router-dom'
import { Monitor, ShoppingCart, User, Download, Smartphone, Crown, ShieldCheck, QrCode, ArrowRight, Activity, Share2 } from 'lucide-react'
import toast from 'react-hot-toast'

export function Portal() {
    const { user, empresaId } = useAuth()

    return (
        <div className="animate-in fade-in duration-700 h-full flex flex-col relative">
            {/* Ambient Background Effects */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none -z-10 mix-blend-screen" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none -z-10 mix-blend-screen" />

            <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold uppercase tracking-wider mb-2">
                        <Activity size={14} className="animate-pulse" />
                        Sistema Online
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-white/90 to-white/50">
                        Bem-vindo, {user?.username || 'Administrador'}
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-2xl">
                        Acesse rapidamente o Ponto de Venda, gerencie sua assinatura e baixe aplicativos na sua central de controle.
                    </p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1 min-h-0 overflow-y-auto pb-8 pr-2 custom-scrollbar">
                
                {/* Main Action - PDV */}
                <div className="col-span-1 md:col-span-8 group relative rounded-3xl overflow-hidden glass-panel border border-white/10 hover:border-primary/50 transition-all duration-500 shadow-2xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative p-8 md:p-12 h-full flex flex-col justify-center items-start">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-primary-foreground mb-6 shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform duration-500">
                            <ShoppingCart size={32} />
                        </div>
                        <h2 className="text-3xl font-bold mb-3 text-white">Ponto de Venda (PDV)</h2>
                        <p className="text-muted-foreground mb-8 text-lg max-w-md">
                            Acesse o sistema de frente de caixa web fluido, rápido e focado em produtividade para lançar suas vendas em segundos.
                        </p>
                        <div className="flex flex-wrap gap-4 mt-6 relative z-10">
                            <Link 
                                to={`/${empresaId}/pdv`} 
                                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-black font-bold text-lg hover:bg-white/90 transition-all shadow-xl hover:shadow-2xl hover:shadow-white/20 active:scale-95"
                            >
                                Acessar PDV Web
                                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </Link>

                            <button 
                                onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin}/${empresaId}/pdv`);
                                    toast.success('Link do PDV copiado! Lembre-se que o dispositivo precisa estar autorizado por você.');
                                }}
                                className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-all active:scale-95"
                            >
                                <Share2 size={18} />
                                Copiar Link de Acesso
                            </button>
                        </div>
                    </div>
                    {/* Decorative element */}
                    <div className="hidden md:block absolute right-0 bottom-0 pointer-events-none translate-x-1/4 translate-y-1/4 opacity-10 group-hover:opacity-20 transition-opacity duration-700">
                        <ShoppingCart size={400} />
                    </div>
                </div>

                {/* Plan Info */}
                <div className="col-span-1 md:col-span-4 rounded-3xl overflow-hidden glass-panel border border-white/10 p-8 flex flex-col relative group hover:border-white/20 transition-all shadow-xl">
                    <div className="absolute top-0 right-0 p-8">
                        <Crown className="text-amber-400 opacity-20 group-hover:opacity-40 transition-opacity" size={80} />
                    </div>
                    <div className="flex-1 z-10">
                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-1">Seu Plano</h3>
                        <div className="flex items-center gap-3 mb-6">
                            <h2 className="text-3xl font-black bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent">Pro</h2>
                            <span className="px-2 py-1 rounded-md bg-amber-500/20 text-amber-400 text-xs font-bold border border-amber-500/20">Ativo</span>
                        </div>
                        
                        <div className="space-y-4 mb-8">
                            <div className="flex items-center justify-between text-sm border-b border-white/5 pb-2">
                                <span className="text-muted-foreground">Vencimento</span>
                                <span className="font-medium text-white">15/12/2026</span>
                            </div>
                            <div className="flex items-center justify-between text-sm border-b border-white/5 pb-2">
                                <span className="text-muted-foreground">Ciclo</span>
                                <span className="font-medium text-white">Mensal</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Status do HWID</span>
                                <span className="font-medium text-green-400 flex items-center gap-1"><ShieldCheck size={14} /> Verificado</span>
                            </div>
                        </div>
                    </div>
                    
                    <button className="w-full py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors font-medium text-sm flex items-center justify-center gap-2 group/btn z-10">
                        <User size={16} className="text-muted-foreground group-hover/btn:text-white transition-colors" />
                        Gerenciar Assinatura
                    </button>
                </div>

                {/* Downloads Section */}
                <div className="col-span-1 md:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
                    
                    <div className="rounded-2xl glass-panel border border-white/5 p-6 hover:bg-white/[0.03] transition-colors group cursor-pointer">
                        <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Monitor size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">App Desktop (Online)</h3>
                        <p className="text-xs text-muted-foreground mb-6 line-clamp-2">
                            A melhor experiência para computadores Windows. Requer conexão constante, mas é mais leve.
                        </p>
                        <button className="text-sm font-bold text-blue-400 flex items-center gap-2 group-hover:gap-3 transition-all">
                            <Download size={16} /> Fazer Download
                        </button>
                    </div>

                    <div className="rounded-2xl glass-panel border border-white/5 p-6 hover:bg-white/[0.03] transition-colors group cursor-pointer">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Smartphone size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">App Desktop (Offline)</h3>
                        <p className="text-xs text-muted-foreground mb-6 line-clamp-2">
                            Versão robusta que funciona mesmo sem internet, sincronizando os dados depois.
                        </p>
                        <button className="text-sm font-bold text-emerald-400 flex items-center gap-2 group-hover:gap-3 transition-all">
                            <Download size={16} /> Fazer Download
                        </button>
                    </div>

                    <div className="rounded-2xl glass-panel border border-white/5 p-6 hover:bg-white/[0.03] transition-colors group cursor-pointer relative overflow-hidden">
                        <div className="absolute right-0 bottom-0 opacity-5 pointer-events-none translate-x-1/4 translate-y-1/4 group-hover:scale-110 transition-transform duration-700">
                            <QrCode size={180} />
                        </div>
                        <div className="w-12 h-12 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <QrCode size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Escanear HWID</h3>
                        <p className="text-xs text-muted-foreground mb-6 line-clamp-2 relative z-10">
                            Registre a identificação de hardware da sua máquina para habilitar o modo offline seguro.
                        </p>
                        <button className="text-sm font-bold text-purple-400 flex items-center gap-2 group-hover:gap-3 transition-all relative z-10">
                            <Smartphone size={16} /> Ler QR Code
                        </button>
                    </div>

                </div>

            </div>
        </div>
    )
}
