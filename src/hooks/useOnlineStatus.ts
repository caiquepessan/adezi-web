import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Helper for polling Supabase to detect actual DB reachability
// Navigator.onLine only tells if we are connected to A network, not the internet/DB
export function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        let pollingInterval: number;

        const checkServerConnection = async () => {
            try {
                // Fast lightweight query to check connection
                const { error } = await supabase.from('categorias').select('id').limit(1);
                if (error && error.message.includes('fetch')) {
                    setIsOnline(false);
                } else {
                    setIsOnline(true);
                }
            } catch (err) {
                setIsOnline(false);
            }
        };

        const handleOnline = () => {
            // Confirm with a real ping
            checkServerConnection();
        };

        const handleOffline = () => {
            setIsOnline(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Initial check
        checkServerConnection();

        // Poll every 30 seconds to catch silent drops
        pollingInterval = window.setInterval(checkServerConnection, 30000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            window.clearInterval(pollingInterval);
        };
    }, []);

    return { isOnline, isSyncing, setIsSyncing };
}
