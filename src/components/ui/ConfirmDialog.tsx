import { createContext, useContext, useState, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface ConfirmDialogContextType {
    confirm: (message: string, title?: string) => Promise<boolean>;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextType | undefined>(undefined);

export function useConfirm() {
    const context = useContext(ConfirmDialogContext);
    if (!context) {
        throw new Error('useConfirm must be used within a ConfirmDialogProvider');
    }
    return context.confirm;
}

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [title, setTitle] = useState('Confirmação');
    const [resolver, setResolver] = useState<{ resolve: (value: boolean) => void } | null>(null);

    const confirm = (msg: string, titleStr?: string): Promise<boolean> => {
        setMessage(msg);
        if (titleStr) setTitle(titleStr);
        else setTitle('Confirmação');

        setIsOpen(true);
        return new Promise((resolve) => {
            setResolver({ resolve });
        });
    };

    const handleConfirm = () => {
        if (resolver) resolver.resolve(true);
        setIsOpen(false);
    };

    const handleCancel = () => {
        if (resolver) resolver.resolve(false);
        setIsOpen(false);
    };

    return (
        <ConfirmDialogContext.Provider value={{ confirm }}>
            {children}
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-card glass p-6 rounded-xl shadow-2xl max-w-md w-full mx-4 border border-border animate-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                            <AlertCircle className="text-primary" /> {title}
                        </h3>
                        <p className="text-muted-foreground mb-6">{message}</p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={handleCancel}
                                className="px-4 py-2 rounded-lg bg-background border border-border text-foreground hover:bg-white/5 transition-colors font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirm}
                                className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold transition-colors"
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmDialogContext.Provider>
    );
}
