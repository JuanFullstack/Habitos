import { useState, useMemo, useEffect } from 'react';
import { INITIAL_DAY_DATA } from '../constants';
import { Database, IDayData, IActivity, IStatePoint, IEvent, TimeRange } from '../types';
import { getTodayStr, aggregateData, simulateData, roundOne, checkOverlap, checkStateOverlap, calculateScore } from '../utils/calculations';
import { pb, COLLECTIONS, ensurePBReady } from '../lib/pocketbase';

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
  const [isSimulationMode, setIsSimulationMode] = useState(() => localStorage.getItem('isSimulationMode') === 'true');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'synced' | 'error'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);

  // --- HELPER: LOAD DATA ---
  const loadDataFromCloud = async () => {
    try {
      setIsSyncing(true);
      await ensurePBReady();
      const records = await pb.collection(COLLECTIONS.DAILY_LOGS).getList(1, 50, {
        sort: '-date',
        requestKey: null
      });

      if (records.items.length > 0) {
        const cloudDB: Database = {};
        records.items.forEach((rec: any) => {
          cloudDB[rec.date] = rec.content;
        });

        setDb(prev => {
          const merged = { ...prev, ...cloudDB };
          localStorage.setItem('bienestarDB', JSON.stringify(merged));
          return merged;
        });
      }
      setSyncStatus('synced');
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (err: any) {
      if (err.status !== 404) {
        console.error("Offline or Error loading from DB:", err);
        setSyncStatus('error');
        setSyncError("Error de Conexión/Permisos");
      }
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (!isSimulationMode) loadDataFromCloud();
  }, []);

  useEffect(() => {
    if (timeRange === 'DÍA' && !db[currentDate] && !isSyncing && !isSimulationMode) {
      const fetchDate = async () => {
        try {
          const record = await pb.collection(COLLECTIONS.DAILY_LOGS).getFirstListItem(`date="${currentDate}"`);
          if (record) {
            setDb(prev => {
              const newDb = { ...prev, [currentDate]: record.content };
              localStorage.setItem('bienestarDB', JSON.stringify(newDb));
              return newDb;
            });
          }
        } catch (e: any) {
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

  const saveDayData = async (date: string, newData: IDayData) => {
    setDb(prev => {
      const newDb = { ...prev, [date]: newData };
      localStorage.setItem('bienestarDB', JSON.stringify(newDb));
      return newDb;
    });

    if (isSimulationMode) return;

    setSyncStatus('saving');
    setSyncError(null);

    try {
      await ensurePBReady();
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

  const updateDayData = (newData: IDayData) => {
    const targetDate = timeRange === 'DÍA' ? currentDate : getTodayStr();
    saveDayData(targetDate, newData);
  };

  // --- INTERNAL LOGIC (Refactored for Batching) ---

  const _addActivity = (snapshot: IDayData, form: any, editingId: string | number | null) => {
    const safeEditingId = editingId ? editingId.toString() : null;
    const now = new Date();
    const currentDecimal = now.getHours() + now.getMinutes() / 60;

    const inicio = form.inicio ? parseFloat(form.inicio) : currentDecimal;
    const fin = form.fin ? parseFloat(form.fin) : currentDecimal + 1;

    if (checkOverlap(inicio, fin, snapshot.actividades, safeEditingId)) {
      throw new Error("¡Conflicto de horario! Ya existe una actividad en ese rango.");
    }

    const duration = fin - inicio;
    const score = calculateScore(form.categoria, duration);
    const newId = (safeEditingId || (Date.now() + Math.random()).toString());

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

    const flowId = `${newId}-flow`;
    const isFlowActive = form.isFlow === true;

    let updatedActivities = [...snapshot.actividades];
    if (editingId) {
      updatedActivities = updatedActivities.map(a => a.id === editingId ? mainActivity : a);
    } else {
      updatedActivities.push(mainActivity);
    }

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

    let newConfig = { ...snapshot.config };
    const dayIsEmpty = snapshot.actividades.length === 0 && snapshot.estados.length === 0 && snapshot.eventos.length === 0;
    if (dayIsEmpty && !editingId) {
      newConfig.horaArranque = typeof inicio === 'number' ? inicio : parseFloat(inicio);
    }

    return { ...snapshot, actividades: updatedActivities, config: newConfig };
  };

  const _addState = (snapshot: IDayData, form: any, editingId: string | number | null) => {
    const now = new Date();
    const currentDecimal = now.getHours() + now.getMinutes() / 60;
    const inicio = form.inicio ? parseFloat(form.inicio) : roundOne(currentDecimal);
    const fin = form.fin ? parseFloat(form.fin) : roundOne(currentDecimal + 1);

    if (fin <= inicio) throw new Error("La hora de fin debe ser mayor a la hora de inicio.");
    if (checkStateOverlap(inicio, fin, snapshot.estados, editingId)) {
      throw new Error("¡Conflicto de horario! Ya existe un estado registrado en ese rango.");
    }

    const newEstado: IStatePoint = {
      id: editingId || Date.now(),
      t: inicio, fin: fin,
      v: parseInt(form.energia.toString()),
      contexto: form.contexto,
      preset: form.preset,
      ...form.variables,
    };

    const updatedStates = editingId
      ? snapshot.estados.map(s => s.id === editingId ? newEstado : s).sort((a, b) => a.t - b.t)
      : [...snapshot.estados, newEstado].sort((a, b) => a.t - b.t);

    let newConfig = { ...snapshot.config };
    const dayIsEmpty = snapshot.actividades.length === 0 && snapshot.estados.length === 0 && snapshot.eventos.length === 0;
    if (dayIsEmpty && !editingId) {
      newConfig.horaArranque = inicio;
    }

    return { ...snapshot, estados: updatedStates, config: newConfig };
  };

  const _addEvent = (snapshot: IDayData, eventData: any) => {
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

    let newConfig = { ...snapshot.config };
    const dayIsEmpty = snapshot.actividades.length === 0 && snapshot.estados.length === 0 && snapshot.eventos.length === 0;
    if (dayIsEmpty) { newConfig.horaArranque = newEvent.t; }

    return { ...snapshot, eventos: [...snapshot.eventos, newEvent], config: newConfig };
  };

  // --- PUBLIC ACTIONS ---

  const addActivity = (form: any, editingId: string | number | null) => {
    const snapshot = getEditableDay();
    const newData = _addActivity(snapshot, form, editingId);
    updateDayData(newData);
  };

  const addState = (form: any, editingId: string | number | null) => {
    const snapshot = getEditableDay();
    const newData = _addState(snapshot, form, editingId);
    updateDayData(newData);
  };

  const addEvent = (eventData: any) => {
    const snapshot = getEditableDay();
    const newData = _addEvent(snapshot, eventData);
    updateDayData(newData);
  };

  const addBatch = (operations: { type: 'activity' | 'state' | 'event', data: any, id?: string | number | null }[]) => {
    let snapshot = getEditableDay();
    operations.forEach(op => {
      if (op.type === 'activity') snapshot = _addActivity(snapshot, op.data, op.id || null);
      if (op.type === 'state') snapshot = _addState(snapshot, op.data, op.id || null);
      if (op.type === 'event') snapshot = _addEvent(snapshot, op.data);
    });
    updateDayData(snapshot);
  };

  const deleteItem = (type: 'actividades' | 'estados' | 'eventos', id: string | number) => {
    const currentDataSnapshot = getEditableDay();
    let filteredList = (currentDataSnapshot[type] as any[]);

    if (type === 'actividades') {
      const flowId = `${id}-flow`;
      filteredList = filteredList.filter(item => String(item.id) !== String(id) && String(item.id) !== String(flowId));
    } else {
      filteredList = filteredList.filter(item => String(item.id) !== String(id));
    }
    updateDayData({ ...currentDataSnapshot, [type]: filteredList });
  };

  const purgeDatabase = async () => {
    setIsSyncing(true);
    try {
      setDb({});
      localStorage.removeItem('bienestarDB');
      const records = await pb.collection(COLLECTIONS.DAILY_LOGS).getFullList();
      await Promise.all(records.map(r => pb.collection(COLLECTIONS.DAILY_LOGS).delete(r.id)));
      setSyncStatus('synced');
    } catch (e) {
      console.error("Error purging DB:", e);
      setSyncStatus('error');
    } finally {
      setIsSyncing(false);
    }
  };

  const resetData = (section: string) => {
    if (section === 'global') {
      purgeDatabase();
      return;
    }
    const currentDataSnapshot = getEditableDay();
    const empty = JSON.parse(JSON.stringify(INITIAL_DAY_DATA));

    let newDayData;
    if (section === 'all') {
      newDayData = { ...empty, config: { ...empty.config } };
    } else {
      newDayData = { ...currentDataSnapshot, [section]: [] };
    }
    updateDayData(newDayData);
  };

  const handleSimulate = () => {
    setIsSimulationMode(true);
    localStorage.setItem('isSimulationMode', 'true');
    const newDb = simulateData(db);
    setDb(newDb);
    localStorage.setItem('bienestarDB', JSON.stringify(newDb));
  };

  const revertSimulation = async () => {
    setIsSimulationMode(false);
    localStorage.removeItem('isSimulationMode');
    setDb({});
    localStorage.removeItem('bienestarDB');
    await loadDataFromCloud();
  };

  const handleImport = (json: string) => {
    if (isSimulationMode) {
      alert("No puedes importar datos mientras estás en modo simulación.");
      return;
    }
    const imported = JSON.parse(json);
    setDb(imported);
    localStorage.setItem('bienestarDB', JSON.stringify(imported));

    Object.keys(imported).forEach(date => {
      saveDayData(date, imported[date]);
    });
  };

  const toggleFlujo = () => {
    const currentDataSnapshot = getEditableDay();
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
    updateDayData(newDayData);
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
    addBatch,
    deleteItem,
    resetData,
    handleSimulate,
    revertSimulation,
    handleImport,
    toggleFlujo
  };
};