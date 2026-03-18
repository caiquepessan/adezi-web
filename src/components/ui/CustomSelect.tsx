import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export interface SelectOption {
    value: string;
    label: string;
    group?: string;
    disabled?: boolean;
}

interface CustomSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

export function CustomSelect({ value, onChange, options, placeholder = 'Selecione...', className, disabled = false }: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const selectedOption = options.find((opt) => opt.value === value);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearch('');
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isOpen]);

    const filteredOptions = options.filter(option => 
        option.label.toLowerCase().includes(search.toLowerCase()) ||
        (option.group && option.group.toLowerCase().includes(search.toLowerCase()))
    );

    const groupedOptions = filteredOptions.reduce((acc, option) => {
        const group = option.group || 'default';
        if (!acc[group]) acc[group] = [];
        acc[group].push(option);
        return acc;
    }, {} as Record<string, SelectOption[]>);

    return (
        <div className={cn("relative w-full", className)} ref={containerRef}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => {
                    if (!disabled) {
                        setIsOpen(!isOpen);
                        if (isOpen) setSearch('');
                    }
                }}
                className={cn(
                    "w-full border border-white/10 rounded-lg py-2 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-white flex items-center justify-between gap-2 min-h-[38px] shadow-inner",
                    disabled ? "bg-black/20 opacity-50 cursor-not-allowed" : "bg-black/40 hover:border-white/20"
                )}
            >
                <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
                <ChevronDown size={14} className={cn("text-muted-foreground transition-transform duration-200 shrink-0", isOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -5, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute z-50 top-full left-0 w-full mt-1 bg-[#18181b] border border-white/10 rounded-xl shadow-2xl overflow-hidden py-1"
                    >
                        <div className="px-2 py-2 border-b border-white/5">
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar..."
                                className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-1.5 text-xs text-white outline-none focus:border-primary/50 transition-all"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>

                        <div className="max-h-60 overflow-y-auto">
                            {Object.entries(groupedOptions).map(([group, groupOptions]) => (
                                <div key={group}>
                                    {group !== 'default' && (
                                        <div className="px-4 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-white/5 border-y border-white/5">
                                            {group}
                                        </div>
                                    )}
                                    {groupOptions.map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            disabled={option.disabled}
                                            onClick={() => {
                                                if (!option.disabled) {
                                                    onChange(option.value);
                                                    setIsOpen(false);
                                                    setSearch('');
                                                }
                                            }}
                                            className={cn(
                                                "w-full text-left px-4 py-2 text-sm transition-colors flex items-center justify-between",
                                                option.disabled ? "opacity-50 cursor-not-allowed text-white/50" : (value === option.value ? "bg-primary/20 text-primary font-medium" : "text-white/80 hover:bg-white/5 hover:text-white")
                                            )}
                                        >
                                            <span className="truncate">{option.label}</span>
                                            {value === option.value && <Check size={14} className="shrink-0" />}
                                        </button>
                                    ))}
                                </div>
                            ))}
                            {filteredOptions.length === 0 && (
                                <div className="px-4 py-3 text-sm text-muted-foreground text-center">Nenhum resultado</div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
