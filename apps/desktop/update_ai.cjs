const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.resolve(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.rs')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('./src-tauri/src');
let changed = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Replace text calls
    content = content.replace(/GeminiService::generate_text_with_model\(([^,]+),\s*([^,]+),\s*([^,]+),\s*"gemini-2\.0-flash-lite"\)/g, 
        'crate::services::universal_ai::UniversalAiService::generate_text($1, $2, $3)');

    // Replace multimodal calls
    content = content.replace(/GeminiService::generate_multimodal_with_model\(([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*"gemini-2\.0-flash-lite"\)/g, 
        'crate::services::universal_ai::UniversalAiService::generate_multimodal($1, $2, $3, $4)');

    if (content !== original) {
        fs.writeFileSync(file, content);
        changed++;
        console.log('Updated calls in: ' + file);
    }
});
console.log('Total files changed: ' + changed);
