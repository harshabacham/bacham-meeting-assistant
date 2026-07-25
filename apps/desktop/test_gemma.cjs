const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('C:/Users/harsh/OneDrive/Documents/BACHAM/Data/bacham.sqlite');

db.get("SELECT value FROM settings WHERE key = 'gemini_api_key'", async (err, row) => {
    if (err) throw err;
    const key = row.value;
    const m = "gemma-4-26b-a4b-it";
    
    // Transparent 1x1 png
    const b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`;
    const payload = { 
        contents: [{ 
            parts: [
                { text: "What is this image?" },
                { inlineData: { mimeType: "image/png", data: b64 } }
            ] 
        }] 
    };
    
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.log(`❌ Fetch Failed: ${e.message}`);
    }
});
