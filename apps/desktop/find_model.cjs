const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('C:/Users/harsh/OneDrive/Documents/BACHAM/Data/bacham.sqlite');

db.get("SELECT value FROM settings WHERE key = 'gemini_api_key'", async (err, row) => {
    if (err) throw err;
    if (!row) { console.log('No API key found'); return; }
    const key = row.value;

    const models = [
        'gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-2.0-flash-001',
        'gemini-2.0-flash-lite', 'gemini-2.5-flash-lite', 'gemini-flash-latest', 
        'gemini-pro-latest', 'gemini-3.1-pro-preview', 'gemini-3.5-flash',
        'gemini-omni-flash-preview', 'gemma-4-26b-a4b-it'
    ];

    console.log("Pinging models...");
    for (const m of models) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`;
        const payload = { contents: [{ parts: [{ text: "Hello" }] }] };
        
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            
            if (res.ok) {
                console.log(`✅ [${m}] SUCCESS!`);
                process.exit(0);
            } else {
                if (data.error && data.error.code === 429) {
                    const limit = data.error.message.includes('limit: 0') ? 'LIMIT 0' : 'LIMIT EXHAUSTED';
                    console.log(`❌ [${m}] 429 Too Many Requests (${limit})`);
                } else if (data.error && data.error.code === 404) {
                    console.log(`❌ [${m}] 404 Not Found`);
                } else if (data.error && data.error.code === 503) {
                    console.log(`❌ [${m}] 503 Service Unavailable`);
                } else {
                    console.log(`❌ [${m}] Error: ${JSON.stringify(data.error)}`);
                }
            }
        } catch (e) {
            console.log(`❌ [${m}] Fetch Failed: ${e.message}`);
        }
    }
});
