import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Plus, Shield, User, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { CustomCheckbox } from '../components/ui/CustomCheckbox';
import type { Usuario, UserPermissoes } from '../contexts/AuthContext';

export function Usuarios() {
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Form state
    const [formData, setFormData] = useState({ id: '', username: '', senha: '', is_admin: false });
    const [permissoes, setPermissoes] = useState<UserPermissoes>({});

    const confirm = useConfirm();

    useEffect(() => {
        fetchUsuarios();
    }, []);

    async function fetchUsuarios() {
        setLoading(true);
        const { data, error } = await supabase.from('usuarios').select('id, username, is_admin, permissoes').order('username');
        if (data && !error) {
            setUsuarios(data as Usuario[]);
        } else {
            toast.error('Erro ao carregar usuários.');
        }
        setLoading(false);
    }

    function resetForm() {
        setFormData({ id: '', username: '', senha: '', is_admin: false });
        setPermissoes({});
    }

    function handleAddNew() {
        resetForm();
        setShowModal(true);
    }

    function handleEditClick(u: Usuario) {
        setFormData({ id: u.id, username: u.username, senha: '', is_admin: u.is_admin });
        setPermissoes(u.permissoes || {});
        setShowModal(true);
    }

    async function handleDelete(id: string) {
        if (await confirm('Tem certeza que deseja excluir este usuário?', 'Excluir Usuário')) {
            const { error } = await supabase.from('usuarios').delete().eq('id', id);
            if (!error) {
                toast.success('Usuário removido.');
                fetchUsuarios();
            } else {
                toast.error('Erro ao remover usuário.');
            }
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        const payload: any = {
            username: formData.username,
            is_admin: formData.is_admin,
            permissoes: permissoes
        };

        if (formData.senha) {
            payload.senha = formData.senha;
        }

        if (formData.id) {
            // Update
            const { error } = await supabase.from('usuarios').update(payload).eq('id', formData.id);
            if (error) { toast.error('Erro ao atualizar usuário.'); return; }
        } else {
            // Insert
            if (!formData.senha) {
                toast.error('A senha é obrigatória para novos usuários.');
                return;
            }
            const { error } = await supabase.from('usuarios').insert([payload]);
            if (error) { toast.error('Erro ao criar usuário.'); return; }
        }

        toast.success(formData.id ? 'Usuário atualizado!' : 'Usuário criado!');
        setShowModal(false);
        fetchUsuarios();
    }

    function togglePermissao(key: keyof UserPermissoes) {
        setPermissoes(prev => ({ ...prev, [key]: !prev[key] }));
    }

    return (
        <div className="h-full flex flex-col animate-in fade-in duration-500">
            <header className="mb-6 shrink-0 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <Users className="text-primary" />
                        Usuários e Permissões
                    </h1>
                    <p className="text-muted-foreground mt-1">Gerencie a equipe e seus níveis de acesso.</p>
                </div>
                <button
                    onClick={handleAddNew}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center gap-2"
                >
                    <Plus size={18} /> Novo Usuário
                </button>
            </header>

            <div className="glass p-6 rounded-xl flex-1 flex flex-col overflow-hidden">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">Carregando...</div>
                ) : usuarios.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">Nenhum usuário encontrado.</div>
                ) : (
                    <div className="overflow-auto flex-1">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/10 text-muted-foreground text-sm uppercase tracking-wider">
                                    <th className="pb-4 font-semibold">Usuário</th>
                                    <th className="pb-4 font-semibold">Tipo de Acesso</th>
                                    <th className="pb-4 font-semibold text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {usuarios.map(u => (
                                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                        <td className="py-4 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded bg-primary/20 text-primary flex items-center justify-center shadow-inner">
                                                <User size={16} />
                                            </div>
                                            <span className="font-bold text-base">{u.username}</span>
                                        </td>
                                        <td className="py-4">
                                            {u.is_admin ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/20 text-amber-500 text-xs font-bold border border-amber-500/20">
                                                    <Shield size={12} />
                                                    Administrador
                                                </span>
                                            ) : u.permissoes.todas ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-500/20 text-blue-400 text-xs font-bold border border-blue-500/20">
                                                    Acesso Total
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/10 text-muted-foreground text-xs font-bold border border-white/10">
                                                    Colaborador
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-4 text-right">
                                            <button onClick={() => handleEditClick(u)} className="p-2 bg-white/5 rounded-md text-muted-foreground hover:text-white transition-colors" title="Editar">
                                                Editar
                                            </button>
                                            {u.username !== 'dev' && (
                                                <button onClick={() => handleDelete(u.id)} className="p-2 text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel p-6 rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            {formData.id ? 'Editar Usuário' : 'Novo Usuário'}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-6">

                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col justify-end">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1 mb-1.5">Nome de Usuário</label>
                                    <input
                                        required
                                        value={formData.username}
                                        onChange={e => setFormData({ ...formData, username: e.target.value })}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-primary transition-all shadow-inner"
                                        disabled={formData.username === 'dev'}
                                    />
                                </div>
                                <div className="flex flex-col justify-end">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1 mb-1.5 flex items-baseline gap-1">
                                        Senha {formData.id && <span className="normal-case opacity-70 text-[10px]">(em branco p/ não alterar)</span>}
                                    </label>
                                    <input
                                        required={!formData.id}
                                        type="password"
                                        value={formData.senha}
                                        onChange={e => setFormData({ ...formData, senha: e.target.value })}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-primary transition-all shadow-inner"
                                    />
                                </div>
                            </div>

                            {formData.username !== 'dev' && (
                                <div className="space-y-4 pt-4 border-t border-white/10">
                                    <h3 className="font-bold flex items-center gap-2">
                                        <Shield className="text-primary" size={18} />
                                        Níveis de Acesso
                                    </h3>

                                    <label className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl cursor-pointer hover:bg-amber-500/20 transition-colors">
                                        <CustomCheckbox
                                            checked={formData.is_admin}
                                            onChange={checked => setFormData({ ...formData, is_admin: checked })}
                                        />
                                        <div>
                                            <p className="font-bold text-amber-500 leading-none">Acesso de Administrador</p>
                                            <p className="text-xs text-amber-500/70 mt-1">Concede acesso total ao sistema, gerenciar configurações e usuários.</p>
                                        </div>
                                    </label>

                                    {!formData.is_admin && (
                                        <div className="space-y-3 bg-black/20 p-4 rounded-xl border border-white/5">
                                            <p className="text-sm font-semibold text-muted-foreground mb-4">Permissões Específicas</p>

                                            <label className="flex items-center gap-3 cursor-pointer group">
                                                <CustomCheckbox checked={permissoes.todas || false} onChange={() => togglePermissao('todas')} />
                                                <span className="text-sm text-foreground/80 group-hover:text-white transition-colors">Todas as permissões (exceto configurações/usuários)</span>
                                            </label>

                                            {!permissoes.todas && (
                                                <div className="grid grid-cols-2 gap-3 pl-2 mt-3">
                                                    <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-white transition-colors">
                                                        <CustomCheckbox checked={permissoes.ver_faturamento || false} onChange={() => togglePermissao('ver_faturamento')} />
                                                        Visualizar Faturamento / Dashboard
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-white transition-colors">
                                                        <CustomCheckbox checked={permissoes.historico_ver || false} onChange={() => togglePermissao('historico_ver')} />
                                                        Ver Histórico de Vendas
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-white transition-colors border-b border-white/5 pb-2 mb-2 col-span-2">
                                                        <CustomCheckbox checked={permissoes.vendas_excluir || false} onChange={() => togglePermissao('vendas_excluir')} disabled={!permissoes.historico_ver} />
                                                        Excluir / Estornar Vendas
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-white transition-colors">
                                                        <CustomCheckbox checked={permissoes.estoque_view || false} onChange={() => togglePermissao('estoque_view')} />
                                                        Visualizar Estoque
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-white transition-colors">
                                                        <CustomCheckbox disabled={!permissoes.estoque_view} checked={permissoes.estoque_criar || false} onChange={() => togglePermissao('estoque_criar')} />
                                                        Criar Produtos
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-white transition-colors">
                                                        <CustomCheckbox disabled={!permissoes.estoque_view} checked={permissoes.estoque_editar || false} onChange={() => togglePermissao('estoque_editar')} />
                                                        Editar Produtos
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-white transition-colors">
                                                        <CustomCheckbox disabled={!permissoes.estoque_view} checked={permissoes.estoque_excluir || false} onChange={() => togglePermissao('estoque_excluir')} />
                                                        Excluir Produtos
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-white transition-colors">
                                                        <CustomCheckbox checked={permissoes.categorias_gerir || false} onChange={() => togglePermissao('categorias_gerir')} />
                                                        Gerenciar Categorias
                                                    </label>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 rounded-xl text-muted-foreground hover:bg-white/5 transition-colors font-semibold">Cancelar</button>
                                <button type="submit" className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
                                    {formData.id ? 'Salvar Alterações' : 'Criar Usuário'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
