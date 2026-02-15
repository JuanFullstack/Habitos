import PocketBase from 'pocketbase';

const PB_URL = import.meta.env.VITE_PB_URL || 'http://129.213.26.212:8090';
const PB_EMAIL = import.meta.env.VITE_PB_ADMIN_EMAIL || '';
const PB_PASS = import.meta.env.VITE_PB_ADMIN_PASSWORD || '';

export const pb = new PocketBase(PB_URL);

// Desactivar auto-cancelación (React 18+)
pb.autoCancellation(false);

export const COLLECTIONS = {
    DAILY_LOGS: 'daily_logs'
};

// --- AUTO AUTH & COLLECTION SETUP ---
let _initPromise: Promise<void> | null = null;

export const ensurePBReady = (): Promise<void> => {
    if (!_initPromise) {
        _initPromise = _initPB();
    }
    return _initPromise;
};

async function _initPB() {
    // 1. Auth as Admin (if credentials available)
    if (PB_EMAIL && PB_PASS) {
        try {
            await pb.admins.authWithPassword(PB_EMAIL, PB_PASS);
            console.log("[PB] ✅ Admin auth OK");
        } catch (e: any) {
            console.warn("[PB] ⚠️ Admin auth failed:", e.message);
        }
    }

    // 2. Ensure collection exists
    try {
        await pb.collection(COLLECTIONS.DAILY_LOGS).getList(1, 1);
        console.log("[PB] ✅ Collection ready");
    } catch (e: any) {
        if (e.status === 404) {
            console.log("[PB] Collection not found, creating...");
            await _createCollection();
        } else {
            console.warn("[PB] ⚠️ Collection check error:", e.message);
        }
    }
}

async function _createCollection() {
    try {
        await pb.collections.create({
            name: COLLECTIONS.DAILY_LOGS,
            type: 'base',
            schema: [
                { name: 'date', type: 'text', required: true },
                { name: 'content', type: 'json', required: true }
            ],
            listRule: '',
            viewRule: '',
            createRule: '',
            updateRule: '',
            deleteRule: ''
        });
        console.log("[PB] ✅ Collection created!");
    } catch (err: any) {
        // LOG THE FULL ERROR so we can debug
        console.error("[PB] ❌ Collection create FULL error:", JSON.stringify(err.data || err.response || err, null, 2));
        console.error("[PB] ❌ Status:", err.status, "Message:", err.message);
    }
}
