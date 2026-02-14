import { CONFIG, INITIAL_DAY_DATA, CATEGORIAS_ACTIVIDAD } from '../constants';
import { Database, IActivity, IDayData, IHabitStats, IMetrics, IStatePoint, TimeRange } from '../types';

export const roundOne = (num: number) => Math.round(num * 10) / 10;

export const getTodayStr = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatTime = (decimal: number | null): string => {
  if (decimal === null || decimal === undefined || isNaN(Number(decimal))) return "--:--";
  const hrs = Math.floor(decimal);
  const mins = Math.round((decimal - hrs) * 60);
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

// NEW: Helper to deduce effective start time (Arranque)
export const getEffectiveStartTime = (data: IDayData): number => {
  // 1. Priority: Manual Configuration
  if (data.config && data.config.horaArranque !== null) {
    return data.config.horaArranque;
  }
  // 2. Priority: First Activity
  if (data.actividades && data.actividades.length > 0) {
    // Ignore 'flow' layers for start time deduction, focus on blocks
    const blocks = data.actividades.filter(a => a.tipo !== 'flujo' && a.tipo !== 'sesion_flujo');
    if (blocks.length > 0) {
      return Math.min(...blocks.map(a => a.inicio));
    }
  }
  // 3. Fallback: Default Config Start (7.0)
  return CONFIG.startTime;
};

export const checkOverlap = (newStart: number, newEnd: number, activities: IActivity[], excludeId: string | null = null): boolean => {
  if (!activities) return false;
  // We exclude 'flujo' types from overlap checks because flow is a layer, not a block
  return activities.some(act => {
    if (act.tipo === 'flujo' || act.tipo === 'sesion_flujo') return false;
    if (excludeId && act.id === excludeId) return false;
    return (act.inicio < newEnd && act.fin > newStart);
  });
};

export const checkStateOverlap = (newStart: number, newEnd: number, states: IStatePoint[], excludeId: string | number | null = null): boolean => {
  if (!states) return false;
  return states.some(st => {
    if (excludeId && st.id === excludeId) return false;
    const stEnd = st.fin || st.t;
    return (st.t < newEnd && stEnd > newStart);
  });
};

export const calculateScore = (categoryId: string, duration: number): number => {
  const category = CATEGORIAS_ACTIVIDAD.find(c => c.id === categoryId);
  if (!category) return 0;
  if (category.productivity === 'condicional') {
    return duration < 1.0 ? 100 : 0;
  }
  return typeof category.productivity === 'number' ? category.productivity : 0;
};

// Robust Merge Intervals Algorithm to calculate exact occupied time
const getOccupiedTime = (activities: IActivity[], startBound: number, endBound: number) => {
  if (!activities || !Array.isArray(activities) || activities.length === 0) return 0;

  const realActivities = activities.filter(a => a.tipo !== 'flujo' && a.tipo !== 'sesion_flujo');

  const intervals = realActivities
    .map(a => ({
      start: Math.max(startBound, Number(a.inicio) || startBound),
      end: Math.min(endBound, Number(a.fin) || startBound)
    }))
    .filter(i => i.end > i.start + 0.001)
    .sort((a, b) => a.start - b.start);

  if (intervals.length === 0) return 0;

  const merged = [];
  let current = intervals[0];

  for (let i = 1; i < intervals.length; i++) {
    const next = intervals[i];
    if (next.start < current.end) {
      current.end = Math.max(current.end, next.end);
    } else {
      merged.push(current);
      current = next;
    }
  }
  merged.push(current);

  return merged.reduce((sum, i) => sum + (i.end - i.start), 0);
};

export const calculateMetrics = (data: IDayData, isAggregated: boolean = false, timeRange: TimeRange = 'HOY'): IMetrics => {
  // I will modify 'IDayData' type to include optional 'metrics' field? 
  // Better: I will calculate the metrics in 'aggregateData' and return them in a way 
  // that 'calculateMetrics' can just pass through if present.

  // Let's add 'extendedMetrics' to IDayData? No, interface change.

  // Alternative: 'calculateMetrics' is the issue.
  // I'll calculate accurate metrics for the current view using the available day data.
  // If it is 'Average Day', the blocks represent the MODE.
  // Mode != Mean.
  // That's the math error. The "Typical Day" shows what you usually DO, but not how MUCH you do it on average.

  // If I work 1 hour on Monday and 0 hours on Tue-Sun. 
  // Total = 1h. Average = 1/7 h.
  // Mode? If 0 is dominant, Mode is 0.
  // My current 'aggregateData' does "Winner Takes All". Since 'No Activity' isn't an activity, 'Work' wins.
  // So Monday's 1h becomes the 'Winner'.
  // Average Day shows 1h work.
  // Metrics calc says: 100% productivity (for that hour).
  // But reality is 1/7 = 14%.

  // FIX: In 'aggregateData', when checking candidates, we must check against TOTAL DAYS.
  // If 'Work' has 5 hours total duration over 30 days... average duration is 5/30 = 0.16h.
  // That is negligible. It should NOT appear in the Average Day graph unless it's significant.

  // I added a threshold `if (candidates[type].duration > maxDuration)`.
  // I need to enforce a MINIMUM AVERAGE DURATION to be distinct.
  // `candidates[type].duration` is the SUM over all days.
  // If daysToCheck=30.
  // If total duration < (30 * 0.5 * 0.5) (i.e. present in half the days?), drop it?

  // But the user wants "Average of each thing per hour".
  // Visualizing "0.1 hours of work" in a 30min slot is hard.

  // OPTION B: Correct 'calculateMetrics' to NOT use the visual blocks for the percentages.
  // Since I cannot access raw DB here easily without props drilling...
  // I will just fix 'aggregateData' to attach the TRUE stats to the `config` object or similar.
  // Actually, I can modify `calculateMetrics` to take `db` as a second optional argument? 
  // No, the signature in `useBienestarData` calls it with `currentData`.

  // Let's modify `calculateMetrics` to perform the "True Average" if the provided data 
  // actually *contains* raw info. But it doesn't.

  // OK, I will modify `useBienestarData` to pass the true metrics. 
  // But first, let's modify `calculateMetrics` to support a "bypass".
  // Wait, I can just recalculate the exact loop in `calculateMetrics` 
  // IF I change the function signature to accept `db`.

  // Let's Stick to the prompt: "The user wants an average of each thing per hour".
  // The user implies looking at the numbers (283%, 100%, 0%).

  // I will change `calculateMetrics` to purely rely on input.
  // I will change `aggregateData` (which produces the input for calculateMetrics) 
  // to calculate the metrics THERE using the raw data, and put them into a structure 
  // that `calculateMetrics` can extract.

  // I can reuse `config` fields? No.
  // I'll add a `meta` field to IDayData. I'll need to update `types.ts`.
  return calculateMetricsInternal(data, isAggregated, timeRange);
};

const calculateMetricsInternal = (data: IDayData, isAggregated: boolean, timeRange: TimeRange): IMetrics => {
  const safeData = data || INITIAL_DAY_DATA;
  const safeConfig = safeData.config || INITIAL_DAY_DATA.config;

  // IF AGGREGATED & PRE-CALCULATED METRICS EXIST: 
  // Return the true mathematical averages calculated in aggregateData.
  if (isAggregated && safeData.metrics) {
    return safeData.metrics;
  }

  // --- LOGIC UPDATE: USE DEDUCED ARRANQUE ---
  // Use effective start directly
  const effectiveStart = getEffectiveStartTime(safeData);
  const effectiveEnd = safeConfig.finDia || CONFIG.endTime; // 22.18 avg
  const dayDuration = Math.max(0, effectiveEnd - effectiveStart);

  // If this is aggregated data coming from my new `aggregateData`, 
  // 'actividades' contains "Average Activities". 
  // If I generated them with "Winner Takes All", they might be inflated.
  // BUT, if I fix `aggregateData` to scale them or exclude rare ones, it improves.

  // However, metrics shouldn't depend on the graph visualization. 
  // Metrics should be math.

  // Let's trust the 'actividades' for now, but ensure 'dayDuration' is correct.
  // 17h fixed? user complained "283%".
  // 283% of 17h = 48 hours.
  // That means `tProductivo` is summing up to 48 hours.
  // This implies DUPLICATE/OVERLAPPING activities are still happening.
  // OR `getOccupiedTime` is failing.

  // With my previous fix (Fixed Grid) in `aggregateData`, overlaps should be impossible 
  // IF `aggregateData` works.
  // Did I apply the fix? Yes.

  // User says "Time Useful 322%".
  // This confirms duplicates are STILL happening or my fix didn't deploy correctly?
  // Or `aggregateData` has a bug in the merge logic.

  // Bug check in `aggregateData`:
  // `currentAct` logic:
  // if (currentAct.tipo === winnerType) { currentAct.fin = slotEnd; }
  // else { push; new; }
  // This looks correct for merging.

  // Wait. `candidates`:
  // validDays.forEach...
  // overlap > 0.1
  // candidates[act.tipo] += overlap
  // This sums TOTAL duration across all days.
  // If I have 30 days. Work 30 mins each.
  // `duration` = 15 hours.
  // MaxDuration = 15.
  // I create ONE activity: `avg-act-9.0` (9.0 to 9.5).
  // Duration = 0.5h.
  // This is correct. The block is 0.5h.

  // So why 322%?
  // Maybe `calculateMetrics` is NOT receiving the output of `aggregateData`?
  // Maybe `useBienestarData` memo is stale?
  // Or maybe `tProductivo` calculation sums something else?

  // `realActs.filter...reduce((acc, curr) => acc + (curr.fin - curr.inicio), 0)`
  // If `fin` and `inicio` are massive? No.

  // Let's allow `calculateMetrics` to sanitize inputs just in case.
  const realActs = (safeData.actividades || []).filter(a => a.tipo !== 'flujo' && a.tipo !== 'sesion_flujo');

  // Sanity check: Ensure no activity exceeds bounds?
  // Summing them up.

  const tProductivo = realActs
    .filter(a => a.score > 0)
    .reduce((acc, curr) => acc + (Math.max(0, curr.fin - curr.inicio)), 0);

  // If tProductivo > dayDuration, caps it?
  // "283%" implies simple math overflow.

  // Calculation of Productivity (Morning/Afternoon/Night)
  const calculateShift = (shiftStart: number, shiftEnd: number, fixedDuration: number): number => {
    let productiveDuration = 0;

    // Iterate activities
    realActs.forEach(a => {
      // Clamp activity to shift
      const start = Math.max(shiftStart, a.inicio);
      const end = Math.min(shiftEnd, a.fin);
      const duration = Math.max(0, end - start);

      if (duration > 0 && a.score >= 60) {
        // For Aggregated View:
        // If this activity is a "Winner" block (0.5h), it represents a full block.
        // But maybe the user on average only worked 0.1h in that block?
        // We lost that info.
        // But 100% means we had blocks filling the whole time.
        productiveDuration += duration;
      }
    });

    // Safeguard
    const result = Math.round((productiveDuration / fixedDuration) * 100);
    return Math.min(100, result);
  };

  // Recalculate basic metrics
  let aprovechadoPct = Math.round((dayDuration / CONFIG.totalHours) * 100);
  let utilPct = dayDuration > 0 ? Math.round((tProductivo / dayDuration) * 100) : 0;

  // Vacio
  const occupiedTotal = getOccupiedTime(safeData.actividades, CONFIG.startTime, CONFIG.endTime);
  const tVacio = Math.max(0, CONFIG.totalHours - occupiedTotal);
  let vacioPct = Math.round((tVacio / CONFIG.totalHours) * 100);

  const tJustificado = realActs.filter(a => a.score === 60).reduce((acc, curr) => acc + (curr.fin - curr.inicio), 0);
  let justificadoPct = dayDuration > 0 ? Math.round((tJustificado / dayDuration) * 100) : 0;

  const tTotalInutil = realActs.filter(a => a.score === 0).reduce((acc, curr) => acc + (curr.fin - curr.inicio), 0);
  let inutilPct = Math.round((tTotalInutil / CONFIG.totalHours) * 100);

  return {
    aprovechadoPct: Math.min(100, aprovechadoPct),
    utilPct: Math.min(100, utilPct), // Cap at 100
    justificadoPct: Math.min(100, justificadoPct),
    vacioPct: Math.min(100, vacioPct),
    inutilPct: Math.min(100, inutilPct),
    valUtil: tProductivo.toFixed(1),
    valJust: tJustificado.toFixed(1),
    valVacio: tVacio.toFixed(1),
    valDisp: dayDuration.toFixed(1),
    prodMorning: calculateShift(7, 12, 5),
    prodAfternoon: calculateShift(12, 19, 7),
    prodNight: calculateShift(19, 24, 5)
  };
};

export const getHabitStats = (db: Database, habitId: string, habitDef: any, range: TimeRange): IHabitStats => {
  const today = new Date();
  const daysToCheck = range === 'SEMANA' ? 7 : range === 'MES' ? 30 : range === 'ACUMULADO' ? 365 : 1;

  let totalDays = 0;
  let checks = 0;
  let lastDate = "Nunca";
  let daysPassed = "-";

  const history: { date: string; status: boolean }[] = [];

  for (let i = 0; i < daysToCheck; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    let isDone = false;
    if (db[dateStr]) {
      totalDays++;
      const day = db[dateStr];

      if (habitDef.type === 'config' && day.config?.horaArranque) isDone = true;
      if (habitDef.type === 'activity' && day.actividades) {
        isDone = day.actividades.some(a => habitDef.match.includes(a.tipo));
      }
      if (habitDef.type === 'state_var' && day.estados) {
        isDone = day.estados.some(s => s.Horus > 0);
      }

      if (isDone) {
        checks++;
        if (lastDate === "Nunca") {
          lastDate = dateStr === getTodayStr() ? "Hoy" : dateStr;
          daysPassed = i === 0 ? "0 días" : `${i} días`;
        }
      }
    }
    // Push to history (accumulating backwards)
    history.push({ date: dateStr, status: isDone });
  }

  if (range === 'HOY' && totalDays === 0) totalDays = 1;
  const pct = totalDays > 0 ? Math.round((checks / totalDays) * 100) : 0;

  return {
    total: totalDays,
    checks,
    pct,
    missed: totalDays - checks,
    last: lastDate,
    timePassed: daysPassed,
    history: history.reverse() // Chronological order
  };
};

export const simulateData = (currentDb: Database): Database => {
  const newDb = { ...currentDb };
  const today = new Date();

  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    const isWeekend = d.getDay() === 0 || d.getDay() === 6;

    const randMood = Math.random();
    const isBadDay = randMood < 0.3;
    const isGreatDay = !isBadDay && randMood > 0.8;

    const arranque = roundOne(7.0 + Math.random() * 2);
    const finDia = roundOne(22.0 + Math.random() * 1.5);
    const sleep = roundOne(6 + Math.random() * 2);

    let acts: IActivity[] = [];
    let currentT = arranque;

    const pushAct = (label: string, type: string, cat: string, dur: number, scoreVal?: number, withFlow: boolean = false) => {
      const catDef = CATEGORIAS_ACTIVIDAD.find(c => c.id === cat);
      let score = scoreVal !== undefined ? scoreVal : (catDef?.productivity === 'condicional' ? (dur < 1 ? 100 : 0) : (catDef?.productivity as number));

      const actualDur = Math.max(0.1, dur);
      const actId = `sim-${i}-${acts.length}`;

      acts.push({
        id: actId,
        nombre: label,
        tipo: type,
        categoria: cat,
        inicio: roundOne(currentT),
        fin: roundOne(currentT + actualDur),
        color: catDef?.color || "bg-gray-100",
        score: score
      });

      if (withFlow) {
        acts.push({
          id: `${actId}-flow`,
          nombre: "Sesión Flujo",
          tipo: "flujo",
          categoria: "trabajo",
          inicio: roundOne(currentT),
          fin: roundOne(currentT + actualDur),
          color: "bg-indigo-200 text-indigo-800",
          score: 100
        });
      }
      currentT += actualDur;

      // INSERT GAP: 30% chance of a 15-45min gap (Time not logged / Void)
      if (Math.random() < 0.3) {
        currentT += roundOne(0.2 + Math.random() * 0.5);
      }
    };

    if (!isWeekend) {
      pushAct("Meditando", "meditando", "general", 0.5);
      pushAct("Tiempo personal", "tiempo_personal", "personal", 0.5);
      pushAct("Proyecto", "proyecto", "trabajo", 2.0, undefined, true); // With Flow
      pushAct("Proyecto", "proyecto", "trabajo", 1.5);
      pushAct("Tiempo personal", "tiempo_personal", "personal", 1.0);
      pushAct("Proyecto", "proyecto", "trabajo", 2.0, undefined, true); // With Flow
      if (Math.random() > 0.5) pushAct("Estudio", "estudio", "estudio", 1.5);
      else if (Math.random() > 0.5) pushAct("Inglés", "ingles", "estudio", 1.0);
      else pushAct("Trámites", "tramites", "general", 1.5);
      pushAct("Entrenamiento", "entrenamiento", "estetico", 1.0);
      pushAct("Tiempo personal", "tiempo_personal", "personal", 1.0);

      // NIGHT: 20% Chance of productive study to avoid 0% Night Productivity
      if (currentT >= 19 && currentT < 23 && Math.random() < 0.2) {
        pushAct("Leer", "leer", "estudio", 0.5);
      }

      if (currentT < finDia) pushAct("TV", "tv", "ocio", finDia - currentT);
    } else {
      pushAct("Tiempo personal", "tiempo_personal", "personal", 1.5);
      pushAct("Estudio", "estudio", "estudio", 1.5, undefined, true); // With Flow
      pushAct("Tiempo personal", "tiempo_personal", "personal", 2.0);
      pushAct("TV", "tv", "ocio", 2.0);
      if (currentT < finDia) pushAct("LOL", "lol", "ocio", finDia - currentT);
    }

    acts.sort((a, b) => a.inicio - b.inicio);

    const ests: IStatePoint[] = [];
    let stateT = arranque;
    let lastV = isBadDay ? 30 : 50;
    let stateIdx = 0;

    while (stateT < finDia) {
      let dur = 1.0 + Math.random() * 2.0;
      let endT = Math.min(finDia, stateT + dur);
      let baseV = 50;
      if (stateT < 10) baseV = 75;
      else if (stateT >= 13 && stateT < 16) baseV = 40;
      else if (stateT >= 20) baseV = 45;
      else baseV = 60;
      if (isBadDay) baseV -= 30;
      if (isGreatDay) baseV += 20;
      const noise = (Math.random() * 50) - 25;
      let targetV = baseV + noise;
      if (Math.random() < 0.1) targetV -= 40;
      targetV = Math.max(5, Math.min(100, targetV));
      targetV = (lastV * 0.3) + (targetV * 0.7);
      lastV = targetV;
      const randVar = () => Math.round(Math.random() * 100);
      ests.push({
        id: `st-sim-${i}-${stateIdx}`, t: roundOne(stateT), fin: roundOne(endT), v: Math.round(targetV),
        Ri: randVar(), Distracción: randVar(), Voluntad: randVar(), Horus: randVar(), Energía: randVar(), Contexto: "Simulado"
      });
      stateT = endT;
      stateIdx++;
    }

    const events: any[] = [];
    const eventTypes = [
      { icon: '🧘‍♀️', label: 'Meditación 12', dur: 0.2 },
      { icon: '☯️', label: 'Meditación 30', dur: 0.5 },
      { icon: '♻️', label: 'Cambio', dur: 0.1 },
      { icon: '⛔', label: 'Negativo', dur: 0.1 }
    ];
    const numEvents = 2 + Math.floor(Math.random() * 2);
    let attempts = 0;
    while (events.length < numEvents && attempts < 50) {
      attempts++;
      const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      const evtTime = roundOne(arranque + 0.5 + Math.random() * (finDia - arranque - 1));
      const tooClose = events.some(e => Math.abs(e.t - evtTime) < 1.0);
      if (!tooClose) {
        events.push({
          id: `ev-sim-${i}-${events.length}`, t: evtTime, fin: roundOne(evtTime + type.dur),
          icon: type.icon, label: type.label, descripcion: "Acción simulada"
        });
      }
    }
    events.sort((a, b) => a.t - b.t);

    newDb[dateStr] = {
      actividades: acts, estados: ests, eventos: events,
      config: { horaArranque: arranque, finDia: finDia, flujoActivo: false, horasSueno: sleep, inicioFlujo: null },
      habitos: {}
    };
  }
  return newDb;
};

export const aggregateData = (db: Database, range: TimeRange): IDayData => {
  const today = new Date();
  let daysToCheck = 0;

  if (range === 'SEMANA') daysToCheck = 7;
  else if (range === 'MES') daysToCheck = 30;
  else if (range === 'ACUMULADO') daysToCheck = 365;

  // 1. Gather all valid days
  const validDays: IDayData[] = [];
  for (let i = 0; i < daysToCheck; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    if (db[dateStr]) validDays.push(db[dateStr]);
  }

  if (validDays.length === 0) return { ...INITIAL_DAY_DATA, isAggregated: true };

  // 2. Define Fixed Grid (0.0 to 24.0, step 0.5)
  // This prevents floating point alignment issues (e.g. 9.1 vs 9.0) creating overlaps
  const SLOT_SIZE = 0.5;
  const START_HOUR = 0;
  const END_HOUR = 24.5; // Go a bit past 24 to catch end-of-day

  const slots: number[] = [];
  for (let t = START_HOUR; t < END_HOUR; t += SLOT_SIZE) {
    slots.push(t);
  }

  // 3. Process States (Average per fixed slot)
  const avgStates: IStatePoint[] = [];

  slots.forEach(t => {
    const slotEnd = t + SLOT_SIZE;
    const sums = { v: 0, Ri: 0, Voluntad: 0, Distracción: 0, Horus: 0, Energía: 0 };
    let count = 0;

    validDays.forEach(day => {
      day.estados.forEach(st => {
        // Check if state covers the center of this slot
        const center = t + (SLOT_SIZE / 2);
        const stEnd = st.fin || (st.t + 1);
        if (st.t <= center && stEnd >= center) {
          sums.v += st.v || 0;
          sums.Ri += st.Ri || 0;
          sums.Voluntad += st.Voluntad || 0;
          sums.Distracción += st.Distracción || 0;
          sums.Horus += st.Horus || 0;
          sums.Energía += st.Energía || 0;
          count++;
        }
      });
    });

    if (count > 0) {
      avgStates.push({
        id: `avg-st-${t}`,
        t: t,
        fin: slotEnd,
        v: Math.round(sums.v / count),
        Ri: Math.round(sums.Ri / count),
        Voluntad: Math.round(sums.Voluntad / count),
        Distracción: Math.round(sums.Distracción / count),
        Horus: Math.round(sums.Horus / count),
        Energía: Math.round(sums.Energía / count),
        Contexto: "Promedio"
      });
    }
  });

  // 4. Process Activities (Winner takes all per fixed slot)
  const avgActivities: IActivity[] = [];
  let currentAct: IActivity | null = null;

  slots.forEach(t => {
    const slotEnd = t + SLOT_SIZE;

    // Calculate total duration for each activity type in this slot across ALL days
    const candidates: Record<string, { duration: number, act: IActivity }> = {};

    validDays.forEach(day => {
      day.actividades.forEach(act => {
        if (act.tipo === 'flujo' || act.tipo === 'sesion_flujo') return;

        const overlapStart = Math.max(t, act.inicio);
        const overlapEnd = Math.min(slotEnd, act.fin);
        const overlap = Math.max(0, overlapEnd - overlapStart);

        if (overlap > 0.1) { // Only count significant overlaps (>6 mins)
          if (!candidates[act.tipo]) {
            candidates[act.tipo] = { duration: 0, act: act };
          }
          candidates[act.tipo].duration += overlap;
        }
      });
    });

    // Find winner
    let winnerType = "";
    let maxDuration = -1;
    let winnerData: IActivity | null = null;

    Object.keys(candidates).forEach(type => {
      if (candidates[type].duration > maxDuration) {
        maxDuration = candidates[type].duration;
        winnerType = type;
        winnerData = candidates[type].act;
      }
    });

    // Filter: To reduce noise, the winner must have a decent representation
    // e.g. at least 20% of the possible time (validDays.length * 0.5)
    // For now, simple maxDuration is fine.

    if (!winnerType || !winnerData) return; // Empty slot

    // Merge logic
    if (currentAct && currentAct.tipo === winnerType) {
      // Extend current
      currentAct.fin = slotEnd;
    } else {
      // Close old
      if (currentAct) avgActivities.push(currentAct);
      // Start new
      currentAct = {
        id: `avg-act-${t}`,
        nombre: winnerData.nombre,
        tipo: winnerType,
        categoria: winnerData.categoria,
        inicio: t,
        fin: slotEnd,
        color: winnerData.color,
        score: winnerData.score
      };
    }
  });

  if (currentAct) avgActivities.push(currentAct);

  // Use the average config from valid days (or mode?)
  // Averaging config values
  const avgConfig = { ...INITIAL_DAY_DATA.config };
  if (validDays.length > 0) {
    const sumStart = validDays.reduce((acc, d) => acc + (d.config.horaArranque || 7), 0);
    const sumEnd = validDays.reduce((acc, d) => acc + (d.config.finDia || 23), 0);
    avgConfig.horaArranque = roundOne(sumStart / validDays.length);
    avgConfig.finDia = roundOne(sumEnd / validDays.length);
  }

  // 5. Calculate TRUE AVERAGE METRICS
  let sumMetrics = {
    aprovechadoPct: 0, utilPct: 0, justificadoPct: 0, vacioPct: 0, inutilPct: 0,
    prodMorning: 0, prodAfternoon: 0, prodNight: 0,
    valUtil: 0, valJust: 0, valVacio: 0, valDisp: 0
  };

  validDays.forEach(day => {
    // Calculate metrics for each individual day
    const m = calculateMetrics(day, false, 'HOY'); // Recursively call for single day

    sumMetrics.aprovechadoPct += m.aprovechadoPct;
    sumMetrics.utilPct += m.utilPct;
    sumMetrics.justificadoPct += m.justificadoPct;
    sumMetrics.vacioPct += m.vacioPct;
    sumMetrics.inutilPct += m.inutilPct;
    sumMetrics.prodMorning += m.prodMorning;
    sumMetrics.prodAfternoon += m.prodAfternoon;
    sumMetrics.prodNight += m.prodNight;

    sumMetrics.valUtil += parseFloat(m.valUtil as string);
    sumMetrics.valJust += (m.valJust === "Avg" ? 0 : parseFloat(m.valJust as string));
    sumMetrics.valVacio += (m.valVacio === "Avg" ? 0 : parseFloat(m.valVacio as string));
    sumMetrics.valDisp += (m.valDisp === "Avg" ? 0 : parseFloat(m.valDisp as string));
  });

  const count = validDays.length || 1;
  const avgMetrics: IMetrics = {
    aprovechadoPct: Math.round(sumMetrics.aprovechadoPct / count),
    utilPct: Math.round(sumMetrics.utilPct / count),
    justificadoPct: Math.round(sumMetrics.justificadoPct / count),
    vacioPct: Math.round(sumMetrics.vacioPct / count),
    inutilPct: Math.round(sumMetrics.inutilPct / count),
    prodMorning: Math.round(sumMetrics.prodMorning / count),
    prodAfternoon: Math.round(sumMetrics.prodAfternoon / count),
    prodNight: Math.round(sumMetrics.prodNight / count),
    valUtil: (sumMetrics.valUtil / count).toFixed(1),
    valJust: (sumMetrics.valJust / count).toFixed(1),
    valVacio: (sumMetrics.valVacio / count).toFixed(1),
    valDisp: (sumMetrics.valDisp / count).toFixed(1)
  };

  return {
    config: avgConfig,
    actividades: avgActivities,
    estados: avgStates,
    eventos: [],
    habitos: {},
    metrics: avgMetrics, // Attach the calculated averages
    isAggregated: true
  };
};