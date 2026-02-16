import React, { useEffect, useState } from 'react';
import { Calendar, Sliders, Clock, Save, Zap } from 'lucide-react';
import { Modal } from '../UIComponents';
import { VARIABLES_EMOCIONALES, STATE_PRESETS } from '../../constants';
import { TimeRange } from '../../types';

interface StateModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: { energia: number; contexto: string; expNegativa: boolean; variables: any; inicio: string; fin: string };
  setForm: React.Dispatch<React.SetStateAction<{ energia: number; contexto: string; expNegativa: boolean; variables: any; inicio: string; fin: string }>>;
  onSubmit: (e?: React.FormEvent) => void;
  isEditing: boolean;
  onVarChange: (key: string, val: string) => void;
  timeRange: TimeRange;
  currentDate: string;
  mode?: 'EDIT' | 'CREATE_PRESET';
  onPresetCreated?: () => void;
}

export const StateModal: React.FC<StateModalProps> = ({
  isOpen, onClose, form, setForm, onSubmit, isEditing, onVarChange, timeRange, currentDate, mode = 'EDIT', onPresetCreated
}) => {
  const isCreateMode = mode === 'CREATE_PRESET';
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customPresets, setCustomPresets] = useState<any[]>([]);
  const [isNamingPreset, setIsNamingPreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  // Set default times when opening if empty
  useEffect(() => {
    if (isOpen && !isEditing && (!form.inicio || !form.fin)) {
      const now = new Date();
      const currentDecimal = now.getHours() + now.getMinutes() / 60;
      setForm(prev => ({
        ...prev,
        inicio: prev.inicio || currentDecimal.toFixed(1),
        fin: prev.fin || (currentDecimal + 1).toFixed(1)
      }));
    }
  }, [isOpen, isEditing]);

  useEffect(() => {
    const saved = localStorage.getItem('customStatePresets');
    if (saved) {
      try { setCustomPresets(JSON.parse(saved)); } catch (e) { console.error(e); }
    }
  }, []);

  const savePreset = () => {
    if (!newPresetName.trim()) return;
    const newPreset = {
      label: newPresetName,
      v: form.energia,
      ...form.variables, // Stores keys as "Ri", "Voluntad" etc.
      contexto: form.contexto
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
    if (preset.label === 'Cargar estado') return;

    const newVariables = { ...form.variables };
    VARIABLES_EMOCIONALES.forEach(key => {
      let presetKey = key.toLowerCase();
      if (key === 'Distracción') presetKey = 'distraccion';
      if (key === 'Energía') presetKey = 'energia';
      if (key === 'Afectacion') presetKey = 'afectacion';
      if (key === 'Vision') presetKey = 'vision';
      if (key === 'Voluntad') presetKey = 'voluntad';
      if (key === 'Horus') presetKey = 'horus';
      if (key === 'Ri') presetKey = 'ri';
      if (key === 'NC') presetKey = 'nc';
      if (key === 'DI') presetKey = 'di';

      // Check both direct key (custom) and mapped key (standard)
      let val = preset[key];
      if (val === undefined) val = preset[presetKey];

      if (val !== undefined && val !== null) {
        newVariables[key] = val;
      }
    });

    setForm(prev => ({
      ...prev,
      energia: preset.v !== null ? preset.v : prev.energia,
      contexto: preset.contexto === 'AGGREGATE' ? (prev.contexto || '') : (preset.contexto || ''),
      variables: newVariables
    }));
  };

  if (!isOpen) return null;

  const showContext = selectedPreset === 'Cargar estado' || STATE_PRESETS.find(p => p.label === selectedPreset)?.contexto === 'AGGREGATE' || form.contexto.length > 0;
  const allPresets = [...STATE_PRESETS, ...customPresets];

  return (
    <Modal onClose={onClose} maxWidth="max-w-5xl">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-[#0e1b13] mb-1">{isCreateMode ? 'Nuevo Tipo de Estado' : (isEditing ? 'Editar Estado' : 'Nuevo Estado')}</h2>
          <p className="text-[#4e976d] text-sm">{isCreateMode ? 'Define el nombre y las variables para este estado reutilizable.' : 'Selecciona una configuración estándar o personaliza.'}</p>
        </div>
        {!isCreateMode && (
          <div className="bg-white px-3 py-1 rounded-lg shadow-sm text-xs font-bold text-[#4e976d] flex items-center gap-2 border">
            <Calendar size={14} />
            <span>{timeRange === 'HOY' ? 'Hoy' : currentDate}</span>
          </div>
        )}
      </div>

      {isCreateMode && (
        <div className="mb-6">
          <label className="text-xs font-bold text-gray-400 uppercase mb-2 block tracking-wider">Nombre del Estado</label>
          <input
            autoFocus
            className="w-full text-2xl font-black text-[#0e1b13] bg-transparent border-b-2 border-gray-200 focus:border-[#19e66f] outline-none pb-2 placeholder-gray-300 transition-colors"
            placeholder="Ej. Estudio Profundo"
            value={newPresetName}
            onChange={e => setNewPresetName(e.target.value)}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* PRESETS & TIME (Hidden in Create Mode) */}
        {!isCreateMode && (
          <div className="lg:col-span-12 space-y-4">
            {/* PRESETS GRID */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {allPresets.map(preset => (
                <button
                  key={preset.label}
                  onClick={() => applyPreset(preset)}
                  className={`p-2 rounded-xl text-xs font-bold transition-all border-2 flex flex-col items-center justify-center gap-1 min-h-[60px] text-center leading-tight relative group
                                ${selectedPreset === preset.label
                      ? 'bg-[#19e66f] text-[#0e1b13] border-[#19e66f] shadow-md transform scale-105 z-10'
                      : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                    }
                            `}
                >
                  {customPresets.some(p => p.label === preset.label) && (
                    <div
                      onClick={(e) => deletePreset(preset.label, e)}
                      className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-100 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200"
                    >×</div>
                  )}
                  <Zap size={16} className={selectedPreset === preset.label ? 'text-[#0e1b13]' : 'text-gray-300'} />
                  {preset.label}
                </button>
              ))}

              {/* ADD PRESET BUTTON */}
              {!isNamingPreset ? (
                <button
                  onClick={() => setIsNamingPreset(true)}
                  className="p-2 rounded-xl text-xs font-bold transition-all border-2 border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-600 flex flex-col items-center justify-center gap-1 min-h-[60px]"
                >
                  <span className="text-xl">+</span>
                  Guardar Act.
                </button>
              ) : (
                <div className="p-1 rounded-xl border-2 border-[#19e66f] flex flex-col items-center justify-center gap-1 min-h-[60px] bg-white">
                  <input
                    autoFocus
                    className="w-full text-xs text-center font-bold border-b border-gray-200 focus:outline-none mb-1"
                    placeholder="Nombre..."
                    value={newPresetName}
                    onChange={e => setNewPresetName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && savePreset()}
                  />
                  <div className="flex gap-1 w-full justify-center">
                    <button onClick={() => setIsNamingPreset(false)} className="text-[10px] bg-gray-100 px-2 rounded hover:bg-gray-200">Cancel</button>
                    <button onClick={savePreset} className="text-[10px] bg-[#19e66f] px-2 rounded text-[#0e1b13] font-bold hover:bg-[#12a850]">OK</button>
                  </div>
                </div>
              )}
            </div>

            {/* TIME & CONTEXT */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 bg-white p-3 rounded-xl border border-gray-100 flex items-center gap-4">
                <Clock size={20} className="text-indigo-400" />
                <div className="flex gap-4 w-full">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Inicio</label>
                    <input type="number" step="0.1" value={form.inicio} onChange={e => setForm({ ...form, inicio: e.target.value })} className="w-full font-bold text-gray-700 bg-transparent border-b border-dashed focus:outline-none" />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Fin</label>
                    <input type="number" step="0.1" value={form.fin} onChange={e => setForm({ ...form, fin: e.target.value })} className="w-full font-bold text-gray-700 bg-transparent border-b border-dashed focus:outline-none" />
                  </div>
                </div>
              </div>
              {/* Context Input conditionally visible */}
              <div className={`flex-[2] transition-all duration-300 ${showContext ? 'opacity-100' : 'opacity-50 grayscale'}`}>
                <div className="bg-white p-3 rounded-xl border border-gray-100 h-full flex flex-col justify-center">
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-1">Contexto / Notas</label>
                  <input
                    type="text"
                    placeholder={showContext ? "Describe el contexto..." : "No aplica"}
                    className="w-full font-medium text-gray-700 bg-transparent focus:outline-none placeholder-gray-300"
                    value={form.contexto}
                    onChange={e => setForm({ ...form, contexto: e.target.value })}
                    disabled={!showContext}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SLIDERS SECTION (Collapsible or Gridded) */}
        <div className="lg:col-span-12 bg-gray-50/50 rounded-2xl p-4 border border-gray-100">
          <div className="mb-4 flex items-center gap-2">
            <Sliders size={16} className="text-gray-400" />
            <h3 className="text-sm font-bold text-gray-600">Variables (0 - 100)</h3>
          </div>

          {/* PROMEDIO (Main) */}
          <div className="mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between mb-2">
              <label className="font-bold text-[#0e1b13]">Promedio (Energía Global)</label>
              <span className="font-bold text-[#19e66f]">{form.energia}%</span>
            </div>
            <input
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#19e66f]"
              type="range" min="0" max="100"
              value={form.energia}
              onChange={e => setForm({ ...form, energia: parseInt(e.target.value) })}
            />
          </div>

          {/* OTHER VARIABLES GRID */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {VARIABLES_EMOCIONALES.map(k => (
              <div key={k} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase truncate" title={k}>{k}</label>
                  <span className={`text-xs font-bold ${form.variables?.[k] > 0 ? 'text-indigo-600' : 'text-gray-300'}`}>{form.variables?.[k] || 0}</span>
                </div>
                <input
                  className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
                  type="range" min="0" max="100"
                  value={form.variables?.[k] || 0}
                  onChange={e => onVarChange(k, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* ACTION BUTTON */}
        <div className="lg:col-span-12">
          <button
            onClick={() => {
              if (isCreateMode) {
                savePreset();
                if (onPresetCreated) onPresetCreated();
                onClose();
              } else {
                onSubmit();
              }
            }}
            disabled={isCreateMode && !newPresetName.trim()}
            className="w-full py-4 bg-[#19e66f] hover:bg-[#12a850] text-[#0e1b13] font-bold rounded-xl shadow-lg shadow-[#19e66f]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            <Save size={20} /> {isCreateMode ? 'GUARDAR NUEVO PRESET' : (isEditing ? 'Actualizar' : 'Guardar Registro')}
          </button>
        </div>
      </div>
    </Modal>
  );
};