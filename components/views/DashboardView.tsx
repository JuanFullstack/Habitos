import React, { useState } from 'react';
import { Clock, Brain, Activity, Sunrise, Sunset, Eye, EyeOff, Zap, Layers, Plus } from 'lucide-react';
import { MetricCard, TurnoBar, SleepGauge } from '../UIComponents';
import ChartCanvas from '../ChartCanvas';
import { IDayData, IMetrics } from '../../types';
import { CONFIG } from '../../constants';
import { formatTime, getEffectiveStartTime } from '../../utils/calculations';

interface DashboardViewProps {
  currentData: IDayData;
  metrics: IMetrics;
  updateDayData: (data: IDayData) => void;
  onOpenActModal: () => void;
  onOpenStateModal: () => void;
  onOpenActionModal: () => void;
  onOpenFlowModal: () => void;
  onOpenMasterModal?: () => void; // New prop
  onOpenTimeModal: (type: 'arranque' | 'finDia' | 'horasSueno') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentData,
  metrics,
  updateDayData,
  onOpenActModal,
  onOpenStateModal,
  onOpenActionModal,
  onOpenFlowModal,
  onOpenMasterModal,
  onOpenTimeModal
}) => {
  const [chartMode, setChartMode] = useState<'area' | 'lines'>('area');

  // Manage visibility of individual lines for 'lines' mode
  const [visibleLines, setVisibleLines] = useState<Record<string, boolean>>(() => {
    const keys = Object.keys(CONFIG.lineColors);
    const init: Record<string, boolean> = {};
    keys.forEach(k => init[k] = true);
    return init;
  });

  const toggleLine = (key: string) => {
    setVisibleLines(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAllLines = () => {
    // If any is hidden, show all. If all are visible, hide all.
    const allVisible = Object.values(visibleLines).every(v => v);
    const newState: Record<string, boolean> = {};
    Object.keys(visibleLines).forEach(k => newState[k] = !allVisible);
    setVisibleLines(newState);
  };

  const areAllVisible = Object.values(visibleLines).every(v => v);

  // Determine Start Time display
  const effectiveStart = getEffectiveStartTime(currentData);
  const isAutoStart = currentData.config.horaArranque === null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fadeIn">
      {/* Left Column */}
      <div className="lg:col-span-3 space-y-6">
        {/* Action Bar */}
        {/* Central Action Bar */}
        <div className="flex justify-center mb-2">
          <button
            onClick={onOpenMasterModal}
            className="w-full md:w-auto px-6 py-4 bg-[#0e1b13] hover:bg-black text-white font-black text-sm md:text-base tracking-wide rounded-2xl shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)] flex items-center justify-center gap-3 transition-all transform hover:-translate-y-1 active:scale-95 group"
          >
            <div className="p-1 bg-[#19e66f] rounded-lg text-[#0e1b13] group-hover:rotate-90 transition-transform duration-300">
              <Plus size={20} strokeWidth={4} />
            </div>
            AGREGAR REGISTRO
          </button>
        </div>

        {/* Metrics Grid */}
        {/* Metrics - scrollable row on mobile */}
        <div className="flex md:grid md:grid-cols-5 gap-2 md:gap-3 overflow-x-auto md:overflow-visible pb-2 md:pb-0 -mx-1 px-1 snap-x snap-mandatory">
          <div className="min-w-[140px] md:min-w-0 snap-start"><MetricCard title="Aprovechado" value={metrics.aprovechadoPct + "%"} detail={`(${metrics.valDisp} / 17h)`} color="text-indigo-600" /></div>
          <div className="min-w-[140px] md:min-w-0 snap-start"><MetricCard title="Útil" value={metrics.utilPct + "%"} detail={`(${metrics.valUtil} / ${metrics.valDisp}h)`} color="text-blue-600" /></div>
          <div className="min-w-[140px] md:min-w-0 snap-start"><MetricCard title="Justificado" value={metrics.justificadoPct + "%"} detail={`(${metrics.valJust}h)`} color="text-teal-600" /></div>
          <div className="min-w-[140px] md:min-w-0 snap-start"><MetricCard title="Sin Registro" value={metrics.vacioPct + "%"} detail={`(${metrics.valVacio}h)`} color="text-gray-400" /></div>
          <div className="min-w-[140px] md:min-w-0 snap-start"><MetricCard title="Inútil" value={metrics.inutilPct + "%"} detail="Ocio > 1h" color="text-red-500" /></div>
        </div>

        {/* Chart */}
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-gray-50 p-3 md:p-6 relative">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
                <Activity size={18} />
              </div>
              <h2 className="text-lg font-bold text-[#0e1b13]">Monitor Diario</h2>
            </div>

            <div className="flex-1 flex justify-center">
              {chartMode === 'lines' && (
                <div className="hidden sm:flex flex-wrap justify-center items-center gap-2 text-[10px]">
                  {Object.keys(CONFIG.lineColors).map(key => (
                    <button
                      key={key}
                      onClick={() => toggleLine(key)}
                      className={`flex items-center px-2 py-1 rounded-full border transition-all ${visibleLines[key]
                        ? 'bg-white border-gray-200 shadow-sm opacity-100 scale-100'
                        : 'bg-transparent border-transparent opacity-40 grayscale scale-95'
                        }`}
                    >
                      <div className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: CONFIG.lineColors[key as keyof typeof CONFIG.lineColors] }}></div>
                      <span className="capitalize font-bold text-gray-600">{key}</span>
                    </button>
                  ))}
                  <button
                    onClick={toggleAllLines}
                    className="ml-2 px-2 py-1.5 flex items-center gap-1.5 text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg font-bold transition-colors"
                    title={areAllVisible ? "Ocultar Todas" : "Mostrar Todas"}
                  >
                    {areAllVisible ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                </div>
              )}
              {chartMode === 'area' && (
                <div className="hidden sm:flex text-[10px] gap-3">
                  <span className="flex items-center text-gray-500"><div className="w-2 h-2 rounded-full bg-red-400 mr-1"></div>Bajo</span>
                  <span className="flex items-center text-gray-500"><div className="w-2 h-2 rounded-full bg-yellow-400 mr-1"></div>Medio</span>
                  <span className="flex items-center text-gray-500"><div className="w-2 h-2 rounded-full bg-green-400 mr-1"></div>Alto</span>
                </div>
              )}
            </div>

            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button onClick={() => setChartMode('area')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${chartMode === 'area' ? 'bg-white shadow-sm text-[#0e1b13]' : 'text-gray-400'}`}>Área</button>
              <button onClick={() => setChartMode('lines')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${chartMode === 'lines' ? 'bg-white shadow-sm text-[#0e1b13]' : 'text-gray-400'}`}>Líneas</button>
            </div>
          </div>

          {/* Chart - scrollable on mobile for visibility */}
          <div className="relative w-full overflow-x-auto md:overflow-visible">
            <div className="relative w-[700px] md:w-full h-[350px] md:h-[550px]">
              <ChartCanvas
                data={currentData}
                mode={chartMode}
                config={CONFIG}
                isAggregated={currentData.isAggregated}
                visibleLines={visibleLines}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right Column (Sidebar) */}
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
          <h4 className="text-xs font-bold text-gray-400 uppercase mb-4">Calidad de Sueño</h4>
          <SleepGauge value={currentData.config.horasSueno || 7} />
          <div className="mt-2 text-xl font-bold text-[#19e66f]">{currentData.config.horasSueno || 0}h</div>
          <div className="mt-3">
            <button onClick={() => onOpenTimeModal('horasSueno')} className="px-3 py-1.5 bg-gray-50 text-gray-600 text-[10px] font-bold rounded-md hover:bg-gray-100 border border-gray-200 shadow-sm">
              Set Horas
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Productividad</h4>
          <TurnoBar label="Mañana" pct={metrics.prodMorning} color="bg-blue-400" />
          <TurnoBar label="Tarde" pct={metrics.prodAfternoon} color="bg-orange-400" />
          <TurnoBar label="Noche" pct={metrics.prodNight} color="bg-indigo-400" />
        </div>

        <div className="space-y-3">
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Sunrise size={18} /></div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Arranque</span>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold text-indigo-900">{formatTime(effectiveStart)}</span>
                  {isAutoStart && <span className="text-[9px] bg-gray-100 text-gray-500 px-1 rounded border border-gray-200" title="Deducido Automáticamente">A</span>}
                </div>
              </div>
            </div>
            <button onClick={() => onOpenTimeModal('arranque')} className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded-md hover:bg-indigo-700">Set</button>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><Sunset size={18} /></div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Fin del Día</span>
                <span className="text-sm font-bold text-orange-900">{currentData.config.finDia ? formatTime(currentData.config.finDia) : "--:--"}</span>
              </div>
            </div>
            <button onClick={() => onOpenTimeModal('finDia')} className="px-3 py-1 bg-orange-500 text-white text-[10px] font-bold rounded-md hover:bg-orange-600">Set</button>
          </div>
        </div>
      </div>
    </div>
  );
};