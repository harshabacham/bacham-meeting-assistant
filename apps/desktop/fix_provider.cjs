// Update the AI provider in the BACHAM database to Anthropic
// Run with: node fix_provider.cjs

const fs = require('fs');
const path = require('path');
const os = require('os');

// Find the database
const dbPath = path.join(os.homedir(), 'OneDrive', 'Documents', 'BACHAM', 'Data', 'bacham.sqlite');

if (!fs.existsSync(dbPath)) {
    console.error('Database not found at:', dbPath);
    process.exit(1);
}

console.log('Found database at:', dbPath);

// Read the database as binary
let buf = fs.readFileSync(dbPath);

// The SQLite WAL mode might mean latest data is in the WAL file - check for it
const walPath = dbPath + '-wal';
const shmPath = dbPath + '-shm';
if (fs.existsSync(walPath)) {
    console.log('WAL file found - database may have pending transactions');
}

// We'll write a SQL migration instead of binary patching
// Create a migration SQL file the app can run
const sqlMigration = `
-- Run this to fix the AI provider
DELETE FROM settings WHERE key = 'aiProvider';
INSERT INTO settings (key, value, updated_at) VALUES ('aiProvider', 'bacham.anthropic', strftime('%s', 'now') * 1000);
`;

fs.writeFileSync(path.join(__dirname, 'fix_provider.sql'), sqlMigration);
console.log('Migration SQL written to fix_provider.sql');
console.log('');
console.log('INSTRUCTIONS:');
console.log('1. The best way to fix this is to open the app Settings page');
console.log('2. Select "Anthropic" as your AI provider');
console.log('3. Enter your Anthropic API key and save');
console.log('');
console.log('Alternatively, if you have Node.js with better-sqlite3:');
console.log('npm install better-sqlite3 && node apply_fix.cjs');
