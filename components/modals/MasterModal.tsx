import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../UIComponents';
import { CATEGORIAS_ACTIVIDAD, VARIABLES_EMOCIONALES } from '../../constants';
import { IDayData } from '../../types';
import { formatTime } from '../../utils/calculations';
import { Clock, Activity, Brain, Zap, Minus, Plus, X } from 'lucide-react';

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
    { label: 'Meditación 15', icon: '🧘‍♀️', duration: 0.25 },
    { label: 'Meditación 30', icon: '☯️', duration: 0.5 },
    { label: 'Reflexión', icon: '💡', duration: 1.0 },
    { label: 'Cambio', icon: '♻️', duration: 0.1 },
    { label: 'Negativo', icon: '⛔', duration: 0.1 }
];

export const MasterModal: React.FC<MasterModalProps> = ({ isOpen, onClose, currentData, handlers }) => {
    const [activeTab, setActiveTab] = useState<'actividad' | 'estado' | 'accion'>('actividad');

    // --- UNIFIED TIME STATE ---
    const [baseTime, setBaseTime] = useState(7.0);
    const [duration, setDuration] = useState(1.0);

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

    // AUTO-CALC START TIME
    useEffect(() => {
        if (!isOpen) return;

        const getLastTime = (list: any[]) => {
            if (!list || list.length === 0) return 7.0;
            const last = list[list.length - 1];
            if (last.fin !== undefined) return parseFloat(last.fin);
            return parseFloat(last.t) + (last.duration || 0);
        };

        let nextStart = 7.0;
        if (currentData.actividades.length > 0) nextStart = getLastTime(currentData.actividades);
        else if (currentData.estados.length > 0) nextStart = getLastTime(currentData.estados);

        setBaseTime(nextStart);
        setDuration(1.0);
    }, [isOpen, currentData]);

    // Derived End Time
    const endTime = useMemo(() => baseTime + duration, [baseTime, duration]);

    // --- HANDLERS ---
    const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDuration(parseFloat(e.target.value));
    };

    const setPresetDuration = (d: number) => {
        setDuration(d);
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

            setActForm(prev => ({ ...prev, desc: '', isFlow: false, categoria: '', tipo: '' }));
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
            handlers.addEvent({
                label: actionForm.label,
                icon: actionForm.icon,
                t: baseTime,
                fin: endTime,
                descripcion: actionForm.desc
            });

            setActionForm(prev => ({ ...prev, label: '', icon: '', desc: '' }));
            onClose();
        } catch (err: any) { alert(err.message); }
    };

    // --- RENDER HELPERS ---
    const renderTimeSlider = () => (
        <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-200 mb-6">
            <div className="flex justify-between items-center mb-3">
                <div className="text-center w-16">
                    <div className="text-[10px] font-bold text-gray-400 uppercase">Inicio</div>
                    <div className="text-lg font-black text-gray-700">{formatTime(baseTime)}</div>
                </div>

                <div className="flex-1 px-4 text-center">
                    <div className="text-xs font-bold text-[#19e66f] bg-[#19e66f]/10 rounded-full py-0.5 px-3 inline-block mb-2">
                        + {Math.floor(duration)}h {Math.round((duration % 1) * 60)}m
                    </div>
                    <div className="relative h-2 bg-gray-200 rounded-full">
                        <div className="absolute top-0 left-0 h-full bg-[#19e66f] rounded-full transition-all" style={{ width: `${(duration / 4) * 100}%` }}></div>
                        <input
                            type="range"
                            min="0.1"
                            max="4.0"
                            step="0.1"
                            value={duration}
                            onChange={handleDurationChange}
                            className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                        />
                    </div>
                </div>

                <div className="text-center w-16">
                    <div className="text-[10px] font-bold text-gray-400 uppercase">Fin</div>
                    <div className="text-lg font-black text-[#0e1b13]">{formatTime(endTime)}</div>
                </div>
            </div>

            {/* Quick Increments */}
            <div className="flex justify-center gap-2">
                {[0.25, 0.5, 1.0, 1.5, 2.0].map(val => (
                    <button
                        key={val}
                        type="button"
                        onClick={() => setDuration(val)}
                        className={`text-[10px] font-bold px-3 py-1.5 rounded transition-all ${duration === val
                                ? 'bg-[#19e66f] text-[#0e1b13] border border-[#19e66f] shadow-sm'
                                : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
                            }`}
                    >
                        {val === 0.25 ? '15m' : (val === 0.5 ? '30m' : val + 'h')}
                    </button>
                ))}
            </div>
        </div>
    );

    if (!isOpen) return null;

    return (
        <Modal onClose={onClose} maxWidth="max-w-xl" noBackdrop={false}>
            {/* HEADER TABS */}
            <div className="flex p-1 bg-gray-100 rounded-lg mb-4">
                {[
                    { id: 'actividad', icon: Clock, label: 'Actividad' },
                    { id: 'estado', icon: Brain, label: 'Estado' },
                    { id: 'accion', icon: Zap, label: 'Acción' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex-1 py-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === tab.id
                            ? 'bg-white text-[#0e1b13] shadow-sm'
                            : 'text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        <tab.icon size={14} /> {tab.label}
                    </button>
                ))}
            </div>

            {/* TIME CONTROLS */}
            {renderTimeSlider()}

            {/* CONTENT */}
            <div className="min-h-[300px]">
                {activeTab === 'actividad' && (
                    <form onSubmit={handleActSubmit} className="space-y-4">
                        {/* 1. Categoría Grid */}
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">1. Categoría</label>
                            <div className="grid grid-cols-4 gap-2">
                                {CATEGORIAS_ACTIVIDAD.map(c => (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => setActForm({ ...actForm, categoria: c.id, tipo: '' })}
                                        className={`p-2 rounded-lg border flex flex-col items-center gap-1 transition-all ${actForm.categoria === c.id
                                            ? 'bg-gray-50 border-gray-400 text-gray-900 shadow-sm'
                                            : 'bg-white border-gray-100 text-gray-400 hover:bg-gray-50'
                                            }`}
                                    >
                                        <c.icon size={18} />
                                        <span className="text-[9px] font-bold">{c.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 2. Tipo Chips */}
                        {actForm.categoria && (
                            <div className="animate-fadeIn">
                                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">2. Tarea</label>
                                <div className="flex flex-wrap gap-2">
                                    {CATEGORIAS_ACTIVIDAD.find(c => c.id === actForm.categoria)?.opciones.map(o => (
                                        <button
                                            key={o.value}
                                            type="button"
                                            onClick={() => setActForm({ ...actForm, tipo: o.value })}
                                            className={`px-3 py-1.5 rounded-md text-xs font-bold border transition-all ${actForm.tipo === o.value
                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            {o.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Desc & Flow */}
                        <div className="pt-2">
                            <input type="text" className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm font-medium mb-3 focus:border-gray-400 outline-none"
                                placeholder="Descripción (Opcional)"
                                value={actForm.desc} onChange={e => setActForm({ ...actForm, desc: e.target.value })} />

                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="masterFlow" className="w-4 h-4 accent-[#19e66f] cursor-pointer"
                                    checked={actForm.isFlow} onChange={e => setActForm({ ...actForm, isFlow: e.target.checked })} />
                                <label htmlFor="masterFlow" className="text-xs font-bold text-gray-500 cursor-pointer select-none">
                                    En paralelo (No corta anterior)
                                </label>
                            </div>
                        </div>

                        <button type="submit" disabled={!actForm.tipo} className="w-full py-3 bg-[#19e66f] text-[#0e1b13] font-bold rounded-xl hover:bg-[#16cc62] disabled:opacity-50 disabled:cursor-not-allowed shadow transition-all transform active:scale-95">
                            GUARDAR ACTIVIDAD
                        </button>
                    </form>
                )}

                {activeTab === 'estado' && (
                    <form onSubmit={handleStSubmit} className="space-y-5">
                        <div className="bg-white border border-gray-200 p-3 rounded-xl">
                            <div className="flex justify-between items-end mb-2">
                                <label className="text-xs font-bold text-gray-400 uppercase">Nivel de Energía</label>
                                <span className="text-xl font-black text-[#0e1b13]">{stForm.energia}%</span>
                            </div>
                            <input type="range" min="0" max="100" className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-[#19e66f]"
                                value={stForm.energia} onChange={e => setStForm({ ...stForm, energia: parseInt(e.target.value) })} />
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                            {VARIABLES_EMOCIONALES.slice(0, 4).map(v => (
                                <div key={v}>
                                    <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1">
                                        <span>{v}</span>
                                        <span className="text-indigo-600">{stForm.variables[v] || 0}</span>
                                    </div>
                                    <input type="range" min="0" max="5" className="w-full h-1 bg-gray-200 rounded-full appearance-none cursor-pointer accent-indigo-500"
                                        value={stForm.variables[v] || 0} onChange={e => setStForm({ ...stForm, variables: { ...stForm.variables, [v]: parseInt(e.target.value) } })} />
                                </div>
                            ))}
                        </div>

                        <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md transition-all">
                            REGISTRAR ESTADO
                        </button>
                    </form>
                )}

                {activeTab === 'accion' && (
                    <form onSubmit={handleActionSubmit} className="space-y-4">
                        <div className="grid grid-cols-3 gap-2">
                            {ACTION_PRESETS.map(preset => (
                                <button
                                    key={preset.label}
                                    type="button"
                                    onClick={() => {
                                        setActionForm({ ...actionForm, label: preset.label, icon: preset.icon });
                                        if (preset.duration) setPresetDuration(preset.duration);
                                    }}
                                    className={`p-3 rounded-lg border flex flex-col items-center gap-1 transition-all ${actionForm.label === preset.label
                                        ? 'bg-yellow-50 border-yellow-400 text-yellow-900 shadow-sm'
                                        : 'bg-white border-gray-100 text-gray-500 hover:border-gray-300'
                                        }`}
                                >
                                    <span className="text-xl">{preset.icon}</span>
                                    <span className="font-bold text-[10px] uppercase text-center leading-tight">{preset.label}</span>
                                </button>
                            ))}
                        </div>

                        {actionForm.label && (
                            <div className="bg-yellow-50/50 p-3 rounded-lg border border-yellow-100 animate-fadeIn">
                                <label className="text-[9px] font-bold text-yellow-700 uppercase mb-1 block">
                                    Detalles {actionForm.label === 'Negativo' ? '(Requerido)' : '(Opcional)'}
                                </label>
                                <input type="text" className="w-full bg-white border border-yellow-200 rounded-md p-2 text-sm text-gray-800 font-medium placeholder-yellow-300 focus:border-yellow-500 outline-none"
                                    placeholder={actionForm.label === 'Negativo' ? "¿Qué pasó?" : "Notas adicionales..."}
                                    value={actionForm.desc} onChange={e => setActionForm({ ...actionForm, desc: e.target.value })} />
                            </div>
                        )}

                        <button type="submit" disabled={!actionForm.label || (actionForm.label === 'Negativo' && !actionForm.desc.trim())}
                            className="w-full py-3 bg-yellow-500 text-white font-bold rounded-xl hover:bg-yellow-600 shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                            GUARDAR ACCIÓN
                        </button>
                    </form>
                )}
            </div>
        </Modal>
    );
};