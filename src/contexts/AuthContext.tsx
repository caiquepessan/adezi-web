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
    username: string;
    is_admin: boolean;
    permissoes: UserPermissoes;
    isGuest?: boolean;
};

interface AuthContextData {
    user: Usuario | null;
    login: (username: string, senha: string) => Promise<boolean>;
    loginAsGuest: () => void;
    logout: () => void;
    hasPermission: (perm: keyof UserPermissoes) => boolean;
    loading: boolean;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<Usuario | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session) {
                const loggedUser: Usuario = {
                    id: session.user.id,
                    username: session.user.user_metadata?.adega_name || 'Adega (SaaS)',
                    is_admin: true,
                    permissoes: { todas: true } as UserPermissoes,
                    isGuest: false
                };
                setUser(loggedUser);
            } else {
                const savedUser = localStorage.getItem('@adegadosmulekes:user');
                if (savedUser) {
                    setUser(JSON.parse(savedUser));
                }
            }
            setLoading(false);
        };

        loadSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
                const loggedUser: Usuario = {
                    id: session.user.id,
                    username: session.user.user_metadata?.adega_name || 'Adega (SaaS)',
                    is_admin: true,
                    permissoes: { todas: true } as UserPermissoes,
                    isGuest: false
                };
                setUser(loggedUser);
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
                username: data.username,
                is_admin: data.is_admin,
                permissoes: data.permissoes as UserPermissoes
            };

            setUser(loggedUser);
            localStorage.setItem('@adegadosmulekes:user', JSON.stringify(loggedUser));
            toast.success(`Bem-vindo, ${loggedUser.username}!`);
            return true;
        } catch (error) {
            console.error(error);
            toast.error('Erro de conexão ao fazer login.');
            return false;
        }
    }

    function loginAsGuest() {
        const guestUser: Usuario = {
            id: 'guest',
            username: 'Visitante (Offline)',
            is_admin: false,
            permissoes: {}, // Sem permissões além do acesso básico (PDV)
            isGuest: true
        };
        setUser(guestUser);
        localStorage.setItem('@adegadosmulekes:user', JSON.stringify(guestUser));
        toast.success('Entrou como Visitante.');
    }

    function logout() {
        setUser(null);
        localStorage.removeItem('@adegadosmulekes:user');
    }

    function hasPermission(perm: keyof UserPermissoes): boolean {
        if (!user) return false;
        if (user.isGuest) return false;
        if (user.is_admin || user.permissoes.todas) return true;
        return !!user.permissoes[perm];
    }

    return (
        <AuthContext.Provider value={{ user, login, loginAsGuest, logout, hasPermission, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
