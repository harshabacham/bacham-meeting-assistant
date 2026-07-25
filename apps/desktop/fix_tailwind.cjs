const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    content = content.replace(/\btext-white\b/g, 'text-foreground');
    content = content.replace(/\bbg-black\b/g, 'bg-background');
    content = content.replace(/\bbg-white\b/g, 'bg-foreground');
    content = content.replace(/\btext-black\b/g, 'text-background');
    
    // Hex colors inside brackets like bg-[#FFF]
    content = content.replace(/bg-\[\#(FFF|FFFFFF)\]/gi, 'bg-foreground');
    content = content.replace(/bg-\[\#(000|000000)\]/gi, 'bg-background');
    content = content.replace(/text-\[\#(FFF|FFFFFF)\]/gi, 'text-foreground');
    content = content.replace(/text-\[\#(000|000000)\]/gi, 'text-background');

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated Tailwind in: ${filePath}`);
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
console.log('Tailwind replacements done.');
