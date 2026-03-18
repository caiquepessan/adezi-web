import { Check } from 'lucide-react';

interface CustomCheckboxProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    className?: string;
}

export function CustomCheckbox({ checked, onChange, disabled = false, className = '' }: CustomCheckboxProps) {
    return (
        <div
            className={`relative flex items-center justify-center w-5 h-5 rounded border transition-all duration-200 shrink-0 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                } ${checked
                    ? 'bg-primary border-primary text-black shadow-[0_0_10px_rgba(255,191,0,0.3)]'
                    : 'bg-black/50 border-white/20 hover:border-primary/50'
                } ${className}`}
        >
            <input
                type="checkbox"
                className="absolute opacity-0 w-full h-full cursor-pointer m-0 p-0"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                disabled={disabled}
            />
            <Check size={14} className={`transition-all duration-200 pointer-events-none ${checked ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} strokeWidth={4} />
        </div>
    );
}
