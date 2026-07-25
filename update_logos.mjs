import fs from 'fs';
import path from 'path';
import { Jimp } from 'jimp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOGO_URL = 'https://i.ibb.co/21hjGr1G/Chat-GPT-Image-Jun-29-2026-03-27-56-PM.png';

async function updateLogos() {
  console.log('Downloading logo...');
  const response = await fetch(LOGO_URL);
  const buffer = Buffer.from(await response.arrayBuffer());
  
  console.log('Reading image with Jimp...');
  const image = await Jimp.read(buffer);

  const targets = [
    { path: 'apps/desktop/src/assets/logo.png', size: null },
    { path: 'apps/extension/src/assets/logo.png', size: null },
    { path: 'apps/landing/public/logo.png', size: null },
    
    // Extension Icons
    { path: 'apps/extension/icons/icon-16.png', size: 16 },
    { path: 'apps/extension/icons/icon-32.png', size: 32 },
    { path: 'apps/extension/icons/icon-48.png', size: 48 },
    { path: 'apps/extension/icons/icon-128.png', size: 128 },
    
    // Tauri Icons (PNGs)
    { path: 'apps/desktop/src-tauri/icons/32x32.png', size: 32 },
    { path: 'apps/desktop/src-tauri/icons/128x128.png', size: 128 },
    { path: 'apps/desktop/src-tauri/icons/128x128@2x.png', size: 256 },
    { path: 'apps/desktop/src-tauri/icons/icon.png', size: 512 },
    { path: 'apps/desktop/src-tauri/icons/Square30x30Logo.png', size: 30 },
    { path: 'apps/desktop/src-tauri/icons/Square44x44Logo.png', size: 44 },
    { path: 'apps/desktop/src-tauri/icons/Square71x71Logo.png', size: 71 },
    { path: 'apps/desktop/src-tauri/icons/Square89x89Logo.png', size: 89 },
    { path: 'apps/desktop/src-tauri/icons/Square107x107Logo.png', size: 107 },
    { path: 'apps/desktop/src-tauri/icons/Square142x142Logo.png', size: 142 },
    { path: 'apps/desktop/src-tauri/icons/Square150x150Logo.png', size: 150 },
    { path: 'apps/desktop/src-tauri/icons/Square284x284Logo.png', size: 284 },
    { path: 'apps/desktop/src-tauri/icons/Square310x310Logo.png', size: 310 },
    { path: 'apps/desktop/src-tauri/icons/StoreLogo.png', size: 50 }
  ];

  for (const target of targets) {
    const fullPath = path.join(__dirname, target.path);
    if (!fs.existsSync(path.dirname(fullPath))) {
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    }

    if (target.size) {
      console.log(`Resizing and saving ${target.path} to ${target.size}x${target.size}...`);
      const clone = image.clone();
      clone.resize({ w: target.size, h: target.size });
      clone.write(fullPath);
    } else {
      console.log(`Saving original size to ${target.path}...`);
      image.write(fullPath);
    }
  }

  console.log('All logos updated successfully!');
}

updateLogos().catch(console.error);
