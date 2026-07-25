const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('C:/Users/harsh/OneDrive/Documents/BACHAM/Data/bacham.sqlite');
db.get("SELECT value FROM settings WHERE key = 'gemini_api_key'", (err, row) => {
    if (err) throw err;
    if (row) {
        fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + row.value)
            .then(r => r.json())
            .then(data => {
                if (data.models) {
                    console.log(data.models.map(m => m.name).join('\n'));
                } else {
                    console.log(data);
                }
            });
    } else {
        console.log('No key');
    }
});
