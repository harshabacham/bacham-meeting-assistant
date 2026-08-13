const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const dbPath = 'C:\\Users\\harsh\\AppData\\Roaming\\com.harsh.appsdesktop\\data.db';

if (!fs.existsSync(dbPath)) {
    console.log('DB not found');
    process.exit(1);
}

const db = new sqlite3.Database(dbPath);
db.get("SELECT value FROM settings WHERE key = 'gemini_api_key'", async (err, row) => {
    if (err) throw err;
    const apiKey = row.value;
    try {
        const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey);
        const data = await res.json();
        console.log(data.models.map(m => m.name).join(', '));
    } catch (e) {
        console.error(e);
    }
});
