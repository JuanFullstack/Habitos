import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../UIComponents';
import { CATEGORIAS_ACTIVIDAD, VARIABLES_EMOCIONALES, STATE_PRESETS } from '../../constants';
import { IDayData } from '../../types';
import { formatTime } from '../../utils/calculations';
import { Clock, Activity, Brain, Zap, Minus, Plus, X, Save, Sliders, Wind, BatteryLow, Flame } from 'lucide-react';
import { StateModal } from './StateModal';

interface MasterModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentData: IDayData;
    handlers: {
        addActivity: (form: any, id: string | number | null) => void;
        addState: (form: any, id: string | number | null) => void;
        addEvent: (data: any, id: string | number | null) => void;
        addBatch?: (ops: any[]) => void;
    };
    editData?: { type: 'actividad' | 'estado' | 'accion', data: any } | null;
}

const ACTION_PRESETS = [
    { label: 'Meditación 15', icon: '🧘‍♀️', duration: 0.25 },
    { label: 'Meditación 30', icon: '☯️', duration: 0.5 },
    { label: 'Reflexión', icon: '💡', duration: 1.0 },
    { label: 'Cambio', icon: '♻️', duration: 0.1 },
    { label: 'Negativo', icon: '⛔', duration: 0.1 }
];



export const MasterModal: React.FC<MasterModalProps> = ({ isOpen, onClose, currentData, handlers, editData }) => {
    const [activeTab, setActiveTab] = useState<'actividad' | 'estado' | 'accion'>('actividad');

    // --- UNIFIED TIME STATE ---
    const [baseTime, setBaseTime] = useState(7.0);
    const [duration, setDuration] = useState(1.0);

    // Forms
    // Forms
    const [actForm, setActForm] = useState({ categoria: '', tipo: '', desc: '', isFlow: false });
    const [stForm, setStForm] = useState({ energia: 75, variables: {} as any, contexto: '', preset: '' });
    const [actionForm, setActionForm] = useState({ label: '', icon: '', desc: '' });

    // Preset States
    const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
    const [customPresets, setCustomPresets] = useState<any[]>([]);
    const [isNamingPreset, setIsNamingPreset] = useState(false);
    const [newPresetName, setNewPresetName] = useState('');

    useEffect(() => {
        if (isOpen && editData) {
            // EDIT MODE INITIALIZATION
            setActiveTab(editData.type);
            const d = editData.data;

            // Common Time Calculation
            const start = d.inicio || d.t || 7.0;
            const end = d.fin || (start + 1.0);
            setBaseTime(parseFloat(start));
            setDuration(parseFloat(end) - parseFloat(start));

            if (editData.type === 'actividad') {
                setActForm({
                    categoria: d.categoria,
                    tipo: d.tipo,
                    desc: d.descripcion || '',
                    isFlow: d.tipo === 'sesion_flujo' // approximation
                });
            } else if (editData.type === 'estado') {
                // Populate State Form (Variables, Preset, etc.)
                const vars: any = {};
                // Populate vars from d (which maps to IStatePoint keys)
                VARIABLES_EMOCIONALES.forEach(v => {
                    if (d[v] !== undefined) vars[v] = d[v];
                    else vars[v] = 0;
                });
                setStForm({
                    energia: d.v || d.Energía || 50,
                    variables: vars,
                    contexto: d.contexto || '',
                    preset: d.preset || '' // Load preset name
                });
            } else if (editData.type === 'accion') {
                setActionForm({
                    label: d.label,
                    icon: d.icon,
                    desc: d.descripcion || ''
                });
            }

        } else if (isOpen) {
            // CREATE MODE - Context Sensitive based on Active Tab
            const config = currentData.config || {};
            const arranque = config.horaArranque || 7.0;
            let newTime = arranque;

            // Logica por Pestaña
            if (activeTab === 'actividad') {
                const sorted = [...currentData.actividades].sort((a, b) => a.inicio - b.inicio);
                const last = sorted[sorted.length - 1];
                if (last) newTime = parseFloat(last.fin);
            } else if (activeTab === 'estado') {
                // Estado independiente de actividad, pero depende de estados previos
                const sorted = [...currentData.estados].sort((a, b) => a.t - b.t);
                const last = sorted[sorted.length - 1];
                if (last) newTime = parseFloat(last.fin || (last.t + 1));
            } else if (activeTab === 'accion') {
                // Acción afectada por actividad
                const sortedActs = [...currentData.actividades].sort((a, b) => a.inicio - b.inicio);
                const lastAct = sortedActs[sortedActs.length - 1];

                const sortedEvts = [...currentData.eventos].sort((a, b) => a.t - b.t);
                const lastEvt = sortedEvts[sortedEvts.length - 1];

                const tAct = lastAct ? parseFloat(lastAct.fin) : arranque;
                const tEvt = lastEvt ? (lastEvt.fin || lastEvt.t) : arranque;
                newTime = Math.max(tAct, tEvt);
            }

            setBaseTime(newTime > 0 ? newTime : arranque);

            // Optional: Reset forms on tab switch if needed, but keeping state might be desired.
            // setStForm(prev => ({ ...prev, preset: '', contexto: '' }));
        }
    }, [isOpen, editData, currentData, activeTab]);

    useEffect(() => {
        const saved = localStorage.getItem('customStatePresets');
        if (saved) { try { setCustomPresets(JSON.parse(saved)); } catch (e) { console.error(e); } }
    }, []);

    const savePreset = () => {
        if (!newPresetName.trim()) return;
        const newPreset = {
            label: newPresetName,
            v: stForm.energia,
            ...stForm.variables,
            contexto: stForm.contexto
        };
        const updated = [...customPresets, newPreset];
        setCustomPresets(updated);
        localStorage.setItem('customStatePresets', JSON.stringify(updated));
        setIsNamingPreset(false);
        setNewPresetName('');
    };

    const deletePreset = (label: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm(`¿Eliminar preset "${label}"?`)) {
            const updated = customPresets.filter(p => p.label !== label);
            setCustomPresets(updated);
            localStorage.setItem('customStatePresets', JSON.stringify(updated));
        }
    };

    const applyPreset = (preset: any) => {
        setSelectedPreset(preset.label);
        // If 'Cargar estado', we just allow the UI to expand (handled in render), no variable overrides needed yet.
        if (preset.label === 'Cargar estado') return;

        const newVariables = { ...stForm.variables };
        VARIABLES_EMOCIONALES.forEach(key => {
            let presetKey = key.toLowerCase();
            // Map Keys (Standard)
            if (key === 'Distracción') presetKey = 'distraccion';
            if (key === 'Energía') presetKey = 'energia';
            if (key === 'Afectacion') presetKey = 'afectacion';
            if (key === 'Vision') presetKey = 'vision';
            if (key === 'Voluntad') presetKey = 'voluntad';
            if (key === 'Horus') presetKey = 'horus';
            if (key === 'Ri') presetKey = 'ri';
            if (key === 'NC') presetKey = 'nc';
            if (key === 'DI') presetKey = 'di';

            let val = preset[key];
            if (val === undefined) val = preset[presetKey];

            if (val !== undefined && val !== null) {
                newVariables[key] = val;
            }
        });

        setStForm(prev => ({
            ...prev,
            energia: preset.v,
            variables: newVariables,
            contexto: preset.contexto === 'AGGREGATE' ? prev.contexto : (preset.contexto || ''),
            preset: preset.label
        }));
    };

    // AUTO-CALC START TIME


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
            }, editData?.type === 'actividad' ? editData.data.id : null);

            if (editData) {
                setActForm(prev => ({ ...prev, desc: '', isFlow: false, categoria: '', tipo: '' }));
                onClose();
            } else {
                // Continuous Mode: Advance Time & Reset
                setBaseTime(prev => prev + duration);
                setDuration(1.0);
                setActForm(prev => ({ ...prev, desc: '', isFlow: false, categoria: '', tipo: '' }));
            }
        } catch (err: any) { alert(err.message); }
    };

    const handleStSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        try {
            handlers.addState({
                ...stForm,
                inicio: baseTime.toFixed(1),
                fin: endTime.toFixed(1)
            }, editData?.type === 'estado' ? editData.data.id : null);

            if (editData) {
                onClose();
            } else {
                // Smart Jump: Check if 'endTime' overlaps with an existing state
                // If I just added 13:00-15:00. Next is 15:00.
                // If there is a state at 15:00 (e.g. Meditation), jump over it.
                let nextTime = baseTime + duration;

                // We need the latest data including what we just added? 
                // 'currentData' might not be updated yet in this render cycle.
                // But we know 'endTime'.
                // We check against 'currentData.estados' (which has old data + maybe the one we just added? No, handlers update state asynchronously usually).
                // Actually, 'addState' updates 'currentData' via 'updateDayData'.
                // React state updates might be batched.
                // However, likely the 'Meditation' state is ALREADY in 'currentData.estados'.

                const findOverlap = (t: number) => {
                    // Find state starting at 't'
                    return currentData.estados.find(s => Math.abs(s.t - t) < 0.01);
                };

                let overlap = findOverlap(nextTime);
                while (overlap) {
                    const opEnd = parseFloat(overlap.fin || (overlap.t + 1));
                    nextTime = opEnd;
                    overlap = findOverlap(nextTime);
                }

                setBaseTime(nextTime);
                setDuration(1.0);
                setSelectedPreset(null);
                setStForm(prev => ({ ...prev, preset: '', contexto: '' }));
            }
        } catch (err: any) { alert(err.message); }
    };

    const handleActionSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // MACRO: Meditación (15/30) / Reflexión
            const isMed = actionForm.label.includes('Meditación');
            const isRef = actionForm.label === 'Reflexión';

            if (!editData && (isMed || isRef)) {
                const dur = actionForm.label.includes('15') ? 0.25 : actionForm.label.includes('30') ? 0.5 : 1.0;
                const typeVal = isMed ? 'meditando' : 'reflexion';
                const labelVal = isMed ? 'Meditando' : 'Reflexión';

                // 1. Event Data
                const eventData = {
                    label: actionForm.label,
                    icon: actionForm.icon,
                    t: baseTime.toFixed(1) === 'NaN' ? baseTime : parseFloat(baseTime.toFixed(1)), // Ensure number
                    fin: parseFloat((baseTime + dur).toFixed(1)),
                    descripcion: actionForm.desc
                };

                // 2. Activity Data
                const actData = {
                    categoria: 'general',
                    tipo: typeVal,
                    label: labelVal,
                    desc: actionForm.desc || (isMed ? 'Meditación' : 'Reflexión del día'),
                    isFlow: isMed,
                    color: 'bg-gray-100 text-gray-800',
                    inicio: baseTime.toFixed(1),
                    fin: (baseTime + dur).toFixed(1)
                };

                // 3. State Data
                const stPreset = isMed ? 'Flujo' : 'Normal';
                const stEnergy = isMed ? 80 : 60;
                const stVars = isMed
                    ? { Voluntad: 80, Vision: 80, Horus: 80, NC: 80 }
                    : { Ri: 40, Voluntad: 60, Vision: 60 };

                const stData = {
                    preset: stPreset,
                    energia: stEnergy,
                    inicio: baseTime.toFixed(1),
                    fin: (baseTime + dur).toFixed(1),
                    variables: stVars
                };

                if (handlers.addBatch) {
                    handlers.addBatch([
                        { type: 'event', data: eventData },
                        { type: 'activity', data: actData },
                        { type: 'state', data: stData }
                    ]);
                } else {
                    // Fallback
                    handlers.addEvent(eventData, null);
                    handlers.addActivity(actData, null);
                    handlers.addState(stData, null);
                }

            } else {
                // Standard Single Action
                handlers.addEvent({
                    label: actionForm.label,
                    icon: actionForm.icon,
                    t: baseTime,
                    fin: endTime,
                    descripcion: actionForm.desc
                }, editData?.type === 'accion' ? editData.data.id : null);
            }

            // Post-Submit
            if (editData) {
                setActionForm(prev => ({ ...prev, label: '', icon: '', desc: '' }));
                onClose();
            } else {
                setBaseTime(prev => prev + duration);
                setDuration(1.0);
                setActionForm(prev => ({ ...prev, label: '', icon: '', desc: '' }));
            }
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

    // ABRIR MODAL SEPARADO PARA PERSONALIZAR
    if (selectedPreset === 'Cargar estado') {
        return (
            <StateModal
                isOpen={true}
                onClose={() => setSelectedPreset(null)}
                mode='CREATE_PRESET'
                onPresetCreated={() => {
                    const saved = localStorage.getItem('customStatePresets');
                    if (saved) {
                        try { setCustomPresets(JSON.parse(saved)); } catch (e) { console.error(e); }
                    }
                    setSelectedPreset(null);
                }}
                form={{
                    ...stForm,
                    expNegativa: false,
                    inicio: formatTime(baseTime),
                    fin: formatTime(endTime)
                }}
                setForm={(val) => {
                    if (typeof val === 'function') {
                        setStForm(prev => {
                            const next = val({ ...prev, expNegativa: false, inicio: '', fin: '' });
                            return { ...prev, energia: next.energia, variables: next.variables, contexto: next.contexto };
                        });
                    } else {
                        setStForm(prev => ({ ...prev, ...val }));
                    }
                }}
                onSubmit={() => { }}
                isEditing={false}
                onVarChange={() => { }}
                timeRange={'DÍA' as any}
                currentDate={'Hoy'}
            />
        );
    }

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

                            <div className="flex items-center gap-3 bg-gray-50/50 p-2 rounded-lg mb-3">
                                <input type="checkbox" id="masterFlow" className="w-5 h-5 accent-[#19e66f] cursor-pointer rounded"
                                    checked={actForm.isFlow} onChange={e => setActForm({ ...actForm, isFlow: e.target.checked })} />
                                <label htmlFor="masterFlow" className="text-sm font-bold text-gray-700 cursor-pointer select-none">
                                    ¿Hubo Flujo?
                                </label>
                            </div>
                        </div>

                        <button type="submit" disabled={!actForm.tipo} className="w-full py-3 bg-[#19e66f] text-[#0e1b13] font-bold rounded-xl hover:bg-[#16cc62] disabled:opacity-50 disabled:cursor-not-allowed shadow transition-all transform active:scale-95">
                            GUARDAR ACTIVIDAD
                        </button>
                    </form>
                )}

                {activeTab === 'estado' && (
                    <form onSubmit={handleStSubmit} className="space-y-6">

                        {/* 1. SELECCIÓN DE ESTADO (Buttons) */}
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase mb-3 block tracking-wider">Selecciona tu Estado</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {[...STATE_PRESETS, ...customPresets].map(preset => {
                                    const isSelected = selectedPreset === preset.label;
                                    const isCreate = preset.label === 'Cargar estado';

                                    // Dynamic Style
                                    let style = "bg-white text-gray-600 border-gray-100 hover:border-gray-300 hover:bg-gray-50";
                                    if (isSelected) style = "bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm";

                                    if (preset.label === 'Normal') {
                                        style = isSelected ? "bg-green-100 text-green-800 border-green-300 shadow-sm" : "bg-white text-green-700 border-green-100 hover:bg-green-50";
                                    }
                                    else if (preset.label === 'Flujo') {
                                        style = isSelected ? "bg-cyan-100 text-cyan-800 border-cyan-300 shadow-sm" : "bg-white text-cyan-700 border-cyan-100 hover:bg-cyan-50";
                                    }
                                    else if (preset.label.includes('Bajón') || preset.label.includes('Cansado')) {
                                        style = isSelected ? "bg-orange-100 text-orange-800 border-orange-300 shadow-sm" : "bg-white text-orange-700 border-orange-100 hover:bg-orange-50";
                                    }
                                    else if (preset.label.includes('Enojado')) {
                                        style = isSelected ? "bg-red-100 text-red-800 border-red-300 shadow-sm" : "bg-white text-red-700 border-red-100 hover:bg-red-50";
                                    }
                                    else if (isCreate) {
                                        style = "bg-indigo-50 text-indigo-600 border-indigo-200 border-dashed hover:bg-indigo-100 col-span-2";
                                    }

                                    // Dynamic Icon
                                    let Icon = Zap;
                                    if (preset.label === 'Normal') Icon = Activity;
                                    if (preset.label === 'Flujo') Icon = Wind;
                                    if (preset.label.includes('Bajón') || preset.label.includes('Cansado')) Icon = BatteryLow;
                                    if (preset.label.includes('Enojado')) Icon = Flame;
                                    if (isCreate) Icon = Sliders;

                                    return (
                                        <button
                                            key={preset.label}
                                            type="button"
                                            onClick={() => applyPreset(preset)}
                                            className={`relative overflow-hidden rounded-xl p-3 transition-all duration-200 border-2 flex items-center justify-center gap-2 min-h-[50px] ${style}`}
                                        >
                                            {customPresets.some(p => p.label === preset.label) && (
                                                <div onClick={(e) => deletePreset(preset.label, e)} className="absolute top-1 right-1 opacity-50 hover:opacity-100 cursor-pointer"><X size={12} /></div>
                                            )}

                                            <Icon size={18} />
                                            <span className="font-bold text-xs">{preset.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 3. SUBMIT BUTTON */}
                        <button type="submit" disabled={!selectedPreset} className="w-full py-4 bg-indigo-600 text-white font-bold tracking-wide rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-[0.98] flex items-center justify-center gap-2">
                            <Zap size={20} />
                            {selectedPreset === 'Cargar estado' ? 'ABRIR FORMULARIO PERSONALIZADO' : `REGISTRAR ${selectedPreset?.toUpperCase() || 'ESTADO'}`}
                        </button>
                    </form>
                )}

                {/* NESTED MODAL FOR CUSTOM STATE */}
                {selectedPreset === 'Cargar estado' && (
                    <StateModal
                        isOpen={true}
                        onClose={() => setSelectedPreset(null)}
                        form={{
                            ...stForm,
                            expNegativa: false,
                            inicio: formatTime(baseTime),
                            fin: formatTime(endTime)
                        }}
                        setForm={(val) => {
                            // Helper to update stForm from StateModal
                            if (typeof val === 'function') {
                                setStForm(prev => {
                                    const next = val({ ...prev, expNegativa: false, inicio: '', fin: '' });
                                    return { ...prev, energia: next.energia, variables: next.variables, contexto: next.contexto };
                                });
                            } else {
                                setStForm(prev => ({ ...prev, ...val }));
                            }
                        }}
                        onSubmit={(e) => {
                            if (e) e.preventDefault();
                            handleStSubmit(e as any);
                            setSelectedPreset(null);
                        }}
                        isEditing={false}
                        onVarChange={(k, v) => {
                            // Minimal handler
                        }}
                        timeRange={'DÍA'}
                        currentDate={'Hoy'}
                    />
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
                            className="w-full py-3 bg-yellow-500 text-white font-bold rounded-xl hover:bg-yellow-600 shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
                            <Save size={20} />   {editData ? 'Actualizar' : 'Guardar Registro'}
                        </button>
                    </form>
                )}
            </div>
        </Modal>
    );
};