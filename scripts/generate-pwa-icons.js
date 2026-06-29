import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const sourceFile = path.resolve('src/data/logo.png');
const outputDir = path.resolve('public');

if (!fs.existsSync(sourceFile)) {
  console.error(`Source file not found: ${sourceFile}`);
  process.exit(1);
}

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const generateIcon = async (size, name) => {
  const outputPath = path.join(outputDir, name);
  try {
    await sharp(sourceFile)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toFile(outputPath);
    console.log(`Generated ${outputPath}`);
  } catch (error) {
    console.error(`Error generating ${name}:`, error);
  }
};

const run = async () => {
  console.log('Generating PWA icons from src/data/logo.png...');
  await generateIcon(192, 'pwa-192x192.png');
  await generateIcon(512, 'pwa-512x512.png');
  await generateIcon(180, 'apple-touch-icon-180x180.png');
  console.log('Done!');
};

run();
