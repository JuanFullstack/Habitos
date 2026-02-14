import React, { useEffect } from 'react';
import { Calendar, Sliders, Clock, Save } from 'lucide-react';
import { Modal } from '../UIComponents';
import { VARIABLES_EMOCIONALES } from '../../constants';
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
}

const getEnergyLabel = (val: number) => {
  if (val >= 95) return "Euforia";
  if (val >= 80) return "Armonía";
  if (val >= 60) return "Normalidad";
  if (val >= 40) return "Ansiedad";
  if (val >= 20) return "Colapso";
  return "Parálisis";
};

export const StateModal: React.FC<StateModalProps> = ({
  isOpen, onClose, form, setForm, onSubmit, isEditing, onVarChange, timeRange, currentDate
}) => {
  
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

  if (!isOpen) return null;

  return (
    <Modal onClose={onClose} maxWidth="max-w-5xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-[#0e1b13] mb-2">{isEditing ? 'Editar Estado' : 'Estado Anímico'}</h2>
            <p className="text-[#4e976d] text-lg">Registro de balance energético por bloques.</p>
          </div>
          <div className="bg-white px-4 py-2 rounded-lg shadow-sm text-sm font-medium text-[#4e976d] flex items-center gap-2">
            <Calendar size={18} />
            <span>{timeRange === 'HOY' ? 'Hoy' : currentDate}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            
            {/* TIME INPUTS */}
            <div className="bg-white rounded-2xl p-6 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-gray-50 flex gap-4 items-center">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Clock size={24} />
                </div>
                <div className="flex-1 grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Inicio (Hora)</label>
                        <input 
                            type="number" step="0.1" 
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 font-bold text-[#0e1b13] focus:ring-2 focus:ring-[#19e66f]"
                            value={form.inicio}
                            onChange={(e) => setForm({...form, inicio: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Fin (Hora)</label>
                        <input 
                            type="number" step="0.1" 
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 font-bold text-[#0e1b13] focus:ring-2 focus:ring-[#19e66f]"
                            value={form.fin}
                            onChange={(e) => setForm({...form, fin: e.target.value})}
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-gray-50">
              <div className="flex flex-col md:flex-row gap-8 items-center">
                <div className="flex-1 w-full">
                  <label className="block text-lg font-bold text-[#0e1b13] mb-2">Balance Energía</label>
                  <p className="text-gray-500 text-sm mb-6">¿Cómo te sientes en este periodo?</p>
                  
                  <div className="relative pt-1">
                    <input 
                      className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#19e66f]" 
                      type="range" min="0" max="100" 
                      value={form.energia}
                      onChange={e => setForm({...form, energia: parseInt(e.target.value)})}
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-2 font-medium">
                      <span>0% (Parálisis)</span>
                      <span>50%</span>
                      <span>100% (Éxtasis)</span>
                    </div>
                  </div>
                </div>

                <div className="flex-shrink-0 relative w-32 h-32 flex items-center justify-center">
                  <svg className="transform -rotate-90 w-full h-full" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" fill="transparent" r="40" stroke="#f0fdf4" strokeWidth="8"></circle>
                    <circle 
                      cx="50" cy="50" fill="transparent" r="40" stroke="#19e66f" strokeWidth="8"
                      strokeDasharray="251.2" 
                      strokeDashoffset={251.2 - (251.2 * form.energia / 100)}
                      strokeLinecap="round"
                    ></circle>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-[#0e1b13]">{form.energia}%</span>
                    <span className="text-[10px] font-bold text-[#19e66f] uppercase tracking-wide">{getEnergyLabel(form.energia)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-gray-50">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-500"><Sliders size={20} /></div>
                <h3 className="text-xl font-bold text-[#0e1b13]">Variables Emocionales</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                {VARIABLES_EMOCIONALES.map(k => (
                  <div key={k} className="space-y-3 group">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-semibold text-[#0e1b13] group-hover:text-[#19e66f] transition-colors">{k}</label>
                      <span className="text-sm font-bold text-[#4e976d] bg-gray-50 px-2 py-0.5 rounded">{form.variables?.[k] || 0}</span>
                    </div>
                    <input 
                      className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-[#19e66f]" 
                      type="range" min="0" max="5" 
                      value={form.variables?.[k] || 0}
                      onChange={e => onVarChange(k, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-gradient-to-br from-[#19e66f]/10 to-transparent p-6 rounded-2xl border border-[#19e66f]/20 shadow-sm sticky top-4">
              <button onClick={() => onSubmit()} className="w-full py-4 px-6 bg-[#19e66f] hover:bg-[#12a850] text-[#0e1b13] font-bold rounded-xl shadow-lg shadow-[#19e66f]/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mb-3">
                <Save size={20} /> {isEditing ? 'Actualizar Estado' : 'Guardar Estado'}
              </button>
            </div>
          </div>
        </div>
    </Modal>
  );
};