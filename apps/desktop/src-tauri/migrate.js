const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'test.db');
const db = new Database(dbPath);

const migrationPath = path.join(__dirname, 'src', 'database', 'migrations', '015_knowledge_folders.sql');
const migrationSql = fs.readFileSync(migrationPath, 'utf8');

db.exec(migrationSql);
console.log('Migration applied successfully to test.db');
db.close();
