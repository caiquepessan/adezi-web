import { X, Minus, Square, Wifi, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
export function Titlebar() {
    const handleMinimize = () => (window as any).ipcRenderer?.send('window-minimize');
    const handleMaximize = () => (window as any).ipcRenderer?.send('window-maximize');
    const handleClose = () => {
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
                ADEGA DOS MULEKES

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
                    <Square size={14} />
                </button>
                <button onClick={handleClose} className="p-1.5 hover:bg-red-500/80 rounded-md transition-colors text-muted-foreground hover:text-white">
                    <X size={16} />
                </button>
            </div>
        </div>
    );
}
