
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, PackagePlus, X, Search } from 'lucide-react';

import toast from 'react-hot-toast';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { CustomSelect } from '../components/ui/CustomSelect';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { registrarLog } from '../lib/logger';

export interface Produto {
    id: string;
    nome: string;
    categoria: string;
    preco_custo: number;
    preco_venda: number;
    estoque_atual: number;
    codigo_barras?: string;
    usar_lucro_global: boolean;
    usar_estoque_global: boolean;
    percentual_lucro_manual?: number | null;
    estoque_minimo_manual?: number | null;
    preco_combo?: number;
}

interface ComboRequisito {
    categoria_nome: string;
    quantidade: number;
}

interface ComboItemFixo {
    produto_id: string;
    quantidade: number;
}

interface DoseParams {
    id?: string;
    produto_garrafa_id: string;
    volume_garrafa: number;
    volume_dose: number;
    doses_restantes_abertas?: number;
}

interface CaixaParams {
    produto_unidade_id: string;
    quantidade_na_caixa: number;
}

interface ProdutoCaixa {
    produto_caixa_id: string;
    produto_unidade_id: string;
    quantidade_na_caixa: number;
}

export function Estoque() {
    const { hasPermission, user } = useAuth();
    const canCreate = hasPermission('estoque_criar');
    const canEdit = hasPermission('estoque_editar');
    const canDelete = hasPermission('estoque_excluir');

    const [produtos, setProdutos] = useState<Produto[]>([]);
    const [categorias, setCategorias] = useState<{ id: string, nome: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showAddStockModal, setShowAddStockModal] = useState(false);

    const [formData, setFormData] = useState<Partial<Produto>>({});
    const [comboRequisitos, setComboRequisitos] = useState<ComboRequisito[]>([]);
    const [comboItensFixos, setComboItensFixos] = useState<ComboItemFixo[]>([]);
    const [doseParams, setDoseParams] = useState<DoseParams[]>([]);
    const [caixaParams, setCaixaParams] = useState<CaixaParams>({ produto_unidade_id: '', quantidade_na_caixa: 15 });

    const [reqCat, setReqCat] = useState('');
    const [reqQtd, setReqQtd] = useState(1);
    const [fixProdId, setFixProdId] = useState('');
    const [fixQtd, setFixQtd] = useState(1);

    // Globals fetched for live preview
    const [globalConfig, setGlobalConfig] = useState({ lucro: 30, estoque: 5 });
    const [allReqs, setAllReqs] = useState<any[]>([]);
    const [allFixos, setAllFixos] = useState<any[]>([]);
    const [allDoses, setAllDoses] = useState<any[]>([]);
    const [allCaixas, setAllCaixas] = useState<ProdutoCaixa[]>([]);

    const confirm = useConfirm();
    const [search, setSearch] = useState('');
    const location = useLocation();
    const navigate = useNavigate();
    const [filterCritico, setFilterCritico] = useState(false);

    const barcodeBuffer = useRef('');
    const barcodeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Add Stock Modal State
    const [stockSearchQuery, setStockSearchQuery] = useState('');
    const [selectedStockProduct, setSelectedStockProduct] = useState<Produto | null>(null);
    const [stockQuantityToAdd, setStockQuantityToAdd] = useState(1);
    const [isAddingStock, setIsAddingStock] = useState(false);

    useEffect(() => {
        fetchProdutos();
        fetchCategorias();
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        setFilterCritico(params.get('filter') === 'critico');

        const editId = params.get('edit_produto');
        if (editId && produtos.length > 0) {
            const prodToEdit = produtos.find(p => p.id === editId);
            if (prodToEdit) {
                handleEditClick(prodToEdit);
                // Clear param so it doesn't trigger again on reload
                navigate('/estoque', { replace: true });
            }
        }
    }, [location.search, produtos, navigate]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
                if (target.id === 'codigo_barras_input') {
                    if (e.key === 'Enter') e.preventDefault();
                }
                // Allow search input to be bypassed by the barcode scanner logic
                if (target.id !== 'estoque_search') return;
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

    async function fetchCategorias() {
        try {
            const { data: config, error: configError } = await supabase.from('configuracoes').select('*').eq('id', 1).single();
            if (config && !configError) {
                setGlobalConfig({ lucro: Number(config.lucro_global_percent), estoque: Number(config.estoque_minimo_global) });
                localStorage.setItem('@adegadosmulekes:config', JSON.stringify({ lucro: Number(config.lucro_global_percent), estoque: Number(config.estoque_minimo_global) }));
            }
        } catch (e) { /* fallback below */ }

        const localConfig = localStorage.getItem('@adegadosmulekes:config');
        if (localConfig) setGlobalConfig(JSON.parse(localConfig));

        try {
            const { data, error } = await supabase.from('categorias').select('*').order('nome');
            if (data && !error) {
                setCategorias(data);
                localStorage.setItem('@adegadosmulekes:categorias', JSON.stringify(data));
            }
        } catch (e) { /* fallback below */ }

        const localCat = localStorage.getItem('@adegadosmulekes:categorias');
        if (localCat) setCategorias(JSON.parse(localCat));
    }

    async function fetchProdutos() {
        setLoading(true);
        try {
            const [prodsRes, reqsRes, fixosRes, dosesRes, caixasRes] = await Promise.all([
                supabase.from('produtos').select('*').order('nome'),
                supabase.from('combo_requisitos').select('*'),
                supabase.from('combo_itens_fixos').select('*'),
                supabase.from('doses').select('*'),
                supabase.from('produto_caixas').select('*')
            ]);

            if (prodsRes.data) {
                setProdutos(prodsRes.data);
                localStorage.setItem('@adegadosmulekes:produtos', JSON.stringify(prodsRes.data));
            }
            if (reqsRes.data) setAllReqs(reqsRes.data);
            if (fixosRes.data) setAllFixos(fixosRes.data);
            if (dosesRes.data) setAllDoses(dosesRes.data);
            if (caixasRes.data) setAllCaixas(caixasRes.data);

        } catch (e) { /* fallback below */ }

        const localProd = localStorage.getItem('@adegadosmulekes:produtos');
        if (localProd) setProdutos(JSON.parse(localProd));
        setLoading(false);
    }

    const formatCurrencyInput = (val: string) => {
        const numeric = val.replace(/\D/g, '');
        const amount = parseInt(numeric || '0', 10) / 100;
        return amount.toFixed(2);
    };

    function resetForm() {
        setFormData({
            nome: '', categoria: categorias[0]?.nome || '', preco_custo: 0, preco_venda: 0, estoque_atual: 0, codigo_barras: '',
            usar_lucro_global: true, usar_estoque_global: true, percentual_lucro_manual: globalConfig.lucro, estoque_minimo_manual: globalConfig.estoque,
            preco_combo: 0
        });
        setComboRequisitos([]);
        setComboItensFixos([]);
        setDoseParams([{ produto_garrafa_id: '', volume_garrafa: 1000, volume_dose: 50 }]);
    }

    function handleAddNew() {
        if (!canCreate) {
            toast.error('Você não tem permissão para criar produtos.');
            return;
        }
        setFormData({
            nome: '', categoria: categorias[0]?.nome || '', preco_custo: 0, preco_venda: 0, estoque_atual: 0, codigo_barras: '',
            usar_lucro_global: true, usar_estoque_global: true, percentual_lucro_manual: globalConfig.lucro, estoque_minimo_manual: globalConfig.estoque,
            preco_combo: 0
        });
        // Clear all states
        setComboRequisitos([]);
        setComboItensFixos([]);
        setDoseParams([{ produto_garrafa_id: '', volume_garrafa: 1000, volume_dose: 50 }]); // Changed to array
        setCaixaParams({ produto_unidade_id: '', quantidade_na_caixa: 15 });
        setShowModal(true);
    }

    async function handleEditClick(p: Produto) {
        if (!canEdit) {
            toast.error('Você não tem permissão para editar produtos.');
            return;
        }

        setFormData({
            ...p,
            percentual_lucro_manual: p.usar_lucro_global ? globalConfig.lucro : (p.percentual_lucro_manual || 0),
            estoque_minimo_manual: p.usar_estoque_global ? globalConfig.estoque : (p.estoque_minimo_manual || 0),
            preco_combo: p.preco_combo || 0
        });

        // Reset all specific product type parameters first
        setComboRequisitos([]);
        setComboItensFixos([]);
        setDoseParams([]); // Changed to array
        setCaixaParams({ produto_unidade_id: '', quantidade_na_caixa: 15 });

        if (p.categoria === 'Combo') {
            const { data: reqs } = await supabase.from('combo_requisitos').select('*').eq('combo_id', p.id);
            if (reqs) setComboRequisitos(reqs.map(r => ({ categoria_nome: r.categoria_nome, quantidade: r.quantidade })));
            const { data: fixos } = await supabase.from('combo_itens_fixos').select('*').eq('combo_id', p.id);
            if (fixos) setComboItensFixos(fixos.map(f => ({ produto_id: f.produto_id, quantidade: f.quantidade })));
        } else if (p.categoria === 'Dose' || p.categoria === 'Shot') {
            const { data } = await supabase.from('doses').select('*').eq('produto_dose_id', p.id); // Removed .single()
            if (data) setDoseParams(data); // Set data as array
        } else if (p.categoria === 'Caixa') {
            const { data } = await supabase.from('produto_caixas').select('*').eq('produto_caixa_id', p.id).single();
            if (data) setCaixaParams({ produto_unidade_id: data.produto_unidade_id, quantidade_na_caixa: data.quantidade_na_caixa });
        }
        setShowModal(true);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!canCreate && !formData.id) {
            toast.error('Você não tem permissão para criar produtos.');
            return;
        }
        if (!canEdit && formData.id) {
            toast.error('Você não tem permissão para editar produtos.');
            return;
        }

        if (!navigator.onLine) {
            toast.error('Você não pode salvar produtos enquanto estiver Offline.');
            return;
        }

        // Calculate auto cost for system categories
        let finalCusto = formData.preco_custo || 0;
        if (formData.categoria === 'Combo') {
            finalCusto = comboItensFixos.reduce((acc: number, item: ComboItemFixo) => {
                const pj = produtos.find(x => x.id === item.produto_id);
                return acc + ((pj?.preco_custo || 0) * item.quantidade);
            }, 0);
            // Categories don't have a fixed cost at this stage as they are selectable, 
            // but we could use the average or minimum cost of the category if desired.
            // For now, based on the UI "Custo Base: R$ 0.00 (Calculado)", it seems to focus on fixed items.
        } else if ((formData.categoria === 'Dose' || formData.categoria === 'Shot') && doseParams.length > 0 && doseParams[0].produto_garrafa_id) { // Check first doseParams element
            const garrafa = produtos.find(x => x.id === doseParams[0].produto_garrafa_id);
            if (garrafa && doseParams[0].volume_garrafa > 0 && doseParams[0].volume_dose > 0) {
                finalCusto = garrafa.preco_custo / (doseParams[0].volume_garrafa / doseParams[0].volume_dose);
            }
        }

        const dataToSave = { ...formData, preco_custo: finalCusto };
        let productId = formData.id;

        try {
            if (productId) {
                const { error } = await supabase.from('produtos').update(dataToSave).eq('id', productId);
                if (error) throw error;
                await registrarLog(user!.id, 'Edição de Produto', `Editou o produto: ${dataToSave.nome}. Custo: R$${finalCusto.toFixed(2)}, Preço: R$${(dataToSave.preco_venda || 0).toFixed(2)} `);
            } else {
                const { data, error } = await supabase.from('produtos').insert([dataToSave]).select().single();
                if (error || !data) throw error;
                productId = data.id;
                await registrarLog(user!.id, 'Criação de Produto', `Criou o produto: ${dataToSave.nome} `);
            }

            // Handle relational data
            if (formData.categoria === 'Combo') { // Removed Dose from this condition
                await supabase.from('combo_requisitos').delete().eq('combo_id', productId);
                if (comboRequisitos.length > 0) {
                    await supabase.from('combo_requisitos').insert(comboRequisitos.map(r => ({ combo_id: productId, ...r })));
                }
                await supabase.from('combo_itens_fixos').delete().eq('combo_id', productId);
                if (comboItensFixos.length > 0) {
                    await supabase.from('combo_itens_fixos').insert(comboItensFixos.map(i => ({ combo_id: productId, ...i })));
                }
            }
            
            // 2. Doses (Support Multiple)
            if (formData.categoria === 'Dose' || formData.categoria === 'Shot') {
                // Remove direct constraint issues by deleting all first and re-inserting
                // (Or updating, but deleting is safer for multi-row sync)
                await supabase.from('doses').delete().eq('produto_dose_id', productId);
                
                const dosesToInsert = doseParams
                    .filter(d => d.produto_garrafa_id)
                    .map(d => ({
                        produto_dose_id: productId,
                        produto_garrafa_id: d.produto_garrafa_id,
                        volume_garrafa: d.volume_garrafa,
                        volume_dose: d.volume_dose
                    }));

                if (dosesToInsert.length > 0) {
                    const { error: dErr } = await supabase.from('doses').insert(dosesToInsert);
                    if (dErr) throw dErr;
                }
            } else if (formData.categoria === 'Caixa') {
                await supabase.from('produto_caixas').delete().eq('produto_caixa_id', productId);
                if (caixaParams.produto_unidade_id) {
                    await supabase.from('produto_caixas').insert([{
                        produto_caixa_id: productId,
                        produto_unidade_id: caixaParams.produto_unidade_id,
                        quantidade_na_caixa: caixaParams.quantidade_na_caixa
                    }]);

                    // Add automatic stock if creating new box with initial stock
                    if (formData.estoque_atual && formData.estoque_atual > 0) {
                         const unitsToAdd = caixaParams.quantidade_na_caixa * formData.estoque_atual;
                         const { data: unitProd } = await supabase.from('produtos').select('estoque_atual').eq('id', caixaParams.produto_unidade_id).single();
                         if (unitProd) {
                            await supabase.from('produtos').update({ estoque_atual: unitProd.estoque_atual + unitsToAdd }).eq('id', caixaParams.produto_unidade_id);
                         }
                    }
                }
            }

            setShowModal(false);
            resetForm();
            fetchProdutos();
            toast.success('Produto salvo com sucesso!');
        } catch (error: any) {
            console.error('Error saving product:', error);
            toast.error('Erro ao salvar produto.');
        }
    }

    async function handleDelete(id: string) {
        if (!canDelete) {
            toast.error('Você não tem permissão para excluir produtos.');
            return;
        }
        const produtoObj = produtos.find(p => p.id === id);
        if (await confirm('Tem certeza que deseja deletar este produto?', 'Deletar Produto')) {
            const { error } = await supabase.from('produtos').delete().eq('id', id);
            if (!error) {
                if (produtoObj) {
                    await registrarLog(user!.id, 'Exclusão de Produto', `Excluiu o produto: ${produtoObj.nome} `);
                }
                fetchProdutos();
                toast.success('Produto excluído com sucesso!');
            } else {
                toast.error('Erro ao excluir produto.');
            }
        }
    }

    async function handleAddStockSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!canEdit) {
            toast.error('Você não tem permissão para editar o estoque.');
            return;
        }

        if (!selectedStockProduct) {
            toast.error('Selecione um produto.');
            return;
        }

        if (stockQuantityToAdd <= 0) {
            toast.error('A quantidade deve ser maior que zero.');
            return;
        }

        if (!navigator.onLine) {
            toast.error('Você não pode adicionar estoque enquanto estiver Offline.');
            return;
        }

        setIsAddingStock(true);
        try {
            // CAIXA LOGIC
            if (selectedStockProduct.categoria === 'Caixa') {
                const { data: caixaData } = await supabase.from('produto_caixas').select('*').eq('produto_caixa_id', selectedStockProduct.id).single();
                if (caixaData) {
                    const unitsToAdd = caixaData.quantidade_na_caixa * stockQuantityToAdd;
                    const { data: unitProd } = await supabase.from('produtos').select('estoque_atual').eq('id', caixaData.produto_unidade_id).single();
                    if (unitProd) {
                        const { error } = await supabase.from('produtos').update({ estoque_atual: unitProd.estoque_atual + unitsToAdd }).eq('id', caixaData.produto_unidade_id);
                        if (error) throw error;
                        await registrarLog(user!.id, 'Entrada de Estoque', `Adicionou ${stockQuantityToAdd} caixa(s) de ${selectedStockProduct.nome} (+${unitsToAdd} unid).`);
                    }
                }
            } else {
                const newStock = selectedStockProduct.estoque_atual + stockQuantityToAdd;

                const { error } = await supabase
                    .from('produtos')
                    .update({ estoque_atual: newStock })
                    .eq('id', selectedStockProduct.id);

                if (error) throw error;
                await registrarLog(user!.id, 'Entrada de Estoque', `Adicionou ${stockQuantityToAdd} ao estoque de ${selectedStockProduct.nome}.`);
            }

            toast.success(`${stockQuantityToAdd} unidades adicionadas ao estoque de ${selectedStockProduct.nome} !`);
            setShowAddStockModal(false);
            setStockSearchQuery('');
            setSelectedStockProduct(null);
            setStockQuantityToAdd(1);
            fetchProdutos(); // Refresh the grid
        } catch (error: any) {
            console.error('Error adding stock:', error);
            toast.error('Erro ao atualizar estoque.');
        } finally {
            setIsAddingStock(false);
        }
    }

    function addComboRequirement() {
        if (!reqCat || reqQtd <= 0) return;
        if (comboRequisitos.some(r => r.categoria_nome === reqCat)) return;
        setComboRequisitos([...comboRequisitos, { categoria_nome: reqCat, quantidade: reqQtd }]);
    }

    function removeComboRequirement(catName: string) {
        setComboRequisitos(comboRequisitos.filter(r => r.categoria_nome !== catName));
    }

    function addComboFixedItem() {
        if (!fixProdId || fixQtd <= 0) return;
        if (comboItensFixos.some(i => i.produto_id === fixProdId)) return;
        setComboItensFixos([...comboItensFixos, { produto_id: fixProdId, quantidade: fixQtd }]);
    }

    function removeComboFixedItem(pid: string) {
        setComboItensFixos(comboItensFixos.filter(i => i.produto_id !== pid));
    }

    // Dynamic Calculations for UI
    let displayCusto = formData.preco_custo || 0;
    if (formData.categoria === 'Combo') {
        displayCusto = comboItensFixos.reduce((acc: number, item: ComboItemFixo) => {
            const pj = produtos.find(x => x.id === item.produto_id);
            return acc + ((pj?.preco_custo || 0) * item.quantidade);
        }, 0);
    } else if ((formData.categoria === 'Dose' || formData.categoria === 'Shot') && doseParams.length > 0 && doseParams[0].produto_garrafa_id) { // Check first doseParams element
        const garrafa = produtos.find(x => x.id === doseParams[0].produto_garrafa_id);
        if (garrafa && doseParams[0].volume_garrafa > 0 && doseParams[0].volume_dose > 0) {
            displayCusto = garrafa.preco_custo / (doseParams[0].volume_garrafa / doseParams[0].volume_dose);
        }
    }

    // Derived Estoque Real (for Combo and Doses UI logic later)
    let displayEstoque = formData.estoque_atual || 0;
    if (formData.categoria === 'Combo') {
        const capsFixos = comboItensFixos.map(ci => {
            const pj = produtos.find(x => x.id === ci.produto_id);
            if (!pj) return 0;
            return Math.floor(pj.estoque_atual / ci.quantidade);
        });
        const capsReqs = comboRequisitos.map(cr => {
            const totalEstoqueCat = produtos
                .filter(p => p.categoria === cr.categoria_nome)
                .reduce((acc, p) => acc + p.estoque_atual, 0);
            return Math.floor(totalEstoqueCat / cr.quantidade);
        });
        const combined = [...capsFixos, ...capsReqs];
        displayEstoque = combined.length > 0 ? Math.min(...combined) : 0;
    } else if (formData.categoria === 'Dose' || formData.categoria === 'Shot') {
        if (doseParams.length === 0) {
            displayEstoque = 0;
        } else {
            const availabilities = doseParams.map(dc => {
                const garrafa = produtos.find(x => x.id === dc.produto_garrafa_id);
                if (garrafa && dc.volume_garrafa > 0 && dc.volume_dose > 0) {
                    const fullBottles = garrafa.estoque_atual * Math.floor(dc.volume_garrafa / dc.volume_dose);
                    return fullBottles + (dc.doses_restantes_abertas || 0);
                }
                return 0;
            });
            displayEstoque = Math.min(...availabilities);
        }
    } else if (formData.categoria === 'Caixa') {
        const uId = caixaParams.produto_unidade_id;
        const uQtd = caixaParams.quantidade_na_caixa;
        if (uId && uQtd > 0) {
            const unitProduct = produtos.find(x => x.id === uId);
            if (unitProduct) {
                displayEstoque = Math.floor(unitProduct.estoque_atual / uQtd);
            }
        }
    }

    return (
        <div className="animate-in fade-in duration-500 h-full flex flex-col">
            <header className="mb-6 shrink-0 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Estoque e Produtos</h1>
                    <p className="text-muted-foreground mt-1">Gerencie suas mercadorias, combos, doses e cervejas.</p>
                </div>
                {canEdit && (
                    <button
                        onClick={() => {
                            if (!canEdit) {
                                toast.error('Você não tem permissão para editar o estoque.');
                                return;
                            }
                            setStockSearchQuery('');
                            setStockQuantityToAdd(1);
                            setShowAddStockModal(true);
                        }}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition-colors font-bold flex items-center gap-2"
                    >
                        <PackagePlus size={18} /> Adicionar Estoque
                    </button>
                )}
                {canCreate && (
                    <button
                        onClick={handleAddNew}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition-colors font-bold flex items-center gap-2"
                    >
                        <Plus size={18} /> Novo Produto
                    </button>
                )}
            </header>

            <div className="glass p-6 rounded-xl flex-1 flex flex-col overflow-hidden">
                <div className="mb-4 flex gap-4">
                    <input
                        id="estoque_search"
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Filtro rápido (ou bipe o código de barras na tela)"
                        className="w-full md:w-1/2 bg-background border border-border rounded-lg px-4 py-2 outline-none focus:border-primary transition-all"
                    />
                    {filterCritico && (
                        <button onClick={() => setFilterCritico(false)} className="bg-red-500/10 text-red-500 px-4 py-2 rounded-lg font-bold hover:bg-red-500/20 transition-colors">
                            Limpar Filtro Crítico
                        </button>
                    )}
                </div>
                {loading ? (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">Carregando estoque...</div>
                ) : produtos.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">Estoque vazio. Adicione um produto.</div>
                ) : (
                    <div className="overflow-auto flex-1 space-y-8">
                        {Array.from(new Set(produtos.map(p => p.categoria))).sort().map(cat => {
                            const groupProds = produtos.filter(p => p.categoria === cat).filter(p => {
                                if (filterCritico) {
                                    const limite = p.usar_estoque_global ? globalConfig.estoque : (p.estoque_minimo_manual || 0);
                                    // For simplicity, visual client-side filter uses physical stock
                                    if (p.estoque_atual > limite) return false;
                                }
                                if (!search) return true;
                                return p.nome.toLowerCase().includes(search.toLowerCase()) || p.codigo_barras?.includes(search) || p.categoria.toLowerCase().includes(search.toLowerCase());
                            });

                            if (groupProds.length === 0) return null;

                            return (
                                <div key={cat} className="space-y-4">
                                    <h3 className="text-xl font-bold flex items-center gap-2">
                                        <span className="w-1.5 h-6 bg-primary rounded-full" />
                                        {cat} <span className="text-sm text-muted-foreground font-normal ml-2">({groupProds.length} itens)</span>
                                    </h3>
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-border text-muted-foreground text-sm">
                                                <th className="pb-3 font-medium">Nome</th>
                                                <th className="pb-3 font-medium">Custo</th>
                                                <th className="pb-3 font-medium">Venda</th>
                                                <th className="pb-3 font-medium">Estoque</th>
                                                <th className="pb-3 font-medium text-right">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm">
                                            {groupProds.map(p => {
                                                // Dynamic stock for list
                                                const limite = p.usar_estoque_global ? globalConfig.estoque : (p.estoque_minimo_manual || 0);

                                                const getDisplayEstoque = (prod: Produto): number => {
                                                    if (['Combo', 'Dose'].includes(prod.categoria)) {
                                                        const myReqs = allReqs.filter(r => r.combo_id === prod.id);
                                                        const myFixos = allFixos.filter(f => f.combo_id === prod.id);
                                                        
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
                                                        if (prod.categoria === 'Shot' || prod.categoria === 'Dose') {
                                                            const doseP = allDoses.find(d => d.produto_dose_id === prod.id);
                                                            const garrafa = produtos.find(x => x.id === doseP?.produto_garrafa_id);
                                                            if (garrafa && doseP?.volume_garrafa && doseP?.volume_dose) {
                                                                capsDose.push(garrafa.estoque_atual * Math.floor(doseP.volume_garrafa / doseP.volume_dose));
                                                            }
                                                        }

                                                        const combined = [...capsReqs, ...capsFixos, ...capsDose];
                                                        return combined.length > 0 ? Math.min(...combined) : (prod.categoria === 'Combo' ? 0 : prod.estoque_atual);
                                                    } else if (prod.categoria === 'Shot') {
                                                        const doseP = allDoses.find(d => d.produto_dose_id === prod.id);
                                                        const garrafa = produtos.find(x => x.id === doseP?.produto_garrafa_id);
                                                        if (garrafa && doseP?.volume_garrafa && doseP?.volume_dose) {
                                                            return garrafa.estoque_atual * Math.floor(doseP.volume_garrafa / doseP.volume_dose);
                                                        }
                                                    } else if (prod.categoria === 'Caixa') {
                                                        const caixaData = allCaixas.find(c => c.produto_caixa_id === prod.id);
                                                        if (caixaData) {
                                                            const unitProduct = produtos.find(x => x.id === caixaData.produto_unidade_id);
                                                            if (unitProduct && caixaData.quantidade_na_caixa > 0) {
                                                                return Math.floor(unitProduct.estoque_atual / caixaData.quantidade_na_caixa);
                                                            }
                                                        }
                                                    }
                                                    return prod.estoque_atual || 0;
                                                };

                                                const itemEstoqueAtual = getDisplayEstoque(p);

                                                const isCritico = itemEstoqueAtual <= limite;

                                                return (
                                                    <tr key={p.id} className="border-b border-border/50 hover:bg-white/5 transition-colors group">
                                                        <td className="py-3 flex flex-col">
                                                            <span className="font-semibold">{p.nome}</span>
                                                            {p.codigo_barras && <span className="text-xs text-muted-foreground font-mono">{p.codigo_barras}</span>}
                                                        </td>
                                                        <td className="py-3 text-muted-foreground font-mono">R$ {p.preco_custo.toFixed(2)}</td>
                                                        <td className="py-3 font-bold font-mono">R$ {p.preco_venda.toFixed(2)}</td>
                                                        <td className="p-3">
                                                            <span className={`inline-flex items-center justify-center min-w-[3rem] px-2 py-1 rounded-md text-xs font-bold ${isCritico ? 'bg-red-500/10 text-red-500 shadow-[inset_0_0_10px_rgba(239,68,68,0.2)] border border-red-500/20' : 'bg-white/5 text-white'}`}>
                                                                {itemEstoqueAtual}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 text-right">
                                                            {canEdit && (
                                                                <button onClick={() => handleEditClick(p)} className="text-primary hover:text-primary/80 font-bold transition-colors" title="Editar">
                                                                    Editar
                                                                </button>
                                                            )}
                                                            {canDelete && (
                                                                <button onClick={() => handleDelete(p.id)} className="p-2 text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel p-6 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                        <h2 className="text-xl font-bold mb-4">{formData.id ? 'Editar Produto' : 'Adicionar Produto'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-sm text-muted-foreground block mb-1">Nome</label>
                                <input required value={formData.nome || ''} onChange={e => setFormData({ ...formData, nome: e.target.value })} className="w-full bg-background border border-border rounded-lg px-3 py-2 outline-none focus:border-primary" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-muted-foreground block mb-1">Categoria</label>
                                    <CustomSelect
                                        value={formData.categoria || ''}
                                        onChange={newCat => {
                                            setFormData({ ...formData, categoria: newCat });
                                            if (newCat === 'Combo') {
                                                setComboRequisitos([]);
                                                setComboItensFixos([]);
                                            }
                                            else if (newCat === 'Shot' || newCat === 'Dose') setDoseParams([{ produto_garrafa_id: '', volume_garrafa: 1000, volume_dose: 50 }]);
                                            else if (newCat === 'Caixa') setCaixaParams({ produto_unidade_id: '', quantidade_na_caixa: 15 });
                                        }}
                                        className="capitalize font-medium z-50 relative"
                                        options={[
                                            { value: 'Combo', label: 'Combo', group: 'Sistema' },
                                            { value: 'Shot', label: 'Shot', group: 'Sistema' },
                                            { value: 'Dose', label: 'Dose', group: 'Sistema' },
                                            { value: 'Caixa', label: 'Caixa', group: 'Sistema' },
                                            ...categorias.filter(cat => !['Combo', 'Shot', 'Dose', 'Caixa'].includes(cat.nome)).map(cat => ({ value: cat.nome, label: cat.nome, group: 'Personalizadas' }))
                                        ]}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-muted-foreground block mb-1">Cód. Barras</label>
                                    <input id="codigo_barras_input" value={formData.codigo_barras || ''} onChange={e => setFormData({ ...formData, codigo_barras: e.target.value })} className="w-full bg-background border border-border rounded-lg px-3 py-2 outline-none focus:border-primary" />
                                </div>
                            </div>

                            {/* DYNAMIC FORMS BASED ON CATEGORY */}
                            {(formData.categoria === 'Combo' || formData.categoria === 'Dose') && (
                                <div className="space-y-4">
                                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
                                        <h3 className="font-bold text-primary">Requisitos do Combo (Categorias)</h3>
                                        <p className="text-xs text-muted-foreground">Especifique as categorias e quantidades gerais (ex: 1x Destilado). No PDV, o valor do item escolhido será somado ao total do combo.</p>

                                        <div className="flex gap-2 items-center">
                                            <div className="flex-1">
                                                <CustomSelect
                                                    value={reqCat}
                                                    onChange={setReqCat}
                                                    placeholder="Selecione uma Categoria..."
                                                    options={categorias.map(cat => ({ value: cat.nome, label: cat.nome }))}
                                                />
                                            </div>
                                            <input type="number" min="1" value={reqQtd} onChange={e => setReqQtd(parseInt(e.target.value))} className="w-20 bg-background border border-border rounded-lg px-2 py-1 text-sm outline-none" />
                                            <button type="button" onClick={addComboRequirement} className="bg-primary text-primary-foreground px-3 py-1 rounded text-sm font-bold">Add</button>
                                        </div>

                                        {comboRequisitos.length > 0 && (
                                            <div className="flex flex-col gap-1 mt-2">
                                                {comboRequisitos.map(r => (
                                                    <div key={r.categoria_nome} className="flex justify-between items-center bg-background/50 px-3 py-2 rounded border border-border/50">
                                                        <span className="text-sm">{r.quantidade}x {r.categoria_nome}</span>
                                                        <button type="button" onClick={() => removeComboRequirement(r.categoria_nome)} className="text-red-400 hover:text-red-300"><X size={14} /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
                                        <h3 className="font-bold text-primary">Itens Fixos (Opcional)</h3>
                                        <p className="text-xs text-muted-foreground">Produtos que SEMPRE vêm no combo (ex: Copo, Gelo, Caixa). Eles são adicionados automaticamente.</p>

                                        <div className="flex gap-2 items-center">
                                            <div className="flex-1">
                                                <CustomSelect
                                                    value={fixProdId}
                                                    onChange={setFixProdId}
                                                    placeholder="Selecione um Produto Fixo..."
                                                    options={produtos.filter(p => p.id !== formData.id).map(p => ({ value: p.id, label: p.nome }))}
                                                />
                                            </div>
                                            <input type="number" min="1" value={fixQtd} onChange={e => setFixQtd(parseInt(e.target.value))} className="w-20 bg-background border border-border rounded-lg px-2 py-1 text-sm outline-none" />
                                            <button type="button" onClick={addComboFixedItem} className="bg-primary text-primary-foreground px-3 py-1 rounded text-sm font-bold">Add</button>
                                        </div>

                                        {comboItensFixos.length > 0 && (
                                            <div className="flex flex-col gap-1 mt-2">
                                                {comboItensFixos.map(ci => {
                                                    const p = produtos.find(opt => opt.id === ci.produto_id);
                                                    return (
                                                        <div key={ci.produto_id} className="flex justify-between items-center bg-background/50 px-3 py-2 rounded border border-border/50">
                                                            <span className="text-sm">{ci.quantidade}x {p?.nome || 'Desconhecido'}</span>
                                                            <button type="button" onClick={() => removeComboFixedItem(ci.produto_id)} className="text-red-400 hover:text-red-300"><X size={14} /></button>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                         )}
                                    </div>

                                    <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg space-y-3">
                                        <h3 className="font-bold text-amber-500">Regras de Preço por Seleção</h3>
                                        <p className="text-xs text-muted-foreground italic">
                                            Abaixo estão os produtos das categorias selecionadas acima. 
                                            Defina o <b>Preço Adicional</b> (valor que este item soma ao total do combo no PDV).
                                        </p>

                                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                            {comboRequisitos.map(req => {
                                                const catProds = produtos.filter(p => p.categoria === req.categoria_nome);
                                                if (catProds.length === 0) return null;

                                                return (
                                                    <div key={req.categoria_nome} className="space-y-2">
                                                        <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 flex items-center gap-2">
                                                            <div className="h-px flex-1 bg-border/30" />
                                                            {req.categoria_nome}
                                                            <div className="h-px flex-1 bg-border/30" />
                                                        </div>
                                                        {catProds.map(p => (
                                                            <div key={p.id} className="flex justify-between items-center bg-black/20 p-2 rounded border border-white/5 group hover:border-amber-500/30 transition-colors">
                                                                <span className="text-sm truncate mr-4">{p.nome}</span>
                                                                <div className="flex items-center gap-2 shrink-0">
                                                                    <span className="text-[10px] text-muted-foreground">Adicional:</span>
                                                                    <div className="relative w-24">
                                                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">R$</span>
                                                                        <input 
                                                                            type="text" 
                                                                            value={p.preco_combo ? p.preco_combo.toFixed(2) : '0.00'}
                                                                            onChange={e => {
                                                                                const formatted = formatCurrencyInput(e.target.value);
                                                                                const newPrice = parseFloat(formatted);
                                                                                // Update UI immediately
                                                                                setProdutos(prev => prev.map(item => item.id === p.id ? { ...item, preco_combo: newPrice } : item));
                                                                                // Save to DB
                                                                                supabase.from('produtos').update({ preco_combo: newPrice }).eq('id', p.id).then(({error}) => {
                                                                                    if (error) toast.error(`Erro ao salvar preço de ${p.nome}`);
                                                                                });
                                                                            }}
                                                                            className="w-full bg-background/50 border border-border/50 rounded px-2 py-1 text-xs text-right font-mono focus:border-amber-500 outline-none pl-6"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            })}
                                            {comboRequisitos.length === 0 && (
                                                <div className="text-center py-4 text-xs text-muted-foreground border border-dashed border-border rounded">
                                                    Adicione requisitos de categoria acima para configurar preços individuais.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {(formData.categoria === 'Dose' || formData.categoria === 'Shot') && (
                                <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-bold text-blue-400">Configuração de Fracionamento</h3>
                                        <button 
                                            onClick={() => setDoseParams([...doseParams, { produto_garrafa_id: '', volume_garrafa: 1000, volume_dose: 50 }])}
                                            className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-1 rounded hover:bg-blue-500/30 transition-colors font-bold uppercase"
                                        >
                                            + Adicionar Componente
                                        </button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">O estoque consumirá todas as garrafas matrizes configuradas.</p>

                                    <div className="space-y-4">
                                        {doseParams.map((dose, idx) => (
                                            <div key={idx} className="p-3 bg-black/20 rounded-lg border border-white/5 space-y-3 relative group/dose">
                                                {doseParams.length > 1 && (
                                                    <button 
                                                        onClick={() => setDoseParams(doseParams.filter((_, i) => i !== idx))}
                                                        className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-red-400 opacity-0 group-hover/dose:opacity-100 transition-all"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                                
                                                <div>
                                                    <label className="text-[10px] font-bold block mb-1 uppercase text-muted-foreground">Garrafa Matriz #{idx + 1}</label>
                                                    <CustomSelect 
                                                        value={dose.produto_garrafa_id} 
                                                        onChange={val => setDoseParams(doseParams.map((d, i) => i === idx ? { ...d, produto_garrafa_id: val } : d))} 
                                                        placeholder="Selecione a Garrafa..."
                                                        options={produtos.filter(p => p.id !== formData.id && !['Combo', 'Shot', 'Dose', 'Caixa'].includes(p.categoria)).map(p => ({ value: p.id, label: p.nome }))}
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="text-[10px] font-bold block mb-1 uppercase text-muted-foreground">Volume Garrafa (ml)</label>
                                                        <input required type="number" min="1" value={dose.volume_garrafa} onChange={e => setDoseParams(doseParams.map((d, i) => i === idx ? { ...d, volume_garrafa: parseInt(e.target.value) || 0 } : d))} className="w-full bg-background border border-border rounded px-2 py-1 text-xs outline-none focus:border-blue-500" />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold block mb-1 uppercase text-muted-foreground">Volume Dose (ml)</label>
                                                        <input required type="number" min="1" value={dose.volume_dose} onChange={e => setDoseParams(doseParams.map((d, i) => i === idx ? { ...d, volume_dose: parseInt(e.target.value) || 0 } : d))} className="w-full bg-background border border-border rounded px-2 py-1 text-xs outline-none focus:border-blue-500" />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {formData.categoria === 'Caixa' && (
                                <div className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-lg space-y-3">
                                    <h3 className="font-bold text-orange-400">Configuração de Caixa</h3>
                                    <p className="text-xs text-muted-foreground">Cada caixa contém múltiplas unidades. O estoque unitário será atualizado automaticamente na entrada.</p>

                                    <div>
                                        <label className="text-xs font-bold block mb-1">Produto da Unidade</label>
                                        <CustomSelect 
                                            value={caixaParams.produto_unidade_id} 
                                            onChange={val => setCaixaParams({ ...caixaParams, produto_unidade_id: val })} 
                                            placeholder="Selecione o produto unitário..."
                                            options={produtos.filter(p => p.id !== formData.id && !['Combo', 'Shot', 'Dose', 'Caixa'].includes(p.categoria)).map(p => ({ value: p.id, label: p.nome }))}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold block mb-1">Quantidade de Unidades na Caixa</label>
                                        <input required type="number" min="1" value={caixaParams.quantidade_na_caixa} onChange={e => setCaixaParams({ ...caixaParams, quantidade_na_caixa: parseInt(e.target.value) || 0 })} className="w-full bg-background border border-border rounded-lg px-2 py-1 text-sm outline-none font-bold" />
                                    </div>
                                </div>
                            )}

                            {/* ESTOQUE FISICO E VENDA FINAL */}
                            {formData.categoria !== 'Combo' && (
                                <div className="grid grid-cols-3 gap-4">
                                    {formData.categoria !== 'Dose' && formData.categoria !== 'Shot' ? (
                                        <div>
                                            <label className="text-sm text-muted-foreground block mb-1">Custo Manual (R$)</label>
                                            <input
                                                required
                                                type="text"
                                                value={formData.preco_custo ? formData.preco_custo.toFixed(2) : '0.00'}
                                                onChange={e => {
                                                    const formatted = formatCurrencyInput(e.target.value);
                                                    const newCusto = parseFloat(formatted);
                                                    const margem = formData.percentual_lucro_manual || globalConfig.lucro;
                                                    const newVenda = newCusto + (newCusto * margem / 100);
                                                    setFormData({ ...formData, preco_custo: newCusto, preco_venda: parseFloat(newVenda.toFixed(2)), percentual_lucro_manual: margem });
                                                }}
                                                className="w-full bg-background border border-border rounded-lg px-3 py-2 outline-none focus:border-primary font-mono text-right"
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex flex-col justify-center">
                                            <span className="text-sm text-muted-foreground font-medium mb-1">Custo Base: R$ {displayCusto.toFixed(2)}</span>
                                            <span className="text-[10px] text-muted-foreground">(Soma dos itens fixos e garrafas)</span>
                                        </div>
                                    )}
                                    <div>
                                        <label className="text-sm text-muted-foreground block mb-1">Venda Final (R$)</label>
                                        <input
                                            required
                                            type="text"
                                            value={formData.preco_venda ? Number(formData.preco_venda).toFixed(2) : '0.00'}
                                            onChange={e => {
                                                const formatted = formatCurrencyInput(e.target.value);
                                                const newVenda = parseFloat(formatted);
                                                let newMargem = formData.percentual_lucro_manual || 0;
                                                if (displayCusto > 0) {
                                                    newMargem = ((newVenda - displayCusto) / displayCusto) * 100;
                                                }
                                                setFormData({ ...formData, preco_venda: newVenda, percentual_lucro_manual: parseFloat(newMargem.toFixed(2)), usar_lucro_global: false });
                                            }}
                                            className="w-full bg-background border border-border rounded-lg px-3 py-2 outline-none focus:border-primary text-foreground font-mono text-right"
                                        />
                                    </div>
                                    {formData.categoria !== 'Dose' && formData.categoria !== 'Shot' ? (
                                        <div>
                                            <label className="text-sm text-muted-foreground block mb-1">Estoque Físico</label>
                                            <input required type="number" min="0" value={formData.estoque_atual ?? 0} onChange={e => setFormData({ ...formData, estoque_atual: parseInt(e.target.value) || 0 })} className="w-full bg-background border border-border rounded-lg px-3 py-2 outline-none focus:border-primary" />
                                        </div>
                                    ) : (
                                        <div className="flex flex-col justify-center">
                                            <span className="text-sm text-muted-foreground font-medium mb-1">Estoque: {displayEstoque}</span>
                                            <span className="text-xs text-muted-foreground">(Derivado)</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* COMBO BASE PRICE CONFIG (FOR ENERGY DRINKS ETC) */}
                            {formData.categoria !== 'Combo' && (
                                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <label className="text-sm font-bold text-primary block mb-1">Preço Base p/ Combo (Opcional)</label>
                                        <p className="text-[10px] text-muted-foreground mb-2">
                                            Defina este valor se o produto for um ativador de preço em combos (ex: Red Bull = 50.00, Vibe = 30.00).
                                        </p>
                                    </div>
                                    <div className="w-40 relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xs font-mono">R$</span>
                                        <input
                                            type="text"
                                            value={formData.preco_combo ? formData.preco_combo.toFixed(2) : '0.00'}
                                            onChange={e => {
                                                const formatted = formatCurrencyInput(e.target.value);
                                                setFormData({ ...formData, preco_combo: parseFloat(formatted) });
                                            }}
                                            className="w-full bg-background border border-border rounded-lg pl-10 pr-3 py-2 outline-none focus:border-primary font-mono text-right font-bold"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                            {/* GLOBAL MARGIN OVERRIDES */}
                            {formData.categoria !== 'Combo' && (
                                <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-card border border-border/50 rounded-lg">
                                    <label className="text-xs text-muted-foreground block mb-1">Margem de Lucro Atual (%)</label>
                                    <div className="flex items-center gap-2">
                                        <input type="number" step="0.1" value={formData.percentual_lucro_manual ?? ''} onChange={e => {
                                            const newMargem = parseFloat(e.target.value) || 0;
                                            const newVenda = displayCusto + (displayCusto * newMargem / 100);
                                            setFormData({ ...formData, percentual_lucro_manual: newMargem, preco_venda: parseFloat(newVenda.toFixed(2)), usar_lucro_global: false });
                                        }} className="w-full bg-background border border-border rounded-lg px-2 py-1.5 outline-none focus:border-primary text-sm" />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newVenda = displayCusto + (displayCusto * globalConfig.lucro / 100);
                                                setFormData({ ...formData, percentual_lucro_manual: globalConfig.lucro, preco_venda: parseFloat(newVenda.toFixed(2)), usar_lucro_global: true });
                                            }}
                                            className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${formData.usar_lucro_global ? 'bg-primary text-primary-foreground shadow-[0_0_10px_rgba(255,255,255,0.1)]' : 'bg-primary/20 text-primary hover:bg-primary/30'}`}
                                            title={`Aplicar Margem Padrão (${globalConfig.lucro}%)`}
                                        >
                                            Padrão ({globalConfig.lucro})
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-2 leading-tight">
                                        A margem ajusta o valor de venda automaticamente. Você também pode digitar o valor de venda direto se preferir arredondar.
                                    </p>
                                </div>
                                <div className="p-3 bg-card border border-border/50 rounded-lg">
                                    <label className="text-xs text-muted-foreground block mb-1">Alerta de Estoque Mínimo</label>
                                    <div className="flex items-center gap-2">
                                        <input type="number" value={formData.estoque_minimo_manual ?? ''} onChange={e => {
                                            setFormData({ ...formData, estoque_minimo_manual: Number(e.target.value), usar_estoque_global: false });
                                        }} className="w-full bg-background border border-border rounded-lg px-2 py-1.5 outline-none focus:border-primary text-sm" />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setFormData({ ...formData, estoque_minimo_manual: globalConfig.estoque, usar_estoque_global: true });
                                            }}
                                            className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${formData.usar_estoque_global ? 'bg-primary text-primary-foreground shadow-[0_0_10px_rgba(255,255,255,0.1)]' : 'bg-primary/20 text-primary hover:bg-primary/30'}`}
                                            title={`Aplicar Estoque Mínimo Padrão (${globalConfig.estoque})`}
                                        >
                                            Padrão ({globalConfig.estoque})
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-2 leading-tight">
                                        O produto ficará vermelho no estoque se a quantidade for menor ou igual a este limite.
                                    </p>
                                </div>
                            </div>
                        )}

                            {/* PREVIEW */}
                            <div className="grid grid-cols-3 gap-4 bg-primary/5 p-4 rounded-lg border border-primary/20">
                                <div>
                                    <label className="text-xs text-primary/80 block mb-1 font-bold">Custo Base Agendado</label>
                                    <p className="font-mono mt-1">R$ {displayCusto.toFixed(2)}</p>
                                </div>
                                <div>
                                    <label className="text-xs text-primary/80 block mb-1 font-bold">Venda Sugerida</label>
                                    <p className="font-mono mt-1 font-bold text-base">
                                        R$ {(formData.preco_venda || 0).toFixed(2)}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-xs text-green-500 block mb-1 font-bold">Previsão em Estoque</label>
                                    <p className="font-mono mt-1 font-bold">
                                        {formData.categoria === 'Combo' || formData.categoria === 'Dose' ? `${displayEstoque} derivado(s)` : `${displayEstoque} fisico(s)`}
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg text-muted-foreground hover:bg-white/5 transition-colors">Cancelar</button>
                                <button type="submit" className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-bold hover:bg-primary/90 transition-colors">Salvar Produto</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showAddStockModal && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel p-6 rounded-xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <PackagePlus className="text-primary" />
                                Adicionar Estoque
                            </h2>
                            <button onClick={() => setShowAddStockModal(false)} className="text-muted-foreground hover:text-white p-1">
                                <X size={20} />
                            </button>
                        </div>

                        {!selectedStockProduct ? (
                            <div className="space-y-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="Buscar produto por nome ou barcode..."
                                        value={stockSearchQuery}
                                        onChange={(e) => setStockSearchQuery(e.target.value)}
                                        className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-3 outline-none focus:border-primary transition-all text-lg"
                                    />
                                </div>
                                <div className="max-h-64 overflow-y-auto rounded-lg border border-border/50 divide-y divide-border/50">
                                    {produtos
                                        .filter(p => p.categoria !== 'Combo' && p.categoria !== 'Dose')
                                        .filter(p => {
                                            if (!stockSearchQuery) return false; // Show nothing until search
                                            const search = stockSearchQuery.toLowerCase();
                                            return p.nome.toLowerCase().includes(search) || (p.codigo_barras && p.codigo_barras.includes(search));
                                        })
                                        .map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => setSelectedStockProduct(p)}
                                                className="w-full text-left p-3 hover:bg-white/5 transition-colors flex justify-between items-center group"
                                            >
                                                <div>
                                                    <p className="font-bold">{p.nome}</p>
                                                    {p.codigo_barras && <p className="text-xs text-muted-foreground font-mono">{p.codigo_barras}</p>}
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-xs text-muted-foreground block">Atual</span>
                                                    <span className="font-mono font-bold">{p.estoque_atual}</span>
                                                </div>
                                            </button>
                                        ))}

                                    {stockSearchQuery && produtos.filter(p => p.categoria !== 'Combo' && p.categoria !== 'Dose').filter(p => p.nome.toLowerCase().includes(stockSearchQuery.toLowerCase()) || (p.codigo_barras && p.codigo_barras.includes(stockSearchQuery))).length === 0 && (
                                        <div className="p-4 text-center text-muted-foreground text-sm">Nenhum produto encontrado.</div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleAddStockSubmit} className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                <div className="p-4 bg-background/50 rounded-lg border border-border">
                                    <p className="text-sm text-muted-foreground mb-1">Produto Selecionado</p>
                                    <p className="font-bold text-lg">{selectedStockProduct.nome}</p>
                                    <div className="flex justify-between mt-2 pt-2 border-t border-border/50">
                                        <span className="text-sm text-muted-foreground">Estoque Atual:</span>
                                        <span className="font-mono font-bold text-white">{selectedStockProduct.estoque_atual}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedStockProduct(null);
                                            setStockSearchQuery('');
                                        }}
                                        className="text-xs text-primary hover:underline mt-2 inline-block"
                                    >
                                        ← Voltar para busca
                                    </button>
                                </div>

                                <div>
                                    <label className="text-sm font-bold block mb-2">Quantidade a Adicionar</label>
                                    <input
                                        autoFocus
                                        type="number"
                                        min="1"
                                        required
                                        value={stockQuantityToAdd || ''}
                                        onChange={(e) => setStockQuantityToAdd(parseInt(e.target.value) || 0)}
                                        className="w-full bg-background border border-primary/50 text-xl font-bold rounded-lg px-4 py-3 outline-none focus:border-primary transition-all focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>

                                <div className="p-3 bg-primary/10 rounded-lg flex justify-between items-center">
                                    <span className="text-sm font-bold text-primary/80">Novo Estoque Previsto:</span>
                                    <span className="font-mono font-bold text-xl text-primary">{selectedStockProduct.estoque_atual + (stockQuantityToAdd || 0)}</span>
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddStockModal(false)}
                                        className="px-4 py-2 rounded-lg text-muted-foreground hover:bg-white/5 transition-colors font-medium"
                                        disabled={isAddingStock}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isAddingStock || stockQuantityToAdd <= 0}
                                        className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {isAddingStock ? 'Adicionando...' : 'Confirmar Adição'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
