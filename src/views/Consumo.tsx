import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Search, PackageMinus, History, AlertCircle, X, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CustomSelect } from '../components/ui/CustomSelect'

interface Produto {
    id: string;
    nome: string;
    categoria: string;
    estoque_atual: number;
}

interface ConsumoRecord {
    id: string;
    produto_id: string;
    quantidade: number;
    motivo: string;
    created_at: string;
    produtos: { nome: string };
    usuarios?: { username: string };
}

export function Consumo() {
    const { user } = useAuth()
    const [loading, setLoading] = useState(true)
    const [registering, setRegistering] = useState(false)
    const [produtos, setProdutos] = useState<Produto[]>([])
    const [historico, setHistorico] = useState<ConsumoRecord[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [showRegisterModal, setShowRegisterModal] = useState(false)
    const [selectedProduct, setSelectedProduct] = useState<Produto | null>(null)
    
    // Form state
    const [quantity, setQuantity] = useState(1)
    const [reason, setReason] = useState('Consumo Pessoal')

    const reasons = ['Consumo Pessoal', 'Perda', 'Quebra', 'Vencimento', 'Brinde', 'Outros']

    useEffect(() => {
        fetchData()
    }, [])

    async function fetchData() {
        setLoading(true)
        try {
            const [prodRes, histRes] = await Promise.all([
                supabase.from('produtos').select('id, nome, categoria, estoque_atual').order('nome'),
                supabase.from('consumos')
                    .select('*, produtos(nome), usuarios(username)')
                    .order('created_at', { ascending: false })
                    .limit(20)
            ])

            if (prodRes.data) setProdutos(prodRes.data)
            if (histRes.data) setHistorico(histRes.data as any)
        } catch (error) {
            console.error('Erro ao buscar dados:', error)
            toast.error('Ocorreu um erro ao carregar os dados.')
        } finally {
            setLoading(false)
        }
    }

    const filteredProdutos = produtos.filter(p => 
        p.nome.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 10)

    async function handleRegister(e: React.FormEvent) {
        e.preventDefault()
        if (!selectedProduct || quantity <= 0) return

        setRegistering(true)
        try {
            const { error } = await supabase.rpc('registrar_consumo', {
                p_produto_id: selectedProduct.id,
                p_quantidade: quantity,
                p_motivo: reason,
                p_responsavel_id: user?.id
            })

            if (error) throw error

            toast.success('Consumo registrado com sucesso!')
            setShowRegisterModal(false)
            setSelectedProduct(null)
            setQuantity(1)
            setReason('Consumo Pessoal')
            fetchData()
        } catch (error: any) {
            console.error('Erro ao registrar consumo:', error)
            toast.error(error.message || 'Erro ao registrar consumo.')
        } finally {
            setRegistering(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-primary font-bold animate-pulse">Carregando dados de consumo...</p>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <PackageMinus className="text-primary" size={32} />
                        GESTÃO DE <span className="text-primary">CONSUMO</span>
                    </h1>
                    <p className="text-muted-foreground mt-1">Registre perdas, quebras e consumo pessoal para ajuste de estoque.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Registration Card */}
                <div className="lg:col-span-1 glass-panel p-6 rounded-xl border border-white/5 space-y-6 self-start">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <AlertCircle className="text-primary" size={20} />
                        Novo Registro
                    </h2>

                    <div className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar produto..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-primary transition-all"
                            />
                        </div>

                        {searchQuery && (
                            <div className="max-h-48 overflow-y-auto rounded-lg border border-border divide-y divide-border bg-background/50">
                                {filteredProdutos.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => {
                                            setSelectedProduct(p)
                                            setSearchQuery('')
                                            setShowRegisterModal(true)
                                        }}
                                        className="w-full text-left p-3 hover:bg-white/5 transition-colors flex justify-between items-center"
                                    >
                                        <div>
                                            <p className="font-bold text-sm tracking-tight">{p.nome}</p>
                                            <p className="text-[10px] text-muted-foreground uppercase">{p.categoria}</p>
                                        </div>
                                        <span className="text-xs font-mono bg-white/5 px-2 py-1 rounded">
                                            Estoque: {p.estoque_atual}
                                        </span>
                                    </button>
                                ))}
                                {filteredProdutos.length === 0 && (
                                    <p className="p-4 text-center text-xs text-muted-foreground tracking-tight">Nenhum produto encontrado.</p>
                                )}
                            </div>
                        )}

                        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                            <p className="text-xs text-muted-foreground leading-relaxed tracking-tight">
                                Selecione um produto acima para registrar uma retirada do estoque sem faturamento.
                            </p>
                        </div>
                    </div>
                </div>

                {/* History Card */}
                <div className="lg:col-span-2 glass-panel p-6 rounded-xl border border-white/5 space-y-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <History className="text-primary" size={20} />
                        Últimos Registros
                    </h2>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border text-[10px] uppercase text-muted-foreground tracking-widest font-black">
                                    <th className="pb-4 font-black">Data/Hora</th>
                                    <th className="pb-4 font-black">Produto</th>
                                    <th className="pb-4 font-black text-center">Qtd</th>
                                    <th className="pb-4 font-black">Motivo</th>
                                    <th className="pb-4 font-black">Responsável</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                                {historico.map((item) => (
                                    <tr key={item.id} className="group hover:bg-white/5 transition-colors">
                                        <td className="py-4 text-xs font-mono text-muted-foreground">
                                            {format(new Date(item.created_at), "dd/MM HH:mm", { locale: ptBR })}
                                        </td>
                                        <td className="py-4">
                                            <div className="font-bold text-sm tracking-tight">{item.produtos.nome}</div>
                                        </td>
                                        <td className="py-4 text-center">
                                            <span className="text-xs font-mono bg-red-500/10 text-red-500 px-2 py-0.5 rounded border border-red-500/20">
                                                -{item.quantidade}
                                            </span>
                                        </td>
                                        <td className="py-4">
                                            <span className="text-[10px] uppercase font-black bg-white/5 px-2 py-1 rounded tracking-widest text-muted-foreground">
                                                {item.motivo}
                                            </span>
                                        </td>
                                        <td className="py-4 text-xs text-muted-foreground">
                                            {item.usuarios?.username || 'Sistema'}
                                        </td>
                                    </tr>
                                ))}
                                {historico.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-muted-foreground italic">
                                            Nenhum registro de consumo encontrado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Registration Modal */}
            {showRegisterModal && selectedProduct && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel p-8 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 border border-white/10">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black text-white tracking-tight italic">
                                REGISTRAR <span className="text-primary tracking-normal not-italic">CONSUMO</span>
                            </h2>
                            <button onClick={() => setShowRegisterModal(false)} className="text-muted-foreground hover:text-white p-2 hover:bg-white/10 rounded-full transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleRegister} className="space-y-6">
                            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-1">Produto Selecionado</p>
                                <p className="font-black text-xl text-white tracking-tight">{selectedProduct.nome}</p>
                                <p className="text-xs text-primary font-bold mt-1 uppercase tracking-widest bg-primary/10 inline-block px-2 py-0.5 rounded">{selectedProduct.categoria}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] text-muted-foreground font-black uppercase tracking-widest block mb-1.5 ml-1">Quantidade</label>
                                    <input
                                        type="number"
                                        min="1"
                                        required
                                        value={quantity}
                                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                                        className="w-full bg-background border border-border rounded-xl px-4 py-3 outline-none focus:border-primary text-xl font-mono text-center"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-muted-foreground font-black uppercase tracking-widest block mb-1.5 ml-1">Motivo</label>
                                    <CustomSelect
                                        value={reason}
                                        onChange={(val) => setReason(val)}
                                        options={reasons.map(r => ({ value: r, label: r }))}
                                        className="!bg-background"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setShowRegisterModal(false)}
                                    className="flex-1 px-6 py-4 rounded-xl text-muted-foreground hover:bg-white/5 transition-all text-xs font-black uppercase tracking-widest border border-transparent hover:border-white/10"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={registering}
                                    className="flex-1 bg-primary text-black px-6 py-4 rounded-xl font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 group"
                                >
                                    {registering ? (
                                        <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Check size={18} strokeWidth={3} />
                                            <span>Confirmar</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
