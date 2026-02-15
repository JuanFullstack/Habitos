
import {
  Briefcase, CheckSquare, Dumbbell, Gamepad2, GraduationCap, User
} from 'lucide-react';
import { IDayData } from './types';

export const CONFIG = {
  startTime: 7,
  endTime: 24,
  totalHours: 17,
  graphHeight: 300,
  chartPaddingLeft: 25,
  colors: {
    low: '#fca5a5', med: '#fde047', good: '#86efac', high: '#4ade80'
  },
  lineColors: {
    promedio: '#15803d',   // Verde oscuro
    ri: '#fca5a5',         // Rojo claro
    distraccion: '#ef4444',// Rojo oscuro
    voluntad: '#93c5fd',   // Azul claro
    horus: '#86efac',      // Verde pastel
    energia: '#94a3b8'     // Gris
  }
};

export const INITIAL_DAY_DATA: IDayData = {
  actividades: [],
  estados: [],
  eventos: [],
  habitos: {},
  config: {
    horaArranque: null,
    flujoActivo: false,
    inicioFlujo: null,
    finDia: null,
    horasSueno: 7.0
  }
};

export const CATEGORIAS_ACTIVIDAD = [
  {
    id: 'estudio', label: 'Estudio', icon: GraduationCap, color: 'bg-blue-100 text-blue-800', productivity: 100,
    opciones: [
      { value: 'en_clases', label: 'En clases' },
      { value: 'estudio', label: 'Estudio' },
      { value: 'ingles', label: 'Inglés' }
    ]
  },
  {
    id: 'estetico', label: 'Estético', icon: Dumbbell, color: 'bg-green-100 text-green-800', productivity: 100,
    opciones: [
      { value: 'entrenamiento', label: 'Entrenamiento' },
      { value: 'gym', label: 'Gym' }
    ]
  },
  {
    id: 'general', label: 'General', icon: CheckSquare, color: 'bg-gray-100 text-gray-800', productivity: 60,
    opciones: [
      { value: 'meditando', label: 'Meditando' },
      { value: 'limpiando', label: 'Limpiando' },
      { value: 'tramites', label: 'Trámites' },
      { value: 'reflexion', label: 'Reflexión' }
    ]
  },
  {
    id: 'trabajo', label: 'Trabajo', icon: Briefcase, color: 'bg-indigo-100 text-indigo-800', productivity: 100,
    opciones: [
      { value: 'proyecto', label: 'Proyecto' }
    ]
  },
  {
    id: 'personal', label: 'Personal', icon: User, color: 'bg-pink-100 text-pink-800', productivity: 100,
    opciones: [
      { value: 'videos', label: 'Videos' },
      { value: 'tiempo_personal', label: 'Tiempo personal' }
    ]
  },
  {
    id: 'ocio', label: 'Ocio', icon: Gamepad2, color: 'bg-teal-100 text-teal-800', productivity: 'condicional',
    opciones: [
      { value: 'lol', label: 'LOL' },
      { value: 'tv', label: 'TV' },
      { value: 'amigos', label: 'Amigos' },
      { value: 'general', label: 'General' }
    ]
  }
];

export const HABITOS_TRACKING = [
  { id: 'arranque', label: 'Arranque', type: 'config', match: [] },
  { id: 'flujo', label: 'Flujo', type: 'activity', match: ['flujo', 'sesion_flujo'] },
  { id: 'inglés', label: 'Inglés', type: 'activity', match: ['ingles'] },
  { id: 'estudiar', label: 'Estudiar', type: 'activity', match: ['estudio', 'en_clases'] },
  { id: 'entrenamiento', label: 'Entrenamiento', type: 'activity', match: ['entrenamiento', 'gym'] },
  { id: 'horus', label: 'Horus', type: 'state_var', match: [] },
  { id: 'videos', label: 'Videos', type: 'activity', match: ['videos'] }
];

export const HABITOS_LIST = ["Arranque", "Flujo", "Inglés", "Estudiar", "Entrenamiento", "Horus", "Videos"];
export const VARIABLES_EMOCIONALES = ["Ri", "Voluntad", "Distracción", "Horus", "Energía"];
export const TIME_RANGES = ["HOY", "SEMANA", "MES", "ACUMULADO", "DÍA"];
