import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Adjust to match vercel.json's distDir
const distDir = path.join(__dirname, '..', 'dist', 'client');
const fallbackSrc = path.join(__dirname, '..', 'public', 'fallback-index.html');
const destIndex = path.join(distDir, 'index.html');

try {
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  if (!fs.existsSync(destIndex)) {
    if (fs.existsSync(fallbackSrc)) {
      fs.copyFileSync(fallbackSrc, destIndex);
      console.log('postbuild: fallback-index.html copied to dist/client/index.html');
    } else {
      console.warn('postbuild: fallback-index.html not found in public/');
    }
  } else {
    console.log('postbuild: dist/client/index.html already exists; no action taken');
  }
} catch (err) {
  console.error('postbuild: error while ensuring index.html', err);
  process.exit(1);
}
