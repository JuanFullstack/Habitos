// Script para crear la colección daily_logs via API directa
const PB_URL = 'http://129.213.26.212:8090';
const EMAIL = 'omega3031@gmail.com';
const PASS = 'Juan2612++';

async function main() {
    console.log('1. Autenticando como Admin...');

    // Try superusers first (newer PB), then admins (older PB)
    let token = '';

    try {
        const authRes = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity: EMAIL, password: PASS })
        });

        if (authRes.ok) {
            const data = await authRes.json();
            token = data.token;
            console.log('✅ Auth OK (admins endpoint)');
        } else {
            console.log('⚠️ admins endpoint failed, status:', authRes.status);
            const errText = await authRes.text();
            console.log('   Response:', errText);

            // Try superusers endpoint
            const authRes2 = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identity: EMAIL, password: PASS })
            });

            if (authRes2.ok) {
                const data2 = await authRes2.json();
                token = data2.token;
                console.log('✅ Auth OK (superusers endpoint)');
            } else {
                const errText2 = await authRes2.text();
                console.log('❌ superusers endpoint also failed:', authRes2.status, errText2);
                return;
            }
        }
    } catch (e) {
        console.error('❌ Connection error:', e.message);
        return;
    }

    console.log('\n2. Checking if collection exists...');
    const checkRes = await fetch(`${PB_URL}/api/collections/daily_logs`, {
        headers: { 'Authorization': token }
    });

    if (checkRes.ok) {
        console.log('✅ Collection already exists!');
        const col = await checkRes.json();
        console.log('   ID:', col.id, 'Name:', col.name);

        // Update API rules to public
        console.log('\n3. Updating API rules to public...');
        const updateRes = await fetch(`${PB_URL}/api/collections/${col.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': token },
            body: JSON.stringify({
                listRule: '',
                viewRule: '',
                createRule: '',
                updateRule: '',
                deleteRule: ''
            })
        });

        if (updateRes.ok) {
            console.log('✅ Rules updated to PUBLIC');
        } else {
            const errText = await updateRes.text();
            console.log('❌ Update failed:', updateRes.status, errText);
        }
        return;
    }

    console.log('   Collection not found. Creating...');

    // Try different schema formats
    const schemas = [
        // Format 1: Minimal
        {
            name: 'daily_logs',
            type: 'base',
            schema: [
                { name: 'date', type: 'text', required: true },
                { name: 'content', type: 'json', required: true }
            ],
            listRule: '', viewRule: '', createRule: '', updateRule: '', deleteRule: ''
        },
        // Format 2: With options objects
        {
            name: 'daily_logs',
            type: 'base',
            schema: [
                { name: 'date', type: 'text', required: true, options: {} },
                { name: 'content', type: 'json', required: true, options: {} }
            ],
            listRule: '', viewRule: '', createRule: '', updateRule: '', deleteRule: ''
        },
        // Format 3: With system false
        {
            name: 'daily_logs',
            type: 'base',
            system: false,
            schema: [
                { name: 'date', type: 'text', system: false, required: true, options: { min: null, max: null, pattern: '' } },
                { name: 'content', type: 'json', system: false, required: true, options: { maxSize: 2000000 } }
            ],
            listRule: '', viewRule: '', createRule: '', updateRule: '', deleteRule: ''
        },
        // Format 4: Fields instead of schema (newer PB versions)
        {
            name: 'daily_logs',
            type: 'base',
            fields: [
                { name: 'date', type: 'text', required: true },
                { name: 'content', type: 'json', required: true }
            ],
            listRule: '', viewRule: '', createRule: '', updateRule: '', deleteRule: ''
        }
    ];

    for (let i = 0; i < schemas.length; i++) {
        console.log(`\n   Attempting format ${i + 1}/${schemas.length}...`);
        const createRes = await fetch(`${PB_URL}/api/collections`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': token },
            body: JSON.stringify(schemas[i])
        });

        if (createRes.ok) {
            const col = await createRes.json();
            console.log(`✅ SUCCESS with format ${i + 1}! Collection created, ID: ${col.id}`);
            return;
        } else {
            const errText = await createRes.text();
            console.log(`   ❌ Format ${i + 1} failed (${createRes.status}):`, errText);
        }
    }

    console.log('\n❌ ALL formats failed. The server may need manual collection creation.');
}

main();
