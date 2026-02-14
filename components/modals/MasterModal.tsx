import React, { useState, useEffect } from 'react';
import { Modal } from '../UIComponents';
import { CATEGORIAS_ACTIVIDAD, VARIABLES_EMOCIONALES } from '../../constants';
import { IDayData } from '../../types';
import { formatTime } from '../../utils/calculations';
import { Clock, Activity, Brain, Zap } from 'lucide-react';

interface MasterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentData: IDayData;
  handlers: {
    addActivity: (form: any, id: null) => void;
    addState: (form: any, id: null) => void;
    addEvent: (data: any) => void;
  };
}

const ACTION_PRESETS = [
    { label: 'Meditación 12', icon: '🧘‍♀️', duration: 0.2 },
    { label: 'Meditación 30', icon: '☯️', duration: 0.5 },
    { label: 'Reflexión', icon: '💡', duration: 0 },
    { label: 'Cambio', icon: '♻️', duration: 0.1 },
    { label: 'Negativo', icon: '⛔', duration: 0.1 }
];

export const MasterModal: React.FC<MasterModalProps> = ({ isOpen, onClose, currentData, handlers }) => {
  const [activeTab, setActiveTab] = useState<'actividad' | 'estado' | 'accion'>('actividad');
  
  // Forms
  const [actForm, setActForm] = useState({ categoria: '', tipo: '', desc: '', inicio: '', fin: '', isFlow: false });
  const [stForm, setStForm] = useState({ energia: 75, contexto: '', variables: {} as any, inicio: '', fin: '' });
  const [actionForm, setActionForm] = useState({ label: '', icon: '', inicio: '', desc: '' });
  
  // Reflection State
  const [reflexionDuration, setReflexionDuration] = useState(1.0);

  // Initialize State Vars
  useEffect(() => {
    const vars: any = {};
    VARIABLES_EMOCIONALES.forEach(v => vars[v] = 0);
    setStForm(prev => ({...prev, variables: vars}));
  }, []);

  // Auto-fill times when data changes or tab changes
  useEffect(() => {
    if (!isOpen) return;

    const getLastTime = (list: any[]) => {
        if (!list || list.length === 0) return 7.0; // DEFAULT TO 7.0
        const last = list[list.length - 1];
        const endTime = last.fin !== undefined ? last.fin : (last.t + 1);
        return parseFloat(endTime);
    };

    const nextActStart = getLastTime(currentData.actividades);
    const nextStStart = getLastTime(currentData.estados);
    
    // For actions, sync with events if they exist, otherwise follow activity flow
    const nextActionStart = currentData.eventos.length > 0 
        ? getLastTime(currentData.eventos) 
        : nextActStart;

    setActForm(f => ({ ...f, inicio: nextActStart.toFixed(1), fin: (nextActStart + 1).toFixed(1) }));
    setStForm(f => ({ ...f, inicio: nextStStart.toFixed(1), fin: (nextStStart + 1).toFixed(1) }));
    setActionForm(f => ({ ...f, inicio: nextActionStart.toFixed(1) }));

  }, [isOpen, currentData.actividades, currentData.estados, currentData.eventos]);


  // Handlers
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

        // Reset specific fields only
        setActForm(prev => ({...prev, desc: '', isFlow: false})); 
    } catch(err: any) { alert(err.message); }
  };

  const handleStSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
        handlers.addState(stForm, null);
    } catch(err: any) { alert(err.message); }
  };

  const handleActionSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      try {
          const startT = parseFloat(actionForm.inicio);

          if (actionForm.label.includes('Meditación')) {
              const midT = startT + 0.5;
              const preset = ACTION_PRESETS.find(p => p.label === actionForm.label);
              
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
                  t: startT, fin: startT + (preset ? preset.duration : 0.2), descripcion: actionForm.desc
              });

          } else if (actionForm.label === 'Reflexión') {
              const endT = startT + reflexionDuration;

              // State
              handlers.addState({
                 energia: 100, contexto: 'Reflexión', expNegativa: false,
                 variables: { Ri: 0, Voluntad: 0, Distracción: 0, Horus: 0, Energía: 5 },
                 inicio: startT.toFixed(1), fin: endT.toFixed(1)
              }, null);

              // Activity
              handlers.addActivity({
                 categoria: 'general', tipo: 'reflexion', desc: 'Reflexión',
                 inicio: startT.toFixed(1), fin: endT.toFixed(1), isFlow: true,
                 label: 'Reflexión', color: CATEGORIAS_ACTIVIDAD.find(c => c.id === 'general')?.color
              }, null);

              // Event
              handlers.addEvent({
                  label: actionForm.label, icon: actionForm.icon,
                  t: startT, fin: endT, descripcion: 'Reflexión'
              });
          } else {
               const preset = ACTION_PRESETS.find(p => p.label === actionForm.label);
               const duration = preset ? preset.duration : 0.1;
               handlers.addEvent({
                  label: actionForm.label,
                  icon: actionForm.icon,
                  t: startT,
                  fin: startT + duration,
                  descripcion: actionForm.desc
              });
          }

          // Reset form but keep time ready for next
          setActionForm(prev => ({...prev, label: '', icon: '', desc: ''}));
          setReflexionDuration(1.0);
          alert("Acción Guardada");
      } catch(err: any) { alert(err.message); }
  }

  // Last Record Info Renderer
  const renderLastInfo = () => {
    if (activeTab === 'actividad') {
        const last = currentData.actividades[currentData.actividades.length - 1];
        if (!last) return <div className="text-xs text-gray-400 italic bg-white p-2 rounded border border-gray-100">Sin actividad previa. Inicio 7.0</div>;
        return (
            <div className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-8 rounded-full ${last.color || 'bg-gray-300'}`}></div>
                    <div>
                        <div className="text-xs font-bold text-gray-800">{last.nombre}</div>
                        <div className="text-[10px] text-gray-500 font-mono">{formatTime(last.inicio)} - {formatTime(last.fin)}</div>
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Anterior</span>
                </div>
            </div>
        );
    }
    if (activeTab === 'estado') {
        const last = currentData.estados[currentData.estados.length - 1];
        if (!last) return <div className="text-xs text-gray-400 italic bg-white p-2 rounded border border-gray-100">Sin estado previo. Inicio 7.0</div>;
        return (
            <div className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between shadow-sm">
                <div>
                    <div className="text-xs font-bold text-gray-800">Energía: {last.v}%</div>
                    <div className="text-[10px] text-gray-500 font-mono">{formatTime(last.t)} - {formatTime(last.fin || last.t + 1)}</div>
                </div>
                <div className="text-right">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Anterior</span>
                </div>
            </div>
        );
    }
    return null;
  };

  if (!isOpen) return null;

  return (
    <Modal onClose={onClose} maxWidth="max-w-xl" noBackdrop={true} draggable={true}>
        <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-2">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Activity size={18} className="text-[#19e66f]"/> Modo Maestro
            </h2>
            <div className="flex bg-white border border-gray-200 p-1 rounded-lg">
                <button onClick={() => setActiveTab('actividad')} className={`p-1.5 rounded-md transition-all ${activeTab==='actividad'?'bg-gray-100 text-gray-900 font-bold shadow-sm':'text-gray-400 hover:text-gray-600'}`} title="Actividad"><Clock size={16}/></button>
                <button onClick={() => setActiveTab('estado')} className={`p-1.5 rounded-md transition-all ${activeTab==='estado'?'bg-gray-100 text-gray-900 font-bold shadow-sm':'text-gray-400 hover:text-gray-600'}`} title="Estado"><Brain size={16}/></button>
                <button onClick={() => setActiveTab('accion')} className={`p-1.5 rounded-md transition-all ${activeTab==='accion'?'bg-gray-100 text-gray-900 font-bold shadow-sm':'text-gray-400 hover:text-gray-600'}`} title="Acción"><Zap size={16} className="rotate-45"/></button>
            </div>
        </div>

        {/* Previous Record Summary */}
        <div className="mb-5">
            {renderLastInfo()}
        </div>

        {/* CONTENT FORMS - Enforcing bg-white on inputs for clarity */}
        <div className="min-h-[280px]">
            {activeTab === 'actividad' && (
                <form onSubmit={handleActSubmit} className="space-y-4">
                     <div className="grid grid-cols-2 gap-3">
                        <select className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg p-2.5 text-sm font-bold shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            value={actForm.categoria} onChange={e => setActForm({...actForm, categoria: e.target.value, tipo: ''})}>
                            <option value="">Categoría...</option>
                            {CATEGORIAS_ACTIVIDAD.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </select>
                        <select className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg p-2.5 text-sm font-bold shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            value={actForm.tipo} onChange={e => setActForm({...actForm, tipo: e.target.value})} disabled={!actForm.categoria}>
                            <option value="">Tipo...</option>
                            {actForm.categoria && CATEGORIAS_ACTIVIDAD.find(c => c.id === actForm.categoria)?.opciones.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                     </div>
                     <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Inicio</label>
                            <input type="number" step="0.1" className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg p-2 font-bold shadow-sm"
                                value={actForm.inicio} onChange={e => setActForm({...actForm, inicio: e.target.value})} />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Fin</label>
                            <input type="number" step="0.1" className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg p-2 font-bold shadow-sm"
                                value={actForm.fin} onChange={e => setActForm({...actForm, fin: e.target.value})} />
                        </div>
                     </div>
                     
                     <div className="flex items-center gap-3">
                         <input type="checkbox" id="masterFlow" className="w-4 h-4 accent-[#19e66f]" 
                             checked={actForm.isFlow} onChange={e => setActForm({...actForm, isFlow: e.target.checked})} />
                         <label htmlFor="masterFlow" className="text-xs font-bold text-indigo-700 flex items-center gap-1">
                             <Zap size={12} /> Activar Flujo Simultáneo
                         </label>
                     </div>

                     <textarea className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg p-2 text-sm shadow-sm" placeholder="Descripción (Opcional)"
                        value={actForm.desc} onChange={e => setActForm({...actForm, desc: e.target.value})} rows={2} />
                     <button type="submit" disabled={!actForm.tipo} className="w-full py-3 bg-[#19e66f] text-[#0e1b13] font-bold rounded-xl hover:bg-[#12a850] disabled:opacity-50 shadow-md">
                        Cargar Actividad
                     </button>
                </form>
            )}

            {activeTab === 'estado' && (
                <form onSubmit={handleStSubmit} className="space-y-4">
                    <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
                        <label className="block text-xs font-bold text-gray-500 mb-2">Energía ({stForm.energia}%)</label>
                        <input type="range" min="0" max="100" className="w-full accent-[#19e66f]" 
                            value={stForm.energia} onChange={e => setStForm({...stForm, energia: parseInt(e.target.value)})}/>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-6">
                        {VARIABLES_EMOCIONALES.slice(0, 4).map(v => (
                             <div key={v}>
                                <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-2">
                                    <span>{v}</span><span>{stForm.variables[v] || 0}</span>
                                </div>
                                <input type="range" min="0" max="5" className="w-full accent-indigo-500 h-1.5 bg-gray-200 rounded cursor-pointer"
                                    value={stForm.variables[v] || 0} onChange={e => setStForm({...stForm, variables: {...stForm.variables, [v]: parseInt(e.target.value)}})} />
                             </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <input type="number" step="0.1" className="w-full bg-white border border-gray-300 rounded p-2 text-gray-900 shadow-sm" value={stForm.inicio} onChange={e=>setStForm({...stForm, inicio: e.target.value})} />
                        <input type="number" step="0.1" className="w-full bg-white border border-gray-300 rounded p-2 text-gray-900 shadow-sm" value={stForm.fin} onChange={e=>setStForm({...stForm, fin: e.target.value})} />
                    </div>
                    <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md">
                        Cargar Estado
                    </button>
                </form>
            )}

             {activeTab === 'accion' && (
                <form onSubmit={handleActionSubmit} className="space-y-4">
                     <div className="grid grid-cols-2 gap-3">
                        {ACTION_PRESETS.map(preset => (
                            <button 
                                key={preset.label}
                                type="button" 
                                onClick={() => setActionForm({...actionForm, label: preset.label, icon: preset.icon})}
                                className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                                    actionForm.label === preset.label 
                                    ? 'bg-gray-800 text-white border-gray-800 shadow-md transform scale-[1.02]' 
                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                                <span className="text-2xl">{preset.icon}</span>
                                <span className="font-bold text-sm">{preset.label}</span>
                            </button>
                        ))}
                     </div>
                     
                     <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1">Hora Inicio</label>
                        <input type="number" step="0.1" className="w-full bg-white border border-gray-300 rounded-lg p-2.5 font-bold text-gray-900 shadow-sm" placeholder="Hora" 
                            value={actionForm.inicio} onChange={e=>setActionForm({...actionForm, inicio: e.target.value})} />
                     </div>
                     
                     {/* SLIDER ONLY FOR REFLECTION */}
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
                            <label className="text-[10px] font-bold text-gray-500 uppercase mb-1">
                                Descripción {actionForm.label === 'Negativo' ? '(Requerido)' : '(Opcional)'}
                            </label>
                            <input type="text" className={`w-full bg-white border rounded-lg p-2.5 text-sm text-gray-900 shadow-sm ${
                                actionForm.label === 'Negativo' && !actionForm.desc ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-300'
                            }`} 
                            placeholder={actionForm.label === 'Negativo' ? "Motivo del negativo..." : "Detalles..."}
                            value={actionForm.desc} onChange={e=>setActionForm({...actionForm, desc: e.target.value})} />
                         </div>
                     )}
                     
                     <button type="submit" disabled={!actionForm.label || (actionForm.label === 'Negativo' && !actionForm.desc.trim())} 
                        className="w-full py-3 bg-yellow-500 text-white font-bold rounded-xl hover:bg-yellow-600 shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
                        Guardar Acción
                    </button>
                </form>
            )}
        </div>
    </Modal>
  );
};