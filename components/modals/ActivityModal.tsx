import React from 'react';
import { ArrowLeft, Zap } from 'lucide-react';
import { Modal } from '../UIComponents';
import { CATEGORIAS_ACTIVIDAD } from '../../constants';

interface ActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: { categoria: string; tipo: string; desc: string; inicio: string; fin: string; isFlow: boolean };
  setForm: React.Dispatch<React.SetStateAction<{ categoria: string; tipo: string; desc: string; inicio: string; fin: string; isFlow: boolean }>>;
  onSubmit: (e: React.FormEvent) => void;
  isEditing: boolean;
}

export const ActivityModal: React.FC<ActivityModalProps> = ({
  isOpen, onClose, form, setForm, onSubmit, isEditing
}) => {
  if (!isOpen) return null;

  return (
    <Modal onClose={onClose}>
        <div className="mb-6 border-b border-gray-100 pb-4">
          <h2 className="text-2xl md:text-3xl font-bold text-[#0e1b13] mb-1">
            {isEditing ? 'Editar Actividad' : (form.categoria ? 'Selecciona Actividad' : 'Nueva Actividad')}
          </h2>
          <p className="text-[#4e976d] font-medium">
            {form.categoria ? '¿Qué estás haciendo específicamente?' : 'Elige una categoría para empezar.'}
          </p>
        </div>
        
        {!form.categoria ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {CATEGORIAS_ACTIVIDAD.map(cat => (
                <button 
                  key={cat.id}
                  onClick={() => setForm({...form, categoria: cat.id})}
                  className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl transition-all hover:-translate-y-1 shadow-sm hover:shadow-md border border-transparent hover:border-gray-200 ${cat.color}`}
                >
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <cat.icon size={24} />
                  </div>
                  <span className="font-bold text-lg">{cat.label}</span>
                </button>
            ))}
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-6">
            
            <button type="button" onClick={() => setForm({...form, categoria: '', tipo: ''})} className="flex items-center text-sm font-bold text-gray-400 hover:text-gray-600 mb-4">
              <ArrowLeft size={16} className="mr-1"/> Volver a Categorías
            </button>

            <div className="flex flex-wrap gap-3">
              {CATEGORIAS_ACTIVIDAD.find(c => c.id === form.categoria)?.opciones.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm({...form, tipo: opt.value})}
                  className={`px-5 py-3 rounded-xl font-bold text-sm transition-all border
                    ${form.tipo === opt.value 
                      ? 'bg-[#19e66f] text-[#0e1b13] border-[#19e66f] ring-2 ring-[#19e66f] ring-offset-1' 
                      : 'bg-white text-gray-600 border-gray-200 hover:border-[#19e66f]'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Inicio</label>
                <input type="number" step="0.1" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold"
                  value={form.inicio} onChange={e => setForm({...form, inicio: e.target.value})} placeholder="Ej: 14.5" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Fin</label>
                <input type="number" step="0.1" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold"
                  value={form.fin} onChange={e => setForm({...form, fin: e.target.value})} placeholder="Ej: 15.5" />
              </div>
            </div>

            {/* FLOW CHECKBOX */}
            <div className="flex items-center gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-xl cursor-pointer" onClick={() => setForm({...form, isFlow: !form.isFlow})}>
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${form.isFlow ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300'}`}>
                    {form.isFlow && <Zap size={12} className="text-white" />}
                </div>
                <div>
                    <span className="block text-sm font-bold text-indigo-900">¿Fue Sesión de Flujo?</span>
                    <span className="block text-xs text-indigo-500">Registra automáticamente un bloque de alta concentración.</span>
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Descripción</label>
                <textarea 
                  className="w-full bg-gray-50 border-0 rounded-xl p-4 text-sm text-[#0e1b13] focus:ring-2 focus:ring-[#19e66f]"
                  rows={2} placeholder="Detalles opcionales..."
                  value={form.desc}
                  onChange={e => setForm({...form, desc: e.target.value})}
                ></textarea>
            </div>

            <button type="submit" disabled={!form.tipo} className="w-full py-4 bg-[#19e66f] text-[#0e1b13] font-bold rounded-xl shadow-lg disabled:opacity-50 hover:bg-[#12a850] transition-colors">
              {isEditing ? 'Actualizar Actividad' : 'Guardar Actividad'}
            </button>
          </form>
        )}
    </Modal>
  );
};