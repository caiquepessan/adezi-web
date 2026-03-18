import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { Filter, ReceiptText, ChevronDown, ChevronUp, Trash2, AlertTriangle, Package, Download, Calculator, FileText } from 'lucide-react';
import { CustomSelect } from '../components/ui/CustomSelect';
import { CustomDatePicker } from '../components/ui/CustomDatePicker';
import { CustomCheckbox } from '../components/ui/CustomCheckbox';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface Venda {
    id: string;
    created_at: string;
    total: number;
    lucro_total: number;
    tipo_pagamento: string;
}

interface ItemVenda {
    id: string;
    quantidade: number;
    preco_unitario: number;
    produto_id: string; // Added to help matching fixed items
    combo_selections?: {
        requirement_name: string;
        selected_product_id: string;
        selected_product_name: string;
    }[];
    produtos: {
        nome: string;
    };
}

export function HistoricoVendas() {
    const { isOnline } = useOnlineStatus();
    const { hasPermission } = useAuth();
    const canVerFaturamento = hasPermission('ver_faturamento');
    const canExcluirVendas = hasPermission('vendas_excluir');

    const [vendas, setVendas] = useState<Venda[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [dataInicio, setDataInicio] = useState('');
    const [dataFim, setDataFim] = useState('');
    const [tipoPagamento, setTipoPagamento] = useState('todos');

    // Expanded details
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [itensExpandidos, setItensExpandidos] = useState<ItemVenda[]>([]);
    const [loadingItens, setLoadingItens] = useState(false);

    // Delete Modal State
    const [saleToDelete, setSaleToDelete] = useState<Venda | null>(null);
    const [restockItems, setRestockItems] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);

    // Fechar Caixa State
    const [isCloseRegisterModalOpen, setIsCloseRegisterModalOpen] = useState(false);
    const [closeRegisterLoading, setCloseRegisterLoading] = useState(false);
    const [topItems, setTopItems] = useState<{nome: string, quantidade: number, total: number}[]>([]);
    const [exportFormat, setExportFormat] = useState('pdf');

    // Totals calculations (memoized generally, but we keep it here as before, moved up slightly so we can use it in Export)
    const totaisCalculados = vendas.reduce((acc, v) => ({
        total: acc.total + Number(v.total),
        lucro: acc.lucro + Number(v.lucro_total)
    }), { total: 0, lucro: 0 });

    useEffect(() => {
        // Set default dates (last 30 days) if empty on initial load, or just today?
        // Let's do today by default to not overwhelm
        const hoje = new Date();
        const hojeStr = format(hoje, 'yyyy-MM-dd');
        if (!dataInicio) setDataInicio(hojeStr);
        if (!dataFim) setDataFim(hojeStr);
    }, []);

    const fetchVendas = async () => {
        if (!isOnline) return;
        setLoading(true);

        try {
            let query = supabase
                .from('vendas')
                .select('*')
                .order('created_at', { ascending: false });

            if (dataInicio) {
                // Parse YYYY-MM-DD as local date to prevent timezone shift from UTC parsing
                const [y, m, d] = dataInicio.split('-').map(Number);
                const start = new Date(y, m - 1, d, 0, 0, 0, 0);
                query = query.gte('created_at', start.toISOString());
            }

            if (dataFim) {
                const [y, m, d] = dataFim.split('-').map(Number);
                const end = new Date(y, m - 1, d, 23, 59, 59, 999);
                query = query.lte('created_at', end.toISOString());
            }

            if (tipoPagamento !== 'todos') {
                if (tipoPagamento === 'cartao') {
                    query = query.ilike('tipo_pagamento', '%cart%');
                } else if (tipoPagamento === 'multiplo') {
                    query = query.like('tipo_pagamento', '%+%');
                } else {
                    query = query.ilike('tipo_pagamento', `%${tipoPagamento}%`);
                }
            }

            const { data, error } = await query;

            if (!error && data) {
                setVendas(data);
            }
        } catch (error) {
            console.error('Error fetching sales:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (dataInicio && dataFim) {
            fetchVendas();
        }
    }, [dataInicio, dataFim, tipoPagamento, isOnline]);

    const toggleDetails = async (vendaId: string) => {
        if (expandedId === vendaId) {
            setExpandedId(null);
            return;
        }

        setExpandedId(vendaId);
        setLoadingItens(true);
        setItensExpandidos([]);

        try {
            const { data, error } = await supabase
                .from('itens_venda')
                .select(`
          id,
          quantidade,
          preco_unitario,
          produto_id,
          combo_selections,
          produtos ( nome )
        `)
                .eq('venda_id', vendaId);

            if (!error && data) {
                // Cast as any because PostgREST types might nest it weirdly
                setItensExpandidos(data as any);
            }
        } catch (err) {
            console.error('Error fetching details', err);
        } finally {
            setLoadingItens(false);
        }
    };

    const confirmDelete = async () => {
        if (!saleToDelete) return;
        setIsDeleting(true);

        try {
            if (restockItems) {
                // Fetch items to restock
                const { data: items } = await supabase
                    .from('itens_venda')
                    .select('produto_id, quantidade')
                    .eq('venda_id', saleToDelete.id);

                if (items && items.length > 0) {
                    for (const item of items) {
                        // We must fetch current stock and increment.
                        const { data: prodData } = await supabase
                            .from('produtos')
                            .select('estoque_atual')
                            .eq('id', item.produto_id)
                            .single();

                        if (prodData) {
                            await supabase
                                .from('produtos')
                                .update({ estoque_atual: prodData.estoque_atual + item.quantidade })
                                .eq('id', item.produto_id);
                        }
                    }
                }
            }

            // Excluir a venda (Itens should cascade if setup correctly, but let's be safe and rely on cascade, or we can just delete venda directly)
            // Supabase defaults to ON DELETE CASCADE for foreign keys usually in its templates, but we delete just venda.
            const { error } = await supabase.from('vendas').delete().eq('id', saleToDelete.id);

            if (error) throw error;

            toast.success(restockItems ? 'Venda desfeita e produtos devolvidos ao estoque!' : 'Registro de venda excluído permanentemente.');
            fetchVendas();
            setSaleToDelete(null);
            if (expandedId === saleToDelete.id) setExpandedId(null);

        } catch (err: any) {
            console.error('Error deleting sale:', err);
            toast.error(err.message || 'Erro ao excluir a venda.');
        } finally {
            setIsDeleting(false);
        }
    };

    const formatCurrency = (val: number) => `R$ ${Number(val).toFixed(2).replace('.', ',')}`;

    const handleOpenCloseRegister = async () => {
        setIsCloseRegisterModalOpen(true);
        setCloseRegisterLoading(true);
        setTopItems([]);
        
        try {
            if (vendas.length === 0) return;
            
            const { data, error } = await supabase
                .from('itens_venda')
                .select(`
                    quantidade,
                    preco_unitario,
                    produtos ( nome )
                `)
                .in('venda_id', vendas.map(v => v.id));
            
            if (data && !error) {
                const itemMap: Record<string, {quantidade: number, total: number}> = {};
                data.forEach((item: any) => {
                    const nome = item.produtos?.nome || 'Desconhecido';
                    if (!itemMap[nome]) itemMap[nome] = { quantidade: 0, total: 0 };
                    itemMap[nome].quantidade += item.quantidade;
                    itemMap[nome].total += item.quantidade * item.preco_unitario;
                });
                
                const sorted = Object.entries(itemMap)
                    .map(([nome, stats]) => ({ nome, ...stats }))
                    .sort((a, b) => b.quantidade - a.quantidade)
                    .slice(0, 5); // top 5
                setTopItems(sorted);
            }
        } catch(e) {
            console.error('Error fetching close register report:', e);
        } finally {
            setCloseRegisterLoading(false);
        }
    };

    const handleExport = () => {
        if (vendas.length === 0) {
            toast.error('Não há vendas para exportar.');
            return;
        }

        const filename = `historico_vendas_${dataInicio}_a_${dataFim}`;

        if (exportFormat === 'json') {
            const content = JSON.stringify({
                resumo: {
                    periodo: `${dataInicio} a ${dataFim}`,
                    quantidade_vendas: vendas.length,
                    total_faturado: totaisCalculados.total,
                    lucro_estimado: totaisCalculados.lucro
                },
                vendas
            }, null, 2);
            
            const blob = new Blob([content], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
        } else if (exportFormat === 'xlsx') {
            const data = vendas.map(v => ({
                Data: format(new Date(v.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
                Pagamento: v.tipo_pagamento,
                Total: v.total,
                Lucro: v.lucro_total
            }));
            
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Vendas");
            XLSX.writeFile(wb, `${filename}.xlsx`);
            
        } else if (exportFormat === 'pdf') {
            const doc = new jsPDF();
            
            doc.text(`Histórico de Vendas`, 14, 15);
            doc.setFontSize(10);
            doc.text(`Período: ${dataInicio} a ${dataFim}`, 14, 22);
            doc.text(`Total: R$ ${totaisCalculados.total.toFixed(2)} | Lucro: R$ ${totaisCalculados.lucro.toFixed(2)}`, 14, 28);

            const tableColumn = ["Data", "Pagamento", "Total", "Lucro"];
            const tableRows = vendas.map(v => [
                format(new Date(v.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
                v.tipo_pagamento,
                `R$ ${Number(v.total).toFixed(2)}`,
                `R$ ${Number(v.lucro_total).toFixed(2)}`
            ]);

            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 35,
            });

            doc.save(`${filename}.pdf`);
            
        } else if (exportFormat === 'md') {
            let content = `# Histórico de Vendas (${dataInicio} a ${dataFim})\n\n`;
            content += `**Resumo**\n\n`;
            content += `- Volume Vendas: ${vendas.length}\n`;
            content += `- Total Faturado: R$ ${totaisCalculados.total.toFixed(2)}\n`;
            content += `- Lucro: R$ ${totaisCalculados.lucro.toFixed(2)}\n\n`;
            
            content += `| Data | Pagamento | Total | Lucro |\n`;
            content += `|---|---|---|---|\n`;
            
            vendas.forEach(v => {
                const d = format(new Date(v.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR });
                content += `| ${d} | ${v.tipo_pagamento} | R$ ${Number(v.total).toFixed(2)} | R$ ${Number(v.lucro_total).toFixed(2)} |\n`;
            });

            const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}.md`;
            a.click();
            URL.revokeObjectURL(url);
        } else if (exportFormat === 'csv') {
             let content = 'Data,Pagamento,Total,Lucro\n';
            vendas.forEach(v => {
                const d = format(new Date(v.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR });
                content += `${d},${v.tipo_pagamento},${v.total},${v.lucro_total}\n`;
            });
            const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        }

        toast.success(`Arquivo exportado como .${exportFormat}`);
    };

    const renderBadgeItem = (methodText: string, idx: number = 0) => {
        let cleanMethod = methodText.trim();
        // Extract base payment method if formatted as "Dinheiro (R$ 10.00)"
        if (cleanMethod.includes('(')) {
            cleanMethod = cleanMethod.split('(')[0].trim();
        }

        const methods: Record<string, { bg: string, text: string, label: string }> = {
            'pix': { bg: 'bg-teal-500/20', text: 'text-teal-400', label: 'PIX' },
            'dinheiro': { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Dinheiro' },
            'cartão de crédito': { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Cart. Crédito' },
            'cartão de débito': { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Cart. Débito' },
            'cartao': { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Cartão' }
        };

        const config = methods[cleanMethod.toLowerCase()] || { bg: 'bg-gray-500/20', text: 'text-gray-400', label: cleanMethod };

        // For multiple payments, we show the full text to denote the amount, e.g. "Dinheiro (R$ 5.00)"
        const displayLabel = methodText.includes('(') ? methodText.trim() : config.label;

        return (
            <span key={idx} className={`${config.bg} ${config.text} px-2 py-1 rounded-md text-[10px] md:text-xs font-bold uppercase whitespace-nowrap`}>
                {displayLabel}
            </span>
        );
    };

    const renderPaymentBadge = (method: string) => {
        if (!method) return renderBadgeItem('Outro');

        if (method.includes('+')) {
            return (
                <span className={`bg-purple-500/20 text-purple-400 px-2 py-1 rounded-md text-[10px] md:text-xs font-bold uppercase whitespace-nowrap`}>
                    Múltiplo
                </span>
            );
        }

        return renderBadgeItem(method);
    };

    return (
        <div className="animate-in fade-in duration-500 h-full flex flex-col">
            <header className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Histórico de Vendas</h1>
                <p className="text-muted-foreground mt-1">Consulte e filtre todas as vendas realizadas.</p>
            </header>

            {/* Filters */}
            <div className="glass p-4 rounded-xl mb-6 flex flex-wrap gap-4 items-end relative z-50">
                <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data Início</label>
                    <CustomDatePicker
                        value={dataInicio}
                        onChange={setDataInicio}
                        placeholder="Data Início"
                    />
                </div>

                <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data Fim</label>
                    <CustomDatePicker
                        value={dataFim}
                        onChange={setDataFim}
                        placeholder="Data Fim"
                    />
                </div>

                <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pagamento</label>
                    <CustomSelect
                        value={tipoPagamento}
                        onChange={setTipoPagamento}
                        options={[
                            { value: 'todos', label: 'Todos' },
                            { value: 'pix', label: 'PIX' },
                            { value: 'cartao', label: 'Cartão' },
                            { value: 'dinheiro', label: 'Dinheiro' },
                            { value: 'multiplo', label: 'Múltiplo' }
                        ]}
                    />
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={fetchVendas}
                        className="bg-primary/20 text-primary border border-primary/30 hover:bg-primary hover:text-primary-foreground px-4 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-2"
                    >
                        <Filter size={16} /> Filtrar
                    </button>

                    <div className="w-48">
                        <CustomSelect
                            value={exportFormat}
                            onChange={setExportFormat}
                            disabled={vendas.length === 0}
                            options={[
                                { value: 'pdf', label: 'PDF (.pdf)' },
                                { value: 'xlsx', label: 'Excel (.xlsx)' },
                                { value: 'md', label: 'Markdown (.md)' },
                                { value: 'json', label: 'JSON (.json)' },
                                { value: 'csv', label: 'CSV (.csv)' }
                            ]}
                        />
                    </div>
                    
                    <button
                        disabled={vendas.length === 0}
                        onClick={handleExport}
                        className={`bg-primary/20 text-primary border border-primary/30 hover:bg-primary hover:text-primary-foreground px-4 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${vendas.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title="Exportar Histórico"
                    >
                        <Download size={16} /> Exportar Relatório
                    </button>
                    
                    {canVerFaturamento && (
                        <button
                            disabled={vendas.length === 0}
                            onClick={handleOpenCloseRegister}
                            className={`bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500 hover:text-white px-4 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${vendas.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <Calculator size={16} /> Fechar Caixa
                        </button>
                    )}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 shrink-0">
                <div className="glass p-4 rounded-xl border-l-4 border-l-primary/50">
                    <p className="text-sm text-muted-foreground font-medium mb-1">Quantidade de Vendas</p>
                    <p className="text-2xl font-black">{vendas.length}</p>
                </div>
                {canVerFaturamento && (
                    <>
                        <div className="glass p-4 rounded-xl border-l-4 border-l-green-500/50">
                            <p className="text-sm text-muted-foreground font-medium mb-1">Total Faturado</p>
                            <p className="text-2xl font-black text-green-400">{formatCurrency(totaisCalculados.total)}</p>
                        </div>
                        <div className="glass p-4 rounded-xl border-l-4 border-l-blue-500/50">
                            <p className="text-sm text-muted-foreground font-medium mb-1">Lucro Estimado</p>
                            <p className="text-2xl font-black text-blue-400">{formatCurrency(totaisCalculados.lucro)}</p>
                        </div>
                    </>
                )}
            </div>

            {/* List */}
            <div className="glass rounded-xl flex-1 min-h-0 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-white/5 font-semibold text-sm grid grid-cols-12 gap-4 text-muted-foreground items-center">
                    <div className={canVerFaturamento ? "col-span-3" : "col-span-4"}>Data/Hora</div>
                    <div className={canVerFaturamento ? "col-span-3" : "col-span-4"}>Pagamento</div>
                    <div className={`text-right ${canVerFaturamento ? "col-span-3" : "col-span-4"}`}>Total</div>
                    {canVerFaturamento && <div className="col-span-2 text-right">Lucro</div>}
                    <div className={canVerFaturamento ? "col-span-1" : "hidden"}></div>
                </div>

                <div className="flex-1 overflow-y-auto w-full relative">
                    {loading ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                        </div>
                    ) : vendas.length === 0 ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                            <ReceiptText size={48} className="mb-4 opacity-20" />
                            <p>Nenhuma venda encontrada para este período.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {vendas.map((venda) => (
                                <div key={venda.id} className="flex flex-col">
                                    {/* Row */}
                                    <div
                                        onClick={() => toggleDetails(venda.id)}
                                        className="p-4 grid grid-cols-12 gap-4 items-center hover:bg-white/5 transition-colors cursor-pointer group"
                                    >
                                        <div className={`text-sm font-medium ${canVerFaturamento ? "col-span-3" : "col-span-4"}`}>
                                            {format(new Date(venda.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                        </div>
                                        <div className={canVerFaturamento ? "col-span-3" : "col-span-4"}>
                                            {renderPaymentBadge(venda.tipo_pagamento)}
                                        </div>
                                        <div className={`text-right font-bold ${canVerFaturamento ? "col-span-3" : "col-span-4 flex items-center justify-end gap-3"}`}>
                                            {formatCurrency(venda.total)}
                                            {!canVerFaturamento && (
                                                <div className="text-muted-foreground group-hover:text-primary transition-colors">
                                                    {expandedId === venda.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                </div>
                                            )}
                                        </div>
                                        {canVerFaturamento && (
                                            <div className="col-span-2 text-right font-bold text-green-400">
                                                {formatCurrency(venda.lucro_total)}
                                            </div>
                                        )}

                                        <div className={`${canVerFaturamento ? 'col-span-1' : 'hidden'} flex items-center justify-end gap-2`}>
                                            {canExcluirVendas && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setSaleToDelete(venda); }}
                                                    className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                                                    title="Desfazer Venda"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                            <div className="text-muted-foreground group-hover:text-primary transition-colors ml-1">
                                                {expandedId === venda.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </div>
                                        </div>

                                        {/* Handles the chevron for when Ver Faturamento is false, since the icon was at the end of total */}
                                        {!canVerFaturamento && canExcluirVendas && (
                                            <div className="absolute right-12 z-10 flex items-center">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setSaleToDelete(venda); }}
                                                    className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                                                    title="Desfazer Venda"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Details Area */}
                                    {expandedId === venda.id && (
                                        <div className="bg-black/40 border-t border-white/5 p-4 px-8 text-sm animate-in slide-in-from-top-2 duration-200">

                                            {venda.tipo_pagamento.includes('+') && (
                                                <div className="mb-5 bg-background/50 p-3 rounded-lg border border-white/5">
                                                    <h4 className="font-semibold text-muted-foreground mb-2 text-xs uppercase tracking-wider">Divisão do Pagamento Múltiplo</h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {venda.tipo_pagamento.split('+').map((p, i) => {
                                                            const clean = p.trim();
                                                            const match = clean.match(/(.*?)\s*\((R\$\s*[\d.]+)\)/);
                                                            if (match) {
                                                                return (
                                                                    <div key={i} className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-md">
                                                                        <span className="font-medium text-white/90">{match[1].trim()}</span>
                                                                        <span className="text-purple-400 font-mono font-bold">{match[2]}</span>
                                                                    </div>
                                                                );
                                                            }
                                                            return <span key={i} className="bg-white/10 px-2 py-1 rounded-md text-white/90">{clean}</span>;
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            <h4 className="font-semibold text-muted-foreground mb-3 text-xs uppercase tracking-wider">Itens da Venda</h4>
                                            {loadingItens ? (
                                                <div className="text-muted-foreground flex items-center gap-2">
                                                    <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                                                    Carregando itens...
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {itensExpandidos.map(item => (
                                                        <div key={item.id} className="space-y-1">
                                                            <div className="flex justify-between items-center bg-white/5 p-2 rounded px-4">
                                                                <span className="font-medium text-white/90">
                                                                    {item.quantidade}x {item.produtos?.nome || 'Produto Desconhecido'}
                                                                </span>
                                                                <span className="font-mono text-muted-foreground">
                                                                    {formatCurrency(item.preco_unitario * item.quantidade)}
                                                                </span>
                                                            </div>
                                                            {item.combo_selections && item.combo_selections.length > 0 && (
                                                                <div className="pl-6 pb-2 space-y-1">
                                                                    {/* Group by requirement or just list? Let's list choices. 
                                                                        We don't have product names here, we'll just show the requirement name
                                                                        or I'll have to add name fetching. 
                                                                        Since PDV sends {requirement_name, selected_product_id},
                                                                        I'll show the requirement name at least.
                                                                    */}
                                                                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold opacity-60">Composição do Combo:</div>
                                                                    {item.combo_selections.map((sel, sidx) => (
                                                                        <div key={sidx} className="text-xs text-white/70 flex items-center gap-2">
                                                                            <span className="w-1 h-1 bg-primary/40 rounded-full" />
                                                                            <span className="font-bold text-[10px] uppercase opacity-60">{sel.requirement_name}:</span>
                                                                            <span>{sel.selected_product_name || `Item (${sel.selected_product_id.split('-')[0]})`}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Undo Sale Modal */}
            {saleToDelete && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel p-6 rounded-xl w-full max-w-md animate-in zoom-in-95 duration-200 border border-white/10 shadow-2xl relative overflow-hidden">

                        {/* Danger top accent line */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-amber-500"></div>

                        <div className="flex items-center gap-3 mb-4 text-red-500">
                            <AlertTriangle size={24} />
                            <h2 className="text-xl font-bold text-white">Desfazer Venda</h2>
                        </div>

                        <p className="text-muted-foreground text-sm mb-6">
                            Você está prestes a excluir o registro desta venda do histórico. Esta ação <strong className="text-white">não pode ser desfeita</strong>.
                        </p>

                        <div className="bg-black/30 border border-white/5 rounded-xl p-4 mb-6">
                            <label className="flex items-start gap-3 cursor-pointer group">
                                <div className="mt-0.5">
                                    <CustomCheckbox checked={restockItems} onChange={setRestockItems} />
                                </div>
                                <div className="flex-1">
                                    <div className="font-semibold text-white flex items-center gap-2">
                                        <Package size={14} className="text-primary" />
                                        Devolver produtos ao estoque
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                        Todos os itens vendidos neste pedido terão suas respectivas quantidades somadas novamente ao estoque atual. Ideal para cancelamentos e devoluções.
                                    </p>
                                </div>
                            </label>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                            <button
                                onClick={() => setSaleToDelete(null)}
                                disabled={isDeleting}
                                className="px-4 py-2.5 rounded-xl text-muted-foreground hover:bg-white/5 transition-colors font-semibold disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={isDeleting}
                                className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 hover:border-red-500 px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-red-500/10 disabled:opacity-50 flex items-center gap-2"
                            >
                                {isDeleting ? (
                                    <>
                                        <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                                        Excluindo...
                                    </>
                                ) : (
                                    'Excluir Venda'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Close Register / Fechar Caixa Modal */}
            {isCloseRegisterModalOpen && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel p-6 rounded-xl w-full max-w-lg animate-in zoom-in-95 duration-200 border border-white/10 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                        
                        {/* Purple top accent line */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-indigo-500"></div>

                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3 text-purple-400">
                                <Calculator size={24} />
                                <h2 className="text-xl font-bold text-white">Fechamento de Caixa</h2>
                            </div>
                            <button onClick={() => setIsCloseRegisterModalOpen(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                                <ChevronDown size={20} className="rotate-90 text-muted-foreground opacity-50" />
                            </button>
                        </div>

                        <div className="text-sm text-muted-foreground mb-6">
                            Período: <strong className="text-white">{dataInicio.split('-').reverse().join('/')}</strong> a <strong className="text-white">{dataFim.split('-').reverse().join('/')}</strong>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6 shrink-0">
                            <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Total Faturado</p>
                                <p className="text-2xl font-black text-green-400">{formatCurrency(totaisCalculados.total)}</p>
                                <p className="text-xs text-muted-foreground mt-1">{vendas.length} venda(s) realizada(s)</p>
                            </div>
                            <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Lucro Estimado</p>
                                <p className="text-2xl font-black text-blue-400">{formatCurrency(totaisCalculados.lucro)}</p>
                            </div>
                        </div>

                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                            <FileText size={14} /> Principais Produtos Vendidos
                        </h3>
                        
                        <div className="flex-1 overflow-y-auto min-h-0 bg-black/20 rounded-xl border border-white/5 p-4">
                            {closeRegisterLoading ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                                </div>
                            ) : topItems.length > 0 ? (
                                <div className="space-y-3">
                                    {topItems.map((item, i) => (
                                        <div key={i} className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0 last:pb-0">
                                            <div className="flex items-center gap-3">
                                                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-muted-foreground">
                                                    {i + 1}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-white text-sm">{item.nome}</p>
                                                    <p className="text-xs text-muted-foreground">{item.quantidade} unid.</p>
                                                </div>
                                            </div>
                                            <div className="font-mono text-sm font-bold opacity-80">
                                                {formatCurrency(item.total)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center text-muted-foreground py-8">Nenhum item encontrado.</div>
                            )}
                        </div>

                        <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
                            <button
                                onClick={() => setIsCloseRegisterModalOpen(false)}
                                className="bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-xl font-bold transition-all"
                            >
                                Fechar Relatório
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
