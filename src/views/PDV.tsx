import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import type { Produto } from './Estoque';
import { Search, ShoppingCart, Plus, Minus, Trash2, Banknote, CreditCard, QrCode, Printer, X, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { CustomSelect } from '../components/ui/CustomSelect';
import { useAuth } from '../contexts/AuthContext';

interface CartItem extends Produto {
    qtd_carrinho: number;
    combo_selections?: {
        requirement_name: string;
        selected_product_id: string;
        selected_product_name: string;
    }[];
}

export function PDV() {
    const [produtos, setProdutos] = useState<Produto[]>([]);
    const [search, setSearch] = useState('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [desconto, setDesconto] = useState('');
    const [novoTotal, setNovoTotal] = useState('');
    const { user: authUser } = useAuth();

    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [lastSaleData, setLastSaleData] = useState<{
        items: CartItem[];
        total: number;
        desconto: number;
        pago: number;
        troco: number;
        metodo: string;
        data: Date;
        vendedor: string;
    } | null>(null);

    const [allReqs, setAllReqs] = useState<any[]>([]);
    const [allFixos, setAllFixos] = useState<any[]>([]);
    const [allDoses, setAllDoses] = useState<any[]>([]);
    const [allCaixas, setAllCaixas] = useState<any[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);

    const [showComboModal, setShowComboModal] = useState(false);
    const [activeCombo, setActiveCombo] = useState<Produto | null>(null);
    const [tempSelections, setTempSelections] = useState<{ requirement_name: string, items: { product_id: string, quantidade: number }[] }[]>([]);

    const [pagamentoValores, setPagamentoValores] = useState<Record<string, string[]>>({
        'Dinheiro': [''],
        'PIX': [''],
        'Cartão de Crédito': [''],
        'Cartão de Débito': ['']
    });

    // Barcode scanner logic
    const barcodeBuffer = useRef('');
    const barcodeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const filteredProdutos = useMemo(() => {
        return produtos.filter(p =>
            p.nome.toLowerCase().includes(search.toLowerCase()) ||
            p.codigo_barras?.includes(search) ||
            p.categoria.toLowerCase().includes(search.toLowerCase())
        ).sort((a, b) => {
            if (!search) return a.nome.localeCompare(b.nome);
            const term = search.toLowerCase();
            const aStarts = a.nome.toLowerCase().startsWith(term);
            const bStarts = b.nome.toLowerCase().startsWith(term);
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;
            return a.nome.localeCompare(b.nome);
        });
    }, [produtos, search]);

    useEffect(() => {
        fetchProdutos();
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // If typing inside an input, usually it's the search bar. We still want Enter to maybe add it?
            // But standard bipador types very fast.
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => Math.min(prev + 1, filteredProdutos.length - 1));
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => Math.max(prev - 1, 0));
                return;
            }
            if (e.key === 'Enter') {
                if (document.activeElement?.id === 'pdv_search' || document.activeElement === document.body) {
                    if (filteredProdutos.length > 0 && selectedIndex >= 0 && selectedIndex < filteredProdutos.length) {
                        addToCart(filteredProdutos[selectedIndex]);
                        setSelectedIndex(0);
                        return;
                    }
                }
            }
            
            if (e.key === 'Enter') {
                const barcode = barcodeBuffer.current;
                if (barcode.length > 2) {
                    setSearch(''); // Clear search on bip
                    // Find product by barcode
                    const product = produtos.find(p => p.codigo_barras === barcode);
                    if (product) {
                        addToCart(product);
                    } else {
                        // If they typed/biped something not in our barcode list, check if it's the only result
                        const filtered = produtos.filter(p => p.nome.toLowerCase().includes(barcode.toLowerCase()) || p.codigo_barras?.includes(barcode));
                        if (filtered.length === 1) {
                            addToCart(filtered[0]);
                        }
                    }
                } else if (document.activeElement?.id === 'pdv_search') {
                    const filtered = produtos.filter(p => !search || p.nome.toLowerCase().includes(search.toLowerCase()) || p.codigo_barras?.includes(search) || p.categoria.toLowerCase().includes(search.toLowerCase()));
                    if (filtered.length === 1) {
                        addToCart(filtered[0]);
                    }
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
    }, [produtos, search, addToCart, selectedIndex, filteredProdutos]); // Added dependencies for keyboard navigation

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

    useEffect(() => {
        setSelectedIndex(0);
    }, [search]);

    useEffect(() => {
        const item = document.getElementById(`prod-item-${selectedIndex}`);
        if (item) {
            item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [selectedIndex]);

    function addToCart(produto: Produto) {
        const isDoseOrShot = ['Dose', 'Shot'].includes(produto.categoria);
        const doseOptions = allDoses.filter(d => d.produto_dose_id === produto.id);
        const reqs = allReqs.filter(r => r.combo_id === produto.id);
        const isDynamic = doseOptions.length > 0 && doseOptions[0].is_dynamic;

        if (['Combo'].includes(produto.categoria) || (isDoseOrShot && (isDynamic || reqs.length > 0))) {
            setActiveCombo(produto);
            const selections: { requirement_name: string; items: any[] }[] = [];
            
            // Add dose groups if dynamic
            if (isDoseOrShot && isDynamic) {
                const gruposUnicos = Array.from(new Set(doseOptions.map(d => d.grupo_nome || 'Opção Única')));
                gruposUnicos.forEach(g => selections.push({ requirement_name: g, items: [] }));
            }
            
            // Add category requirements
            reqs.forEach(r => selections.push({ requirement_name: r.categoria_nome, items: [] }));

            if (selections.length > 0) {
                setTempSelections(selections);
                setShowComboModal(true);
                return;
            }
        }

        setCart(prev => {
            const exists = prev.find(item => item.id === produto.id);
            if (exists) {
                if (!['Combo', 'Dose', 'Shot', 'Caixa'].includes(produto.categoria) && exists.qtd_carrinho >= produto.estoque_atual) return prev; 
                return prev.map(item => item.id === produto.id ? { ...item, qtd_carrinho: item.qtd_carrinho + 1 } : item);
            }
            return [...prev, { ...produto, qtd_carrinho: 1 }];
        });
    }

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
        } else if (prod.categoria === 'Dose' || prod.categoria === 'Shot') {
            const doseCompontents = allDoses.filter(d => d.produto_dose_id === prod.id);
            if (doseCompontents.length === 0) return 0;

            const availabilities = doseCompontents.map(dc => {
                const garrafa = produtos.find(x => x.id === dc.produto_garrafa_id);
                if (garrafa && dc.volume_garrafa && dc.volume_dose) {
                    const fullBottles = garrafa.estoque_atual * Math.floor(dc.volume_garrafa / dc.volume_dose);
                    // Open bottle doses (if any)
                    const openDoses = dc.doses_restantes_abertas || 0;
                    return fullBottles + openDoses;
                }
                return 0;
            });

            return Math.min(...availabilities);
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

    const calculateComboPrice = () => {
        if (!activeCombo) return 0;
        let total = activeCombo.preco_venda || 0;
        
        const isDoseOrShot = ['Dose', 'Shot'].includes(activeCombo.categoria);
        const doseGroups = isDoseOrShot ? Array.from(new Set(allDoses.filter(d => d.produto_dose_id === activeCombo.id && d.is_dynamic).map(d => d.grupo_nome || 'Opção Única'))) : [];

        // For each requirement group, find the highest additional price (except for dose liquids)
        tempSelections.forEach(s => {
            if (doseGroups.includes(s.requirement_name)) return;
            
            let maxSurcharge = 0;
            s.items.forEach(item => {
                const prod = produtos.find(p => p.id === item.product_id);
                if (prod && (prod.preco_combo ?? 0) > 0) {
                    if (prod.preco_combo! > maxSurcharge) maxSurcharge = prod.preco_combo!;
                }
            });
            total += maxSurcharge;
        });

        return total;
    };

    const calculateComboCusto = () => {
        if (!activeCombo) return 0;
        
        let totalCusto = activeCombo.preco_custo || 0;

        // Cost of selected products
        tempSelections.forEach(s => {
            s.items.forEach(item => {
                const prod = produtos.find(p => p.id === item.product_id);
                if (prod) {
                    totalCusto += (prod.preco_custo * item.quantidade);
                }
            });
        });

        // Cost of fixed products (accessories)
        allFixos.filter(f => f.combo_id === activeCombo.id).forEach(f => {
            const prod = produtos.find(p => p.id === f.produto_id);
            if (prod) {
                totalCusto += (prod.preco_custo * f.quantidade);
            }
        });

        return totalCusto;
    };

    function addComboToCart() {
        if (!activeCombo) return;
        
        const isDoseOrShot = ['Dose', 'Shot'].includes(activeCombo.categoria);
        const reqs = allReqs.filter(r => r.combo_id === activeCombo.id);
        const doseGroups = isDoseOrShot ? Array.from(new Set(allDoses.filter(d => d.produto_dose_id === activeCombo.id && d.is_dynamic).map(d => d.grupo_nome || 'Opção Única'))) : [];

        const doseValid = doseGroups.every(g => {
            const sel = tempSelections.find(s => s.requirement_name === g);
            return sel?.items.reduce((acc, curr) => acc + curr.quantidade, 0) === 1;
        });

        const reqsValid = reqs.every(r => {
            const sel = tempSelections.find(s => s.requirement_name === r.categoria_nome);
            return (sel?.items.reduce((acc, curr) => acc + curr.quantidade, 0) || 0) >= r.quantidade;
        });

        if (!doseValid || !reqsValid) {
            toast.error("Por favor, preencha todos os requisitos (1 item por grupo de dose e o mínimo das categorias).");
            return;
        }

        const flatSelections: { requirement_name: string, selected_product_id: string, selected_product_name: string }[] = [];
        tempSelections.forEach(s => {
            s.items.forEach(item => {
                const prod = produtos.find(p => p.id === item.product_id);
                for(let i = 0; i < item.quantidade; i++) {
                    flatSelections.push({ 
                        requirement_name: s.requirement_name, 
                        selected_product_id: item.product_id,
                        selected_product_name: prod?.nome || 'Item'
                    });
                }
            });
        });

        setCart(prev => [
            ...prev,
            {
                ...activeCombo,
                id: Math.random().toString(36).substr(2, 9),
                produto_id: activeCombo.id,
                preco_venda: calculateComboPrice(),
                preco_custo: calculateComboCusto(),
                qtd_carrinho: 1,
                is_combo: true,
                combo_selections: flatSelections
            }
        ]);

        setShowComboModal(false);
        setActiveCombo(null);
        setTempSelections([]);
        toast.success(`${activeCombo.nome} adicionado ao carrinho!`);
    }

    function removeFromCart(id: string) {
        setCart(prev => prev.filter(item => item.id !== id));
    }

    function updateQtd(id: string, delta: number) {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const newQtd = item.qtd_carrinho + delta;
                if (newQtd <= 0) return item; // Handled by remove button generally
                if (!['Combo', 'Dose', 'Shot', 'Caixa'].includes(item.categoria) && newQtd > item.estoque_atual) {
                    toast.error(`Apenas ${item.estoque_atual} disponíveis em estoque.`);
                    return item;
                }
                return { ...item, qtd_carrinho: newQtd };
            }
            return item;
        }));
    }

    function setExactQtd(id: string, newQtd: number | string) {
        // Parse the input, fallback to current or 1 if empty/invalid
        let parsed = typeof newQtd === 'string' ? parseInt(newQtd, 10) : newQtd;

        // If user clears the input, we might temporarily want to allow it empty, but controlled inputs need a number.
        // For simplicity and safety, if it's NaN or <= 0, we just don't update or set to 1.
        if (isNaN(parsed) || parsed <= 0) {
            parsed = 1;
        }

        setCart(prev => prev.map(item => {
            if (item.id === id) {
                if (!['Combo', 'Dose', 'Shot', 'Caixa'].includes(item.categoria) && parsed > item.estoque_atual) {
                    toast.error(`Apenas ${item.estoque_atual} disponíveis em estoque.`);
                    return { ...item, qtd_carrinho: item.estoque_atual };
                }
                return { ...item, qtd_carrinho: parsed };
            }
            return item;
        }));
    }

    const totalCart = cart.reduce((acc, item) => acc + (item.preco_venda * item.qtd_carrinho), 0);
    const valorDesconto = parseFloat(desconto) || 0;
    const totalComDesconto = Math.max(0, totalCart - valorDesconto);

    const valorPagoTotal = Object.values(pagamentoValores).flat().reduce((acc, val) => {
        const parsed = parseFloat(val);
        return acc + (isNaN(parsed) ? 0 : parsed);
    }, 0);
    const restaPagar = Math.max(0, totalComDesconto - valorPagoTotal);
    const troco = Math.max(0, valorPagoTotal - totalComDesconto);

    const handleOpenPaymentModal = () => {
        if (cart.length === 0) return;
        setDesconto('');
        setNovoTotal('');
        setPagamentoValores({
            'Dinheiro': [''],
            'PIX': [''],
            'Cartão de Crédito': [''],
            'Cartão de Débito': ['']
        });
        setShowPaymentModal(true);
    }

    function handlePagamentoChange(tipo: string, index: number, value: string) {
        setPagamentoValores(prev => ({
            ...prev,
            [tipo]: prev[tipo].map((v, i) => i === index ? value : v)
        }));
    }

    function autoFillPayment(tipo: string, index: number) {
        if (restaPagar <= 0) return;
        setPagamentoValores(prev => {
            const current = parseFloat(prev[tipo][index]) || 0;
            const newValues = [...prev[tipo]];
            newValues[index] = (current + restaPagar).toFixed(2);
            return { ...prev, [tipo]: newValues };
        });
    }

    async function confirmCheckout() {
        if (troco > 0) {
            const dinheiroTotal = pagamentoValores['Dinheiro'].reduce((acc, v) => acc + (parseFloat(v) || 0), 0);
            if (dinheiroTotal <= 0) {
                toast.error("O troco não pode ser retornado se o pagamento em 'Dinheiro' for zero. Ajuste o valor alocado para 'Dinheiro'.");
                return;
            }
        }

        setShowPaymentModal(false);
        setLoading(true);

        try {
            const tiposValidos = Object.entries(pagamentoValores)
                .map(([tipo, vals]) => {
                    const totalPorTipo = vals.reduce((acc, v) => acc + (parseFloat(v) || 0), 0);
                    return { tipo, valor: totalPorTipo };
                })
                .filter(p => p.valor > 0);

            let tipoString = '';
            if (tiposValidos.length === 1) {
                tipoString = tiposValidos[0].tipo;
            } else {
                tipoString = tiposValidos.map(p => `${p.tipo} (R$ ${p.valor.toFixed(2)})`).join(' + ');
            }

            const payload = {
                tipo_pagamento: tipoString,
                desconto: valorDesconto > 0 ? valorDesconto : null,
                itens: cart.map(item => ({
                    id: item.id,
                    quantidade: item.qtd_carrinho,
                    preco_venda: item.preco_venda,
                    preco_custo: item.preco_custo,
                    combo_selections: item.combo_selections
                })),
                pagamentoValores: JSON.stringify(pagamentoValores)
            };

            if (!navigator.onLine) {
                // OFFLINE MODE: Save to local pending queue
                const pendingStr = localStorage.getItem('@adegadosmulekes:vendas_pendentes');
                const pending = pendingStr ? JSON.parse(pendingStr) : [];
                pending.push({ ...payload, _id_local: Date.now() });
                localStorage.setItem('@adegadosmulekes:vendas_pendentes', JSON.stringify(pending));

                toast.success('Venda Registrada Localmente (Offline)', { icon: '📦' });
                setCart([]);
                setDesconto('');
                setNovoTotal('');
                setPagamentoValores({
                    'Dinheiro': [''],
                    'PIX': [''],
                    'Cartão de Crédito': [''],
                    'Cartão de Débito': ['']
                });
                // Do not fetchProdutos here, as it won't update stock down in offline mode anyway
                return;
            }

            // ONLINE MODE: Send to Supabase RPC
            const { error: err } = await supabase.rpc('finalizar_venda', { payload_json: payload });

            if (err) throw err;

            toast.success('Venda finalizada com sucesso!');
            setCart([]);
            setDesconto('');
            setNovoTotal('');
            setPagamentoValores({
                'Dinheiro': [''],
                'PIX': [''],
                'Cartão de Crédito': [''],
                'Cartão de Débito': ['']
            });
            fetchProdutos(); // Refresh stock

            // Prepare and show receipt
            setLastSaleData({
                items: [...cart],
                total: totalComDesconto,
                desconto: valorDesconto,
                pago: valorPagoTotal,
                troco: troco,
                metodo: tipoString,
                data: new Date(),
                vendedor: authUser?.username || 'Vendedor'
            });
            setShowReceiptModal(true);

        } catch (err) {
            console.error(err);
            toast.error('Erro ao finalizar venda.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="h-full flex flex-col animate-in fade-in duration-500">
            <header className="mb-6 shrink-0">
                <h1 className="text-3xl font-bold tracking-tight">Ponto de Venda (PDV)</h1>
                <p className="text-muted-foreground mt-1">Registre as vendas rapidamente.</p>
            </header>

            <div className="flex gap-6 flex-1 min-h-0">
                <div className="glass flex-1 p-6 rounded-xl flex flex-col overflow-hidden">
                    {/* Header and Search */}
                    <div className="mb-6 flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                            <input
                                id="pdv_search"
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Buscar por nome ou bipe o código de barras..."
                                className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-4 outline-none focus:border-primary transition-all text-lg shadow-inner"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-2 pb-4 pt-1">
                        {filteredProdutos.map((p: Produto, idx: number) => {
                            const pdvEstoque = getDisplayEstoque(p);
                            const isOutOfStock = pdvEstoque <= 0;
                            const isSelected = idx === selectedIndex;

                            return (
                                <button
                                    key={p.id}
                                    id={`prod-item-${idx}`}
                                    onClick={() => addToCart(p)}
                                    disabled={isOutOfStock}
                                    className={`glass-panel p-3 min-h-[70px] flex items-center justify-between gap-4 rounded-xl text-left transition-all group relative overflow-hidden w-full ${isOutOfStock ? 'opacity-40 grayscale cursor-not-allowed' : 'hover:scale-[1.01] active:scale-[0.99] shadow-sm'} ${isSelected ? 'border-primary ring-2 ring-primary/50 bg-primary/10' : 'hover:border-primary border-white/5'}`}
                                >
                                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                        <h3 className={`font-bold transition-colors leading-tight text-sm md:text-base whitespace-normal break-words ${isSelected ? 'text-primary' : 'text-white group-hover:text-primary'}`}>
                                            {p.nome}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-[10px] font-black tracking-tight ${isOutOfStock ? 'text-red-400' : (isSelected ? 'text-primary-foreground bg-primary px-1 rounded' : 'text-primary')}`}>
                                                {pdvEstoque} DISP.
                                            </span>
                                        </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                        <span className={`text-sm md:text-base font-bold block ${isSelected ? 'text-primary' : 'text-white'}`}>
                                            R$ {p.preco_venda.toFixed(2)}
                                        </span>
                                    </div>

                                    {/* Subtle add icon shown on hover or when selected */}
                                    <div className={`absolute right-0 top-0 bottom-0 w-1 bg-primary transform transition-transform duration-200 ${isSelected ? 'translate-x-0' : 'translate-x-1 group-hover:translate-x-0'}`} />
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="w-[380px] glass p-6 rounded-xl flex flex-col shrink-0">
                    <h3 className="text-xl font-bold border-b border-border/50 pb-4 flex items-center gap-2">
                        <ShoppingCart size={20} className="text-primary" /> Carrinho
                    </h3>

                    <div className="flex-1 overflow-y-auto py-4 space-y-4">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm opacity-50">
                                <ShoppingCart size={48} className="mb-4" />
                                <p>Nenhum item adicionado.</p>
                            </div>
                        ) : (
                            cart.map(item => (
                                <div key={item.id} className="flex gap-3 bg-background/50 p-3 rounded-lg border border-border/50">
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-sm truncate">{item.nome}</div>
                                        <div className="text-xs text-primary font-medium">R$ {item.preco_venda.toFixed(2)}</div>
                                    </div>
                                    <div className="flex items-center gap-2 bg-card rounded-md border border-border">
                                        <button onClick={() => updateQtd(item.id, -1)} className="p-1 text-muted-foreground hover:text-white disabled:opacity-50" disabled={item.qtd_carrinho <= 1}>
                                            <Minus size={14} />
                                        </button>
                                        <input
                                            type="number"
                                            value={item.qtd_carrinho || ''}
                                            onChange={(e) => setExactQtd(item.id, e.target.value)}
                                            onFocus={(e) => e.target.select()}
                                            className="w-8 text-center bg-transparent text-sm font-bold text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                        <button onClick={() => updateQtd(item.id, 1)} className="p-1 text-muted-foreground hover:text-white disabled:opacity-50" disabled={item.categoria !== 'Combo' && item.categoria !== 'Dose' && item.qtd_carrinho >= item.estoque_atual}>
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                    <button onClick={() => removeFromCart(item.id)} className="p-2 text-muted-foreground hover:text-red-400 transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="mt-auto border-t border-border pt-4">
                        <div className="flex justify-between mb-2 text-sm text-muted-foreground">
                            <span>Itens</span>
                            <span>{cart.reduce((a, b) => a + b.qtd_carrinho, 0)}</span>
                        </div>
                        <div className="flex justify-between mb-4">
                            <span className="font-bold text-lg">Total</span>
                            <span className="font-bold text-2xl text-primary">R$ {totalCart.toFixed(2)}</span>
                        </div>

                        <button
                            onClick={handleOpenPaymentModal}
                            disabled={cart.length === 0 || loading}
                            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground py-3 rounded-lg font-bold transition-all text-lg shadow-lg shadow-primary/20"
                        >
                            {loading ? 'Processando...' : 'Finalizar Venda'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-card w-full max-w-lg rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col pt-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                        <div className="px-6 pb-4 border-b border-border/50 text-center">
                            <h2 className="text-2xl font-bold tracking-tight">Pagamento</h2>
                            <p className="text-muted-foreground mt-1">Preencha os valores para cada forma de pagamento.</p>
                        </div>

                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6 bg-background/50 p-4 rounded-xl border border-border/50">
                                <div>
                                    <span className="text-sm text-muted-foreground block mb-1">Total da Venda</span>
                                    <span className="text-3xl font-black text-primary">R$ {totalCart.toFixed(2)}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-sm text-muted-foreground block mb-1">Resta Pagar</span>
                                    <span className={`text-2xl font-black ${restaPagar > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                        R$ {restaPagar.toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            <div className="mb-6 flex items-center gap-4 p-3 rounded-xl border border-orange-500/30 bg-orange-500/10 focus-within:border-orange-500/80 transition-all">
                                <div className="flex-1">
                                    <span className="text-sm font-bold text-orange-400 block mb-1">Aplicar Desconto (R$)</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={desconto}
                                        onChange={(e) => {
                                            const novoDesc = e.target.value;
                                            setDesconto(novoDesc);
                                            const numericDesc = parseFloat(novoDesc) || 0;
                                            setNovoTotal(Math.max(0, totalCart - numericDesc).toFixed(2));
                                        }}
                                        onFocus={(e) => e.target.select()}
                                        className="w-full bg-black/20 border border-white/5 rounded-lg px-4 py-3 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all text-left font-bold"
                                    />
                                </div>
                                <div className="flex-1">
                                    <span className="text-sm font-bold text-orange-400 block mb-1">Novo Total (R$)</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder={totalCart.toFixed(2)}
                                        value={novoTotal}
                                        onChange={(e) => {
                                            const resultTotal = e.target.value;
                                            setNovoTotal(resultTotal);
                                            if (resultTotal && parseFloat(resultTotal) >= 0) {
                                                const numericTotal = parseFloat(resultTotal);
                                                setDesconto((totalCart - numericTotal).toFixed(2));
                                            } else {
                                                setDesconto('');
                                            }
                                        }}
                                        onFocus={(e) => e.target.select()}
                                        className="w-full bg-black/20 border border-white/5 rounded-lg px-4 py-3 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all text-left font-bold text-white"
                                    />
                                </div>
                            </div>

                            <div className="mb-6 flex justify-between items-center bg-black/40 p-4 rounded-xl border border-white/5">
                                <span className="text-sm text-muted-foreground font-bold">Total c/ Desconto:</span>
                                <span className="text-2xl font-black text-white">R$ {totalComDesconto.toFixed(2)}</span>
                            </div>

                            <div className="space-y-3 mb-6">
                                {
                                    [
                                        { label: 'Dinheiro', icon: <Banknote size={20} className="text-green-400" />, key: 'Dinheiro' },
                                        { label: 'Cartão de Débito', icon: <CreditCard size={20} className="text-blue-400" />, key: 'Cartão de Débito' },
                                        { label: 'Cartão de Crédito', icon: <CreditCard size={20} className="text-purple-400" />, key: 'Cartão de Crédito' },
                                        { label: 'PIX', icon: <QrCode size={20} className="text-teal-400" />, key: 'PIX' },
                                    ].map(method => (
                                        <div key={method.key} className="p-3 rounded-xl border border-border/50 bg-background/30 space-y-3">
                                            <div className="flex items-center justify-between px-1">
                                                <div className="flex items-center gap-3">
                                                    {method.icon}
                                                    <span className="font-bold text-sm">{method.label}</span>
                                                </div>
                                                <button
                                                    onClick={() => setPagamentoValores(prev => ({ ...prev, [method.key]: [...prev[method.key], ''] }))}
                                                    className="p-1 hover:bg-primary/10 text-primary rounded-md transition-colors"
                                                    title="Adicionar outro lançamento"
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            </div>

                                            {pagamentoValores[method.key].map((valor, idx) => (
                                                <div key={`${method.key}-${idx}`} className="flex items-center gap-2">
                                                    <div className="flex-1 relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xs">R$</span>
                                                        <input
                                                            id={`payment-${method.key}-${idx}`}
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            placeholder="0.00"
                                                            value={valor}
                                                            onChange={(e) => handlePagamentoChange(method.key, idx, e.target.value)}
                                                            onFocus={(e) => e.target.select()}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    const methods = ['Dinheiro', 'Cartão de Débito', 'Cartão de Crédito', 'PIX'];
                                                                    const currentMethodIdx = methods.indexOf(method.key);
                                                                    if (currentMethodIdx < methods.length - 1) {
                                                                        const nextMethod = methods[currentMethodIdx + 1];
                                                                        const nextId = `payment-${nextMethod}-0`;
                                                                        document.getElementById(nextId)?.focus();
                                                                    } else {
                                                                        // Last method (PIX), maybe blur or focus confirm button
                                                                        const confirmBtn = document.getElementById('confirm-checkout-btn');
                                                                        confirmBtn?.focus();
                                                                    }
                                                                }
                                                            }}
                                                            className="w-full bg-black/20 border border-white/5 rounded-lg pl-10 pr-2 py-2.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-right font-bold text-base"
                                                        />
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <button
                                                            tabIndex={-1}
                                                            onClick={() => autoFillPayment(method.key, idx)}
                                                            disabled={restaPagar <= 0}
                                                            title="Preencher restante"
                                                            className="h-10 w-12 bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary hover:text-primary-foreground disabled:opacity-30 disabled:hover:bg-primary/10 disabled:hover:text-primary transition-all flex items-center justify-center shrink-0"
                                                        >
                                                            <span className="font-black text-[10px]">MAX</span>
                                                        </button>
                                                        {idx > 0 && (
                                                            <button
                                                                onClick={() => setPagamentoValores(prev => ({
                                                                    ...prev,
                                                                    [method.key]: prev[method.key].filter((_, i) => i !== idx)
                                                                }))}
                                                                className="h-10 w-10 flex items-center justify-center bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg hover:bg-red-500 hover:text-white transition-all shrink-0"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ))
                                }
                            </div>

                            {troco > 0 && (
                                <div className="mb-6 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 flex justify-between items-center zoom-in-95 animate-in duration-300">
                                    <span className="text-sm font-bold text-orange-400">Troco Previsto:</span>
                                    <span className="text-2xl font-black text-orange-400">R$ {troco.toFixed(2)}</span>
                                </div>
                            )}

                            <div className="flex gap-3 mt-4">
                                <button
                                    onClick={() => setShowPaymentModal(false)}
                                    className="flex-1 px-4 py-4 rounded-xl border border-border/50 font-bold hover:bg-white/5 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    id="confirm-checkout-btn"
                                    onClick={confirmCheckout}
                                    disabled={valorPagoTotal < totalComDesconto}
                                    className="flex-1 px-4 py-4 rounded-xl bg-primary text-primary-foreground font-black hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Confirmar Venda
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Combo Selection Modal */}
            {showComboModal && activeCombo && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="glass-panel w-full max-w-xl rounded-2xl border border-primary/30 shadow-2xl overflow-hidden flex flex-col p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-2xl font-black text-white tracking-tight">Configurar {activeCombo.nome}</h2>
                                <p className="text-muted-foreground text-sm">Escolha os itens para cada requisito.</p>
                            </div>
                            <div className="text-right">
                                <span className="text-xs text-muted-foreground block uppercase font-bold tracking-widest">Preço</span>
                                <span className="text-xl font-bold text-primary italic">R$ {calculateComboPrice().toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                            {tempSelections.map((s, sIdx) => {
                                const req = allReqs.find(r => r.combo_id === activeCombo.id && r.categoria_nome === s.requirement_name);
                                const isDoseGroup = allDoses.some(d => d.produto_dose_id === activeCombo.id && (d.grupo_nome || 'Opção Única') === s.requirement_name);
                                
                                const currentSum = s.items.reduce((acc, curr) => acc + curr.quantidade, 0);
                                const targetQty = req ? req.quantidade : 1;
                                const isSatisfied = req ? currentSum >= req.quantidade : currentSum === 1;

                                return (
                                    <div key={sIdx} className="bg-background/50 p-4 rounded-xl border border-white/5 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <h3 className="font-bold text-white flex items-center gap-2">
                                                <span className="w-2 h-4 bg-primary rounded-full shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
                                                {isDoseGroup ? `Escolha: ${s.requirement_name}` : `Min. ${targetQty}x ${s.requirement_name}`}
                                            </h3>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs font-bold ${currentSum > targetQty && !isDoseGroup ? 'text-red-400' : isSatisfied ? 'text-green-400' : 'text-primary'}`}>
                                                    {currentSum} / {targetQty}
                                                </span>
                                                {isSatisfied && (
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter ${currentSum > targetQty && !isDoseGroup ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                                        {currentSum > targetQty && !isDoseGroup ? 'Excedeu' : 'Ok'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            {s.items.map((item, idx) => {
                                                const product = produtos.find(p => p.id === item.product_id);
                                                const itemPrice = isDoseGroup ? 0 : (product ? ((product.preco_combo ?? 0) > 0 ? (product.preco_combo ?? 0) : 0) : 0);
                                                
                                                return (
                                                    <div key={idx} className="flex justify-between items-center bg-black/40 px-3 py-2 rounded-lg border border-white/5">
                                                        <div className="flex flex-col min-w-0 flex-1">
                                                            <span className="text-sm font-medium text-white/90 truncate mr-2">{product?.nome}</span>
                                                            <span className={`text-[10px] font-bold ${itemPrice > 0 ? 'text-primary' : 'text-green-400'}`}>
                                                                {itemPrice > 0 ? `+ R$ ${itemPrice.toFixed(2)}` : 'Incluso'}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1 bg-black/50 rounded-lg p-1 border border-white/5 shrink-0 ml-2">
                                                            <button 
                                                                onClick={() => {
                                                                    setTempSelections(prev => prev.map((sel, i) => i === sIdx ? { ...sel, items: sel.items.map(it => it.product_id === item.product_id ? { ...it, quantidade: it.quantidade - 1 } : it).filter(it => it.quantidade > 0) } : sel));
                                                                }} 
                                                                className="p-1.5 hover:bg-white/10 hover:text-white text-muted-foreground rounded-md transition-colors"
                                                            >
                                                                {item.quantidade <= 1 ? <Trash2 size={12} className="text-red-400" /> : <Minus size={12}/>}
                                                            </button>
                                                            <span className="text-xs font-bold w-6 text-center text-white">{item.quantidade}</span>
                                                            <button 
                                                                onClick={() => {
                                                                    if (isDoseGroup && currentSum >= 1) {
                                                                        toast.error('Escolha apenas 1 para este grupo.');
                                                                        return;
                                                                    }
                                                                    if (product && item.quantidade < product.estoque_atual) {
                                                                        setTempSelections(prev => prev.map((sel, i) => i === sIdx ? { ...sel, items: sel.items.map(it => it.product_id === item.product_id ? { ...it, quantidade: it.quantidade + 1 } : it) } : sel));
                                                                    } else {
                                                                        toast.error('Estoque insuficiente.');
                                                                    }
                                                                }} 
                                                                className="p-1.5 hover:bg-white/10 hover:text-white text-muted-foreground rounded-md transition-colors"
                                                            >
                                                                <Plus size={12}/>
                                                            </button>
                                                        </div>
                                                    </div>
                                                )
                                            })}

                                            {(!isDoseGroup || s.items.length === 0) && (
                                                <CustomSelect
                                                    value=""
                                                    onChange={(newId) => {
                                                        if (isDoseGroup) {
                                                            setTempSelections(prev => prev.map((sel, i) => i === sIdx ? { ...sel, items: [{ product_id: newId, quantidade: 1 }] } : sel));
                                                        } else {
                                                            setTempSelections(prev => prev.map((sel, i) => i === sIdx ? { ...sel, items: [...sel.items, { product_id: newId, quantidade: 1 }] } : sel));
                                                        }
                                                    }}
                                                    placeholder={isDoseGroup ? `Selecione (${s.requirement_name})...` : "Adicionar extra..."}
                                                    options={
                                                        isDoseGroup 
                                                        ? allDoses.filter(d => d.produto_dose_id === activeCombo.id && (d.grupo_nome || 'Opção Única') === s.requirement_name).map(d => {
                                                            const p = produtos.find(x => x.id === d.produto_garrafa_id);
                                                            return { value: p?.id || '', label: p?.nome || '???' };
                                                        })
                                                        : produtos.filter(p => p.categoria === s.requirement_name && getDisplayEstoque(p) > 0 && !s.items.some(i => i.product_id === p.id)).map(p => {
                                                            const price = (p.preco_combo && p.preco_combo > 0) ? p.preco_combo : 0;
                                                            return { value: p.id, label: `${p.nome}${price > 0 ? ` (+ R$ ${price.toFixed(2)})` : ' (Incluso)'}` };
                                                        })
                                                    }
                                                />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {allFixos.filter(f => f.combo_id === activeCombo.id).length > 0 && (
                                <div className="opacity-60 grayscale-[0.5]">
                                    <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3 ml-1">Itens Fixos Inclusos:</h4>
                                    <div className="grid grid-cols-1 gap-2">
                                        {allFixos.filter(f => f.combo_id === activeCombo.id).map(f => {
                                            const p = produtos.find(x => x.id === f.produto_id);
                                            return (
                                                <div key={f.produto_id} className="flex justify-between items-center bg-white/5 px-4 py-2 rounded-lg text-sm border border-white/5">
                                                    <span className="text-muted-foreground truncate">{p?.nome || 'Item Fixo'}</span>
                                                    <span className="font-bold text-white">{f.quantidade}x</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={() => {
                                    setShowComboModal(false);
                                    setActiveCombo(null);
                                    setTempSelections([]);
                                }}
                                className="flex-1 px-6 py-4 rounded-xl border border-white/10 font-bold hover:bg-white/5 transition-all text-muted-foreground uppercase text-xs tracking-widest"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={addComboToCart}
                                className="flex-[2] px-6 py-4 rounded-xl bg-primary text-primary-foreground font-black hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 uppercase text-sm tracking-widest"
                            >
                                Adicionar ao Carrinho
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Receipt Modal */}
            {showReceiptModal && lastSaleData && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white text-zinc-900 w-full max-w-[380px] rounded-sm shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
                        {/* Actions Header (Not part of receipt) */}
                        <div className="bg-zinc-100 flex justify-between items-center px-4 py-2 border-b border-zinc-200">
                            <span className="text-zinc-500 font-bold text-[10px] uppercase tracking-widest flex items-center gap-1">
                                <Printer size={12} /> Preview do Recibo
                            </span>
                            <button 
                                onClick={() => setShowReceiptModal(false)}
                                className="text-zinc-400 hover:text-zinc-900 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Thermal Receipt Content */}
                        <div className="p-8 font-mono text-[11px] leading-tight overflow-y-auto max-h-[70vh]">
                            <div className="text-center space-y-1 mb-6">
                                <h2 className="text-sm font-bold uppercase">Adega do Guelao</h2>
                                <p className="uppercase">Acacio Batista</p>
                                <p>Nº 71</p>
                            </div>

                            <div className="border-b border-dashed border-zinc-400 py-2 mb-4">
                                <p className="text-center font-bold mb-2 uppercase">Recibo de Venda</p>
                                <div className="space-y-0.5">
                                    <p>CONTROLE: {lastSaleData.data.getTime()}</p>
                                    <p>D: {lastSaleData.data.toLocaleDateString('pt-BR')} H: {lastSaleData.data.toLocaleTimeString('pt-BR')}</p>
                                    <p>TE/TU: 01/1</p>
                                    <p className="uppercase">VENDEDOR(A): {lastSaleData.vendedor}</p>
                                </div>
                            </div>

                            <div className="mb-4">
                                <p className="text-center font-bold mb-2">** ITENS VENDIDOS **</p>
                                <div className="flex justify-between font-bold mb-1 border-b border-zinc-200 pb-1">
                                    <span>QTD x VR.UNIT.</span>
                                    <span>VR.TOTAL</span>
                                </div>
                                <div className="space-y-3 pt-2">
                                    {lastSaleData.items.map((item, idx) => (
                                        <div key={idx} className="space-y-0.5">
                                            <p className="uppercase font-bold">{item.nome}</p>
                                            <div className="flex justify-between">
                                                <span>{item.qtd_carrinho} UN x {item.preco_venda.toFixed(2)}</span>
                                                <span>{(item.qtd_carrinho * item.preco_venda).toFixed(2)}</span>
                                            </div>
                                            {/* Combo Sub-items */}
                                            {item.combo_selections && item.combo_selections.length > 0 && (
                                                <div className="pl-2 mt-1 opacity-70 border-l border-zinc-300 ml-1">
                                                    {Object.entries(
                                                        item.combo_selections.reduce((acc, sel) => {
                                                            const name = sel.selected_product_name || (produtos.find(p => p.id === sel.selected_product_id)?.nome) || 'Item do Combo';
                                                            acc[name] = (acc[name] || 0) + 1;
                                                            return acc;
                                                        }, {} as Record<string, number>)
                                                    ).map(([name, count]) => (
                                                        <p key={name} className="text-[10px] italic">- {count * item.qtd_carrinho}x {name}</p>
                                                    ))}
                                                </div>
                                            )}
                                            {/* Fixed Items */}
                                            {allFixos.some(f => f.combo_id === item.id) && (
                                                <div className="pl-2 opacity-70 border-l border-zinc-300 ml-1">
                                                    {allFixos.filter(f => f.combo_id === item.id).map(f => {
                                                        const prod = produtos.find(p => p.id === f.produto_id);
                                                        return <p key={f.id} className="text-[10px] italic">- {(f.quantidade * item.qtd_carrinho)}x {prod?.nome || 'Item Fixo'}</p>
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="border-t border-dashed border-zinc-400 pt-2 mt-4 space-y-1">
                                <div className="flex justify-between">
                                    <span>ITENS: {lastSaleData.items.reduce((a, b) => a + b.qtd_carrinho, 0)}</span>
                                    <span>SUB-TOTAL: { (lastSaleData.total + lastSaleData.desconto).toFixed(2) }</span>
                                </div>
                                {lastSaleData.desconto > 0 && (
                                    <div className="flex justify-between">
                                        <span>DESCONTO:</span>
                                        <span>- {lastSaleData.desconto.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between font-bold text-[13px] pt-1">
                                    <span>TOTAL: R$</span>
                                    <span>{lastSaleData.total.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between pt-1">
                                    <span className="uppercase">PG. {lastSaleData.metodo}: R$</span>
                                    <span>{lastSaleData.pago.toFixed(2)}</span>
                                </div>
                                {lastSaleData.troco > 0 && (
                                    <div className="flex justify-between font-bold">
                                        <span>TROCO: R$</span>
                                        <span>{lastSaleData.troco.toFixed(2)}</span>
                                    </div>
                                )}
                            </div>

                            <div className="mt-10 text-center uppercase space-y-1 opacity-60">
                                <p>Obrigado pela preferência!</p>
                                <p>Volte Sempre</p>
                            </div>
                        </div>

                        {/* Footer Buttons */}
                        <div className="p-4 bg-zinc-50 flex gap-2 border-t border-zinc-200">
                            <button 
                                onClick={() => setShowReceiptModal(false)}
                                className="flex-1 bg-zinc-900 text-white font-bold py-3 rounded flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all uppercase text-xs tracking-widest"
                            >
                                <CheckCircle2 size={16} /> Concluir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    )
}
