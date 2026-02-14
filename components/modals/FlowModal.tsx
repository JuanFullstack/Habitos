import React, { useState, useEffect } from 'react';
import { Zap, Clock } from 'lucide-react';
import { Modal } from '../UIComponents';

interface FlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { inicio: number; fin: number; descripcion: string }) => void;
}

export const FlowModal: React.FC<FlowModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [inicio, setInicio] = useState('');
  const [fin, setFin] = useState('');
  const [descripcion, setDescripcion] = useState('');

  // Auto-fill times when opening
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const currentDecimal = now.getHours() + now.getMinutes() / 60;
      setInicio(currentDecimal.toFixed(1));
      setFin((currentDecimal + 1.0).toFixed(1)); // Default 1 hour
      setDescripcion('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      inicio: parseFloat(inicio),
      fin: parseFloat(fin),
      descripcion
    });
  };

  if (!isOpen) return null;

  return (
    <Modal onClose={onClose} maxWidth="max-w-md">
      <div className="mb-6 border-b border-indigo-100 pb-4">
        <h2 className="text-2xl font-black text-indigo-900 flex items-center gap-2">
          <Zap className="fill-indigo-500 text-indigo-500" /> Sesión de Flujo
        </h2>
        <p className="text-indigo-600/70 text-sm font-medium">Registra un periodo de alta concentración.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-indigo-400 uppercase mb-1 flex items-center gap-1">
                <Clock size={12}/> Inicio
              </label>
              <input 
                type="number" step="0.1" 
                required
                className="w-full bg-white border border-indigo-200 rounded-lg px-3 py-2 font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-400 outline-none"
                value={inicio} 
                onChange={e => setInicio(e.target.value)} 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-indigo-400 uppercase mb-1 flex items-center gap-1">
                <Clock size={12}/> Fin
              </label>
              <input 
                type="number" step="0.1" 
                required
                className="w-full bg-white border border-indigo-200 rounded-lg px-3 py-2 font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-400 outline-none"
                value={fin} 
                onChange={e => setFin(e.target.value)} 
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Descripción (Opcional)</label>
          <textarea 
            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-700 focus:ring-2 focus:ring-indigo-400 outline-none transition-all"
            rows={3}
            placeholder="¿En qué trabajaste?"
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
          ></textarea>
        </div>

        <button 
          type="submit" 
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <Zap size={18} className="fill-white" /> Registrar Flujo
        </button>
      </form>
    </Modal>
  );
};