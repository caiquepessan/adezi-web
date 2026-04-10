import { useState, useEffect } from 'react';
import { X, Minus, Square, Copy, Wifi, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
export function Titlebar() {
    const [isMaximized, setIsMaximized] = useState(false);

    useEffect(() => {
        const ipc = (window as any).ipcRenderer;
        if (ipc) {
            const handleMaximized = () => setIsMaximized(true);
            const handleUnmaximized = () => setIsMaximized(false);

            ipc.on('window-maximized', handleMaximized);
            ipc.on('window-unmaximized', handleUnmaximized);

            return () => {
                ipc.off('window-maximized', handleMaximized);
                ipc.off('window-unmaximized', handleUnmaximized);
            };
        }
    }, []);

    const handleMinimize = () => {
        console.log('Titlebar: Minimize clicked');
        (window as any).ipcRenderer?.send('window-minimize');
    };
    const handleMaximize = () => {
        console.log('Titlebar: Maximize clicked');
        (window as any).ipcRenderer?.send('window-maximize');
    };
    const handleClose = () => {
        console.log('Titlebar: Close clicked');
        if ((window as any).ipcRenderer) {
            (window as any).ipcRenderer.send('window-close');
        } else {
            window.close(); // Fallback for web mode
        }
    };

    const { isOnline, isSyncing } = useOnlineStatus();

    return (
        <div className="h-10 bg-background/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-4 select-none" style={{ WebkitAppRegion: 'drag' } as any}>
            <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                ADEZI

                <div className={`ml-4 flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isOnline ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-400'
                    }`}>
                    {isOnline ? (
                        <>
                            <Wifi size={10} />
                            {isSyncing ? <span className="animate-pulse">Sincronizando...</span> : 'Online'}
                        </>
                    ) : (
                        <>
                            <WifiOff size={10} />
                            Offline
                        </>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as any}>
                <button onClick={handleMinimize} className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-muted-foreground hover:text-white">
                    <Minus size={16} />
                </button>
                <button onClick={handleMaximize} className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-muted-foreground hover:text-white">
                    {isMaximized ? <Copy size={14} /> : <Square size={14} />}
                </button>
                <button onClick={handleClose} className="p-1.5 hover:bg-red-500/80 rounded-md transition-colors text-muted-foreground hover:text-white">
                    <X size={16} />
                </button>
            </div>
        </div>
    );
}
