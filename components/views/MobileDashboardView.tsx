import React, { useState, useEffect } from 'react';
import { ZoomIn, ZoomOut, BarChart3, PlusCircle, Zap, Activity, Brain } from 'lucide-react';
import ChartCanvas from '../ChartCanvas';
import { CONFIG, CATEGORIAS_ACTIVIDAD, VARIABLES_EMOCIONALES } from '../../constants';
import { IDayData, IMetrics } from '../../types';
import { MetricCard } from '../UIComponents';
import { getHabitStats } from '../../utils/calculations';

interface MobileDashboardViewProps {
  currentData: IDayData;
  metrics: IMetrics;
  handlers: {
    addActivity: (form: any, id: null) => void;
    addState: (form: any, id: null) => void;
    addEvent: (data: any) => void;
    toggleFlujo: () => void;
  };
  db: any; // For habits
}

const ACTION_PRESETS = [
    { label: 'Meditación 12', icon: '🧘‍♀️', duration: 0.2 },
    { label: 'Meditación 30', icon: '☯️', duration: 0.5 },
    { label: 'Reflexión', icon: '💡', duration: 0 }, // Duration handled by slider
    { label: 'Cambio', icon: '♻️', duration: 0.1 },
    { label: 'Negativo', icon: '⛔', duration: 0.1 }
];

export const MobileDashboardView: React.FC<MobileDashboardViewProps> = ({ 
  currentData, metrics, handlers, db 
}) => {
  // --- VIEW STATE ---
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panelMode, setPanelMode] = useState<'load' | 'info'>('load');
  const [loadTab, setLoadTab] = useState<'act' | 'state' | 'action'>('act');
  const [isPanelExpanded, setIsPanelExpanded] = useState(true);

  // --- FORM STATE ---
  const [actForm, setActForm] = useState({ categoria: '', tipo: '', desc: '', inicio: '', fin: '', isFlow: false });
  const [stForm, setStForm] = useState({ energia: 75, contexto: '', variables: {} as any, inicio: '', fin: '' });
  const [actionForm, setActionForm] = useState({ label: '', icon: '', inicio: '', desc: '' });
  
  // Reflection State
  const [reflexionDuration, setReflexionDuration] = useState(1.0);

  // Init State Vars
  useEffect(() => {
    const vars: any = {};
    VARIABLES_EMOCIONALES.forEach(v => vars[v] = 0);
    setStForm(prev => ({...prev, variables: vars}));
  }, []);

  // Auto-fill Times Logic
  useEffect(() => {
    // Helper to get last time or default to 7.0
    const getLastTime = (list: any[]) => {
        if (list && list.length > 0) {
            const last = list[list.length - 1];
            // Ensure we handle objects that might have 'fin' or just 't'
            const endTime = last.fin !== undefined ? last.fin : (last.t + 1);
            return parseFloat(endTime);
        }
        return 7.0; // Default start time
    };

    const nextActStart = getLastTime(currentData.actividades);
    const nextStStart = getLastTime(currentData.estados);
    
    // For actions, prioritize the event timeline if exists, else sync with activity
    const nextActionStart = currentData.eventos.length > 0 
        ? getLastTime(currentData.eventos) 
        : nextActStart;
    
    // Format Strings
    const sAct = nextActStart.toFixed(1);
    const fAct = (nextActStart + 1).toFixed(1);

    const sSt = nextStStart.toFixed(1);
    const fSt = (nextStStart + 1).toFixed(1);
    
    const sAction = nextActionStart.toFixed(1);

    setActForm(f => ({ ...f, inicio: sAct, fin: fAct }));
    setStForm(f => ({ ...f, inicio: sSt, fin: fSt }));
    setActionForm(f => ({ ...f, inicio: sAction }));

  }, [currentData.actividades, currentData.estados, currentData.eventos]);


  // --- HANDLERS ---
  const handleActSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
        const catObj = CATEGORIAS_ACTIVIDAD.find(c => c.id === actForm.categoria);
        const optObj = catObj?.opciones.find(o => o.value === actForm.tipo);
        
        // Single atomic call
        handlers.addActivity({
            ...actForm,
            label: optObj?.label,
            color: catObj?.color
        }, null);

        setActForm(prev => ({...prev, desc: '', isFlow: false}));
        alert("Guardado");
    } catch(err: any) { alert(err.message); }
  };

  const handleStSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
        handlers.addState(stForm, null);
        alert("Estado Guardado");
    } catch(err: any) { alert(err.message); }
  };

  const handleActionSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      try {
          const startT = parseFloat(actionForm.inicio);
          
          // COMPLEX LOGIC FOR MEDITATION
          if (actionForm.label.includes('Meditación')) {
              const midT = startT + 0.5;
              const duration = actionForm.label.includes('30') ? 0.5 : 0.2; // Event duration

              // State 1
              handlers.addState({
                 energia: 40, contexto: 'Meditación Inicio', expNegativa: false,
                 variables: { Ri: 4, Voluntad: 2, Distracción: 4, Horus: 2, Energía: 2 },
                 inicio: startT.toFixed(1), fin: midT.toFixed(1)
              }, null);
              
              // State 2
              handlers.addState({
                 energia: 65, contexto: 'Meditación Fin', expNegativa: false,
                 variables: { Ri: 4, Voluntad: 4, Distracción: 1, Horus: 3, Energía: 3 },
                 inicio: midT.toFixed(1), fin: (midT + 0.5).toFixed(1)
              }, null);

              // Event
              handlers.addEvent({
                  label: actionForm.label, icon: actionForm.icon,
                  t: startT, fin: startT + duration, descripcion: actionForm.desc
              });

          } else if (actionForm.label === 'Reflexión') {
              // REFLECTION LOGIC
              const endT = startT + reflexionDuration;

              handlers.addState({
                 energia: 100, contexto: 'Reflexión', expNegativa: false,
                 variables: { Ri: 0, Voluntad: 0, Distracción: 0, Horus: 0, Energía: 5 },
                 inicio: startT.toFixed(1), fin: endT.toFixed(1)
              }, null);

              handlers.addActivity({
                 categoria: 'general', tipo: 'reflexion', desc: 'Reflexión',
                 inicio: startT.toFixed(1), fin: endT.toFixed(1), isFlow: true,
                 label: 'Reflexión', color: CATEGORIAS_ACTIVIDAD.find(c => c.id === 'general')?.color
              }, null);

              handlers.addEvent({
                  label: actionForm.label, icon: actionForm.icon,
                  t: startT, fin: endT, descripcion: 'Reflexión'
              });

          } else {
              // STANDARD ACTION
              const preset = ACTION_PRESETS.find(p => p.label === actionForm.label);
              const duration = preset ? preset.duration : 0.1;
              handlers.addEvent({
                  label: actionForm.label, icon: actionForm.icon,
                  t: startT, fin: startT + duration, descripcion: actionForm.desc
              });
          }

          setActionForm(prev => ({...prev, label: '', icon: '', desc: ''}));
          setReflexionDuration(1.0);
          alert("Acción Guardada");
      } catch(err: any) { alert(err.message); }
  };

  const toggleZoom = () => {
      setZoomLevel(prev => prev >= 3 ? 1 : prev + 1);
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-gray-900 overflow-hidden relative">
      
      {/* --- PART 1: CHART SECTION (TOP) --- */}
      <div className={`relative transition-all duration-300 w-full ${isPanelExpanded ? 'h-[40%]' : 'h-[88%]'}`}>
        
        {/* Zoom Controls Overlay */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
            <button onClick={toggleZoom} className="p-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white shadow-lg active:scale-95 transition-transform">
                {zoomLevel === 1 ? <ZoomIn size={20}/> : <ZoomOut size={20}/>}
            </button>
            <div className="px-2 py-1 bg-black/40 rounded text-[10px] text-white font-mono text-center">
                {zoomLevel}x
            </div>
        </div>

        {/* Scrollable Chart Container */}
        <div className="w-full h-full overflow-x-auto overflow-y-hidden bg-[#f6f8f7] custom-scrollbar relative">
             <div 
                className="h-full transition-all duration-300 ease-out"
                style={{ width: `${zoomLevel * 100}%` }}
             >
                 <ChartCanvas 
                    data={currentData} 
                    mode="area" 
                    config={CONFIG} 
                    isAggregated={false}
                 />
             </div>
        </div>
      </div>


      {/* --- PART 2: CONTROL PANEL (BOTTOM) --- */}
      <div className={`flex-1 bg-white rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.2)] flex flex-col transition-all duration-300 z-30 relative`}>
        
        {/* Drag Handle / Header */}
        <div 
            onClick={() => setIsPanelExpanded(!isPanelExpanded)}
            className="w-full h-10 flex items-center justify-center cursor-pointer border-b border-gray-100 shrink-0"
        >
            <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
        </div>

        {/* Panel Mode Switcher (Load vs Info) */}
        {isPanelExpanded && (
            <div className="px-6 py-2 flex gap-4 shrink-0">
                <button 
                    onClick={() => setPanelMode('load')}
                    className={`flex-1 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                        panelMode === 'load' ? 'bg-[#19e66f] text-[#0e1b13] shadow-lg shadow-green-200' : 'bg-gray-100 text-gray-400'
                    }`}
                >
                    <PlusCircle size={18}/> Cargar
                </button>
                <button 
                    onClick={() => setPanelMode('info')}
                    className={`flex-1 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                        panelMode === 'info' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-gray-100 text-gray-400'
                    }`}
                >
                    <BarChart3 size={18}/> Info
                </button>
            </div>
        )}

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-6 pb-20 custom-scrollbar">
            
            {/* MODE: LOAD (INPUTS) */}
            {panelMode === 'load' && isPanelExpanded && (
                <div className="space-y-6 animate-fadeIn">
                    {/* Load Type Tabs */}
                    <div className="flex p-1 bg-gray-100 rounded-xl mb-4">
                        <button onClick={() => setLoadTab('act')} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex justify-center items-center gap-2 ${loadTab==='act' ? 'bg-white shadow text-gray-900' : 'text-gray-400'}`}><Activity size={14}/> Actividad</button>
                        <button onClick={() => setLoadTab('state')} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex justify-center items-center gap-2 ${loadTab==='state' ? 'bg-white shadow text-gray-900' : 'text-gray-400'}`}><Brain size={14}/> Estado</button>
                        <button onClick={() => setLoadTab('action')} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex justify-center items-center gap-2 ${loadTab==='action' ? 'bg-white shadow text-gray-900' : 'text-gray-400'}`}><Zap size={14}/> Acciones</button>
                    </div>

                    {loadTab === 'act' && (
                        <form onSubmit={handleActSubmit} className="space-y-5">
                            {/* Time Inputs - High Contrast */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Inicio</label>
                                    <input type="number" step="0.1" value={actForm.inicio} onChange={e=>setActForm({...actForm, inicio: e.target.value})} 
                                        className="w-full p-3 bg-gray-50 rounded-xl font-bold text-gray-900 border-2 border-transparent focus:bg-white focus:border-[#19e66f] focus:ring-0 transition-all text-center text-lg shadow-sm placeholder-gray-400"/>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Fin</label>
                                    <input type="number" step="0.1" value={actForm.fin} onChange={e=>setActForm({...actForm, fin: e.target.value})} 
                                        className="w-full p-3 bg-gray-50 rounded-xl font-bold text-gray-900 border-2 border-transparent focus:bg-white focus:border-[#19e66f] focus:ring-0 transition-all text-center text-lg shadow-sm placeholder-gray-400"/>
                                </div>
                            </div>

                            {/* Category Grid */}
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">Categoría</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {CATEGORIAS_ACTIVIDAD.map(cat => (
                                        <button 
                                            key={cat.id} type="button"
                                            onClick={() => setActForm({...actForm, categoria: cat.id, tipo: ''})}
                                            className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                                                actForm.categoria === cat.id ? 'bg-green-50 border-green-400 text-green-900' : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'
                                            }`}
                                        >
                                            <cat.icon size={20}/>
                                            <span className="text-[10px] font-bold">{cat.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Type Selection - CHIPS instead of Dropdown for Mobile UX */}
                            {actForm.categoria && (
                                <div className="animate-fadeIn">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">Actividad</label>
                                    <div className="flex flex-wrap gap-2">
                                        {CATEGORIAS_ACTIVIDAD.find(c => c.id === actForm.categoria)?.opciones.map(o => (
                                            <button
                                                key={o.value}
                                                type="button"
                                                onClick={() => setActForm({...actForm, tipo: o.value})}
                                                className={`px-4 py-2.5 rounded-full text-xs font-bold border transition-all ${
                                                    actForm.tipo === o.value 
                                                    ? 'bg-gray-800 text-white border-gray-800 shadow-md' 
                                                    : 'bg-white text-gray-600 border-gray-200'
                                                }`}
                                            >
                                                {o.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Flow Toggle */}
                            <div 
                                onClick={() => setActForm({...actForm, isFlow: !actForm.isFlow})}
                                className={`flex items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer ${actForm.isFlow ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-gray-200'}`}
                            >
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${actForm.isFlow ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                    <Zap size={14}/>
                                </div>
                                <span className="font-bold text-sm text-indigo-900">Activar Flujo Simultáneo</span>
                            </div>

                            <button type="submit" disabled={!actForm.tipo} className="w-full py-4 bg-[#19e66f] text-[#0e1b13] font-black text-lg rounded-2xl shadow-xl shadow-green-200 active:scale-95 transition-transform disabled:opacity-50">
                                GUARDAR
                            </button>
                        </form>
                    )}

                    {loadTab === 'state' && (
                         <form onSubmit={handleStSubmit} className="space-y-6">
                            <div className="bg-white border border-gray-200 p-5 rounded-2xl text-center shadow-sm">
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-3">Nivel de Energía</label>
                                <div className="text-4xl font-black text-[#0e1b13] mb-5">{stForm.energia}%</div>
                                <input 
                                    type="range" min="0" max="100" 
                                    className="w-full h-6 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-[#19e66f]"
                                    value={stForm.energia} onChange={e => setStForm({...stForm, energia: parseInt(e.target.value)})}
                                />
                            </div>

                            <div className="space-y-5">
                                {VARIABLES_EMOCIONALES.slice(0, 4).map(v => (
                                    <div key={v} className="flex items-center gap-3">
                                        <label className="w-24 text-xs font-bold text-gray-500">{v}</label>
                                        <input 
                                            type="range" min="0" max="5" 
                                            className="flex-1 h-3 bg-gray-200 rounded-lg accent-indigo-500 cursor-pointer appearance-none"
                                            value={stForm.variables[v] || 0} 
                                            onChange={e => setStForm({...stForm, variables: {...stForm.variables, [v]: parseInt(e.target.value)}})}
                                        />
                                        <span className="w-8 text-center font-bold text-indigo-600 text-lg">{stForm.variables[v] || 0}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Inicio</label>
                                    <input type="number" step="0.1" value={stForm.inicio} onChange={e=>setStForm({...stForm, inicio: e.target.value})} 
                                        className="w-full p-3 bg-gray-50 rounded-xl text-center font-bold text-gray-900 border border-gray-200"/>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Fin</label>
                                    <input type="number" step="0.1" value={stForm.fin} onChange={e=>setStForm({...stForm, fin: e.target.value})} 
                                        className="w-full p-3 bg-gray-50 rounded-xl text-center font-bold text-gray-900 border border-gray-200"/>
                                </div>
                            </div>

                            <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-black text-lg rounded-2xl shadow-xl shadow-indigo-200 active:scale-95 transition-transform">
                                REGISTRAR ESTADO
                            </button>
                         </form>
                    )}

                    {loadTab === 'action' && (
                        <form onSubmit={handleActionSubmit} className="space-y-6">
                             <div className="grid grid-cols-2 gap-3">
                                {ACTION_PRESETS.map(preset => (
                                    <button 
                                        key={preset.label}
                                        type="button" 
                                        onClick={() => setActionForm({...actionForm, label: preset.label, icon: preset.icon})}
                                        className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                                            actionForm.label === preset.label 
                                            ? 'bg-gray-800 text-white border-gray-800 shadow-lg transform scale-[1.02]' 
                                            : 'bg-white text-gray-600 border-gray-200'
                                        }`}
                                    >
                                        <span className="text-3xl">{preset.icon}</span>
                                        <span className="font-bold text-xs">{preset.label}</span>
                                    </button>
                                ))}
                             </div>

                             <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Hora Inicio</label>
                                <input type="number" step="0.1" className="w-full bg-gray-50 border-2 border-transparent focus:bg-white focus:border-yellow-400 rounded-xl p-3 font-bold text-gray-900 text-lg text-center shadow-sm"
                                    value={actionForm.inicio} onChange={e=>setActionForm({...actionForm, inicio: e.target.value})} />
                             </div>
                             
                             {/* SHOW SLIDER ONLY FOR REFLECTION */}
                             {actionForm.label === 'Reflexión' ? (
                                <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-xs font-bold text-yellow-800">Duración Reflexión</label>
                                        <span className="font-black text-yellow-700">{reflexionDuration}h</span>
                                    </div>
                                    <input 
                                        type="range" min="0.5" max="5.0" step="0.5"
                                        className="w-full h-3 bg-yellow-200 rounded-lg appearance-none cursor-pointer accent-yellow-600"
                                        value={reflexionDuration}
                                        onChange={e => setReflexionDuration(parseFloat(e.target.value))}
                                    />
                                    <div className="flex justify-between text-[9px] text-yellow-700 font-bold mt-1">
                                        <span>30m</span><span>5h</span>
                                    </div>
                                </div>
                             ) : (
                                 <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">
                                        Descripción {actionForm.label === 'Negativo' ? '(Requerido)' : '(Opcional)'}
                                    </label>
                                    <input type="text" className={`w-full bg-white border-2 rounded-xl p-3 text-sm text-gray-900 font-medium shadow-sm ${
                                        actionForm.label === 'Negativo' && !actionForm.desc ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-300'
                                    }`} 
                                    placeholder={actionForm.label === 'Negativo' ? "Motivo..." : "Detalles..."}
                                    value={actionForm.desc} onChange={e=>setActionForm({...actionForm, desc: e.target.value})} />
                                 </div>
                             )}
                             
                             <button type="submit" disabled={!actionForm.label || (actionForm.label === 'Negativo' && !actionForm.desc.trim())} 
                                className="w-full py-4 bg-yellow-500 text-white font-black text-lg rounded-2xl hover:bg-yellow-600 shadow-xl shadow-yellow-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform">
                                GUARDAR ACCIÓN
                            </button>
                        </form>
                    )}
                </div>
            )}

            {/* MODE: INFO (METRICS) */}
            {panelMode === 'info' && isPanelExpanded && (
                <div className="space-y-6 animate-fadeIn">
                     <div className="grid grid-cols-2 gap-3">
                        <MetricCard title="Aprovechado" value={metrics.aprovechadoPct + "%"} color="text-indigo-600" />
                        <MetricCard title="Util" value={metrics.utilPct + "%"} color="text-blue-600" />
                        <MetricCard title="Justificado" value={metrics.justificadoPct + "%"} color="text-teal-600" />
                        <MetricCard title="Sin Registro" value={metrics.vacioPct + "%"} color="text-red-500" />
                    </div>
                    
                    <div>
                        <h4 className="font-bold text-gray-400 text-xs uppercase mb-3">Habitos Clave</h4>
                        <div className="grid grid-cols-1 gap-3">
                            {['Arranque', 'Flujo'].map(h => {
                                const def = getHabitStats(db, h, {type: 'activity', match: [h.toLowerCase()]}, 'HOY'); 
                                return <div key={h} className="bg-gray-50 p-3 rounded-xl flex justify-between font-bold text-sm text-gray-900"><span>{h}</span><span>{def.pct}%</span></div>
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};