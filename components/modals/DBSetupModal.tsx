import React, { useState } from 'react';
import { Modal } from '../UIComponents';
import { pb, COLLECTIONS } from '../../lib/pocketbase';
import { Database } from '../../types';
import { Database as DatabaseIcon, UploadCloud, CheckCircle, AlertCircle } from 'lucide-react';

interface DBSetupModalProps {
    onClose: () => void;
    localDB: Database;
}

export const DBSetupModal: React.FC<DBSetupModalProps> = ({ onClose, localDB }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [status, setStatus] = useState<'idle' | 'auth' | 'creating' | 'migrating' | 'success' | 'error'>('idle');
    const [log, setLog] = useState<string[]>([]);

    const addLog = (msg: string) => setLog(prev => [...prev, msg]);

    const handleSetup = async () => {
        setStatus('auth');
        addLog("Iniciando conexión a PocketBase...");

        try {
            // 0. Connection Check
            try {
                const health = await pb.health.check();
                addLog(`✅ Servidor en línea (v${health.code || '?'}).`);
            } catch (e: any) {
                // If health check fails with 404, it might be an old version or path issue, but usually it's connection.
                // However, "The requested resource wasn't found" (404) suggests the server is reachable but the path is wrong.
                // Let's log it but try to proceed, or throw if critical.
                addLog(`⚠️ Advertencia de conexión: ${e.message}`);
            }

            // 1. Auth as Admin
            addLog("🔑 Autenticando como Administrador...");
            try {
                await pb.admins.authWithPassword(email, password);
                addLog("✅ Autenticación exitosa.");
            } catch (e: any) {
                if (e.status === 404) throw new Error("No se encontró el endpoint de autenticación. ¿Estás seguro de que la URL del servidor es correcta?");
                if (e.status === 400) throw new Error("Credenciales inválidas.");
                throw e;
            }

            setStatus('creating');
            // 2. Check/Create Collection
            try {
                const col = await pb.collections.getOne(COLLECTIONS.DAILY_LOGS);
                addLog("ℹ️ La colección 'daily_logs' ya existe. Actualizando permisos...");
                await pb.collections.update(col.id, {
                    listRule: '', viewRule: '', createRule: '', updateRule: '', deleteRule: ''
                });
                addLog("✅ Permisos actualizados a PÚBLICO.");
            } catch (err) {
                addLog("⚙️ Creando colección 'daily_logs'...");
                await pb.collections.create({
                    name: COLLECTIONS.DAILY_LOGS,
                    type: 'base',
                    system: false,
                    schema: [
                        { name: 'date', type: 'text', system: false, required: true, options: { min: null, max: null, pattern: '' } },
                        { name: 'content', type: 'json', system: false, required: true, options: { maxSize: 2000000 } }
                    ],
                    listRule: '',
                    viewRule: '',
                    createRule: '',
                    updateRule: '',
                    deleteRule: ''
                });
                addLog("✅ Colección creada exitosamente.");
            }

            // 3. Migrate Data
            setStatus('migrating');
            const dates = Object.keys(localDB);
            addLog(`🚀 Migrando ${dates.length} días desde LocalStorage...`);

            let migrated = 0;
            for (const date of dates) {
                try {
                    // Check if exists
                    const records = await pb.collection(COLLECTIONS.DAILY_LOGS).getList(1, 1, {
                        filter: `date="${date}"`
                    });

                    const dayData = localDB[date];

                    if (records.items.length > 0) {
                        // Update existing
                        await pb.collection(COLLECTIONS.DAILY_LOGS).update(records.items[0].id, {
                            content: dayData
                        });
                    } else {
                        // Create new
                        await pb.collection(COLLECTIONS.DAILY_LOGS).create({
                            date: date,
                            content: dayData
                        });
                    }
                    migrated++;
                } catch (e: any) {
                    console.error(`Error migrando ${date}:`, e);
                    addLog(`⚠️ Error en ${date}: ${e.message}`);
                }
            }

            addLog(`✅ Migración completada: ${migrated}/${dates.length} días.`);
            setStatus('success');

            // Clear admin auth for security (optional, keep if needed)
            pb.authStore.clear();

        } catch (err: any) {
            console.error(err);
            setStatus('error');
            addLog(`❌ Error Crítico: ${err.message || err.toString()}`);
        }
    };

    return (
        <Modal onClose={onClose} maxWidth="max-w-md">
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 mb-2">
                    <DatabaseIcon className="text-indigo-600" size={24} />
                    <h2 className="text-xl font-bold text-gray-800">Configuración de Base de Datos</h2>
                </div>

                <p className="text-sm text-gray-500">
                    Esta herramienta inicializará la estructura en el servidor Lux y migrará tus datos locales.
                    Requiere credenciales de Administrador.
                </p>

                {status === 'idle' && (
                    <div className="flex flex-col gap-3">
                        <input
                            type="email"
                            placeholder="Admin Email"
                            className="p-2 border rounded"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                        <input
                            type="password"
                            placeholder="Admin Password"
                            className="p-2 border rounded"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                        <button
                            onClick={handleSetup}
                            className="bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700 font-bold flex items-center justify-center gap-2"
                        >
                            <UploadCloud size={18} />
                            Inicializar y Migrar
                        </button>
                    </div>
                )}

                {status !== 'idle' && (
                    <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs h-64 overflow-y-auto custom-scrollbar">
                        {log.map((line, i) => (
                            <div key={i}>{line}</div>
                        ))}
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg border border-green-200">
                        <CheckCircle size={20} />
                        <span className="font-bold text-sm">Base de datos lista. Puedes cerrar esta ventana.</span>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                        <AlertCircle size={20} />
                        <span className="font-bold text-sm">Ocurrió un error. Revisa el log.</span>
                    </div>
                )}

            </div>
        </Modal>
    );
};
