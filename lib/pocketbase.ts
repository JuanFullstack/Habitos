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

// --- DEBUG: Visible status for mobile debugging ---
export let pbStatus = {
    url: PB_URL,
    hasCredentials: !!(PB_EMAIL && PB_PASS),
    authMethod: 'none',
    isAuthenticated: false,
    lastError: '',
    collectionReady: false
};

// --- AUTO AUTH & COLLECTION SETUP ---
let _initPromise: Promise<void> | null = null;

export const ensurePBReady = async (): Promise<void> => {
    if (PB_EMAIL && PB_PASS) {
        if (!pb.authStore.isValid) {
            _initPromise = _initPB();
            return _initPromise;
        }
    }

    if (!_initPromise) {
        _initPromise = _initPB();
    }
    return _initPromise;
};

// Force re-authentication (callable from UI button)
export const forceReauth = async (): Promise<string> => {
    _initPromise = null;
    pb.authStore.clear();
    pbStatus.lastError = '';
    pbStatus.isAuthenticated = false;
    pbStatus.authMethod = 'none';

    try {
        await _initPB();
        if (pb.authStore.isValid) {
            return `✅ Conectado como ${pbStatus.authMethod}`;
        } else {
            return `❌ Auth falló: ${pbStatus.lastError}`;
        }
    } catch (e: any) {
        return `❌ Error: ${e.message}`;
    }
};

async function _initPB() {
    console.log(`[PB] Connecting to ${PB_URL}...`);
    pbStatus.lastError = '';

    if (PB_EMAIL && PB_PASS) {
        pb.authStore.clear();

        // Try Method 1: _superusers (PB v0.21+)
        try {
            await pb.collection('_superusers').authWithPassword(PB_EMAIL, PB_PASS);
            pbStatus.authMethod = '_superusers';
            pbStatus.isAuthenticated = true;
            console.log("[PB] ✅ Auth OK via _superusers");
        } catch (e1: any) {
            console.warn("[PB] _superusers failed:", e1.message);

            // Try Method 2: admins (PB v0.20 and earlier)
            try {
                await (pb as any).admins.authWithPassword(PB_EMAIL, PB_PASS);
                pbStatus.authMethod = 'admins (legacy)';
                pbStatus.isAuthenticated = true;
                console.log("[PB] ✅ Auth OK via admins (legacy)");
            } catch (e2: any) {
                console.warn("[PB] admins failed:", e2.message);

                // Try Method 3: users collection (regular user with admin role)
                try {
                    await pb.collection('users').authWithPassword(PB_EMAIL, PB_PASS);
                    pbStatus.authMethod = 'users';
                    pbStatus.isAuthenticated = true;
                    console.log("[PB] ✅ Auth OK via users");
                } catch (e3: any) {
                    pbStatus.lastError = `superusers: ${e1.message} | admins: ${e2.message} | users: ${e3.message}`;
                    console.error("[PB] ❌ ALL auth methods failed:", pbStatus.lastError);
                }
            }
        }
    } else {
        pbStatus.lastError = 'No credentials (VITE_PB_ADMIN_EMAIL / PASSWORD not set)';
        console.warn("[PB] No credentials provided");
    }

    // 2. Ensure collection exists
    try {
        await pb.collection(COLLECTIONS.DAILY_LOGS).getList(1, 1);
        pbStatus.collectionReady = true;
        console.log("[PB] ✅ Collection ready");
    } catch (e: any) {
        if (e.status === 404) {
            console.log("[PB] Collection not found, creating...");
            await _createCollection();
        } else {
            pbStatus.collectionReady = false;
            pbStatus.lastError += ` | Collection: ${e.message}`;
            console.warn("[PB] ⚠️ Collection check error:", e.message);
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
        pbStatus.collectionReady = true;
        console.log("[PB] ✅ Collection created!");
    } catch (err: any) {
        console.error("[PB] ❌ Collection create FULL error:", JSON.stringify(err.data || err.response || err, null, 2));
        console.error("[PB] ❌ Status:", err.status, "Message:", err.message);
    }
}
