import React from 'react';
import { Activity, Database } from 'lucide-react';
import { PowerIcon } from './UIComponents';
import { formatTime, getEffectiveStartTime } from '../utils/calculations';
import { IDayData } from '../types';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentData: IDayData; // Updated to receive full data for calculation
  toggleFlujo: () => void;
  onOpenTimeModal: () => void;
  onOpenDBSetup: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  currentData,
  onOpenTimeModal,
  onOpenDBSetup
}) => {
  // Calculate effective start time (deduced or manual)
  const effectiveStart = getEffectiveStartTime(currentData);
  const isAuto = currentData.config.horaArranque === null;

  return (
    <header className="sticky top-0 z-50 bg-[#f6f8f7]/80 backdrop-blur-md border-b border-[#e7f3ec] px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-xl bg-[#19e66f]/20 text-[#12a850]">
            <Activity size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#0e1b13]">Bienestar<span className="text-[#19e66f]">OS</span></h1>
        </div>

        <nav className="hidden md:flex items-center gap-2 bg-white/50 p-1 rounded-lg">
          {['dashboard', 'registros', 'habitos'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 text-sm font-semibold rounded-md capitalize transition-all ${activeTab === tab ? 'bg-white shadow-sm text-[#19e66f]' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {tab}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button onClick={onOpenTimeModal} className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#0e1b13] text-white text-xs font-bold rounded-lg hover:bg-gray-800 transition">
            <PowerIcon /> {formatTime(effectiveStart)} {isAuto ? "(Auto)" : ""}
          </button>
          <button onClick={onOpenDBSetup} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition shadow-sm" title="Configurar Base de Datos">
            <Database size={16} />
          </button>
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
            AD
          </div>
        </div>
      </div>
    </header>
  );
};