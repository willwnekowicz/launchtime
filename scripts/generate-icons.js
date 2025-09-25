import { createCanvas, loadImage } from 'canvas';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

// Create simple icon PNGs
async function generateIcons() {
  // Create resources directory if it doesn't exist
  mkdirSync(join(projectRoot, 'resources'), { recursive: true });

  // Generate icon.png (512x512)
  const canvas512 = createCanvas(512, 512);
  const ctx512 = canvas512.getContext('2d');

  // Draw gradient background
  const gradient = ctx512.createLinearGradient(0, 0, 512, 512);
  gradient.addColorStop(0, '#0066FF');
  gradient.addColorStop(1, '#0044CC');
  ctx512.fillStyle = gradient;
  ctx512.roundRect(0, 0, 512, 512, 100);
  ctx512.fill();

  // Draw clock circle
  ctx512.strokeStyle = 'white';
  ctx512.lineWidth = 20;
  ctx512.beginPath();
  ctx512.arc(256, 256, 160, 0, Math.PI * 2);
  ctx512.stroke();

  // Draw clock hands
  ctx512.beginPath();
  ctx512.moveTo(256, 160);
  ctx512.lineTo(256, 256);
  ctx512.lineTo(320, 320);
  ctx512.stroke();

  // Draw center dot
  ctx512.fillStyle = 'white';
  ctx512.beginPath();
  ctx512.arc(256, 256, 10, 0, Math.PI * 2);
  ctx512.fill();

  writeFileSync(join(projectRoot, 'resources/icon.png'), canvas512.toBuffer('image/png'));
  console.log('Created icon.png');

  // Generate tray-icon.png (22x22 for macOS menu bar)
  const canvas22 = createCanvas(22, 22);
  const ctx22 = canvas22.getContext('2d');

  // Draw simplified clock for tray
  ctx22.strokeStyle = '#000';
  ctx22.lineWidth = 1.5;
  ctx22.beginPath();
  ctx22.arc(11, 11, 8, 0, Math.PI * 2);
  ctx22.stroke();

  // Draw simplified hands
  ctx22.beginPath();
  ctx22.moveTo(11, 6);
  ctx22.lineTo(11, 11);
  ctx22.lineTo(14, 14);
  ctx22.stroke();

  // Center dot
  ctx22.fillStyle = '#000';
  ctx22.beginPath();
  ctx22.arc(11, 11, 1, 0, Math.PI * 2);
  ctx22.fill();

  writeFileSync(join(projectRoot, 'resources/tray-icon.png'), canvas22.toBuffer('image/png'));
  console.log('Created tray-icon.png');

  // Generate ICNS file for macOS
  // For now, we'll just copy the PNG as a placeholder
  // In production, you'd use iconutil to generate proper ICNS
  const iconBuffer = readFileSync(join(projectRoot, 'resources/icon.png'));
  writeFileSync(join(projectRoot, 'resources/icon.icns'), iconBuffer);
  console.log('Created icon.icns (placeholder)');
}

generateIcons().catch(console.error);