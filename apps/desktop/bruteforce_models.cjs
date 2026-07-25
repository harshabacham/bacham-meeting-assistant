const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('C:/Users/harsh/OneDrive/Documents/BACHAM/Data/bacham.sqlite');

db.get("SELECT value FROM settings WHERE key = 'gemini_api_key'", async (err, row) => {
    if (err) throw err;
    if (!row) { console.log('No API key found'); process.exit(1); }
    const key = row.value;

    console.log("Fetching available models...");
    const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    const listData = await listRes.json();
    
    if (!listData.models) {
        console.log("Failed to list models:", listData);
        process.exit(1);
    }
    
    const candidateModels = listData.models
        .filter(m => m.supportedGenerationMethods.includes("generateContent"))
        .map(m => m.name.replace("models/", ""));
        
    console.log(`Found ${candidateModels.length} candidate models.`);
    
    for (const m of candidateModels) {
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
                console.log(`✅ [${m}] SUCCESS! USE THIS MODEL!`);
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
                    console.log(`❌ [${m}] Error: ${JSON.stringify(data.error.message)}`);
                }
            }
        } catch (e) {
            console.log(`❌ [${m}] Fetch Failed: ${e.message}`);
        }
    }
    console.log("All candidate models failed.");
});
