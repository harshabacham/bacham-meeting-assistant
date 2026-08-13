const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('/v1beta/')) {
        const newContent = content.replace(/\/v1beta\//g, '/v1/');
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log('Updated v1beta to v1 in', filePath);
    }
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
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
