import React from 'react';
import { Sliders, Download, Upload, Sparkles, Trash2, Pencil, StopCircle } from 'lucide-react';
import { formatTime } from '../../utils/calculations';
import { IDayData, IActivity, IStatePoint } from '../../types';

interface RecordsViewProps {
  currentData: IDayData;
  onSimulate: () => void;
  onEndSimulation: () => void;
  onReset: (section: string) => void;
  onEditActivity: (act: IActivity) => void;
  onEditState: (st: IStatePoint) => void;
  onDelete: (type: 'actividades' | 'estados', id: string | number) => void;
  hasData: boolean;
  isSimulating: boolean;
}

export const RecordsView: React.FC<RecordsViewProps> = ({
  currentData,
  onSimulate,
  onEndSimulation,
  onReset,
  onEditActivity,
  onEditState,
  onDelete,
  hasData,
  isSimulating
}) => {
  // Filter out Flow activities for display
  const visibleActivities = currentData.actividades.filter(
    a => a.tipo !== 'flujo' && a.tipo !== 'sesion_flujo'
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4">
        <h3 className="font-bold text-gray-700 flex items-center gap-2">
          <Sliders size={20} className="text-[#19e66f]" /> Gestión de Datos
        </h3>
        <div className="flex gap-2">
          {/* Simulation Button */}
          <button
            onClick={isSimulating ? onEndSimulation : onSimulate}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border transition-colors ${isSimulating
                ? "bg-purple-600 text-white border-purple-600 hover:bg-purple-700"
                : "bg-purple-50 text-purple-600 border-purple-100 hover:bg-purple-100"
              }`}
          >
            {isSimulating ? (
              <><StopCircle size={14} /> Terminar Simulación</>
            ) : (
              <><Sparkles size={14} /> Simular</>
            )}
          </button>

          {/* Delete All Button - Always visible if there is data, separate from simulation logic */}
          {hasData && (
            <button
              onClick={() => onReset('all')}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
              title="Borrar todos los datos reales"
            >
              <Trash2 size={14} /> Eliminar Todo
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tabla Actividades */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[500px]">
          <div className="px-6 py-4 border-b border-gray-50 font-bold text-gray-700 flex justify-between items-center bg-gray-50/50">
            <span>Historial Actividades</span>
            <span className="text-xs bg-gray-200 px-2 py-1 rounded-full text-gray-600">{visibleActivities.length}</span>
          </div>
          <div className="overflow-y-auto flex-1 p-2">
            <table className="w-full text-sm text-left">
              <tbody className="divide-y divide-gray-50">
                {visibleActivities.length === 0 ? (
                  <tr><td className="p-8 text-center text-gray-400 italic">No hay actividades registradas</td></tr>
                ) : (
                  visibleActivities.slice().reverse().map(act => (
                    <tr key={act.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-8 rounded-full ${act.color?.split(' ')[0] || 'bg-gray-200'}`}></div>
                          <div>
                            <div className="font-bold text-gray-800">{act.nombre}</div>
                            <div className="text-xs font-mono text-gray-400">{formatTime(act.inicio)} - {formatTime(act.fin)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs max-w-[150px] truncate">{act.descripcion}</td>
                      <td className="px-4 py-3 text-right">
                        {!currentData.isAggregated && (
                          <div className="flex justify-end gap-2">
                            <button onClick={() => onEditActivity(act)} className="p-2 text-gray-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all">
                              <Pencil size={16} />
                            </button>
                            <button onClick={() => onDelete('actividades', act.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabla Estados */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[500px]">
          <div className="px-6 py-4 border-b border-gray-50 font-bold text-gray-700 flex justify-between items-center bg-gray-50/50">
            <span>Historial Estados</span>
            <span className="text-xs bg-gray-200 px-2 py-1 rounded-full text-gray-600">{currentData.estados.length}</span>
          </div>
          <div className="overflow-y-auto flex-1 p-2">
            <table className="w-full text-sm text-left">
              <tbody className="divide-y divide-gray-50">
                {currentData.estados.length === 0 ? (
                  <tr><td className="p-8 text-center text-gray-400 italic">No hay estados registrados</td></tr>
                ) : (
                  currentData.estados.slice().reverse().map(st => (
                    <tr key={st.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="font-mono text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">{formatTime(st.t)}</div>
                          <div>
                            <div className="font-bold text-gray-800 flex items-center gap-2">
                              Energía: <span className={st.v > 70 ? 'text-green-500' : st.v < 40 ? 'text-red-500' : 'text-yellow-500'}>{st.v.toFixed(0)}%</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        <div className="flex gap-2 flex-wrap">
                          <span className="bg-gray-100 px-1.5 py-0.5 rounded">Vol: {st.Voluntad?.toFixed(1)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!currentData.isAggregated && (
                          <div className="flex justify-end gap-2">
                            <button onClick={() => onEditState(st)} className="p-2 text-gray-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all">
                              <Pencil size={16} />
                            </button>
                            <button onClick={() => onDelete('estados', st.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};