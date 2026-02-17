import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { CATEGORIAS_ACTIVIDAD, VARIABLES_EMOCIONALES, TIME_RANGES } from './constants';
import { calculateMetrics, formatTime } from './utils/calculations';
import { useBienestarData } from './hooks/useBienestarData';
import { IActivity, IStatePoint, TimeRange, IDayData } from './types';
import { forceReauth, pbStatus } from './lib/pocketbase';

// Components
import { Header } from './components/Header';
import { DashboardView } from './components/views/DashboardView';
import { MobileDashboardView } from './components/views/MobileDashboardView';
import { RecordsView } from './components/views/RecordsView';
import { HabitsView } from './components/views/HabitsView';
import { ActivityModal } from './components/modals/ActivityModal';
import { StateModal } from './components/modals/StateModal';
import { TimeModal } from './components/modals/TimeModal';
import { SimulationModal } from './components/modals/SimulationModal';
import { ActionModal } from './components/modals/ActionModal';
import { MasterModal } from './components/modals/MasterModal';
import { DBSetupModal } from './components/modals/DBSetupModal';
import { DateModal } from './components/modals/DateModal';

export default function App() {
  const {
    db, currentData, currentDate, setCurrentDate, timeRange, setTimeRange,
    updateDayData, addActivity, addState, addEvent, addBatch, deleteItem, resetData,
    handleSimulate, toggleFlujo, revertSimulation, syncStatus, syncError
  } = useBienestarData();

  // --- MOBILE DETECTION ---
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSimulating, setIsSimulating] = useState(false);

  // UI State
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editData, setEditData] = useState<{ type: 'actividad' | 'estado' | 'accion', data: any } | null>(null);
  const [timeModalType, setTimeModalType] = useState<'arranque' | 'finDia' | 'horasSueno' | null>(null);
  const [tempTime, setTempTime] = useState(7.0);

  const [showActModal, setShowActModal] = useState(false);
  const [showStateModal, setShowStateModal] = useState(false);
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showMasterModal, setShowMasterModal] = useState(false);
  const [showDBSetup, setShowDBSetup] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [debugMsg, setDebugMsg] = useState('');

  // Form State
  const [formActividad, setFormActividad] = useState({ categoria: '', tipo: '', desc: '', inicio: '', fin: '', isFlow: false });
  const [formEstado, setFormEstado] = useState<{ energia: number, contexto: string, expNegativa: boolean, variables: any, inicio: string, fin: string, preset?: string }>({
    energia: 75, contexto: '', variables: {}, expNegativa: false, inicio: '', fin: '', preset: ''
  });

  // State for Action Modal default time (since ActionModal handles its own form state)
  const [actionInitialTime, setActionInitialTime] = useState(7.0);

  // Init Form State
  useEffect(() => {
    const initialVars: any = {};
    VARIABLES_EMOCIONALES.forEach(v => initialVars[v] = 0);
    initialVars['Contexto'] = 65;
    setFormEstado(prev => ({ ...prev, variables: initialVars }));
  }, []);

  // --- HELPER: Get Global Last End Time ---
  const getGlobalLastTime = () => {
    const getEnd = (list: any[]) => {
      if (!list || list.length === 0) return 0;
      const last = list[list.length - 1];
      let endTime = last.fin;
      if (endTime === undefined || endTime === null) {
        endTime = last.t + 1;
      }
      return parseFloat(endTime);
    };

    const t1 = getEnd(currentData.actividades);
    const t2 = getEnd(currentData.estados);
    const t3 = getEnd(currentData.eventos);
    const max = Math.max(t1, t2, t3);
    return max > 0 ? max : (currentData.config?.horaArranque || 7.0);
  };

  // --- HANDLERS ---
  const handleSaveTimeConfig = () => {
    updateDayData({
      ...currentData,
      config: {
        ...currentData.config,
        horaArranque: timeModalType === 'arranque' ? tempTime : currentData.config.horaArranque,
        finDia: timeModalType === 'finDia' ? tempTime : currentData.config.finDia,
        horasSueno: timeModalType === 'horasSueno' ? tempTime : currentData.config.horasSueno
      }
    });
    setTimeModalType(null);
  };

  const onConfirmSimulation = () => {
    handleSimulate();
    setIsSimulating(true);
    setShowSimulateModal(false);
  };

  const onEndSimulation = () => {
    revertSimulation();
    setIsSimulating(false);
  };

  const handleResetData = (section: string) => {
    if (window.confirm("¿Estás seguro de limpiar todos los datos? Esto no se puede deshacer.")) {
      resetData(section);
      setIsSimulating(false);
    }
  };

  const handlePrepareEditActivity = (act: IActivity) => {
    setEditData({ type: 'actividad', data: act });
    setShowMasterModal(true);
  };

  // OPEN NEW ACTIVITY - AUTO FILL TIME
  const handleOpenNewActivity = () => {
    setEditingId(null);
    const startTime = getGlobalLastTime();
    setFormActividad({
      categoria: '', tipo: '', desc: '',
      inicio: startTime.toFixed(1),
      fin: (startTime + 1).toFixed(1),
      isFlow: false
    });
    setShowActModal(true);
  };

  const handleSubmitActivity = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const catObj = CATEGORIAS_ACTIVIDAD.find(c => c.id === formActividad.categoria);
      const optObj = catObj?.opciones.find(o => o.value === formActividad.tipo);

      // Single call to addActivity now handles both main activity AND flow logic
      addActivity({
        ...formActividad,
        label: optObj?.label,
        color: catObj?.color
      }, editingId as string);

      setFormActividad({ categoria: '', tipo: '', desc: '', inicio: '', fin: '', isFlow: false });
      setEditingId(null);
      setShowActModal(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePrepareEditState = (st: IStatePoint) => {
    setEditData({ type: 'estado', data: st });
    setShowMasterModal(true);
  };

  // OPEN NEW STATE - AUTO FILL TIME
  const handleOpenNewState = () => {
    setEditingId(null);
    const startTime = getGlobalLastTime();
    setFormEstado(prev => ({
      ...prev,
      inicio: startTime.toFixed(1),
      fin: (startTime + 1).toFixed(1),
      preset: ''
    }));
    setShowStateModal(true);
  };

  // OPEN NEW ACTION - AUTO FILL TIME
  const handleOpenNewAction = () => {
    const startTime = getGlobalLastTime();
    setActionInitialTime(startTime);
    setShowActionModal(true);
  };

  const handleSubmitState = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      addState(formEstado, editingId);
      setEditingId(null);
      setShowStateModal(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const metrics = useMemo(() => calculateMetrics(currentData, currentData.isAggregated, timeRange), [currentData, timeRange]);

  const hasData = useMemo(() => {
    return Object.values(db).some((day: IDayData) =>
      (day.actividades && day.actividades.length > 0) ||
      (day.estados && day.estados.length > 0)
    );
  }, [db]);

  // HANDLER FOR TIME MODAL SUBMIT
  const handleTimeSubmit = (time: number) => {
    let newConfig = { ...currentData.config };
    if (timeModalType === 'arranque') newConfig.horaArranque = time;
    else if (timeModalType === 'finDia') newConfig.finDia = time;
    else if (timeModalType === 'horasSueno') newConfig.horasSueno = time;

    updateDayData({ ...currentData, config: newConfig });
    setTimeModalType(null);

    // AUTO-OPEN MASTER MODAL if setting start time for the first time (empty day)
    const isEmpty = currentData.actividades.length === 0 && currentData.estados.length === 0 && currentData.eventos.length === 0;
    if (timeModalType === 'arranque' && isEmpty) {
      setShowMasterModal(true);
    }
  };

  // HANDLER FOR NEW RECORD (Intercepts to ask for Start Time)
  const handlePlusClick = () => {
    const isEmpty = currentData.actividades.length === 0 && currentData.estados.length === 0 && currentData.eventos.length === 0;
    if (isEmpty && !currentData.config.horaArranque) {
      setTimeModalType('arranque');
      setTempTime(7.0);
      return;
    }
    setShowMasterModal(true);
  };

  // --- UNIFIED RESPONSIVE RENDER ---
  return (
    <div className="min-h-screen bg-[#f6f8f7] text-[#0e1b13] font-sans pb-24 md:pb-10">

      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentData={currentData}
        toggleFlujo={toggleFlujo}
        onOpenTimeModal={() => { setTimeModalType('arranque'); setTempTime(currentData.config.horaArranque || 7); }}
        onOpenDBSetup={() => setShowDBSetup(true)}
        syncStatus={syncStatus}
        syncError={syncError}
      />

      <div className="max-w-6xl mx-auto px-3 md:px-4 mt-4 md:mt-8">

        {/* TIME FILTER & ACTIONS */}
        <div className="flex items-center gap-2 mb-2 md:mb-6 overflow-x-auto pb-0 scrollbar-none">
          <div className="flex flex-wrap gap-1.5 md:gap-2 bg-white p-1 md:p-1.5 rounded-xl shadow-sm border border-gray-100 w-fit items-center flex-nowrap md:flex-wrap">
            {TIME_RANGES.map(range => (
              <button
                key={range}
                onClick={() => {
                  setTimeRange(range as TimeRange);
                  if (range === 'DÍA') setShowDateModal(true);
                }}
                className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all whitespace-nowrap ${timeRange === range
                  ? 'bg-[#19e66f] text-[#0e1b13] shadow-sm'
                  : 'text-gray-500 hover:bg-gray-50'
                  }`}
              >
                {range === 'ACUMULADO' ? 'ACUM.' : range} {range === 'DÍA' && <span className="ml-1 text-[8px] opacity-70">▼</span>}
              </button>
            ))}

          </div>

          {/* QUICK ADD BUTTON */}
          <button
            onClick={handlePlusClick}
            className="bg-[#0e1b13] text-white p-2.5 rounded-xl shadow-lg hover:bg-black transition-transform active:scale-95 flex items-center justify-center min-w-[40px]"
          >
            <Plus size={20} strokeWidth={3} />
          </button>
        </div>

        {activeTab === 'dashboard' && (
          <DashboardView
            currentData={currentData}
            metrics={metrics}
            updateDayData={updateDayData}
            onOpenActModal={handleOpenNewActivity}
            onOpenStateModal={handleOpenNewState}
            onOpenActionModal={handleOpenNewAction}
            onOpenFlowModal={() => { }}
            onOpenMasterModal={handlePlusClick}
            onOpenTimeModal={(type) => {
              setTimeModalType(type);
              let initialTime = 7.0;
              if (type === 'arranque') initialTime = currentData.config.horaArranque || 7;
              else if (type === 'finDia') initialTime = currentData.config.finDia || 23.5;
              else if (type === 'horasSueno') initialTime = currentData.config.horasSueno || 7;
              setTempTime(initialTime);
            }}
            timeRange={timeRange}
            setTimeRange={setTimeRange}
            onOpenDateModal={() => setShowDateModal(true)}
          />
        )}

        {activeTab === 'registros' && (
          <RecordsView
            currentData={currentData}
            onSimulate={() => setShowSimulateModal(true)}
            onEndSimulation={onEndSimulation}
            onReset={handleResetData}
            onEditActivity={handlePrepareEditActivity}
            onEditState={handlePrepareEditState}
            onDelete={deleteItem}
            hasData={hasData}
            isSimulating={isSimulating}
          />
        )}

        {activeTab === 'habitos' && (
          <HabitsView
            db={db}
            timeRange={timeRange}
          />
        )}

      </div>

      <ActivityModal
        isOpen={showActModal}
        onClose={() => { setShowActModal(false); setEditingId(null); }}
        form={formActividad}
        setForm={setFormActividad}
        onSubmit={handleSubmitActivity}
        isEditing={!!editingId}
      />

      <StateModal
        isOpen={showStateModal}
        onClose={() => { setShowStateModal(false); setEditingId(null); }}
        form={formEstado}
        setForm={setFormEstado}
        onSubmit={handleSubmitState}
        isEditing={!!editingId}
        onVarChange={(k, v) => setFormEstado(p => ({ ...p, variables: { ...p.variables, [k]: parseInt(v) } }))}
        timeRange={timeRange}
        currentDate={currentDate}
      />

      <ActionModal
        isOpen={showActionModal}
        onClose={() => setShowActionModal(false)}
        onSubmit={addEvent}
        initialTime={actionInitialTime}
        onAddState={(form) => addState(form, null)}
        onAddActivity={(form) => addActivity(form, null)}
      />

      <TimeModal
        isOpen={!!timeModalType}
        onClose={() => setTimeModalType(null)}
        type={timeModalType}
        tempTime={tempTime}
        setTempTime={setTempTime}
        onSave={handleSaveTimeConfig}
      />

      <SimulationModal
        isOpen={showSimulateModal}
        onClose={() => setShowSimulateModal(false)}
        onConfirm={onConfirmSimulation}
      />

      <MasterModal
        isOpen={showMasterModal}
        onClose={() => { setShowMasterModal(false); setEditData(null); }}
        currentData={currentData}
        handlers={{
          addActivity: addActivity,
          addState: addState,
          addEvent: addEvent,
          addBatch: addBatch
        }}
        editData={editData}
      />

      <DateModal
        isOpen={showDateModal}
        onClose={() => setShowDateModal(false)}
        currentDate={currentDate}
        onSelectDate={(date) => setCurrentDate(date)}
        recordedDates={Object.keys(db)}
      />

      {timeModalType && (
        <TimeModal
          isOpen={true}
          onClose={() => setTimeModalType(null)}
          type={timeModalType}
          initialTime={tempTime}
          onConfirm={handleTimeSubmit}
        />
      )}

      {showDBSetup && (
        <DBSetupModal
          localDB={db}
          onClose={() => setShowDBSetup(false)}
        />
      )}

      {/* --- MOBILE BOTTOM NAVIGATION --- */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/90 backdrop-blur-xl border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: '📊' },
            { id: 'registros', label: 'Registros', icon: '📋' },
            { id: 'habitos', label: 'Hábitos', icon: '🎯' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-xl transition-all ${activeTab === tab.id
                ? 'text-[#19e66f] scale-105'
                : 'text-gray-400 active:scale-95'
                }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className={`text-[10px] font-bold ${activeTab === tab.id ? 'text-[#0e1b13]' : 'text-gray-400'}`}>{tab.label}</span>
              {activeTab === tab.id && (
                <div className="w-4 h-1 bg-[#19e66f] rounded-full mt-0.5"></div>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* --- FLOATING DEBUG BUTTON (Mobile) --- */}
      <button
        onClick={() => setShowDebug(true)}
        className={`fixed bottom-20 right-3 z-[60] md:hidden w-10 h-10 rounded-full flex items-center justify-center text-white text-lg shadow-lg ${syncStatus === 'error' ? 'bg-red-500 animate-pulse' : syncStatus === 'synced' ? 'bg-green-500' : 'bg-gray-700'
          }`}
      >
        {syncStatus === 'error' ? '⚠️' : syncStatus === 'synced' ? '✓' : '🔌'}
      </button>

      {showDebug && (
        <div className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-4" onClick={() => setShowDebug(false)}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-3 text-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-black text-lg">🔌 Estado de Conexión</h3>
            <div className="space-y-2 text-xs bg-gray-50 p-3 rounded-xl font-mono">
              <p><b>URL:</b> {pbStatus.url}</p>
              <p><b>Credenciales:</b> {pbStatus.hasCredentials ? '✅ Sí' : '❌ No'}</p>
              <p><b>Autenticado:</b> {pbStatus.isAuthenticated ? `✅ (${pbStatus.authMethod})` : '❌ No'}</p>
              <p><b>Colección:</b> {pbStatus.collectionReady ? '✅ Lista' : '❌ No disponible'}</p>
              <p><b>Sync:</b> {syncStatus} {syncError && `(${syncError})`}</p>
              <p className="border-t pt-2 mt-2"><b>📊 Datos Cargados:</b></p>
              <p><b>Días en DB:</b> {Object.keys(db).length}</p>
              <p><b>Hoy ({new Date().toISOString().slice(0, 10)}):</b></p>
              <p className="pl-2">Actividades: {currentData.actividades?.length || 0}</p>
              <p className="pl-2">Estados: {currentData.estados?.length || 0}</p>
              <p className="pl-2">Eventos: {currentData.eventos?.length || 0}</p>
              <p><b>TimeRange:</b> {timeRange}</p>
              {pbStatus.lastError && <p className="text-red-600 break-all"><b>Error:</b> {pbStatus.lastError}</p>}
              {debugMsg && <p className="text-blue-600 font-bold break-all">{debugMsg}</p>}
            </div>
            <button
              onClick={async () => {
                setDebugMsg('Reconectando...');
                const result = await forceReauth();
                setDebugMsg(result);
              }}
              className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 active:scale-95 transition-all"
            >
              🔄 Reconectar
            </button>
            <button onClick={() => setShowDebug(false)} className="w-full py-2 bg-gray-100 text-gray-600 font-bold rounded-xl">
              Cerrar
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
