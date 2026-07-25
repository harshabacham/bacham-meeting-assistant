const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('C:/Users/harsh/OneDrive/Documents/BACHAM/Data/bacham.sqlite');

db.get("SELECT value FROM settings WHERE key = 'gemini_api_key'", async (err, row) => {
    if (err) throw err;
    if (!row) {
        console.log('No API key found');
        return;
    }
    
    const key = row.value;
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + key;
    
    const payload = {
        contents: [{ parts: [{ text: "Hello" }] }]
    };
    
    console.log("Pinging Gemini API...");
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
});
