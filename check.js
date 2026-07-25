const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('C:/Users/harsh/OneDrive/Documents/BACHAM/Data/bacham.sqlite');
db.get("SELECT value FROM settings WHERE key='gemini_api_key'", (err, row) => {
    if (row) {
        console.log('Value length:', row.value.length);
        console.log('Ends with newline:', row.value.endsWith('\n') || row.value.endsWith('\r'));
        console.log('hex:', Buffer.from(row.value).toString('hex'));
    } else {
        console.log(err || "Not found");
    }
});
