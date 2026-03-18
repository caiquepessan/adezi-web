import { supabase } from './supabase';
// import toast from 'react-hot-toast'; // Not used in this file

export async function registrarLog(usuario_id: string, acao: string, detalhes?: string) {
    if (usuario_id === 'guest' || !navigator.onLine) {
        // Guests or offline contexts skip logging to avoid errors
        return;
    }

    try {
        const { error } = await supabase
            .from('logs_atividade')
            .insert([{ usuario_id, acao, detalhes }]);

        if (error) {
            console.error('Falha ao registrar log de atividade:', error);
            // We usually don't toast errors in background loggers to not annoy the user if it's non-critical
        }
    } catch (err) {
        console.error('Excessão ao registrar log:', err);
    }
}
