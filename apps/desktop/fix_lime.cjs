const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    // Tailwind classes
    content = content.replace(/text-\[\#A6FF00\]/g, 'text-[var(--accent)]');
    content = content.replace(/bg-\[\#A6FF00\]\/10/g, 'bg-[var(--accent-dim)]');
    content = content.replace(/bg-\[\#A6FF00\]/g, 'bg-[var(--accent)]');
    content = content.replace(/fill-\[\#A6FF00\]/g, 'fill-[var(--accent)]');
    
    // Border with opacities
    content = content.replace(/border-\[\#A6FF00\]\/\d+/g, 'border-[var(--border-accent)]');
    
    // Shadow
    content = content.replace(/shadow-\[\#A6FF00\]\/\d+/g, 'shadow-lime');

    // Inline style colors
    content = content.replace(/color:\s*['"]#A6FF00['"]/g, "color: 'var(--accent)'");
    
    // CSS variable fallbacks and definitions
    content = content.replace(/var\(--brand-lime,\s*#A6FF00\)/g, 'var(--accent)');
    content = content.replace(/var\(--brand-lime\)/g, 'var(--accent)');
    content = content.replace(/'--brand-lime':\s*'#A6FF00'/g, "'--brand-lime': 'var(--accent)'");

    // Any remaining #A6FF00 used in string literals or tailwind arbitrarily
    content = content.replace(/\[\#A6FF00\]/g, '[var(--accent)]');

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated hardcoded Lime in: ${filePath}`);
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
console.log('Lime replacements done.');
