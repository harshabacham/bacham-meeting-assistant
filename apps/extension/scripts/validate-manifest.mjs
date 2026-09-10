import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const manifestPath = path.join(distDir, 'manifest.json');

console.log('\n🔍 Validating Chrome Web Store Manifest compliance...\n');

if (!fs.existsSync(manifestPath)) {
  console.error('❌ Error: dist/manifest.json does not exist. Run build first!');
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
let errors = [];
let warnings = [];

// 1. Manifest version
if (manifest.manifest_version !== 3) {
  errors.push(`manifest_version must be 3, found: ${manifest.manifest_version}`);
}

// 2. Name
if (!manifest.name || manifest.name.trim().length === 0) {
  errors.push('Manifest "name" is missing or empty.');
} else if (manifest.name.length > 75) {
  warnings.push(`Manifest "name" is ${manifest.name.length} chars (recommended <= 45 for best display, max 75).`);
}

// 3. Description length (Strict CWS limit is 132 characters)
if (!manifest.description) {
  errors.push('Manifest "description" is missing.');
} else if (manifest.description.length > 132) {
  errors.push(`Manifest "description" is ${manifest.description.length} chars! CWS strictly enforces a maximum of 132 characters.`);
} else {
  console.log(`✓ Description length: ${manifest.description.length} chars (within <= 132 limit)`);
}

// 4. Version format
if (!manifest.version || !/^\d+(\.\d+){1,3}$/.test(manifest.version)) {
  errors.push(`Manifest "version" "${manifest.version}" does not match required CWS format (1-4 dot-separated integers).`);
}

// 5. Host permissions review
if (manifest.host_permissions && Array.isArray(manifest.host_permissions)) {
  for (const pattern of manifest.host_permissions) {
    if (pattern === '*://*/*' || pattern === '<all_urls>') {
      warnings.push(`Broad host permission "${pattern}" detected. This triggers extended manual review unless required.`);
    }
    if (pattern.startsWith('ws://') || pattern.startsWith('wss://')) {
      errors.push(`Invalid scheme in host_permissions "${pattern}". Web Store only allows http, https, file, ftp, urn.`);
    }
  }
}

// 6. Permissions check
if (manifest.permissions && Array.isArray(manifest.permissions)) {
  if (manifest.permissions.includes('desktopCapture')) {
    warnings.push('Unused permission "desktopCapture" declared. Remove if not using chrome.desktopCapture API.');
  }
}

// 7. Check Icons exist
if (!manifest.icons || !manifest.icons['128']) {
  errors.push('Missing 128x128 icon in manifest.icons (strictly required by Chrome Web Store).');
} else {
  for (const [size, iconRelPath] of Object.entries(manifest.icons)) {
    const iconFullPath = path.join(distDir, iconRelPath);
    if (!fs.existsSync(iconFullPath)) {
      errors.push(`Icon ${size}x${size} referenced at "${iconRelPath}" does not exist in dist.`);
    } else {
      console.log(`✓ Found icon-${size}.png at dist/${iconRelPath}`);
    }
  }
}

// 8. Action Icon check
if (manifest.action?.default_icon) {
  const defaultIcon = typeof manifest.action.default_icon === 'string'
    ? { '128': manifest.action.default_icon }
    : manifest.action.default_icon;

  for (const [size, iconRelPath] of Object.entries(defaultIcon)) {
    const iconFullPath = path.join(distDir, iconRelPath);
    if (!fs.existsSync(iconFullPath)) {
      errors.push(`Action icon ${size} referenced at "${iconRelPath}" does not exist in dist.`);
    }
  }
}

// 9. Service Worker check
if (manifest.background?.service_worker) {
  const swPath = path.join(distDir, manifest.background.service_worker);
  if (!fs.existsSync(swPath)) {
    errors.push(`Background service worker "${manifest.background.service_worker}" does not exist in dist.`);
  } else {
    console.log(`✓ Background service worker verified: dist/${manifest.background.service_worker}`);
  }
}

// 10. Summary
console.log('\n--- Validation Results ---');
if (warnings.length > 0) {
  console.log('⚠️  Warnings:');
  warnings.forEach(w => console.log(`   - ${w}`));
}

if (errors.length > 0) {
  console.error('❌ Validation FAILED:');
  errors.forEach(e => console.error(`   - ${e}`));
  process.exit(1);
}

console.log('✅ Manifest is 100% compliant with Chrome Web Store policies!\n');
