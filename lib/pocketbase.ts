import PocketBase from 'pocketbase';

// Conexión Directa al Servidor Lux
// URL from PLANTILLA_CONTEXTO_BACKEND.md
export const pb = new PocketBase('http://129.213.26.212:8090');

// Desactivar auto-cancelación de peticiones (Recomendado para React 18+)
pb.autoCancellation(false);

export const COLLECTIONS = {
    DAILY_LOGS: 'daily_logs'
};
