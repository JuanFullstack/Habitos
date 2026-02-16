import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { CATEGORIAS_ACTIVIDAD, VARIABLES_EMOCIONALES, TIME_RANGES } from './constants';
import { calculateMetrics, formatTime } from './utils/calculations';
import { useBienestarData } from './hooks/useBienestarData';
import { IActivity, IStatePoint, TimeRange, IDayData } from './types';

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
    updateDayData, addActivity, addState, addEvent, deleteItem, resetData,
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
  const [timeModalType, setTimeModalType] = useState<'arranque' | 'finDia' | 'horasSueno' | null>(null);
  const [tempTime, setTempTime] = useState(7.0);

  const [showActModal, setShowActModal] = useState(false);
  const [showStateModal, setShowStateModal] = useState(false);
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showMasterModal, setShowMasterModal] = useState(false);
  const [showDBSetup, setShowDBSetup] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);

  // Form State
  const [formActividad, setFormActividad] = useState({ categoria: '', tipo: '', desc: '', inicio: '', fin: '', isFlow: false });
  const [formEstado, setFormEstado] = useState<{ energia: number, contexto: string, expNegativa: boolean, variables: any, inicio: string, fin: string }>({
    energia: 75, contexto: '', variables: {}, expNegativa: false, inicio: '', fin: ''
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

  // --- HELPER: Get Last End Time ---
  const getLastEndTime = (list: any[]) => {
    if (!list || list.length === 0) return 7.0;
    const last = list[list.length - 1];
    // Activity has 'fin', State has 'fin' (or 't' + duration), Event has 'fin' (or 't')
    // Safely calculate end time
    let endTime = last.fin;
    if (endTime === undefined || endTime === null) {
      endTime = last.t + 1; // Default duration 1h if no fin
    }
    return parseFloat(endTime);
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
    setEditingId(act.id);

    // Check if a linked flow activity exists (convention: ID + '-flow')
    const hasLinkedFlow = currentData.actividades.some(a => a.id === `${act.id}-flow`);

    setFormActividad({
      categoria: act.categoria,
      tipo: act.tipo,
      desc: act.descripcion || '',
      inicio: act.inicio.toString(),
      fin: act.fin.toString(),
      isFlow: hasLinkedFlow // Pre-fill based on existing data
    });
    setShowActModal(true);
  };

  // OPEN NEW ACTIVITY - AUTO FILL TIME
  const handleOpenNewActivity = () => {
    setEditingId(null);
    const startTime = getLastEndTime(currentData.actividades);
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
    setEditingId(st.id);
    const { id, t, v, contexto, expNegativa, ...vars } = st;
    const fromPct = (val: number) => Math.round((val / 100) * 5);

    const uiVars: any = {};
    VARIABLES_EMOCIONALES.forEach(key => {
      uiVars[key] = fromPct(st[key] || 0);
    });

    setFormEstado({
      energia: v,
      contexto: contexto || 'Normal',
      expNegativa: false,
      variables: uiVars,
      inicio: t.toString(),
      fin: st.fin ? st.fin.toString() : (t + 1).toString()
    });
    setShowStateModal(true);
  };

  // OPEN NEW STATE - AUTO FILL TIME
  const handleOpenNewState = () => {
    setEditingId(null);
    const startTime = getLastEndTime(currentData.estados);
    setFormEstado(prev => ({
      ...prev,
      inicio: startTime.toFixed(1),
      fin: (startTime + 1).toFixed(1)
    }));
    setShowStateModal(true);
  };

  // OPEN NEW ACTION - AUTO FILL TIME
  const handleOpenNewAction = () => {
    // Logic: If there are events, use last event time. If not, use last Activity time.
    let startTime = 7.0;
    if (currentData.eventos.length > 0) {
      startTime = getLastEndTime(currentData.eventos);
    } else {
      startTime = getLastEndTime(currentData.actividades);
    }
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
        <div className="flex items-center gap-2 mb-4 md:mb-6 overflow-x-auto pb-1">
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
                {range} {range === 'DÍA' && <span className="ml-1 text-[8px] opacity-70">▼</span>}
              </button>
            ))}

          </div>

          {/* QUICK ADD BUTTON */}
          <button
            onClick={() => setShowMasterModal(true)}
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
            onOpenMasterModal={() => setShowMasterModal(true)}
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
        onClose={() => setShowMasterModal(false)}
        currentData={currentData}
        handlers={{
          addActivity: addActivity,
          addState: addState,
          addEvent: addEvent
        }}
      />

      <DateModal
        isOpen={showDateModal}
        onClose={() => setShowDateModal(false)}
        currentDate={currentDate}
        onSelectDate={(date) => setCurrentDate(date)}
        recordedDates={Object.keys(db)}
      />

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

    </div>
  );
}
