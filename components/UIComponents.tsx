import React, { useState, useRef, useEffect } from 'react';
import { X, CheckSquare, CalendarDays, History, GripHorizontal } from 'lucide-react';
import { IHabitStats } from '../types';

interface ModalProps {
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
  noBackdrop?: boolean;
  draggable?: boolean; // New prop
}

export const Modal: React.FC<ModalProps> = ({ onClose, children, maxWidth = "max-w-3xl", noBackdrop = false, draggable = false }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!draggable) return;
    // Only allow dragging from the header area
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center ${noBackdrop ? 'pointer-events-none' : 'bg-black/20 p-4'}`}>
      <div
        className={`
            ${maxWidth} w-full bg-[#f6f8f7] rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] 
            border border-gray-200 overflow-hidden transform transition-transform 
            pointer-events-auto flex flex-col max-h-[90vh]
        `}
        style={draggable ? { transform: `translate(${position.x}px, ${position.y}px)` } : {}}
      >
        {/* Header / Drag Handle */}
        <div
          onMouseDown={handleMouseDown}
          className={`flex justify-between items-center p-3 border-b border-gray-100 bg-[#f6f8f7] ${draggable ? 'cursor-move' : ''}`}
        >
          {draggable ? (
            <div className="flex items-center gap-2 text-gray-400 px-2">
              <GripHorizontal size={20} />
            </div>
          ) : <div></div>}

          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-8 md:px-8 md:pb-8 overflow-y-auto custom-scrollbar bg-[#f6f8f7]">
          {children}
        </div>
      </div>
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: string;
  detail?: string;
  color: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ title, value, detail, color }) => (
  <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between h-full">
    <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{title}</div>
    <div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      {detail && <div className="text-[10px] text-gray-400 font-medium mt-0.5">{detail}</div>}
    </div>
  </div>
);

interface TurnoBarProps {
  label: string;
  pct: number;
  color: string;
}

export const TurnoBar: React.FC<TurnoBarProps> = ({ label, pct, color }) => (
  <div className="mb-3 last:mb-0">
    <div className="flex justify-between text-xs mb-1">
      <span className="text-gray-500">{label}</span>
      <span className="font-bold text-gray-700">{pct}%</span>
    </div>
    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full ${color}`} style={{ width: `${pct}%` }}></div>
    </div>
  </div>
);

interface HabitCardProps {
  name: string;
  stats: IHabitStats;
}

export const HabitCard: React.FC<HabitCardProps> = ({ name, stats }) => {
  // Calculate Streak
  let streak = 0;
  if (stats.history) {
    const revHistory = [...stats.history].reverse(); // Newest first
    for (const day of revHistory) {
      if (day.status) streak++;
      else break;
    }
  }

  // Get last 14 days for visualization
  const recentHistory = stats.history ? stats.history.slice(-14) : [];

  return (
    <div className="bg-white rounded-2xl p-5 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-gray-50 hover:border-[#19e66f]/30 transition-all group cursor-default">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-sm ${stats.checks > 0 ? 'bg-[#19e66f]/10 text-[#12a850]' : 'bg-gray-100 text-gray-400'}`}>
            <CheckSquare size={20} />
          </div>
          <div>
            <h4 className="font-bold text-[#0e1b13] text-base">{name}</h4>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-medium">Hábito Diario</span>
              {streak > 1 && (
                <span className="px-1.5 py-0.5 bg-orange-100 text-orange-600 text-[10px] font-bold rounded-full">
                  🔥 {streak} días
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="text-right">
          <span className="block text-2xl font-black text-[#0e1b13] leading-none">{stats.pct}%</span>
          <span className="text-[10px] font-bold text-[#19e66f] uppercase tracking-wide">Cumplimiento</span>
        </div>
      </div>

      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
        <div className={`h-full rounded-full ${stats.pct >= 70 ? 'bg-[#19e66f]' : 'bg-gray-400'}`} style={{ width: `${stats.pct}%` }}></div>
      </div>

      {/* HEATMAP VISUALIZATION */}
      <div className="mb-4">
        <div className="flex justify-between items-end mb-1">
          <span className="text-[10px] text-gray-400 font-bold uppercase">Últimos 14 días</span>
        </div>
        <div className="flex gap-1 justify-between">
          {recentHistory.map((day, idx) => (
            <div
              key={idx}
              className={`h-6 w-full rounded-sm transition-all hover:scale-110 cursor-help ${day.status ? 'bg-[#19e66f]' : 'bg-gray-100'}`}
              title={`${day.date}: ${day.status ? 'Completado' : 'No realizado'}`}
            ></div>
          ))}
          {/* Fill specific empty slots if history is short */}
          {Array.from({ length: Math.max(0, 14 - recentHistory.length) }).map((_, i) => (
            <div key={`empty-${i}`} className="h-6 w-full rounded-sm bg-gray-50 border border-gray-100"></div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-y-3 gap-x-6 pt-4 border-t border-gray-50">
        <div className="flex flex-col">
          <span className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Analizados</span>
          <div className="flex items-center gap-1.5">
            <CalendarDays size={12} className="text-gray-400" />
            <span className="text-xs font-bold text-gray-700">{stats.total} días</span>
          </div>
        </div>
        <div className="flex flex-col text-right">
          <span className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Última Vez</span>
          <div className="flex items-center justify-end gap-1.5">
            <span className="text-xs font-bold text-gray-700">{stats.last}</span>
            <History size={12} className="text-gray-400" />
          </div>
        </div>

        <div className="col-span-2 pt-2 border-t border-gray-50 flex justify-between items-center mt-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase">Tiempo Pasado</span>
          <span className="text-xs font-bold text-indigo-600">{stats.timePassed}</span>
        </div>
      </div>
    </div>
  );
};

export const SleepGauge: React.FC<{ value: number }> = ({ value }) => {
  let quality = "Regular";
  let color = "#fbbf24";
  let rotation = 0;

  if (value < 6 || value > 8) {
    quality = "Mala";
    color = "#ef4444";
    rotation = -60;
  } else {
    quality = "Buena";
    color = "#10b981";
    rotation = 60;
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-14 overflow-hidden mx-auto mt-2">
        <div className="absolute w-28 h-28 rounded-full border-[12px] border-gray-100 top-0 left-0"
          style={{ borderTopColor: '#ef4444', borderRightColor: '#10b981', borderBottomColor: 'transparent', borderLeftColor: '#fbbf24', transform: 'rotate(-45deg)' }}></div>
        <div className="absolute bottom-0 left-1/2 w-1.5 h-14 bg-gray-600 origin-bottom transition-transform duration-500 shadow-sm"
          style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}></div>
        <div className="absolute bottom-[-6px] left-1/2 w-4 h-4 bg-gray-800 rounded-full transform -translate-x-1/2 border-2 border-white shadow"></div>
      </div>
      <div className="mt-2 text-xs font-bold px-2 py-1 rounded bg-gray-100" style={{ color: color }}>
        {quality}
      </div>
    </div>
  );
};

export const PowerIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>
);