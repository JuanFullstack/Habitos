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
            // 1. Auth as Admin
            await pb.admins.authWithPassword(email, password);
            addLog("✅ Autenticación de Admin exitosa.");

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
                    schema: [
                        {
                            name: 'date',
                            type: 'text',
                            required: true,
                            unique: true,
                            options: { min: 10, max: 10, pattern: '' }
                        },
                        {
                            name: 'content',
                            type: 'json',
                            required: true,
                            options: {}
                        }
                    ],
                    listRule: '',
                    viewRule: '',
                    createRule: '',
                    updateRule: '',
                    deleteRule: '',
                    conversation: false // Disable comments
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
