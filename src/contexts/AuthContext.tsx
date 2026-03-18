import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export type UserPermissoes = {
    estoque_view?: boolean;
    estoque_criar?: boolean;
    estoque_editar?: boolean;
    estoque_excluir?: boolean;
    ver_faturamento?: boolean;
    historico_ver?: boolean;
    vendas_excluir?: boolean;
    categorias_gerir?: boolean;
    registro_atividades?: boolean;
    todas?: boolean; // For dev/admin
};

export type Usuario = {
    id: string;
    empresa_id?: string;
    username: string;
    is_admin: boolean;
    permissoes: UserPermissoes;
    isGuest?: boolean;
};

interface AuthContextData {
    user: Usuario | null;
    isOwner: boolean; // Indicates if the Supabase Master Session is active
    empresaId: string | null; // The active Empresa ID (from owner session or POS user)
    login: (username: string, senha: string) => Promise<boolean>;
    loginAsGuest: () => void;
    logout: () => void; // Logs out the POS user
    logoutOwner: () => Promise<void>; // Logs out the Supabase Master account
    hasPermission: (perm: keyof UserPermissoes) => boolean;
    loading: boolean;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<Usuario | null>(null);
    const [isOwner, setIsOwner] = useState(false);
    const [empresaId, setEmpresaId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            
            let currentEmpresaId = null;
            let ownerActive = false;

            if (session) {
                setIsOwner(true);
                ownerActive = true;
                currentEmpresaId = session.user.id;
            } else {
                setIsOwner(false);
            }

            const savedUser = localStorage.getItem('@adezi:user');
            if (savedUser) {
                const parsedUser = JSON.parse(savedUser);
                setUser(parsedUser);
                if (parsedUser.empresa_id) {
                    currentEmpresaId = parsedUser.empresa_id;
                }
            } else if (ownerActive) {
                // Acesso Root admin por padrão usando a sessão do Supabase (Dono)
                const ownerUser: Usuario = {
                    id: 'owner',
                    empresa_id: session!.user.id,
                    username: 'Administrador (Dono)',
                    is_admin: true,
                    permissoes: { todas: true } as UserPermissoes,
                    isGuest: false
                };
                setUser(ownerUser);
            }
            
            setEmpresaId(currentEmpresaId);
            setLoading(false);
        };

        loadSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setIsOwner(!!session);
            if (session) {
                setEmpresaId(session.user.id);
            } else {
                setEmpresaId(user?.empresa_id || null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    async function login(username: string, senha: string): Promise<boolean> {
        try {
            const { data, error } = await supabase
                .from('usuarios')
                .select('*')
                .eq('username', username)
                .eq('senha', senha) // Note: In a real app, hash passwords! But for offline POS scope...
                .single();

            if (error || !data) {
                toast.error('Usuário ou senha incorretos.');
                return false;
            }

            const loggedUser: Usuario = {
                id: data.id,
                empresa_id: data.empresa_id,
                username: data.username,
                is_admin: data.is_admin,
                permissoes: data.permissoes as UserPermissoes
            };

            setUser(loggedUser);
            setEmpresaId(data.empresa_id);
            localStorage.setItem('@adezi:user', JSON.stringify(loggedUser));
            toast.success(`Bem-vindo, ${loggedUser.username}!`);
            return true;
        } catch (error) {
            console.error(error);
            toast.error('Erro de conexão ao fazer login.');
            return false;
        }
    }

    function loginAsGuest() {
        // Obsolete in SaaS, kept empty or remove references
    }

    function logout() {
        setUser(null);
        if (!isOwner) setEmpresaId(null);
        localStorage.removeItem('@adezi:user');
        
        // Se caso for o dono (email) tentando deslogar do PDV, não damos re-login automático na mesma aba
        // localStorage.setItem('@adezi:owner_pos_logged_out', 'true');
        // Wait: The user usually logs into the SaaS on their own device and uses it.
        // If they want to logout of the POS, it's fine.
    }

    async function logoutOwner() {
        await supabase.auth.signOut();
        setIsOwner(false);
        setUser(null);
        setEmpresaId(null);
        localStorage.removeItem('@adezi:user');
    }

    function hasPermission(perm: keyof UserPermissoes): boolean {
        // If it's the owner checking without a POS user, returning true could make sense, but usually we rely on isOwner for root access.
        if (!user) return false;
        if (user.isGuest) return false;
        if (user.is_admin || user.permissoes.todas) return true;
        return !!user.permissoes[perm];
    }

    return (
        <AuthContext.Provider value={{ user, isOwner, empresaId, login, loginAsGuest, logout, logoutOwner, hasPermission, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
