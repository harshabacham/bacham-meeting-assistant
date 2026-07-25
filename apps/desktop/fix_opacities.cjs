const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    content = content.replace(/\border-white\/\[?0\.05\]?/g, 'border-border');
    content = content.replace(/\border-white\/10\b/g, 'border-border');
    content = content.replace(/\border-white\/20\b/g, 'border-border');
    content = content.replace(/\border-white\b/g, 'border-border');

    // Fix broken Tailwind opacity classes
    content = content.replace(/\btext-foreground\/(90|80)\b/g, 'text-foreground');
    content = content.replace(/\btext-foreground\/(70|60|50|40)\b/g, 'text-muted-foreground');
    
    // Backgrounds that used to be bg-black/XX
    content = content.replace(/\bbg-background\/(40|50|60|80|90)\b/g, 'bg-[var(--glass-bg)]');
    content = content.replace(/\bbg-background\/(10|20|30)\b/g, 'bg-surface-hover');
    
    // Foreground backgrounds (used to be bg-white/XX)
    content = content.replace(/\bbg-foreground\/\[0\.02\]/g, 'bg-[var(--overlay-02)]');
    content = content.replace(/\bbg-foreground\/\[0\.05\]/g, 'bg-[var(--overlay-05)]');
    content = content.replace(/\bbg-foreground\/(10|20)\b/g, 'bg-[var(--overlay-10)]');
    content = content.replace(/\bbg-foreground\/(40|50)\b/g, 'bg-[var(--overlay-40)]');

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated opacities in: ${filePath}`);
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
console.log('Opacity replacements done.');
