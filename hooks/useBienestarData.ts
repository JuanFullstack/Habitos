import { useState, useMemo, useEffect } from 'react';
import { INITIAL_DAY_DATA } from '../constants';
import { Database, IDayData, IActivity, IStatePoint, IEvent, TimeRange } from '../types';
import { getTodayStr, aggregateData, simulateData, roundOne, checkOverlap, checkStateOverlap, calculateScore } from '../utils/calculations';
import { pb, COLLECTIONS } from '../lib/pocketbase';

export const useBienestarData = () => {
  const [db, setDb] = useState<Database>(() => {
    try {
      const saved = localStorage.getItem('bienestarDB');
      if (saved) return JSON.parse(saved);
      const today = getTodayStr();
      return { [today]: INITIAL_DAY_DATA };
    } catch (e) {
      return {};
    }
  });

  const [currentDate, setCurrentDate] = useState(getTodayStr());
  const [timeRange, setTimeRange] = useState<TimeRange>('HOY');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'synced' | 'error'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);

  // --- HELPER: LOAD DATA ---
  const loadDataFromCloud = async () => {
    try {
      setIsSyncing(true);
      // Load last 50 days
      const records = await pb.collection(COLLECTIONS.DAILY_LOGS).getList(1, 50, {
        sort: '-date',
        requestKey: null
      });

      if (records.items.length > 0) {
        const cloudDB: Database = {};
        records.items.forEach((rec: any) => {
          cloudDB[rec.date] = rec.content;
        });

        // Merge with local (Cloud wins)
        setDb(prev => {
          const merged = { ...prev, ...cloudDB };
          localStorage.setItem('bienestarDB', JSON.stringify(merged));
          return merged;
        });
      }
    } catch (err) {
      console.error("Offline or Error loading from DB:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  // --- INITIAL LOAD FROM POCKETBASE ---
  useEffect(() => {
    if (!isSimulationMode) loadDataFromCloud();
  }, []);

  // --- FETCH ON DEMAND (When selecting a date not in cache) ---
  useEffect(() => {
    if (timeRange === 'DÍA' && !db[currentDate] && !isSyncing && !isSimulationMode) {
      const fetchDate = async () => {
        try {
          const record = await pb.collection(COLLECTIONS.DAILY_LOGS).getFirstListItem(`date="${currentDate}"`);
          if (record) {
            setDb(prev => {
              const newDb = { ...prev, [currentDate]: record.content };
              // Update local storage to cache it
              localStorage.setItem('bienestarDB', JSON.stringify(newDb));
              return newDb;
            });
          }
        } catch (e: any) {
          // 404 is expected for new days
          if (e.status !== 404) console.warn("Error fetching day:", e);
        }
      };
      fetchDate();
    }
  }, [currentDate, timeRange, db, isSyncing, isSimulationMode]);

  const getEditableDay = (): IDayData => {
    const targetDate = timeRange === 'DÍA' ? currentDate : getTodayStr();
    return db[targetDate] || JSON.parse(JSON.stringify(INITIAL_DAY_DATA));
  };

  // --- CENTRALIZED PROXY TO SAVE DATA ---
  const saveDayData = async (date: string, newData: IDayData) => {
    // 1. Update State & LocalStorage (Optimistic UI)
    setDb(prev => {
      const newDb = { ...prev, [date]: newData };
      localStorage.setItem('bienestarDB', JSON.stringify(newDb));
      return newDb;
    });

    // 2. Persist to PocketBase (Async) - ONLY IF NOT SIMULATING
    if (isSimulationMode) return;

    setSyncStatus('saving');
    setSyncError(null);

    try {
      // Check if exists
      try {
        const record = await pb.collection(COLLECTIONS.DAILY_LOGS).getFirstListItem(`date="${date}"`);
        await pb.collection(COLLECTIONS.DAILY_LOGS).update(record.id, { content: newData });
      } catch (e: any) {
        if (e.status === 404) {
          await pb.collection(COLLECTIONS.DAILY_LOGS).create({ date, content: newData });
        } else { throw e; }
      }
      setSyncStatus('synced');
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (err: any) {
      console.error(`Failed to sync ${date} to Cloud:`, err);
      setSyncStatus('error');
      setSyncError(err.message || "Error de sincronización");
    }
  };


  // --- ACTIONS (Refactored to use saveDayData) ---

  const updateDayData = (newData: IDayData) => {
    const targetDate = timeRange === 'DÍA' ? currentDate : getTodayStr();
    saveDayData(targetDate, newData);
  };

  const addActivity = (form: any, editingId: string | null) => {
    const currentDataSnapshot = getEditableDay();
    const now = new Date();
    const currentDecimal = now.getHours() + now.getMinutes() / 60;

    const inicio = form.inicio ? parseFloat(form.inicio) : currentDecimal;
    const fin = form.fin ? parseFloat(form.fin) : currentDecimal + 1;

    // Validation (skip if editing same ID logic needs refining but basic overlap check is here)
    if (checkOverlap(inicio, fin, currentDataSnapshot.actividades, editingId)) {
      throw new Error("¡Conflicto de horario! Ya existe una actividad en ese rango.");
    }

    const duration = fin - inicio;
    const score = calculateScore(form.categoria, duration);
    const newId = (editingId || (Date.now() + Math.random()).toString());

    const mainActivity: IActivity = {
      id: newId,
      nombre: form.label || "Actividad",
      tipo: form.tipo,
      categoria: form.categoria,
      descripcion: form.desc,
      inicio, fin,
      color: form.color || "bg-gray-100",
      score: score
    };

    // Flow Logic
    const flowId = `${newId}-flow`;
    const isFlowActive = form.isFlow === true;

    const targetDate = timeRange === 'DÍA' ? currentDate : getTodayStr();
    let updatedActivities = [...currentDataSnapshot.actividades];

    if (editingId) {
      updatedActivities = updatedActivities.map(a => a.id === editingId ? mainActivity : a);
    } else {
      updatedActivities.push(mainActivity);
    }

    // Clear old flow
    updatedActivities = updatedActivities.filter(a => a.id !== flowId);

    if (isFlowActive) {
      updatedActivities.push({
        id: flowId,
        nombre: "Sesión Flujo",
        tipo: "flujo",
        categoria: "trabajo",
        inicio: inicio, fin: fin,
        descripcion: `Sesión simultánea a ${mainActivity.nombre}`,
        color: 'bg-indigo-200 text-indigo-800',
        score: 100
      });
    }

    saveDayData(targetDate, { ...currentDataSnapshot, actividades: updatedActivities });
  };

  const addState = (form: any, editingId: string | number | null) => {
    const currentDataSnapshot = getEditableDay();
    const now = new Date();
    const currentDecimal = now.getHours() + now.getMinutes() / 60;

    const inicio = form.inicio ? parseFloat(form.inicio) : roundOne(currentDecimal);
    const fin = form.fin ? parseFloat(form.fin) : roundOne(currentDecimal + 1);

    if (fin <= inicio) throw new Error("La hora de fin debe ser mayor a la hora de inicio.");
    if (checkStateOverlap(inicio, fin, currentDataSnapshot.estados, editingId)) {
      throw new Error("¡Conflicto de horario! Ya existe un estado registrado en ese rango.");
    }

    const toPct = (val: number) => Math.round((val / 5) * 100);
    const newEstado: IStatePoint = {
      id: editingId || Date.now(),
      t: inicio, fin: fin,
      v: parseInt(form.energia.toString()),
      contexto: form.contexto,
      ...form.variables,
      Ri: toPct(form.variables.Ri || 0),
      Voluntad: toPct(form.variables.Voluntad || 0),
      Distracción: toPct(form.variables.Distracción || 0),
      Horus: toPct(form.variables.Horus || 0),
      Energía: toPct(form.variables.Energía || 0)
    };

    const targetDate = timeRange === 'DÍA' ? currentDate : getTodayStr();
    const updatedStates = editingId
      ? currentDataSnapshot.estados.map(s => s.id === editingId ? newEstado : s).sort((a, b) => a.t - b.t)
      : [...currentDataSnapshot.estados, newEstado].sort((a, b) => a.t - b.t);

    saveDayData(targetDate, { ...currentDataSnapshot, estados: updatedStates });
  };

  const addEvent = (eventData: { icon: string; label: string; t?: number; fin?: number; descripcion?: string }) => {
    const currentDataSnapshot = getEditableDay();
    const now = new Date();
    const decimalTime = now.getHours() + now.getMinutes() / 60;

    const newEvent: IEvent = {
      id: Date.now() + Math.random(),
      t: eventData.t !== undefined ? eventData.t : decimalTime,
      fin: eventData.fin,
      icon: eventData.icon,
      label: eventData.label,
      descripcion: eventData.descripcion
    };

    const targetDate = timeRange === 'DÍA' ? currentDate : getTodayStr();
    saveDayData(targetDate, { ...currentDataSnapshot, eventos: [...currentDataSnapshot.eventos, newEvent] });
  };

  const deleteItem = (type: 'actividades' | 'estados' | 'eventos', id: string | number) => {
    const currentDataSnapshot = getEditableDay();
    const targetDate = timeRange === 'DÍA' ? currentDate : getTodayStr();

    let filteredList = (currentDataSnapshot[type] as any[]);

    if (type === 'actividades') {
      const flowId = `${id}-flow`;
      // FORCE STRING COMPARISON
      filteredList = filteredList.filter(item => String(item.id) !== String(id) && String(item.id) !== String(flowId));
    } else {
      // FORCE STRING COMPARISON
      filteredList = filteredList.filter(item => String(item.id) !== String(id));
    }

    saveDayData(targetDate, { ...currentDataSnapshot, [type]: filteredList });
  };

  const resetData = (section: string) => {
    const currentDataSnapshot = getEditableDay();
    const targetDate = timeRange === 'DÍA' ? currentDate : getTodayStr();
    const empty = JSON.parse(JSON.stringify(INITIAL_DAY_DATA));

    let newDayData;
    if (section === 'all') {
      newDayData = { ...empty, config: { ...empty.config } };
    } else {
      newDayData = { ...currentDataSnapshot, [section]: [] };
    }
    saveDayData(targetDate, newDayData);
  };

  const handleSimulate = () => {
    setIsSimulationMode(true);
    const newDb = simulateData(db);

    // Update local state ONLY - DO NOT SYNC TO CLOUD
    setDb(newDb);
    localStorage.setItem('bienestarDB', JSON.stringify(newDb));
  };

  const revertSimulation = () => {
    setIsSimulationMode(false);
    // Reload real data from Cloud
    loadDataFromCloud();
  };

  const handleImport = (json: string) => {
    if (isSimulationMode) {
      alert("No puedes importar datos mientras estás en modo simulación.");
      return;
    }
    const imported = JSON.parse(json);
    setDb(imported); // Local update
    localStorage.setItem('bienestarDB', JSON.stringify(imported));

    // Async Sync
    Object.keys(imported).forEach(date => {
      saveDayData(date, imported[date]);
    });
  };

  const toggleFlujo = () => {
    const currentDataSnapshot = getEditableDay();
    const targetDate = timeRange === 'DÍA' ? currentDate : getTodayStr();
    const now = new Date();
    const decimalTime = now.getHours() + now.getMinutes() / 60;
    const isActive = currentDataSnapshot.config.flujoActivo;

    let newActs = currentDataSnapshot.actividades;
    if (isActive && currentDataSnapshot.config.inicioFlujo) {
      newActs = [...currentDataSnapshot.actividades, {
        id: Date.now().toString(), nombre: "Sesión Flujo", tipo: "flujo", categoria: "trabajo",
        inicio: currentDataSnapshot.config.inicioFlujo, fin: decimalTime,
        color: "bg-indigo-200 text-indigo-800", score: 100
      }];
    }

    const newDayData = {
      ...currentDataSnapshot,
      config: {
        ...currentDataSnapshot.config,
        flujoActivo: !isActive,
        inicioFlujo: !isActive ? decimalTime : null
      },
      actividades: newActs
    };

    saveDayData(targetDate, newDayData);
  };

  const currentData: IDayData = useMemo(() => {
    if (timeRange === 'HOY') {
      const today = getTodayStr();
      return db[today] || INITIAL_DAY_DATA;
    }
    if (timeRange === 'DÍA') {
      return db[currentDate] || {
        actividades: [], estados: [], eventos: [],
        config: { horaArranque: null, finDia: null, horasSueno: 7, flujoActivo: false, inicioFlujo: null },
        habitos: {}, isAggregated: false
      };
    }
    return aggregateData(db, timeRange);
  }, [db, timeRange, currentDate]);

  return {
    db,
    currentData,
    currentDate,
    setCurrentDate,
    timeRange,
    setTimeRange,
    isSyncing,
    syncStatus,
    syncError,
    updateDayData,
    addActivity,
    addState,
    addEvent,
    deleteItem,
    resetData,
    handleSimulate,
    revertSimulation,
    handleImport,
    toggleFlujo
  };
};