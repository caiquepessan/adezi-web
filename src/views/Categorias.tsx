import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { useAuth } from '../contexts/AuthContext';
import { registrarLog } from '../lib/logger';

export interface Categoria {
    id: string;
    nome: string;
}

export function Categorias() {
    const { user } = useAuth();
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [loading, setLoading] = useState(true);
    const confirm = useConfirm();

    const [nomeForm, setNomeForm] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);

    const [nomeErro, setNomeErro] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchCategorias();
    }, []);

    async function fetchCategorias() {
        setLoading(true);
        const { data, error } = await supabase.from('categorias').select('*').order('nome');
        if (!error && data) {
            setCategorias(data);
        }
        setLoading(false);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setNomeErro('');

        if (!nomeForm.trim()) return;

        if (editingId) {
            const oldCat = categorias.find(c => c.id === editingId);
            const { error } = await supabase.from('categorias').update({ nome: nomeForm.trim() }).eq('id', editingId);
            if (error) {
                setNomeErro(error.message);
            } else {
                if (oldCat) await registrarLog(user!.id, 'Edição de Categoria', `Renomeou categoria "${oldCat.nome}" para "${nomeForm.trim()}".`);
                setEditingId(null);
                setNomeForm('');
                fetchCategorias();
            }
        } else {
            const { error } = await supabase.from('categorias').insert([{ nome: nomeForm.trim() }]);
            if (error) {
                setNomeErro('Categoria já existe ou erro no banco.');
                toast.error('Erro ao adicionar categoria.');
            } else {
                await registrarLog(user!.id, 'Criação de Categoria', `Criou a categoria: "${nomeForm.trim()}".`);
                setNomeForm('');
                toast.success('Categoria adicionada!');
                fetchCategorias();
            }
        }

        inputRef.current?.focus();
    }

    function handleEdit(cat: Categoria) {
        setEditingId(cat.id);
        setNomeForm(cat.nome);
        inputRef.current?.focus();
    }

    function cancelEdit() {
        setEditingId(null);
        setNomeForm('');
        setNomeErro('');
    }

    async function handleDelete(id: string) {
        if (await confirm('Deletar essa categoria? Isso afetará os produtos que usam esse nome (vão manter o texto, mas não estarão mais linkados).', 'Excluir Categoria')) {
            const delCat = categorias.find(c => c.id === id);
            const { error } = await supabase.from('categorias').delete().eq('id', id);
            if (!error) {
                if (delCat) await registrarLog(user!.id, 'Exclusão de Categoria', `Excluiu a categoria: "${delCat.nome}".`);
                fetchCategorias();
                toast.success('Categoria excluída!');
            } else {
                toast.error('Erro ao excluir categoria.');
            }
        }
    }

    return (
        <div className="animate-in fade-in duration-500 h-full flex flex-col max-w-2xl mx-auto w-full">
            <header className="mb-6 shrink-0 text-center">
                <h1 className="text-3xl font-bold tracking-tight">Categorias</h1>
                <p className="text-muted-foreground mt-1">Gerencie os tipos de produtos da sua adega.</p>
            </header>

            <div className="glass p-6 rounded-xl flex flex-col gap-6 w-full shadow-2xl">
                <form onSubmit={handleSubmit} className="flex flex-col gap-2">
                    <label className="text-sm text-foreground/80 font-medium">
                        {editingId ? 'Editando Categoria' : 'Nova Categoria'}
                    </label>
                    <div className="flex gap-2">
                        <input
                            ref={inputRef}
                            required
                            value={nomeForm}
                            onChange={e => setNomeForm(e.target.value)}
                            placeholder="Ex: Cerveja, Destilado, Combo..."
                            className="flex-1 bg-background/50 border border-border rounded-lg px-4 py-3 outline-none focus:border-primary transition-colors"
                        />
                        {editingId ? (
                            <div className="flex gap-2">
                                <button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition-colors font-bold">
                                    Salvar
                                </button>
                                <button type="button" onClick={cancelEdit} className="bg-muted hover:bg-muted/80 text-muted-foreground px-4 py-2 rounded-lg transition-colors font-bold">
                                    Cancelar
                                </button>
                            </div>
                        ) : (
                            <button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-lg transition-colors font-bold flex items-center gap-2">
                                <Plus size={18} /> Adicionar
                            </button>
                        )}
                    </div>
                    {nomeErro && <span className="text-red-400 text-sm mt-1">{nomeErro}</span>}
                </form>

                <div className="border border-border/50 rounded-lg overflow-hidden flex-1 flex flex-col min-h-[300px]">
                    {loading ? (
                        <div className="flex-1 flex items-center justify-center text-muted-foreground p-8">Carregando categorias...</div>
                    ) : categorias.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center text-muted-foreground p-8">Nenhuma categoria cadastrada.</div>
                    ) : (
                        <div className="overflow-y-auto w-full">
                            <table className="w-full text-left">
                                <tbody>
                                    {categorias.map(cat => (
                                        <tr key={cat.id} className="border-b border-border/50 hover:bg-white/5 transition-colors group">
                                            <td className="py-4 px-4 font-medium">
                                                {cat.nome}
                                                {['Combo', 'Dose', 'Shot', 'Caixa'].includes(cat.nome) && (
                                                    <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">Sistema</span>
                                                )}
                                            </td>
                                            <td className="py-4 px-4 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {!['Combo', 'Dose', 'Shot', 'Caixa'].includes(cat.nome) && (
                                                    <>
                                                        <button onClick={() => handleEdit(cat)} className="p-2 bg-background/50 rounded-md text-muted-foreground hover:text-white transition-colors" title="Editar">
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button onClick={() => handleDelete(cat.id)} className="p-2 bg-background/50 rounded-md text-muted-foreground hover:text-red-400 transition-colors" title="Excluir">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
