import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const releaseDir = path.join(rootDir, 'release');
const pkgPath = path.join(rootDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const version = pkg.version || '0.1.0';

console.log(`📦 Packaging BACHAM Chrome Extension v${version} for Chrome Web Store...\n`);

// 1. Run manifest validation
try {
  execSync('node scripts/validate-manifest.mjs', { cwd: rootDir, stdio: 'inherit' });
} catch (err) {
  console.error('❌ Manifest validation failed! Fix errors before packaging.');
  process.exit(1);
}

// 2. Ensure release directory exists
if (!fs.existsSync(releaseDir)) {
  fs.mkdirSync(releaseDir, { recursive: true });
}

const zipFileName = `bacham-extension-v${version}.zip`;
const zipFilePath = path.join(releaseDir, zipFileName);

// Remove existing zip if present
if (fs.existsSync(zipFilePath)) {
  fs.unlinkSync(zipFilePath);
}

// 3. Create zip file containing everything inside dist/ at archive root
console.log(`Compressing dist/ contents into ${zipFileName}...`);

let success = false;
try {
  // Option A: bsdtar (built into Windows 10/11 & macOS & Linux)
  execSync(`tar.exe -a -cf "${zipFilePath}" *`, { cwd: distDir, stdio: 'pipe' });
  success = true;
} catch {
  try {
    // Option B: standard tar / zip on Unix
    execSync(`zip -r "${zipFilePath}" ./*`, { cwd: distDir, stdio: 'pipe' });
    success = true;
  } catch {
    try {
      // Option C: PowerShell Compress-Archive on Windows
      const psCmd = `powershell -Command "Compress-Archive -Path '${distDir}\\*' -DestinationPath '${zipFilePath}' -Force"`;
      execSync(psCmd, { stdio: 'pipe' });
      success = true;
    } catch (e) {
      console.error('Failed to create zip with available tools:', e.message);
    }
  }
}

if (!success || !fs.existsSync(zipFilePath)) {
  console.error('❌ Failed to create zip file.');
  process.exit(1);
}

const stats = fs.statSync(zipFilePath);
const sizeKb = (stats.size / 1024).toFixed(1);

console.log(`\n======================================================`);
console.log(`🎉 SUCCESS! Chrome Web Store package ready:`);
console.log(`📁 File: ${zipFilePath}`);
console.log(`⚖️  Size: ${sizeKb} KB`);
console.log(`======================================================`);
console.log(`\nNext step: Upload this ZIP directly to the Chrome Web Store Developer Dashboard:`);
console.log(`👉 https://chrome.google.com/webstore/devconsole\n`);
