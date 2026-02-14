import React, { useState, useEffect } from 'react';
import { Clock, Zap, Brain } from 'lucide-react';
import { Modal } from '../UIComponents';
import { CATEGORIAS_ACTIVIDAD } from '../../constants';

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { icon: string; label: string; t: number; fin: number; descripcion: string }) => void;
  onAddState?: (form: any) => void;
  onAddActivity?: (form: any) => void;
  initialTime?: number; // New prop for auto-start
}

export const ActionModal: React.FC<ActionModalProps> = ({ 
  isOpen, onClose, onSubmit, onAddState, onAddActivity, initialTime = 7.0 
}) => {
  const [inicio, setInicio] = useState('');
  const [fin, setFin] = useState('');
  const [descripcion, setDescripcion] = useState('');
  
  // Specific state for Reflection
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [reflexionDuration, setReflexionDuration] = useState(1.0); // Hours
  
  // Reset form when opening using initialTime
  useEffect(() => {
    if (isOpen) {
      setInicio(initialTime.toFixed(1));
      setFin((initialTime + 0.5).toFixed(1)); // Default 30 mins
      setDescripcion('');
      setSelectedAction(null);
      setReflexionDuration(1.0);
    }
  }, [isOpen, initialTime]);

  const handleQuickAction = (icon: string, label: string, durationMinutes?: number) => {
    const startT = parseFloat(inicio);
    let endT = parseFloat(fin);
    
    // --- MEDITATION LOGIC ---
    if (label.includes('Meditación')) {
       if (onAddState) {
          // State 1: Energy 40, Ri 4, Vol 2, Dis 4, Horus 2. Duration: 30 min (0.5h)
          const midT = startT + 0.5;
          
          onAddState({
             energia: 40, contexto: 'Meditación Inicio', expNegativa: false,
             variables: { Ri: 4, Voluntad: 2, Distracción: 4, Horus: 2, Energía: 2 },
             inicio: startT.toFixed(1),
             fin: midT.toFixed(1)
          });

          // State 2: Energy 65, Ri 4, Vol 4, Dis 1, Horus 3. Duration: 30 min (0.5h)
          // Starts immediately after first state
          onAddState({
             energia: 65, contexto: 'Meditación Fin', expNegativa: false,
             variables: { Ri: 4, Voluntad: 4, Distracción: 1, Horus: 3, Energía: 3 },
             inicio: midT.toFixed(1),
             fin: (midT + 0.5).toFixed(1)
          });
       }

       // Event itself (duration determined by durationMinutes if passed, otherwise default form)
       if (durationMinutes) {
          endT = startT + (durationMinutes / 60);
          setFin(endT.toFixed(1));
       }
    } else if (label === 'Reflexión') {
        setSelectedAction('Reflexión');
        return; // Don't submit yet, show slider UI
    }
    
    if (durationMinutes && !label.includes('Meditación')) {
        const durationHours = durationMinutes / 60;
        endT = startT + durationHours;
        setFin(endT.toFixed(1));
    }

    onSubmit({
        icon,
        label,
        t: startT,
        fin: endT,
        descripcion
    });
    onClose();
  };

  const submitReflexion = () => {
     const startT = parseFloat(inicio);
     const endT = startT + reflexionDuration;
     
     // 1. Create State: Energy 100, others 0
     if (onAddState) {
         onAddState({
             energia: 100, contexto: 'Reflexión Profunda', expNegativa: false,
             variables: { Ri: 0, Voluntad: 0, Distracción: 0, Horus: 0, Energía: 5 },
             inicio: startT.toFixed(1),
             fin: endT.toFixed(1)
         });
     }

     // 2. Create Activity: Reflexión (General) with Flow
     if (onAddActivity) {
         onAddActivity({
             categoria: 'general',
             tipo: 'reflexion',
             desc: 'Sesión de reflexión',
             inicio: startT.toFixed(1),
             fin: endT.toFixed(1),
             isFlow: true,
             label: 'Reflexión',
             color: CATEGORIAS_ACTIVIDAD.find(c => c.id === 'general')?.color
         });
     }

     // 3. Create Event
     onSubmit({
        icon: '💡',
        label: 'Reflexión',
        t: startT,
        fin: endT,
        descripcion: 'Reflexión'
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal onClose={onClose} maxWidth="max-w-lg">
        <div className="mb-6">
            <h2 className="text-2xl font-bold text-[#0e1b13] flex items-center gap-2">
                <Zap className="text-yellow-500" /> Registrar Acción
            </h2>
            <p className="text-gray-500">Eventos puntuales o hitos del día.</p>
        </div>

        <div className="space-y-6">
            {/* Time Inputs */}
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl">
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><Clock size={12}/> Inicio</label>
                    <input type="number" step="0.1" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 font-bold"
                        value={inicio} onChange={e => setInicio(e.target.value)} />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><Clock size={12}/> Fin</label>
                    <input type="number" step="0.1" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 font-bold"
                        value={selectedAction === 'Reflexión' ? (parseFloat(inicio) + reflexionDuration).toFixed(1) : fin} 
                        onChange={e => setFin(e.target.value)} 
                        disabled={selectedAction === 'Reflexión'}
                    />
                </div>
            </div>

            {/* UI FOR REFLECTION SLIDER */}
            {selectedAction === 'Reflexión' ? (
                <div className="bg-yellow-50 p-5 rounded-xl border border-yellow-200 animate-fadeIn">
                    <div className="flex justify-between items-center mb-4">
                        <label className="text-sm font-bold text-yellow-800 flex items-center gap-2">
                            <Brain size={16}/> Duración Reflexión
                        </label>
                        <span className="text-2xl font-black text-yellow-600">{reflexionDuration}h</span>
                    </div>
                    
                    <input 
                        type="range" min="0.5" max="5.0" step="0.5"
                        className="w-full h-4 bg-yellow-200 rounded-lg appearance-none cursor-pointer accent-yellow-600"
                        value={reflexionDuration}
                        onChange={e => setReflexionDuration(parseFloat(e.target.value))}
                    />
                    <div className="flex justify-between text-[10px] text-yellow-700 font-bold mt-2">
                        <span>30m</span>
                        <span>1h</span>
                        <span>2h</span>
                        <span>3h</span>
                        <span>4h</span>
                        <span>5h</span>
                    </div>
                    
                    <div className="mt-4 flex gap-2">
                        <button onClick={() => setSelectedAction(null)} className="px-4 py-2 text-yellow-700 font-bold hover:bg-yellow-100 rounded-lg text-xs">Cancelar</button>
                        <button onClick={submitReflexion} className="flex-1 py-3 bg-yellow-500 text-white font-bold rounded-xl shadow hover:bg-yellow-600">
                            Confirmar Reflexión
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    {/* Description */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Descripción (Opcional)</label>
                        <textarea 
                            className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                            rows={2}
                            placeholder="Notas sobre la acción..."
                            value={descripcion}
                            onChange={e => setDescripcion(e.target.value)}
                        ></textarea>
                    </div>

                    {/* Quick Actions Grid */}
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-3">Seleccionar Acción</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => handleQuickAction('🧘‍♀️', 'Meditación 12', 12)} 
                                className="flex items-center gap-3 p-4 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all group text-left">
                                <span className="text-2xl">🧘‍♀️</span>
                                <div>
                                    <div className="font-bold text-indigo-900 text-sm">Meditación 12</div>
                                    <div className="text-[10px] text-indigo-500">12 min</div>
                                </div>
                            </button>

                            <button onClick={() => handleQuickAction('☯️', 'Meditación 30', 30)} 
                                className="flex items-center gap-3 p-4 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-all group text-left">
                                <span className="text-2xl">☯️</span>
                                <div>
                                    <div className="font-bold text-purple-900 text-sm">Meditación 30</div>
                                    <div className="text-[10px] text-purple-500">30 min</div>
                                </div>
                            </button>
                            
                            <button onClick={() => handleQuickAction('💡', 'Reflexión')} 
                                className="flex items-center gap-3 p-4 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 rounded-xl transition-all group text-left">
                                <span className="text-2xl">💡</span>
                                <div className="font-bold text-yellow-900 text-sm">Reflexión</div>
                            </button>

                            <button onClick={() => handleQuickAction('♻️', 'Cambio')} 
                                className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all group text-left">
                                <span className="text-2xl">♻️</span>
                                <div className="font-bold text-blue-900 text-sm">Cambio</div>
                            </button>

                            <button onClick={() => handleQuickAction('⛔', 'Negativo')} 
                                className="flex items-center gap-3 p-4 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-all group text-left col-span-2">
                                <span className="text-2xl">⛔</span>
                                <div className="font-bold text-red-900 text-sm">Negativo</div>
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    </Modal>
  );
};
