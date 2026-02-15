import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../UIComponents';
import { CATEGORIAS_ACTIVIDAD, VARIABLES_EMOCIONALES } from '../../constants';
import { IDayData } from '../../types';
import { formatTime } from '../../utils/calculations';
import { Clock, Activity, Brain, Zap, Minus, Plus } from 'lucide-react';

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
    { label: 'Meditación', icon: '🧘‍♀️' },
    { label: 'Reflexión', icon: '💡' },
    { label: 'Cambio', icon: '♻️' },
    { label: 'Negativo', icon: '⛔' }
];

export const MasterModal: React.FC<MasterModalProps> = ({ isOpen, onClose, currentData, handlers }) => {
    const [activeTab, setActiveTab] = useState<'actividad' | 'estado' | 'accion'>('actividad');

    // --- UNIFIED TIME STATE ---
    const [baseTime, setBaseTime] = useState(7.0);
    const [duration, setDuration] = useState(1.0); // Default 1 hour

    // Forms
    const [actForm, setActForm] = useState({ categoria: '', tipo: '', desc: '', isFlow: false });
    const [stForm, setStForm] = useState({ energia: 75, variables: {} as any });
    const [actionForm, setActionForm] = useState({ label: '', icon: '', desc: '' });

    // Init State Vars
    useEffect(() => {
        const vars: any = {};
        VARIABLES_EMOCIONALES.forEach(v => vars[v] = 0);
        setStForm(prev => ({ ...prev, variables: vars }));
    }, []);

    // AUTO-CALC START TIME (Logic: End of last relevant item)
    useEffect(() => {
        if (!isOpen) return;

        const getLastTime = (list: any[]) => {
            if (!list || list.length === 0) return 7.0;
            const last = list[list.length - 1];
            // If it has 'fin', use it. If it's an event (t), use t + duration (if any) or t
            if (last.fin !== undefined) return parseFloat(last.fin);
            return parseFloat(last.t) + (last.duration || 0); // Event fallback
        };

        let nextStart = 7.0;
        // Decision logic: Usually we append to the Activity stream for continuity
        // But if we are in 'accion' tab, maybe we want to align with activities too?
        // Let's standardise: Start Time = End of last ACTIVITY (primary timeline)
        if (currentData.actividades.length > 0) {
            nextStart = getLastTime(currentData.actividades);
        } else if (currentData.estados.length > 0) {
            nextStart = getLastTime(currentData.estados);
        }

        setBaseTime(nextStart);
        setDuration(1.0); // Reset duration on open
    }, [isOpen, currentData, activeTab]);

    // Derived End Time
    const endTime = useMemo(() => baseTime + duration, [baseTime, duration]);

    // --- HANDLERS ---
    const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDuration(parseFloat(e.target.value));
    };

    const handleActSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const catObj = CATEGORIAS_ACTIVIDAD.find(c => c.id === actForm.categoria);
            const optObj = catObj?.opciones.find(o => o.value === actForm.tipo);

            handlers.addActivity({
                ...actForm,
                label: optObj?.label,
                color: catObj?.color,
                inicio: baseTime.toFixed(1),
                fin: endTime.toFixed(1)
            }, null);

            setActForm(prev => ({ ...prev, desc: '', isFlow: false }));
            onClose();
        } catch (err: any) { alert(err.message); }
    };

    const handleStSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        try {
            handlers.addState({
                ...stForm,
                inicio: baseTime.toFixed(1),
                fin: endTime.toFixed(1)
            }, null);
            onClose();
        } catch (err: any) { alert(err.message); }
    };

    const handleActionSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Actions now have duration too based on the slider
            handlers.addEvent({
                label: actionForm.label,
                icon: actionForm.icon,
                t: baseTime,
                fin: endTime,
                descripcion: actionForm.desc
            });

            setActionForm(prev => ({ ...prev, label: '', icon: '', desc: '' }));
            onClose();
            alert("Acción Guardada con duración: " + formatTime(duration, true));
        } catch (err: any) { alert(err.message); }
    };

    // --- RENDER HELPERS ---
    const renderTimeSlider = () => (
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 shadow-inner">
            <div className="flex justify-between items-center mb-4">
                <div className="text-center">
                    <div className="text-[10px] font-bold text-gray-400 uppercase">Inicio</div>
                    <div className="text-xl font-black text-gray-700">{formatTime(baseTime)}</div>
                </div>

                <div className="flex-1 px-4 text-center">
                    <div className="text-xs font-bold text-[#19e66f] bg-[#19e66f]/10 rounded-full py-1 px-3 inline-block mb-1">
                        + {Math.floor(duration)}h {Math.round((duration % 1) * 60)}m
                    </div>
                    <div className="h-1 bg-gray-200 rounded-full w-full relative">
                        <div className="absolute top-0 left-0 h-full bg-[#19e66f] rounded-full transition-all" style={{ width: `${(duration / 4) * 100}%` }}></div>
                    </div>
                </div>

                <div className="text-center">
                    <div className="text-[10px] font-bold text-gray-400 uppercase">Fin</div>
                    <div className="text-xl font-black text-[#0e1b13]">{formatTime(endTime)}</div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <button type="button" onClick={() => setDuration(Math.max(0.25, duration - 0.25))} className="p-2 bg-white rounded-lg shadow-sm text-gray-500 hover:text-gray-900"><Minus size={16} /></button>
                <input
                    type="range"
                    min="0.25"
                    max="4.0"
                    step="0.25"
                    value={duration}
                    onChange={handleDurationChange}
                    className="w-full h-4 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#19e66f]"
                />
                <button type="button" onClick={() => setDuration(duration + 0.25)} className="p-2 bg-white rounded-lg shadow-sm text-gray-500 hover:text-gray-900"><Plus size={16} /></button>
            </div>
            <div className="flex justify-between text-[9px] text-gray-400 font-bold mt-2 px-1">
                <span>15m</span>
                <span>1h</span>
                <span>2h</span>
                <span>3h</span>
                <span>4h</span>
            </div>
        </div>
    );

    if (!isOpen) return null;

    return (
        <Modal onClose={onClose} maxWidth="max-w-lg" noBackdrop={false}>
            {/* HEADER TABS */}
            <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
                {[
                    { id: 'actividad', icon: Clock, label: 'Actividad' },
                    { id: 'estado', icon: Brain, label: 'Estado' },
                    { id: 'accion', icon: Zap, label: 'Acción' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === tab.id
                                ? 'bg-white text-[#0e1b13] shadow-sm'
                                : 'text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        <tab.icon size={14} /> {tab.label}
                    </button>
                ))}
            </div>

            {/* TIME CONTROLS (SHARED) */}
            {renderTimeSlider()}

            {/* CONTENT FORMS */}
            <div className="animate-fadeIn">
                {activeTab === 'actividad' && (
                    <form onSubmit={handleActSubmit} className="space-y-4">
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-gray-400 uppercase">¿Qué vas a hacer?</label>
                            <div className="grid grid-cols-2 gap-3">
                                <select className="bg-white border-2 border-gray-100 text-gray-900 rounded-xl p-3 text-sm font-bold focus:border-[#19e66f] outline-none"
                                    value={actForm.categoria} onChange={e => setActForm({ ...actForm, categoria: e.target.value, tipo: '' })}>
                                    <option value="">1. Categoría</option>
                                    {CATEGORIAS_ACTIVIDAD.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                </select>
                                <select className="bg-white border-2 border-gray-100 text-gray-900 rounded-xl p-3 text-sm font-bold focus:border-[#19e66f] outline-none disabled:opacity-50"
                                    value={actForm.tipo} onChange={e => setActForm({ ...actForm, tipo: e.target.value })} disabled={!actForm.categoria}>
                                    <option value="">2. Actividad</option>
                                    {actForm.categoria && CATEGORIAS_ACTIVIDAD.find(c => c.id === actForm.categoria)?.opciones.map(o => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <input type="text" className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-medium"
                                placeholder="Descripción (Opcional)"
                                value={actForm.desc} onChange={e => setActForm({ ...actForm, desc: e.target.value })} />
                        </div>

                        <div className="flex items-center gap-3 py-2">
                            <input type="checkbox" id="masterFlow" className="w-5 h-5 accent-[#19e66f] rounded"
                                checked={actForm.isFlow} onChange={e => setActForm({ ...actForm, isFlow: e.target.checked })} />
                            <label htmlFor="masterFlow" className="text-sm font-bold text-gray-600 cursor-pointer select-none">
                                En paralelo (Flujo)
                            </label>
                        </div>

                        <button type="submit" disabled={!actForm.tipo} className="w-full py-4 bg-[#19e66f] text-[#0e1b13] font-black text-lg rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg hover:shadow-[#19e66f]/40 disabled:opacity-50 disabled:cursor-not-allowed">
                            REGISTRAR ACTIVIDAD
                        </button>
                    </form>
                )}

                {activeTab === 'estado' && (
                    <form onSubmit={handleStSubmit} className="space-y-6">
                        <div>
                            <div className="flex justify-between items-end mb-2">
                                <label className="text-xs font-bold text-gray-400 uppercase">Nivel de Energía</label>
                                <span className="text-2xl font-black text-[#0e1b13]">{stForm.energia}%</span>
                            </div>
                            <input type="range" min="0" max="100" className="w-full h-4 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                value={stForm.energia} onChange={e => setStForm({ ...stForm, energia: parseInt(e.target.value) })} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {VARIABLES_EMOCIONALES.slice(0, 4).map(v => (
                                <div key={v} className="bg-white p-2 rounded-lg border border-gray-100">
                                    <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1">
                                        <span>{v}</span>
                                        <span className="text-indigo-600">{stForm.variables[v] || 0}</span>
                                    </div>
                                    <input type="range" min="0" max="5" className="w-full h-1.5 bg-gray-100 rounded-full appearance-none cursor-pointer accent-indigo-500"
                                        value={stForm.variables[v] || 0} onChange={e => setStForm({ ...stForm, variables: { ...stForm.variables, [v]: parseInt(e.target.value) } })} />
                                </div>
                            ))}
                        </div>

                        <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-black text-lg rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg hover:shadow-indigo-500/40">
                            GUARDAR ESTADO
                        </button>
                    </form>
                )}

                {activeTab === 'accion' && (
                    <form onSubmit={handleActionSubmit} className="space-y-5">
                        <div className="grid grid-cols-2 gap-3">
                            {ACTION_PRESETS.map(preset => (
                                <button
                                    key={preset.label}
                                    type="button"
                                    onClick={() => setActionForm({ ...actionForm, label: preset.label, icon: preset.icon })}
                                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${actionForm.label === preset.label
                                            ? 'bg-yellow-50 border-yellow-400 text-yellow-900'
                                            : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200 text-gray-500'
                                        }`}
                                >
                                    <span className="text-3xl">{preset.icon}</span>
                                    <span className="font-bold text-xs uppercase">{preset.label}</span>
                                </button>
                            ))}
                        </div>

                        <div className="bg-yellow-50/50 p-4 rounded-xl border border-yellow-100">
                            <label className="text-[10px] font-bold text-yellow-700 uppercase mb-2 block">
                                Detalles {actionForm.label === 'Negativo' ? '(Requerido)' : '(Opcional)'}
                            </label>
                            <input type="text" className="w-full bg-white border border-yellow-200 rounded-lg p-3 text-sm text-gray-800 font-medium placeholder-yellow-300 focus:border-yellow-500 outline-none"
                                placeholder={actionForm.label === 'Negativo' ? "¿Qué pasó?" : "Notas adicionales..."}
                                value={actionForm.desc} onChange={e => setActionForm({ ...actionForm, desc: e.target.value })} />
                        </div>

                        <button type="submit" disabled={!actionForm.label || (actionForm.label === 'Negativo' && !actionForm.desc.trim())}
                            className="w-full py-4 bg-yellow-500 text-white font-black text-lg rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg hover:shadow-yellow-500/40 disabled:opacity-50 disabled:cursor-not-allowed">
                            REGISTRAR ACCIÓN
                        </button>
                    </form>
                )}
            </div>
        </Modal>
    );
};