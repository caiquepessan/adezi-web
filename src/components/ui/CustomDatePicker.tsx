import { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    format, addMonths, subMonths, startOfMonth, endOfMonth,
    eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek, parse
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from './CustomSelect';

interface CustomDatePickerProps {
    value: string; // Format string YYYY-MM-DD
    onChange: (value: string) => void;
    className?: string;
    placeholder?: string;
}

export function CustomDatePicker({ value, onChange, className, placeholder = 'Selecione uma data' }: CustomDatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(() => value ? parse(value, 'yyyy-MM-dd', new Date()) : new Date());
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedDate = value ? parse(value, 'yyyy-MM-dd', new Date()) : null;
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const dateFormat = "yyyy-MM-dd";
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const onDateClick = (day: Date) => {
        onChange(format(day, dateFormat));
        setIsOpen(false);
    };

    const dayNames = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

    return (
        <div className={cn("relative w-full", className)} ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-black/40 border border-white/10 shadow-inner rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-white flex items-center h-[38px] text-left"
            >
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                {selectedDate ? format(selectedDate, "dd/MM/yyyy") : <span className="text-muted-foreground">{placeholder}</span>}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -5, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute z-50 top-full left-0 mt-1 bg-[#18181b] border border-white/10 rounded-xl shadow-2xl w-72 p-4"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <button
                                type="button"
                                onClick={prevMonth}
                                className="p-1 rounded-md hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <div className="text-sm font-semibold capitalize text-white/90">
                                {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
                            </div>
                            <button
                                type="button"
                                onClick={nextMonth}
                                className="p-1 rounded-md hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>

                        {/* Weekdays */}
                        <div className="grid grid-cols-7 gap-1 text-center mb-2">
                            {dayNames.map((day, i) => (
                                <div key={i} className="text-[10px] font-bold text-muted-foreground uppercase">{day}</div>
                            ))}
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 gap-1">
                            {days.map((day, i) => {
                                const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                                const isCurrentMonth = isSameMonth(day, currentMonth);
                                const isToday = isSameDay(day, new Date());

                                return (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => onDateClick(day)}
                                        className={cn(
                                            "h-8 w-8 rounded-full flex items-center justify-center text-xs transition-colors",
                                            !isCurrentMonth && "text-muted-foreground/40",
                                            isCurrentMonth && !isSelected && "hover:bg-white/10 text-white/90",
                                            isSelected && "bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20",
                                            isToday && !isSelected && "border border-primary/50 text-primary"
                                        )}
                                    >
                                        {format(day, 'd')}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-4 pt-3 border-t border-white/10 flex justify-between">
                            <button
                                type="button"
                                onClick={() => { onChange(''); setIsOpen(false); }}
                                className="text-xs text-muted-foreground hover:text-white transition-colors"
                                disabled={!value}
                            >
                                Limpar
                            </button>
                            <button
                                type="button"
                                onClick={() => onDateClick(new Date())}
                                className="text-xs text-primary font-medium hover:text-primary/80 transition-colors"
                            >
                                Hoje
                            </button>
                        </div>

                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
