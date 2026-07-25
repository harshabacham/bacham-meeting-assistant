const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('C:/Users/harsh/OneDrive/Documents/BACHAM/Data/bacham.sqlite');
db.all("SELECT content, model_used FROM transcripts WHERE lecture_id = '8fdb2332-f723-40b7-875c-be779329c5ce' ORDER BY generated_at ASC", (err, rows) => {
    if (err) throw err;
    console.log(`Found ${rows.length} transcript chunks for this session`);
    rows.forEach((r, i) => {
        console.log(`Chunk ${i+1} length: ${r.content.length}`);
    });
});
