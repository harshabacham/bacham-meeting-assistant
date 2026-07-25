const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      let changed = false;
      const newContent = content.replace(/(<section[^>]*?className="[^"]*?)bg-\\[#111111\\]([^"]*?")/g, (match, p1, p2) => {
        changed = true;
        return p1 + 'bg-transparent' + p2;
      });
      
      const newContent2 = newContent.replace(/(<footer[^>]*?className="[^"]*?)bg-\\[#111111\\]([^"]*?")/g, (match, p1, p2) => {
        changed = true;
        return p1 + 'bg-transparent' + p2;
      });

      if (changed) {
        fs.writeFileSync(fullPath, newContent2, 'utf8');
        console.log('Updated', fullPath);
      }
    }
  }
}
processDir('C:/Users/harsh/OneDrive/Desktop/Meeting/apps/landing/src/components');
