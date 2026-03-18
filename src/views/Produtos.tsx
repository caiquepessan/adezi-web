import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Search, ArrowUpDown, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { Produto } from './Estoque';

type SortConfig = {
    key: 'nome' | 'estoque_atual' | 'categoria';
    direction: 'asc' | 'desc';
} | null;

export function Produtos() {
    const { hasPermission } = useAuth();
    const navigate = useNavigate();
    const canManageStock = hasPermission('estoque_editar') || hasPermission('todas');

    const [produtos, setProdutos] = useState<Produto[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'nome', direction: 'asc' });

    // We reuse the dynamic stock logic from Estoque temporarily until a database view aggregates this globally
    const [comboRequisitos, setComboRequisitos] = useState<any[]>([]);
    const [comboItensFixos, setComboItensFixos] = useState<any[]>([]);
    const [doses, setDoses] = useState<any[]>([]);
    const [caixas, setCaixas] = useState<any[]>([]);
    const [globalConfig, setGlobalConfig] = useState({ estoque_minimo_global: 5 });
    
    const barcodeBuffer = useRef('');
    const barcodeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        fetchData();

        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
                if (target.id !== 'produtos_search') return;
            }

            if (e.key === 'Enter') {
                if (barcodeBuffer.current.length > 2) {
                    setSearch(barcodeBuffer.current);
                }
                barcodeBuffer.current = '';
                if (barcodeTimeout.current) clearTimeout(barcodeTimeout.current);
                return;
            }

            if (e.key.length === 1) {
                barcodeBuffer.current += e.key;
                if (barcodeTimeout.current) clearTimeout(barcodeTimeout.current);
                barcodeTimeout.current = setTimeout(() => {
                    barcodeBuffer.current = '';
                }, 50);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    async function fetchData() {
        setLoading(true);
        try {
            const [prodRes, reqsRes, fixosRes, doseRes, configRes, caixasRes] = await Promise.all([
                supabase.from('produtos').select('*'),
                supabase.from('combo_requisitos').select('*'),
                supabase.from('combo_itens_fixos').select('*'),
                supabase.from('produto_doses').select('*'),
                supabase.from('configuracoes').select('estoque_minimo_global').eq('id', 1).single(),
                supabase.from('produto_caixas').select('*')
            ]);

            setProdutos(prodRes.data || []);
            setComboRequisitos(reqsRes.data || []);
            setComboItensFixos(fixosRes.data || []);
            setDoses(doseRes.data || []);
            setCaixas(caixasRes.data || []);
            
            if (configRes.data) {
                setGlobalConfig({ estoque_minimo_global: Number(configRes.data.estoque_minimo_global) });
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    }

    // Dynamic Estoque Calculation (Recursive to support nested combos)
    function getDisplayEstoque(p: Produto): number {
        if (['Combo', 'Dose'].includes(p.categoria)) {
            const myReqs = comboRequisitos.filter(r => r.combo_id === p.id);
            const myFixos = comboItensFixos.filter(f => f.combo_id === p.id);
            
            const capsReqs = myReqs.map(cr => {
                const totalEstoqueCat = produtos
                    .filter(x => x.categoria === cr.categoria_nome)
                    .reduce((acc, x) => acc + (['Combo', 'Dose'].includes(x.categoria) ? getDisplayEstoque(x) : x.estoque_atual), 0);
                return Math.floor(totalEstoqueCat / cr.quantidade);
            });
            const capsFixos = myFixos.map(cf => {
                const pj = produtos.find(x => x.id === cf.produto_id);
                if (!pj) return 0;
                const pjEstoque = ['Combo', 'Dose'].includes(pj.categoria) ? getDisplayEstoque(pj) : pj.estoque_atual;
                return Math.floor(pjEstoque / cf.quantidade);
            });
            
            let capsDose: number[] = [];
            if (p.categoria === 'Dose') {
                const doseP = doses.find(d => d.produto_dose_id === p.id);
                const garrafa = produtos.find(x => x.id === doseP?.produto_garrafa_id);
                if (garrafa && doseP?.volume_garrafa && doseP?.volume_dose) {
                    capsDose.push(garrafa.estoque_atual * Math.floor(doseP.volume_garrafa / doseP.volume_dose));
                }
            }

            const combined = [...capsReqs, ...capsFixos, ...capsDose];
            return combined.length > 0 ? Math.min(...combined) : (p.categoria === 'Combo' ? 0 : (p.estoque_atual || 0));
        } 

        if (p.categoria === 'Shot') {
            const doseP = doses.find(d => d.produto_dose_id === p.id);
            const garrafa = produtos.find(x => x.id === doseP?.produto_garrafa_id);
            if (garrafa && doseP?.volume_garrafa && doseP?.volume_dose) {
                return garrafa.estoque_atual * Math.floor(doseP.volume_garrafa / doseP.volume_dose);
            }
        }

        if (p.categoria === 'Caixa') {
            const caixaData = caixas.find(c => c.produto_caixa_id === p.id);
            if (caixaData) {
                const unitProduct = produtos.find(x => x.id === caixaData.produto_unidade_id);
                if (unitProduct && caixaData.quantidade_na_caixa > 0) {
                    return Math.floor(unitProduct.estoque_atual / caixaData.quantidade_na_caixa);
                }
            }
        }
        
        return p.estoque_atual || 0;
    }

    const sortData = (key: 'nome' | 'estoque_atual' | 'categoria') => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortedAndFilteredData = () => {
        let filtered = produtos.filter(p => 
            p.nome.toLowerCase().includes(search.toLowerCase()) || 
            (p.codigo_barras && p.codigo_barras.includes(search)) ||
            p.categoria.toLowerCase().includes(search.toLowerCase())
        );

        if (sortConfig !== null) {
            filtered.sort((a, b) => {
                if (sortConfig.key === 'nome') {
                    if (a.nome.toLowerCase() < b.nome.toLowerCase()) {
                        return sortConfig.direction === 'asc' ? -1 : 1;
                    }
                    if (a.nome.toLowerCase() > b.nome.toLowerCase()) {
                        return sortConfig.direction === 'asc' ? 1 : -1;
                    }
                    return 0;
                } else if (sortConfig.key === 'categoria') {
                    if (a.categoria.toLowerCase() < b.categoria.toLowerCase()) {
                        return sortConfig.direction === 'asc' ? -1 : 1;
                    }
                    if (a.categoria.toLowerCase() > b.categoria.toLowerCase()) {
                        return sortConfig.direction === 'asc' ? 1 : -1;
                    }
                    return 0;
                } else if (sortConfig.key === 'estoque_atual') {
                    const estA = getDisplayEstoque(a);
                    const estB = getDisplayEstoque(b);
                    return sortConfig.direction === 'asc' ? estA - estB : estB - estA;
                }
                return 0;
            });
        }

        return filtered;
    };

    const sortedProdutos = getSortedAndFilteredData();

    return (
        <div className="animate-in fade-in duration-500 h-full flex flex-col">
            <header className="mb-6 shrink-0">
                <h1 className="text-3xl font-bold tracking-tight">Produtos</h1>
                <p className="text-muted-foreground mt-1">Lista rápida para visualizar todos os itens e gerenciar.</p>
            </header>

            <div className="glass flex-1 p-6 rounded-xl flex flex-col min-h-0">
                <div className="mb-6 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                        <input
                            id="produtos_search"
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar produtos por nome ou código..."
                            className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3 outline-none focus:border-primary transition-all shadow-inner"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : (
                    <div className="flex-1 overflow-auto rounded-lg border border-border/50 bg-card/30">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs uppercase bg-background/50 sticky top-0 backdrop-blur-md z-10">
                                <tr>
                                    <th 
                                        className="px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors group"
                                        onClick={() => sortData('nome')}
                                    >
                                        <div className="flex items-center gap-2">
                                            Nome 
                                            <ArrowUpDown size={14} className={`text-muted-foreground group-hover:text-primary ${sortConfig?.key === 'nome' ? 'text-primary' : ''}`} />
                                        </div>
                                    </th>
                                    <th 
                                        className="px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors group"
                                        onClick={() => sortData('categoria')}
                                    >
                                        <div className="flex items-center gap-2">
                                            Categoria
                                            <ArrowUpDown size={14} className={`text-muted-foreground group-hover:text-primary ${sortConfig?.key === 'categoria' ? 'text-primary' : ''}`} />
                                        </div>
                                    </th>
                                    <th 
                                        className="px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors group"
                                        onClick={() => sortData('estoque_atual')}
                                    >
                                        <div className="flex items-center gap-2">
                                            Estoque Atual
                                            <ArrowUpDown size={14} className={`text-muted-foreground group-hover:text-primary ${sortConfig?.key === 'estoque_atual' ? 'text-primary' : ''}`} />
                                        </div>
                                    </th>
                                    <th className="px-4 py-3 text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedProdutos.length > 0 ? (
                                    sortedProdutos.map(p => {
                                        const estoque = getDisplayEstoque(p);
                                        const isCritico = estoque <= (p.usar_estoque_global ? globalConfig.estoque_minimo_global : (p.estoque_minimo_manual || 0));
                                        
                                        return (
                                            <tr key={p.id} className={`border-b border-border/50 hover:bg-white/5 transition-colors ${isCritico ? 'bg-red-500/5' : ''}`}>
                                                <td className="px-4 py-3">
                                                    <div className="font-semibold">{p.nome}</div>
                                                    {p.codigo_barras && <div className="text-xs text-muted-foreground font-mono">{p.codigo_barras}</div>}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="px-2 py-1 bg-white/5 rounded-md text-xs font-medium border border-white/10">
                                                        {p.categoria}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className={`inline-flex flex-col items-center justify-center px-4 py-1.5 rounded-lg border ${isCritico ? 'bg-red-500/20 border-red-500/30 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.15)]' : 'bg-white/5 border-white/10 text-white'}`}>
                                                        <span className="text-lg font-black leading-none">{estoque}</span>
                                                        <span className="text-[9px] uppercase tracking-wider font-bold opacity-70 mt-0.5">UNID</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {canManageStock ? (
                                                        <button 
                                                            onClick={() => navigate(`/estoque?edit_produto=${p.id}`)}
                                                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-bold transition-colors"
                                                            title="Gerenciar Produto no Estoque"
                                                        >
                                                            Gerenciar <ExternalLink size={14} />
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">Sem Acesso</span>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                                            Nenhum produto encontrado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
