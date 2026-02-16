import PocketBase from 'pocketbase';

const PB_URL = import.meta.env.VITE_PB_URL || 'https://pb-juan.129.213.26.212.sslip.io';
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

export const ensurePBReady = async (): Promise<void> => {
    // CRITICAL: Always check if we are authenticated as Admin before proceeding
    if (PB_EMAIL && PB_PASS) {
        if (!pb.authStore.isValid || !pb.authStore.isAdmin) {
            console.log("[PB] 🔄 Auth invalid/expired, re-authenticating...");
            // Force re-init (bypass singleton promise if auth is lost)
            _initPromise = _initPB();
            return _initPromise;
        }
    }

    // Normal initialization (first run)
    if (!_initPromise) {
        _initPromise = _initPB();
    }
    return _initPromise;
};

async function _initPB() {
    console.log(`[PB] Connecting to ${PB_URL}...`);

    // 1. Auth as Admin (if credentials available)
    if (PB_EMAIL && PB_PASS) {
        try {
            // Clear previous potential bad state
            pb.authStore.clear();
            await pb.admins.authWithPassword(PB_EMAIL, PB_PASS);
            console.log("[PB] ✅ Admin auth OK");
        } catch (e: any) {
            console.error("[PB] ❌ Admin auth failed:", e.message);
            // Don't throw here, allowing app to try public access if configured
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
            console.warn("[PB] ⚠️ Collection check error (might be permissions):", e.message);
        }
    }
}

async function _createCollection() {
    try {
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
        console.log("[PB] ✅ Collection created!");
    } catch (err: any) {
        // LOG THE FULL ERROR so we can debug
        console.error("[PB] ❌ Collection create FULL error:", JSON.stringify(err.data || err.response || err, null, 2));
        console.error("[PB] ❌ Status:", err.status, "Message:", err.message);
    }
}
