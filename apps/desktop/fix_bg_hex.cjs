const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    content = content.replace(/bg-\[\#111111\]/g, 'bg-background');
    content = content.replace(/bg-\[\#0d0d0d\]/g, 'bg-background');
    content = content.replace(/bg-\[\#1E1E1E\]/g, 'bg-surface');

    // Also replace hardcoded red and green variants found in FlashcardManager
    content = content.replace(/bg-\[\#4DFF91\]\/10/g, 'bg-success-dim');
    content = content.replace(/text-\[\#4DFF91\]/g, 'text-success');
    content = content.replace(/bg-\[\#FF4D4D\]\/10/g, 'bg-destructive/10');
    content = content.replace(/text-\[\#FF4D4D\]/g, 'text-destructive');

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated hex backgrounds in: ${filePath}`);
    }
}

function traverse(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            traverse(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            processFile(fullPath);
        }
    }
}

traverse(srcDir);
console.log('Hex background replacements done.');
