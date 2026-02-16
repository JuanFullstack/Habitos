import React, { useState, useEffect } from 'react';
import { Modal } from '../UIComponents';

interface TimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: string | null;
  initialTime?: number;
  onConfirm: (time: number) => void;
}

export const TimeModal: React.FC<TimeModalProps> = ({ isOpen, onClose, type, initialTime = 7.0, onConfirm }) => {
  const [strVal, setStrVal] = useState(initialTime.toString());

  useEffect(() => {
    if (isOpen) setStrVal(initialTime?.toString() || "7.0");
  }, [isOpen, initialTime]);

  if (!isOpen || !type) return null;

  const getTitle = () => {
    switch (type) {
      case 'arranque': return 'Configurar Arranque';
      case 'finDia': return 'Configurar Fin del Día';
      case 'horasSueno': return 'Horas de Sueño';
      default: return 'Configurar Tiempo';
    }
  };

  const getHelper = () => {
    if (type === 'horasSueno') return 'Ej: 7.5 o 7,5';
    return 'Ej: 8.5 para 08:30';
  };

  const handleUseCurrentTime = () => {
    const now = new Date();
    const decimal = now.getHours() + now.getMinutes() / 60;
    setStrVal(decimal.toFixed(2));
  };

  const handleConfirm = () => {
    const sanitized = strVal.replace(',', '.');
    const num = parseFloat(sanitized);
    if (!isNaN(num)) {
      onConfirm(num);
    }
  };

  return (
    <Modal onClose={onClose} maxWidth="max-w-sm">
      <h3 className="font-bold text-lg mb-4 text-[#0e1b13]">{getTitle()}</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">
            {type === 'horasSueno' ? 'Duración (Horas)' : 'Hora (Decimal)'}
          </label>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.0"
            className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-lg font-bold text-center text-[#0e1b13] focus:ring-2 focus:ring-[#19e66f]"
            value={strVal}
            onChange={(e) => setStrVal(e.target.value)}
          />
          <p className="text-center text-xs text-gray-400 mt-1">{getHelper()}</p>
        </div>

        {type !== 'horasSueno' && (
          <div className="flex gap-2">
            <button
              onClick={handleUseCurrentTime}
              className="flex-1 py-2 bg-gray-100 text-gray-600 font-bold text-xs rounded-lg hover:bg-gray-200"
            >
              Usar Hora Actual
            </button>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-3 bg-[#19e66f] text-[#0e1b13] font-bold rounded-xl shadow-lg shadow-[#19e66f]/20 hover:bg-[#12a850] transition-all transform active:scale-95"
          >
            Confirmar
          </button>
        </div>
      </div>
    </Modal>
  );
};