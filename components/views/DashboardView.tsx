import React, { useState } from 'react';
import { Clock, Brain, Activity, Sunrise, Sunset, Eye, EyeOff, Zap, Layers, Plus, ZoomIn, ZoomOut, Settings } from 'lucide-react';
import { MetricCard, TurnoBar, SleepGauge } from '../UIComponents';
import ChartCanvas from '../ChartCanvas';
import { IDayData, IMetrics, TimeRange } from '../../types';
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
  onOpenMasterModal?: () => void;
  onOpenTimeModal: (type: 'arranque' | 'finDia' | 'horasSueno') => void;
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  onOpenDateModal: () => void;
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
  onOpenTimeModal,
  timeRange,
  setTimeRange,
  onOpenDateModal
}) => {
  const [chartMode, setChartMode] = useState<'area' | 'lines'>('area');
  const [zoomLevel, setZoomLevel] = useState(1); // 1 = 100% width (fit), >1 = horizontal scroll
  const [showMetricsModal, setShowMetricsModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

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
    const allVisible = Object.values(visibleLines).every(v => v);
    const newState: Record<string, boolean> = {};
    Object.keys(visibleLines).forEach(k => newState[k] = !allVisible);
    setVisibleLines(newState);
  };

  const areAllVisible = Object.values(visibleLines).every(v => v);
  const effectiveStart = getEffectiveStartTime(currentData);
  const isAutoStart = currentData.config.horaArranque === null;

  // Handler for Lines button on mobile
  const handleLinesClick = () => {
    setChartMode('lines');
    if (window.innerWidth < 768) {
      setShowFilterModal(true);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fadeIn">
      {/* Left Column */}
      <div className="lg:col-span-3 space-y-0 md:space-y-6">

        {/* Metrics Grid - HIDDEN ON MOBILE (Now in Modal) */}
        <div className="hidden md:grid grid-cols-4 md:grid-cols-5 gap-1 md:gap-3 pb-0 md:pb-0 mb-0">
          {/* Primary Metrics */}
          <div className="min-w-0"><MetricCard title="Aprovechado" value={metrics.aprovechadoPct + "%"} detail={`(${metrics.valDisp})`} color="text-indigo-600" /></div>
          <div className="min-w-0"><MetricCard title="Útil" value={metrics.utilPct + "%"} detail={`(${metrics.valUtil})`} color="text-blue-600" /></div>
          <div className="min-w-0"><MetricCard title="Justificado" value={metrics.justificadoPct + "%"} detail={`(${metrics.valJust})`} color="text-teal-600" /></div>
          <div className="min-w-0"><MetricCard title="Sin Reg." value={metrics.vacioPct + "%"} detail={`(${metrics.valVacio})`} color="text-gray-400" /></div>
          <div className="min-w-0"><MetricCard title="Inútil" value={metrics.inutilPct + "%"} detail=">1h" color="text-red-500" /></div>
        </div>

        {/* Chart Container */}
        <div className="bg-white rounded-xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-gray-50 p-1 md:p-6 relative mt-0">
          <div className="flex justify-between items-center mb-1 md:mb-6">
            <div className="hidden md:flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
                <Activity size={18} />
              </div>
              <h2 className="text-lg font-bold text-[#0e1b13]">Monitor Diario</h2>
            </div>

            {/* Desktop Legend/Controls */}
            <div className="flex-1 flex justify-center">
              {chartMode === 'lines' && (
                <div className="hidden md:flex justify-center items-center gap-2">
                  <button
                    onClick={() => setShowFilterModal(true)}
                    className="px-3 py-1.5 flex items-center gap-2 text-[10px] font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-all shadow-sm"
                  >
                    <Settings size={14} />
                    Configurar Líneas ({Object.values(visibleLines).filter(Boolean).length})
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Toolbar */}
            <div className="flex bg-gray-100 p-1 rounded-lg items-center gap-2 w-full md:w-auto justify-between md:justify-end">

              {/* Mobile: Stats Button */}
              <button
                onClick={() => setShowMetricsModal(true)}
                className="md:hidden p-2 text-gray-600 bg-white rounded-md shadow-sm border border-gray-200"
              >
                <Layers size={16} />
              </button>

              {/* Mobile Zoom Control */}
              <div className="md:hidden flex items-center gap-1 px-2 border-r border-gray-300 mx-1 flex-1 justify-center">
                <ZoomOut size={14} className="text-gray-400" />
                <input
                  type="range"
                  min="1" max="4" step="0.1"
                  value={zoomLevel}
                  onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
                  className="w-full max-w-[80px] h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-[#19e66f]"
                />
                <ZoomIn size={14} className="text-gray-400" />
              </div>

              {/* Chart Type Toggles */}
              <div className="flex gap-1">
                <button onClick={() => setChartMode('area')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${chartMode === 'area' ? 'bg-white shadow-sm text-[#0e1b13]' : 'text-gray-400'}`}>Área</button>
                <button
                  onClick={handleLinesClick}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${chartMode === 'lines' ? 'bg-white shadow-sm text-[#0e1b13]' : 'text-gray-400'}`}
                >
                  Líneas
                  {chartMode === 'lines' && <span className="md:hidden text-[9px] bg-gray-200 px-1 rounded-full">▼</span>}
                </button>
              </div>
            </div>
          </div>

          {/* Chart Canvas */}
          <div className="relative w-full overflow-x-auto md:overflow-visible pb-0 pt-2 [&::-webkit-scrollbar]:hidden scrollbar-none md:mt-0 touch-pan-y">
            <div
              className="relative h-[480px] md:h-[550px] transition-all duration-300 ease-out origin-left"
              style={{ width: `${zoomLevel * 100}%`, minWidth: '100%' }}
            >
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

      {/* Right Column (Sidebar - Desktop Only) */}
      <div className="hidden md:block lg:col-span-1 space-y-4">
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
          {/* Start/End Time Controls (Desktop) */}
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

      {/* --- MOBILE MODALS --- */}

      {/* 1. Full Screen Stats Modal - Redesigned */}
      {showMetricsModal && (
        <div className="fixed inset-0 z-50 bg-[#f6f8f7] animate-fadeIn flex flex-col">
          <div className="bg-white px-4 py-4 border-b flex justify-between items-center shadow-sm sticky top-0 z-10">
            <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2">
              <Layers size={24} className="text-[#19e66f]" /> Estadísticas
            </h3>
            <button
              onClick={() => setShowMetricsModal(false)}
              className="p-2 bg-gray-50 rounded-full text-gray-500 hover:bg-gray-100 border border-gray-100"
            >
              ✕
            </button>
          </div>

          {/* Internal Time Filters */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex overflow-x-auto gap-2 scrollbar-none sticky top-[0px] z-20 shadow-sm">
            {(['HOY', 'DÍA', 'SEMANA', 'MES', 'AÑO', 'HIST'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => {
                  setTimeRange(range);
                  if (range === 'DÍA') onOpenDateModal();
                }}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all whitespace-nowrap border ${timeRange === range
                  ? 'bg-[#19e66f] text-[#0e1b13] border-[#19e66f] shadow-md transform scale-105'
                  : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'
                  }`}
              >
                {range}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50/50">

            {/* Main Stats Group */}
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <MetricCard title="Aprovechado" value={metrics.aprovechadoPct + "%"} detail={`(${metrics.valDisp})`} color="text-indigo-600" size="lg" />
              <MetricCard title="Útil" value={metrics.utilPct + "%"} detail={`(${metrics.valUtil})`} color="text-blue-600" size="lg" />
              <MetricCard title="Justificado" value={metrics.justificadoPct + "%"} detail={`(${metrics.valJust})`} color="text-teal-600" size="lg" />
              <MetricCard title="Sin Reg." value={metrics.vacioPct + "%"} detail={`(${metrics.valVacio})`} color="text-gray-400" size="lg" />
            </div>

            {/* Productivity Section */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <h4 className="text-sm font-bold text-gray-400 uppercase mb-4 tracking-wider">Productividad por Turno</h4>
              <div className="space-y-4">
                <TurnoRow label="Mañana" pct={metrics.prodMorning} />
                <TurnoRow label="Tarde" pct={metrics.prodAfternoon} />
                <TurnoRow label="Noche" pct={metrics.prodNight} />
              </div>
            </div>

            {/* Schedules & Sleep */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <h4 className="text-sm font-bold text-gray-400 uppercase mb-4 tracking-wider">Configuración Diaria</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm text-green-600"><Sunrise size={20} /></div>
                    <span className="font-bold text-gray-700">Arranque</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold text-gray-800">{formatTime(currentData.config.horaArranque || 7)}</span>
                    <button onClick={() => { onOpenTimeModal('arranque'); setShowMetricsModal(false); }} className="text-xs bg-white px-2 py-1 rounded border shadow-sm font-bold text-indigo-600">Edit</button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm text-orange-600"><Sunset size={20} /></div>
                    <span className="font-bold text-gray-700">Fin Día</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold text-gray-800">{formatTime(currentData.config.finDia || 23.5)}</span>
                    <button onClick={() => { onOpenTimeModal('finDia'); setShowMetricsModal(false); }} className="text-xs bg-white px-2 py-1 rounded border shadow-sm font-bold text-orange-600">Edit</button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm text-purple-600"><Clock size={20} /></div>
                    <span className="font-bold text-gray-700">Sueño</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold text-gray-800">{currentData.config.horasSueno || 7}h</span>
                    <button onClick={() => { onOpenTimeModal('horasSueno'); setShowMetricsModal(false); }} className="text-xs bg-white px-2 py-1 rounded border shadow-sm font-bold text-purple-600">Edit</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Line Filter Modal - Centered Update */}
      {showFilterModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn" onClick={() => setShowFilterModal(false)}>
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl max-h-[85vh] overflow-y-auto flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 border-b pb-4 sticky top-0 bg-white z-10">
              <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                <Zap size={20} className="text-orange-500" /> Filtros de Línea
              </h3>
              <button onClick={() => setShowFilterModal(false)} className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-sm font-bold hover:bg-indigo-100 transition-colors">Listo</button>
            </div>

            <div className="space-y-3 pb-2">
              <button
                onClick={toggleAllLines}
                className={`w-full p-4 flex items-center justify-between rounded-xl font-bold transition-all border-2 ${areAllVisible
                  ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100'
                  : 'bg-green-50 text-green-600 border-green-100 hover:bg-green-100'
                  }`}
              >
                <span>{areAllVisible ? "Ocultar Todas" : "Mostrar Todas"}</span>
                {areAllVisible ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>

              <div className="grid grid-cols-1 gap-3">
                {Object.keys(CONFIG.lineColors).map(key => (
                  <button
                    key={key}
                    onClick={() => toggleLine(key)}
                    className={`flex items-center justify-between p-3 px-4 rounded-xl border-2 transition-all ${visibleLines[key]
                      ? 'bg-white border-indigo-100 shadow-md transform scale-[1.02]'
                      : 'bg-gray-50 border-transparent opacity-60'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full shadow-sm ring-2 ring-white" style={{ backgroundColor: CONFIG.lineColors[key as keyof typeof CONFIG.lineColors] }}></div>
                      <span className="capitalize font-bold text-base text-gray-700">{key}</span>
                    </div>
                    {visibleLines[key] && <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xs">✓</div>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper internal component for Productivity Rows
const TurnoRow = ({ label, pct }: { label: string, pct: number }) => (
  <div className="flex items-center gap-3">
    <span className="w-16 text-sm font-bold text-gray-500">{label}</span>
    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full ${pct >= 50 ? 'bg-green-500' : pct >= 30 ? 'bg-yellow-400' : 'bg-red-400'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
    <span className="w-10 text-right text-sm font-bold text-gray-700">{pct}%</span>
  </div>
);