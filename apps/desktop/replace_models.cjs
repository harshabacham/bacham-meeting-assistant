const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('gemini-1.5-flash')) {
        const newContent = content.replace(/gemini-1.5-flash/g, 'gemini-1.5-pro');
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log('Updated', filePath);
    }
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        // Skip target directory to avoid build conflicts
        if (file === 'target' || file === 'node_modules') continue;
        
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.rs')) {
            replaceInFile(fullPath);
        }
    }
}

const targetDir = path.join(__dirname, 'src-tauri');
console.log('Walking directory:', targetDir);
walkDir(targetDir);
console.log('Done.');
