// Patches the BACHAM SQLite database to set aiProvider to bacham.anthropic
// Usage: node patch_provider.cjs

const fs = require('fs');
const path = require('path');
const os = require('os');

const dbPath = path.join(os.homedir(), 'OneDrive', 'Documents', 'BACHAM', 'Data', 'bacham.sqlite');

if (!fs.existsSync(dbPath)) {
    console.error('ERROR: Database not found at:', dbPath);
    process.exit(1);
}

console.log('Found database:', dbPath);

// Read the entire file as a buffer
let buf = fs.readFileSync(dbPath);
let modified = false;

// In SQLite, text values are stored as UTF-8 inline in the B-tree pages.
// We need to find and replace all occurrences of the stored aiProvider value.
// 
// The settings table stores (key, value). We'll replace 'bacham.gemini' 
// when it appears next to 'ai_provider' context.
//
// Binary patch: replace 'bacham.gemini' (14 bytes) with 'bacham.anthropic' (16 bytes)... 
// BUT lengths differ, which would corrupt SQLite. 
// Instead, replace 'bacham.openrouter' (18) -> 'bacham.anthropic\0\0' or
// 'bacham.gemini' -> we need same-length replacement.
//
// Safest approach: Use Node's child_process to run Python's sqlite3 if available
// OR write a WAL-safe update using raw bytes of same length.

// Let's try a different approach: patch the gemini string to 'anthropic' by 
// replacing the bytes in the value cell. Since 'gemini' is shorter, we need 
// to find the exact record.

// Strategy: find the byte sequence for 'bacham.gemini' in the settings page
// and replace with 'bacham.gemini' (keep key) -> no, we need to replace the VALUE.

// Actually the cleanest approach: spawn Python if available
const { execSync } = require('child_process');

try {
    // Try Python first (most Windows systems have it)
    const result = execSync(`python -c "import sqlite3; conn = sqlite3.connect(r'${dbPath}'); c = conn.cursor(); c.execute(\\"DELETE FROM settings WHERE key = 'aiProvider'\\"); c.execute(\\"INSERT OR REPLACE INTO settings (key, value) VALUES ('aiProvider', 'bacham.anthropic')\\"); conn.commit(); r = c.execute(\\"SELECT key, value FROM settings WHERE key = 'aiProvider'\\").fetchall(); print('Updated:', r); conn.close()"`, { encoding: 'utf8' });
    console.log('SUCCESS via Python:', result.trim());
    console.log('\nThe AI provider has been set to Anthropic (Claude).');
    console.log('Restart the app and it will use Anthropic instead of Gemini.');
} catch (pythonErr) {
    console.log('Python not available, trying PowerShell approach...');
    
    // Write a Python script file approach
    const pyScript = `
import sqlite3
db_path = r"${dbPath}"
conn = sqlite3.connect(db_path)
c = conn.cursor()
c.execute("DELETE FROM settings WHERE key = 'aiProvider'")
c.execute("INSERT INTO settings (key, value) VALUES ('aiProvider', 'bacham.anthropic')")
conn.commit()
result = c.execute("SELECT key, value FROM settings WHERE key = 'aiProvider'").fetchall()
print('Updated:', result)
conn.close()
print('Done!')
`;
    fs.writeFileSync('patch_provider.py', pyScript);
    console.log('');
    console.log('Python script written to patch_provider.py');
    console.log('Run it with: python patch_provider.py');
    console.log('');
    console.log('OR: Open the app Settings page and manually select Anthropic as your AI provider and save your API key.');
}
