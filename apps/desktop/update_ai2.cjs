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
    if (file.endsWith('gemini_service.rs') || file.endsWith('universal_ai.rs')) {
        return;
    }

    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Fully qualified calls
    content = content.replace(/crate::services::gemini_service::GeminiService::generate_text\(/g, 
        'crate::services::universal_ai::UniversalAiService::generate_text(');
    content = content.replace(/crate::services::gemini_service::GeminiService::generate_multimodal\(/g, 
        'crate::services::universal_ai::UniversalAiService::generate_multimodal(');

    // Unqualified calls
    content = content.replace(/GeminiService::generate_text\(/g, 
        'crate::services::universal_ai::UniversalAiService::generate_text(');
    content = content.replace(/GeminiService::generate_multimodal\(/g, 
        'crate::services::universal_ai::UniversalAiService::generate_multimodal(');

    if (content !== original) {
        fs.writeFileSync(file, content);
        changed++;
        console.log('Updated: ' + file);
    }
});
console.log('Total files changed: ' + changed);
