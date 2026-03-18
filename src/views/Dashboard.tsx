import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { ShoppingCart, Calendar, CreditCard, Award } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { animate } from 'framer-motion';

function getCachedDashData() {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    let vendas = 0;
    let lucro = 0;
    let estoque = 0;
    let history: any[] = [];
    let payment: any[] = [];
    let top: any[] = [];

    try {
        const localVendas = localStorage.getItem('@adegadosmulekes:dash_vendas');
        if (localVendas) {
            const parsed = JSON.parse(localVendas);
            if (new Date(parsed.date).toDateString() === hoje.toDateString()) {
                vendas = parsed.tVendas || 0;
                lucro = parsed.tLucro || 0;
            }
        }
        const localEstoque = localStorage.getItem('@adegadosmulekes:dash_estoque');
        if (localEstoque) estoque = Number(localEstoque) || 0;

        const localAnalytics = localStorage.getItem('@adegadosmulekes:dash_analytics');
        if (localAnalytics) {
            const parsed = JSON.parse(localAnalytics);
            history = parsed.history || [];
            payment = parsed.payment || [];
            top = parsed.top || [];
        }
    } catch (e) { }

    return { vendas, lucro, estoque, history, payment, top };
}

function AnimatedNumber({ value, isCurrency = false }: { value: number, isCurrency?: boolean }) {
    const nodeRef = useRef<HTMLSpanElement>(null);
    const prevValue = useRef(value);

    useEffect(() => {
        const node = nodeRef.current;
        if (!node) return;

        if (prevValue.current !== value) {
            const controls = animate(prevValue.current, value, {
                duration: 1,
                ease: "easeOut",
                onUpdate(currentValue) {
                    node.textContent = isCurrency ? currentValue.toFixed(2) : Math.round(currentValue).toString();
                }
            });
            prevValue.current = value;
            return () => controls.stop();
        }
    }, [value, isCurrency]);

    return <span ref={nodeRef}>{isCurrency ? prevValue.current.toFixed(2) : prevValue.current}</span>;
}

export function Dashboard() {
    const cached = getCachedDashData();
    const [vendasHoje, setVendasHoje] = useState(cached.vendas);
    const [lucroHoje, setLucroHoje] = useState(cached.lucro);
    const [estoqueBaixo, setEstoqueBaixo] = useState(cached.estoque);
    const [loading, setLoading] = useState(cached.vendas === 0 && cached.history.length === 0);

    // Analytics Data
    const [salesHistory, setSalesHistory] = useState<any[]>(cached.history);
    const [paymentMethods, setPaymentMethods] = useState<any[]>(cached.payment);
    const [topProducts, setTopProducts] = useState<any[]>(cached.top);

    const PIE_COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];

    useEffect(() => {
        async function loadDashboard() {
            setLoading(true);

            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            const dataIsoString = hoje.toISOString();

            try {
                // 1. Fetch Sales Today
                const { data: vendas, error: errVendas } = await supabase
                    .from('vendas')
                    .select('total, lucro_total')
                    .gte('created_at', dataIsoString);

                if (vendas && !errVendas) {
                    const tVendas = vendas.reduce((acc, v) => acc + Number(v.total), 0);
                    const tLucro = vendas.reduce((acc, v) => acc + Number(v.lucro_total), 0);
                    setVendasHoje(tVendas);
                    setLucroHoje(tLucro);
                    localStorage.setItem('@adegadosmulekes:dash_vendas', JSON.stringify({ tVendas, tLucro, date: hoje.getTime() }));
                }

                // 2. Fetch Low Stock using dynamic view
                const { count, error: errCount } = await supabase
                    .from('produtos_criticos')
                    .select('*', { count: 'exact', head: true });

                if (count !== null && !errCount) {
                    setEstoqueBaixo(count);
                    localStorage.setItem('@adegadosmulekes:dash_estoque', count.toString());
                }

                if (navigator.onLine) {
                    // --- Analytics ---
                    let newHist = cached.history;
                    let newPay = cached.payment;

                    // A. Sales History (Last 7 Days)
                    const sevenDaysAgo = new Date();
                    sevenDaysAgo.setDate(hoje.getDate() - 6);
                    sevenDaysAgo.setHours(0, 0, 0, 0);

                    const { data: histData } = await supabase
                        .from('vendas')
                        .select('created_at, total')
                        .gte('created_at', sevenDaysAgo.toISOString())
                        .order('created_at', { ascending: true });

                    if (histData) {
                        const grouped = histData.reduce((acc: any, curr: any) => {
                            // Format to 'DD/MM' short string
                            const dateObj = new Date(curr.created_at);
                            const dayMonth = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}`;

                            if (!acc[dayMonth]) acc[dayMonth] = 0;
                            acc[dayMonth] += Number(curr.total);
                            return acc;
                        }, {});

                        const finalHist = Object.keys(grouped).map(k => ({ date: k, total: grouped[k] }));
                        newHist = finalHist;
                        setSalesHistory(finalHist);
                    }

                    // B. Payment Methods Distribution (All time / Recent)
                    const { data: payData } = await supabase
                        .from('vendas')
                        .select('tipo_pagamento, total');

                    if (payData) {
                        const groupedPay = payData.reduce((acc: any, curr: any) => {
                            const methodsStr = (curr.tipo_pagamento || 'Outro').trim();
                            // Handle split multiple payments "Dinheiro (R$ 10.00) + PIX (R$ 5.00)"
                            const methodParts = methodsStr.includes('+') ? methodsStr.split('+') : [methodsStr];

                            methodParts.forEach((part: string) => {
                                let method = part.trim();
                                let amount = Number(curr.total); // default if it's not a multi-payment string

                                if (method.includes('(R$')) {
                                    const match = method.match(/(.*?)\s*\(R\$\s*([\d.]+)\)/);
                                    if (match) {
                                        method = match[1].trim();
                                        amount = parseFloat(match[2]);
                                    }
                                }

                                const lowerMethod = method.toLowerCase();
                                if (lowerMethod === 'dinheiro') method = 'Dinheiro';
                                else if (lowerMethod === 'pix') method = 'PIX';
                                else if (lowerMethod === 'cartão de crédito' || lowerMethod === 'cartao de credito' || lowerMethod === 'cart. crédito') method = 'Cartão de Crédito';
                                else if (lowerMethod === 'cartão de débito' || lowerMethod === 'cartao de debito' || lowerMethod === 'cart. débito') method = 'Cartão de Débito';
                                else if (!method) method = 'Outro';

                                if (!acc[method]) acc[method] = 0;
                                acc[method] += amount;
                            });

                            return acc;
                        }, {});

                        const finalPay = Object.keys(groupedPay).map(k => ({ name: k, value: groupedPay[k] }));
                        // Sort so colors map nicely
                        finalPay.sort((a, b) => b.value - a.value);
                        newPay = finalPay;
                        setPaymentMethods(finalPay);
                    }

                    // C. Top Products View (Created in V5)
                    const { data: topProd } = await supabase
                        .from('view_top_produtos')
                        .select('*')
                        .limit(5);

                    if (topProd) setTopProducts(topProd);

                    if (histData || payData || topProd) {
                        localStorage.setItem('@adegadosmulekes:dash_analytics', JSON.stringify({
                            history: newHist,
                            payment: newPay,
                            top: topProd || cached.top
                        }));
                    }
                }
            } catch (e) {
                console.error("Dashboard error:", e);
                // Fallbacks
            } finally {
                // If offline and we had nothing in the cache initially, the loading spinner would stay forever.
                setLoading(false);
            }
        }

        loadDashboard();

        // Realtime Subscription for Live Updates
        const salesSubscription = supabase
            .channel('dashboard-sales-updates')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'vendas' },
                () => {
                    if (navigator.onLine) {
                        console.log('Nova venda detectada no banco, atualizando Dashboard...');
                        loadDashboard();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(salesSubscription);
        };
    }, []);

    return (
        <div className="animate-in fade-in duration-500 h-full flex flex-col">
            <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground mt-1">Visão geral do seu negócio.</p>
                </div>
                <Link to="/pdv" className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 shrink-0">
                    <ShoppingCart size={20} />
                    Ir para o PDV
                </Link>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="glass p-6 rounded-xl border-l-4 border-l-primary hover:bg-card/80 transition-all cursor-default">
                    <h3 className="text-sm font-medium text-muted-foreground">Vendas Hoje</h3>
                    <p className="text-3xl font-bold mt-2">R$ <AnimatedNumber value={vendasHoje} isCurrency /></p>
                </div>
                <div className="glass p-6 rounded-xl border-l-4 border-l-green-500 hover:bg-card/80 transition-all cursor-default">
                    <h3 className="text-sm font-medium text-muted-foreground">Lucro Hoje</h3>
                    <p className="text-3xl font-bold mt-2 text-green-500">R$ <AnimatedNumber value={lucroHoje} isCurrency /></p>
                </div>
                <Link to="/estoque?filter=critico" className="glass p-6 rounded-xl border-l-4 border-l-red-500 hover:bg-card/80 transition-all cursor-pointer relative overflow-hidden block">
                    <h3 className="text-sm font-medium text-muted-foreground">Estoque Crítico (≤ 5)</h3>
                    <p className="text-3xl font-bold mt-2 text-red-500"><AnimatedNumber value={estoqueBaixo} /> <span className="text-lg">Itens</span></p>
                    {estoqueBaixo > 0 && <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/10 rounded-bl-full flex items-center justify-center pointer-events-none" />}
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0 pb-6 overflow-y-auto pr-2">

                {/* Main Area Chart: Weekly Sales */}
                <div className="glass p-6 rounded-xl col-span-1 lg:col-span-2 flex flex-col min-h-[300px] shrink-0">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Calendar size={18} className="text-primary" /> Faturamento (Últimos 7 Dias)
                    </h3>

                    <div className="flex-1 w-full relative">
                        {loading ? (
                            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground"><div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" /></div>
                        ) : salesHistory.length === 0 ? (
                            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground italic text-sm">Dados insuficientes para gerar o gráfico temporal.</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={salesHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value}`} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#09090b', borderColor: '#333', borderRadius: '8px' }}
                                        itemStyle={{ color: '#f59e0b', fontWeight: 'bold' }}
                                        formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, 'Receita']}
                                    />
                                    <Area type="monotone" dataKey="total" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-6 lg:min-h-0">
                    {/* Pie Chart: Payment Methods */}
                    <div className="glass p-6 rounded-xl flex flex-col min-h-[250px] shrink-0">
                        <h3 className="text-sm font-bold mb-2 flex items-center gap-2 text-muted-foreground">
                            <CreditCard size={16} /> Meios de Pagamento
                        </h3>
                        <div className="flex-1 w-full relative">
                            {loading ? (
                                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground shrink-0"><div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" /></div>
                            ) : paymentMethods.length === 0 ? (
                                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground italic text-xs">Sem transações</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={paymentMethods}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius="55%"
                                            outerRadius="85%"
                                            paddingAngle={5}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {paymentMethods.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#09090b', borderColor: '#333', borderRadius: '8px' }}
                                            itemStyle={{ color: '#e4e4e7', fontWeight: 'bold' }}
                                            formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, 'Transacionado']}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                        {/* Custom Legend */}
                        <div className="flex flex-wrap gap-2 mt-4 justify-center">
                            {paymentMethods.map((entry, index) => (
                                <div key={`legend-${index}`} className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}></div>
                                    {entry.name}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Top Products Rank */}
                    <div className="glass p-6 rounded-xl flex-1 flex flex-col min-h-[250px] shrink-0">
                        <h3 className="text-sm font-bold mb-4 flex items-center gap-2 text-muted-foreground">
                            <Award size={16} /> Produtos Mais Vendidos
                        </h3>
                        <div className="flex-1 overflow-y-auto space-y-3">
                            {loading ? (
                                <div className="space-y-3">
                                    {[...Array(3)].map((_, i) => <div key={i} className="animate-pulse bg-white/5 h-10 w-full rounded"></div>)}
                                </div>
                            ) : topProducts.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-muted-foreground italic text-xs">Nenhuma venda registrada ainda.</div>
                            ) : (
                                topProducts.map((p, i) => (
                                    <div key={p.produto_id} className="flex items-center justify-between p-2 rounded-lg bg-card/50 border border-border/30">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-black shrink-0">
                                                {i + 1}
                                            </div>
                                            <div className="truncate">
                                                <p className="text-sm font-bold truncate leading-tight">{p.produto_nome}</p>
                                                <p className="text-[10px] text-muted-foreground uppercase">{p.categoria}</p>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-xs font-bold text-primary">{p.total_vendido} un</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
