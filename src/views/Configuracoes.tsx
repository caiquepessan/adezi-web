import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Settings, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import packageJson from '../../package.json';
import { useAuth } from '../contexts/AuthContext';
import { registrarLog } from '../lib/logger';

export function Configuracoes() {
    const { user } = useAuth();
    const [lucroGlobal, setLucroGlobal] = useState(30);
    const [estoqueMinimoGlobal, setEstoqueMinimoGlobal] = useState(5);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        fetchConfig();
    }, []);

    async function fetchConfig() {
        setLoading(true);
        const { data } = await supabase.from('configuracoes').select('*').eq('id', 1).single();
        if (data) {
            setLucroGlobal(Number(data.lucro_global_percent));
            setEstoqueMinimoGlobal(Number(data.estoque_minimo_global));
        }
        setLoading(false);
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);

        const { error } = await supabase
            .from('configuracoes')
            .update({
                lucro_global_percent: lucroGlobal,
                estoque_minimo_global: estoqueMinimoGlobal
            })
            .eq('id', 1);

        if (error) {
            toast.error('Erro ao salvar as configurações.');
        } else {
            await registrarLog(user!.id, 'Alteração de Configurações Globais', `Lucro: ${lucroGlobal}%, Estoque Mínimo: ${estoqueMinimoGlobal} u.`);
            toast.success('Configurações salvas e preços atualizados!', { duration: 4000 });
        }
        setSaving(false);
    }

    // Cloud updates are applied automatically

    return (
        <div className="animate-in fade-in duration-500 h-full flex flex-col max-w-2xl mx-auto w-full">
            <header className="mb-6 shrink-0 text-center">
                <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
                <p className="text-muted-foreground mt-1">Ajustes globais do sistema.</p>
            </header>

            {loading ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">Carregando configurações...</div>
            ) : (
                <div className="glass p-8 rounded-xl shadow-2xl flex flex-col gap-8 w-full">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2 mb-4 border-b border-white/10 pb-4">
                            <Settings className="text-primary" size={24} /> Padrões Globais
                        </h2>
                        <p className="text-sm text-muted-foreground mb-6">
                            Estas configurações se aplicam a todos os produtos novos e aos existentes que estejam configurados para usar a <strong>Margem Global</strong> ou <strong>Alerta Global</strong>.
                        </p>

                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="bg-background/50 p-6 rounded-lg border border-border">
                                <label className="block text-sm font-semibold mb-2">
                                    Margem de Lucro (% sobre o Custo)
                                </label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        required
                                        value={lucroGlobal}
                                        onChange={(e) => setLucroGlobal(Number(e.target.value))}
                                        className="w-32 bg-background border border-border rounded-lg px-4 py-3 outline-none focus:border-primary text-lg"
                                    />
                                    <span className="text-muted-foreground">%</span>
                                </div>
                                <p className="text-sm text-primary/80 mt-2 font-medium">
                                    Se alterar isso, <strong>todos</strong> os produtos vinculados terão o valor de venda alterado no botão salvar!
                                </p>
                            </div>

                            <div className="bg-background/50 p-6 rounded-lg border border-border">
                                <label className="block text-sm font-semibold mb-2">
                                    Alerta de Estoque Crítico (Unidades Mínimas)
                                </label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="number"
                                        min="0"
                                        required
                                        value={estoqueMinimoGlobal}
                                        onChange={(e) => setEstoqueMinimoGlobal(Number(e.target.value))}
                                        className="w-32 bg-background border border-border rounded-lg px-4 py-3 outline-none focus:border-primary text-lg"
                                    />
                                    <span className="text-muted-foreground">unidades</span>
                                </div>
                                <p className="text-sm text-muted-foreground mt-2">
                                    Aparecerá vermelho no Estoque e contará no alerta do Dashboard.
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-xl shadow-lg transition-colors flex justify-center items-center gap-2 text-lg disabled:opacity-50"
                            >
                                {saving ? 'Salvando e Calculando Preços...' : <><Save size={20} /> Salvar Configurações</>}
                            </button>
                        </form>
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/5">
                        <p className="text-muted-foreground text-sm flex items-center justify-between">
                            <span>Versão do Sistema:</span>
                            <span className="bg-primary/20 text-primary px-2 py-0.5 rounded-md font-mono font-bold">
                                SaaS Web v{packageJson.version}
                            </span>
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}
