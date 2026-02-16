import React, { useState, useEffect } from 'react';
import { Modal } from '../UIComponents';
import { ChevronLeft, ChevronRight, Calculator, Calendar as CalendarIcon } from 'lucide-react';

interface DateModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentDate: string;
    onSelectDate: (date: string) => void;
    recordedDates: string[]; // List of YYYY-MM-DD strings that have data
}

export const DateModal: React.FC<DateModalProps> = ({ isOpen, onClose, currentDate, onSelectDate, recordedDates }) => {
    const [viewDate, setViewDate] = useState(new Date(currentDate));

    useEffect(() => {
        if (isOpen) {
            setViewDate(new Date(currentDate));
        }
    }, [isOpen, currentDate]);

    if (!isOpen) return null;

    // Calendar Logic
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday

    // Adjust for Monday start (0=Mon, 6=Sun)
    const startOffset = (firstDay + 6) % 7;

    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const weekDays = ["L", "M", "M", "J", "V", "S", "D"];

    const handlePrevMonth = () => setViewDate(new Date(year, month - 1, 1));
    const handleNextMonth = () => setViewDate(new Date(year, month + 1, 1));

    const generateDays = () => {
        const days = [];
        // Empty slots
        for (let i = 0; i < startOffset; i++) {
            days.push(<div key={`empty-${i}`} className="h-10"></div>);
        }
        // Days
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isSelected = dateStr === currentDate;
            const hasData = recordedDates.includes(dateStr);
            const isToday = dateStr === new Date().toISOString().split('T')[0];

            days.push(
                <button
                    key={d}
                    onClick={() => {
                        onSelectDate(dateStr);
                        onClose();
                    }}
                    className={`
                    h-10 w-full rounded-lg flex flex-col items-center justify-center relative transition-all
                    ${isSelected ? 'bg-[#19e66f] text-[#0e1b13] font-bold shadow-md transform scale-105 z-10' : 'hover:bg-gray-100 text-gray-700'}
                    ${!isSelected && hasData ? 'font-bold' : ''}
                `}
                >
                    <span className="text-sm z-10">{d}</span>
                    {hasData && !isSelected && (
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-0.5"></div>
                    )}
                    {isToday && !isSelected && (
                        <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-400"></div>
                    )}
                </button>
            );
        }
        return days;
    };

    return (
        <Modal onClose={onClose} maxWidth="max-w-xs">
            <div className="p-2 animate-fadeIn">
                {/* Header */}
                <div className="flex justify-between items-center mb-4 px-2">
                    <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500"><ChevronLeft size={20} /></button>
                    <h3 className="font-bold text-gray-800 text-lg capitalize">{monthNames[month]} {year}</h3>
                    <button onClick={handleNextMonth} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500"><ChevronRight size={20} /></button>
                </div>

                {/* Week Days */}
                <div className="grid grid-cols-7 mb-2 text-center">
                    {weekDays.map((d, i) => (
                        <div key={i} className="text-xs font-bold text-gray-400 py-1">{d}</div>
                    ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1 mb-4">
                    {generateDays()}
                </div>

                <div className="flex items-center gap-4 text-[10px] text-gray-400 px-2 justify-center">
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-indigo-400"></div> Registros</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#19e66f]"></div> Seleccionado</div>
                </div>
            </div>
        </Modal>
    );
};
