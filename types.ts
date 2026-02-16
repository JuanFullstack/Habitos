// Data Model Definitions

export interface IDayConfig {
  horaArranque: number | null;
  finDia: number | null;
  horasSueno: number;
  flujoActivo: boolean;
  inicioFlujo: number | null;
}

export interface IActivity {
  id: string;
  nombre: string;
  tipo: string;
  categoria: string;
  inicio: number;
  fin: number;
  score: number;
  descripcion?: string;
  color?: string; // Optional for UI persistence
}

export interface IStatePoint {
  id: string | number;
  t: number; // Represents 'Inicio'
  fin?: number; // Represents 'Fin' (Optional for backward compatibility)
  v: number; // Balance Energía Global (0-100) - Maps to 'Promedio'
  Ri: number;
  Voluntad: number;
  Distracción: number;
  Horus: number;
  Energía: number; // Variable de energía (0-5) -> Now 0-100?
  Afectacion?: number; // New
  NC?: number; // New
  DI?: number; // New
  Vision?: number; // New
  Contexto?: string;
  preset?: string; // New
  [key: string]: any; // Allow dynamic access for chart mapping
}

export interface IEvent {
  id: string | number;
  t: number;
  fin?: number;
  icon: string;
  label: string;
  descripcion?: string;
}

export interface IDayData {
  config: IDayConfig;
  actividades: IActivity[];
  estados: IStatePoint[];
  eventos: IEvent[];
  habitos: Record<string, boolean>;
  metrics?: IMetrics; // Pre-calculated average metrics for aggregated views
  isAggregated?: boolean; // Flag for UI logic
}

export type Database = Record<string, IDayData>;

export interface IMetrics {
  aprovechadoPct: number;
  utilPct: number;
  justificadoPct: number;
  vacioPct: number;
  inutilPct: number;
  valUtil: string;
  valJust: string;
  valVacio: string;
  valDisp: string;
  prodMorning: number;
  prodAfternoon: number;
  prodNight: number;
}

export interface IHabitStats {
  total: number;
  checks: number;
  pct: number;
  missed: number;
  history: { date: string; status: boolean }[];
  last: string;
  timePassed: string;
}

export type TimeRange = "HOY" | "DÍA" | "SEMANA" | "MES" | "ACUMULADO";