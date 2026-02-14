import React from 'react';
import { Modal } from '../UIComponents';

interface SimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const SimulationModal: React.FC<SimulationModalProps> = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <Modal onClose={onClose} maxWidth="max-w-md">
        <h3 className="font-bold text-lg mb-2">Simular Datos</h3>
        <p className="text-sm text-gray-500 mb-6">Esto borrará los datos actuales y generará un historial completo de 30 días.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 text-gray-500 font-medium hover:bg-gray-100 rounded-lg">Cancelar</button>
          <button onClick={onConfirm} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow-lg shadow-indigo-200">Generar</button>
        </div>
    </Modal>
  );
};