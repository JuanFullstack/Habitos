import { useState, useMemo } from 'react';
import { INITIAL_DAY_DATA } from '../constants';
import { Database, IDayData, IActivity, IStatePoint, IEvent, TimeRange } from '../types';
import { getTodayStr, aggregateData, simulateData, roundOne, checkOverlap, checkStateOverlap, calculateScore } from '../utils/calculations';

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

  const getEditableDay = (): IDayData => {
    const targetDate = timeRange === 'DÍA' ? currentDate : getTodayStr();
    return db[targetDate] || JSON.parse(JSON.stringify(INITIAL_DAY_DATA));
  };

  // --- ACTIONS ---
  
  // Generic update for replacing the whole day object (used carefully)
  const updateDayData = (newData: IDayData) => {
    const targetDate = timeRange === 'DÍA' ? currentDate : getTodayStr();
    setDb(prev => {
      const newDb = { ...prev, [targetDate]: newData };
      localStorage.setItem('bienestarDB', JSON.stringify(newDb));
      return newDb;
    });
  };

  const addActivity = (form: any, editingId: string | null) => {
    // 1. Snapshot for validation
    const currentDataSnapshot = getEditableDay();
    const now = new Date();
    const currentDecimal = now.getHours() + now.getMinutes() / 60;
    
    const inicio = form.inicio ? parseFloat(form.inicio) : currentDecimal;
    const fin = form.fin ? parseFloat(form.fin) : currentDecimal + 1; 
    
    // Check overlap: Skip check if the new activity is 'flujo' (layer)
    // Note: This check applies to the MAIN activity being added
    if (checkOverlap(inicio, fin, currentDataSnapshot.actividades, editingId)) {
        throw new Error("¡Conflicto de horario! Ya existe una actividad en ese rango.");
    }

    const duration = fin - inicio;
    const score = calculateScore(form.categoria, duration);

    // Generate unique ID (using random to avoid collision in batched calls)
    // IMPORTANT: Flow ID depends on this ID
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

    setDb(prev => {
        const targetDate = timeRange === 'DÍA' ? currentDate : getTodayStr();
        const prevDayData = prev[targetDate] || INITIAL_DAY_DATA;
        
        let updatedActivities = [...prevDayData.actividades];

        // 1. Handle Main Activity (Update or Add)
        if (editingId) {
            updatedActivities = updatedActivities.map(a => a.id === editingId ? mainActivity : a);
        } else {
            updatedActivities.push(mainActivity);
        }

        // 2. Handle Flow Activity
        // Filter out existing flow for this ID first (to allow cleanly re-adding or deleting)
        updatedActivities = updatedActivities.filter(a => a.id !== flowId);

        if (isFlowActive) {
            const flowActivity: IActivity = {
                id: flowId,
                nombre: "Sesión Flujo",
                tipo: "flujo", // Or 'sesion_flujo'
                categoria: "trabajo",
                inicio: inicio,
                fin: fin, // Syncs perfectly with main activity
                descripcion: `Sesión simultánea a ${mainActivity.nombre}`,
                color: 'bg-indigo-200 text-indigo-800',
                score: 100
            };
            updatedActivities.push(flowActivity);
        }

        const newDb = { 
            ...prev, 
            [targetDate]: { ...prevDayData, actividades: updatedActivities } 
        };
        localStorage.setItem('bienestarDB', JSON.stringify(newDb));
        return newDb;
    });
  };

  const addState = (form: any, editingId: string | number | null) => {
    const currentDataSnapshot = getEditableDay();
    const now = new Date();
    const currentDecimal = now.getHours() + now.getMinutes() / 60;
    
    const inicio = form.inicio ? parseFloat(form.inicio) : roundOne(currentDecimal);
    const fin = form.fin ? parseFloat(form.fin) : roundOne(currentDecimal + 1);

    if (fin <= inicio) {
        throw new Error("La hora de fin debe ser mayor a la hora de inicio.");
    }

    if (checkStateOverlap(inicio, fin, currentDataSnapshot.estados, editingId)) {
        throw new Error("¡Conflicto de horario! Ya existe un estado registrado en ese rango.");
    }

    const toPct = (val: number) => Math.round((val / 5) * 100);

    const newEstado: IStatePoint = {
      id: editingId || Date.now(), 
      t: inicio,  
      fin: fin,   
      v: parseInt(form.energia.toString()), 
      contexto: form.contexto,
      ...form.variables, 
      
      Ri: toPct(form.variables.Ri || 0),
      Voluntad: toPct(form.variables.Voluntad || 0),
      Distracción: toPct(form.variables.Distracción || 0),
      Horus: toPct(form.variables.Horus || 0),
      Energía: toPct(form.variables.Energía || 0)
    };
    
    setDb(prev => {
        const targetDate = timeRange === 'DÍA' ? currentDate : getTodayStr();
        const prevDayData = prev[targetDate] || INITIAL_DAY_DATA;

        const updatedStates = editingId
            ? prevDayData.estados.map(s => s.id === editingId ? newEstado : s).sort((a,b) => a.t - b.t)
            : [...prevDayData.estados, newEstado].sort((a,b) => a.t - b.t);

        const newDb = { 
            ...prev, 
            [targetDate]: { ...prevDayData, estados: updatedStates } 
        };
        localStorage.setItem('bienestarDB', JSON.stringify(newDb));
        return newDb;
    });
  };

  const addEvent = (eventData: { icon: string; label: string; t?: number; fin?: number; descripcion?: string }) => {
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
    
    setDb(prev => {
        const targetDate = timeRange === 'DÍA' ? currentDate : getTodayStr();
        const prevDayData = prev[targetDate] || INITIAL_DAY_DATA;
        
        const newDb = { 
            ...prev, 
            [targetDate]: { ...prevDayData, eventos: [...prevDayData.eventos, newEvent] } 
        };
        localStorage.setItem('bienestarDB', JSON.stringify(newDb));
        return newDb;
    });
  };

  const deleteItem = (type: 'actividades' | 'estados' | 'eventos', id: string | number) => {
    setDb(prev => {
        const targetDate = timeRange === 'DÍA' ? currentDate : getTodayStr();
        const prevDayData = prev[targetDate] || INITIAL_DAY_DATA;
        
        let filteredList = (prevDayData[type] as any[]);

        if (type === 'actividades') {
             // Cascade delete: Remove the activity AND its associated flow (id + '-flow')
             const flowId = `${id}-flow`;
             filteredList = filteredList.filter(item => item.id !== id && item.id !== flowId);
        } else {
             filteredList = filteredList.filter(item => item.id !== id);
        }
        
        const newDb = { 
            ...prev, 
            [targetDate]: { ...prevDayData, [type]: filteredList } 
        };
        localStorage.setItem('bienestarDB', JSON.stringify(newDb));
        return newDb;
    });
  };

  const resetData = (section: string) => {
    const empty = JSON.parse(JSON.stringify(INITIAL_DAY_DATA));
    setDb(prev => {
        const targetDate = timeRange === 'DÍA' ? currentDate : getTodayStr();
        let newDayData;
        
        if (section === 'all') {
             newDayData = { ...empty, config: { ...empty.config } };
        } else {
             newDayData = { ...(prev[targetDate] || empty), [section]: [] };
        }

        const newDb = { ...prev, [targetDate]: newDayData };
        localStorage.setItem('bienestarDB', JSON.stringify(newDb));
        return newDb;
    });
  };

  const handleSimulate = () => {
    const newDb = simulateData(db);
    setDb(newDb);
    localStorage.setItem('bienestarDB', JSON.stringify(newDb));
  };

  const handleImport = (json: string) => {
      const imported = JSON.parse(json);
      setDb(imported);
      localStorage.setItem('bienestarDB', JSON.stringify(imported));
  };

  const toggleFlujo = () => {
    setDb(prev => {
        const targetDate = timeRange === 'DÍA' ? currentDate : getTodayStr();
        const prevDayData = prev[targetDate] || INITIAL_DAY_DATA;
        
        const now = new Date();
        const decimalTime = now.getHours() + now.getMinutes() / 60;
        const isActive = prevDayData.config.flujoActivo;
        
        let newActs = prevDayData.actividades;
        if (isActive && prevDayData.config.inicioFlujo) {
            newActs = [...prevDayData.actividades, {
                id: Date.now().toString(), nombre: "Sesión Flujo", tipo: "flujo", categoria: "trabajo",
                inicio: prevDayData.config.inicioFlujo, fin: decimalTime,
                color: "bg-indigo-200 text-indigo-800", score: 100
            }];
        }

        const newDayData = {
            ...prevDayData,
            config: { 
                ...prevDayData.config, 
                flujoActivo: !isActive,
                inicioFlujo: !isActive ? decimalTime : null 
            },
            actividades: newActs
        };

        const newDb = { ...prev, [targetDate]: newDayData };
        localStorage.setItem('bienestarDB', JSON.stringify(newDb));
        return newDb;
    });
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
    updateDayData,
    addActivity,
    addState,
    addEvent,
    deleteItem,
    resetData,
    handleSimulate,
    handleImport,
    toggleFlujo
  };
};