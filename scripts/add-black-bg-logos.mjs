import fs from 'fs';
import path from 'path';
import { Jimp } from 'jimp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function addBlackBackground(img) {
  const w = img.bitmap.width;
  const h = img.bitmap.height;
  img.scan(0, 0, w, h, (x, y, idx) => {
    const a = img.bitmap.data[idx + 3];
    if (a === 0) {
      img.bitmap.data[idx] = 0;
      img.bitmap.data[idx + 1] = 0;
      img.bitmap.data[idx + 2] = 0;
      img.bitmap.data[idx + 3] = 255;
    } else if (a < 255) {
      const alphaNorm = a / 255;
      img.bitmap.data[idx] = Math.round(img.bitmap.data[idx] * alphaNorm);
      img.bitmap.data[idx + 1] = Math.round(img.bitmap.data[idx + 1] * alphaNorm);
      img.bitmap.data[idx + 2] = Math.round(img.bitmap.data[idx + 2] * alphaNorm);
      img.bitmap.data[idx + 3] = 255;
    }
  });
  return img;
}

async function processLogos() {
  console.log('--- Processing logo.png (1254x1254) ---');
  const logoPath = path.join(rootDir, 'apps/landing/public/logo.png');
  const logoImg = await Jimp.read(logoPath);
  addBlackBackground(logoImg);

  // Save base logo.png to all target locations
  const baseLogoTargets = [
    'apps/landing/public/logo.png',
    'apps/desktop/public/logo.png',
    'apps/desktop/src/assets/logo.png',
    'apps/extension/src/assets/logo.png',
  ];

  for (const relPath of baseLogoTargets) {
    const dest = path.join(rootDir, relPath);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    await logoImg.write(dest);
    console.log(`Saved: ${relPath}`);
  }

  // Generate Extension icons (16, 32, 48, 128)
  const extSizes = [16, 32, 48, 128];
  for (const size of extSizes) {
    const resized = logoImg.clone();
    resized.resize({ w: size, h: size });
    
    const targets = [
      `apps/extension/icons/icon-${size}.png`,
      `apps/extension/public/icons/icon-${size}.png`,
    ];
    for (const relPath of targets) {
      const dest = path.join(rootDir, relPath);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      await resized.write(dest);
      console.log(`Saved: ${relPath} (${size}x${size})`);
    }
  }

  // Process bacham-logo.png and bacham-logo-lime.png
  console.log('--- Processing bacham-logo.png & bacham-logo-lime.png ---');
  const bachamLogoPath = path.join(rootDir, 'apps/landing/public/bacham-logo.png');
  if (fs.existsSync(bachamLogoPath)) {
    const bImg = await Jimp.read(bachamLogoPath);
    addBlackBackground(bImg);
    await bImg.write(bachamLogoPath);
    console.log('Saved: apps/landing/public/bacham-logo.png');
  }

  const bachamLimePath = path.join(rootDir, 'apps/landing/public/bacham-logo-lime.png');
  if (fs.existsSync(bachamLimePath)) {
    const limeImg = await Jimp.read(bachamLimePath);
    addBlackBackground(limeImg);
    await limeImg.write(bachamLimePath);
    console.log('Saved: apps/landing/public/bacham-logo-lime.png');
  }

  // Process logo-clean.png
  const logoCleanPath = path.join(rootDir, 'apps/landing/public/logo-clean.png');
  if (fs.existsSync(logoCleanPath)) {
    const cleanImg = await Jimp.read(logoCleanPath);
    addBlackBackground(cleanImg);
    await cleanImg.write(logoCleanPath);
    console.log('Saved: apps/landing/public/logo-clean.png');
  }

  console.log('All logos updated with solid black background successfully!');
}

processLogos().catch(console.error);
